/**
 * AccountBackend on Supabase: Auth for the Google sign-in and the session,
 * the REST API for the two tables the migration creates.
 *
 * Imported only through a dynamic import (see AccountContext), so supabase-js -
 * about 59 KB gzipped - is never downloaded by someone who has not chosen to
 * sign in. Everything here is checked against a real local Supabase stack in
 * CI (integration/), and its exact requests are pinned by supabaseBackend.test.ts.
 */

import { createClient, isAuthRetryableFetchError, type PostgrestError } from "@supabase/supabase-js";
import type { AccountConfig } from "./config";
import { AUTH_STORAGE_KEY } from "./device";
import {
  isDay,
  isPieceId,
  sortPainted,
  sortSaved,
  toInstant,
  type Change,
  type PaintedRow,
  type SavedRow,
} from "./record";
import {
  SyncFailure,
  type AccountBackend,
  type PushResult,
  type SessionUser,
  type SyncProblem,
} from "./backend";

/** The two tables, as the REST API returns them. */
interface SavedPieceRow {
  user_id: string;
  piece_id: string;
  saved_at: string;
}

interface PaintedPieceRow {
  user_id: string;
  piece_id: string;
  painted_on: string;
  marked_at: string;
}

/**
 * How long any one request may take before it is given up as failed. Without
 * it, one request that never answers held every later sync behind it - and
 * left "Signing out..." on screen, with the account's pieces still showing.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/** fetch, abandoned after REQUEST_TIMEOUT_MS unless the caller brought its own signal. */
function withTimeouts(base: typeof fetch): typeof fetch {
  return (input, init = {}) => {
    if (init.signal) return base(input, init);
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException("The request took too long.", "TimeoutError")),
      REQUEST_TIMEOUT_MS,
    );
    return base(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}

/** The API's own row limit, and this app's per-person ceiling (the migration). */
const MAX_ROWS = 1000;
/** Ids per delete request: they travel in the URL, which has a length limit. */
const DELETE_BATCH = 50;
/** Rows per upsert request, which travel in the body. */
const UPSERT_BATCH = 500;

interface Response {
  error: PostgrestError | null;
  status: number;
}

/** What a failed response means for the changes in it. */
function problemOf(response: Response): SyncProblem | "refused" | null {
  if (!response.error) return null;
  if (response.status === 0) return "offline";
  if (response.status === 401) return "unauthorised";
  // The request itself was rejected - a bad value, a full list. Sending it
  // again will not help, so the change is dropped and the account's version
  // stands (service.ts says so to the person).
  if (response.status === 400 || response.status === 409 || response.status === 413 || response.status === 422) {
    return "refused";
  }
  return "unavailable";
}

const SEVERITY: Record<SyncProblem, number> = { unavailable: 1, offline: 2, unauthorised: 3 };

function worse(a: SyncProblem | null, b: SyncProblem): SyncProblem {
  return a && SEVERITY[a] >= SEVERITY[b] ? a : b;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += size) out.push(items.slice(start, start + size));
  return out;
}

function toUser(user: { id: string; email?: string | null } | null | undefined): SessionUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export interface SupabaseBackendOptions {
  /** For tests: the fetch supabase-js uses for every request. */
  fetch?: typeof fetch;
  /** For tests: how the page goes to Google. jsdom cannot navigate. */
  navigate?: (url: string) => void;
  /**
   * For tests in Node, which has no localStorage: where the session is kept.
   * The app always uses the browser's localStorage, under AUTH_STORAGE_KEY.
   */
  storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };
}

export function createSupabaseBackend(
  config: AccountConfig,
  options: SupabaseBackendOptions = {},
): AccountBackend {
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      // supabase-js defaults to the implicit flow, which returns the tokens in
      // the URL fragment - and with HashRouter the fragment is the route.
      flowType: "pkce",
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      ...(options.storage ? { storage: options.storage } : {}),
    },
    global: { fetch: withTimeouts(options.fetch ?? ((input, init) => fetch(input, init))) },
  });

  /*
    A session for the next request, or the reason there is none - so a request
    is never sent as an anonymous caller. Found by the independent review: when
    an expired access token could not be refreshed for a moment, supabase-js
    kept the session but reported none, its requests went out with the
    publishable key as the bearer and came back 401, and the app took that as
    the session having ended. A refresh that failed for a moment is now
    "unavailable" (or "offline"); only a session Auth has refused is
    "unauthorised", and then supabase-js has removed it and said so.
  */
  async function signedIn(): Promise<void> {
    const { data, error } = await client.auth.getSession();
    if (data.session) return;
    if (error && isAuthRetryableFetchError(error)) {
      throw new SyncFailure(online() ? "unavailable" : "offline", error.message);
    }
    throw new SyncFailure("unauthorised", error?.message);
  }

  return {
    async start() {
      // Finishes a `?code=` return (the PKCE exchange) or recovers and, if
      // needed, refreshes the stored session.
      await client.auth.initialize();
      const { data, error } = await client.auth.getSession();
      // Kept, but not usable this moment: say so, rather than "nobody".
      if (!data.session && error && isAuthRetryableFetchError(error)) {
        throw new SyncFailure(online() ? "unavailable" : "offline", error.message);
      }
      return { user: toUser(data.session?.user) };
    },

    onSignedOut(listener) {
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") listener();
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(redirectTo) {
      // The client builds the address (and stores the PKCE verifier); the page
      // is sent there here rather than inside supabase-js, so it can be tested.
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw new SyncFailure("unavailable", error?.message);
      (options.navigate ?? ((url: string) => window.location.assign(url)))(data.url);
    },

    async signOut() {
      // This device only. The default, "global", would sign the person out of
      // every device they use. supabase-js removes the local session even when
      // the request to revoke it fails, which is the part that matters here.
      try {
        await client.auth.signOut({ scope: "local" });
      } catch {
        // Nothing to add: the session is gone from this browser either way.
      }
    },

    async fetchRecord(userId) {
      await signedIn();
      const [saved, painted] = await Promise.all([
        client
          .from("saved_pieces")
          .select("piece_id, saved_at")
          .eq("user_id", userId)
          .order("saved_at")
          .order("piece_id")
          .range(0, MAX_ROWS - 1)
          // The service decides when to try again; postgrest-js's own retries
          // would hold a request open for seconds while offline.
          .retry(false),
        client
          .from("painted_pieces")
          .select("piece_id, painted_on, marked_at")
          .eq("user_id", userId)
          .order("painted_on")
          .order("marked_at")
          .order("piece_id")
          .range(0, MAX_ROWS - 1)
          .retry(false),
      ]);
      for (const response of [saved, painted]) {
        const problem = problemOf(response);
        if (problem) throw new SyncFailure(problem === "refused" ? "unavailable" : problem, response.error?.message);
      }
      const savedRows: SavedRow[] = [];
      for (const row of (saved.data ?? []) as Pick<SavedPieceRow, "piece_id" | "saved_at">[]) {
        const at = toInstant(row.saved_at);
        if (isPieceId(row.piece_id) && at) savedRows.push({ id: row.piece_id, at });
      }
      const paintedRows: PaintedRow[] = [];
      for (const row of (painted.data ?? []) as Pick<PaintedPieceRow, "piece_id" | "painted_on" | "marked_at">[]) {
        const at = toInstant(row.marked_at);
        if (isPieceId(row.piece_id) && isDay(row.painted_on) && at) {
          paintedRows.push({ id: row.piece_id, on: row.painted_on, at });
        }
      }
      return { saved: sortSaved(savedRows), painted: sortPainted(paintedRows) };
    },

    async push(userId, changes) {
      const result: PushResult = { confirmed: [], refused: [], problem: null };
      if (changes.length === 0) return result;
      try {
        await signedIn();
      } catch (error) {
        return { ...result, problem: error instanceof SyncFailure ? error.problem : "unavailable" };
      }

      const upsertSaved = (batch: Array<Change & { row: SavedRow }>) =>
        client.from("saved_pieces").upsert(
          batch.map(({ row }) => ({ user_id: userId, piece_id: row.id, saved_at: row.at })),
          { onConflict: "user_id,piece_id" },
        );
      const upsertPainted = (batch: Array<Change & { row: PaintedRow }>) =>
        client.from("painted_pieces").upsert(
          batch.map(({ row }) => ({ user_id: userId, piece_id: row.id, painted_on: row.on, marked_at: row.at })),
          { onConflict: "user_id,piece_id" },
        );
      const remove = (table: "saved_pieces" | "painted_pieces", batch: readonly Change[]) =>
        client
          .from(table)
          .delete()
          .eq("user_id", userId)
          .in(
            "piece_id",
            batch.map((c) => c.id),
          );

      // A batch, and how to send any part of it again on its own.
      const groups: Array<{ batch: Change[]; send: (batch: Change[]) => PromiseLike<Response> }> = [];
      const pick = (list: Change["list"], present: boolean) =>
        changes.filter((c) => c.list === list && Boolean(c.row) === present);
      for (const batch of chunks(pick("saved", true), UPSERT_BATCH)) {
        groups.push({ batch, send: (part) => upsertSaved(part as Array<Change & { row: SavedRow }>) });
      }
      for (const batch of chunks(pick("saved", false), DELETE_BATCH)) {
        groups.push({ batch, send: (part) => remove("saved_pieces", part) });
      }
      for (const batch of chunks(pick("painted", true), UPSERT_BATCH)) {
        groups.push({ batch, send: (part) => upsertPainted(part as Array<Change & { row: PaintedRow }>) });
      }
      for (const batch of chunks(pick("painted", false), DELETE_BATCH)) {
        groups.push({ batch, send: (part) => remove("painted_pieces", part) });
      }

      const settleGroup = async (batch: Change[], send: (batch: Change[]) => PromiseLike<Response>) => {
        const problem = problemOf(await send(batch));
        if (problem === null) {
          result.confirmed.push(...batch.map((c) => c.key));
        } else if (problem === "refused" && batch.length > 1) {
          // Postgres refuses a whole statement for one bad row. Rather than
          // drop every piece in it, send each on its own, so only the piece
          // the account really refuses is dropped.
          for (const change of batch) await settleGroup([change], send);
        } else if (problem === "refused") {
          result.refused.push(batch[0]!.key);
        } else {
          result.problem = worse(result.problem, problem);
        }
      };

      // Independent groups: one list's trouble does not hold up the other.
      await Promise.all(groups.map(({ batch, send }) => settleGroup(batch, send)));
      // In the order the changes were given, whatever order the answers came in.
      const order = new Map(changes.map((change, index) => [change.key, index]));
      result.confirmed.sort((a, b) => order.get(a)! - order.get(b)!);
      result.refused.sort((a, b) => order.get(a)! - order.get(b)!);
      return result;
    },

    async deleteAccount() {
      await signedIn();
      const response = await client.rpc("delete_my_account");
      const problem = problemOf(response);
      if (problem) throw new SyncFailure(problem === "refused" ? "unavailable" : problem, response.error?.message);
    },
  };
}
