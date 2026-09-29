/**
 * Telling "we already have one of these" before a curator has to.
 *
 * Five of the first twenty-two rejections were some form of "we already have a
 * similar one" - and that was inside a single harvest. Running several searches
 * across a subject makes it worse, because the same well-liked stock photograph
 * comes back from three different queries.
 *
 * A difference hash is the right tool: it survives resizing, recompression and
 * small crops, which is exactly how the same photograph differs between two
 * API responses, while staying sensitive to a genuinely different composition.
 */

import type { Pixels } from "./imageAnalysis.ts";
import { rgbToLab, type Rgb } from "./pigments.ts";

/** Width of the grayscale grid the hash is built from; 9x8 yields 64 bits. */
const HASH_W = 9;
const HASH_H = 8;

function sampleLuma(pixels: Pixels, gx: number, gy: number): number {
  // Box-average the source region for this grid cell, so the hash is stable
  // whatever size the image arrived at.
  const x0 = Math.floor((gx / HASH_W) * pixels.width);
  const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) / HASH_W) * pixels.width));
  const y0 = Math.floor((gy / HASH_H) * pixels.height);
  const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) / HASH_H) * pixels.height));

  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1 && y < pixels.height; y += 1) {
    for (let x = x0; x < x1 && x < pixels.width; x += 1) {
      const offset = (y * pixels.width + x) * 4;
      if ((pixels.data[offset + 3] ?? 0) < 128) continue;
      sum +=
        0.2126 * (pixels.data[offset] ?? 0) +
        0.7152 * (pixels.data[offset + 1] ?? 0) +
        0.0722 * (pixels.data[offset + 2] ?? 0);
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

/**
 * A 64-bit difference hash, as 16 hex characters.
 *
 * Each bit records whether a cell is brighter than the one to its right, which
 * is why it survives exposure and scale changes: it encodes relative structure
 * rather than absolute values.
 */
export function perceptualHash(pixels: Pixels): string {
  let bits = "";
  for (let gy = 0; gy < HASH_H; gy += 1) {
    for (let gx = 0; gx < HASH_W - 1; gx += 1) {
      bits += sampleLuma(pixels, gx, gy) > sampleLuma(pixels, gx + 1, gy) ? "1" : "0";
    }
  }

  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** How many of the 64 bits differ. 0 is identical. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    let xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Below this two images are the same photograph, or near enough that a painter
 * would say "we already have this".
 *
 * Deliberately conservative. Two different lemons on two different white
 * backdrops are genuinely similar images, and calling those duplicates would
 * throw away real variety - the kind of loss that is invisible, because a
 * candidate filtered out is never seen.
 */
export const DUPLICATE_DISTANCE = 8;

export interface HashedItem {
  id: string;
  hash: string;
  /** Dominant hue in degrees, or null for something essentially colourless. */
  hue: number | null;
}

/** Dominant hue of the image, for a second opinion on near-duplicates. */
export function dominantHue(dominant: Rgb): number | null {
  const lab = rgbToLab(dominant);
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  if (chroma < 8) return null;
  const degrees = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

export function hueDistance(a: number | null, b: number | null): number {
  if (a === null || b === null) return 180;
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

export interface DuplicateOf {
  id: string;
  distance: number;
}

/**
 * The first thing in `existing` that this is a duplicate of, if any.
 *
 * Structure decides it; hue is only allowed to rescue a match, never to create
 * one. Two images can share a palette and be completely different pictures.
 */
export function findDuplicate(
  candidate: HashedItem,
  existing: readonly HashedItem[],
  maxDistance = DUPLICATE_DISTANCE,
): DuplicateOf | null {
  let best: DuplicateOf | null = null;

  for (const item of existing) {
    if (item.id === candidate.id) continue;
    const distance = hammingDistance(candidate.hash, item.hash);
    if (distance > maxDistance) continue;
    // A close structural match with a wildly different palette is more often
    // two photographs of the same layout than the same photograph.
    if (hueDistance(candidate.hue, item.hue) > 60 && distance > maxDistance / 2) {
      continue;
    }
    if (!best || distance < best.distance) best = { id: item.id, distance };
  }

  return best;
}

/**
 * Remove duplicates from a harvest, keeping the first of each group.
 *
 * `against` is what is already approved, so a new harvest cannot reintroduce
 * something the curator has already taken.
 */
export function dedupe<T extends HashedItem>(
  items: readonly T[],
  against: readonly HashedItem[] = [],
  maxDistance = DUPLICATE_DISTANCE,
): { kept: T[]; dropped: Array<{ item: T; duplicateOf: DuplicateOf }> } {
  const kept: T[] = [];
  const dropped: Array<{ item: T; duplicateOf: DuplicateOf }> = [];
  const seen: HashedItem[] = [...against];

  for (const item of items) {
    const duplicate = findDuplicate(item, seen, maxDistance);
    if (duplicate) {
      dropped.push({ item, duplicateOf: duplicate });
    } else {
      kept.push(item);
      seen.push(item);
    }
  }

  return { kept, dropped };
}
