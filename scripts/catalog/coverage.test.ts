import { describe, it, expect } from "vitest";
import { BANDS, FLOOR, bandOf, checkFloor, measureCoverage } from "./coverage.ts";
import { loadPlan, plannedQueries, SUBJECTS } from "./plan.ts";
import { record, learnedSignal, EMPTY_VOCABULARY } from "./learned.ts";
import type { ApprovedEntry, Candidate } from "./types.ts";
import type { Difficulty, Subject } from "../../src/lib/types.ts";

function entry(
  subject: Subject,
  minutes: number,
  difficulty: Difficulty = "steady",
  id = `${subject}-${minutes}-${difficulty}-${Math.random()}`,
): ApprovedEntry {
  return {
    id,
    candidate: {} as Candidate,
    title: id,
    subject,
    difficulty,
    minutes,
    prompt: "",
    alt: "",
    palette: [],
    tip: "",
    kind: "photograph",
    approvedAt: "2026-09-20",
  };
}

describe("time bands", () => {
  it("matches the bands the app filters by", () => {
    // src/lib/catalog.ts: short 0-10, medium 10-21, long 21+, min inclusive.
    expect(bandOf(0)).toBe("short");
    expect(bandOf(9)).toBe("short");
    expect(bandOf(10)).toBe("medium");
    expect(bandOf(20)).toBe("medium");
    expect(bandOf(21)).toBe("long");
    expect(bandOf(90)).toBe("long");
  });
});

describe("measuring coverage", () => {
  it("reports the state that prompted this work", () => {
    // Eight fruit references, none under ten minutes: what the first session
    // actually produced.
    const first = [
      entry("fruit", 15), entry("fruit", 20), entry("fruit", 25), entry("fruit", 25),
      entry("fruit", 25), entry("fruit", 25), entry("fruit", 30), entry("fruit", 35),
    ];
    const coverage = measureCoverage(first);

    expect(coverage.total).toBe(8);
    expect(coverage.byBand.short).toBe(0);
    expect(coverage.bySubject.botanical).toBe(0);
    expect(coverage.filledCombinations).toBeLessThan(5);
    expect(coverage.totalCombinations).toBe(54);
  });

  it("names every empty subject and band", () => {
    const coverage = measureCoverage([entry("fruit", 25)]);
    // Five subjects entirely empty plus two empty bands in fruit.
    expect(coverage.emptyCells).toHaveLength(SUBJECTS.length * BANDS.length - 1);
    expect(coverage.emptyCells.some((c) => c.subject === "landscape")).toBe(true);
  });

  it("counts an empty catalogue without falling over", () => {
    const coverage = measureCoverage([]);
    expect(coverage.total).toBe(0);
    expect(coverage.filledCombinations).toBe(0);
    expect(coverage.emptyCells).toHaveLength(SUBJECTS.length * BANDS.length);
  });

  it("splits by subject, band and difficulty at once", () => {
    const coverage = measureCoverage([
      entry("botanical", 5, "gentle"),
      entry("botanical", 25, "stretch"),
      entry("landscape", 15, "steady"),
    ]);
    expect(coverage.bySubject.botanical).toBe(2);
    expect(coverage.byBand.short).toBe(1);
    expect(coverage.byDifficulty.stretch).toBe(1);
    expect(coverage.matrix.botanical?.long).toBe(1);
  });
});

describe("the floor for replacing the placeholders", () => {
  it("refuses the first session's catalogue", () => {
    const result = checkFloor(measureCoverage([entry("fruit", 25)]));
    expect(result.passes).toBe(false);
    expect(result.failures.join(" ")).toMatch(/botanical has 0/);
  });

  it("says exactly what is missing rather than just failing", () => {
    const result = checkFloor(measureCoverage([]));
    // One line per subject shortfall, per empty-band breach, per band, per
    // difficulty - enough to act on without opening the app.
    expect(result.failures.length).toBeGreaterThan(SUBJECTS.length);
    expect(result.failures.join(" ")).toMatch(/"short" band has 0/);
  });

  it("passes a catalogue that meets it", () => {
    const entries: ApprovedEntry[] = [];
    for (const subject of SUBJECTS) {
      for (const [minutes, difficulty] of [
        // Per subject: 3 gentle, 3 steady, 2 stretch, spread 3/3/2 across the
        // bands, so six subjects clear every part of the floor at once.
        [5, "gentle"], [7, "gentle"], [8, "gentle"],
        [15, "steady"], [16, "steady"], [18, "steady"],
        [25, "stretch"], [30, "stretch"],
      ] as Array<[number, Difficulty]>) {
        entries.push(entry(subject, minutes, difficulty));
      }
    }
    const result = checkFloor(measureCoverage(entries));
    expect(result.failures).toEqual([]);
    expect(result.passes).toBe(true);
  });

  it("fails a catalogue that is big but lopsided", () => {
    // Plenty of references, all one subject: the exact failure mode this
    // whole exercise exists to catch.
    const entries = Array.from({ length: 60 }, (_, i) =>
      entry("fruit", 5 + (i % 30), "gentle", `f${i}`),
    );
    expect(checkFloor(measureCoverage(entries)).passes).toBe(false);
  });

  it("holds the floor where the plan says", () => {
    expect(FLOOR.perSubject).toBeGreaterThan(0);
    expect(FLOOR.maxEmptyBandsPerSubject).toBeLessThan(BANDS.length);
  });
});

describe("the harvest plan", () => {
  const plan = loadPlan();

  it("covers every subject the app filters by", () => {
    for (const subject of SUBJECTS) {
      expect(plan.subjects[subject], `${subject} is missing from the plan`).toBeDefined();
      expect(plan.subjects[subject]!.queries.length).toBeGreaterThan(0);
    }
  });

  it("ignores the explanatory keys in the file", () => {
    expect(Object.keys(plan.subjects).every((k) => !k.startsWith("_"))).toBe(true);
  });

  it("targets add up to roughly the overall target", () => {
    const sum = Object.values(plan.subjects).reduce((a, s) => a + s.target, 0);
    expect(sum).toBeGreaterThanOrEqual(plan.target);
  });

  it("tags every query with the subject it is meant to fill", () => {
    const queries = plannedQueries(plan);
    expect(queries.length).toBeGreaterThan(20);
    expect(queries.every((q) => SUBJECTS.includes(q.subject as Subject))).toBe(true);
  });

  it("can be narrowed to one subject", () => {
    const only = plannedQueries(plan, "landscape");
    expect(only.length).toBeGreaterThan(0);
    expect(only.every((q) => q.subject === "landscape")).toBe(true);
  });
});

describe("what a subject teaches stays in that subject", () => {
  const at = "2026-09-20";

  it("does not let citrus rejections penalise a peony", () => {
    /*
      The real regression. A vocabulary learned entirely from a citrus harvest
      had "white" at three rejections to one approval, and started pushing
      white peonies - ideal subjects - down the botanical queue.
    */
    let v = EMPTY_VOCABULARY;
    for (let i = 0; i < 4; i += 1) {
      v = record(v, "rejected", `c${i}`, "white citrus slices", "Too busy", at, "fruit");
    }

    expect(learnedSignal(v, "white peony flower", "botanical").delta).toBe(0);
    expect(learnedSignal(v, "white citrus slices", "fruit").delta).toBeLessThan(0);
  });

  it("keeps the counts apart per subject", () => {
    let v = EMPTY_VOCABULARY;
    v = record(v, "approved", "a", "single stem", "", at, "botanical");
    v = record(v, "rejected", "b", "single stem", "", at, "fruit");

    const botanical = v.phrases.find((p) => p.phrase === "stem" && p.subject === "botanical");
    const fruit = v.phrases.find((p) => p.phrase === "stem" && p.subject === "fruit");
    expect(botanical).toMatchObject({ approved: 1, rejected: 0 });
    expect(fruit).toMatchObject({ approved: 0, rejected: 1 });
  });

  it("still works for decisions recorded before subjects existed", () => {
    let v = EMPTY_VOCABULARY;
    for (let i = 0; i < 4; i += 1) v = record(v, "rejected", `c${i}`, "wooden board", "", at);
    expect(learnedSignal(v, "a wooden board").delta).toBeLessThan(0);
  });
});
