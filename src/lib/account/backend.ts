/**
 * The one boundary between little wash and the service that keeps accounts.
 *
 * Everything the account service needs from Supabase, in the app's own terms.
 * supabaseBackend.ts implements it with supabase-js and is loaded only when
 * needed; the service's tests use an in-memory fake that keeps the same
 * promises. Nothing outside src/lib/account imports supabase-js.
 */

import type { AccountRecord, Change, PendingKey } from "./record";

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface StartResult {
  /** Who is signed in now, after finishing any sign-in in the address. */
  user: SessionUser | null;
}

/**
 * Why a request did not go through.
 *
 * - `offline`: no connection; wait for one.
 * - `unauthorised`: the session is no longer accepted; it has ended.
 * - `unavailable`: anything else temporary (the project is paused, a server
 *   error, a rate limit); try again later.
 */
export type SyncProblem = "offline" | "unauthorised" | "unavailable";

export class SyncFailure extends Error {
  constructor(readonly problem: SyncProblem, detail?: string) {
    super(detail ? `${problem}: ${detail}` : problem);
    this.name = "SyncFailure";
  }
}

export interface PushResult {
  /** Changes the account now holds. */
  confirmed: PendingKey[];
  /** Changes the account refused for good (bad data, a full list). */
  refused: PendingKey[];
  /** Why the rest did not go, if any did not. */
  problem: SyncProblem | null;
}

export interface AccountBackend {
  /** Finish a sign-in waiting in the address, or recover the stored session. */
  start(): Promise<StartResult>;
  /** Called when the session ends elsewhere: another tab, or it expired. */
  onSignedOut(listener: () => void): () => void;
  /** Go to Google. Resolves as the page starts to leave. */
  signIn(redirectTo: string): Promise<void>;
  /** Sign this device out. Never throws: the local session is removed regardless. */
  signOut(): Promise<void>;
  /** Every saved and painted row the account holds. Throws SyncFailure. */
  fetchRecord(userId: string): Promise<AccountRecord>;
  /** Send these changes. Each is settled or refused independently. */
  push(userId: string, changes: readonly Change[]): Promise<PushResult>;
  /** Delete the account and its rows. Throws SyncFailure. */
  deleteAccount(): Promise<void>;
}
