/**
 * List Pexels' featured themes, to pick what to harvest.
 *
 *   npm run catalog:collections
 *
 * Its featured collections are curated around a coherent subject, which makes
 * them a better starting point than a keyword search for things like "a table
 * of citrus". A theme is a source of candidates, not a shortcut past review.
 */

import { pexelsFeaturedCollections } from "../providers/pexels.ts";
import { liveContext } from "../provider.ts";
import { loadEnv } from "./env.ts";

loadEnv();

if (!process.env.PEXELS_API_KEY) {
  console.error("PEXELS_API_KEY is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const collections = await pexelsFeaturedCollections(liveContext(), 80);
for (const collection of collections) {
  console.log(
    `${collection.id.padEnd(10)} ${String(collection.photosCount).padStart(4)}  ${collection.title}`,
  );
}
console.log(`\n${collections.length} featured collections.`);
console.log("Harvest one with: npm run catalog:harvest -- --source=pexels --collection=<id>");
