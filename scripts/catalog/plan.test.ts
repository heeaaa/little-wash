import { describe, it, expect } from "vitest";
import { mergeCandidates, plannedQueries } from "./plan.ts";
import type { Candidate } from "./types.ts";

function c(id: string, over: Partial<Candidate> = {}): Candidate {
  return {
    sourceId: "met",
    externalId: id,
    providerTitle: `Object ${id}`,
    providerAlt: null,
    objectUrl: `https://www.metmuseum.org/art/collection/search/${id}`,
    creator: null,
    creatorUrl: null,
    dateDisplay: null,
    medium: null,
    classification: null,
    intrinsicWidth: null,
    intrinsicHeight: null,
    dominantColour: null,
    imageUrl: `https://images.metmuseum.org/${id}.jpg`,
    licenceId: "cc0-1.0",
    retrievedAt: "2026-09-28",
    ...over,
  };
}

describe("merging a harvest into the existing queue", () => {
  // A subject-by-subject harvest used to overwrite the whole candidates file,
  // so harvesting one subject wiped every other subject's queue - and with it
  // the candidates recorded proposals refer to.
  it("keeps every candidate the new harvest did not touch", () => {
    const merged = mergeCandidates([c("1", { plannedSubject: "fruit" }), c("2", { plannedSubject: "objects" })], [c("3", { plannedSubject: "objects" })]);
    expect(merged.map((m) => m.externalId)).toEqual(["1", "2", "3"]);
  });

  it("refreshes a candidate harvested again, in its original place", () => {
    const merged = mergeCandidates([c("1"), c("2", { providerTitle: "old" })], [c("2", { providerTitle: "new" })]);
    expect(merged.map((m) => [m.externalId, m.providerTitle])).toEqual([
      ["1", "Object 1"],
      ["2", "new"],
    ]);
  });

  it("does not duplicate a candidate that arrives twice in one harvest", () => {
    expect(mergeCandidates([], [c("1"), c("1")]).map((m) => m.externalId)).toEqual(["1"]);
  });

  it("treats the same id from different sources as different candidates", () => {
    const merged = mergeCandidates([c("1")], [c("1", { sourceId: "pexels", licenceId: "pexels" })]);
    expect(merged).toHaveLength(2);
  });
});

describe("planned queries", () => {
  it("carry a department through to the harvest", () => {
    const queries = plannedQueries({
      target: 12,
      subjects: { creatures: { target: 12, queries: [{ query: "cat", department: 10 }, { query: "bird" }] } },
    });
    expect(queries).toEqual([
      { query: "cat", department: 10, subject: "creatures" },
      { query: "bird", subject: "creatures" },
    ]);
  });
});
