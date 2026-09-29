/**
 * Fetch candidates into catalog/candidates/.
 *
 *   npm run catalog:harvest -- --plan                      the whole plan
 *   npm run catalog:harvest -- --plan --subject=botanical  one subject
 *   npm run catalog:harvest -- --plan=catalog/harvest-plan-met.json --source=met
 *                                                          another plan file
 *   npm run catalog:harvest -- --source=pexels --query="single pear"
 *   npm run catalog:harvest -- --source=pexels --collection=sroaotf
 *
 * Deliberately small and explicit. This is curation, not bulk collection:
 * every provider here publishes its whole dataset for anyone who wants it, and
 * hammering a free API for a catalogue of seventy references would be rude.
 *
 * Each candidate is measured as it arrives, so the review queue can be ordered
 * on what the images actually look like rather than on their captions.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { getProvider, liveContext } from "../provider.ts";
import { measureAll } from "../measure.ts";
import { dedupe, type HashedItem } from "../similarity.ts";
import { DUPLICATE_HAMMING } from "../thresholds.ts";
import { loadPlan, mergeCandidates, plannedQueries } from "../plan.ts";
import type { ApprovedEntry, Candidate } from "../types.ts";
import type { Subject } from "../../../src/lib/types.ts";
import { args, loadEnv } from "./env.ts";

loadEnv();

const argv = args();
const source = argv.source ?? "pexels";
const usePlan = argv.plan !== undefined;

if (!usePlan && !argv.query && !argv.collection) {
  console.error(
    "Usage: --plan [--subject=<name>]  |  --source=<id> --query=... | --collection=...",
  );
  process.exit(1);
}

const provider = getProvider(source);
if (provider.keyEnvVar && !process.env[provider.keyEnvVar]) {
  console.error(`${source} needs ${provider.keyEnvVar}. Copy .env.example to .env and fill it in.`);
  process.exit(1);
}

const ctx = liveContext();
const perPage = argv["per-page"] ? Number(argv["per-page"]) : undefined;

let harvested: Candidate[] = [];
/** Set when a provider refuses part-way; what was fetched before is still kept. */
let stoppedEarly: { error: string; notRun: string[] } | null = null;

if (usePlan) {
  // A museum needs different searches from a photo library, so it can have its own plan.
  const plan = argv.plan === "true" ? loadPlan() : loadPlan(argv.plan);
  const queries = plannedQueries(plan, argv.subject);
  if (queries.length === 0) {
    console.error(`Nothing planned for "${argv.subject}". Check catalog/harvest-plan.json.`);
    process.exit(1);
  }

  console.log(`${queries.length} planned quer(ies) from ${source}...`);
  for (const [index, planned] of queries.entries()) {
    let batch: Candidate[];
    try {
      batch = await provider.harvest(
        {
          query: planned.query,
          perPage: perPage ?? 15,
          orientation: planned.orientation,
          department: planned.department,
        },
        ctx,
      );
    } catch (error) {
      // Stop asking, but keep everything fetched so far.
      stoppedEarly = {
        error: String(error),
        notRun: queries.slice(index).map((q) => `${q.subject} - "${q.query}"`),
      };
      console.error(`\nStopped: ${stoppedEarly.error}`);
      break;
    }
    // Tag with the subject the query was aimed at, so review prefills it.
    harvested.push(
      ...batch.map((c) => ({ ...c, plannedSubject: planned.subject as Subject })),
    );
    console.log(`  ${String(batch.length).padStart(3)}  ${planned.subject} - "${planned.query}"`);
  }
} else {
  harvested = await provider.harvest(
    {
      query: argv.query,
      collectionId: argv.collection,
      pages: argv.pages ? Number(argv.pages) : 1,
      perPage,
      orientation: argv.orientation,
    },
    ctx,
  );
}

console.log(`\n${harvested.length} candidate(s) fetched.`);

/* Anything already approved must not come back round for review again. */
const approved: ApprovedEntry[] = existsSync("catalog/approved")
  ? readdirSync("catalog/approved")
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => JSON.parse(readFileSync(`catalog/approved/${f}`, "utf-8")) as ApprovedEntry[])
  : [];
const approvedKeys = new Set(
  approved.map((e) => `${e.candidate.sourceId}:${e.candidate.externalId}`),
);

const fresh = harvested.filter((c) => !approvedKeys.has(`${c.sourceId}:${c.externalId}`));
if (fresh.length < harvested.length) {
  console.log(`${harvested.length - fresh.length} already approved, skipped.`);
}

console.log(`Measuring ${fresh.length} image(s)...`);
const measured = await measureAll(fresh, {
  delayMs: 80,
  onProgress: (done, total) => {
    if (done === total || done % 25 === 0) console.log(`  ${done}/${total}`);
  },
});
const unmeasured = measured.filter((c) => !c.measurements).length;
if (unmeasured > 0) {
  console.log(`${unmeasured} could not be measured; their captions will be used instead.`);
}

/*
  Near-identical only. The curator's "we already have a similar one" is a
  judgement about the catalogue's balance, which a hash cannot answer - see
  thresholds.ts. What this does catch is the same stock photograph arriving
  from three different searches, which a broad harvest makes common.
*/
const hashable = (c: Candidate): HashedItem | null =>
  c.measurements
    ? { id: `${c.sourceId}:${c.externalId}`, hash: c.measurements.hash, hue: c.measurements.hue }
    : null;

const approvedHashes = approved
  .map((e) => hashable(e.candidate))
  .filter((h): h is HashedItem => h !== null);

const withHashes = measured
  .map((c) => ({ candidate: c, hashed: hashable(c) }))
  .filter((x): x is { candidate: Candidate; hashed: HashedItem } => x.hashed !== null);

const { kept, dropped } = dedupe(
  withHashes.map((x) => ({ ...x.hashed, candidate: x.candidate })),
  approvedHashes,
  DUPLICATE_HAMMING,
);

const keptIds = new Set(kept.map((k) => k.id));
const final = measured.filter(
  (c) => !c.measurements || keptIds.has(`${c.sourceId}:${c.externalId}`),
);

if (dropped.length > 0) {
  console.log(`\n${dropped.length} near-identical image(s) dropped:`);
  for (const d of dropped.slice(0, 8)) {
    console.log(`  ${d.item.id} ~ ${d.duplicateOf.id} (${d.duplicateOf.distance} bits apart)`);
  }
}

mkdirSync("catalog/candidates", { recursive: true });
const out = `catalog/candidates/${source}.json`;
/*
  A planned harvest adds to the queue on disk rather than replacing it, so
  harvesting one subject no longer wipes the others. A one-off search still
  replaces it, as the docs have always said.
*/
const written =
  usePlan && existsSync(out)
    ? mergeCandidates(JSON.parse(readFileSync(out, "utf-8")) as Candidate[], final)
    : final;
writeFileSync(out, `${JSON.stringify(written, null, 2)}\n`, "utf-8");
console.log(`\n${final.length} candidate(s) harvested; ${written.length} now in ${out}`);

if (stoppedEarly) {
  console.error(`\nNot run, because ${source} stopped answering: ${stoppedEarly.notRun.join("; ")}`);
  console.error("Run the same command again later; those will be fetched then.");
  process.exitCode = 1;
}
console.log("Next: npm run catalog:shortlist -- --source=" + source);
