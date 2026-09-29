import { DEFAULT_FILTERS, type Filters, type PaintReference, type TimeBand } from "./types";
import { mulberry32, pickDifferent, type RandomSource } from "./shuffle";
import type { SourceId } from "./sources/types";
import type { PaintedEntry } from "./painted";

/**
 * What each band actually spans, in minutes, inclusive at both ends.
 *
 * These are ranges, not budgets. The bands were upper bounds - every band
 * accepted everything shorter - which made "Over 20 min" (then "30 min+") match
 * the entire catalogue while the chip styled itself as narrowing. Someone with
 * a free afternoon could not ask for a long piece, and someone with fifteen
 * minutes was offered a twenty-minute study.
 *
 * `min` is inclusive and `max` exclusive, so the bands tile the whole number
 * line rather than only the integers that happen to be in the catalogue -
 * `minutes` is a number, and two disjoint integer endpoints would let a piece
 * between them match no band at all while the filter still claimed to narrow.
 */
const TIME_BAND: Record<TimeBand, { min: number; max: number }> = {
  short: { min: 0, max: 10 },
  medium: { min: 10, max: 21 },
  long: { min: 21, max: Infinity },
};

/** Does a reference fall inside the selected time band? */
export function matchesTime(reference: PaintReference, band: TimeBand | "all"): boolean {
  if (band === "all") return true;
  const { min, max } = TIME_BAND[band];
  return reference.minutes >= min && reference.minutes < max;
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

/**
 * The saved pieces, newest first.
 *
 * `favorites` holds ids in the order they were saved, so the newest is last;
 * the studio and the header palette both read it the other way round, because
 * the thing you just set aside is the thing you are most likely to want.
 * Unknown ids are dropped rather than rendered as holes - a catalogue entry can
 * disappear while a saved id survives in storage.
 */
export function savedReferences(
  all: readonly PaintReference[],
  favorites: readonly string[],
): PaintReference[] {
  return favorites
    .map((id) => all.find((reference) => reference.id === id))
    .filter((reference): reference is PaintReference => Boolean(reference))
    .reverse();
}

/**
 * The catalogue a painter has chosen to draw ideas from.
 *
 * Applied before filtering rather than as a fourth filter: time, difficulty
 * and subject are things you change while looking for today's piece, whereas
 * this is a standing preference about what the catalogue is made of. Saved
 * pieces deliberately bypass it - see the studio - because turning a source
 * off should not empty a shelf you filled on purpose.
 */
export function enabledReferences(
  all: readonly PaintReference[],
  disabledSources: readonly SourceId[],
): PaintReference[] {
  if (disabledSources.length === 0) return [...all];
  return all.filter(
    (reference) => !disabledSources.includes(reference.credit.sourceId),
  );
}

/**
 * The pieces you have painted, newest first, each with the day you marked it.
 *
 * Newest first for the same reason savedReferences reverses: the thing you did
 * most recently is the thing you most want to see. Unknown ids are dropped
 * rather than rendered as holes - a curated catalogue can lose a piece while a
 * local record of having painted it survives, and that record should fade
 * quietly rather than break the screen.
 */
export function paintedReferences(
  all: readonly PaintReference[],
  entries: readonly PaintedEntry[],
): Array<{ reference: PaintReference; on: string }> {
  return entries
    .map((entry) => {
      const reference = all.find((candidate) => candidate.id === entry.id);
      return reference ? { reference, on: entry.on } : null;
    })
    .filter((found): found is { reference: PaintReference; on: string } => found !== null)
    .reverse();
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
