import type { Filters, Subject } from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";

export interface Collection {
  id: string;
  title: string;
  blurb: string;
  /** Pigment CSS var used to colour-code the collection. */
  pigmentVar: string;
  /** The filter this collection stands for; opening it applies these. */
  filter: Partial<Filters>;
  /**
   * An explicit, curated list, for a theme no filter can express.
   *
   * Sets like Pexels' "Home from Every Angle" are curated around a mood rather
   * than a subject, difficulty or duration, so they cannot be written as a
   * filter. A collection resolves through its list or its filter, never both -
   * see resolveCollection in lib/collections.ts.
   */
  referenceIds?: string[];
  /** Subject used to pick a representative cover from the catalogue. */
  coverSubject: Subject;
}

/**
 * Curated, editorial-only collections for the prototype. Each is a saved lens
 * onto the catalogue; opening one applies its filter on Browse. No pressure or
 * ranking - just a friendly way in.
 */
export const COLLECTIONS: Collection[] = [
  {
    id: "five-minute-starts",
    title: "Quick starts",
    blurb: "Tiny warm-ups for when you have only a moment.",
    pigmentVar: "--pig-fruit",
    filter: { time: "short" },
    coverSubject: "fruit",
  },
  {
    id: "calm-botanicals",
    title: "Calm botanicals",
    blurb: "Leaves and stems to slow right down with.",
    pigmentVar: "--pig-botanical",
    filter: { subject: "botanical" },
    coverSubject: "botanical",
  },
  {
    id: "a-steady-still-life",
    title: "A steady still life",
    blurb: "Objects arranged and patiently waiting.",
    pigmentVar: "--pig-still-life",
    filter: { subject: "still-life" },
    coverSubject: "still-life",
  },
  {
    id: "gentle-first-strokes",
    title: "Gentle first strokes",
    blurb: "Forgiving shapes for a nervous brush.",
    pigmentVar: "--pig-landscape",
    filter: { difficulty: "gentle" },
    coverSubject: "objects",
  },
  {
    id: "a-bigger-study",
    title: "A bigger study",
    blurb: "For when there is time to hold a whole scene.",
    pigmentVar: "--pig-creatures",
    filter: { difficulty: "stretch" },
    coverSubject: "landscape",
  },
];

/** The query parameter that opens a curated collection on Browse. */
export const COLLECTION_PARAM = "collection";

/**
 * The URL that opens a collection.
 *
 * A filter-backed collection *is* its filter, so opening it just sets those
 * parameters and the rest of the app carries on as normal. A curated list
 * cannot be written as a filter - "Simply Citrus" is a theme, not a subject -
 * so it travels as its own id instead. Without this, opening a list-backed
 * collection set no parameters at all and quietly showed the whole catalogue.
 */
export function collectionSearch(collection: Collection): string {
  if (collection.referenceIds) {
    return `?${new URLSearchParams({ [COLLECTION_PARAM]: collection.id })}`;
  }

  const merged = { ...DEFAULT_FILTERS, ...collection.filter };
  const params = new URLSearchParams();
  if (merged.time !== "all") params.set("time", merged.time);
  if (merged.difficulty !== "all") params.set("difficulty", merged.difficulty);
  if (merged.subject !== "all") params.set("subject", merged.subject);
  const s = params.toString();
  return s ? `?${s}` : "";
}
