import { describe, it, expect } from "vitest";
import {
  activeFilterCount,
  dailySeed,
  dayNumber,
  filterReferences,
  findReference,
  matchesTime,
  pickDaily,
  surpriseMe,
} from "./catalog";
import { mulberry32 } from "./shuffle";
import { DEFAULT_FILTERS, type Filters, type PaintReference } from "./types";
import { REFERENCES } from "@/data/references";

function make(
  id: string,
  over: Partial<PaintReference> = {},
): PaintReference {
  return {
    id,
    title: id,
    subject: "fruit",
    difficulty: "gentle",
    minutes: 6,
    prompt: "",
    alt: "",
    palette: [],
    tip: "",
    source: "",
    art: "",
    ...over,
  };
}

const CATALOG: PaintReference[] = [
  make("quick-gentle-fruit", { minutes: 5, difficulty: "gentle", subject: "fruit" }),
  make("mid-steady-botanical", {
    minutes: 15,
    difficulty: "steady",
    subject: "botanical",
  }),
  make("long-stretch-landscape", {
    minutes: 35,
    difficulty: "stretch",
    subject: "landscape",
  }),
  make("mid-gentle-objects", {
    minutes: 18,
    difficulty: "gentle",
    subject: "objects",
  }),
];

describe("matchesTime", () => {
  it("keeps everything for 'all'", () => {
    expect(CATALOG.every((r) => matchesTime(r, "all"))).toBe(true);
  });
  /*
    Ranges, not budgets. The bands were upper bounds, so every band accepted
    everything shorter: "Over 20 min" matched the whole catalogue and a
    fifteen-minute window was offered a twenty-minute study.
  */
  it("bands by a real range, so a band excludes what is too short as well as too long", () => {
    expect(matchesTime(make("x", { minutes: 6 }), "short")).toBe(true);
    expect(matchesTime(make("x", { minutes: 15 }), "short")).toBe(false);
    expect(matchesTime(make("x", { minutes: 15 }), "medium")).toBe(true);
    expect(matchesTime(make("x", { minutes: 6 }), "medium")).toBe(false);
    expect(matchesTime(make("x", { minutes: 35 }), "long")).toBe(true);
    expect(matchesTime(make("x", { minutes: 6 }), "long")).toBe(false);
  });

  it("asks for a long piece and does not get the whole catalogue", () => {
    const long = CATALOG.filter((r) => matchesTime(r, "long"));
    expect(long.length).toBeGreaterThan(0);
    expect(long.length).toBeLessThan(CATALOG.length);
    expect(long.every((r) => r.minutes > 20)).toBe(true);
  });

  it("tiles the minutes with no overlap and no gap", () => {
    for (const minutes of [0, 1, 9, 10, 20, 21, 60]) {
      const bands = (["short", "medium", "long"] as const).filter((band) =>
        matchesTime(make("x", { minutes }), band),
      );
      expect(bands).toHaveLength(1);
    }
  });
});

/*
  The band semantics were a product defect, not just a unit one: against the
  shipped catalogue, "30 min+" returned all twelve pieces - including a
  five-minute mug - while the chip styled itself as narrowing and the heading
  flipped to "Matching pieces". These guard the real data, not a fixture.
*/
describe("time bands against the shipped catalogue", () => {
  const BANDS = ["short", "medium", "long"] as const;

  it("gives every band a non-empty result and never the whole catalogue", () => {
    for (const band of BANDS) {
      const matched = REFERENCES.filter((r) => matchesTime(r, band));
      expect(matched.length, `${band} matched nothing`).toBeGreaterThan(0);
      expect(matched.length, `${band} matched everything`).toBeLessThan(REFERENCES.length);
    }
  });

  it("puts every piece in exactly one band, so the bands add up to the catalogue", () => {
    const counts = BANDS.map((band) => REFERENCES.filter((r) => matchesTime(r, band)).length);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(REFERENCES.length);
  });

  it("never offers a piece that overruns the band the user asked for", () => {
    expect(REFERENCES.filter((r) => matchesTime(r, "short")).every((r) => r.minutes < 10)).toBe(true);
    expect(
      REFERENCES.filter((r) => matchesTime(r, "medium")).every((r) => r.minutes >= 10 && r.minutes <= 20),
    ).toBe(true);
    expect(REFERENCES.filter((r) => matchesTime(r, "long")).every((r) => r.minutes > 20)).toBe(true);
  });
});

describe("filterReferences", () => {
  it("returns all with default filters, in order", () => {
    const result = filterReferences(CATALOG, DEFAULT_FILTERS);
    expect(result.map((r) => r.id)).toEqual(CATALOG.map((r) => r.id));
  });

  it("filters by difficulty", () => {
    const result = filterReferences(CATALOG, { ...DEFAULT_FILTERS, difficulty: "gentle" });
    expect(result.map((r) => r.id)).toEqual([
      "quick-gentle-fruit",
      "mid-gentle-objects",
    ]);
  });

  it("filters by subject", () => {
    const result = filterReferences(CATALOG, { ...DEFAULT_FILTERS, subject: "landscape" });
    expect(result.map((r) => r.id)).toEqual(["long-stretch-landscape"]);
  });

  it("combines filters (AND)", () => {
    const result = filterReferences(CATALOG, {
      time: "medium",
      difficulty: "gentle",
      subject: "objects",
    });
    expect(result.map((r) => r.id)).toEqual(["mid-gentle-objects"]);
  });

  it("returns an empty array when nothing matches", () => {
    const result = filterReferences(CATALOG, {
      time: "short",
      difficulty: "stretch",
      subject: "fruit",
    });
    expect(result).toEqual([]);
  });
});

describe("activeFilterCount", () => {
  it("counts only the narrowed dimensions", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ time: "short", difficulty: "all", subject: "fruit" })).toBe(2);
    expect(activeFilterCount({ time: "short", difficulty: "gentle", subject: "fruit" })).toBe(3);
  });
});

describe("surpriseMe", () => {
  it("returns null when the filtered pool is empty", () => {
    const result = surpriseMe(
      CATALOG,
      { time: "short", difficulty: "stretch", subject: "fruit" },
      null,
      mulberry32(1),
    );
    expect(result).toBeNull();
  });

  it("stays within the active filter", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const result = surpriseMe(
        CATALOG,
        { ...DEFAULT_FILTERS, difficulty: "gentle" },
        null,
        mulberry32(seed),
      );
      expect(["quick-gentle-fruit", "mid-gentle-objects"]).toContain(result?.id);
    }
  });

  it("avoids repeating the current piece", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const result = surpriseMe(
        CATALOG,
        DEFAULT_FILTERS,
        "quick-gentle-fruit",
        mulberry32(seed),
      );
      expect(result?.id).not.toBe("quick-gentle-fruit");
    }
  });

  it("is deterministic for a given seed", () => {
    const a = surpriseMe(CATALOG, DEFAULT_FILTERS, null, mulberry32(9));
    const b = surpriseMe(CATALOG, DEFAULT_FILTERS, null, mulberry32(9));
    expect(a?.id).toBe(b?.id);
  });
});

describe("pickDaily", () => {
  const DAY = new Date("2026-09-18T08:00:00Z");

  it("is stable for the same date and filters", () => {
    expect(pickDaily(CATALOG, DEFAULT_FILTERS, DAY)?.id).toBe(
      pickDaily(CATALOG, DEFAULT_FILTERS, DAY)?.id,
    );
  });

  it("is stable across times of day within one calendar day", () => {
    const morning = new Date(2026, 8, 18, 6, 0, 0);
    const night = new Date(2026, 8, 18, 23, 30, 0);
    expect(pickDaily(CATALOG, DEFAULT_FILTERS, morning)?.id).toBe(
      pickDaily(CATALOG, DEFAULT_FILTERS, night)?.id,
    );
  });

  it("changes across days", () => {
    const ids = new Set<string>();
    for (let day = 0; day < 40; day += 1) {
      const pick = pickDaily(CATALOG, DEFAULT_FILTERS, new Date(Date.UTC(2026, 0, 1 + day)));
      if (pick) ids.add(pick.id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it("only ever returns a piece matching the active filters", () => {
    for (let day = 0; day < 60; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day));
      const pick = pickDaily(CATALOG, { ...DEFAULT_FILTERS, difficulty: "gentle" }, date);
      expect(pick?.difficulty).toBe("gentle");
    }
  });

  /**
   * Regression. The previous rule picked the day's piece from the whole
   * catalogue and fell back to the first match when it did not fit the filters,
   * so a narrowed pool was dominated by its first item: measured 75% of days
   * for a two-item pool, where a fair share is 50%. With the filters now the
   * primary control on Today, that made the app feel stuck on the piece the
   * user was trying to move away from.
   */
  it("spreads the pick across a narrowed pool instead of favouring the first match", () => {
    const gentle = { ...DEFAULT_FILTERS, difficulty: "gentle" as const };
    const pool = filterReferences(CATALOG, gentle);
    expect(pool).toHaveLength(2);

    const DAYS = 120;
    const counts = new Map<string, number>();
    for (let day = 0; day < DAYS; day += 1) {
      const pick = pickDaily(CATALOG, gentle, new Date(Date.UTC(2026, 0, 1 + day)));
      if (pick) counts.set(pick.id, (counts.get(pick.id) ?? 0) + 1);
    }

    // Every piece in the pool is reachable, and none dominates the way the
    // first-match fallback did.
    expect(counts.size).toBe(pool.length);
    for (const piece of pool) {
      const share = (counts.get(piece.id) ?? 0) / DAYS;
      expect(share).toBeGreaterThan(0.3);
      expect(share).toBeLessThan(0.7);
    }
  });

  it("varies between filter states on the same day", () => {
    const states: Filters[] = [
      DEFAULT_FILTERS,
      { ...DEFAULT_FILTERS, difficulty: "gentle" },
      { ...DEFAULT_FILTERS, time: "medium" },
      { ...DEFAULT_FILTERS, subject: "fruit" },
    ];
    const seeds = new Set(states.map((f) => dailySeed(f, DAY)));
    expect(seeds.size).toBe(states.length);
  });

  it("returns null when nothing matches the filters", () => {
    expect(
      pickDaily(CATALOG, { time: "short", difficulty: "stretch", subject: "fruit" }, DAY),
    ).toBeNull();
  });

  it("returns null for an empty catalogue", () => {
    expect(pickDaily([], DEFAULT_FILTERS, DAY)).toBeNull();
  });
});

describe("dayNumber", () => {
  it("is constant within a calendar day and increments across days", () => {
    expect(dayNumber(new Date(2026, 8, 18, 0, 1))).toBe(dayNumber(new Date(2026, 8, 18, 23, 59)));
    expect(dayNumber(new Date(2026, 8, 19))).toBe(dayNumber(new Date(2026, 8, 18)) + 1);
  });
});

describe("findReference", () => {
  it("finds by id and returns null otherwise", () => {
    expect(findReference(CATALOG, "mid-gentle-objects")?.id).toBe("mid-gentle-objects");
    expect(findReference(CATALOG, "nope")).toBeNull();
    expect(findReference(CATALOG, undefined)).toBeNull();
  });
});
