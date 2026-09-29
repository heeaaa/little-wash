/**
 * Test references.
 *
 * Shared so that adding a field to PaintReference is one edit here rather than
 * one in every spec, and so component tests can build a Pexels-backed
 * photograph or a Met-backed painting without hand-writing a Credit each time.
 */

import { LICENCES } from "@/lib/sources/registry";
import type { Credit, ImageSet, SourceId } from "@/lib/sources/types";
import type { PaintReference } from "@/lib/types";

export function makeCredit(over: Partial<Credit> = {}): Credit {
  return {
    sourceId: "placeholder",
    institution: "Little Wash prototype",
    externalId: "test",
    objectUrl: "https://example.test/object",
    creator: null,
    creatorUrl: null,
    dateDisplay: null,
    medium: null,
    licence: LICENCES["cc0-1.0"],
    retrievedAt: "2026-09-20",
    ...over,
  };
}

/** Widths we ship ourselves, as the museums' references will be. */
export function makeLocalImage(
  widths: Array<{ width: number; src: string }> = [
    { width: 400, src: "/test-400.avif" },
  ],
  intrinsicWidth = 400,
  intrinsicHeight = 400,
  lqip: string | null = null,
): ImageSet {
  return { delivery: "local", widths, intrinsicWidth, intrinsicHeight, lqip };
}

/** A provider CDN URL, as Pexels and Unsplash references will be. */
export function makeRemoteImage(
  baseUrl = "https://images.example.test/photo.jpg",
  intrinsicWidth = 3000,
  intrinsicHeight = 2000,
  lqip: string | null = null,
): ImageSet {
  return { delivery: "remote", baseUrl, intrinsicWidth, intrinsicHeight, lqip };
}

export function makeReference(
  id: string,
  over: Partial<PaintReference> = {},
): PaintReference {
  return {
    id,
    title: id,
    subject: "fruit",
    difficulty: "gentle",
    minutes: 6,
    // Never empty: alt is required of every real reference, and an empty one
    // drops the image out of the accessibility tree, which would quietly make
    // role-based assertions test the wrong thing.
    alt: `A test subject for ${id}, described for someone choosing what to paint.`,
    palette: [],
    // prompt and tip are optional on a real reference, so the default is to
    // have neither. A test that needs one passes it.
    kind: "artwork",
    credit: makeCredit(),
    image: makeLocalImage(),
    ...over,
  };
}

/** A remote-delivered photograph, for the credit and srcset paths. */
export function makePhoto(
  id: string,
  sourceId: Extract<SourceId, "pexels" | "unsplash"> = "pexels",
  over: Partial<PaintReference> = {},
): PaintReference {
  return makeReference(id, {
    kind: "photograph",
    credit: makeCredit({
      sourceId,
      institution: sourceId === "pexels" ? "Pexels" : "Unsplash",
      creator: "Jane Doe",
      creatorUrl: "https://example.test/janedoe",
      licence: LICENCES[sourceId],
    }),
    image: makeRemoteImage(),
    ...over,
  });
}
