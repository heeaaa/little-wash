/**
 * What a signed-in account keeps in this browser, and how all of it is wiped.
 *
 * Four kinds of thing, each under its own versioned key:
 *
 * - `little-wash:account:v1` - the signed-in person's record and which of its
 *   pieces have not reached the account yet (see record.ts).
 * - `little-wash:auth:v1` - the session itself, owned and written by
 *   supabase-js (it is the client's `storageKey`), plus its PKCE verifier
 *   under `little-wash:auth:v1-code-verifier` while a sign-in is under way.
 *   This file only ever reads it for a hint, or removes it.
 * - `little-wash:sign-in:v1` - where someone was when they tapped "Sign in",
 *   so the app can take them back there.
 *
 * Signing out removes all of it (CLAUDE.md: do not retain another user's data
 * after logout). When storage is unavailable or full the service carries on
 * with what it holds in memory, the same way the guest lists do.
 */

import {
  EMPTY_RECORD,
  isDay,
  isPieceId,
  parsePending,
  parseRecord,
  type AccountRecord,
  type GuestLibrary,
  type PendingKey,
} from "./record";

export const DEVICE_KEY = "little-wash:account:v1";
export const AUTH_STORAGE_KEY = "little-wash:auth:v1";
export const SIGN_IN_KEY = "little-wash:sign-in:v1";

/** The parts of the Web Storage API this needs, so tests can pass their own. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export interface DeviceRecord {
  userId: string;
  email: string | null;
  record: AccountRecord;
  pending: PendingKey[];
  /** When the account was last heard from, as an ISO timestamp. */
  pulledAt: string | null;
  /**
   * This browser's own lists as they were before signing in moved them into
   * the record, kept until the account confirms it has those pieces. If the
   * session ends first, they go back into the browser's lists. Absent or
   * null: there is none.
   */
  guestBackup?: GuestLibrary | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROBE_KEY = "little-wash:probe";

/**
 * Storage that takes writes, or null when the browser will not give us any.
 *
 * Probed the way supabase-js probes it: a browser that lets storage be read
 * but refuses every write (a full quota, some private modes) makes supabase-js
 * keep the session in memory, and treating that storage as real would make a
 * live session look signed out here (service.ts, sessionStillHere).
 */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === "undefined") return null;
    localStorage.setItem(PROBE_KEY, "1");
    localStorage.removeItem(PROBE_KEY);
    return localStorage;
  } catch {
    return null;
  }
}

function read(storage: StorageLike | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function emptyDevice(userId: string, email: string | null): DeviceRecord {
  return { userId, email, record: EMPTY_RECORD, pending: [], pulledAt: null, guestBackup: null };
}

function parseGuestBackup(value: unknown): GuestLibrary | null {
  if (!value || typeof value !== "object") return null;
  const source = value as { saved?: unknown; painted?: unknown };
  const saved = Array.isArray(source.saved) ? source.saved.filter(isPieceId) : [];
  const painted = Array.isArray(source.painted)
    ? source.painted.filter(
        (entry): entry is { id: string; on: string } =>
          Boolean(entry) && isPieceId((entry as { id?: unknown }).id) && isDay((entry as { on?: unknown }).on),
      )
    : [];
  return saved.length || painted.length ? { saved, painted } : null;
}

/**
 * The stored record for this person, or null. Someone else's record is never
 * returned: if one is somehow still here, it is not this person's to see.
 */
export function loadDevice(storage: StorageLike | null, userId: string): DeviceRecord | null {
  const parsed = parseJson(read(storage, DEVICE_KEY));
  if (!parsed || typeof parsed !== "object") return null;
  const value = parsed as Partial<Record<keyof DeviceRecord, unknown>> & { v?: unknown };
  if (value.v !== 1 || value.userId !== userId) return null;
  return {
    userId,
    email: typeof value.email === "string" ? value.email : null,
    record: parseRecord(value.record),
    pending: parsePending(value.pending),
    pulledAt: typeof value.pulledAt === "string" ? value.pulledAt : null,
    guestBackup: parseGuestBackup(value.guestBackup),
  };
}

/** Store the record. False when storage would not take it. */
export function saveDevice(storage: StorageLike | null, device: DeviceRecord): boolean {
  if (!storage) return false;
  try {
    storage.setItem(DEVICE_KEY, JSON.stringify({ v: 1, ...device }));
    return true;
  } catch {
    return false;
  }
}

/** Who the stored session says is signed in, without loading the client. */
export type SessionHint =
  | { userId: string; email: string | null }
  /** A session is stored but cannot be read here; the client will know. */
  | "unreadable"
  | null;

export function readSessionHint(storage: StorageLike | null): SessionHint {
  const raw = read(storage, AUTH_STORAGE_KEY);
  if (!raw) return null;
  const parsed = parseJson(raw) as { user?: { id?: unknown; email?: unknown } } | null;
  const id = parsed?.user?.id;
  if (typeof id !== "string" || !UUID.test(id)) return "unreadable";
  const email = parsed?.user?.email;
  return { userId: id, email: typeof email === "string" ? email : null };
}

/*
  Where a person may be sent back to after signing in: one of the app's own
  routes, as a HashRouter path. No scheme, no host, no "//" (protocol-relative)
  and no backslash, which React Router 6 has had an open-redirect advisory
  about. Anything else returns to the studio.
*/
const SAFE_RETURN = /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@/?%]*$/;

export function isSafeReturn(path: unknown): path is string {
  return typeof path === "string" && path.length <= 300 && SAFE_RETURN.test(path);
}

export interface SignInIntent {
  returnTo: string;
  startedAt: string;
}

export function saveSignInIntent(storage: StorageLike | null, returnTo: string, now: Date): void {
  try {
    storage?.setItem(
      SIGN_IN_KEY,
      JSON.stringify({ returnTo: isSafeReturn(returnTo) ? returnTo : "/studio", startedAt: now.toISOString() }),
    );
  } catch {
    // Without it the person still signs in; they return to the studio.
  }
}

/** The intent, if one was stored within `maxAgeMs`, removing it either way. */
export function takeSignInIntent(
  storage: StorageLike | null,
  now: Date,
  maxAgeMs: number,
): SignInIntent | null {
  const parsed = parseJson(read(storage, SIGN_IN_KEY)) as Partial<SignInIntent> | null;
  try {
    storage?.removeItem(SIGN_IN_KEY);
  } catch {
    // Nothing to do: an unreadable intent is ignored below anyway.
  }
  if (!parsed || typeof parsed.startedAt !== "string") return null;
  const age = now.getTime() - Date.parse(parsed.startedAt);
  if (!(age >= 0 && age <= maxAgeMs)) return null;
  return { returnTo: isSafeReturn(parsed.returnTo) ? parsed.returnTo : "/studio", startedAt: parsed.startedAt };
}

/**
 * Remove everything the account left in this browser: its record, the
 * session and verifier supabase-js stored, and any sign-in in progress.
 * Keys outside these are untouched - a guest's own lists, source preferences.
 */
export function clearAccountTraces(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    const doomed: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (
        key === DEVICE_KEY ||
        key === SIGN_IN_KEY ||
        key === AUTH_STORAGE_KEY ||
        key?.startsWith(`${AUTH_STORAGE_KEY}-`)
      ) {
        doomed.push(key);
      }
    }
    for (const key of doomed) storage.removeItem(key);
  } catch {
    // Storage that cannot be read cannot be holding anything to remove.
  }
}
