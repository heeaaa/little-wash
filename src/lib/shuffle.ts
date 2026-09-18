/**
 * Deterministic pseudo-random helpers.
 *
 * Keeping randomness behind an injectable, seedable source lets "Surprise me"
 * behave unpredictably for a real user while staying fully deterministic in
 * tests (per CLAUDE.md: control randomness, keep tests deterministic).
 */

/** mulberry32 - a tiny, fast, well-distributed seeded PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random source is any function returning a float in [0, 1). */
export type RandomSource = () => number;

/** Pick one item using the supplied random source. Returns null for an empty list. */
export function pickOne<T>(items: readonly T[], random: RandomSource): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(random() * items.length);
  return items[index] ?? null;
}

/**
 * Pick one item that is not `excludeId`, so "Surprise me" always moves on.
 * Falls back to any item when the list has a single entry.
 */
export function pickDifferent<T extends { id: string }>(
  items: readonly T[],
  excludeId: string | null,
  random: RandomSource,
): T | null {
  if (items.length === 0) return null;
  if (items.length === 1 || excludeId == null) return pickOne(items, random);
  const candidates = items.filter((item) => item.id !== excludeId);
  return pickOne(candidates.length > 0 ? candidates : items, random);
}
