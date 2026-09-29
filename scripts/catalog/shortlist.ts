/**
 * Narrowing a harvest down to what is worth a curator's attention.
 *
 * PRODUCT.md:66 makes sketchability "a curation gate, not a nice-to-have", and
 * :92 says a beautiful image that cannot be painted in the stated time at the
 * stated difficulty does not belong in the catalogue. Nothing here decides
 * that. Metadata cannot tell you whether a composition holds together.
 *
 * What this does is put the obviously unsuitable aside and surface the
 * promising, with its reasoning attached, so the review tool can show a person
 * *why* something was ranked where it was and they can disagree. A candidate
 * that is set aside is still in the file; it is not deleted.
 */

import { EMPTY_VOCABULARY, learnedSignal, type LearnedVocabulary } from "./learned.ts";
import { MEASUREMENTS_MAY_FILTER } from "./thresholds.ts";
import type { Candidate, Measurements } from "./types.ts";

/**
 * A panorama or a tall strip is hard to compose on a sketchbook page, and the
 * detail view is built around a plate that is roughly square.
 */
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 2;

/**
 * The enlarged view is meant to be readable beside a physical sketchbook, so
 * anything that cannot fill it is no use however good the subject is.
 */
const MIN_LONG_EDGE = 1200;

/** Signals of one clear subject, which is what the content bar asks for. */
const SINGLE_SUBJECT = [
  "single", "one ", "a single", "close-up", "closeup", "macro", "isolated",
  "still life", "solitary", "lone",
];

/** Signals of an uncluttered backdrop. */
const CLEAN_BACKGROUND = [
  "plain background", "white background", "isolated on", "minimal",
  "simple background", "studio", "neutral background", "against a",
];

/**
 * Signals of a composition with too much in it to finish in the stated time.
 * Not a judgement about the photograph - only about what a beginner can hold
 * together in one wash.
 */
const BUSY = [
  "crowd", "crowded", "busy", "cityscape", "skyline", "traffic", "festival",
  "market", "panorama", "aerial", "collage", "pattern of", "many ", "group of",
  "assortment", "collection of", "variety of", "stack of", "pile of",
  /*
    Added after the first real harvest. A "vibrant flat lay of various citrus
    slices and herbs" was ranking near the top: the phrasing that stock
    photography uses for an artfully scattered tableful is exactly what a
    beginner cannot hold together in one wash.
  */
  "various", "flat lay", "flatlay", "arrangement", "an array of", "scattered",
  "surrounded by", "full of",
];

/** Subjects whose detail defeats a short watercolour study. */
const INTRICATE = [
  "lace", "filigree", "machinery", "engine", "circuit", "typography", "text",
  "manuscript", "calligraphy", "map", "diagram", "chandelier",
];

/**
 * What the image's own pixels say about whether it can be painted.
 *
 * These are the measurable forms of what a curator actually rejected for:
 * "no focus subject", "objects too far", "blurred on the edges", "lots of
 * details hard to watercolor paint".
 *
 * Scored, not enforced. Calibration against the first 30 decisions found that
 * none of these separated approvals from rejections - see thresholds.ts for
 * why, and why that result is about the harvest being homogeneous rather than
 * about the measurements being useless. Until a varied harvest says otherwise
 * they push a candidate up or down a queue, which is recoverable, rather than
 * removing it, which is not.
 */
export function assessMeasurements(m: Measurements): {
  delta: number;
  reasons: string[];
  concerns: string[];
} {
  const reasons: string[] = [];
  const concerns: string[] = [];
  let delta = 0;

  if (m.subjectRegions === 1) {
    reasons.push("One clear subject in the frame");
    delta += 3;
  } else if (m.subjectRegions <= 3) {
    delta += 1;
  } else if (m.subjectRegions >= 6) {
    concerns.push(`${m.subjectRegions} separate things in the frame; no single focus`);
    delta -= 3;
  } else {
    concerns.push(`${m.subjectRegions} separate things in the frame`);
    delta -= 1;
  }

  if (m.subjectArea === 0) {
    concerns.push("No subject stands out from the background at all");
    delta -= 2;
  } else if (m.subjectArea < 0.08) {
    concerns.push(`Subject fills only ${Math.round(m.subjectArea * 100)}% of the frame; too far away`);
    delta -= 2;
  } else if (m.subjectArea > 0.85) {
    concerns.push("Subject fills the whole frame, with no space around it");
    delta -= 2;
  } else if (m.subjectArea >= 0.15 && m.subjectArea <= 0.6) {
    reasons.push("Subject sits well in the frame");
    delta += 2;
  }

  if (m.borderVariance <= 6) {
    reasons.push("Plain, quiet backdrop");
    delta += 2;
  } else if (m.borderVariance > 18) {
    concerns.push("Busy edges; the background competes with the subject");
    delta -= 2;
  }

  if (m.detailLoad > 0.35) {
    concerns.push("Fine detail everywhere; hard to hold together in one wash");
    delta -= 2;
  } else if (m.detailLoad < 0.15) {
    delta += 1;
  }

  // Absolute Laplacian variance varies enormously between images, so only the
  // bottom end is meaningful: below this the subject itself is soft.
  if (m.subjectSharpness > 0 && m.subjectSharpness < 200) {
    concerns.push("The subject itself is soft, not just its background");
    delta -= 2;
  }

  if (m.subjectCentrality > 0.35) {
    concerns.push("Subject is pushed well off centre");
    delta -= 1;
  }

  return { delta, reasons, concerns };
}

export interface ShortlistVerdict {
  candidate: Candidate;
  /** Higher is more promising. Only meaningful for ordering the review queue. */
  score: number;
  /** Why it looks promising, in words the review tool can show. */
  reasons: string[];
  /** Why it may not be sketchable. A hard concern keeps it out of the queue. */
  concerns: string[];
  /** Whether it reaches the review queue at all. Never whether it is approved. */
  shortlisted: boolean;
}

function haystack(candidate: Candidate): string {
  return [
    candidate.providerTitle,
    candidate.providerAlt,
    candidate.classification,
    candidate.medium,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matches(text: string, needles: readonly string[]): string[] {
  return needles.filter((needle) => text.includes(needle));
}

export function assess(
  candidate: Candidate,
  vocabulary: LearnedVocabulary = EMPTY_VOCABULARY,
): ShortlistVerdict {
  const text = haystack(candidate);
  const reasons: string[] = [];
  const concerns: string[] = [];
  let score = 0;
  let hardFail = false;

  const { intrinsicWidth: w, intrinsicHeight: h } = candidate;
  if (w && h) {
    const aspect = w / h;
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
      concerns.push(
        `Aspect ratio ${aspect.toFixed(2)} is outside ${MIN_ASPECT}-${MAX_ASPECT}; hard to compose on a page`,
      );
      hardFail = true;
    } else {
      reasons.push("Proportions suit a sketchbook page");
      score += 1;
      // A near-square subject sits best on the detail plate.
      if (aspect > 0.8 && aspect < 1.25) score += 1;
    }

    if (Math.max(w, h) < MIN_LONG_EDGE) {
      concerns.push(
        `Only ${Math.max(w, h)}px on the long edge; the enlarged view needs ${MIN_LONG_EDGE}px`,
      );
      hardFail = true;
    }
  } else {
    // The Met publishes no dimensions. Not a mark against the object; the
    // download will settle it, and the curator sees the image anyway.
    reasons.push("Dimensions unknown until the image is fetched");
  }

  /*
    When the image has been measured, what it looks like outranks what its
    caption claims. The caption heuristics stay as the fallback for anything
    harvested before measuring existed, or whose image could not be fetched.
  */
  if (candidate.measurements) {
    const measured = assessMeasurements(candidate.measurements);
    score += measured.delta;
    reasons.push(...measured.reasons);
    concerns.push(...measured.concerns);
    if (MEASUREMENTS_MAY_FILTER && measured.delta <= -4) hardFail = true;
  }

  const single = matches(text, SINGLE_SUBJECT);
  if (single.length > 0) {
    reasons.push(`Reads as one clear subject (${single[0]!.trim()})`);
    score += 2;
  }

  const clean = matches(text, CLEAN_BACKGROUND);
  if (clean.length > 0) {
    reasons.push(`Suggests an uncluttered background (${clean[0]!.trim()})`);
    score += 2;
  }

  const busy = matches(text, BUSY);
  if (busy.length > 0) {
    concerns.push(`Suggests a crowded composition (${busy.join(", ")})`);
    score -= 3;
  }

  const intricate = matches(text, INTRICATE);
  if (intricate.length > 0) {
    concerns.push(`Suggests fine detail that defeats a quick wash (${intricate.join(", ")})`);
    score -= 2;
  }

  /*
    What the curator's own decisions have taught, on top of my word lists.
    Capped well below the hard rules: it can reorder the queue but must never
    override proportions or resolution, which are facts rather than taste.
  */
  const learned = learnedSignal(vocabulary, text, candidate.plannedSubject);
  score += learned.delta;
  reasons.push(...learned.reasons);
  concerns.push(...learned.concerns);

  if (!candidate.providerAlt && candidate.sourceId !== "met") {
    // The Met never has one, so it is not a signal there. Anywhere else, a
    // missing description usually means a thinly catalogued record.
    concerns.push("Provider gives no description to judge the subject from");
  }

  return {
    candidate,
    score,
    reasons,
    concerns,
    shortlisted: !hardFail && score > 0,
  };
}

/**
 * Assess a harvest and order it, most promising first.
 *
 * Everything is returned, shortlisted or not: a heuristic putting something
 * aside is a suggestion, and the reviewer can still page through the rest.
 */
export function shortlist(
  candidates: readonly Candidate[],
  vocabulary: LearnedVocabulary = EMPTY_VOCABULARY,
): ShortlistVerdict[] {
  const seen = new Set<string>();
  const unique = candidates.filter((candidate) => {
    const key = `${candidate.sourceId}:${candidate.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique
    .map((candidate) => assess(candidate, vocabulary))
    .sort((a, b) =>
      a.shortlisted === b.shortlisted
        ? b.score - a.score
        : Number(b.shortlisted) - Number(a.shortlisted),
    );
}
