/**
 * The account service, driven through its own API with an in-memory backend
 * (src/test/fakeAccountBackend.ts) and a fake clock. Every journey the plan
 * names is here: a guest who never signs in, a fresh sign-in and what it brings
 * across, a second visit, changes while offline, failures and retries, a change
 * made mid-send, sessions that end, signing out, and deleting the account.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTENT_MAX_AGE_MS,
  REFRESH_AFTER_MS,
  RETRY_FIRST_MS,
  SEND_DELAY_MS,
  SIGN_OUT_WAIT_MS,
  createAccountService,
  type AccountService,
} from "./service";
import { AUTH_STORAGE_KEY, DEVICE_KEY, SIGN_IN_KEY, loadDevice, saveDevice, saveSignInIntent } from "./device";
import { browserGuestStore, type GuestStore } from "./guest";
import type { AccountConfig } from "./config";
import { ANA, BEN, TEST_CONFIG, createFakeBackend, createFakeServer, type FakeServer } from "@/test/fakeAccountBackend";

const NOW = new Date("2026-10-02T08:00:00.000Z");
const FAVOURITES = "little-wash:favorites:v1";
const PAINTED = "little-wash:painted:v1";

let server: FakeServer;
let services: AccountService[] = [];

function make(options: { config?: AccountConfig | null; loadFails?: boolean } = {}) {
  const loadBackend = vi.fn(async () => {
    if (options.loadFails) throw new Error("Failed to fetch dynamically imported module");
    return createFakeBackend(server);
  });
  const forgetSeenLeaves = vi.fn();
  const guest: GuestStore = { ...browserGuestStore, forgetSeenLeaves };
  const service = createAccountService({
    config: options.config === undefined ? TEST_CONFIG : options.config,
    loadBackend,
    guest,
  });
  services.push(service);
  return { service, loadBackend, forgetSeenLeaves };
}

/** Let every pending promise in the service run, without moving the clock. */
async function settle() {
  for (let round = 0; round < 20; round += 1) await vi.advanceTimersByTimeAsync(0);
}

/** A stored session, as supabase-js leaves it after signing in. */
function storeSession(user = ANA) {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ access_token: "a.b.c", refresh_token: "r", user: { id: user.id, email: user.email } }),
  );
}

function at(path: string) {
  window.history.replaceState(null, "", path);
}

function setOnline(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  window.dispatchEvent(new Event(online ? "online" : "offline"));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  server = createFakeServer();
  at("/");
});

afterEach(() => {
  for (const service of services) service.stop();
  services = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
  at("/");
});

describe("a build without accounts", () => {
  it("is unavailable and never loads anything", async () => {
    const { service, loadBackend } = make({ config: null });
    service.start();
    service.prepare();
    await service.signIn();
    await settle();
    expect(service.getSnapshot().status).toBe("unavailable");
    expect(loadBackend).not.toHaveBeenCalled();
  });
});

describe("a guest", () => {
  it("who has never signed in loads nothing and sends nothing", async () => {
    localStorage.setItem(FAVOURITES, JSON.stringify({ ids: ["pear"] }));
    const { service, loadBackend } = make();
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", notice: null, record: null });
    expect(loadBackend).not.toHaveBeenCalled();
    // Their own list is untouched.
    expect(JSON.parse(localStorage.getItem(FAVOURITES)!)).toEqual({ ids: ["pear"] });
  });

  it("starts loading the client when the sign-in sheet opens, and only then", async () => {
    const { service, loadBackend } = make();
    service.start();
    await settle();
    expect(loadBackend).not.toHaveBeenCalled();
    service.prepare();
    await settle();
    expect(loadBackend).toHaveBeenCalledTimes(1);
    expect(server.log).toEqual([]); // loaded, but nothing asked of the account
  });

  it("who abandoned a sign-in is told once, gently", async () => {
    saveSignInIntent(localStorage, "/studio", new Date(NOW.getTime() - 60_000));
    const first = make();
    first.service.start();
    await settle();
    expect(first.service.getSnapshot().notice).toMatchObject({ kind: "sign-in-unfinished" });
    expect(localStorage.getItem(SIGN_IN_KEY)).toBeNull();

    const second = make();
    second.service.start();
    await settle();
    expect(second.service.getSnapshot().notice).toBeNull();
  });

  it("is not told about a sign-in abandoned long ago", async () => {
    saveSignInIntent(localStorage, "/studio", new Date(NOW.getTime() - INTENT_MAX_AGE_MS - 1));
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot().notice).toBeNull();
  });
});

describe("signing in", () => {
  it("remembers where the person was and goes to Google, returning to this page without its route", async () => {
    at("/#/browse?time=short");
    const { service } = make();
    service.start();
    await service.signIn();
    expect(server.signInTargets).toEqual(["http://localhost:3000/"]);
    expect(JSON.parse(localStorage.getItem(SIGN_IN_KEY)!)).toMatchObject({ returnTo: "/browse?time=short" });
    expect(service.getSnapshot().busy).toBe("signing-in");
  });

  it("returns to the studio from a route it does not trust", async () => {
    at("/#//evil.example");
    const { service } = make();
    service.start();
    await service.signIn();
    expect(JSON.parse(localStorage.getItem(SIGN_IN_KEY)!)).toMatchObject({ returnTo: "/studio" });
  });

  it("says so when the client cannot load, and stops being busy", async () => {
    const { service } = make({ loadFails: true });
    service.start();
    await service.signIn();
    expect(service.getSnapshot()).toMatchObject({ busy: null, notice: { kind: "sign-in-failed", reason: "unavailable" } });
    expect(localStorage.getItem(SIGN_IN_KEY)).toBeNull();
  });

  it("knows offline from unavailable", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { service } = make({ loadFails: true });
    service.start();
    await service.signIn();
    expect(service.getSnapshot().notice).toMatchObject({ kind: "sign-in-failed", reason: "offline" });
  });

  it("un-sticks the button when the browser comes back from Google's screen", async () => {
    const { service } = make();
    service.start();
    await service.signIn();
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(service.getSnapshot().busy).toBeNull();
    expect(localStorage.getItem(SIGN_IN_KEY)).toBeNull();
  });
});

describe("coming back from Google", () => {
  beforeEach(() => {
    saveSignInIntent(localStorage, "/studio", NOW);
  });

  it("moves this browser's pieces into the account, says how many, and empties the browser's lists", async () => {
    localStorage.setItem(FAVOURITES, JSON.stringify({ ids: ["already-there", "pear"] }));
    localStorage.setItem(PAINTED, JSON.stringify({ entries: [{ id: "mug", on: "2026-09-14" }] }));
    server.rows.set(ANA.id, { saved: [{ id: "already-there", at: "2026-09-01T00:00:00.000Z" }], painted: [] });
    server.session = ANA;
    at("/?code=from-google");

    const { service } = make();
    service.start();
    await settle();

    const snapshot = service.getSnapshot();
    expect(snapshot.status).toBe("signed-in");
    expect(snapshot.user).toEqual(ANA);
    expect(snapshot.notice).toMatchObject({ kind: "signed-in", email: ANA.email, added: { saved: 1, painted: 1 } });
    expect(snapshot.record?.saved.map((r) => r.id)).toEqual(["already-there", "pear"]);
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["already-there", "pear"]);
    expect(server.rowsOf(ANA.id).painted).toEqual([{ id: "mug", on: "2026-09-14", at: "2026-09-14T12:00:00.000Z" }]);
    expect(localStorage.getItem(FAVOURITES)).toBeNull();
    expect(localStorage.getItem(PAINTED)).toBeNull();
    expect(snapshot.pending).toBe(0);
    expect(snapshot.sync).toBe("idle");
  });

  it("takes the person back to where they were, once, and cleans the address", async () => {
    server.session = ANA;
    at("/?code=from-google#/");
    const { service } = make();
    service.start();
    await settle();
    expect(window.location.search).toBe("");
    expect(service.takeReturnTo()).toBe("/studio");
    expect(service.takeReturnTo()).toBeNull();
  });

  it("turns a cancel at Google into a plain message and a clean address", async () => {
    at("/?error=access_denied&error_code=access_denied&error_description=denied#error=access_denied");
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({
      status: "signed-out",
      notice: { kind: "sign-in-failed", reason: "cancelled" },
      returnTo: null,
    });
    expect(window.location.href).toBe("http://localhost:3000/");
  });

  it("says to start again when the code cannot be used here", async () => {
    // A code with no session: finished in another browser, or too late.
    at("/?code=stale");
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({
      status: "signed-out",
      notice: { kind: "sign-in-failed", reason: "not-finished" },
    });
    expect(window.location.search).toBe("");
  });

  it("keeps a still-valid session when a second attempt fails", async () => {
    storeSession();
    saveDevice(localStorage, { userId: ANA.id, email: ANA.email, record: { saved: [], painted: [] }, pending: [], pulledAt: null });
    server.session = ANA;
    at("/?error=server_error");
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({
      status: "signed-in",
      notice: { kind: "sign-in-failed", reason: "unavailable" },
    });
  });
});

describe("a second visit, signed in", () => {
  it("shows this device's copy at once, then what the account holds", async () => {
    storeSession();
    saveDevice(localStorage, {
      userId: ANA.id,
      email: ANA.email,
      record: { saved: [{ id: "pear", at: "2026-09-01T00:00:00.000Z" }], painted: [] },
      pending: [],
      pulledAt: null,
    });
    server.session = ANA;
    server.rows.set(ANA.id, {
      saved: [
        { id: "pear", at: "2026-09-01T00:00:00.000Z" },
        { id: "saved-on-the-phone", at: "2026-09-02T00:00:00.000Z" },
      ],
      painted: [],
    });

    const { service } = make();
    service.start();
    // Before anything has been heard back.
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", user: ANA });
    expect(service.getSnapshot().record?.saved.map((r) => r.id)).toEqual(["pear"]);

    await settle();
    expect(service.getSnapshot().record?.saved.map((r) => r.id)).toEqual(["pear", "saved-on-the-phone"]);
    // Nothing is announced on an ordinary return.
    expect(service.getSnapshot().notice).toBeNull();
  });

  it("ends a session the account no longer accepts, and leaves nothing behind", async () => {
    storeSession();
    saveDevice(localStorage, { userId: ANA.id, email: ANA.email, record: { saved: [{ id: "pear", at: "2026-09-01T00:00:00.000Z" }], painted: [] }, pending: [], pulledAt: null });
    server.session = null;

    const { service, forgetSeenLeaves } = make();
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", record: null, notice: { kind: "session-ended" } });
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(forgetSeenLeaves).toHaveBeenCalled();
  });

  it("carries on from this device's copy when the client cannot load, and tries again", async () => {
    storeSession();
    saveDevice(localStorage, { userId: ANA.id, email: ANA.email, record: { saved: [{ id: "pear", at: "2026-09-01T00:00:00.000Z" }], painted: [] }, pending: [], pulledAt: null });
    const { service } = make({ loadFails: true });
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", sync: "failed" });
    expect(service.getSnapshot().record?.saved).toHaveLength(1);
  });

  it("never shows someone else's copy left on the device", async () => {
    storeSession(BEN);
    saveDevice(localStorage, { userId: ANA.id, email: ANA.email, record: { saved: [{ id: "anas-pear", at: "2026-09-01T00:00:00.000Z" }], painted: [] }, pending: [], pulledAt: null });
    server.session = BEN;
    const { service } = make();
    service.start();
    expect(service.getSnapshot().record).toBeNull();
    await settle();
    expect(service.getSnapshot().user).toEqual(BEN);
    expect(service.getSnapshot().record?.saved).toEqual([]);
  });
});

async function signedIn(rows = { saved: [], painted: [] } as FakeServer["rows"] extends Map<string, infer R> ? R : never) {
  storeSession();
  saveDevice(localStorage, { userId: ANA.id, email: ANA.email, record: rows, pending: [], pulledAt: null });
  server.session = ANA;
  server.rows.set(ANA.id, rows);
  const made = make();
  made.service.start();
  await settle();
  server.log.length = 0;
  return made;
}

describe("changes while signed in", () => {
  it("shows a change at once and sends several quick ones together", async () => {
    const { service } = await signedIn();
    service.toggleSaved("pear");
    service.toggleSaved("mug");
    service.togglePainted("pear", "2026-10-02");
    expect(service.getSnapshot().record?.saved.map((r) => r.id)).toEqual(["pear", "mug"]);
    expect(service.getSnapshot().pending).toBe(3);

    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS - 1);
    expect(server.log.filter((entry) => entry.startsWith("push"))).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await settle();

    expect(server.log.filter((entry) => entry.startsWith("push"))).toEqual(["push +saved:pear +saved:mug +painted:pear"]);
    expect(server.rowsOf(ANA.id).painted).toEqual([{ id: "pear", on: "2026-10-02", at: NOW.toISOString() }]);
    expect(service.getSnapshot()).toMatchObject({ pending: 0, sync: "idle" });
  });

  it("ignores ids and days the account would refuse", async () => {
    const { service } = await signedIn();
    service.toggleSaved("not an id");
    service.togglePainted("pear", "2026-02-30");
    expect(service.getSnapshot().pending).toBe(0);
  });

  it("keeps changes while offline and sends them when the connection returns", async () => {
    const { service } = await signedIn();
    setOnline(false);
    service.toggleSaved("pear");
    expect(service.getSnapshot().sync).toBe("offline");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS * 3);
    await settle();
    expect(server.rowsOf(ANA.id).saved).toEqual([]);
    // Kept on the device meanwhile, surviving a reload.
    expect(loadDevice(localStorage, ANA.id)?.pending).toEqual(["saved:pear"]);

    setOnline(true);
    await settle();
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["pear"]);
    expect(service.getSnapshot()).toMatchObject({ pending: 0, sync: "idle" });
  });

  it("tries again with a growing pause when the account cannot be reached", async () => {
    const { service } = await signedIn();
    server.failures.push("unavailable", "unavailable");
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    expect(service.getSnapshot().sync).toBe("failed");
    expect(server.rowsOf(ANA.id).saved).toEqual([]);

    await vi.advanceTimersByTimeAsync(RETRY_FIRST_MS);
    await settle();
    expect(service.getSnapshot().sync).toBe("failed"); // the second failure

    await vi.advanceTimersByTimeAsync(RETRY_FIRST_MS * 2 - 1);
    expect(server.rowsOf(ANA.id).saved).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await settle();
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["pear"]);
    expect(service.getSnapshot().sync).toBe("idle");
  });

  it("tries again at once when asked", async () => {
    const { service } = await signedIn();
    server.failures.push("unavailable");
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    expect(service.getSnapshot().sync).toBe("failed");
    service.retry();
    await settle();
    expect(service.getSnapshot().sync).toBe("idle");
  });

  it("sends a change again if it changed while the first send was in flight", async () => {
    const { service } = await signedIn();
    server.holdPushes = true;
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    expect(server.log.filter((entry) => entry.startsWith("push"))).toEqual(["push +saved:pear"]);

    // Unsaved again while the request is out.
    service.toggleSaved("pear");
    server.holdPushes = false;
    server.release();
    await settle();
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();

    expect(server.log.filter((entry) => entry.startsWith("push"))).toEqual(["push +saved:pear", "push -saved:pear"]);
    expect(server.rowsOf(ANA.id).saved).toEqual([]);
    expect(service.getSnapshot().record?.saved).toEqual([]);
    expect(service.getSnapshot().pending).toBe(0);
  });

  it("drops a change the account refuses for good, says so, and keeps the account's version", async () => {
    const { service } = await signedIn();
    server.refuses.add("refused-piece");
    service.toggleSaved("refused-piece");
    service.toggleSaved("fine-piece");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    expect(service.getSnapshot().notice).toMatchObject({ kind: "changes-refused", count: 1 });
    expect(service.getSnapshot().record?.saved.map((r) => r.id)).toEqual(["fine-piece"]);
    expect(service.getSnapshot().pending).toBe(0);
  });

  /*
    From the independent review, 02/10/2026: a single "unauthorised" answer
    used to end the session and wipe the device, unsent changes and all. The
    real client answers that way whenever a refresh fails for a moment - the
    access token lives an hour, so it has always expired when a daily app is
    opened - while the session is still perfectly good. A session that is
    really over is removed from storage by supabase-js, which also says so.
  */
  it("treats one unauthorised answer as a moment's trouble while the session is still stored", async () => {
    const { service } = await signedIn();
    server.failures.push("unauthorised");
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", sync: "failed", pending: 1 });
    expect(loadDevice(localStorage, ANA.id)?.pending).toEqual(["saved:pear"]);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

    await vi.advanceTimersByTimeAsync(RETRY_FIRST_MS);
    await settle();
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["pear"]);
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", sync: "idle", pending: 0 });
  });

  it("ends the session when the account stops accepting it and the session has gone", async () => {
    const { service } = await signedIn();
    server.failures.push("unauthorised");
    // supabase-js removes a session it can no longer refresh.
    localStorage.removeItem(AUTH_STORAGE_KEY);
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", notice: { kind: "session-ended" } });
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
  });

  it("keeps this device's copy and its unsent changes when the account cannot be checked at start-up", async () => {
    storeSession();
    saveDevice(localStorage, {
      userId: ANA.id,
      email: ANA.email,
      record: { saved: [], painted: [{ id: "blue-mug", on: "2026-10-01", at: "2026-10-01T19:00:00.000Z" }] },
      pending: ["painted:blue-mug"],
      pulledAt: null,
    });
    server.session = ANA;
    server.trouble = "unavailable";
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", sync: "failed", pending: 1 });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

    server.trouble = null;
    await vi.advanceTimersByTimeAsync(RETRY_FIRST_MS);
    await settle();
    expect(server.rowsOf(ANA.id).painted.map((r) => r.id)).toEqual(["blue-mug"]);
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", sync: "idle", pending: 0 });
  });

  it("is signed in from the stored session even with no copy here, when the account cannot be checked", async () => {
    storeSession();
    server.session = ANA;
    server.trouble = "unavailable";
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", user: { id: ANA.id }, sync: "failed" });
  });

  it("tries again when a request fails while the browser says it is online", async () => {
    // Wi-Fi with no internet behind it, a captive portal, a DNS failure: no
    // "online" event will ever come, because the browser thinks it is online.
    const { service } = await signedIn();
    server.failures.push("offline");
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    expect(service.getSnapshot().sync).toBe("failed");
    await vi.advanceTimersByTimeAsync(RETRY_FIRST_MS);
    await settle();
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["pear"]);
  });

  it("hears from the account on coming back to the app after a while, not on every glance", async () => {
    await signedIn();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(server.log).toEqual([]);

    await vi.advanceTimersByTimeAsync(REFRESH_AFTER_MS + 1);
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(server.log).toContain("fetch");
  });
});

describe("first sign-in, when things go wrong", () => {
  beforeEach(() => {
    saveSignInIntent(localStorage, "/studio", NOW);
    localStorage.setItem(FAVOURITES, JSON.stringify({ ids: ["ripe-pear"] }));
    server.session = ANA;
    at("/?code=from-google");
  });

  /*
    From the independent review, 02/10/2026: this browser's lists were emptied
    as soon as their pieces were in the account's record here - before the
    account had them - so a session that ended first lost them everywhere.
  */
  it("puts this browser's pieces back if the session ends before the account has them", async () => {
    server.failures.push("unavailable");
    const { service } = make();
    service.start();
    await settle();
    expect(server.rowsOf(ANA.id).saved).toEqual([]);
    server.endSessionElsewhere();
    await settle();
    expect(service.getSnapshot().status).toBe("signed-out");
    expect(JSON.parse(localStorage.getItem(FAVOURITES)!)).toEqual({ ids: ["ripe-pear"] });
  });

  it("empties this browser's lists, and drops the copy it kept, once the account has the pieces", async () => {
    const { service } = make();
    service.start();
    await settle();
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["ripe-pear"]);
    expect(localStorage.getItem(FAVOURITES)).toBeNull();
    expect(loadDevice(localStorage, ANA.id)?.guestBackup).toBeNull();
    expect(service.getSnapshot().notice).toMatchObject({ kind: "signed-in", added: { saved: 1, painted: 0 }, sent: true });
  });

  it("says the pieces will move across, not that they have, when they could not be sent", async () => {
    server.failures.push("unavailable", "unavailable");
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot().notice).toMatchObject({ kind: "signed-in", added: { saved: 1 }, sent: false });
    expect(loadDevice(localStorage, ANA.id)?.guestBackup).toEqual({ saved: ["ripe-pear"], painted: [] });

    // The first try again fails too; nothing has moved, and the backup stays.
    await vi.advanceTimersByTimeAsync(RETRY_FIRST_MS);
    await settle();
    expect(server.rowsOf(ANA.id).saved).toEqual([]);
    expect(loadDevice(localStorage, ANA.id)?.guestBackup).toEqual({ saved: ["ripe-pear"], painted: [] });

    await vi.advanceTimersByTimeAsync(RETRY_FIRST_MS * 2);
    await settle();
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["ripe-pear"]);
    expect(loadDevice(localStorage, ANA.id)?.guestBackup).toBeNull();
  });

  it("does not merge the same pieces again after a reload, even one unsaved since", async () => {
    server.failures.push("unavailable", "unavailable");
    const first = make();
    first.service.start();
    await settle();
    // Unsaved in the account before anything was sent; the page is reloaded.
    first.service.toggleSaved("ripe-pear");
    first.service.stop();
    at("/");
    server.failures.length = 0;
    const second = make();
    second.service.start();
    await settle();
    expect(second.service.getSnapshot().record?.saved).toEqual([]);
    expect(server.rowsOf(ANA.id).saved).toEqual([]);
  });
});

describe("other tabs", () => {
  it("shows a change another tab made", async () => {
    const { service } = await signedIn();
    const stored = loadDevice(localStorage, ANA.id)!;
    saveDevice(localStorage, { ...stored, record: { saved: [{ id: "from-the-other-tab", at: NOW.toISOString() }], painted: [] } });
    window.dispatchEvent(new StorageEvent("storage", { key: DEVICE_KEY }));
    expect(service.getSnapshot().record?.saved.map((r) => r.id)).toEqual(["from-the-other-tab"]);
  });

  it("signs this tab out when another tab signs out", async () => {
    const { service } = await signedIn();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", notice: { kind: "session-ended" } });
  });

  it("signs out when the session ends elsewhere", async () => {
    const { service } = await signedIn();
    server.endSessionElsewhere();
    await settle();
    expect(service.getSnapshot().status).toBe("signed-out");
  });

  it("never writes the account's record back after another tab signed out mid-send", async () => {
    const { service } = await signedIn();
    server.holdPushes = true;
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    // Another tab signs out; its storage event has not been delivered yet.
    localStorage.removeItem(DEVICE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    server.release();
    await settle();
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
    expect(service.getSnapshot().status).toBe("signed-out");
  });

  it("follows a sign-in made in another tab, as it follows a sign-out", async () => {
    localStorage.setItem(FAVOURITES, JSON.stringify({ ids: ["ripe-pear"] }));
    const { service } = make();
    service.start();
    await settle();
    expect(service.getSnapshot().status).toBe("signed-out");

    // Ana signs in in another tab: supabase-js stores her session there.
    server.session = ANA;
    storeSession();
    window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));
    await settle();

    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", user: { id: ANA.id } });
    // This browser's pieces join the account, as on any start.
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["ripe-pear"]);
  });

  it("does not follow other keys, such as another tab setting off for Google", async () => {
    const { service, loadBackend } = make();
    service.start();
    await settle();
    localStorage.setItem(`${AUTH_STORAGE_KEY}-code-verifier`, JSON.stringify("verifier"));
    window.dispatchEvent(new StorageEvent("storage", { key: `${AUTH_STORAGE_KEY}-code-verifier` }));
    window.dispatchEvent(new StorageEvent("storage", { key: FAVOURITES }));
    await settle();
    expect(loadBackend).not.toHaveBeenCalled();
    expect(service.getSnapshot().status).toBe("signed-out");
  });

  it("signs this tab out when another tab signs someone else in", async () => {
    const { service } = await signedIn();
    // Ben signs in in another tab: his session replaces Ana's.
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ access_token: "a.b.c", refresh_token: "r", user: { id: BEN.id, email: BEN.email } }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", record: null });
    // And Ana's pieces are no longer written anywhere.
    service.toggleSaved("anas-new-piece");
    expect(loadDevice(localStorage, ANA.id)).toBeNull();
  });
});

describe("signing out", () => {
  it("sends what it can first, then leaves nothing of the account in the browser", async () => {
    const { service, forgetSeenLeaves } = await signedIn();
    service.toggleSaved("pear");
    await service.signOut();
    await settle();
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["pear"]);
    expect(server.log).toContain("signOut");
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", record: null, user: null, notice: { kind: "signed-out" } });
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(forgetSeenLeaves).toHaveBeenCalled();
  });

  it("waits for a send already under way, and does not ask about changes it then sends", async () => {
    const { service } = await signedIn();
    server.holdPushes = true;
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    // Changed again while that first request is out, then signed out.
    service.toggleSaved("mug");
    const out = service.signOut();
    await settle();
    server.release(); // the first send answers; the follow-up is held a moment
    await settle();
    server.holdPushes = false;
    server.release();
    await out;
    await settle();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", confirmSignOut: false });
    expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual(["pear", "mug"]);
  });

  it("does not stay stuck signing out behind a request that never answers", async () => {
    const { service } = await signedIn();
    server.holdPushes = true; // and never released
    service.toggleSaved("pear");
    await vi.advanceTimersByTimeAsync(SEND_DELAY_MS);
    await settle();
    const out = service.signOut();
    await vi.advanceTimersByTimeAsync(SIGN_OUT_WAIT_MS);
    await settle();
    await out;
    // It cannot know the change arrived, so it asks rather than guess.
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", confirmSignOut: true, busy: null });
    await service.signOut({ discardUnsent: true });
    await vi.advanceTimersByTimeAsync(SIGN_OUT_WAIT_MS);
    await settle();
    expect(service.getSnapshot().status).toBe("signed-out");
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
  });

  it("closes the question by itself once the changes it asked about have gone", async () => {
    const { service } = await signedIn();
    setOnline(false);
    service.toggleSaved("pear");
    await service.signOut();
    expect(service.getSnapshot().confirmSignOut).toBe(true);
    setOnline(true);
    await settle();
    expect(service.getSnapshot()).toMatchObject({ pending: 0, confirmSignOut: false, status: "signed-in" });
  });

  it("asks before throwing away changes that cannot be sent", async () => {
    const { service } = await signedIn();
    setOnline(false);
    service.toggleSaved("pear");
    await service.signOut();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", confirmSignOut: true, busy: null });

    service.keepSignedIn();
    expect(service.getSnapshot().confirmSignOut).toBe(false);
    expect(service.getSnapshot().pending).toBe(1);

    await service.signOut({ discardUnsent: true });
    expect(service.getSnapshot().status).toBe("signed-out");
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
  });
});

describe("deleting the account", () => {
  it("deletes it and everything in it, and signs this device out", async () => {
    const { service } = await signedIn({ saved: [{ id: "pear", at: NOW.toISOString() }], painted: [] });
    await service.deleteAccount();
    await settle();
    expect(server.rows.has(ANA.id)).toBe(false);
    expect(service.getSnapshot()).toMatchObject({ status: "signed-out", notice: { kind: "deleted" } });
    expect(localStorage.getItem(DEVICE_KEY)).toBeNull();
  });

  it("keeps everything and says so when it cannot", async () => {
    const { service } = await signedIn({ saved: [{ id: "pear", at: NOW.toISOString() }], painted: [] });
    server.failures.push("unavailable");
    await service.deleteAccount();
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", busy: null, notice: { kind: "delete-failed" } });
    expect(server.rows.has(ANA.id)).toBe(true);
  });
});

describe("notices", () => {
  it("can be dismissed, and the same message said again is a new notice", async () => {
    const { service } = make({ loadFails: true });
    service.start();
    await service.signIn();
    const first = service.getSnapshot().notice!;
    expect(first).toMatchObject({ kind: "sign-in-failed", reason: "unavailable" });

    service.dismissNotice();
    expect(service.getSnapshot().notice).toBeNull();
    service.dismissNotice(); // nothing to dismiss: no change, no error
    expect(service.getSnapshot().notice).toBeNull();

    await service.signIn();
    const second = service.getSnapshot().notice!;
    expect(second.kind).toBe(first.kind);
    // A new id, so the page announces it again rather than treating it as old.
    expect(second.id).toBeGreaterThan(first.id);
  });
});
