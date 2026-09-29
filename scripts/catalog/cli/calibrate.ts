/**
 * Setting the thresholds from real decisions instead of guessing them.
 *
 *   npm run catalog:calibrate
 *
 * Every decision a curator has made is recoverable: the vocabulary records
 * which candidate each one was about, the candidates file holds their image
 * URLs, and the approved file says which went in. So this measures both
 * groups and prints, for each measurement, how well it separates them.
 *
 * It changes nothing. Its output is evidence to set thresholds.ts by, and the
 * reasoning belongs in that file's docblock where a reader can see it.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { measureAll } from "../measure.ts";
import type { LearnedVocabulary } from "../learned.ts";
import type { Measurements } from "../measure.ts";
import type { ApprovedEntry, Candidate } from "../types.ts";
import { args } from "./env.ts";

const MEASURES = [
  "subjectArea",
  "subjectCentrality",
  "subjectRegions",
  "subjectSharpness",
  "detailLoad",
  "borderVariance",
  "distinctColours",
  "valueRange",
] as const;

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf-8")) as T) : fallback;
}

function key(c: { sourceId: string; externalId: string }): string {
  return `${c.sourceId}:${c.externalId}`;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/**
 * How cleanly a measurement tells the two groups apart.
 *
 * The share of pairs (one approved, one rejected) the measurement orders
 * correctly - the AUC. 1 is a perfect separator, 0.5 is a coin toss, and
 * anything near 0.5 should be reported as useless rather than quietly used.
 */
function separation(approved: number[], rejected: number[]): number {
  if (approved.length === 0 || rejected.length === 0) return 0.5;
  let correct = 0;
  let pairs = 0;
  for (const a of approved) {
    for (const r of rejected) {
      pairs += 1;
      if (a > r) correct += 1;
      else if (a === r) correct += 0.5;
    }
  }
  return correct / pairs;
}

const source = args().source ?? "pexels";

const vocabulary = readJson<LearnedVocabulary>("catalog/curation-vocabulary.json", {
  notes: [],
  phrases: [],
});
const candidates = readJson<Candidate[]>(`catalog/candidates/${source}.json`, []);

const approvedIds = new Set<string>();
for (const file of existsSync("catalog/approved") ? readdirSync("catalog/approved") : []) {
  if (!file.endsWith(".json")) continue;
  for (const entry of readJson<ApprovedEntry[]>(`catalog/approved/${file}`, [])) {
    approvedIds.add(key(entry.candidate));
  }
}

const decided = new Set(vocabulary.notes.map((n) => n.candidateId));
const subjects = candidates.filter((c) => decided.has(key(c)) || approvedIds.has(key(c)));

if (subjects.length === 0) {
  console.error(
    `No decisions found for ${source}. Curate some candidates first, then calibrate.`,
  );
  process.exit(1);
}

console.log(`Measuring ${subjects.length} decided candidate(s)...`);
const measured = await measureAll(subjects, {
  delayMs: 120,
  onProgress: (done, total) => {
    if (done === total || done % 10 === 0) console.log(`  ${done}/${total}`);
  },
});

const withMeasurements = measured.filter(
  (c): c is Candidate & { measurements: Measurements } => Boolean(c.measurements),
);
const approved = withMeasurements.filter((c) => approvedIds.has(key(c)));
const rejected = withMeasurements.filter((c) => !approvedIds.has(key(c)));

console.log(
  `\nMeasured ${withMeasurements.length} of ${subjects.length}: ` +
    `${approved.length} approved, ${rejected.length} set aside.\n`,
);

console.log(
  "measurement          approved (p10/median/p90)      set aside (p10/median/p90)   separation",
);
console.log("-".repeat(96));

for (const measure of MEASURES) {
  const a = approved.map((c) => c.measurements[measure]);
  const r = rejected.map((c) => c.measurements[measure]);
  const auc = separation(a, r);

  // Direction-free: a measurement that predicts rejection is as useful as one
  // that predicts approval, so report how far it is from a coin toss.
  const strength = Math.abs(auc - 0.5) * 2;
  const verdict =
    strength >= 0.6 ? "strong" : strength >= 0.35 ? "usable" : "no better than chance";

  const fmt = (values: number[]) =>
    `${quantile(values, 0.1).toFixed(2)} / ${quantile(values, 0.5).toFixed(2)} / ${quantile(values, 0.9).toFixed(2)}`;

  console.log(
    `${measure.padEnd(20)} ${fmt(a).padEnd(30)} ${fmt(r).padEnd(29)} ${auc.toFixed(2)} ${verdict}`,
  );
}

console.log(`
Reading this: "separation" above 0.5 means approved images score higher on that
measurement, below 0.5 means set-aside ones do. The further from 0.5 the more
the measurement is telling you something. Anything reported as no better than
chance should be recorded as such in thresholds.ts rather than used.
`);

// The reason categories, where they were recorded, so a threshold can be
// traced to the complaint it is meant to answer.
const byReason = new Map<string, number>();
for (const note of vocabulary.notes) {
  const text = note.reason.toLowerCase();
  const category =
    text.includes("busy") || text.includes("no focus") || text.includes("no main focus")
      ? "too busy / no focus"
      : text.includes("far") || text.includes("small")
        ? "objects too far"
        : text.includes("blur")
          ? "blurred"
          : text.includes("detail")
            ? "too detailed"
            : text.includes("similar") || text.includes("already")
              ? "duplicate"
              : "other";
  byReason.set(category, (byReason.get(category) ?? 0) + 1);
}

console.log("Recorded reasons:");
for (const [reason, count] of [...byReason].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${reason}`);
}
