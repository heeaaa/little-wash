/**
 * What can honestly be read off an image's pixels.
 *
 * No model, no service, no guessing at what the subject *is* - just
 * measurements. The point is that these measurements are real, so the
 * suggestions built on them say something true rather than something
 * plausible. "The border is uniform, so the background is plain" is a fact
 * about the file. "A pear on a table" would be a guess.
 *
 * Pure, over a plain RGBA array. The review tool decodes the image with a
 * canvas and posts the pixels here, which keeps image decoding out of the
 * dependency list entirely.
 */

import { nearestPigment, rgbToHex, rgbToLab, type Rgb } from "./pigments.ts";

export interface Pixels {
  /** RGBA, four bytes per pixel, row-major. */
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

export interface ColourCluster {
  rgb: Rgb;
  hex: string;
  /** Share of sampled pixels, 0-1. */
  share: number;
}

export interface ImageAnalysis {
  /** Dominant colours across the whole image, most common first. */
  clusters: ColourCluster[];
  /**
   * Dominant colours of the central region only.
   *
   * The palette is built from these. Measured across the whole image, the
   * biggest cluster is usually the backdrop - the first real photograph run
   * through this suggested "Chinese White, Warm Grey" for a bowl of lemons,
   * because the tabletop outweighed the fruit. The subject is what a painter
   * is mixing for, and the subject is generally in the middle.
   */
  centreClusters: ColourCluster[];
  /** Mean L* of all sampled pixels, 0-100. */
  meanLightness: number;
  /** L* spread between the darkest and lightest tenth. */
  valueRange: number;
  /** Mean chroma. Low means muted, high means saturated. */
  meanChroma: number;
  /** Positive is warm (yellow/red), negative is cool (blue). */
  warmth: number;
  /** How uniform the outer border is. 0 is perfectly flat, higher is busier. */
  borderVariance: number;
  /** How many perceptually distinct colours carry real area. */
  distinctColours: number;
}

/** Lab buckets, coarse enough that a gradient does not become fifty colours. */
const L_BUCKETS = 5;
const AB_BUCKETS = 7;
const AB_RANGE = 128;

function bucketKey(rgb: Rgb): string {
  const { l, a, b } = rgbToLab(rgb);
  const li = Math.min(L_BUCKETS - 1, Math.max(0, Math.floor((l / 100) * L_BUCKETS)));
  const ai = Math.min(
    AB_BUCKETS - 1,
    Math.max(0, Math.floor(((a + AB_RANGE) / (AB_RANGE * 2)) * AB_BUCKETS)),
  );
  const bi = Math.min(
    AB_BUCKETS - 1,
    Math.max(0, Math.floor(((b + AB_RANGE) / (AB_RANGE * 2)) * AB_BUCKETS)),
  );
  return `${li}:${ai}:${bi}`;
}

function pixelAt(pixels: Pixels, index: number): Rgb | null {
  const offset = index * 4;
  const alpha = pixels.data[offset + 3] ?? 0;
  // Transparent pixels are padding, not subject.
  if (alpha < 128) return null;
  return {
    r: pixels.data[offset] ?? 0,
    g: pixels.data[offset + 1] ?? 0,
    b: pixels.data[offset + 2] ?? 0,
  };
}

/** Cluster a subset of pixels, chosen by a predicate on their coordinates. */
function clusterPixels(
  pixels: Pixels,
  include: (x: number, y: number) => boolean,
): ColourCluster[] {
  const buckets = new Map<string, { sum: Rgb; count: number }>();
  let counted = 0;

  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      if (!include(x, y)) continue;
      const rgb = pixelAt(pixels, y * pixels.width + x);
      if (!rgb) continue;
      counted += 1;
      const key = bucketKey(rgb);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.sum.r += rgb.r;
        bucket.sum.g += rgb.g;
        bucket.sum.b += rgb.b;
        bucket.count += 1;
      } else {
        buckets.set(key, { sum: { ...rgb }, count: 1 });
      }
    }
  }

  if (counted === 0) return [];

  return [...buckets.values()]
    .map(({ sum, count }) => {
      const rgb = {
        r: Math.round(sum.r / count),
        g: Math.round(sum.g / count),
        b: Math.round(sum.b / count),
      };
      return { rgb, hex: rgbToHex(rgb), share: count / counted };
    })
    .sort((a, b) => b.share - a.share);
}

export function analyseImage(pixels: Pixels): ImageAnalysis {
  const { width, height } = pixels;
  const total = width * height;

  const buckets = new Map<string, { sum: Rgb; count: number }>();
  const lightness: number[] = [];
  let chromaSum = 0;
  let warmthSum = 0;
  let counted = 0;

  for (let i = 0; i < total; i += 1) {
    const rgb = pixelAt(pixels, i);
    if (!rgb) continue;
    counted += 1;

    const key = bucketKey(rgb);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.sum.r += rgb.r;
      bucket.sum.g += rgb.g;
      bucket.sum.b += rgb.b;
      bucket.count += 1;
    } else {
      buckets.set(key, { sum: { ...rgb }, count: 1 });
    }

    const lab = rgbToLab(rgb);
    lightness.push(lab.l);
    chromaSum += Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    // b* is the blue-yellow axis and a* the green-red one; both read as warmth.
    warmthSum += lab.b * 0.7 + lab.a * 0.3;
  }

  if (counted === 0) {
    return {
      clusters: [],
      centreClusters: [],
      meanLightness: 0,
      valueRange: 0,
      meanChroma: 0,
      warmth: 0,
      borderVariance: 0,
      distinctColours: 0,
    };
  }

  const clusters: ColourCluster[] = [...buckets.values()]
    .map(({ sum, count }) => {
      const rgb = {
        r: Math.round(sum.r / count),
        g: Math.round(sum.g / count),
        b: Math.round(sum.b / count),
      };
      return { rgb, hex: rgbToHex(rgb), share: count / counted };
    })
    .sort((a, b) => b.share - a.share);

  lightness.sort((a, b) => a - b);
  const decile = Math.max(0, Math.floor(lightness.length / 10));
  const dark = lightness[decile] ?? lightness[0] ?? 0;
  const light = lightness[lightness.length - 1 - decile] ?? lightness.at(-1) ?? 0;

  // The middle 60% by each axis: enough to be the subject, not so tight that
  // an off-centre subject is missed entirely.
  const inset = 0.2;
  const centreClusters = clusterPixels(
    pixels,
    (x, y) =>
      x >= width * inset &&
      x < width * (1 - inset) &&
      y >= height * inset &&
      y < height * (1 - inset),
  );

  return {
    clusters,
    centreClusters,
    meanLightness: lightness.reduce((a, b) => a + b, 0) / lightness.length,
    valueRange: light - dark,
    meanChroma: chromaSum / counted,
    warmth: warmthSum / counted,
    borderVariance: borderVariance(pixels),
    // A band carrying under 3% of the image is noise, not a colour in the piece.
    distinctColours: clusters.filter((c) => c.share >= 0.03).length,
  };
}

/**
 * How much the outer frame of the image varies.
 *
 * A subject on a plain backdrop has a near-constant border. A subject in a
 * cluttered scene does not. This is the single most useful number for
 * sketchability that a caption cannot tell you.
 */
export function borderVariance(pixels: Pixels): number {
  const { width, height } = pixels;
  const band = Math.max(1, Math.round(Math.min(width, height) * 0.08));
  const samples: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const onBorder =
        x < band || y < band || x >= width - band || y >= height - band;
      if (!onBorder) continue;
      const rgb = pixelAt(pixels, y * width + x);
      if (!rgb) continue;
      const lab = rgbToLab(rgb);
      samples.push(lab.l, lab.a, lab.b);
    }
  }

  if (samples.length === 0) return 0;

  // Mean absolute deviation per channel triple, which is less swayed by a
  // single bright highlight than a standard deviation would be.
  const channels = [0, 1, 2].map((offset) => {
    const values = samples.filter((_, i) => i % 3 === offset);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((a, v) => a + Math.abs(v - mean), 0) / values.length;
  });

  return channels.reduce((a, b) => a + b, 0) / channels.length;
}

/** Below this the border reads as a deliberate plain backdrop. */
export const PLAIN_BACKGROUND_VARIANCE = 6;

export interface ColourReading {
  /** The palette to suggest, already matched to pigments. */
  palette: Array<{ name: string; hex: string }>;
  /** Plain-English observations, for the curator and for the alt scaffold. */
  observations: string[];
  /** Concerns the pixels raise that a caption would not. */
  concerns: string[];
}

/**
 * Turn measurements into something a person can act on.
 *
 * Every line here traces to a number above. None of it describes the subject,
 * because nothing here can see a subject.
 */
export function readColours(analysis: ImageAnalysis): ColourReading {
  const observations: string[] = [];
  const concerns: string[] = [];

  /*
    Built from the centre, and with anything that reads as bare paper removed.
    White is not a watercolour: a painter reserves the paper instead, so
    suggesting "Chinese White" as a mixing colour is worse than useless.
  */
  const source = analysis.centreClusters.length > 0 ? analysis.centreClusters : analysis.clusters;
  const significant = source
    .filter((c) => c.share >= 0.04 && !readsAsPaper(c.rgb))
    .slice(0, 5);
  const palette = suggestPaletteFrom(
    significant.length > 0 ? significant : source.slice(0, 4),
  );

  if (analysis.borderVariance <= PLAIN_BACKGROUND_VARIANCE) {
    observations.push(
      `The border is near-uniform (variance ${analysis.borderVariance.toFixed(1)}), so the subject sits on a plain backdrop`,
    );
  } else if (analysis.borderVariance > 18) {
    concerns.push(
      `Busy edges (variance ${analysis.borderVariance.toFixed(1)}): the background competes with the subject`,
    );
  }

  if (analysis.distinctColours <= 3) {
    observations.push(
      `Only ${analysis.distinctColours} colours carry real area, so a limited palette will cover it`,
    );
  } else if (analysis.distinctColours >= 6) {
    concerns.push(
      `${analysis.distinctColours} colours carry real area, which is a lot to mix in one sitting`,
    );
  }

  if (analysis.valueRange < 25) {
    concerns.push(
      `Narrow value range (${Math.round(analysis.valueRange)} of 100): little contrast to build form from`,
    );
  } else if (analysis.valueRange > 60) {
    observations.push(
      `Wide value range (${Math.round(analysis.valueRange)} of 100), so there is real light and shade to work with`,
    );
  }

  if (analysis.meanLightness > 72) {
    observations.push("High-key overall: mostly light washes, so keep the paper doing the work");
  } else if (analysis.meanLightness < 32) {
    observations.push("Low-key overall: it will need layered darks");
  }

  if (analysis.meanChroma < 14) {
    observations.push("Muted throughout; the earths will do most of this");
  } else if (analysis.meanChroma > 45) {
    observations.push("Strongly saturated, so mix thinly and let the colours stay clean");
  }

  observations.push(
    analysis.warmth > 6
      ? "Warm overall"
      : analysis.warmth < -6
        ? "Cool overall"
        : "Balanced between warm and cool",
  );

  return { palette, observations, concerns };
}

/** Pale and almost colourless: the paper's job, not a pigment's. */
export function readsAsPaper(rgb: Rgb): boolean {
  const lab = rgbToLab(rgb);
  return lab.l > 86 && Math.sqrt(lab.a * lab.a + lab.b * lab.b) < 10;
}

function suggestPaletteFrom(
  clusters: readonly ColourCluster[],
): Array<{ name: string; hex: string }> {
  // Ordered by area, so the pigment a painter mixes most of comes first.
  const seen = new Set<string>();
  const out: Array<{ name: string; hex: string }> = [];

  for (const cluster of clusters) {
    const { pigment } = nearestPigment(cluster.rgb);
    if (seen.has(pigment.name)) continue;
    seen.add(pigment.name);
    out.push({ name: pigment.name, hex: pigment.hex });
    if (out.length >= 4) break;
  }

  return out;
}
