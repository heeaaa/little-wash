import { describe, it, expect } from "vitest";
import { assess, shortlist } from "./shortlist.ts";
import type { Candidate } from "./types.ts";

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    sourceId: "pexels",
    externalId: "1",
    providerTitle: "A pear",
    providerAlt: "A pear on a table",
    objectUrl: "https://example.test/1",
    creator: "Jane Doe",
    creatorUrl: null,
    dateDisplay: null,
    medium: "Photograph",
    classification: null,
    intrinsicWidth: 2000,
    intrinsicHeight: 2000,
    dominantColour: null,
    imageUrl: "https://example.test/1.jpg",
    licenceId: "pexels",
    retrievedAt: "2026-09-20",
    ...over,
  };
}

describe("proportions", () => {
  it("sets a panorama aside: it will not sit on a sketchbook page", () => {
    const verdict = assess(candidate({ intrinsicWidth: 6000, intrinsicHeight: 1500 }));
    expect(verdict.shortlisted).toBe(false);
    expect(verdict.concerns.join(" ")).toMatch(/Aspect ratio/);
  });

  it("sets a tall strip aside for the same reason", () => {
    expect(assess(candidate({ intrinsicWidth: 800, intrinsicHeight: 3000 })).shortlisted).toBe(
      false,
    );
  });

  it("rewards a near-square subject, which suits the detail plate", () => {
    const square = assess(candidate({ intrinsicWidth: 2000, intrinsicHeight: 2000 }));
    const oblong = assess(candidate({ intrinsicWidth: 2000, intrinsicHeight: 1400 }));
    expect(square.score).toBeGreaterThan(oblong.score);
  });

  it("accepts the edges of the allowed range", () => {
    expect(assess(candidate({ intrinsicWidth: 2000, intrinsicHeight: 1000 })).shortlisted).toBe(
      true,
    );
    expect(assess(candidate({ intrinsicWidth: 1000, intrinsicHeight: 2000 })).shortlisted).toBe(
      true,
    );
  });
});

describe("resolution", () => {
  it("sets aside anything the enlarged view cannot fill", () => {
    const verdict = assess(candidate({ intrinsicWidth: 900, intrinsicHeight: 900 }));
    expect(verdict.shortlisted).toBe(false);
    expect(verdict.concerns.join(" ")).toMatch(/long edge/);
  });

  it("accepts exactly the minimum", () => {
    expect(
      assess(candidate({ intrinsicWidth: 1200, intrinsicHeight: 1200 })).shortlisted,
    ).toBe(true);
  });

  it("does not punish the Met for publishing no dimensions", () => {
    // The Met has none at all. Treating that as a failure would set aside the
    // entire source.
    const verdict = assess(
      candidate({
        sourceId: "met",
        intrinsicWidth: null,
        intrinsicHeight: null,
        providerAlt: null,
        providerTitle: "Still life with a single pear",
      }),
    );
    expect(verdict.shortlisted).toBe(true);
    expect(verdict.concerns).toEqual([]);
  });
});

describe("reading the subject", () => {
  it("promotes one clear subject on a plain background", () => {
    const plain = assess(
      candidate({ providerAlt: "A single pear isolated on a plain background" }),
    );
    expect(plain.score).toBeGreaterThan(assess(candidate()).score);
    expect(plain.reasons.join(" ")).toMatch(/one clear subject/);
    expect(plain.reasons.join(" ")).toMatch(/uncluttered background/);
  });

  it("sets aside a crowded composition", () => {
    const verdict = assess(
      candidate({ providerAlt: "A busy market with a crowd of people" }),
    );
    expect(verdict.shortlisted).toBe(false);
    expect(verdict.concerns.join(" ")).toMatch(/crowded composition/);
  });

  it("sets aside the stock-photo tableful", () => {
    // From the first real harvest of a Pexels collection: this phrasing was
    // ranking near the top until "various" and "flat lay" were added.
    const verdict = assess(
      candidate({
        providerAlt: "A vibrant flat lay of various citrus slices and herbs on a wooden board",
      }),
    );
    expect(verdict.shortlisted).toBe(false);
    expect(verdict.concerns.join(" ")).toMatch(/crowded composition/);
  });

  it("sets aside detail that defeats a quick wash", () => {
    const verdict = assess(
      candidate({ providerAlt: "An antique map with dense calligraphy" }),
    );
    expect(verdict.concerns.join(" ")).toMatch(/fine detail/);
    expect(verdict.shortlisted).toBe(false);
  });

  it("reads the classification and medium, not just the caption", () => {
    const verdict = assess(
      candidate({
        providerAlt: null,
        providerTitle: "Untitled",
        classification: "Still life",
        sourceId: "met",
      }),
    );
    expect(verdict.reasons.join(" ")).toMatch(/one clear subject/);
  });

  it("notes when a provider describes nothing at all", () => {
    const verdict = assess(candidate({ providerAlt: null }));
    expect(verdict.concerns.join(" ")).toMatch(/no description/);
  });

  it("never lets a heuristic approve anything", () => {
    // `shortlisted` means "worth a human's time", nothing more. Approval is a
    // separate, human act recorded in catalog/approved/.
    const verdict = assess(candidate({ providerAlt: "A single pear, plain background" }));
    expect(verdict).not.toHaveProperty("approved");
    expect(Object.keys(verdict).sort()).toEqual([
      "candidate",
      "concerns",
      "reasons",
      "score",
      "shortlisted",
    ]);
  });
});

describe("shortlist", () => {
  it("puts the promising first and keeps the rest rather than deleting them", () => {
    const verdicts = shortlist([
      candidate({ externalId: "busy", providerAlt: "A crowded market" }),
      candidate({ externalId: "good", providerAlt: "A single pear, plain background" }),
    ]);
    expect(verdicts).toHaveLength(2);
    expect(verdicts[0]?.candidate.externalId).toBe("good");
    expect(verdicts[1]?.shortlisted).toBe(false);
  });

  it("orders the shortlisted by score", () => {
    const verdicts = shortlist([
      candidate({ externalId: "ok", providerAlt: "A pear on a table" }),
      candidate({ externalId: "better", providerAlt: "A single pear, plain background" }),
    ]);
    expect(verdicts.map((v) => v.candidate.externalId)).toEqual(["better", "ok"]);
  });

  it("de-duplicates by source and provider id", () => {
    // Harvesting a search and a collection that overlap is normal, and the
    // same photo twice would be reviewed twice.
    const verdicts = shortlist([
      candidate({ externalId: "dup" }),
      candidate({ externalId: "dup" }),
      candidate({ externalId: "other" }),
    ]);
    expect(verdicts).toHaveLength(2);
  });

  it("keeps the same id from two different sources", () => {
    const verdicts = shortlist([
      candidate({ sourceId: "pexels", externalId: "7" }),
      candidate({ sourceId: "unsplash", externalId: "7" }),
    ]);
    expect(verdicts).toHaveLength(2);
  });

  it("handles an empty harvest", () => {
    expect(shortlist([])).toEqual([]);
  });
});
