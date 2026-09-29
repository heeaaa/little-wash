/**
 * Working out what to put in `src`, `srcset` and `sizes`.
 *
 * RefArt used to hard-code `width={1000} height={1000}` against twelve square
 * SVGs and ship no srcset at all. Real references are photographs and
 * paintings of every proportion, so the intrinsic size now comes from the item
 * and the browser is given a ladder to choose from.
 *
 * Two delivery shapes go through one signature: widths we generated and ship
 * ourselves (the museums), and widths a provider's CDN makes on demand
 * (Pexels, Unsplash).
 */

import { remoteImageUrl } from "./registry";
import type { ImageSet, SourceId } from "./types";

/**
 * The ladder asked of a provider CDN. 400 covers a card on a phone, 800 a
 * featured plate, 1600 the enlarged view on a desktop or a 2x phone. Beyond
 * that a watercolour reference gains nothing a painter can use and costs
 * megabytes on a mobile connection.
 */
export const REMOTE_WIDTHS: readonly number[] = [400, 800, 1600];

/** The width a non-srcset browser falls back to. */
const FALLBACK_WIDTH = 800;

export interface ImageRenderProps {
  src: string;
  /** Empty string when there is nothing to offer, which React omits. */
  srcSet: string;
  width: number;
  height: number;
  lqip: string | null;
}

function candidates(
  image: ImageSet,
  sourceId: SourceId,
): Array<{ width: number; src: string }> {
  if (image.delivery === "local") {
    return [...image.widths].sort((a, b) => a.width - b.width);
  }
  return REMOTE_WIDTHS.map((width) => ({
    width,
    src: remoteImageUrl(sourceId, image.baseUrl, width),
  }));
}

/**
 * Pick the fallback: the widest candidate that is still no larger than
 * FALLBACK_WIDTH, or the narrowest if every candidate is bigger. Choosing the
 * widest available would hand a 1600px file to the browsers least able to ask
 * for something smaller.
 */
function fallback(
  sorted: Array<{ width: number; src: string }>,
): { width: number; src: string } | null {
  if (sorted.length === 0) return null;
  let chosen = sorted[0]!;
  for (const candidate of sorted) {
    if (candidate.width <= FALLBACK_WIDTH) chosen = candidate;
  }
  return chosen;
}

export function buildImageSources(
  image: ImageSet,
  sourceId: SourceId,
): ImageRenderProps {
  const sorted = candidates(image, sourceId);
  const chosen = fallback(sorted);

  return {
    src: chosen?.src ?? "",
    // One candidate is not a choice, so there is nothing for srcset to add.
    srcSet:
      sorted.length > 1
        ? sorted.map((c) => `${c.src} ${c.width}w`).join(", ")
        : "",
    width: image.intrinsicWidth,
    height: image.intrinsicHeight,
    lqip: image.lqip,
  };
}
