/**
 * Making the images we ship ourselves.
 *
 * Pexels and Unsplash are hotlinked: their terms say so, and their CDNs
 * resize on demand. The museums are the opposite. The Met sends no CORS
 * headers and offers only fixed derivatives, so each approved piece is
 * downloaded once, resized here to a small ladder of widths, and served as our
 * own WebP files from public/. CC0 is exactly the licence that permits it.
 *
 * Split in two on purpose. `deriveImage` is the only part that decodes
 * anything; `applyDerived` is pure and is what `catalog:build` uses, so the
 * build stays offline and deterministic - it reads the manifest and the files,
 * and never the network.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { SOURCES } from "../../src/lib/sources/registry.ts";
import type { ApprovedEntry, Candidate } from "./types.ts";

/** The manifest, relative to the repository root. */
export const DERIVED_MANIFEST = "catalog/derived.json";

/**
 * The same ladder the hotlinked sources are asked for (REMOTE_WIDTHS in
 * src/lib/sources/images.ts): a card on a phone, a featured plate, and the
 * enlarged view on a desktop or a 2x phone.
 */
export const DERIVED_WIDTHS: readonly number[] = [400, 800, 1600];

/** WebP at this quality stays close to the original's colour at a fraction of the size. */
const WEBP_QUALITY = 82;

export interface DerivedImage {
  /** Ascending, each a path relative to the site root, which HashRouter keeps valid. */
  widths: Array<{ width: number; src: string }>;
  intrinsicWidth: number;
  intrinsicHeight: number;
  dominantColour: string | null;
}

/** What was derived, by approved entry id, and where from. Committed. */
export type DerivedManifest = Record<string, DerivedImage & { sourceUrl: string }>;

/** Where a candidate's files live: public/<this>-<width>.webp, served as <this>-<width>.webp. */
export function derivedBase(candidate: Pick<Candidate, "sourceId" | "externalId">): string {
  return `references/${candidate.sourceId}/${candidate.externalId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Resize an original to every width it can honestly supply.
 *
 * Never enlarges: a width wider than the original is replaced by the
 * original's own width, so a small file still ships at its real resolution
 * rather than as an upscaled blur. Throws on bytes that are not an image.
 */
export async function deriveImage(
  bytes: Uint8Array,
  base: string,
): Promise<{ image: DerivedImage; files: Array<{ path: string; bytes: Uint8Array }> }> {
  const input = Buffer.from(bytes);
  // rotate() applies any EXIF orientation, so the size recorded is the size seen.
  const oriented = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = oriented.info;

  const steps = [...new Set(DERIVED_WIDTHS.map((step) => Math.min(step, w)))].sort((a, b) => a - b);
  const files: Array<{ path: string; bytes: Uint8Array }> = [];
  for (const width of steps) {
    const out = await sharp(oriented.data).resize({ width }).webp({ quality: WEBP_QUALITY }).toBuffer();
    files.push({ path: `${base}-${width}.webp`, bytes: new Uint8Array(out) });
  }

  const { dominant } = await sharp(oriented.data).stats();

  return {
    image: {
      widths: steps.map((width) => ({ width, src: `${base}-${width}.webp` })),
      intrinsicWidth: w,
      intrinsicHeight: h,
      dominantColour: dominant ? toHex(dominant) : null,
    },
    files,
  };
}

/** Sources whose images we derive rather than hotlink. */
export type IsLocal = (sourceId: Candidate["sourceId"]) => boolean;

/** What the registry says, so a new museum source needs no change here. */
export const isLocalSource: IsLocal = (sourceId) => SOURCES[sourceId]?.delivery === "local";

export function readManifest(root = "."): DerivedManifest {
  const path = join(root, DERIVED_MANIFEST);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf-8")) as DerivedManifest) : {};
}

function writeManifest(manifest: DerivedManifest, root: string): void {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  const path = join(root, DERIVED_MANIFEST);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

/** Whether an entry's derived files are all still on disk. */
export function isDerived(entryId: string, manifest: DerivedManifest, root = "."): boolean {
  const derived = manifest[entryId];
  return Boolean(derived?.widths.every((w) => existsSync(join(root, "public", w.src))));
}

export type DeriveOutcome =
  | { derived: true; bytes: number; widths: number[] }
  | { derived: false; reason: string };

/**
 * Download one approved museum piece, derive its widths into public/, and
 * record them in the manifest. Never throws: the caller already holds a saved
 * approval, and `catalog:derive` can always be run again.
 */
export async function deriveAndStore(
  entry: ApprovedEntry,
  options: { fetch?: typeof globalThis.fetch; root?: string } = {},
): Promise<DeriveOutcome> {
  const root = options.root ?? ".";
  const doFetch = options.fetch ?? globalThis.fetch;
  const { candidate } = entry;
  if (!isLocalSource(candidate.sourceId)) {
    return { derived: false, reason: `${candidate.sourceId} is hotlinked, not derived` };
  }

  try {
    const res = await doFetch(candidate.imageUrl, {
      headers: { "User-Agent": "little-wash-curation/1.0" },
    });
    if (!res.ok) return { derived: false, reason: `${candidate.sourceId} answered ${res.status}` };

    const { image, files } = await deriveImage(
      new Uint8Array(await res.arrayBuffer()),
      derivedBase(candidate),
    );
    for (const file of files) {
      const path = join(root, "public", file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.bytes);
    }

    const manifest = readManifest(root);
    manifest[entry.id] = { ...image, sourceUrl: candidate.imageUrl };
    writeManifest(manifest, root);

    return {
      derived: true,
      bytes: files.reduce((sum, f) => sum + f.bytes.length, 0),
      widths: image.widths.map((w) => w.width),
    };
  } catch (error) {
    return { derived: false, reason: String(error) };
  }
}

/**
 * Give each museum entry what the build needs from its derived files.
 *
 * Returns the entries (museum ones with their real size and colour filled in,
 * where the provider gave none), the widths by entry id, and the ids of any
 * museum entry with nothing derived yet - so the build can say what to run,
 * instead of failing inside toImageSet. Hotlinked entries pass through as
 * they are.
 */
export function applyDerived(
  entries: readonly ApprovedEntry[],
  manifest: DerivedManifest,
  isLocal: IsLocal = isLocalSource,
): {
  entries: ApprovedEntry[];
  localWidths: Map<string, ReadonlyArray<{ width: number; src: string }>>;
  missing: string[];
} {
  const localWidths = new Map<string, ReadonlyArray<{ width: number; src: string }>>();
  const missing: string[] = [];

  const out = entries.map((entry) => {
    if (!isLocal(entry.candidate.sourceId)) return entry;
    const derived = manifest[entry.id];
    if (!derived) {
      missing.push(entry.id);
      return entry;
    }
    localWidths.set(entry.id, derived.widths);
    const c = entry.candidate;
    return {
      ...entry,
      candidate: {
        ...c,
        intrinsicWidth: c.intrinsicWidth ?? derived.intrinsicWidth,
        intrinsicHeight: c.intrinsicHeight ?? derived.intrinsicHeight,
        dominantColour: c.dominantColour ?? derived.dominantColour,
      },
    };
  });

  return { entries: out, localWidths, missing };
}
