/**
 * Choosing a warm-up, kept apart from the screen that shows it.
 *
 * The Warm-ups page keeps everything it needs in the URL - the kind filter,
 * the open warm-up and the chosen variation - so a reload, a locked phone or
 * a discarded tab puts a painter back on the exact guide they were following.
 * These functions read those parameters defensively and write them back, and
 * none of them touches React or the DOM.
 */

import type { Exercise, ExerciseKind, ExerciseVariation } from "@/data/exercises";

export type KindFilter = ExerciseKind | "all";

const KIND_VALUES: readonly ExerciseKind[] = ["brushwork", "colour"];

/** URL parameter names, named once. */
export const PARAM = {
  kind: "kind",
  warmup: "warmup",
  variation: "variation",
} as const;

/** An unknown or stale `?kind=` degrades to "all" rather than an empty list. */
export function readKind(raw: string | null): KindFilter {
  return raw && (KIND_VALUES as readonly string[]).includes(raw)
    ? (raw as ExerciseKind)
    : "all";
}

export function filterByKind(
  exercises: readonly Exercise[],
  kind: KindFilter,
): Exercise[] {
  return kind === "all" ? [...exercises] : exercises.filter((e) => e.kind === kind);
}

export interface Selection {
  exercise: Exercise;
  variation: ExerciseVariation;
}

/**
 * Which warm-up is open, and which way of painting it.
 *
 * Only a warm-up that is actually on screen can be open: one the filter has
 * hidden is treated as closed, so an expanded guide never floats free of the
 * list it belongs to. An unknown variation - a typo, or a link to a variation
 * of a different warm-up - falls back to the classic, which is always first.
 */
export function resolveSelection(
  visible: readonly Exercise[],
  warmupId: string | null,
  variationId: string | null,
): Selection | null {
  const exercise = warmupId ? visible.find((e) => e.id === warmupId) : undefined;
  if (!exercise) return null;
  const variation =
    exercise.variations.find((v) => v.id === variationId) ?? exercise.variations[0];
  return { exercise, variation };
}

export function isDefaultVariation(exercise: Exercise, variationId: string): boolean {
  return exercise.variations[0].id === variationId;
}

/** Shortest and longest variation, in minutes. */
export function minutesRange(exercise: Exercise): { min: number; max: number } {
  const all = exercise.variations.map((v) => v.minutes);
  return { min: Math.min(...all), max: Math.max(...all) };
}

/** "5-10 min", or "15 min" when every variation takes the same time. */
export function durationLabel(exercise: Exercise): string {
  const { min, max } = minutesRange(exercise);
  return min === max ? `${min} min` : `${min}-${max} min`;
}

export function variationCountLabel(exercise: Exercise): string {
  const n = exercise.variations.length;
  return `${n} ${n === 1 ? "variation" : "variations"}`;
}

/*
  Writers. Each returns fresh params and leaves anything it does not own - a
  future parameter, a campaign tag - exactly where it was.
*/

/**
 * Change the kind filter. If that hides the open warm-up, close it too, so the
 * URL never names a guide the screen is not showing.
 *
 * A warm-up is only kept if it was actually open - shown under the old filter
 * - as well as shown under the new one. A stale link can name a warm-up its
 * own filter hides; clearing that filter must not spring it open.
 */
export function withKind(
  prev: URLSearchParams,
  kind: KindFilter,
  exercises: readonly Exercise[],
): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (kind === "all") next.delete(PARAM.kind);
  else next.set(PARAM.kind, kind);

  const open = next.get(PARAM.warmup);
  const shownUnder = (k: KindFilter) => filterByKind(exercises, k).some((e) => e.id === open);
  if (open && !(shownUnder(readKind(prev.get(PARAM.kind))) && shownUnder(kind))) {
    next.delete(PARAM.warmup);
    next.delete(PARAM.variation);
  }
  return next;
}

/**
 * Open a warm-up on its classic variation, or close whatever is open.
 *
 * Opening always starts from the classic: a variation chosen for a different
 * warm-up means nothing here.
 */
export function withOpen(prev: URLSearchParams, warmupId: string | null): URLSearchParams {
  const next = new URLSearchParams(prev);
  next.delete(PARAM.variation);
  if (warmupId) next.set(PARAM.warmup, warmupId);
  else next.delete(PARAM.warmup);
  return next;
}

/** Choose a variation of the open warm-up. The classic keeps the URL clean. */
export function withVariation(
  prev: URLSearchParams,
  exercise: Exercise,
  variationId: string,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  next.set(PARAM.warmup, exercise.id);
  const known = exercise.variations.some((v) => v.id === variationId);
  if (!known || isDefaultVariation(exercise, variationId)) next.delete(PARAM.variation);
  else next.set(PARAM.variation, variationId);
  return next;
}
