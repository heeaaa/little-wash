import { describe, it, expect, beforeEach } from "vitest";
import * as painted from "./painted";
import {
  isPainted,
  loadPainted,
  persistPainted,
  today,
  togglePainted,
} from "./painted";
import { paintedReferences } from "./catalog";
import { makeReference } from "@/test/factory";

const KEY = "little-wash:painted:v1";
const DAY = "2026-09-20";

beforeEach(() => {
  localStorage.clear();
});

describe("today", () => {
  it("is the local calendar day, not UTC", () => {
    // A person means the day they were painting, whatever their offset. Using
    // toISOString here would move the date for anyone east of Greenwich late
    // in the evening.
    const evening = new Date(2026, 8, 20, 23, 30);
    expect(today(evening)).toBe("2026-09-20");
  });

  it("pads months and days", () => {
    expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("togglePainted", () => {
  it("marks a piece that is not yet painted", () => {
    expect(togglePainted([], "pear", DAY)).toEqual([{ id: "pear", on: DAY }]);
  });

  it("unmarks a piece that is", () => {
    const entries = [
      { id: "pear", on: DAY },
      { id: "mug", on: DAY },
    ];
    expect(togglePainted(entries, "pear", DAY)).toEqual([{ id: "mug", on: DAY }]);
  });

  it("records the new day when something is marked again", () => {
    // A set, not a log: re-marking says when you last did it rather than
    // keeping a stale date.
    const once = togglePainted([], "pear", "2026-09-01");
    const cleared = togglePainted(once, "pear", "2026-09-20");
    expect(togglePainted(cleared, "pear", "2026-09-20")).toEqual([
      { id: "pear", on: "2026-09-20" },
    ]);
  });

  it("does not mutate the input", () => {
    const entries = [{ id: "pear", on: DAY }];
    togglePainted(entries, "mug", DAY);
    expect(entries).toEqual([{ id: "pear", on: DAY }]);
  });

  it("appends, so the newest is last in storage", () => {
    const first = togglePainted([], "pear", DAY);
    const second = togglePainted(first, "mug", DAY);
    expect(second.map((e) => e.id)).toEqual(["pear", "mug"]);
  });
});

describe("isPainted", () => {
  it("reports membership", () => {
    const entries = [{ id: "pear", on: DAY }];
    expect(isPainted(entries, "pear")).toBe(true);
    expect(isPainted(entries, "mug")).toBe(false);
  });
});

describe("persist + load round-trip", () => {
  it("writes and reads back the same entries", () => {
    persistPainted([{ id: "pear", on: DAY }]);
    expect(loadPainted()).toEqual([{ id: "pear", on: DAY }]);
  });

  it("returns nothing when nothing is stored", () => {
    expect(loadPainted()).toEqual([]);
  });

  it("recovers from malformed stored data", () => {
    localStorage.setItem(KEY, "{ not json");
    expect(loadPainted()).toEqual([]);
  });

  it("ignores a stored object of the wrong shape", () => {
    localStorage.setItem(KEY, JSON.stringify({ ids: ["pear"] }));
    expect(loadPainted()).toEqual([]);
  });

  it("drops entries that are not well formed", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        entries: [
          { id: "pear", on: DAY },
          { id: "", on: DAY },
          { id: "mug" },
          { id: "mug", on: "yesterday" },
          null,
          "nope",
        ],
      }),
    );
    expect(loadPainted()).toEqual([{ id: "pear", on: DAY }]);
  });
});

describe("paintedReferences", () => {
  const catalogue = [
    makeReference("pear", { title: "Pear" }),
    makeReference("mug", { title: "Mug" }),
  ];

  it("returns the newest first", () => {
    const entries = [
      { id: "pear", on: "2026-09-01" },
      { id: "mug", on: "2026-09-20" },
    ];
    expect(paintedReferences(catalogue, entries).map((p) => p.reference.id)).toEqual([
      "mug",
      "pear",
    ]);
  });

  it("carries the day each one was marked", () => {
    const [first] = paintedReferences(catalogue, [{ id: "pear", on: DAY }]);
    expect(first?.on).toBe(DAY);
  });

  it("drops ids the catalogue no longer has, rather than rendering holes", () => {
    const entries = [
      { id: "pear", on: DAY },
      { id: "a-piece-that-was-retired", on: DAY },
    ];
    expect(paintedReferences(catalogue, entries)).toHaveLength(1);
  });

  it("handles an empty record", () => {
    expect(paintedReferences(catalogue, [])).toEqual([]);
  });
});

describe("what this module deliberately cannot do", () => {
  /*
    The load-bearing test. PRODUCT.md:94 - "No pressure, ever. No streaks, no
    guilt, no achievement language." A streak, a gap or a frequency can only
    come from reading across the stored dates, so the guard is that nothing
    here does. If someone adds such a function, this fails and they have to
    decide deliberately rather than by accident.
  */
  it("exposes nothing that reads across dates", () => {
    const forbidden =
      /streak|consecutive|inarow|gap|frequency|lastpainted|longest|since|average|total|count|progress|goal|target/i;
    const offenders = Object.keys(painted).filter((name) =>
      forbidden.test(name.replace(/[^a-z]/gi, "")),
    );
    expect(offenders).toEqual([]);
  });

  it("exports only a store, not a summary", () => {
    expect(Object.keys(painted).sort()).toEqual([
      "isPainted",
      "loadPainted",
      "persistPainted",
      "today",
      "togglePainted",
    ]);
  });
});
