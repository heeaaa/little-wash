/**
 * An in-memory account service for tests: the same promises as
 * supabaseBackend.ts, kept by a fake that behaves like the real thing rather
 * than echoing the code under test. Rows live per person and only ever reach
 * their owner, refused ids are refused for good, and failures, slow requests
 * and sessions ending elsewhere can all be arranged.
 *
 * What it cannot prove - the real API, the real database rules - is proven
 * against a real Supabase stack in integration/ and e2e-live/.
 */

import { SyncFailure, type AccountBackend, type SessionUser, type SyncProblem } from "@/lib/account/backend";
import {
  sortPainted,
  sortSaved,
  type AccountRecord,
  type Change,
  type PaintedRow,
  type SavedRow,
} from "@/lib/account/record";
import type { AccountConfig } from "@/lib/account/config";
import { AUTH_STORAGE_KEY } from "@/lib/account/device";

/*
  The session in storage, as supabase-js keeps it: written when a session is
  found or made, removed when it is over. The service treats storage as the
  truth about whether this browser still holds a session (sessionStillHere).
*/
function storeSession(user: SessionUser): void {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ access_token: "a.b.c", refresh_token: "r", user: { id: user.id, email: user.email } }),
  );
}

function forgetSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const TEST_CONFIG: AccountConfig = {
  url: "https://test-project.supabase.co",
  publishableKey: "sb_publishable_test",
  host: "test-project.supabase.co",
};

export const ANA: SessionUser = { id: "0b6f2c1e-0000-4000-8000-00000000000a", email: "ana@example.test" };
export const BEN: SessionUser = { id: "0b6f2c1e-0000-4000-8000-00000000000b", email: "ben@example.test" };

export interface FakeServer {
  /** Who the browser's session belongs to, as `start()` will find it. */
  session: SessionUser | null;
  /** Rows, per person. */
  rows: Map<string, AccountRecord>;
  /** Piece ids the account refuses outright (a check constraint, a full list). */
  refuses: Set<string>;
  /** Problems for the next requests, in order: fetch, push or delete. */
  failures: SyncProblem[];
  /**
   * Auth itself cannot be reached when the session is checked (start()): the
   * real client keeps the session stored and reports a retryable failure,
   * which supabaseBackend.ts turns into a SyncFailure.
   */
  trouble: SyncProblem | null;
  /** Hold every push until `release()`, to change things while one is in flight. */
  holdPushes: boolean;
  /** What happened, in order, for assertions. */
  log: string[];
  signInTargets: string[];
  release(): void;
  /** The session ends somewhere else: another tab signed out, or it expired. */
  endSessionElsewhere(): void;
  rowsOf(userId: string): AccountRecord;
}

export function createFakeServer(initial: Partial<Pick<FakeServer, "session">> = {}): FakeServer {
  const held: Array<() => void> = [];
  const listeners = new Set<() => void>();
  const server: FakeServer & { listeners: Set<() => void>; held: Array<() => void> } = {
    session: initial.session ?? null,
    rows: new Map(),
    refuses: new Set(),
    failures: [],
    trouble: null,
    holdPushes: false,
    log: [],
    signInTargets: [],
    listeners,
    held,
    release() {
      for (const resume of held.splice(0)) resume();
    },
    endSessionElsewhere() {
      server.session = null;
      forgetSession();
      for (const listener of listeners) listener();
    },
    rowsOf(userId) {
      return server.rows.get(userId) ?? { saved: [], painted: [] };
    },
  };
  return server;
}

function copy(record: AccountRecord): AccountRecord {
  return {
    saved: record.saved.map((row) => ({ ...row })),
    painted: record.painted.map((row) => ({ ...row })),
  };
}

export function createFakeBackend(server: FakeServer): AccountBackend {
  const internal = server as FakeServer & { listeners: Set<() => void>; held: Array<() => void> };

  function fail(): void {
    const problem = server.failures.shift();
    if (problem) throw new SyncFailure(problem);
  }

  /*
    As the real API answers: no session at all is a 401 ("unauthorised"); a
    signed-in person asking for someone else's rows gets none (row level
    security filters them), and writing them is a 403, which the backend
    reports as "unavailable" (integration/account.test.ts checks the real one).
  */
  function signedIn(): SessionUser {
    if (!server.session) throw new SyncFailure("unauthorised");
    return server.session;
  }

  return {
    async start() {
      server.log.push("start");
      // Auth unreachable: the session stays stored, and is not usable now.
      if (server.trouble) throw new SyncFailure(server.trouble);
      if (server.session) storeSession(server.session);
      else forgetSession();
      return { user: server.session ? { ...server.session } : null };
    },

    onSignedOut(listener) {
      internal.listeners.add(listener);
      return () => internal.listeners.delete(listener);
    },

    async signIn(redirectTo) {
      server.log.push("signIn");
      server.signInTargets.push(redirectTo);
    },

    async signOut() {
      server.log.push("signOut");
      server.session = null;
      forgetSession();
    },

    async fetchRecord(userId) {
      server.log.push("fetch");
      fail();
      const caller = signedIn();
      return caller.id === userId ? copy(server.rowsOf(userId)) : { saved: [], painted: [] };
    },

    async push(userId, changes: readonly Change[]) {
      server.log.push(`push ${changes.map((c) => `${c.row ? "+" : "-"}${c.key}`).join(" ")}`);
      if (server.holdPushes) await new Promise<void>((resume) => internal.held.push(resume));
      const problem = server.failures.shift();
      if (problem) return { confirmed: [], refused: [], problem };
      if (!server.session) return { confirmed: [], refused: [], problem: "unauthorised" };
      if (server.session.id !== userId) return { confirmed: [], refused: [], problem: "unavailable" };
      const record = copy(server.rowsOf(userId));
      const result = { confirmed: [] as Change["key"][], refused: [] as Change["key"][], problem: null };
      for (const change of changes) {
        if (server.refuses.has(change.id)) {
          result.refused.push(change.key);
          continue;
        }
        if (change.list === "saved") {
          record.saved = record.saved.filter((row) => row.id !== change.id);
          if (change.row) record.saved.push({ ...(change.row as SavedRow) });
        } else {
          record.painted = record.painted.filter((row) => row.id !== change.id);
          if (change.row) record.painted.push({ ...(change.row as PaintedRow) });
        }
        result.confirmed.push(change.key);
      }
      server.rows.set(userId, { saved: sortSaved(record.saved), painted: sortPainted(record.painted) });
      return result;
    },

    async deleteAccount() {
      server.log.push("delete");
      fail();
      if (!server.session) throw new SyncFailure("unauthorised");
      server.rows.delete(server.session.id);
      server.session = null;
    },
  };
}
