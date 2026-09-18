import type { Swatch } from "@/lib/types";

export type ExerciseKind = "brushwork" | "colour";
export type ExerciseVisual = "blooms" | "wheel" | "graded" | "values" | "mixstrip";

export interface Exercise {
  id: string;
  title: string;
  kind: ExerciseKind;
  minutes: number;
  summary: string;
  steps: string[];
  visual: ExerciseVisual;
  pigmentVar: string;
  palette?: Swatch[];
}

/**
 * Short, pressure-free warm-ups. Brushwork trains the hand; colour trains the
 * eye. No scores, no streaks - a few minutes to loosen up before a study.
 */
export const EXERCISES: Exercise[] = [
  {
    id: "wet-on-wet-blooms",
    title: "Wet-on-wet blooms",
    kind: "brushwork",
    minutes: 5,
    summary: "Let two colours meet on wet paper and watch them bleed.",
    steps: [
      "Wet a small square of paper with clean water until it shines.",
      "Touch in one colour, then a second beside it.",
      "Tilt the paper and let them find their own edge - don't brush.",
    ],
    visual: "blooms",
    pigmentVar: "--pig-still-life",
  },
  {
    id: "three-colour-wheel",
    title: "A three-colour wheel",
    kind: "colour",
    minutes: 15,
    summary: "Mix a full wheel from just three primaries.",
    steps: [
      "Paint three dabs: a yellow, a red and a blue, spaced apart.",
      "Mix each neighbouring pair halfway between them.",
      "Notice which pairs stay clean and which turn muddy.",
    ],
    visual: "wheel",
    pigmentVar: "--pig-fruit",
    palette: [
      { name: "Lemon Yellow", hex: "#e6c94f" },
      { name: "Rose Madder", hex: "#c65a67" },
      { name: "Cerulean", hex: "#3f77a8" },
    ],
  },
  {
    id: "graded-wash",
    title: "Graded wash",
    kind: "brushwork",
    minutes: 10,
    summary: "Fade one colour smoothly from deep to almost nothing.",
    steps: [
      "Load the brush and lay a strong band across the top.",
      "Add a touch more water and stroke the next band, overlapping.",
      "Keep going until the brush is nearly clean and the colour disappears.",
    ],
    visual: "graded",
    pigmentVar: "--pig-botanical",
  },
  {
    id: "value-ladder",
    title: "Value ladder",
    kind: "brushwork",
    minutes: 10,
    summary: "Step one colour from pale to dark in even rungs.",
    steps: [
      "Paint five boxes in a row.",
      "Make the first the palest wash you can, the last the deepest.",
      "Fill the middle three in even steps between them.",
    ],
    visual: "values",
    pigmentVar: "--pig-objects",
  },
  {
    id: "two-colour-mixing-strip",
    title: "Two-colour mixing strip",
    kind: "colour",
    minutes: 10,
    summary: "Walk one colour into another, one step at a time.",
    steps: [
      "Put a pure colour at each end of a strip.",
      "In each box between, shift the mix a little towards the other end.",
      "Stand back: the strip should read as a smooth journey.",
    ],
    visual: "mixstrip",
    pigmentVar: "--pig-creatures",
    palette: [
      { name: "Sap Green", hex: "#6e8c4a" },
      { name: "Burnt Sienna", hex: "#b0623c" },
    ],
  },
];
