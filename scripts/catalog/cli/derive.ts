/**
 * Derive the shipped images for approved museum pieces.
 *
 *   npm run catalog:derive
 *
 * The review tool already does this when a museum piece is approved, so this
 * is the repair command: it derives anything approved but not yet derived, or
 * whose files have gone missing, and leaves everything else alone. Running it
 * twice downloads nothing the second time.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { deriveAndStore, isDerived, isLocalSource, readManifest } from "../derive.ts";
import type { ApprovedEntry } from "../types.ts";

const entries: ApprovedEntry[] = existsSync("catalog/approved")
  ? readdirSync("catalog/approved")
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => JSON.parse(readFileSync(`catalog/approved/${f}`, "utf-8")) as ApprovedEntry[])
  : [];

const local = entries.filter((e) => isLocalSource(e.candidate.sourceId));
const manifest = readManifest();
const todo = local.filter((e) => !isDerived(e.id, manifest));

console.log(`${local.length} museum reference(s) approved, ${local.length - todo.length} already derived.`);

let failed = 0;
let bytes = 0;
for (const entry of todo) {
  const outcome = await deriveAndStore(entry);
  if (outcome.derived) {
    bytes += outcome.bytes;
    console.log(`  derived ${entry.id} at ${outcome.widths.join(", ")}px`);
  } else {
    failed += 1;
    console.error(`  could not derive ${entry.id}: ${outcome.reason}`);
  }
}

const stale = Object.keys(manifest).filter((id) => !local.some((e) => e.id === id));
if (stale.length) console.log(`${stale.length} manifest entr(ies) no longer approved; left in place: ${stale.join(", ")}`);
if (todo.length) console.log(`${todo.length - failed} derived, ${(bytes / 1024).toFixed(0)} KB written to public/references/.`);
if (failed) process.exit(1);
