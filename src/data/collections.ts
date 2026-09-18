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
    title: "Five-minute starts",
    blurb: "Tiny warm-ups for when you have only a moment.",
    pigmentVar: "--pig-fruit",
    filter: { time: "5" },
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

/** Build a URLSearchParams string from a collection's filter. */
export function collectionSearch(collection: Collection): string {
  const merged = { ...DEFAULT_FILTERS, ...collection.filter };
  const params = new URLSearchParams();
  if (merged.time !== "all") params.set("time", merged.time);
  if (merged.difficulty !== "all") params.set("difficulty", merged.difficulty);
  if (merged.subject !== "all") params.set("subject", merged.subject);
  const s = params.toString();
  return s ? `?${s}` : "";
}
