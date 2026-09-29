/**
 * Is there one clear subject, and can it be painted?
 *
 * Every measurement here exists because a curator rejected something for a
 * reason a caption could never have expressed. From the first real session:
 *
 *   "Too busy with oranges, hands, person, nets, plates. There's no focus
 *    subject"          -> subjectRegions
 *   "Objects too far", "objects are far and not focused"
 *                      -> subjectArea, subjectCentrality
 *   "Blurred on edges of the fruit. Hard to practice watercolor"
 *                      -> subjectSharpness
 *   "Lots of details hard to watercolor paint"
 *                      -> detailLoad
 *
 * Pure, over a plain RGBA array, so it is testable without decoding anything.
 * The decoding lives in measure.ts.
 *
 * Nothing here identifies a subject. It finds the region that differs from the
 * background and describes its shape - which is all that is needed to tell a
 * pear on a tablecloth from a table covered in pears.
 */

import type { Pixels } from "./imageAnalysis.ts";
import { rgbToLab, type Rgb } from "./pigments.ts";

export interface FocusMeasurements {
  /** Fraction of the frame that differs from the background, 0-1. */
  subjectArea: number;
  /**
   * How far the subject's centroid sits from the middle, 0-1, where 0 is dead
   * centre and 1 is the corner. High means the subject is off to one side.
   */
  subjectCentrality: number;
  /**
   * Roughly how many separate things there are. One is a subject; five is a
   * tableful. Counted on a coarse grid, so a pear with a stem stays one.
   */
  subjectRegions: number;
  /** Edge energy inside the subject. Low means the subject itself is blurred. */
  subjectSharpness: number;
  /** Edge density across the frame. High means fiddly detail everywhere. */
  detailLoad: number;
}

function at(pixels: Pixels, x: number, y: number): Rgb | null {
  const offset = (y * pixels.width + x) * 4;
  if ((pixels.data[offset + 3] ?? 0) < 128) return null;
  return {
    r: pixels.data[offset] ?? 0,
    g: pixels.data[offset + 1] ?? 0,
    b: pixels.data[offset + 2] ?? 0,
  };
}

function luma(rgb: Rgb): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/**
 * The background, taken as the median colour of the frame's outer band.
 *
 * A median rather than a mean: one dark object touching the edge should not
 * drag the estimate, and in a photograph shot for stock the border is almost
 * always backdrop.
 */
export function estimateBackground(pixels: Pixels): Rgb {
  const band = Math.max(1, Math.round(Math.min(pixels.width, pixels.height) * 0.08));
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];

  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      const onBorder =
        x < band ||
        y < band ||
        x >= pixels.width - band ||
        y >= pixels.height - band;
      if (!onBorder) continue;
      const rgb = at(pixels, x, y);
      if (!rgb) continue;
      r.push(rgb.r);
      g.push(rgb.g);
      b.push(rgb.b);
    }
  }

  return { r: median(r), g: median(g), b: median(b) };
}

/** How far this colour is from the background, in perceptual terms. */
function distanceFromBackground(rgb: Rgb, backgroundLab: ReturnType<typeof rgbToLab>): number {
  const lab = rgbToLab(rgb);
  const dl = lab.l - backgroundLab.l;
  const da = lab.a - backgroundLab.a;
  const db = lab.b - backgroundLab.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** Beyond this a pixel is subject rather than backdrop. */
export const SUBJECT_THRESHOLD = 18;

/** The mask of pixels that are not background, as a flat boolean array. */
export function subjectMask(pixels: Pixels): boolean[] {
  const backgroundLab = rgbToLab(estimateBackground(pixels));
  const mask: boolean[] = new Array(pixels.width * pixels.height).fill(false);

  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      const rgb = at(pixels, x, y);
      if (!rgb) continue;
      mask[y * pixels.width + x] =
        distanceFromBackground(rgb, backgroundLab) > SUBJECT_THRESHOLD;
    }
  }

  return mask;
}

/**
 * Count separate blobs on a coarse grid.
 *
 * Coarse on purpose. At full resolution a pear plus its stem plus a highlight
 * is three regions, which is not what anyone means by "how many things are in
 * this picture". On a 12x12 grid, a cell counts as occupied when a third of it
 * is subject, and neighbouring cells join up.
 */
export function countRegions(pixels: Pixels, mask: boolean[], grid = 12): number {
  const cellW = pixels.width / grid;
  const cellH = pixels.height / grid;
  const occupied: boolean[] = new Array(grid * grid).fill(false);

  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      let hits = 0;
      let total = 0;
      for (let y = Math.floor(gy * cellH); y < Math.floor((gy + 1) * cellH); y += 1) {
        for (let x = Math.floor(gx * cellW); x < Math.floor((gx + 1) * cellW); x += 1) {
          total += 1;
          if (mask[y * pixels.width + x]) hits += 1;
        }
      }
      occupied[gy * grid + gx] = total > 0 && hits / total >= 1 / 3;
    }
  }

  // Flood fill, four-connected.
  const seen: boolean[] = new Array(grid * grid).fill(false);
  let regions = 0;

  for (let i = 0; i < occupied.length; i += 1) {
    if (!occupied[i] || seen[i]) continue;
    regions += 1;
    const stack = [i];
    seen[i] = true;
    while (stack.length > 0) {
      const current = stack.pop()!;
      const cx = current % grid;
      const cy = Math.floor(current / grid);
      const neighbours = [
        cx > 0 ? current - 1 : -1,
        cx < grid - 1 ? current + 1 : -1,
        cy > 0 ? current - grid : -1,
        cy < grid - 1 ? current + grid : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && occupied[n] && !seen[n]) {
          seen[n] = true;
          stack.push(n);
        }
      }
    }
  }

  return regions;
}

/**
 * Laplacian variance over a set of pixels: the standard cheap sharpness
 * measure. A blurred image has little second-derivative energy.
 */
function laplacianVariance(
  pixels: Pixels,
  include: (index: number) => boolean,
): number {
  const values: number[] = [];

  for (let y = 1; y < pixels.height - 1; y += 1) {
    for (let x = 1; x < pixels.width - 1; x += 1) {
      const index = y * pixels.width + x;
      if (!include(index)) continue;

      const centre = at(pixels, x, y);
      const up = at(pixels, x, y - 1);
      const down = at(pixels, x, y + 1);
      const left = at(pixels, x - 1, y);
      const right = at(pixels, x + 1, y);
      if (!centre || !up || !down || !left || !right) continue;

      values.push(
        4 * luma(centre) - luma(up) - luma(down) - luma(left) - luma(right),
      );
    }
  }

  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
}

/** Share of pixels sitting on a strong edge. */
function edgeDensity(pixels: Pixels): number {
  let edges = 0;
  let counted = 0;

  for (let y = 1; y < pixels.height - 1; y += 1) {
    for (let x = 1; x < pixels.width - 1; x += 1) {
      const centre = at(pixels, x, y);
      const right = at(pixels, x + 1, y);
      const down = at(pixels, x, y + 1);
      if (!centre || !right || !down) continue;
      counted += 1;
      const gradient =
        Math.abs(luma(centre) - luma(right)) + Math.abs(luma(centre) - luma(down));
      if (gradient > 24) edges += 1;
    }
  }

  return counted === 0 ? 0 : edges / counted;
}

export function measureFocus(pixels: Pixels): FocusMeasurements {
  const mask = subjectMask(pixels);
  const total = pixels.width * pixels.height;

  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) continue;
    count += 1;
    sumX += i % pixels.width;
    sumY += Math.floor(i / pixels.width);
  }

  const subjectArea = total === 0 ? 0 : count / total;

  let subjectCentrality = 0;
  if (count > 0) {
    const cx = sumX / count / pixels.width - 0.5;
    const cy = sumY / count / pixels.height - 0.5;
    // Normalised so the far corner is 1.
    subjectCentrality = Math.min(1, Math.sqrt(cx * cx + cy * cy) / Math.SQRT1_2);
  }

  return {
    subjectArea,
    subjectCentrality,
    subjectRegions: countRegions(pixels, mask),
    // Sharpness of the subject itself, which is what "blurred on the edges of
    // the fruit" is about. A sharp background behind a soft subject is still
    // a soft subject.
    subjectSharpness: count > 0 ? laplacianVariance(pixels, (i) => mask[i] === true) : 0,
    detailLoad: edgeDensity(pixels),
  };
}
