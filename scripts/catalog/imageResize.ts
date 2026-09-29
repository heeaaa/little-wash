/**
 * Downscaling a provider's original before it reaches the browser.
 *
 * Used only on the fallback path in the review tool: when a provider will not
 * resize an image for us, we take the original, and the original can be very
 * large. 29 of 428 shortlisted Pexels candidates are over 40 megapixels and
 * the largest is 108, which the review page would otherwise decode twice -
 * once for the plate and once for the canvas that reads its colours.
 *
 * Separate from imageProxy.ts on purpose. That module is pure network shape
 * and is tested without decoding anything; this is the one place in the
 * review path that touches sharp.
 */

import sharp from "sharp";

/**
 * Resize to `width`, or return null when the bytes cannot be decoded.
 *
 * Null rather than throwing, because the caller already holds a working image
 * at that point: a slow plate beats no plate.
 */
export async function downscale(
  bytes: Uint8Array,
  width: number,
): Promise<Uint8Array | null> {
  try {
    const out = await sharp(bytes)
      /*
        Quality 88 rather than the usual 80. The page reads a palette off
        these pixels and matches it to named pigments, so the encode should
        not be arguing with the measurement.
      */
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    return new Uint8Array(out);
  } catch (error) {
    console.warn(`could not downscale locally, serving the original: ${String(error)}`);
    return null;
  }
}
