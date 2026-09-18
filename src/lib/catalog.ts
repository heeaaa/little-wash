import type { Filters, PaintReference, TimeBand } from "./types";
import { pickDifferent, type RandomSource } from "./shuffle";

/** Upper bound (inclusive) of minutes that each time band accepts. */
const TIME_BAND_MAX: Record<TimeBand, number> = {
  "5": 7,
  "15": 20,
  "30": Infinity,
};

/** Does a reference fall inside the selected time band? */
export function matchesTime(reference: PaintReference, band: TimeBand | "all"): boolean {
  if (band === "all") return true;
  return reference.minutes <= TIME_BAND_MAX[band];
}

/**
 * Filter the catalogue by the active filters. Pure and order-preserving so the
 * result is stable and testable.
 */
export function filterReferences(
  all: readonly PaintReference[],
  filters: Filters,
): PaintReference[] {
  return all.filter((reference) => {
    if (!matchesTime(reference, filters.time)) return false;
    if (filters.difficulty !== "all" && reference.difficulty !== filters.difficulty) {
      return false;
    }
    if (filters.subject !== "all" && reference.subject !== filters.subject) {
      return false;
    }
    return true;
  });
}

/** How many filters are narrowing the catalogue right now. */
export function activeFilterCount(filters: Filters): number {
  let count = 0;
  if (filters.time !== "all") count += 1;
  if (filters.difficulty !== "all") count += 1;
  if (filters.subject !== "all") count += 1;
  return count;
}

/**
 * "Surprise me" - choose a reference from the currently filtered set, avoiding
 * the one already on screen. Randomness is injected so tests stay deterministic.
 */
export function surpriseMe(
  all: readonly PaintReference[],
  filters: Filters,
  currentId: string | null,
  random: RandomSource,
): PaintReference | null {
  const pool = filterReferences(all, filters);
  return pickDifferent(pool, currentId, random);
}

/**
 * The daily featured piece. Deterministic for a given date so everyone sees the
 * same "today" and it is stable across reloads, with no streak or pressure logic.
 */
export function pickDaily(
  all: readonly PaintReference[],
  date: Date = new Date(),
): PaintReference | null {
  if (all.length === 0) return null;
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  const index = ((dayNumber % all.length) + all.length) % all.length;
  return all[index] ?? null;
}

export function findReference(
  all: readonly PaintReference[],
  id: string | undefined,
): PaintReference | null {
  if (!id) return null;
  return all.find((reference) => reference.id === id) ?? null;
}
