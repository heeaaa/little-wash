/**
 * Drafting the fields a curator has to fill in.
 *
 * Three rules keep this honest.
 *
 * First, no model. `PRODUCT.md:64` rules out runtime AI, so every suggestion
 * is computed from measurements of the actual pixels and from the subject the
 * curator has already chosen.
 *
 * Second, and more important: **nothing here can see the subject.** So the
 * prompt and the tip - which are about *how to paint*, and follow from value
 * range, chroma and background - come out as finished sentences. Alt text,
 * which is about *what the thing is*, comes out as a scaffold with blanks in
 * it. A template that guessed "a single pear on a table" would be exactly the
 * plausible-sounding lie the build's alt gate exists to catch. Leaving the
 * blanks visible makes the curator look at the image, which is the whole job.
 *
 * Third: say a different true thing each time. This used to offer exactly two
 * prompts and two tips, each picked by a single if/else, so a curation session
 * saw the same four sentences on candidate after candidate and stopped reading
 * them. The lines now come from a pool, every line carries the condition that
 * makes it true of the image in front of you, and which of the eligible lines
 * are offered is rotated by a per-image seed. Nothing is invented to fill the
 * space - an image that measures as plain and high-key is only ever offered
 * advice that holds for a plain, high-key image.
 */

import type { ImageAnalysis, ColourReading } from "./imageAnalysis.ts";
import { PLAIN_BACKGROUND_VARIANCE } from "./imageAnalysis.ts";
import type { Difficulty, Subject } from "../../src/lib/types.ts";

export interface FieldSuggestions {
  prompts: string[];
  /** Scaffolds with [blanks]. Never a finished description. */
  altScaffolds: string[];
  tips: string[];
  palette: Array<{ name: string; hex: string }>;
  /** What the pixels actually said, shown beside the fields. */
  observations: string[];
  concerns: string[];
  /** A starting difficulty and duration, from complexity. */
  suggestedDifficulty: Difficulty;
  suggestedMinutes: number;
}

const SUBJECT_NOUN: Record<Subject, string> = {
  fruit: "fruit",
  botanical: "plant",
  "still-life": "arrangement",
  creatures: "creature",
  landscape: "scene",
  objects: "object",
};

/**
 * The article for a sentence-opening noun. Only the nouns above need it, and
 * two of them - arrangement, object - start with a vowel.
 */
function aOrAn(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "An" : "A";
}

/** How many prompts and tips to offer. Enough to choose between, few enough to read. */
const SUGGESTION_COUNT = 3;

/**
 * What the pixels said, as the plain booleans the lines are written against.
 *
 * The thresholds match the ones `readColours` narrates, so the panel saying
 * "Wide value range" and the prompt saying "start pale, then build the shadow"
 * are never in disagreement.
 */
interface ImageFacts {
  noun: string;
  plain: boolean;
  busy: boolean;
  wideValues: boolean;
  narrowValues: boolean;
  muted: boolean;
  saturated: boolean;
  simple: boolean;
  manyColours: boolean;
  highKey: boolean;
  lowKey: boolean;
  warm: boolean;
  cool: boolean;
  /** Pigment names, lowercased for mid-sentence use, most area first. */
  pigments: string[];
}

function factsFrom(
  analysis: ImageAnalysis,
  reading: ColourReading,
  subject: Subject,
): ImageFacts {
  return {
    noun: SUBJECT_NOUN[subject],
    plain: analysis.borderVariance <= PLAIN_BACKGROUND_VARIANCE,
    busy: analysis.borderVariance > 18,
    wideValues: analysis.valueRange > 60,
    narrowValues: analysis.valueRange < 25,
    muted: analysis.meanChroma < 14,
    saturated: analysis.meanChroma > 45,
    simple: analysis.distinctColours <= 3,
    manyColours: analysis.distinctColours >= 6,
    highKey: analysis.meanLightness > 72,
    lowKey: analysis.meanLightness < 32,
    warm: analysis.warmth > 6,
    cool: analysis.warmth < -6,
    pigments: reading.palette.map((p) => p.name.toLowerCase()),
  };
}

/**
 * One thing that can be said, and what has to be true of the image to say it.
 *
 * `weight` is specificity, not quality. A line that only holds for a dark,
 * many-coloured image says more than one that holds for anything, so it is
 * offered first; the general lines are what is left when an image measures
 * unremarkably.
 */
interface Line {
  when: (facts: ImageFacts) => boolean;
  text: (facts: ImageFacts) => string;
  weight: number;
}

const always = () => true;
const pigment = (facts: ImageFacts, index: number): string => facts.pigments[index] ?? "";
const sentenceCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Prompts that name the subject the curator chose.
 *
 * Exactly one of these opens the list, so the suggestions always sound like
 * they are about this piece rather than about watercolour in general.
 */
const PROMPT_ANCHORS: readonly Line[] = [
  {
    when: (f) => f.simple && f.plain,
    text: (f) => `One ${f.noun}, one wash. Keep the background as paper and let the shape carry it.`,
    weight: 3,
  },
  {
    when: (f) => f.simple && f.plain,
    text: (f) => `${aOrAn(f.noun)} ${f.noun} and almost nothing else. A good one to start cold on.`,
    weight: 3,
  },
  {
    when: (f) => f.plain,
    text: (f) => `Nothing behind this ${f.noun} but paper, so the whole job is the shape.`,
    weight: 2,
  },
  {
    when: (f) => f.busy,
    text: (f) => `Paint the ${f.noun} and let everything behind it go soft.`,
    weight: 2,
  },
  {
    when: (f) => f.highKey,
    text: (f) => `A pale ${f.noun}. Reserve the paper early - it is the lightest thing you have.`,
    weight: 2,
  },
  {
    when: (f) => f.lowKey,
    text: (f) => `A dark ${f.noun}, so mix more than you think you need before you start.`,
    weight: 2,
  },
  {
    when: (f) => f.saturated,
    text: (f) => `${aOrAn(f.noun)} ${f.noun} at full strength. Put the colour down once and leave it alone.`,
    weight: 2,
  },
  {
    when: (f) => f.muted,
    text: (f) => `A quiet ${f.noun}. Nothing here is loud, so let the tones do the work.`,
    weight: 2,
  },
  {
    when: (f) => f.manyColours,
    text: (f) => `Pick three colours out of this ${f.noun} and paint only those.`,
    weight: 2,
  },
  {
    when: (f) => f.warm,
    text: (f) => `A warm ${f.noun}. Let one cool note in for the rest to push against.`,
    weight: 2,
  },
  {
    when: (f) => f.cool,
    text: (f) => `A cool ${f.noun}. Keep the warm notes small and late.`,
    weight: 2,
  },
  {
    when: always,
    text: (f) => `Find the big shape of the ${f.noun} first, then let the smaller ones fall into it.`,
    weight: 1,
  },
  {
    when: always,
    text: (f) => `One ${f.noun}, taken slowly. There is no prize for finishing.`,
    weight: 1,
  },
  {
    when: always,
    text: (f) => `Start this ${f.noun} with the largest wash and see where it wants edges.`,
    weight: 1,
  },
];

/** The rest of the prompts, about how this image behaves rather than what it is. */
const PROMPT_POOL: readonly Line[] = [
  {
    when: (f) => f.wideValues,
    text: () => "Start pale, then build the shadow side while the paper is still damp.",
    weight: 2,
  },
  {
    when: (f) => f.wideValues,
    text: () => "Light to dark, in that order. The darks are the last five minutes.",
    weight: 2,
  },
  {
    when: (f) => f.narrowValues,
    text: () => "Stay in a narrow range of tones and let the edges do the describing.",
    weight: 2,
  },
  {
    when: (f) => f.narrowValues,
    text: () => "Everything sits close in tone here, so let small shifts carry it.",
    weight: 2,
  },
  {
    when: (f) => f.plain,
    text: () => "Leave the background alone. The paper is already doing that job.",
    weight: 2,
  },
  {
    when: (f) => f.busy,
    text: () => "Decide what to leave out before the first wash. Most of this frame is optional.",
    weight: 2,
  },
  {
    when: (f) => f.simple,
    text: () => "Two or three washes will cover the whole thing.",
    weight: 2,
  },
  {
    when: (f) => f.manyColours,
    text: () => "Mix on the paper rather than in the palette, and let the colours meet while wet.",
    weight: 2,
  },
  {
    when: (f) => f.highKey,
    text: () => "Keep every wash weaker than feels right. It dries lighter, but not by much.",
    weight: 2,
  },
  {
    when: (f) => f.lowKey,
    text: () => "Build the dark in two passes rather than one heavy one.",
    weight: 2,
  },
  {
    when: (f) => f.muted,
    text: () => "Grey each wash with a little of its opposite rather than with black.",
    weight: 2,
  },
  {
    when: (f) => f.saturated,
    text: () => "Thin washes and clean water. Strong colour goes muddy faster than pale colour does.",
    weight: 2,
  },
  {
    when: (f) => f.warm,
    text: () => "Keep the shadows warm as well. Cool shadows under warm light look borrowed.",
    weight: 2,
  },
  {
    when: (f) => f.cool,
    text: () => "Let a warm underwash dry first, then glaze the cool over the top of it.",
    weight: 2,
  },
  { when: always, text: () => "Squint before you start, and paint only what survives.", weight: 1 },
  { when: always, text: () => "Stop a little earlier than feels finished.", weight: 1 },
  { when: always, text: () => "Draw nothing. Put the first shape down with the brush.", weight: 1 },
];

/**
 * Tips that name the pigments read out of this image.
 *
 * One of these opens the list wherever a palette could be read, because a note
 * naming the colours actually in front of the painter is worth more than any
 * amount of general advice.
 */
const TIP_ANCHORS: readonly Line[] = [
  {
    when: (f) => f.pigments.length >= 2,
    text: (f) =>
      `Drop the ${pigment(f, 1)} into the still-wet ${pigment(f, 0)} and tilt the paper rather than stirring them together.`,
    weight: 3,
  },
  {
    when: (f) => f.pigments.length >= 2,
    text: (f) =>
      `Mix the ${pigment(f, 0)} and ${pigment(f, 1)} in the well rather than on the paper, so the join stays clean.`,
    weight: 3,
  },
  {
    when: (f) => f.pigments.length >= 2,
    text: (f) =>
      `Grey the ${pigment(f, 0)} with a little ${pigment(f, 1)} instead of black, and it will stay alive as it dries.`,
    weight: 3,
  },
  {
    when: (f) => f.pigments.length >= 3,
    text: (f) =>
      `${sentenceCase(pigment(f, 0))}, ${pigment(f, 1)} and a touch of ${pigment(f, 2)} will cover all of it. Resist opening a fourth pan.`,
    weight: 3,
  },
  {
    when: (f) => f.pigments.length === 1,
    text: (f) =>
      `Almost all of this is ${pigment(f, 0)} - mix one strong well of it and dilute from there rather than reaching for a second colour.`,
    weight: 3,
  },
  {
    when: (f) => f.pigments.length === 1,
    text: (f) =>
      `${sentenceCase(pigment(f, 0))} at three strengths will do the whole thing. Mix all three before you start, so you are not matching a wash later.`,
    weight: 3,
  },
  {
    when: (f) => f.pigments.length === 1,
    text: (f) =>
      `It is nearly all ${pigment(f, 0)}, so let the water do the work: strongest in the shadow, barely tinted where the light lands.`,
    weight: 3,
  },
  // Nothing could be read off the image, so the note is about handling.
  {
    when: always,
    text: () => "Wet the shape first and drop colour in, so the edges stay soft where they meet the paper.",
    weight: 0,
  },
  {
    when: always,
    text: () => "One brush, two sizes of stroke. Changing brushes mid-wash is what breaks the flow.",
    weight: 0,
  },
];

const TIP_POOL: readonly Line[] = [
  {
    when: (f) => f.wideValues,
    text: () => "Leave the lightest area as bare paper - it is easier to keep than to recover.",
    weight: 2,
  },
  {
    when: (f) => f.wideValues,
    text: () => "Get the darkest dark in early, while you still have the nerve. Everything else reads against it.",
    weight: 2,
  },
  {
    when: (f) => f.narrowValues,
    text: () => "Keep the whole thing in two or three tones; the shapes will carry it.",
    weight: 2,
  },
  {
    when: (f) => f.narrowValues,
    text: () =>
      "Change the temperature rather than the value where two areas meet, so they stay apart without going dark.",
    weight: 2,
  },
  {
    when: (f) => f.plain,
    text: () => "Wet the shape first and drop colour in, so the edges stay soft where they meet the paper.",
    weight: 2,
  },
  {
    when: (f) => f.busy,
    text: () => "Paint the background wet so it blurs. A soft surround makes a sharp subject look sharper.",
    weight: 2,
  },
  {
    when: (f) => f.busy,
    text: () => "Squint at it: whatever disappears when you squint does not need painting.",
    weight: 2,
  },
  {
    when: (f) => f.highKey,
    text: () => "Test each wash on scrap first. At this lightness, one step too strong cannot be taken back.",
    weight: 2,
  },
  {
    when: (f) => f.lowKey,
    text: () => "Let each dark dry before the next. Wet-on-wet at this strength turns to mud.",
    weight: 2,
  },
  {
    when: (f) => f.saturated,
    text: () => "Lay the strongest colour once and stop. A second pass over dry paint dulls it.",
    weight: 2,
  },
  {
    when: (f) => f.muted,
    text: () => "Keep a clean, thirsty brush to hand and lift a soft edge while the wash is still damp.",
    weight: 2,
  },
  {
    when: (f) => f.simple,
    text: () =>
      "Use a bigger brush than the shape seems to need. It holds enough water to finish the wash in one go.",
    weight: 2,
  },
  {
    when: (f) => f.manyColours,
    text: () =>
      "Let neighbouring washes touch while wet in one or two places, so the colours mix on the paper rather than look placed.",
    weight: 2,
  },
  {
    when: (f) => f.warm,
    text: () => "Rinse between the warm washes. One dip of cool into a warm well turns the lot to khaki.",
    weight: 2,
  },
  {
    when: (f) => f.cool,
    text: () => "Keep the cool washes thin. Blues settle heavier than they look while wet.",
    weight: 2,
  },
  {
    when: always,
    text: () => "Work on a slight slope so the pigment settles toward the bottom edge of each wash.",
    weight: 1,
  },
  {
    when: always,
    text: () => "Stop while it is still a shade wetter than you would like. It keeps drying after you do.",
    weight: 1,
  },
  {
    when: always,
    text: () => "Mix more of each wash than you need. Running out mid-shape is what leaves a hard line.",
    weight: 1,
  },
];

/**
 * FNV-1a over the seed, so the same candidate is always offered the same
 * suggestions.
 *
 * Stability matters more than randomness here: reopening the tool part-way
 * through a queue must not reshuffle the advice under a piece the curator was
 * halfway through reading.
 */
export function seedOf(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Take `count` lines that are true of this image, most specific first.
 *
 * Within a specificity tier the starting point is rotated by the seed, which
 * is what stops one true sentence becoming the only sentence the curator ever
 * sees. `taken` carries across calls so an anchor is not repeated by the pool.
 */
function choose(
  lines: readonly Line[],
  facts: ImageFacts,
  seed: number,
  count: number,
  taken: Set<string>,
): string[] {
  const eligible = lines.filter((line) => line.when(facts));
  const tiers = [...new Set(eligible.map((line) => line.weight))].sort((a, b) => b - a);
  const chosen: string[] = [];

  for (const weight of tiers) {
    const tier = eligible.filter((line) => line.weight === weight);
    for (let step = 0; step < tier.length && chosen.length < count; step += 1) {
      const text = tier[(seed + step) % tier.length]!.text(facts);
      if (taken.has(text)) continue;
      taken.add(text);
      chosen.push(text);
    }
    if (chosen.length >= count) break;
  }

  return chosen;
}

export function suggestFields(
  analysis: ImageAnalysis,
  reading: ColourReading,
  subject: Subject,
  seed = "",
): FieldSuggestions {
  const facts = factsFrom(analysis, reading, subject);
  const rotation = seedOf(seed);

  const promptsTaken = new Set<string>();
  const prompts = [
    ...choose(PROMPT_ANCHORS, facts, rotation, 1, promptsTaken),
    ...choose(PROMPT_POOL, facts, rotation, SUGGESTION_COUNT, promptsTaken),
  ].slice(0, SUGGESTION_COUNT);

  const tipsTaken = new Set<string>();
  const tips = [
    ...choose(TIP_ANCHORS, facts, rotation, 1, tipsTaken),
    ...choose(TIP_POOL, facts, rotation, SUGGESTION_COUNT, tipsTaken),
  ].slice(0, SUGGESTION_COUNT);

  /*
    Scaffolds, not descriptions. The bracketed parts are the ones only a person
    looking at the image can fill in; the rest is drawn from measurements and
    is true of the file.
  */
  const altScaffolds = [
    `A [what it is], [its shape or posture], in ${describeColour(reading, analysis)}` +
      (facts.plain ? ", against a plain background." : ", with [what is behind it]."),
    `[What it is] seen [from where], [the detail worth painting], ` +
      `${facts.muted ? "in muted" : "in clear"} ${describeColour(reading, analysis)}.`,
  ];

  return {
    prompts,
    altScaffolds,
    tips,
    palette: reading.palette,
    observations: reading.observations,
    concerns: reading.concerns,
    suggestedDifficulty: difficultyFrom(analysis),
    suggestedMinutes: minutesFrom(analysis),
  };
}

function describeColour(reading: ColourReading, analysis: ImageAnalysis): string {
  const names = reading.palette.slice(0, 2).map((p) => p.name.toLowerCase());
  if (names.length === 0) return analysis.warmth > 0 ? "warm tones" : "cool tones";
  if (names.length === 1) return `${names[0]} tones`;
  return `${names[0]} and ${names[1]}`;
}

/**
 * A starting point for difficulty, from how much there is to hold together.
 *
 * The curator overrides it. This only saves them from setting every single
 * entry to the default.
 */
export function difficultyFrom(analysis: ImageAnalysis): Difficulty {
  const busy = analysis.borderVariance > 18;
  const manyColours = analysis.distinctColours >= 6;

  if (busy && manyColours) return "stretch";
  if (busy || manyColours) return "steady";
  if (analysis.distinctColours <= 3 && analysis.borderVariance <= PLAIN_BACKGROUND_VARIANCE) {
    return "gentle";
  }
  return "steady";
}

/** Minutes that match the suggested difficulty's band in catalog.ts. */
export function minutesFrom(analysis: ImageAnalysis): number {
  switch (difficultyFrom(analysis)) {
    case "gentle":
      return 8;
    case "steady":
      return 15;
    default:
      return 25;
  }
}
