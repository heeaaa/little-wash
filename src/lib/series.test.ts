import { describe, it, expect } from "vitest";
import * as seriesModule from "./series";
import {
  availableSeries,
  findSeries,
  minutesEach,
  placeInSeries,
  resolveSeries,
} from "./series";
import { enabledReferences } from "./catalog";
import { makeCredit, makePhoto, makeReference } from "@/test/factory";
import type { Series } from "@/data/series";

function series(over: Partial<Series> = {}): Series {
  return {
    id: "three-pears",
    title: "Three pears",
    blurb: "",
    pigmentVar: "--pig-fruit",
    pieceIds: ["pear-one", "pear-two", "pear-three"],
    ...over,
  };
}

// Deliberately not in the series' order, so a result in the series' order
// can only have come from the series.
const CATALOGUE = [
  makeReference("pear-three", { minutes: 25 }),
  makeReference("pear-one", { minutes: 8 }),
  makePhoto("pear-two", "unsplash", { minutes: 12 }),
  makeReference("met-pear", {
    credit: makeCredit({ sourceId: "met", institution: "The Met" }),
  }),
];

const ids = (pieces: ReadonlyArray<{ id: string }>) => pieces.map((p) => p.id);

describe("findSeries", () => {
  const all = [series({ id: "a" }), series({ id: "b" })];

  it("finds a series by its id", () => {
    expect(findSeries(all, "b")?.id).toBe("b");
  });

  it("returns null for an id that names nothing, rather than a near miss", () => {
    expect(findSeries(all, "c")).toBeNull();
  });

  it("returns null when there is no id at all", () => {
    expect(findSeries(all, null)).toBeNull();
    expect(findSeries(all, undefined)).toBeNull();
    expect(findSeries(all, "")).toBeNull();
  });
});

describe("resolveSeries", () => {
  it("returns the pieces in the curator's order, not the catalogue's", () => {
    const state = resolveSeries(series(), CATALOGUE, CATALOGUE);
    expect(state.kind).toBe("whole");
    expect(state.kind === "whole" && ids(state.pieces)).toEqual([
      "pear-one",
      "pear-two",
      "pear-three",
    ]);
  });

  it("withdraws a series when a source it needs is switched off", () => {
    // Two pears of three is not "Three pears". It goes whole or not at all.
    const withoutUnsplash = enabledReferences(CATALOGUE, ["unsplash"]);
    expect(resolveSeries(series(), withoutUnsplash, CATALOGUE)).toEqual({
      kind: "withdrawn",
      sources: ["unsplash"],
    });
  });

  it("names each switched-off source once, in the order the series meets them", () => {
    const mixed = series({ pieceIds: ["met-pear", "pear-two", "pear-one"] });
    const onlyPlaceholders = enabledReferences(CATALOGUE, ["unsplash", "met"]);
    expect(resolveSeries(mixed, onlyPlaceholders, CATALOGUE)).toEqual({
      kind: "withdrawn",
      sources: ["met", "unsplash"],
    });
  });

  it("reports every source when everything is switched off", () => {
    const nothing = enabledReferences(CATALOGUE, ["placeholder", "unsplash", "met"]);
    expect(resolveSeries(series(), nothing, CATALOGUE)).toEqual({
      kind: "withdrawn",
      sources: ["placeholder", "unsplash"],
    });
  });

  it("calls a series missing when one of its pieces has left the catalogue", () => {
    const stale = series({ pieceIds: ["pear-one", "a-retired-pear"] });
    expect(resolveSeries(stale, CATALOGUE, CATALOGUE)).toEqual({ kind: "missing" });
  });

  it("lets a missing piece outrank a switched-off one, whichever comes first", () => {
    // "Switch Unsplash back on" would be a promise the series could not keep.
    const withoutUnsplash = enabledReferences(CATALOGUE, ["unsplash"]);
    const offFirst = series({ pieceIds: ["pear-two", "a-retired-pear"] });
    const goneFirst = series({ pieceIds: ["a-retired-pear", "pear-two"] });
    expect(resolveSeries(offFirst, withoutUnsplash, CATALOGUE)).toEqual({ kind: "missing" });
    expect(resolveSeries(goneFirst, withoutUnsplash, CATALOGUE)).toEqual({ kind: "missing" });
  });

  it("calls an empty series missing rather than offering a page of nothing", () => {
    expect(resolveSeries(series({ pieceIds: [] }), CATALOGUE, CATALOGUE)).toEqual({
      kind: "missing",
    });
  });
});

describe("availableSeries", () => {
  const all = [
    series({ id: "whole", pieceIds: ["pear-one", "pear-three"] }),
    series({ id: "needs-unsplash", pieceIds: ["pear-one", "pear-two"] }),
    series({ id: "gone", pieceIds: ["a-retired-pear"] }),
  ];

  it("offers only the series that are whole, each with its pieces", () => {
    const offered = availableSeries(all, enabledReferences(CATALOGUE, ["unsplash"]));
    expect(offered.map((entry) => entry.series.id)).toEqual(["whole"]);
    expect(ids(offered[0]!.pieces)).toEqual(["pear-one", "pear-three"]);
  });

  it("keeps the editorial order of the series themselves", () => {
    const offered = availableSeries(
      [series({ id: "second" }), series({ id: "first" })],
      CATALOGUE,
    );
    expect(offered.map((entry) => entry.series.id)).toEqual(["second", "first"]);
  });

  it("offers nothing when every source is off", () => {
    expect(availableSeries(all, [])).toEqual([]);
  });
});

describe("placeInSeries", () => {
  const pieces = [
    makeReference("one"),
    makeReference("two"),
    makeReference("three"),
  ];

  it("gives the first piece no previous", () => {
    const place = placeInSeries(pieces, "one");
    expect(place?.number).toBe(1);
    expect(place?.previous).toBeNull();
    expect(place?.next?.reference.id).toBe("two");
    expect(place?.next?.number).toBe(2);
  });

  it("gives a middle piece both neighbours, numbered from 1", () => {
    const place = placeInSeries(pieces, "two");
    expect(place?.number).toBe(2);
    expect(place?.previous).toEqual({ number: 1, reference: pieces[0] });
    expect(place?.next).toEqual({ number: 3, reference: pieces[2] });
  });

  it("gives the last piece no next", () => {
    const place = placeInSeries(pieces, "three");
    expect(place?.number).toBe(3);
    expect(place?.previous?.reference.id).toBe("two");
    expect(place?.next).toBeNull();
  });

  it("gives a piece on its own neither", () => {
    expect(placeInSeries([makeReference("solo")], "solo")).toEqual({
      number: 1,
      previous: null,
      next: null,
    });
  });

  it("returns null for a piece that is not in the series", () => {
    expect(placeInSeries(pieces, "four")).toBeNull();
  });

  it("states a position and nothing about how far through anyone is", () => {
    // The register: no total, no remaining, no proportion. A number is the
    // piece's own place in the order.
    expect(Object.keys(placeInSeries(pieces, "two")!).sort()).toEqual([
      "next",
      "number",
      "previous",
    ]);
  });
});

describe("minutesEach", () => {
  it("gives the shortest and the longest", () => {
    expect(
      minutesEach([
        makeReference("a", { minutes: 25 }),
        makeReference("b", { minutes: 8 }),
        makeReference("c", { minutes: 12 }),
      ]),
    ).toBe("8-25 min each");
  });

  it("gives one number when every piece takes the same time", () => {
    expect(
      minutesEach([makeReference("a", { minutes: 10 }), makeReference("b", { minutes: 10 })]),
    ).toBe("10 min each");
  });

  it("says nothing for no pieces", () => {
    expect(minutesEach([])).toBeNull();
  });
});

describe("what this module deliberately cannot do", () => {
  /*
    A finite, ordered series is exactly where a progress bar would creep in:
    "3 of 7", "4 to go", "series complete". PRODUCT.md:94 rules all of it out,
    so the guard is the same one painted.ts carries - nothing here computes
    how far through a series anyone is. Adding such a function makes this
    fail, and the decision has to be made on purpose.
  */
  it("exposes nothing that measures progress through a series", () => {
    const forbidden =
      /progress|complete|remaining|togo|left|percent|done|finish|unlock|streak|count|total|next(to)?paint/i;
    const offenders = Object.keys(seriesModule).filter((name) => forbidden.test(name));
    expect(offenders).toEqual([]);
  });
});
