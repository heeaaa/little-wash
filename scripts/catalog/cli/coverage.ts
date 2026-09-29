/**
 * Where the catalogue is thin, and what would fill it.
 *
 *   npm run catalog:coverage
 *
 * The command that answers "what next" from here on, instead of guessing.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  BANDS,
  DIFFICULTIES,
  FLOOR,
  checkFloor,
  measureCoverage,
} from "../coverage.ts";
import { SUBJECTS, loadPlan } from "../plan.ts";
import type { ApprovedEntry } from "../types.ts";

const entries: ApprovedEntry[] = existsSync("catalog/approved")
  ? readdirSync("catalog/approved")
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => JSON.parse(readFileSync(`catalog/approved/${f}`, "utf-8")) as ApprovedEntry[])
  : [];

const coverage = measureCoverage(entries);
const plan = existsSync("catalog/harvest-plan.json") ? loadPlan() : null;

console.log(`\n${coverage.total} approved reference(s), target ${plan?.target ?? "-"}.`);
console.log(
  `${coverage.filledCombinations} of ${coverage.totalCombinations} filter combinations have anything in them.\n`,
);

console.log("            " + BANDS.map((b) => b.padStart(8)).join("") + "     total  target");
console.log("-".repeat(64));
for (const subject of SUBJECTS) {
  const row = BANDS.map((b) => String(coverage.matrix[subject]?.[b] ?? 0).padStart(8)).join("");
  const total = coverage.bySubject[subject] ?? 0;
  const target = plan?.subjects[subject]?.target ?? FLOOR.perSubject;
  const mark = total >= target ? " " : "<";
  console.log(`${subject.padEnd(12)}${row}${String(total).padStart(10)}${String(target).padStart(8)} ${mark}`);
}
console.log("-".repeat(64));
console.log(
  "total       " + BANDS.map((b) => String(coverage.byBand[b] ?? 0).padStart(8)).join(""),
);
console.log(
  "difficulty  " +
    DIFFICULTIES.map((d) => `${d} ${coverage.byDifficulty[d] ?? 0}`).join("   "),
);

const floor = checkFloor(coverage);
console.log(
  `\nReady to replace the placeholders in the app: ${floor.passes ? "yes" : "not yet"}`,
);
for (const failure of floor.failures) console.log(`  - ${failure}`);

if (coverage.emptyCells.length > 0 && plan) {
  console.log("\nEmpty cells, and the planned queries that would fill them:");
  const shown = new Set<string>();
  for (const { subject } of coverage.emptyCells) {
    if (shown.has(subject)) continue;
    shown.add(subject);
    const queries = plan.subjects[subject]?.queries ?? [];
    const bands = coverage.emptyCells.filter((c) => c.subject === subject).map((c) => c.band);
    console.log(`\n  ${subject} (empty in: ${bands.join(", ")})`);
    for (const q of queries.slice(0, 3)) console.log(`      "${q.query}"`);
    console.log(
      `    npm run catalog:harvest -- --plan --subject=${subject}`,
    );
  }
}

console.log("");
