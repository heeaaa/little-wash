/**
 * Turning approved entries into the catalogue the app ships.
 *
 * Every rule here is a hard failure, not a warning. A catalogue that ships
 * without a licence, without a link back to the work, or with an empty alt
 * attribute is worse than a build that stops: the first two are a promise to a
 * provider broken quietly, and the third is a reference nobody using a screen
 * reader can choose.
 */

import { LICENCES, SOURCES } from "../../src/lib/sources/registry.ts";
import type {
  ApprovedEntry,
  Credit,
  ImageSet,
  LicenceId,
  PaintReference,
} from "./types.ts";

/** Licences the catalogue is allowed to carry. Anything else stops the build. */
export const ALLOWED_LICENCES: readonly LicenceId[] = [
  "cc0-1.0",
  "pdm-1.0",
  "cc-by-4.0",
  "unsplash",
  "pexels",
];

/**
 * Long enough to describe a subject rather than name it.
 *
 * PRODUCT.md:99 asks that a reference alternative "describe the subject
 * usefully for someone deciding whether to paint it, not just name the file".
 * A length floor cannot prove that, but it does catch the failure it is aimed
 * at: a provider caption or a bare title pasted through.
 */
const MIN_ALT_LENGTH = 40;

export interface BuildProblem {
  entryId: string;
  field: string;
  message: string;
}

/** Sources whose images we may not copy, because their terms say to hotlink. */
const HOTLINK_ONLY = new Set(["pexels", "unsplash"]);

export function validateEntry(entry: ApprovedEntry): BuildProblem[] {
  const problems: BuildProblem[] = [];
  const fail = (field: string, message: string) =>
    problems.push({ entryId: entry.id, field, message });

  const { candidate } = entry;

  if (!ALLOWED_LICENCES.includes(candidate.licenceId)) {
    fail("licence", `"${candidate.licenceId}" is not in the allowlist`);
  }
  if (!SOURCES[candidate.sourceId]) {
    fail("sourceId", `"${candidate.sourceId}" is not a known source`);
  }

  if (!candidate.objectUrl?.trim()) {
    fail("objectUrl", "no link back to the work on the provider's site");
  }
  if (!candidate.externalId?.trim()) {
    fail("externalId", "no provider id, so the record cannot be re-fetched");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.retrievedAt ?? "")) {
    fail("retrievedAt", "no ISO capture date, so the credit cannot be dated");
  }

  const alt = entry.alt?.trim() ?? "";
  if (!alt) {
    fail("alt", "no alternative text; every reference must describe its subject");
  } else if (alt.length < MIN_ALT_LENGTH) {
    fail("alt", `only ${alt.length} characters; needs at least ${MIN_ALT_LENGTH}`);
  } else if (alt.toLowerCase() === entry.title.trim().toLowerCase()) {
    fail("alt", "is just the title repeated, which describes nothing");
  } else if (alt === candidate.providerAlt?.trim()) {
    fail(
      "alt",
      "is the provider's own caption, written for search rather than for a painter",
    );
  }

  if (!entry.title?.trim()) fail("title", "no title");
  /*
    No gate on prompt or tip. They are optional: unlike alt text and the
    credit, nothing breaks for anyone when they are absent, and requiring them
    only bought a line of invented encouragement under references that did not
    need one. What they must not be is empty - see toReference.
  */
  if (!Number.isFinite(entry.minutes) || entry.minutes <= 0) {
    fail("minutes", "must be a positive number of minutes");
  }

  if (!candidate.imageUrl?.trim()) fail("imageUrl", "no image");

  // Delivery must match what the source's terms allow.
  const delivery = SOURCES[candidate.sourceId]?.delivery;
  if (HOTLINK_ONLY.has(candidate.sourceId) && delivery !== "remote") {
    fail(
      "delivery",
      `${candidate.sourceId} images may not be copied; its registry entry must say "remote"`,
    );
  }

  return problems;
}

export function toCredit(entry: ApprovedEntry): Credit {
  const { candidate } = entry;
  return {
    sourceId: candidate.sourceId,
    institution: SOURCES[candidate.sourceId].label,
    externalId: candidate.externalId,
    objectUrl: candidate.objectUrl,
    creator: candidate.creator,
    creatorUrl: candidate.creatorUrl,
    dateDisplay: candidate.dateDisplay,
    medium: candidate.medium,
    licence: LICENCES[candidate.licenceId],
    retrievedAt: candidate.retrievedAt,
  };
}

/**
 * Build the image set.
 *
 * Remote sources carry a base URL that their CDN resizes; local sources carry
 * the widths the derive step generated. A local entry with no widths is a
 * build failure rather than a silently broken image.
 */
export function toImageSet(
  entry: ApprovedEntry,
  localWidths?: ReadonlyArray<{ width: number; src: string }>,
): ImageSet {
  const { candidate } = entry;
  const common = {
    intrinsicWidth: candidate.intrinsicWidth ?? 0,
    intrinsicHeight: candidate.intrinsicHeight ?? 0,
    lqip: candidate.dominantColour ? solidLqip(candidate.dominantColour) : null,
  };

  if (SOURCES[candidate.sourceId].delivery === "remote") {
    return { delivery: "remote", baseUrl: candidate.imageUrl, ...common };
  }

  if (!localWidths || localWidths.length === 0) {
    throw new Error(
      `${entry.id}: ${candidate.sourceId} is served locally but no derived widths were supplied`,
    );
  }
  return { delivery: "local", widths: [...localWidths], ...common };
}

/**
 * A one-pixel placeholder of the image's average colour.
 *
 * Cheap, dependency-free and good enough to stop a plate flashing white.
 * Deliberately not a blur of the real image: it is drawn as a sibling that
 * unmounts on load, and the settled artwork must report `filter: none`.
 */
export function solidLqip(hex: string): string | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function toReference(
  entry: ApprovedEntry,
  localWidths?: ReadonlyArray<{ width: number; src: string }>,
): PaintReference {
  return {
    id: entry.id,
    title: entry.title,
    subject: entry.subject,
    difficulty: entry.difficulty,
    minutes: entry.minutes,
    alt: entry.alt,
    palette: entry.palette,
    kind: entry.kind,
    /*
      Present or absent, never present and empty. The app tests for the field
      to decide whether to render a line at all, so an empty string would put
      an empty paragraph under every title that has no prompt.
    */
    ...(entry.prompt?.trim() ? { prompt: entry.prompt.trim() } : {}),
    ...(entry.tip?.trim() ? { tip: entry.tip.trim() } : {}),
    credit: toCredit(entry),
    image: toImageSet(entry, localWidths),
  };
}

export class CatalogBuildError extends Error {
  constructor(public readonly problems: BuildProblem[]) {
    super(
      `Catalogue build refused ${problems.length} problem(s):\n` +
        problems.map((p) => `  ${p.entryId} [${p.field}] ${p.message}`).join("\n"),
    );
    this.name = "CatalogBuildError";
  }
}

/** Validate every entry, then build. Throws with all problems, not just the first. */
export function buildCatalog(
  entries: readonly ApprovedEntry[],
  localWidths: Map<string, ReadonlyArray<{ width: number; src: string }>> = new Map(),
): PaintReference[] {
  const problems = entries.flatMap(validateEntry);

  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) {
      problems.push({
        entryId: entry.id,
        field: "id",
        message: "duplicate id; favourites are stored by it, so it must be unique",
      });
    }
    seen.add(entry.id);
  }

  if (problems.length > 0) throw new CatalogBuildError(problems);

  return entries.map((entry) => toReference(entry, localWidths.get(entry.id)));
}

/**
 * The credits file.
 *
 * Every reference, with its maker, its holder, its licence and a link. The app
 * credits each piece where it appears; this is the whole list in one place.
 */
/**
 * A photo shown beside a warm-up as inspiration. Not a catalogue reference -
 * it is approved and fixed in src/data/inspiration.ts - but it is somebody's
 * photograph, so it is credited in the same file as everything else.
 */
export interface CreditedInspiration {
  title: string;
  credit: Credit;
}

export function renderCredits(
  references: readonly PaintReference[],
  inspiration: readonly CreditedInspiration[] = [],
): string {
  const bySource = new Map<string, PaintReference[]>();
  for (const reference of references) {
    const key = reference.credit.sourceId;
    bySource.set(key, [...(bySource.get(key) ?? []), reference]);
  }

  const lines = [
    "# Credits",
    "",
    "Every reference in the catalogue, with its maker and its licence.",
    "",
    "Generated by `npm run catalog:build`. Do not edit by hand.",
    "",
  ];

  for (const [sourceId, group] of bySource) {
    const info = SOURCES[sourceId as keyof typeof SOURCES];
    lines.push(`## ${info.label}`, "");
    lines.push(`${group.length} reference(s), ${info.licence.name} (${info.licence.url}).`);
    if (info.platformAttribution) {
      lines.push(
        "",
        `This source requires a platform credit: "${info.platformAttribution.label}".`,
      );
    }
    lines.push("", "| Reference | Maker | Date | Licence | Source |", "| --- | --- | --- | --- | --- |");
    for (const r of group) {
      const c = r.credit;
      lines.push(
        `| ${r.title} | ${c.creator ?? "Not recorded"} | ${c.dateDisplay ?? "-"} | ${c.licence.name} | [View](${c.objectUrl}) |`,
      );
    }
    lines.push("");
  }

  if (inspiration.length > 0) {
    lines.push(
      "## Warm-up photo inspiration",
      "",
      `${inspiration.length} photograph(s) shown beside a warm-up, never as the example. ` +
        "Chosen and approved by hand, and fixed to their variation in `src/data/inspiration.ts`.",
      "",
      "| Photo | Photographer | Platform | Licence | Source |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const { title, credit: c } of inspiration) {
      lines.push(
        `| ${title} | ${c.creator ?? "Not recorded"} | ${c.institution} | ${c.licence.name} | [View](${c.objectUrl}) |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** The generated catalogue module the app imports. */
export function renderCatalogModule(references: readonly PaintReference[]): string {
  return `/*
  Generated by \`npm run catalog:build\` from catalog/approved/. Do not edit.

  Every entry passed the licence, provenance and alt-text gates in
  scripts/catalog/build.ts. Regenerate rather than patching this file.
*/

import type { PaintReference } from "@/lib/types";

export const CATALOG: PaintReference[] = ${JSON.stringify(references, null, 2)};
`;
}
