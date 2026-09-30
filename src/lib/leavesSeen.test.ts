import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as seenModule from "./leavesSeen";
import {
  ARRIVALS_AT_ONCE,
  leavesToArrive,
  loadSeenLeaves,
  persistSeenLeaves,
} from "./leavesSeen";

const KEY = "little-wash:leaves-seen:v1";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the record of leaves already seen", () => {
  it("starts empty", () => {
    expect(loadSeenLeaves()).toEqual([]);
  });

  it("round-trips", () => {
    persistSeenLeaves(["pear", "mug"]);
    expect(loadSeenLeaves()).toEqual(["pear", "mug"]);
  });

  it("replaces rather than accumulates, so an unmarked piece drops out", () => {
    persistSeenLeaves(["pear", "mug"]);
    persistSeenLeaves(["mug"]);
    expect(loadSeenLeaves()).toEqual(["mug"]);
  });

  it("recovers from stored data it cannot read", () => {
    localStorage.setItem(KEY, "{ not json");
    expect(loadSeenLeaves()).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify({ entries: ["pear"] }));
    expect(loadSeenLeaves()).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify({ ids: ["pear", 4, "", null] }));
    expect(loadSeenLeaves()).toEqual(["pear"]);
  });

  it("remembers in memory when storage is unavailable, so a leaf still arrives only once", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(() => persistSeenLeaves(["pear"])).not.toThrow();
    expect(loadSeenLeaves()).toEqual(["pear"]);
  });

  it("still remembers when storage can be read but not written - a full quota", () => {
    // Reads worked, so the stale stored record came back and every leaf
    // arrived again on every visit.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    persistSeenLeaves(["pear", "mug"]);
    expect(loadSeenLeaves()).toEqual(["pear", "mug"]);
    expect(leavesToArrive(["pear", "mug"], loadSeenLeaves())).toEqual([]);
  });

  it("holds ids and nothing else - no dates, no counts", () => {
    // DESIGN.md's painted register: nothing may read across the dates. This
    // record never sees them, so it cannot.
    persistSeenLeaves(["pear"]);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({ ids: ["pear"] });
    const forbidden = /streak|date|day|count|total|progress|goal|target/i;
    expect(Object.keys(seenModule).filter((name) => forbidden.test(name))).toEqual([]);
  });
});

describe("leavesToArrive", () => {
  it("is the painted pieces not yet seen, in the order they were painted", () => {
    expect(leavesToArrive(["a", "b", "c", "d"], ["a", "c"])).toEqual(["b", "d"]);
  });

  it("is nothing once everything has been seen", () => {
    expect(leavesToArrive(["a", "b"], ["b", "a"])).toEqual([]);
  });

  it("lets only the newest few arrive when many are new", () => {
    const painted = Array.from({ length: 20 }, (_, i) => `p${i}`);
    expect(leavesToArrive(painted, [])).toEqual(painted.slice(-ARRIVALS_AT_ONCE));
    expect(leavesToArrive(painted, [], 2)).toEqual(["p18", "p19"]);
  });

  it("lets nothing arrive when nothing may", () => {
    expect(leavesToArrive(["a"], [], 0)).toEqual([]);
  });

  it("ignores seen ids that are no longer painted", () => {
    expect(leavesToArrive(["a"], ["gone", "a"])).toEqual([]);
  });
});
