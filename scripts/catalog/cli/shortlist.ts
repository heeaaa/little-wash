/**
 * Rank a harvest for review.
 *
 *   npm run catalog:shortlist -- --source=pexels
 *
 * Writes every candidate with its reasoning attached. Nothing is deleted and
 * nothing is approved: the heuristics only decide what a person sees first.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { shortlist } from "../shortlist.ts";
import { EMPTY_VOCABULARY, type LearnedVocabulary } from "../learned.ts";
import type { Candidate } from "../types.ts";
import { args } from "./env.ts";

const VOCABULARY = "catalog/curation-vocabulary.json";

const source = args().source;
if (!source) {
  console.error("Usage: --source=<pexels|unsplash|met>");
  process.exit(1);
}

const candidates = JSON.parse(
  readFileSync(`catalog/candidates/${source}.json`, "utf-8"),
) as Candidate[];

/* What the curator's own approvals and rejections have taught so far. */
const vocabulary: LearnedVocabulary = existsSync(VOCABULARY)
  ? (JSON.parse(readFileSync(VOCABULARY, "utf-8")) as LearnedVocabulary)
  : EMPTY_VOCABULARY;

const verdicts = shortlist(candidates, vocabulary);
const promising = verdicts.filter((v) => v.shortlisted);

mkdirSync("catalog/shortlist", { recursive: true });
const out = `catalog/shortlist/${source}.json`;
writeFileSync(out, `${JSON.stringify(verdicts, null, 2)}\n`, "utf-8");

console.log(`${promising.length} of ${verdicts.length} worth reviewing -> ${out}`);
if (vocabulary.phrases.length > 0) {
  console.log(`(informed by ${vocabulary.notes.length} recorded decision(s))`);
}
for (const verdict of verdicts.slice(0, 5)) {
  const mark = verdict.shortlisted ? "+" : "-";
  console.log(`  ${mark} [${verdict.score}] ${verdict.candidate.providerTitle.slice(0, 60)}`);
  for (const concern of verdict.concerns) console.log(`      ! ${concern}`);
}
