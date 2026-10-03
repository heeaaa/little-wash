/**
 * The account, start to finish: signing in, keeping the device's record and
 * the account in step, and signing out without leaving anything behind.
 *
 * A plain object with a subscribe/getSnapshot pair, so React reads it with
 * useSyncExternalStore and the tests drive it with no React at all. Every
 * outside dependency comes in through options: the backend (supabase-js in
 * the app, an in-memory fake in tests), storage, the guest lists and the
 * clock. The plan this follows is docs/plans/google-sign-in.md.
 *
 * A guest who never taps "Sign in" never reaches the backend: with no stored
 * session and no sign-in in the address, start() settles on "signed-out"
 * without loading anything.
 */

import type { AccountConfig } from "./config";
import { SyncFailure, type AccountBackend, type SessionUser } from "./backend";
import { readSignInReturn, withoutSignInReturn, type SignInFailureReason } from "./callback";
import {
  AUTH_STORAGE_KEY,
  DEVICE_KEY,
  browserStorage,
  clearAccountTraces,
  emptyDevice,
  isSafeReturn,
  loadDevice,
  readSessionHint,
  saveDevice,
  saveSignInIntent,
  takeSignInIntent,
  type DeviceRecord,
  type StorageLike,
} from "./device";
import type { GuestStore } from "./guest";
import {
  changesFor,
  isDay,
  isPieceId,
  mergeGuest,
  overlay,
  settle,
  togglePainted as togglePaintedIn,
  toggleSaved as toggleSavedIn,
  type AccountRecord,
} from "./record";

export type AccountStatus =
  /** No account configuration in this build: the guest app, nothing else. */
  | "unavailable"
  | "signed-out"
  /** Finishing a sign-in, or checking a stored session with nothing cached. */
  | "starting"
  | "signed-in";

export type SyncState =
  /** Nothing waiting to be sent. */
  | "idle"
  /** Talking to the account, or about to. */
  | "sending"
  /** No connection: changes are kept here until there is one. */
  | "offline"
  /** The account could not be reached; trying again with a growing pause. */
  | "failed";

export type NoticeReason = SignInFailureReason | "offline";

export type AccountNotice =
  /**
   * After a fresh sign-in. `sent` is false when this browser's pieces are
   * in the account's record here but could not reach the account yet.
   */
  | { kind: "signed-in"; email: string | null; added: { saved: number; painted: number }; sent: boolean }
  | { kind: "sign-in-failed"; reason: NoticeReason }
  /** Someone tapped "Sign in" and came back without finishing. */
  | { kind: "sign-in-unfinished" }
  | { kind: "signed-out" }
  /** The session ended without being asked: expired, revoked, another tab. */
  | { kind: "session-ended" }
  | { kind: "deleted" }
  | { kind: "delete-failed" }
  /** The account refused some changes for good; its own version stands. */
  | { kind: "changes-refused"; count: number };

export interface AccountSnapshot {
  status: AccountStatus;
  user: SessionUser | null;
  /** The signed-in person's pieces. Null whenever nobody is signed in. */
  record: AccountRecord | null;
  sync: SyncState;
  /** How many pieces have a change the account does not have yet. */
  pending: number;
  busy: "signing-in" | "signing-out" | "deleting" | null;
  /** One message at a time; `id` changes so the same message can be said again. */
  notice: (AccountNotice & { id: number }) | null;
  /** The host Google will name on its consent screen. */
  host: string | null;
  /** After a fresh sign-in, where to take the person. Read once. */
  returnTo: string | null;
  /** Signing out would discard changes that could not be sent: ask first. */
  confirmSignOut: boolean;
}

export interface AccountService {
  getSnapshot(): AccountSnapshot;
  subscribe(listener: () => void): () => void;
  /** Attach to the window and, the first time, start. Safe to call again. */
  start(): void;
  /** Detach from the window. start() attaches again without restarting. */
  stop(): void;
  /** Begin loading the client, so "Sign in with Google" responds at once. */
  prepare(): void;
  signIn(): Promise<void>;
  signOut(options?: { discardUnsent?: boolean }): Promise<void>;
  /** Answer "stay signed in" to the unsent-changes question. */
  keepSignedIn(): void;
  deleteAccount(): Promise<void>;
  toggleSaved(id: string): void;
  togglePainted(id: string, on: string): void;
  /** Try to reach the account now, instead of at the next scheduled try. */
  retry(): void;
  dismissNotice(): void;
  /** The route to return to after a fresh sign-in, once. */
  takeReturnTo(): string | null;
}

export interface AccountServiceOptions {
  config: AccountConfig | null;
  loadBackend: (config: AccountConfig) => Promise<AccountBackend>;
  guest: GuestStore;
  /** Defaults to localStorage, or nothing when the browser refuses it. */
  storage?: StorageLike | null;
  now?: () => Date;
}

/** Several quick taps go to the account together. */
export const SEND_DELAY_MS = 600;
/** The first pause after a failed attempt; it doubles up to RETRY_MAX_MS. */
export const RETRY_FIRST_MS = 5_000;
export const RETRY_MAX_MS = 10 * 60_000;
/** Coming back to the app hears from the account if it has been this long. */
export const REFRESH_AFTER_MS = 60_000;
/** How long a tapped "Sign in" is remembered, to return to the same place. */
export const INTENT_MAX_AGE_MS = 30 * 60_000;
/** How long signing out waits for changes already on their way. */
export const SIGN_OUT_WAIT_MS = 8_000;
/** How long signing out waits for the server to revoke the session. */
export const REVOKE_WAIT_MS = 5_000;

/** The promise's value, or "timed-out" if it has not settled in `ms`. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timed-out"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timed-out">((resolve) => {
    timer = setTimeout(() => resolve("timed-out"), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function createAccountService(options: AccountServiceOptions): AccountService {
  const { config, loadBackend, guest } = options;
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const now = options.now ?? (() => new Date());

  let snapshot: AccountSnapshot = {
    status: config ? "signed-out" : "unavailable",
    user: null,
    record: null,
    sync: "idle",
    pending: 0,
    busy: null,
    notice: null,
    host: config?.host ?? null,
    returnTo: null,
    confirmSignOut: false,
  };
  const listeners = new Set<() => void>();

  let device: DeviceRecord | null = null;
  let backend: AccountBackend | null = null;
  let backendLoading: Promise<AccountBackend> | null = null;
  let connecting: Promise<SessionUser | null> | null = null;
  let booted = false;
  let following: Promise<void> | null = null;
  let attached = false;
  let ending = false;
  let noticeId = 0;

  let sendTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = RETRY_FIRST_MS;
  let syncing: Promise<void> | null = null;
  let syncAgain = false;
  let absorbGuest = false;
  let announce = false;
  let added = { saved: 0, painted: 0 };
  let lastHeard = 0;

  function publish(patch: Partial<AccountSnapshot>): void {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  }

  function notice(value: AccountNotice): AccountSnapshot["notice"] {
    noticeId += 1;
    return { ...value, id: noticeId };
  }

  function online(): boolean {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  function clearTimers(): void {
    if (sendTimer) clearTimeout(sendTimer);
    if (retryTimer) clearTimeout(retryTimer);
    sendTimer = null;
    retryTimer = null;
  }

  // -- The backend, loaded once and only when needed --------------------------

  function loadOnce(): Promise<AccountBackend> {
    if (!config) return Promise.reject(new Error("Accounts are not configured in this build"));
    if (!backendLoading) {
      backendLoading = loadBackend(config).then(
        (loaded) => {
          backend = loaded;
          loaded.onSignedOut(() => {
            if (!ending) void endSession("session-ended", { revoke: false });
          });
          return loaded;
        },
        (error: unknown) => {
          // A failed download (no connection) is tried again next time.
          backendLoading = null;
          throw error;
        },
      );
    }
    return backendLoading;
  }

  /** The signed-in person according to the backend; finishes a sign-in in the address. */
  function connect(): Promise<SessionUser | null> {
    if (!connecting) {
      connecting = loadOnce()
        .then((loaded) => loaded.start())
        .then(
          (result) => result.user,
          (error: unknown) => {
            connecting = null;
            throw error;
          },
        );
    }
    return connecting;
  }

  // -- The device's record ------------------------------------------------------

  /**
   * Whether this browser still holds this person's session. supabase-js keeps
   * it in storage and removes it when it is over, in this tab or another, so
   * storage is the truth. Without usable storage the session lives in memory
   * only, and there is nothing to check.
   */
  function sessionStillHere(userId: string): boolean {
    if (!storage) return true;
    const hint = readSessionHint(storage);
    if (hint === null) return false;
    return hint === "unreadable" || hint.userId === userId;
  }

  /**
   * The record as stored now: another tab may have changed it since. Null -
   * and the session ended here - once this browser no longer holds this
   * person's session: another tab signed out, or someone else signed in.
   */
  function current(): DeviceRecord | null {
    if (!device) return null;
    if (!sessionStillHere(device.userId)) {
      void endSession("session-ended", { revoke: false });
      return null;
    }
    return loadDevice(storage, device.userId) ?? device;
  }

  /**
   * Hold and store the record. Never writes once the session has left this
   * browser, which would put the account's pieces back after a sign-out
   * elsewhere. True when the record reached storage.
   */
  function keep(next: DeviceRecord): boolean {
    if (!sessionStillHere(next.userId)) {
      void endSession("session-ended", { revoke: false });
      return false;
    }
    device = next;
    const stored = saveDevice(storage, next);
    publish({ record: next.record, pending: next.pending.length });
    // A question about unsent changes stops making sense once they are sent.
    if (snapshot.confirmSignOut && next.pending.length === 0) publish({ confirmSignOut: false });
    return stored;
  }

  // -- Starting ---------------------------------------------------------------

  async function boot(): Promise<void> {
    if (!config) return;
    const returned = readSignInReturn(window.location.href);
    const hint = readSessionHint(storage);

    if (!returned && !hint) {
      // A guest. Nothing to load; at most, a sign-in that was abandoned.
      const abandoned = takeSignInIntent(storage, now(), INTENT_MAX_AGE_MS);
      if (abandoned) publish({ notice: notice({ kind: "sign-in-unfinished" }) });
      return;
    }

    // Someone who was signed in sees their studio at once, from this device's
    // copy, while the session is confirmed in the background.
    const cached = hint && hint !== "unreadable" ? loadDevice(storage, hint.userId) : null;
    if (hint && hint !== "unreadable" && cached) {
      device = cached;
      publish({
        status: "signed-in",
        user: { id: hint.userId, email: cached.email ?? hint.email },
        record: cached.record,
        pending: cached.pending.length,
        sync: "sending",
      });
    } else {
      publish({ status: "starting" });
    }

    let user: SessionUser | null;
    try {
      user = await connect();
    } catch {
      if (returned) {
        takeSignInIntent(storage, now(), Number.POSITIVE_INFINITY);
        cleanAddress();
        publish({ notice: notice({ kind: "sign-in-failed", reason: online() ? "unavailable" : "offline" }) });
      }
      /*
        The session could not be checked just now - the client would not
        load, or Auth did not answer a refresh. A session that is still
        stored is not a session that has ended (supabase-js removes one that
        has): carry on from this device's copy, or an empty one for someone
        whose copy is elsewhere, and try again. This browser's own pieces
        join the account when it answers.
      */
      const known = hint && hint !== "unreadable" ? hint : null;
      if (known && sessionStillHere(known.userId)) {
        if (snapshot.status !== "signed-in") {
          device = loadDevice(storage, known.userId) ?? emptyDevice(known.userId, known.email);
          publish({
            status: "signed-in",
            user: { id: known.userId, email: device.email ?? known.email },
            record: device.record,
            pending: device.pending.length,
          });
        }
        absorbGuest = true;
        publish({ sync: online() ? "failed" : "offline" });
        if (online()) scheduleRetry();
      } else {
        publish({ status: "signed-out" });
      }
      return;
    }

    const intent = returned ? takeSignInIntent(storage, now(), INTENT_MAX_AGE_MS) : null;
    if (returned) cleanAddress();

    if (!user) {
      const wasSignedIn = snapshot.status === "signed-in" || hint !== null;
      device = null;
      clearAccountTraces(storage);
      if (wasSignedIn && !returned) guest.forgetSeenLeaves();
      publish({
        status: "signed-out",
        user: null,
        record: null,
        pending: 0,
        sync: "idle",
        notice: returned
          ? notice({
              kind: "sign-in-failed",
              reason: returned.kind === "error" ? returned.reason : "not-finished",
            })
          : notice({ kind: "session-ended" }),
      });
      return;
    }

    becomeSignedIn(user, {
      fresh: returned?.kind === "code",
      returnTo: intent?.returnTo ?? null,
      failure: returned?.kind === "error" ? returned.reason : null,
    });
  }

  function cleanAddress(): void {
    const clean = withoutSignInReturn(window.location.href);
    if (clean) window.history.replaceState(window.history.state, "", clean);
  }

  function becomeSignedIn(
    user: SessionUser,
    { fresh, returnTo, failure }: { fresh: boolean; returnTo: string | null; failure: SignInFailureReason | null },
  ): void {
    const base =
      device && device.userId === user.id ? device : loadDevice(storage, user.id) ?? emptyDevice(user.id, user.email);
    keep({ ...base, email: user.email ?? base.email });
    publish({
      status: "signed-in",
      user,
      sync: "sending",
      returnTo: fresh ? returnTo ?? "/studio" : null,
      ...(failure ? { notice: notice({ kind: "sign-in-failed", reason: failure }) } : {}),
    });
    void sync({ absorbGuest: true, announce: fresh });
  }

  // -- Keeping the device and the account in step -----------------------------

  function sync(options: { absorbGuest?: boolean; announce?: boolean } = {}): Promise<void> {
    if (options.absorbGuest) absorbGuest = true;
    if (options.announce) announce = true;
    if (syncing) {
      syncAgain = true;
      return syncing;
    }
    syncing = runSync().finally(() => {
      syncing = null;
      if (syncAgain) {
        syncAgain = false;
        void sync();
      }
    });
    return syncing;
  }

  /**
   * Move this browser's own pieces into the account's record, once.
   *
   * The browser's lists are emptied only when the record - with a backup of
   * what the lists held - is safely stored. The backup goes back into the
   * lists if the session ends before the account confirms those pieces
   * (endSession), and is dropped once it has (releaseGuestBackup). Emptying
   * the lists straight away, rather than waiting, is what stops the same
   * pieces being merged again after a reload - including one the person has
   * since unsaved in the account.
   */
  function absorb(): void {
    if (!absorbGuest || !device) return;
    absorbGuest = false;
    const library = guest.read();
    if (library.saved.length === 0 && library.painted.length === 0) return;
    const base = current();
    if (!base) return;
    const merged = mergeGuest(base.record, base.pending, library, now());
    const kept = base.guestBackup;
    const backup = {
      saved: [...(kept?.saved ?? []), ...library.saved.filter((id) => !kept?.saved.includes(id))],
      painted: [
        ...(kept?.painted ?? []),
        ...library.painted.filter((entry) => !kept?.painted.some((old) => old.id === entry.id)),
      ],
    };
    if (keep({ ...base, record: merged.record, pending: merged.pending, guestBackup: backup })) guest.clear();
    added = { saved: added.saved + merged.added.saved, painted: added.painted + merged.added.painted };
  }

  /** Once none of the browser's former pieces is waiting to be sent, the backup has done its job. */
  function releaseGuestBackup(): void {
    const base = current();
    const backup = base?.guestBackup;
    if (!base || !backup) return;
    const waiting =
      backup.saved.some((id) => base.pending.includes(`saved:${id}`)) ||
      backup.painted.some((entry) => base.pending.includes(`painted:${entry.id}`));
    if (!waiting) keep({ ...base, guestBackup: null });
  }

  /** The sign-in notice, once: whether this browser's pieces have reached the account yet. */
  function announceSignIn(sent: boolean): void {
    if (!announce || !device) return;
    announce = false;
    publish({ notice: notice({ kind: "signed-in", email: device.email, added, sent }) });
  }

  async function hear(from: AccountBackend, userId: string): Promise<void> {
    const account = await from.fetchRecord(userId);
    const base = current();
    if (!base || base.userId !== userId) return;
    keep({ ...base, record: overlay(account, base.record, base.pending), pulledAt: now().toISOString() });
    lastHeard = Date.now();
  }

  async function send(to: AccountBackend, userId: string): Promise<void> {
    const base = current();
    if (!base || base.pending.length === 0) return;
    const changes = changesFor(base.record, base.pending);
    const result = await to.push(userId, changes);
    const after = current();
    if (!after || after.userId !== userId) return;
    const settled = new Set([...result.confirmed, ...result.refused]);
    keep({ ...after, pending: settle(after.record, after.pending, changes, settled) });
    if (result.refused.length > 0) {
      publish({ notice: notice({ kind: "changes-refused", count: result.refused.length }) });
    }
    if (result.problem) throw new SyncFailure(result.problem);
  }

  async function runSync(): Promise<void> {
    if (sendTimer) clearTimeout(sendTimer);
    if (retryTimer) clearTimeout(retryTimer);
    sendTimer = null;
    retryTimer = null;
    if (snapshot.status !== "signed-in" || !device) return;
    const userId = device.userId;

    if (!online()) {
      absorb();
      announceSignIn(false);
      publish({ sync: "offline" });
      return;
    }

    publish({ sync: "sending" });
    try {
      const user = await connect();
      if (!user || user.id !== userId) {
        await endSession("session-ended");
        return;
      }
      const from = backend!;
      if (absorbGuest) {
        // Hear from the account first, so the notice counts only the pieces
        // that are new to it. Without a connection, merge into what is here.
        try {
          await hear(from, userId);
        } finally {
          absorb();
        }
      }
      await send(from, userId);
      announceSignIn(true);
      await hear(from, userId);
      releaseGuestBackup();
      retryDelay = RETRY_FIRST_MS;
      const waiting = (device?.pending.length ?? 0) > 0;
      publish({ sync: waiting ? "sending" : "idle" });
      // Changed again while this was sending.
      if (waiting) scheduleSend();
    } catch (error) {
      const problem = error instanceof SyncFailure ? error.problem : online() ? "unavailable" : "offline";
      if (snapshot.status !== "signed-in") return;
      /*
        "Unauthorised" ends the session only once the session has really left
        storage. While it is still there, a 401 is a refresh that failed for a
        moment - the access token lasts an hour, so it has always expired when
        a daily app is opened - and supabase-js removes a session that is truly
        over and says so (onSignedOut). Found by the independent review: one
        such answer used to wipe the device, unsent changes and all.
      */
      if (problem === "unauthorised" && !sessionStillHere(userId)) {
        await endSession("session-ended");
        return;
      }
      announceSignIn(false);
      // Truly offline waits for the browser's "online" event. A request that
      // failed while the browser says it is online - Wi-Fi with no internet
      // behind it, a captive portal - would never see one, so it is retried.
      const offline = problem === "offline" && !online();
      publish({ sync: offline ? "offline" : "failed" });
      if (!offline) scheduleRetry();
    }
  }

  function scheduleSend(): void {
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = setTimeout(() => {
      sendTimer = null;
      void sync();
    }, SEND_DELAY_MS);
  }

  function scheduleRetry(): void {
    if (retryTimer) clearTimeout(retryTimer);
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void sync();
    }, delay);
  }

  // -- Ending -----------------------------------------------------------------

  async function endSession(
    kind: "signed-out" | "session-ended" | "deleted",
    { revoke = true }: { revoke?: boolean } = {},
  ): Promise<void> {
    if (ending || snapshot.status !== "signed-in") return;
    ending = true;
    try {
      clearTimers();
      // Revoked on the server if it answers in time; forgotten here regardless.
      if (revoke && backend) await withTimeout(backend.signOut(), REVOKE_WAIT_MS);
      // Pieces this browser held before signing in that never reached the
      // account go back into its own lists: they were never the account's.
      const backup = device?.guestBackup ?? (device ? loadDevice(storage, device.userId)?.guestBackup : null);
      if (backup) guest.restore(backup);
      device = null;
      added = { saved: 0, painted: 0 };
      absorbGuest = false;
      announce = false;
      connecting = null;
      clearAccountTraces(storage);
      guest.forgetSeenLeaves();
      publish({
        status: "signed-out",
        user: null,
        record: null,
        pending: 0,
        sync: "idle",
        busy: null,
        confirmSignOut: false,
        returnTo: null,
        notice: notice({ kind }),
      });
    } finally {
      ending = false;
    }
  }

  // -- The window ---------------------------------------------------------------

  function onOnline(): void {
    if (snapshot.status === "signed-in") void sync();
  }

  function onOffline(): void {
    if (snapshot.status === "signed-in") publish({ sync: "offline" });
  }

  function onVisible(): void {
    if (document.visibilityState !== "visible" || snapshot.status !== "signed-in" || !device) return;
    if (device.pending.length > 0 || Date.now() - lastHeard > REFRESH_AFTER_MS) void sync();
  }

  /*
    Signed in in another tab: this one follows, as it follows a sign-out
    there. Left a guest, it would show its old lists while the person is
    signed in elsewhere (independent review, 02/10/2026).
  */
  function followSignIn(): void {
    if (following || snapshot.busy) return;
    const hint = readSessionHint(storage);
    if (!hint || hint === "unreadable") return;
    // Whatever this tab last said - signed out, a sign-in that failed - is over.
    publish({ notice: null });
    following = boot().finally(() => {
      following = null;
    });
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== DEVICE_KEY && event.key !== AUTH_STORAGE_KEY && event.key !== null) return;
    if (snapshot.status === "signed-out") {
      followSignIn();
      return;
    }
    if (snapshot.status !== "signed-in" || !device) return;
    if (!sessionStillHere(device.userId)) {
      // Signed out in another tab, or someone else signed in there.
      void endSession("session-ended", { revoke: false });
      return;
    }
    const stored = loadDevice(storage, device.userId);
    if (stored) {
      device = stored;
      publish({ record: stored.record, pending: stored.pending.length });
    }
  }

  function onPageShow(event: PageTransitionEvent): void {
    // Back from Google's screen without finishing, restored from the cache:
    // the button must not stay stuck on "Opening Google".
    if (event.persisted && snapshot.busy === "signing-in") {
      takeSignInIntent(storage, now(), Number.POSITIVE_INFINITY);
      publish({ busy: null });
    }
    // A page restored from the cache missed any storage events meanwhile.
    if (event.persisted && snapshot.status === "signed-in" && device && !sessionStillHere(device.userId)) {
      void endSession("session-ended", { revoke: false });
    }
    if (event.persisted && snapshot.status === "signed-out") followSignIn();
  }

  // -- The service --------------------------------------------------------------

  return {
    getSnapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    start() {
      if (!attached && config) {
        attached = true;
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        window.addEventListener("storage", onStorage);
        window.addEventListener("pageshow", onPageShow);
        document.addEventListener("visibilitychange", onVisible);
      }
      if (!booted) {
        booted = true;
        void boot();
      }
    },

    stop() {
      if (!attached) return;
      attached = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    },

    prepare() {
      if (config && snapshot.status !== "signed-in") void loadOnce().catch(() => undefined);
    },

    async signIn() {
      if (!config || snapshot.status === "signed-in" || snapshot.busy) return;
      publish({ busy: "signing-in" });
      try {
        const loaded = await loadOnce();
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
        saveSignInIntent(storage, isSafeReturn(hash) ? hash : "/studio", now());
        // Back to this page with no fragment: HashRouter's fragment is the
        // route, and the route to return to is in the intent instead.
        await loaded.signIn(`${window.location.origin}${window.location.pathname}`);
      } catch {
        takeSignInIntent(storage, now(), Number.POSITIVE_INFINITY);
        publish({
          busy: null,
          notice: notice({ kind: "sign-in-failed", reason: online() ? "unavailable" : "offline" }),
        });
      }
    },

    async signOut({ discardUnsent = false } = {}) {
      if (snapshot.status !== "signed-in" || snapshot.busy) return;
      publish({ busy: "signing-out", confirmSignOut: false });
      if (!discardUnsent) {
        // Send what is waiting - including a send already under way and the
        // one it schedules after itself - but never wait for ever.
        const drain = async () => {
          if ((device?.pending.length ?? 0) > 0) await sync();
          while (syncing) await syncing;
        };
        await withTimeout(drain(), SIGN_OUT_WAIT_MS);
        if (snapshot.status !== "signed-in") return;
        if ((device?.pending.length ?? 0) > 0) {
          publish({ busy: null, confirmSignOut: true });
          return;
        }
      }
      // Load the client if this visit never did, so the session is revoked
      // on the server and not only forgotten here.
      if (!backend) await withTimeout(loadOnce().catch(() => undefined), REVOKE_WAIT_MS);
      await endSession("signed-out");
    },

    keepSignedIn() {
      publish({ confirmSignOut: false });
    },

    async deleteAccount() {
      if (snapshot.status !== "signed-in" || snapshot.busy) return;
      publish({ busy: "deleting" });
      try {
        await connect();
        await backend!.deleteAccount();
      } catch (error) {
        if (error instanceof SyncFailure && error.problem === "unauthorised" && device && !sessionStillHere(device.userId)) {
          await endSession("session-ended");
          return;
        }
        publish({ busy: null, notice: notice({ kind: "delete-failed" }) });
        return;
      }
      await endSession("deleted");
    },

    toggleSaved(id) {
      const base = current();
      if (snapshot.status !== "signed-in" || !base || !isPieceId(id)) return;
      keep({ ...base, ...toggleSavedIn(base.record, base.pending, id, now().toISOString()) });
      publish({ sync: online() ? "sending" : "offline" });
      scheduleSend();
    },

    togglePainted(id, on) {
      const base = current();
      if (snapshot.status !== "signed-in" || !base || !isPieceId(id) || !isDay(on)) return;
      keep({ ...base, ...togglePaintedIn(base.record, base.pending, id, on, now().toISOString()) });
      publish({ sync: online() ? "sending" : "offline" });
      scheduleSend();
    },

    retry() {
      retryDelay = RETRY_FIRST_MS;
      void sync();
    },

    dismissNotice() {
      if (snapshot.notice) publish({ notice: null });
    },

    takeReturnTo() {
      const returnTo = snapshot.returnTo;
      if (returnTo) publish({ returnTo: null });
      return returnTo;
    },
  };
}
