export type Difficulty = "gentle" | "steady" | "stretch";
export type TimeBand = "5" | "15" | "30";
export type Subject =
  | "fruit"
  | "botanical"
  | "still-life"
  | "creatures"
  | "landscape"
  | "objects";

export interface Swatch {
  /** Human name of the pigment, shown to the painter. */
  name: string;
  /** Display hex used only for the palette dot; never applied to the artwork. */
  hex: string;
}

export interface PaintReference {
  id: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  /** Realistic minutes to complete; drives the time filter via bands. */
  minutes: number;
  /** One-line invitation shown under the title. */
  prompt: string;
  /**
   * Describes the subject usefully for someone deciding whether to paint it,
   * not just the file name (per PRODUCT.md accessibility requirement).
   */
  alt: string;
  /** Suggested limited palette to mix from. */
  palette: Swatch[];
  /** A concrete brushwork tip tied to this subject. */
  tip: string;
  /** Provenance of the reference artwork. */
  source: string;
  /** Imported SVG asset URL. */
  art: string;
}

export interface Filters {
  time: TimeBand | "all";
  difficulty: Difficulty | "all";
  subject: Subject | "all";
}

export const DEFAULT_FILTERS: Filters = {
  time: "all",
  difficulty: "all",
  subject: "all",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  gentle: "Gentle",
  steady: "Steady",
  stretch: "A stretch",
};

export const DIFFICULTY_NOTE: Record<Difficulty, string> = {
  gentle: "Loose shapes, forgiving edges",
  steady: "A clear subject with some form",
  stretch: "More shapes to hold together",
};

export const TIME_LABEL: Record<TimeBand, string> = {
  "5": "5 min",
  "15": "15 min",
  "30": "30 min+",
};

export const SUBJECT_LABEL: Record<Subject, string> = {
  fruit: "Fruit",
  botanical: "Botanical",
  "still-life": "Still life",
  creatures: "Creatures",
  landscape: "Landscape",
  objects: "Objects",
};

/**
 * Each subject maps to a pigment CSS custom property (defined in index.css).
 * This is the colour-coding that organises the studio in both treatments -
 * loud in "Organised Chaos", quiet in "Scattered Accents".
 */
export const SUBJECT_PIGMENT: Record<Subject, string> = {
  fruit: "--pig-fruit",
  botanical: "--pig-botanical",
  "still-life": "--pig-still-life",
  creatures: "--pig-creatures",
  landscape: "--pig-landscape",
  objects: "--pig-objects",
};

/** rgb(var(--pig-x)) helper with optional alpha, for inline pigment styling. */
export function pigment(subject: Subject, alpha?: number): string {
  const v = `var(${SUBJECT_PIGMENT[subject]})`;
  return alpha == null ? `rgb(${v})` : `rgb(${v} / ${alpha})`;
}
