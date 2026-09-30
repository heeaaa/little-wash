/**
 * Build the shipped catalogue from catalog/approved/.
 *
 *   npm run catalog:build
 *
 * Reads only committed files, so it is deterministic, needs no keys and runs
 * in CI. CI re-runs it and fails if the generated output has drifted from its
 * inputs, which is what stops a hand-edited catalogue reaching production.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import {
  CatalogBuildError,
  buildCatalog,
  renderCatalogModule,
  renderCredits,
} from "../build.ts";
import { applyDerived, readManifest } from "../derive.ts";
import type { ApprovedEntry } from "../types.ts";
import { INSPIRATION_PHOTOS } from "../../../src/data/inspiration.ts";

const APPROVED_DIR = "catalog/approved";
const CATALOG_MODULE = "src/data/catalog.generated.ts";
const CREDITS = "docs/CREDITS.md";

function readApproved(): ApprovedEntry[] {
  if (!existsSync(APPROVED_DIR)) return [];
  return readdirSync(APPROVED_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(`${APPROVED_DIR}/${f}`, "utf-8")) as ApprovedEntry[]);
}

/*
  Museum images are derived once, when approved, into public/ and
  catalog/derived.json. The build only reads them, so it stays offline and
  deterministic; anything not yet derived is named, with what to run.
*/
const { entries, localWidths, missing } = applyDerived(readApproved(), readManifest());
if (missing.length > 0) {
  console.error(
    `${missing.length} museum reference(s) have no derived images yet: ${missing.join(", ")}
` +
      "Run: npm run catalog:derive",
  );
  process.exit(1);
}

try {
  const references = buildCatalog(entries, localWidths);

  mkdirSync("src/data", { recursive: true });
  writeFileSync(CATALOG_MODULE, renderCatalogModule(references), "utf-8");

  mkdirSync("docs", { recursive: true });
  writeFileSync(
    CREDITS,
    `${renderCredits(references, Object.values(INSPIRATION_PHOTOS))}\n`,
    "utf-8",
  );

  console.log(`${references.length} reference(s) -> ${CATALOG_MODULE}, ${CREDITS}`);
} catch (error) {
  if (error instanceof CatalogBuildError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
