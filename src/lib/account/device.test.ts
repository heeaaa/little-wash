import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_STORAGE_KEY,
  DEVICE_KEY,
  SIGN_IN_KEY,
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

const ANA = "0b6f2c1e-0000-4000-8000-00000000000a";
const BEN = "0b6f2c1e-0000-4000-8000-00000000000b";
const NOW = new Date("2026-10-02T08:00:00.000Z");

const anas: DeviceRecord = {
  userId: ANA,
  email: "ana@example.test",
  record: { saved: [{ id: "pear", at: "2026-10-01T08:00:00.000Z" }], painted: [] },
  pending: ["saved:pear"],
  pulledAt: null,
  guestBackup: { saved: ["pear"], painted: [{ id: "mug", on: "2026-10-01" }] },
};

/** Storage that refuses every call, like a locked-down private window. */
const brokenStorage: StorageLike = {
  get length(): number {
    throw new Error("denied");
  },
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  },
  removeItem: () => {
    throw new Error("denied");
  },
  key: () => {
    throw new Error("denied");
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the account's record on this device", () => {
  it("round-trips through storage", () => {
    expect(saveDevice(localStorage, anas)).toBe(true);
    expect(loadDevice(localStorage, ANA)).toEqual(anas);
  });

  it("never hands one person's record to another", () => {
    saveDevice(localStorage, anas);
    expect(loadDevice(localStorage, BEN)).toBeNull();
  });

  it("treats missing, unreadable or unversioned records as absent", () => {
    expect(loadDevice(localStorage, ANA)).toBeNull();
    localStorage.setItem(DEVICE_KEY, "{not json");
    expect(loadDevice(localStorage, ANA)).toBeNull();
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ ...anas, v: 2 }));
    expect(loadDevice(localStorage, ANA)).toBeNull();
    expect(loadDevice(null, ANA)).toBeNull();
    expect(loadDevice(brokenStorage, ANA)).toBeNull();
  });

  it("cleans what it reads: bad rows and bad pending keys are dropped", () => {
    localStorage.setItem(
      DEVICE_KEY,
      JSON.stringify({ v: 1, userId: ANA, email: 7, record: { saved: [{ id: "bad id", at: "x" }] }, pending: ["nope"], pulledAt: 3 }),
    );
    expect(loadDevice(localStorage, ANA)).toEqual(emptyDevice(ANA, null));
  });

  it("reads a damaged or empty guest backup as none, keeping the good pieces of a partly damaged one", () => {
    const stored = (guestBackup: unknown) =>
      localStorage.setItem(DEVICE_KEY, JSON.stringify({ v: 1, ...anas, guestBackup }));

    stored({ saved: ["plum", "bad id"], painted: [{ id: "mug", on: "yesterday" }, { id: "jug", on: "2026-09-30" }] });
    expect(loadDevice(localStorage, ANA)?.guestBackup).toEqual({ saved: ["plum"], painted: [{ id: "jug", on: "2026-09-30" }] });

    for (const damaged of [undefined, null, "pear", { saved: [], painted: [] }, { saved: ["bad id"] }]) {
      stored(damaged);
      expect(loadDevice(localStorage, ANA)?.guestBackup).toBeNull();
    }
  });

  it("says when storage would not take it", () => {
    expect(saveDevice(brokenStorage, anas)).toBe(false);
    expect(saveDevice(null, anas)).toBe(false);
  });
});

describe("the session hint", () => {
  it("is absent with no stored session", () => {
    expect(readSessionHint(localStorage)).toBeNull();
    expect(readSessionHint(brokenStorage)).toBeNull();
  });

  it("names the person from the session supabase-js stores", () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ access_token: "a.b.c", refresh_token: "r", user: { id: ANA, email: "ana@example.test" } }),
    );
    expect(readSessionHint(localStorage)).toEqual({ userId: ANA, email: "ana@example.test" });
  });

  it("is 'unreadable' for a session it cannot parse, so the client gets to decide", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "{garbled");
    expect(readSessionHint(localStorage)).toBe("unreadable");
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: { id: "not-a-uuid" } }));
    expect(readSessionHint(localStorage)).toBe("unreadable");
  });
});

describe("where to return after signing in", () => {
  it("accepts the app's own routes, with their filters", () => {
    for (const path of ["/", "/studio", "/browse?time=short&shown=48", "/piece/red-and-gold-grapes-xYPg", "/series/three-pears"]) {
      expect(isSafeReturn(path)).toBe(true);
    }
  });

  it("refuses anything that could leave the app", () => {
    for (const path of ["//evil.example", "/\\evil.example", "https://evil.example", "studio", "/a b", "#/studio", "/".repeat(301), 3]) {
      expect(isSafeReturn(path)).toBe(false);
    }
  });

  it("is remembered for half an hour and read once", () => {
    saveSignInIntent(localStorage, "/browse?time=short", NOW);
    const later = new Date(NOW.getTime() + 5 * 60_000);
    expect(takeSignInIntent(localStorage, later, 30 * 60_000)).toEqual({
      returnTo: "/browse?time=short",
      startedAt: NOW.toISOString(),
    });
    expect(takeSignInIntent(localStorage, later, 30 * 60_000)).toBeNull();
  });

  it("forgets a stale intent and replaces an unsafe route with the studio", () => {
    saveSignInIntent(localStorage, "/browse", NOW);
    expect(takeSignInIntent(localStorage, new Date(NOW.getTime() + 31 * 60_000), 30 * 60_000)).toBeNull();
    expect(localStorage.getItem(SIGN_IN_KEY)).toBeNull();

    saveSignInIntent(localStorage, "//evil.example", NOW);
    expect(takeSignInIntent(localStorage, NOW, 30 * 60_000)?.returnTo).toBe("/studio");

    // Tampered with after it was stored.
    localStorage.setItem(SIGN_IN_KEY, JSON.stringify({ returnTo: "https://evil.example", startedAt: NOW.toISOString() }));
    expect(takeSignInIntent(localStorage, NOW, 30 * 60_000)?.returnTo).toBe("/studio");
  });

  it("ignores an intent from the future, or one it cannot read", () => {
    saveSignInIntent(localStorage, "/browse", new Date(NOW.getTime() + 60_000));
    expect(takeSignInIntent(localStorage, NOW, 30 * 60_000)).toBeNull();
    localStorage.setItem(SIGN_IN_KEY, "nope");
    expect(takeSignInIntent(localStorage, NOW, 30 * 60_000)).toBeNull();
    expect(() => saveSignInIntent(brokenStorage, "/", NOW)).not.toThrow();
    expect(takeSignInIntent(brokenStorage, NOW, 30 * 60_000)).toBeNull();
  });
});

describe("signing out leaves nothing of the account behind", () => {
  it("removes the record, the session, its verifier and any sign-in in progress", () => {
    saveDevice(localStorage, anas);
    localStorage.setItem(AUTH_STORAGE_KEY, "{}");
    localStorage.setItem(`${AUTH_STORAGE_KEY}-code-verifier`, "verifier");
    localStorage.setItem(`${AUTH_STORAGE_KEY}-user`, "{}");
    saveSignInIntent(localStorage, "/studio", NOW);

    // The guest's own lists and preferences are not the account's to remove.
    localStorage.setItem("little-wash:favorites:v1", JSON.stringify({ ids: ["x"] }));
    localStorage.setItem("little-wash:sources:v1", JSON.stringify({ disabled: [] }));
    localStorage.setItem("little-wash:auth:v10", "a different key that merely starts the same");

    clearAccountTraces(localStorage);

    expect(Object.keys(localStorage).sort()).toEqual([
      "little-wash:auth:v10",
      "little-wash:favorites:v1",
      "little-wash:sources:v1",
    ]);
  });

  it("does nothing, quietly, when storage is unavailable", () => {
    expect(() => clearAccountTraces(brokenStorage)).not.toThrow();
    expect(() => clearAccountTraces(null)).not.toThrow();
  });
});
