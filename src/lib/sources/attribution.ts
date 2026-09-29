/**
 * Turning provenance into a credit.
 *
 * The rule this module exists to enforce: every surface that shows a reference
 * shows who made it. CC0 does not require that, and neither the Unsplash nor
 * the Pexels licence does either - `Licence.requiresAttribution` is false for
 * four of the five licences the catalogue allows. We credit anyway, because
 * the person who made the photograph or the painting deserves it and because a
 * painter studying a piece should be able to find its maker.
 *
 * So nothing here branches on `requiresAttribution`. The flag is recorded for
 * the build to reason about; it is not a switch any surface may read to skip a
 * credit.
 */

import type { PlatformAttribution } from "./registry";
import { SOURCE_ORDER, sourceInfo } from "./registry";
import type { Credit, Licence, ReferenceKind, SourceId } from "./types";

export interface CreditParts {
  creator: string | null;
  creatorUrl: string | null;
  institution: string;
  /** The work's own page on the provider's site. */
  objectUrl: string;
  dateDisplay: string | null;
  medium: string | null;
  licence: Licence;
  /**
   * The whole credit as plain text, for `aria-label`, for docs/CREDITS.md and
   * for any surface too small to lay the parts out separately.
   */
  line: string;
}

/**
 * A photograph and a painting read differently. "Photo by Jane Doe on Pexels"
 * is how a photographer expects to be credited; "Winslow Homer, Art Institute
 * of Chicago" is how a painting is.
 */
export function attributionLine(credit: Credit, kind: ReferenceKind): string {
  const { creator, institution, licence } = credit;

  let who: string;
  if (kind === "photograph") {
    who = creator
      ? `Photo by ${creator} on ${institution}`
      : `Photo from ${institution}`;
  } else {
    who = creator ? `${creator}, ${institution}` : institution;
  }

  return `${who} (${licence.name})`;
}

export function creditParts(credit: Credit, kind: ReferenceKind): CreditParts {
  return {
    creator: credit.creator,
    creatorUrl: credit.creatorUrl,
    institution: credit.institution,
    objectUrl: credit.objectUrl,
    dateDisplay: credit.dateDisplay,
    medium: credit.medium,
    licence: credit.licence,
    line: attributionLine(credit, kind),
  };
}

/**
 * The credits the application owes its providers, as opposed to the credits it
 * owes each maker.
 *
 * Pexels asks for a prominent "Photos provided by Pexels" link wherever its
 * photos appear; Unsplash asks to be named alongside the photographer. Passing
 * the sources actually on screen means the footer says only what is true: turn
 * Pexels off and its line goes with it.
 */
export function platformAttributions(
  sourceIds: Iterable<SourceId>,
): PlatformAttribution[] {
  const present = new Set(sourceIds);
  const out: PlatformAttribution[] = [];
  const seen = new Set<string>();

  for (const id of SOURCE_ORDER) {
    if (!present.has(id)) continue;
    const attribution = sourceInfo(id).platformAttribution;
    if (!attribution || seen.has(attribution.url)) continue;
    seen.add(attribution.url);
    out.push(attribution);
  }

  return out;
}
