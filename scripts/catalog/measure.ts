/**
 * Measuring a candidate's actual image, at harvest time.
 *
 * The analysis this calls already existed, but it ran in the review tool -
 * which is to say, after a candidate had already reached the curator. Every
 * busy, blurred or distant photograph still had to be looked at and rejected
 * by hand. Running it here means those never reach the queue at all.
 *
 * This is the only file in the pipeline that decodes an image. Everything it
 * calls is pure and tested against generated fixtures; sharp is confined to
 * turning bytes into a pixel array.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { analyseImage, type Pixels } from "./imageAnalysis.ts";
import { measureFocus, type FocusMeasurements } from "./focus.ts";
import { dominantHue, perceptualHash } from "./similarity.ts";
import { SOURCES, remoteImageUrl } from "../../src/lib/sources/registry.ts";
import type { Candidate } from "./types.ts";

/**
 * Sampling size. Large enough that region counting and sharpness mean
 * something, small enough that measuring a few hundred candidates is quick and
 * the download is a thumbnail rather than a photograph.
 */
const SAMPLE = 192;

const CACHE_DIR = "catalog/.measurements";

export interface Measurements extends FocusMeasurements {
  /** Fraction of the border that varies; a plain backdrop is near zero. */
  borderVariance: number;
  /** How many colours carry real area. */
  distinctColours: number;
  meanLightness: number;
  valueRange: number;
  meanChroma: number;
  warmth: number;
  /** 64-bit difference hash, for near-duplicate detection. */
  hash: string;
  /** Dominant hue in degrees, or null when essentially colourless. */
  hue: number | null;
  /** The size the measurement was taken at, so a change is detectable. */
  sampledAt: number;
}

/** Decode bytes into the plain RGBA array the pure analysis expects. */
export async function pixelsFrom(bytes: Buffer, size = SAMPLE): Promise<Pixels> {
  const { data, info } = await sharp(bytes)
    // `fill` rather than `contain`: padding would invent a border, and the
    // border is what the background estimate is built from.
    .resize(size, size, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

export function measurePixels(pixels: Pixels): Omit<Measurements, "sampledAt"> {
  const analysis = analyseImage(pixels);
  const focus = measureFocus(pixels);
  const dominant = analysis.centreClusters[0]?.rgb ?? analysis.clusters[0]?.rgb ?? null;

  return {
    ...focus,
    borderVariance: analysis.borderVariance,
    distinctColours: analysis.distinctColours,
    meanLightness: analysis.meanLightness,
    valueRange: analysis.valueRange,
    meanChroma: analysis.meanChroma,
    warmth: analysis.warmth,
    hash: perceptualHash(pixels),
    hue: dominant ? dominantHue(dominant) : null,
  };
}

function cachePath(candidate: Candidate, dir = CACHE_DIR): string {
  // Keyed on the image URL, so a provider changing a derivative invalidates it.
  const key = createHash("sha1").update(candidate.imageUrl).digest("hex").slice(0, 16);
  return `${dir}/${candidate.sourceId}-${key}.json`;
}

/**
 * The width fetched for measuring. Comfortably above SAMPLE, so the resize
 * to it still averages real pixels, and a small fraction of an original:
 * Unsplash originals run to tens of megabytes.
 */
const MEASURE_WIDTH = 640;

/**
 * What to download, in order: the provider's own small copy where it has a
 * resize service, then the original. The museums have no resize service, so
 * for them it is the file as it is.
 */
function measureUrls(candidate: Candidate): string[] {
  if (SOURCES[candidate.sourceId]?.delivery !== "remote") {
    return candidate.previewUrl ? [candidate.previewUrl, candidate.imageUrl] : [candidate.imageUrl];
  }
  const small = remoteImageUrl(candidate.sourceId, candidate.imageUrl, MEASURE_WIDTH);
  return small === candidate.imageUrl ? [small] : [small, candidate.imageUrl];
}

export interface MeasureOptions {
  fetch?: typeof globalThis.fetch;
  /** Ignore anything cached and fetch again. */
  refresh?: boolean;
  /** Headers some CDNs insist on, by hostname. */
  headers?: (url: string) => Record<string, string>;
  /** Where measurements are cached. Tests point this somewhere disposable. */
  cacheDir?: string;
}

/** The Art Institute's CDN rejects anything without its own Referer. */
function defaultHeaders(url: string): Record<string, string> {
  try {
    return {
      Referer: `${new URL(url).origin}/`,
      "User-Agent": "little-wash-curation/1.0",
    };
  } catch {
    return {};
  }
}

/**
 * Measure one candidate, using the cache when it can.
 *
 * Returns null rather than throwing when an image cannot be fetched or
 * decoded: one unreachable photograph should not abandon a harvest of two
 * hundred. The candidate simply arrives unmeasured, and the shortlist falls
 * back to its caption heuristics for it.
 */
export async function measureCandidate(
  candidate: Candidate,
  options: MeasureOptions = {},
): Promise<Measurements | null> {
  const dir = options.cacheDir ?? CACHE_DIR;
  const path = cachePath(candidate, dir);

  if (!options.refresh && existsSync(path)) {
    try {
      const cached = JSON.parse(readFileSync(path, "utf-8")) as Measurements;
      if (cached.sampledAt === SAMPLE) return cached;
    } catch {
      // A corrupt cache entry is not worth failing over; measure again.
    }
  }

  const doFetch = options.fetch ?? globalThis.fetch;
  const headersFor = options.headers ?? defaultHeaders;

  for (const url of measureUrls(candidate)) {
    try {
      const response = await doFetch(url, { headers: headersFor(url) });
      if (!response.ok) continue;

      const pixels = await pixelsFrom(Buffer.from(await response.arrayBuffer()));
      const measurements: Measurements = { ...measurePixels(pixels), sampledAt: SAMPLE };

      mkdirSync(dir, { recursive: true });
      writeFileSync(path, `${JSON.stringify(measurements)}\n`, "utf-8");
      return measurements;
    } catch {
      // Try the next source for the same image; null only when all fail.
    }
  }
  return null;
}

/**
 * Measure a harvest, in order, pausing between requests.
 *
 * Sequential on purpose. These are free APIs and free CDNs, and a curated
 * catalogue is a few hundred images; there is nothing to gain by hammering
 * them in parallel.
 */
export async function measureAll(
  candidates: readonly Candidate[],
  options: MeasureOptions & {
    onProgress?: (done: number, total: number) => void;
    delayMs?: number;
  } = {},
): Promise<Candidate[]> {
  const out: Candidate[] = [];

  for (const [index, candidate] of candidates.entries()) {
    const measurements = await measureCandidate(candidate, options);
    out.push(measurements ? { ...candidate, measurements } : candidate);
    options.onProgress?.(index + 1, candidates.length);
    if (options.delayMs && index < candidates.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  return out;
}
