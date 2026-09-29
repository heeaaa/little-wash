/**
 * Where the catalogue is thin.
 *
 * The app offers 6 subjects x 3 time bands x 3 difficulties, and PRODUCT.md:32
 * asks that filtering "produces a satisfying result at every difficulty level,
 * not just the middle". After the first session, 4 of those 54 combinations
 * had anything in them and the "Under 10 min" band was empty outright.
 *
 * This turns that into a number you can act on, rather than something you
 * discover by using the app and finding nothing there.
 */

import type { Difficulty, Subject, TimeBand } from "../../src/lib/types.ts";
import type { ApprovedEntry } from "./types.ts";
import { SUBJECTS } from "./plan.ts";

export const BANDS: readonly TimeBand[] = ["short", "medium", "long"];
export const DIFFICULTIES: readonly Difficulty[] = ["gentle", "steady", "stretch"];

/** Matches TIME_BAND in src/lib/catalog.ts: inclusive min, exclusive max. */
export function bandOf(minutes: number): TimeBand {
  if (minutes < 10) return "short";
  if (minutes < 21) return "medium";
  return "long";
}

export interface Coverage {
  total: number;
  bySubject: Record<string, number>;
  byBand: Record<string, number>;
  byDifficulty: Record<string, number>;
  /** subject -> band -> count. */
  matrix: Record<string, Record<string, number>>;
  /** Combinations with nothing in them at all. */
  emptyCells: Array<{ subject: Subject; band: TimeBand }>;
  filledCombinations: number;
  totalCombinations: number;
}

export function measureCoverage(entries: readonly ApprovedEntry[]): Coverage {
  const bySubject: Record<string, number> = {};
  const byBand: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const matrix: Record<string, Record<string, number>> = {};
  const combos = new Set<string>();

  for (const subject of SUBJECTS) {
    bySubject[subject] = 0;
    matrix[subject] = Object.fromEntries(BANDS.map((b) => [b, 0]));
  }
  for (const band of BANDS) byBand[band] = 0;
  for (const difficulty of DIFFICULTIES) byDifficulty[difficulty] = 0;

  for (const entry of entries) {
    const band = bandOf(entry.minutes);
    bySubject[entry.subject] = (bySubject[entry.subject] ?? 0) + 1;
    byBand[band] = (byBand[band] ?? 0) + 1;
    byDifficulty[entry.difficulty] = (byDifficulty[entry.difficulty] ?? 0) + 1;
    matrix[entry.subject]![band] = (matrix[entry.subject]![band] ?? 0) + 1;
    combos.add(`${entry.subject}:${band}:${entry.difficulty}`);
  }

  const emptyCells: Array<{ subject: Subject; band: TimeBand }> = [];
  for (const subject of SUBJECTS) {
    for (const band of BANDS) {
      if ((matrix[subject]?.[band] ?? 0) === 0) emptyCells.push({ subject, band });
    }
  }

  return {
    total: entries.length,
    bySubject,
    byBand,
    byDifficulty,
    matrix,
    emptyCells,
    filledCombinations: combos.size,
    totalCombinations: SUBJECTS.length * BANDS.length * DIFFICULTIES.length,
  };
}

/**
 * The floor the catalogue must clear before the app stops shipping
 * placeholders. Below this, switching over would make Little Wash worse than
 * the twelve placeholder illustrations it replaces.
 */
export const FLOOR = {
  perSubject: 8,
  perBand: 12,
  perDifficulty: 12,
  /** A subject may be missing from at most this many time bands. */
  maxEmptyBandsPerSubject: 1,
};

export interface FloorResult {
  passes: boolean;
  failures: string[];
}

export function checkFloor(coverage: Coverage): FloorResult {
  const failures: string[] = [];

  for (const subject of SUBJECTS) {
    const count = coverage.bySubject[subject] ?? 0;
    if (count < FLOOR.perSubject) {
      failures.push(`${subject} has ${count}, needs ${FLOOR.perSubject}`);
    }
    const empty = BANDS.filter((b) => (coverage.matrix[subject]?.[b] ?? 0) === 0);
    if (empty.length > FLOOR.maxEmptyBandsPerSubject) {
      failures.push(`${subject} is empty in ${empty.length} time bands (${empty.join(", ")})`);
    }
  }

  for (const band of BANDS) {
    const count = coverage.byBand[band] ?? 0;
    if (count < FLOOR.perBand) failures.push(`"${band}" band has ${count}, needs ${FLOOR.perBand}`);
  }

  for (const difficulty of DIFFICULTIES) {
    const count = coverage.byDifficulty[difficulty] ?? 0;
    if (count < FLOOR.perDifficulty) {
      failures.push(`"${difficulty}" has ${count}, needs ${FLOOR.perDifficulty}`);
    }
  }

  return { passes: failures.length === 0, failures };
}
