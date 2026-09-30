/**
 * Resolving a series to the pieces in it, and finding a piece's place there.
 *
 * A series is finite and ordered, and both halves are load-bearing: its title
 * says how many pieces it holds, and its order is the curation. So it is
 * offered whole or not at all. Collections shrink honestly when a source is
 * switched off (see collections.ts); a series cannot, because "Seven tiny
 * skies" with five skies in it breaks its own title and leaves gaps in its
 * numbering. It leaves Browse instead, and its own page says which source it
 * needs.
 */

import type { Series } from "@/data/series";
import type { SourceId } from "./sources/types";
import type { PaintReference } from "./types";

export type SeriesState =
  /** Every piece is in the catalogue the painter has switched on. */
  | { kind: "whole"; pieces: PaintReference[] }
  /** Every piece still exists, but some come from sources switched off. */
  | { kind: "withdrawn"; sources: SourceId[] }
  /** A piece has left the catalogue altogether, so no switch brings it back. */
  | { kind: "missing" };

export function findSeries(
  all: readonly Series[],
  id: string | null | undefined,
): Series | null {
  if (!id) return null;
  return all.find((series) => series.id === id) ?? null;
}

/**
 * What a series can offer, given the catalogue in play.
 *
 * `catalogue` has had disabled sources removed; `references` has not. The
 * difference is what tells a series withdrawn by a switch the painter can turn
 * back on apart from one whose piece has gone, which no switch would restore.
 * A missing piece wins over a withdrawn one for the same reason: telling
 * someone to switch a source back on would be a promise the series could not
 * keep.
 */
export function resolveSeries(
  series: Series,
  catalogue: readonly PaintReference[],
  references: readonly PaintReference[],
): SeriesState {
  if (series.pieceIds.length === 0) return { kind: "missing" };

  const pieces: PaintReference[] = [];
  const switchedOff: SourceId[] = [];

  for (const id of series.pieceIds) {
    const shown = catalogue.find((reference) => reference.id === id);
    if (shown) {
      pieces.push(shown);
      continue;
    }
    const held = references.find((reference) => reference.id === id);
    if (!held) return { kind: "missing" };
    if (!switchedOff.includes(held.credit.sourceId)) switchedOff.push(held.credit.sourceId);
  }

  return switchedOff.length > 0
    ? { kind: "withdrawn", sources: switchedOff }
    : { kind: "whole", pieces };
}

/** The series worth offering on Browse: whole ones only, with their pieces. */
export function availableSeries(
  all: readonly Series[],
  catalogue: readonly PaintReference[],
): Array<{ series: Series; pieces: PaintReference[] }> {
  return all.flatMap((series) => {
    const state = resolveSeries(series, catalogue, catalogue);
    return state.kind === "whole" ? [{ series, pieces: state.pieces }] : [];
  });
}

export interface SeriesStep {
  /** Its place in the series, counting from 1. */
  number: number;
  reference: PaintReference;
}

export interface SeriesPlace {
  /** This piece's place in the series, counting from 1. */
  number: number;
  /** Null on the first piece. */
  previous: SeriesStep | null;
  /** Null on the last piece. */
  next: SeriesStep | null;
}

/**
 * Where a piece sits in a series, and the pieces either side of it.
 *
 * A position, never a proportion: there is deliberately nothing here that
 * says how far through a series someone is. The number is the piece's own
 * place in the curator's order - the "3" of "No. 3" - and it is the same
 * whether or not anything has been painted.
 */
export function placeInSeries(
  pieces: readonly PaintReference[],
  pieceId: string,
): SeriesPlace | null {
  const index = pieces.findIndex((reference) => reference.id === pieceId);
  if (index === -1) return null;

  const step = (at: number): SeriesStep | null => {
    const reference = pieces[at];
    return reference ? { number: at + 1, reference } : null;
  };

  return { number: index + 1, previous: step(index - 1), next: step(index + 1) };
}

/**
 * How long each piece takes, as the card and the page state it: "8-25 min
 * each", or "10 min each" when they all agree. Time is the question this app
 * is built around, so a series answers it before it is opened.
 */
export function minutesEach(pieces: readonly PaintReference[]): string | null {
  if (pieces.length === 0) return null;
  const minutes = pieces.map((reference) => reference.minutes);
  const shortest = Math.min(...minutes);
  const longest = Math.max(...minutes);
  return shortest === longest
    ? `${shortest} min each`
    : `${shortest}-${longest} min each`;
}
