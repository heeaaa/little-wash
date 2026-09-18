import { describe, it, expect } from "vitest";
import {
  activeFilterCount,
  filterReferences,
  findReference,
  matchesTime,
  pickDaily,
  surpriseMe,
} from "./catalog";
import { mulberry32 } from "./shuffle";
import { DEFAULT_FILTERS, type PaintReference } from "./types";

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
  it("bands by an inclusive upper bound", () => {
    expect(matchesTime(make("x", { minutes: 5 }), "5")).toBe(true);
    expect(matchesTime(make("x", { minutes: 15 }), "5")).toBe(false);
    expect(matchesTime(make("x", { minutes: 20 }), "15")).toBe(true);
    expect(matchesTime(make("x", { minutes: 35 }), "30")).toBe(true);
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
      time: "15",
      difficulty: "gentle",
      subject: "objects",
    });
    expect(result.map((r) => r.id)).toEqual(["mid-gentle-objects"]);
  });

  it("returns an empty array when nothing matches", () => {
    const result = filterReferences(CATALOG, {
      time: "5",
      difficulty: "stretch",
      subject: "fruit",
    });
    expect(result).toEqual([]);
  });
});

describe("activeFilterCount", () => {
  it("counts only the narrowed dimensions", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ time: "5", difficulty: "all", subject: "fruit" })).toBe(2);
    expect(activeFilterCount({ time: "5", difficulty: "gentle", subject: "fruit" })).toBe(3);
  });
});

describe("surpriseMe", () => {
  it("returns null when the filtered pool is empty", () => {
    const result = surpriseMe(
      CATALOG,
      { time: "5", difficulty: "stretch", subject: "fruit" },
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
  it("is stable for the same date", () => {
    const date = new Date("2026-09-18T08:00:00Z");
    expect(pickDaily(CATALOG, date)?.id).toBe(pickDaily(CATALOG, date)?.id);
  });

  it("changes across days (over the catalogue cycle)", () => {
    const ids = new Set<string>();
    for (let day = 0; day < CATALOG.length; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day));
      const pick = pickDaily(CATALOG, date);
      if (pick) ids.add(pick.id);
    }
    expect(ids.size).toBe(CATALOG.length);
  });

  it("returns null for an empty catalogue", () => {
    expect(pickDaily([], new Date())).toBeNull();
  });
});

describe("findReference", () => {
  it("finds by id and returns null otherwise", () => {
    expect(findReference(CATALOG, "mid-gentle-objects")?.id).toBe("mid-gentle-objects");
    expect(findReference(CATALOG, "nope")).toBeNull();
    expect(findReference(CATALOG, undefined)).toBeNull();
  });
});
