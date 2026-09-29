import { describe, it, expect } from "vitest";
import { attributionLine, creditParts, platformAttributions } from "./attribution";
import { LICENCES } from "./registry";
import type { Credit } from "./types";

function credit(over: Partial<Credit> = {}): Credit {
  return {
    sourceId: "pexels",
    institution: "Pexels",
    externalId: "1108099",
    objectUrl: "https://www.pexels.com/photo/1108099/",
    creator: "Jane Doe",
    creatorUrl: "https://www.pexels.com/@janedoe",
    dateDisplay: null,
    medium: null,
    licence: LICENCES.pexels,
    retrievedAt: "2026-09-20",
    ...over,
  };
}

describe("attributionLine", () => {
  it("credits a photograph the way a photographer expects", () => {
    expect(attributionLine(credit(), "photograph")).toBe(
      "Photo by Jane Doe on Pexels (Pexels License)",
    );
  });

  it("credits an artwork by maker and holding institution", () => {
    const met = credit({
      sourceId: "met",
      institution: "The Met",
      creator: "Vincent van Gogh",
      licence: LICENCES["cc0-1.0"],
    });
    expect(attributionLine(met, "artwork")).toBe(
      "Vincent van Gogh, The Met (CC0 1.0)",
    );
  });

  it("names the source when a photograph records no photographer", () => {
    expect(attributionLine(credit({ creator: null }), "photograph")).toBe(
      "Photo from Pexels (Pexels License)",
    );
  });

  it("names the institution alone when an artwork records no maker", () => {
    const anon = credit({
      sourceId: "met",
      institution: "The Met",
      creator: null,
      licence: LICENCES["cc0-1.0"],
    });
    expect(attributionLine(anon, "artwork")).toBe("The Met (CC0 1.0)");
  });

  it("credits even where the licence does not require it", () => {
    // Four of the five allowed licences ask for nothing. The credit is a
    // product commitment, not a licence obligation, so it must not vary.
    expect(LICENCES["cc0-1.0"].requiresAttribution).toBe(false);
    expect(LICENCES.pexels.requiresAttribution).toBe(false);
    expect(LICENCES.unsplash.requiresAttribution).toBe(false);

    for (const licence of [LICENCES["cc0-1.0"], LICENCES.pexels, LICENCES.unsplash]) {
      expect(attributionLine(credit({ licence }), "photograph")).toContain(
        "Jane Doe",
      );
    }
  });
});

describe("creditParts", () => {
  it("carries the linkable pieces through with the rendered line", () => {
    const parts = creditParts(
      credit({
        sourceId: "aic",
        institution: "Art Institute of Chicago",
        creator: "Winslow Homer",
        creatorUrl: null,
        dateDisplay: "1899",
        medium: "Watercolour on paper",
        objectUrl: "https://www.artic.edu/artworks/16776",
        licence: LICENCES["cc0-1.0"],
      }),
      "artwork",
    );

    expect(parts).toMatchObject({
      creator: "Winslow Homer",
      creatorUrl: null,
      institution: "Art Institute of Chicago",
      objectUrl: "https://www.artic.edu/artworks/16776",
      dateDisplay: "1899",
      medium: "Watercolour on paper",
      line: "Winslow Homer, Art Institute of Chicago (CC0 1.0)",
    });
    expect(parts.licence.id).toBe("cc0-1.0");
  });
});

describe("platformAttributions", () => {
  it("returns the Pexels link when Pexels photos are on screen", () => {
    expect(platformAttributions(["pexels"])).toEqual([
      { label: "Photos provided by Pexels", url: "https://www.pexels.com" },
    ]);
  });

  it("returns nothing for sources that impose no platform credit", () => {
    expect(platformAttributions(["met", "smithsonian", "placeholder"])).toEqual([]);
  });

  it("drops a platform credit once its source is switched off", () => {
    expect(platformAttributions([])).toEqual([]);
  });

  it("lists several platforms in registry order, without duplicates", () => {
    const labels = platformAttributions([
      "unsplash",
      "pexels",
      "met",
      "pexels",
    ]).map((a) => a.label);
    expect(labels).toEqual(["Photos provided by Pexels", "Photos from Unsplash"]);
  });

  it("carries the UTM parameters Unsplash's guidelines require", () => {
    const [unsplash] = platformAttributions(["unsplash"]);
    expect(unsplash?.url).toContain("utm_source=little_wash");
    expect(unsplash?.url).toContain("utm_medium=referral");
  });
});
