/**
 * Decisions proposed for the curator to confirm or change.
 *
 * The review tool asks the curator to decide every candidate from nothing:
 * look, judge, then type a title, an alt text, a difficulty and a palette.
 * A proposal does that first pass ahead of time - a decision, the reason for
 * it, and every field filled in - so the curator's job becomes agreeing or
 * correcting. The decision itself is still theirs: nothing here writes to
 * catalog/approved/, and a proposal the curator never looks at changes
 * nothing.
 *
 * Proposals are made outside the app, by whoever is helping curate - at the
 * time of writing, Claude working from the curator's recorded reasons. That
 * is authoring-time help, not the runtime AI PRODUCT.md rules out: the app
 * ships only what the curator approved.
 *
 * Whether proposals are any good is measured rather than assumed. Every
 * decision made on a proposed candidate records what was proposed, and
 * `agreement` reads those records back.
 *
 * From 28/09/2026 the curator reviews proposed approvals only. On the first
 * subject done this way (still life, 71 candidates) they agreed with all 46
 * proposed set-asides, and asked not to be shown them again. So a proposed
 * set-aside is applied as it stands by `applySetAsides`, recorded with who
 * decided it, and never counted as agreement - nobody reviewed it.
 */

import { validateEntry } from "./build.ts";
import { decisionText, record, type LearnedVocabulary } from "./learned.ts";
import type { ShortlistVerdict } from "./shortlist.ts";
import type { ApprovedEntry, Candidate } from "./types.ts";
import type { Difficulty, Subject, Swatch } from "../../src/lib/types.ts";

export type ProposedDecision = "approve" | "set-aside";

/** Everything the review form asks for, filled in. */
export interface ProposedFields {
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  minutes: number;
  alt: string;
  palette: Swatch[];
  prompt?: string;
  tip?: string;
}

export interface Proposal {
  /** `sourceId:externalId` - the key the vocabulary records decisions under. */
  candidateId: string;
  decision: ProposedDecision;
  /** "low" marks the calls worth a closer look. */
  confidence: "high" | "low";
  /** Why. Becomes the curation note, or the set-aside reason, if accepted. */
  reason: string;
  /**
   * Shown beside the proposal and never saved: which fields came from the
   * eye rather than the pixels, and what the proposal is unsure of. The
   * curator should know which parts are measured and which are judgement.
   */
  notes?: string[];
  /**
   * Required for an approval, optional for a set-aside. Writing alt text for
   * something proposed as unsuitable is effort spent on the rare path; if the
   * curator overrules it, the form falls back to its usual suggestions.
   */
  fields?: ProposedFields;
}

export interface ProposalSet {
  /** Shown on every proposal, so one is never mistaken for a decision. */
  proposedBy: string;
  proposedAt: string;
  proposals: Proposal[];
}

const SUBJECTS: readonly Subject[] = [
  "fruit", "botanical", "still-life", "creatures", "landscape", "objects",
];
const DIFFICULTIES: readonly Difficulty[] = ["gentle", "steady", "stretch"];

export function candidateKey(candidate: Pick<Candidate, "sourceId" | "externalId">): string {
  return `${candidate.sourceId}:${candidate.externalId}`;
}

/**
 * Every candidate that has already been decided, either way.
 *
 * A proposal for one of these is stale - the curator got there first - and is
 * left out of the queue rather than asking the same question twice.
 */
export function decidedKeys(
  approved: readonly ApprovedEntry[],
  vocabulary: LearnedVocabulary,
): Set<string> {
  return new Set([
    ...approved.map((entry) => candidateKey(entry.candidate)),
    ...vocabulary.notes.map((note) => note.candidateId),
  ]);
}

/** The entry an accepted approval would write, for checking against the build. */
export function toEntry(
  candidate: Candidate,
  fields: ProposedFields,
  approvedAt: string,
): ApprovedEntry {
  return {
    id: candidateKey(candidate),
    candidate,
    title: fields.title,
    subject: fields.subject,
    difficulty: fields.difficulty,
    minutes: fields.minutes,
    alt: fields.alt,
    palette: fields.palette,
    kind: candidate.sourceId === "met" ? "artwork" : "photograph",
    approvedAt,
    ...(fields.prompt ? { prompt: fields.prompt } : {}),
    ...(fields.tip ? { tip: fields.tip } : {}),
  };
}

function fieldProblems(fields: ProposedFields, where: string): string[] {
  const problems: string[] = [];
  if (!fields.title?.trim()) problems.push(`${where}: no title`);
  if (!SUBJECTS.includes(fields.subject)) problems.push(`${where}: unknown subject "${fields.subject}"`);
  if (!DIFFICULTIES.includes(fields.difficulty)) {
    problems.push(`${where}: unknown difficulty "${fields.difficulty}"`);
  }
  if (!Array.isArray(fields.palette)) {
    problems.push(`${where}: palette must be a list`);
  } else {
    for (const swatch of fields.palette) {
      if (!swatch?.name?.trim() || !/^#[0-9a-fA-F]{6}$/.test(swatch?.hex ?? "")) {
        problems.push(`${where}: palette entry ${JSON.stringify(swatch)} needs a name and a #rrggbb hex`);
      }
    }
  }
  if (fields.prompt !== undefined && !fields.prompt.trim()) {
    problems.push(`${where}: prompt is empty; leave it out instead`);
  }
  if (fields.tip !== undefined && !fields.tip.trim()) {
    problems.push(`${where}: tip is empty; leave it out instead`);
  }
  return problems;
}

/**
 * Read a proposal set, refusing anything the tool could not act on.
 *
 * An approval is also run through the build's own gate, so a proposal can
 * never put something in front of the curator that `catalog:build` would
 * then reject - alt text under the floor, or the provider's caption pasted
 * through.
 */
export function checkProposals(
  raw: unknown,
  candidates: ReadonlyMap<string, Candidate>,
  today: string,
): { set: ProposalSet; problems: string[] } {
  const problems: string[] = [];
  const input = (raw ?? {}) as Partial<ProposalSet>;

  if (!input.proposedBy?.trim()) problems.push("no proposedBy: say who made these");
  if (!Array.isArray(input.proposals)) {
    problems.push("no proposals list");
    return { set: { proposedBy: "", proposedAt: "", proposals: [] }, problems };
  }

  const seen = new Set<string>();
  for (const proposal of input.proposals) {
    const where = proposal?.candidateId ?? "(no candidateId)";
    const candidate = candidates.get(proposal?.candidateId);

    if (!candidate) {
      problems.push(`${where}: not in this queue`);
      continue;
    }
    if (seen.has(proposal.candidateId)) problems.push(`${where}: proposed twice`);
    seen.add(proposal.candidateId);

    if (proposal.decision !== "approve" && proposal.decision !== "set-aside") {
      problems.push(`${where}: decision must be "approve" or "set-aside"`);
    }
    if (proposal.confidence !== "high" && proposal.confidence !== "low") {
      problems.push(`${where}: confidence must be "high" or "low"`);
    }
    if (!proposal.reason?.trim()) problems.push(`${where}: no reason`);
    if (
      proposal.notes !== undefined &&
      (!Array.isArray(proposal.notes) || proposal.notes.some((n) => typeof n !== "string" || !n.trim()))
    ) {
      problems.push(`${where}: notes must be a list of non-empty lines`);
    }

    if (proposal.fields) {
      problems.push(...fieldProblems(proposal.fields, where));
    }
    if (proposal.decision === "approve") {
      if (!proposal.fields) {
        problems.push(`${where}: an approval needs its fields filled in`);
      } else {
        for (const problem of validateEntry(toEntry(candidate, proposal.fields, today))) {
          problems.push(`${where}: ${problem.field} ${problem.message}`);
        }
      }
    }
  }

  return {
    set: {
      proposedBy: input.proposedBy ?? "",
      proposedAt: input.proposedAt ?? "",
      proposals: input.proposals,
    },
    problems,
  };
}

export type ProposedVerdict = ShortlistVerdict & { proposal?: Proposal };

/**
 * The queue a proposal set produces: the proposed approvals still undecided.
 *
 * Confident ones first, then the unsure ones, each group in the shortlist's
 * own order. Proposed set-asides are not shown - see `applySetAsides` - and
 * neither is anything without a proposal; the review tool without
 * --proposals still shows the whole queue.
 */
export function proposalQueue(
  verdicts: readonly ShortlistVerdict[],
  proposals: readonly Proposal[],
  decided: ReadonlySet<string>,
): ProposedVerdict[] {
  const byKey = new Map(proposals.map((p) => [p.candidateId, p]));
  return verdicts
    .map((v, order) => ({ v, order, proposal: byKey.get(candidateKey(v.candidate)) }))
    .filter(
      (item): item is { v: ShortlistVerdict; order: number; proposal: Proposal } =>
        item.proposal?.decision === "approve" && !decided.has(candidateKey(item.v.candidate)),
    )
    .sort(
      (a, b) =>
        Number(a.proposal.confidence === "low") - Number(b.proposal.confidence === "low") ||
        a.order - b.order,
    )
    .map(({ v, proposal }) => ({ ...v, proposal }));
}

/**
 * Record every undecided proposed set-aside as a decision, without review.
 *
 * Each is written with its reason, what was proposed, and `decidedBy` naming
 * who made the call, so the record never passes one off as the curator's.
 * Already-decided candidates are left alone, so running it twice changes
 * nothing.
 */
export function applySetAsides(
  vocabulary: LearnedVocabulary,
  set: ProposalSet,
  candidates: ReadonlyMap<string, Candidate>,
  decided: ReadonlySet<string>,
  at: string,
): { vocabulary: LearnedVocabulary; applied: string[] } {
  let next = vocabulary;
  const applied: string[] = [];
  for (const proposal of set.proposals) {
    if (proposal.decision !== "set-aside" || decided.has(proposal.candidateId)) continue;
    const candidate = candidates.get(proposal.candidateId);
    if (!candidate) continue;
    next = record(
      next,
      "rejected",
      proposal.candidateId,
      decisionText(candidate),
      proposal.reason,
      at,
      candidate.plannedSubject,
      { proposed: "set-aside", decidedBy: set.proposedBy },
    );
    applied.push(proposal.candidateId);
  }
  return { vocabulary: next, applied };
}

export interface Agreement {
  decided: number;
  agreed: number;
  /** Proposed approvals the curator set aside. */
  overruledApprovals: number;
  /** Proposed set-asides the curator approved. */
  overruledSetAsides: number;
}

/**
 * How often the curator's decisions matched what was proposed.
 *
 * Only decisions the curator made count. A set-aside applied without review
 * is the proposal agreeing with itself.
 */
export function agreement(vocabulary: LearnedVocabulary): Agreement {
  const result: Agreement = { decided: 0, agreed: 0, overruledApprovals: 0, overruledSetAsides: 0 };
  // The latest decision per candidate is the one that stands.
  const latest = new Map<string, LearnedVocabulary["notes"][number]>();
  for (const note of vocabulary.notes) {
    if (note.proposed) latest.set(note.candidateId, note);
  }
  for (const [id, note] of latest) {
    if (note.decidedBy) latest.delete(id);
  }
  for (const note of latest.values()) {
    result.decided += 1;
    const matched =
      (note.proposed === "approve" && note.decision === "approved") ||
      (note.proposed === "set-aside" && note.decision === "rejected");
    if (matched) result.agreed += 1;
    else if (note.proposed === "approve") result.overruledApprovals += 1;
    else result.overruledSetAsides += 1;
  }
  return result;
}
