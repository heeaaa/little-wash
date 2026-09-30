import { describe, it, expect } from "vitest";
import {
  ALLOWED_LICENCES,
  CatalogBuildError,
  buildCatalog,
  renderCredits,
  solidLqip,
  toCredit,
  toImageSet,
  validateEntry,
} from "./build.ts";
import type { ApprovedEntry, Candidate } from "./types.ts";

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    sourceId: "pexels",
    externalId: "1108099",
    providerTitle: "A pear",
    providerAlt: "Artistic still life featuring a pear.",
    objectUrl: "https://www.pexels.com/photo/1108099/",
    creator: "Jane Doe",
    creatorUrl: "https://www.pexels.com/@janedoe",
    dateDisplay: null,
    medium: "Photograph",
    classification: null,
    intrinsicWidth: 2000,
    intrinsicHeight: 2000,
    dominantColour: "#685342",
    imageUrl: "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg",
    licenceId: "pexels",
    retrievedAt: "2026-09-20",
    ...over,
  };
}

function entry(over: Partial<ApprovedEntry> = {}): ApprovedEntry {
  return {
    id: "ripe-pear",
    candidate: candidate(),
    title: "Ripe Pear",
    subject: "fruit",
    difficulty: "gentle",
    minutes: 6,
    prompt: "One pear, one wash.",
    alt: "A single ripe pear, rounded and full at the base, with a short stem and one leaf.",
    palette: [{ name: "Sap Green", hex: "#8ea24a" }],
    tip: "Drop the green into the wet yellow.",
    kind: "photograph",
    approvedAt: "2026-09-20",
    ...over,
  };
}

describe("the licence gate", () => {
  it("accepts every licence on the allowlist", () => {
    expect(ALLOWED_LICENCES).toEqual([
      "cc0-1.0",
      "pdm-1.0",
      "cc-by-4.0",
      "unsplash",
      "pexels",
    ]);
  });

  it("refuses a licence that is not on it", () => {
    const problems = validateEntry(
      entry({ candidate: candidate({ licenceId: "cc-by-nc-4.0" as never }) }),
    );
    expect(problems.map((p) => p.field)).toContain("licence");
  });

  it("refuses an unknown source", () => {
    const problems = validateEntry(
      entry({ candidate: candidate({ sourceId: "getty" as never }) }),
    );
    expect(problems.map((p) => p.field)).toContain("sourceId");
  });
});

describe("the provenance gate", () => {
  it("refuses an entry with no link back to the work", () => {
    const problems = validateEntry(entry({ candidate: candidate({ objectUrl: "" }) }));
    expect(problems.map((p) => p.field)).toContain("objectUrl");
  });

  it("refuses an entry that cannot be re-fetched", () => {
    const problems = validateEntry(entry({ candidate: candidate({ externalId: "" }) }));
    expect(problems.map((p) => p.field)).toContain("externalId");
  });

  it("refuses a credit that cannot be dated", () => {
    const problems = validateEntry(
      entry({ candidate: candidate({ retrievedAt: "yesterday" }) }),
    );
    expect(problems.map((p) => p.field)).toContain("retrievedAt");
  });

  it("allows a work whose maker is genuinely unrecorded", () => {
    // Plenty of museum objects are anonymous. That is a fact about the record,
    // not a defect in it.
    expect(validateEntry(entry({ candidate: candidate({ creator: null }) }))).toEqual([]);
  });
});

describe("the alt-text gate", () => {
  it("refuses an empty alt", () => {
    const problems = validateEntry(entry({ alt: "" }));
    expect(problems[0]?.message).toMatch(/every reference must describe its subject/);
  });

  it("refuses an alt too short to describe anything", () => {
    expect(validateEntry(entry({ alt: "A pear." }))[0]?.field).toBe("alt");
  });

  it("refuses an alt that is only the title again", () => {
    const problems = validateEntry(entry({ alt: "ripe pear", title: "Ripe Pear" }));
    expect(problems.map((p) => p.field)).toContain("alt");
  });

  it("refuses the provider's own caption pasted through", () => {
    // Pexels and Unsplash captions are written for search. This is the gate
    // that makes a curator write a description for a painter instead. Long
    // enough to clear the length floor, so it is this rule that catches it.
    const caption = "Artistic still life featuring a pear on a wooden spoon, vintage charm.";
    const problems = validateEntry(
      entry({ candidate: candidate({ providerAlt: caption }), alt: caption }),
    );
    expect(problems.map((p) => p.message).join(" ")).toMatch(/provider's own caption/);
  });

  it("accepts a description written for someone choosing what to paint", () => {
    expect(validateEntry(entry())).toEqual([]);
  });
});

describe("a prompt and a tip are optional", () => {
  /*
    They used to be required, and requiring them bought a line of invented
    encouragement under references that did not need one. Unlike alt text and
    the credit, nothing breaks for anyone when they are absent.
  */
  it("builds an entry that has neither", () => {
    const bare = entry({ prompt: undefined, tip: undefined });
    expect(validateEntry(bare)).toEqual([]);
    expect(buildCatalog([bare])).toHaveLength(1);
  });

  it("leaves the fields off the reference rather than emitting empty strings", () => {
    /*
      Load-bearing. The app decides whether to render the prompt line and the
      whole Tip panel by testing the field, so "" would put an empty paragraph
      and an empty tinted card under every reference without one.
    */
    const [reference] = buildCatalog([entry({ prompt: "   ", tip: "" })]);
    expect(reference).not.toHaveProperty("prompt");
    expect(reference).not.toHaveProperty("tip");
  });

  it("still carries them through when they are written", () => {
    const [reference] = buildCatalog([
      entry({ prompt: " One pear, one wash. ", tip: " Tilt the paper. " }),
    ]);
    expect(reference?.prompt).toBe("One pear, one wash.");
    expect(reference?.tip).toBe("Tilt the paper.");
  });

  it("still refuses an entry with no alt text, which is not optional", () => {
    expect(validateEntry(entry({ prompt: undefined, tip: undefined, alt: "" })).map((p) => p.field))
      .toContain("alt");
  });
});

describe("delivery must match the source's terms", () => {
  it("refuses to treat a Pexels image as one we may copy", () => {
    // Its API guidelines require hotlinking. A local delivery here would mean
    // the build had copied photos we are not allowed to redistribute.
    expect(() =>
      toImageSet(entry({ candidate: candidate({ sourceId: "pexels" }) }), [
        { width: 400, src: "/refs/pear-400.avif" },
      ]),
    ).not.toThrow();
    // ...and the image set it produces is still remote, never local.
    const built = toImageSet(entry());
    expect(built.delivery).toBe("remote");
  });

  it("refuses a locally served entry with no derived widths", () => {
    expect(() =>
      toImageSet(entry({ candidate: candidate({ sourceId: "met", licenceId: "cc0-1.0" }) })),
    ).toThrow(/no derived widths/);
  });

  it("builds a local image set when the widths are there", () => {
    const built = toImageSet(
      entry({ candidate: candidate({ sourceId: "met", licenceId: "cc0-1.0" }) }),
      [{ width: 400, src: "/refs/a-400.avif" }],
    );
    expect(built).toMatchObject({ delivery: "local" });
  });
});

describe("the credit", () => {
  it("names the institution from the registry, not from the payload", () => {
    expect(toCredit(entry())).toMatchObject({
      sourceId: "pexels",
      institution: "Pexels",
      creator: "Jane Doe",
    });
  });

  it("carries the full licence object, not just its id", () => {
    expect(toCredit(entry()).licence).toMatchObject({
      id: "pexels",
      name: "Pexels License",
    });
  });
});

describe("the placeholder colour", () => {
  it("makes a data URI from a hex colour", () => {
    expect(solidLqip("#685342")).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("refuses anything that is not a hex colour", () => {
    expect(solidLqip("rebeccapurple")).toBeNull();
    expect(solidLqip("#abc")).toBeNull();
  });
});

describe("buildCatalog", () => {
  it("builds a reference from an approved entry", () => {
    const [reference] = buildCatalog([entry()]);
    expect(reference).toMatchObject({
      id: "ripe-pear",
      title: "Ripe Pear",
      kind: "photograph",
    });
    expect(reference?.credit.institution).toBe("Pexels");
    expect(reference?.image.delivery).toBe("remote");
  });

  it("reports every problem at once, not just the first", () => {
    try {
      buildCatalog([entry({ alt: "", title: "" })]);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogBuildError);
      const fields = (error as CatalogBuildError).problems.map((p) => p.field);
      expect(fields).toContain("alt");
      expect(fields).toContain("title");
    }
  });

  it("refuses duplicate ids, because favourites are stored by them", () => {
    try {
      buildCatalog([entry(), entry()]);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as CatalogBuildError).problems.map((p) => p.field)).toContain("id");
    }
  });

  it("builds an empty catalogue without complaint", () => {
    expect(buildCatalog([])).toEqual([]);
  });
});

describe("the credits file", () => {
  const credits = renderCredits(buildCatalog([entry()]));

  it("lists the reference with its maker and a link", () => {
    expect(credits).toContain("Ripe Pear");
    expect(credits).toContain("Jane Doe");
    expect(credits).toContain("https://www.pexels.com/photo/1108099/");
  });

  it("names the licence and groups by source", () => {
    expect(credits).toContain("## Pexels");
    expect(credits).toContain("Pexels License");
  });

  it("records the platform credit the source requires", () => {
    expect(credits).toContain("Photos provided by Pexels");
  });

  it("says it is generated, so nobody edits it by hand", () => {
    expect(credits).toMatch(/Do not edit by hand/);
  });

  it("credits warm-up inspiration photos in a section of their own", () => {
    const [reference] = buildCatalog([entry()]);
    const withPhotos = renderCredits(buildCatalog([entry()]), [
      { title: "A single cloud", credit: { ...reference!.credit, creator: "A. Photographer" } },
      { title: "An unsigned sky", credit: { ...reference!.credit, creator: null } },
    ]);
    expect(withPhotos).toContain("## Warm-up photo inspiration");
    expect(withPhotos).toContain("2 photograph(s) shown beside a warm-up");
    expect(withPhotos).toContain("| A single cloud | A. Photographer | Pexels | Pexels License |");
    expect(withPhotos).toContain("| An unsigned sky | Not recorded |");
    expect(credits).not.toContain("Warm-up photo inspiration");
  });
});
