/**
 * The shipped series, held to what their titles and the catalogue promise.
 *
 * A series names its own size - "Seven tiny skies" - and points at pieces by
 * id, so two things can silently go wrong as the catalogue is rebuilt: a
 * piece id stops matching anything, or someone adds an eighth sky. Both are
 * caught here rather than by a painter counting.
 */

import { describe, it, expect } from "vitest";
import { SERIES } from "./series";
import { CATALOGUE } from "./catalogue";
import { resolveSeries } from "@/lib/series";
import { SUBJECT_PIGMENT } from "@/lib/types";

/** The sizes a title may name, in the words it would name them. */
const SIZE_WORDS: ReadonlyArray<[RegExp, number]> = [
  [/\bthree\b/i, 3],
  [/\bfour\b/i, 4],
  [/\bfive\b/i, 5],
  [/\bsix\b/i, 6],
  [/\bseven\b/i, 7],
  [/\beight\b/i, 8],
  [/\bnine\b/i, 9],
  [/\bten\b/i, 10],
  [/\ba week\b/i, 7],
];

function sizeNamedIn(title: string): number[] {
  return SIZE_WORDS.filter(([pattern]) => pattern.test(title)).map(([, size]) => size);
}

describe("the shipped series", () => {
  it("exist", () => {
    expect(SERIES.length).toBeGreaterThan(0);
  });

  it("each have their own id, safe to put in an address", () => {
    const ids = SERIES.map((series) => series.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  for (const series of SERIES) {
    describe(series.title, () => {
      it("names its size in its title, and holds exactly that many pieces", () => {
        // "Seven tiny skies" with an eighth sky added, or "A week of leaves"
        // with one dropped, is a title that lies.
        const named = sizeNamedIn(series.title);
        expect(named, `"${series.title}" should name one size`).toHaveLength(1);
        expect(series.pieceIds).toHaveLength(named[0]!);
      });

      it("stays small", () => {
        expect(series.pieceIds.length).toBeGreaterThanOrEqual(3);
        expect(series.pieceIds.length).toBeLessThanOrEqual(10);
      });

      it("never repeats a piece", () => {
        expect(new Set(series.pieceIds).size).toBe(series.pieceIds.length);
      });

      it("points only at pieces the shipped catalogue holds", () => {
        const known = new Set(CATALOGUE.map((reference) => reference.id));
        const unknown = series.pieceIds.filter((id) => !known.has(id));
        expect(unknown).toEqual([]);
      });

      it("is whole when every source is switched on", () => {
        expect(resolveSeries(series, CATALOGUE, CATALOGUE).kind).toBe("whole");
      });

      it("is colour-coded with a pigment the stylesheet defines", () => {
        expect(Object.values(SUBJECT_PIGMENT)).toContain(series.pigmentVar);
      });

      it("describes itself without pressure", () => {
        // PRODUCT.md:94. A series is where "complete all seven" or "day 3"
        // would creep in, so its own words are held to the same register as
        // the painted record.
        expect(series.blurb.length).toBeGreaterThan(0);
        expect(series.blurb.length).toBeLessThanOrEqual(200);
        expect(`${series.title} ${series.blurb}`).not.toMatch(
          /\b(streak|complete[sd]?|finish(ed)?|done|goals?|targets?|unlock\w*|challenge|achiev\w*|badges?|score|levels?|behind|catch up|keep up|don'?t miss|every day|day\s*\d+)\b/i,
        );
      });
    });
  }
});
