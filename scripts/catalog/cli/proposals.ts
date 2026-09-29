/**
 * Where a proposal file stands, and recording its set-asides.
 *
 *   npm run catalog:proposals -- --source=pexels
 *   npm run catalog:proposals -- --source=pexels --apply-set-asides
 *
 * The first checks catalog/proposals/<source>.json and prints, per subject,
 * how many approvals are waiting for review and how many set-asides are not
 * yet recorded. The second records those set-asides as decisions, marked as
 * made by whoever proposed them rather than by the curator - see
 * applySetAsides in proposals.ts. Running it twice changes nothing.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { EMPTY_VOCABULARY, type LearnedVocabulary } from "../learned.ts";
import { applySetAsides, candidateKey, checkProposals, decidedKeys } from "../proposals.ts";
import type { ShortlistVerdict } from "../shortlist.ts";
import type { ApprovedEntry, Candidate } from "../types.ts";
import { args } from "./env.ts";

const source = args().source;
if (!source) {
  console.error("Usage: --source=<pexels|unsplash|met> [--apply-set-asides] [--proposals=<file>]");
  process.exit(1);
}

const PROPOSALS = args().proposals ?? `catalog/proposals/${source}.json`;
const SHORTLIST = `catalog/shortlist/${source}.json`;
const APPROVED = `catalog/approved/${source}.json`;
const VOCABULARY = "catalog/curation-vocabulary.json";

for (const path of [PROPOSALS, SHORTLIST]) {
  if (!existsSync(path)) {
    console.error(`No ${path}.`);
    process.exit(1);
  }
}

const candidates = new Map<string, Candidate>(
  (JSON.parse(readFileSync(SHORTLIST, "utf-8")) as ShortlistVerdict[]).map((v) => [
    candidateKey(v.candidate),
    v.candidate,
  ]),
);
const approved: ApprovedEntry[] = existsSync(APPROVED)
  ? (JSON.parse(readFileSync(APPROVED, "utf-8")) as ApprovedEntry[])
  : [];
const vocabulary: LearnedVocabulary = existsSync(VOCABULARY)
  ? (JSON.parse(readFileSync(VOCABULARY, "utf-8")) as LearnedVocabulary)
  : EMPTY_VOCABULARY;

const today = new Date().toISOString().slice(0, 10);
const { set, problems } = checkProposals(
  JSON.parse(readFileSync(PROPOSALS, "utf-8")),
  candidates,
  today,
);
if (problems.length) {
  console.error(`${PROPOSALS} has ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const decided = decidedKeys(approved, vocabulary);
const rows = new Map<string, { review: number; setAside: number; done: number }>();
for (const proposal of set.proposals) {
  const subject = candidates.get(proposal.candidateId)?.plannedSubject ?? "(none)";
  const row = rows.get(subject) ?? { review: 0, setAside: 0, done: 0 };
  if (decided.has(proposal.candidateId)) row.done += 1;
  else if (proposal.decision === "approve") row.review += 1;
  else row.setAside += 1;
  rows.set(subject, row);
}

console.log(`\n${set.proposals.length} proposal(s) by ${set.proposedBy} in ${PROPOSALS}\n`);
console.log("subject       to review   set-asides not recorded   decided");
for (const [subject, row] of rows) {
  console.log(
    `${subject.padEnd(14)}${String(row.review).padStart(9)}${String(row.setAside).padStart(26)}${String(row.done).padStart(10)}`,
  );
}

if (args()["apply-set-asides"]) {
  const result = applySetAsides(vocabulary, set, candidates, decided, today);
  if (result.applied.length) {
    writeFileSync(VOCABULARY, `${JSON.stringify(result.vocabulary, null, 2)}\n`, "utf-8");
  }
  console.log(
    `\nRecorded ${result.applied.length} set-aside(s) as decided by ${set.proposedBy}, in ${VOCABULARY}.`,
  );
} else {
  console.log("\nNothing written. Add --apply-set-asides to record the set-asides.");
}
