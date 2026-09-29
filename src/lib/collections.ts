/**
 * Resolving a collection to the pieces actually in it.
 *
 * A collection used to be only a saved filter - "under 10 minutes", "gentle" -
 * which Browse could apply by pushing query parameters. Curated photo themes
 * are not expressible that way: "Home from Every Angle" is a mood, not a
 * subject or a duration. So a collection now resolves through either an
 * explicit list or a filter, and this is the one place that decides which.
 */

import { filterReferences } from "./catalog";
import type { Collection } from "@/data/collections";
import { DEFAULT_FILTERS, type PaintReference } from "./types";

/** True when this collection carries its own curated list. */
export function isListBacked(collection: Collection): boolean {
  return Array.isArray(collection.referenceIds);
}

/**
 * The pieces in a collection, given the catalogue currently in play.
 *
 * The catalogue passed in has already had disabled sources removed, so a
 * list-backed collection shrinks honestly when a painter switches a source
 * off. Unknown ids are dropped rather than rendered as holes, the same choice
 * savedReferences makes: a curated list outlives any single catalogue build.
 */
export function resolveCollection(
  collection: Collection,
  all: readonly PaintReference[],
): PaintReference[] {
  if (collection.referenceIds) {
    return collection.referenceIds
      .map((id) => all.find((reference) => reference.id === id))
      .filter((reference): reference is PaintReference => Boolean(reference));
  }
  return filterReferences(all, { ...DEFAULT_FILTERS, ...collection.filter });
}

/**
 * Collections worth showing: one that has emptied out has nothing to offer, so
 * it leaves Browse rather than sitting there as a dead end.
 */
export function visibleCollections(
  collections: readonly Collection[],
  all: readonly PaintReference[],
): Array<{ collection: Collection; pieces: PaintReference[] }> {
  return collections
    .map((collection) => ({
      collection,
      pieces: resolveCollection(collection, all),
    }))
    .filter((entry) => entry.pieces.length > 0);
}
