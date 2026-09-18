import { DEFAULT_FILTERS, type Filters, type PaintReference, type TimeBand } from "./types";
import { mulberry32, pickDifferent, type RandomSource } from "./shuffle";

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

/** Whole days since the epoch, in the viewer's own calendar day. */
export function dayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

/** FNV-1a over the filter triple, so each filter state gets its own stream. */
function hashFilters(filters: Filters): number {
  const key = `${filters.time}|${filters.difficulty}|${filters.subject}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Seed for the daily pick. Combines the calendar day with the active filter
 * combination so the choice is stable within a day but differs between filter
 * states. Exported for tests; callers use pickDaily.
 */
export function dailySeed(filters: Filters, date: Date): number {
  return (hashFilters(filters) ^ Math.imul(dayNumber(date), 0x9e3779b1)) >>> 0;
}

/**
 * The featured piece for today, chosen from the pieces that match the active
 * filters.
 *
 * Deterministic in (date, filters): everyone sees the same "today", it survives
 * reloads, and there is no streak or pressure logic anywhere in it. Seeding on
 * the filters as well as the day matters because the filters are the primary
 * control on Today - picking the first match would hand back the same piece
 * every time a filter changed, making the app feel stuck exactly when someone
 * is engaging with it.
 */
export function pickDaily(
  all: readonly PaintReference[],
  filters: Filters = DEFAULT_FILTERS,
  date: Date = new Date(),
): PaintReference | null {
  const pool = filterReferences(all, filters);
  if (pool.length === 0) return null;
  const index = Math.floor(mulberry32(dailySeed(filters, date))() * pool.length);
  return pool[index] ?? pool[0] ?? null;
}

export function findReference(
  all: readonly PaintReference[],
  id: string | undefined,
): PaintReference | null {
  if (!id) return null;
  return all.find((reference) => reference.id === id) ?? null;
}
