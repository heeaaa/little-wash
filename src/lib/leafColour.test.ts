import { describe, it, expect } from "vitest";
import { CATALOGUE } from "@/data/catalogue";
import {
  NEUTRAL_CHROMA,
  PALE_LIGHTNESS,
  chroma,
  lab,
  leafPigments,
  pooled,
  washStrength,
} from "./leafColour";

const COOL_GREY = { name: "Cool Grey", hex: "#8e9699" };
const IVORY_BLACK = { name: "Ivory Black", hex: "#33312c" };
const WARM_GREY = { name: "Warm Grey", hex: "#a89c8c" };
const CHINESE_WHITE = { name: "Chinese White", hex: "#f0ece2" };
const CERULEAN = { name: "Cerulean Blue", hex: "#4f93bd" };
const SIENNA = { name: "Burnt Sienna", hex: "#9c4c2b" };
const CADMIUM_YELLOW = { name: "Cadmium Yellow", hex: "#f7c531" };

describe("chroma", () => {
  it("measures colour apart from lightness", () => {
    // Values checked against a reference Lab converter.
    expect(chroma(COOL_GREY.hex)).toBeCloseTo(3, 0);
    expect(chroma(CADMIUM_YELLOW.hex)).toBeCloseTo(75, 0);
    expect(lab("#ffffff").l).toBeCloseTo(100, 1);
    expect(chroma("#ffffff")).toBeLessThan(0.5);
  });

  it("calls the greys, the black and the white neutral", () => {
    for (const neutral of [COOL_GREY, IVORY_BLACK, WARM_GREY, CHINESE_WHITE]) {
      expect(chroma(neutral.hex)).toBeLessThan(NEUTRAL_CHROMA);
    }
    for (const colour of [CERULEAN, SIENNA, CADMIUM_YELLOW]) {
      expect(chroma(colour.hex)).toBeGreaterThanOrEqual(NEUTRAL_CHROMA);
    }
  });
});

describe("leafPigments", () => {
  it("passes over the neutrals to the piece's first real colour", () => {
    expect(leafPigments([COOL_GREY, IVORY_BLACK, CERULEAN, SIENNA])).toEqual({
      lead: CERULEAN,
      charge: SIENNA,
    });
  });

  it("takes the first swatch when it already has colour", () => {
    expect(leafPigments([CADMIUM_YELLOW, COOL_GREY])).toEqual({
      lead: CADMIUM_YELLOW,
      charge: COOL_GREY,
    });
  });

  it("has nothing to charge with when the colour is the last swatch", () => {
    expect(leafPigments([WARM_GREY, SIENNA])).toEqual({ lead: SIENNA, charge: null });
  });

  it("keeps a grey piece grey: a palette of neutrals grows a neutral leaf", () => {
    expect(leafPigments([IVORY_BLACK, CHINESE_WHITE])).toEqual({
      lead: IVORY_BLACK,
      charge: CHINESE_WHITE,
    });
  });

  it("never grows a white leaf that cannot be seen on the paper when there is a grey to grow", () => {
    // A Chinese White leaf on the mat measured 1.04:1 - a faint outline, which
    // reads as a leaf still waiting to be coloured in. The misty pieces open on
    // white; their grey is the leaf, and the white charges its tip.
    expect(leafPigments([CHINESE_WHITE, COOL_GREY])).toEqual({
      lead: COOL_GREY,
      charge: CHINESE_WHITE,
    });
    // White and nothing else is still the truth about that piece.
    expect(leafPigments([CHINESE_WHITE])).toEqual({ lead: CHINESE_WHITE, charge: null });
  });

  it("has no colour of its own to offer when there is no palette", () => {
    expect(leafPigments([])).toBeNull();
  });

  it("ignores a swatch whose colour is not a hex it can read", () => {
    expect(leafPigments([{ name: "Broken", hex: "teal" }, SIENNA])).toEqual({
      lead: SIENNA,
      charge: null,
    });
    expect(leafPigments([{ name: "Broken", hex: "#12" }])).toBeNull();
  });

  it("only ever paints a real piece's leaf in colours from that piece's own palette", () => {
    // The whole shipped catalogue: nothing invented, and a colour wherever
    // the palette has one to give.
    for (const reference of CATALOGUE) {
      const pigments = leafPigments(reference.palette);
      if (reference.palette.length === 0) {
        expect(pigments).toBeNull();
        continue;
      }
      expect(pigments, reference.id).not.toBeNull();
      expect(reference.palette).toContainEqual(pigments!.lead);
      if (pigments!.charge) expect(reference.palette).toContainEqual(pigments!.charge);
      const hasColour = reference.palette.some((s) => chroma(s.hex) >= NEUTRAL_CHROMA);
      if (hasColour) expect(chroma(pigments!.lead.hex), reference.id).toBeGreaterThanOrEqual(NEUTRAL_CHROMA);
      // And never a neutral too pale to see, where the palette offers one that is not.
      const readable = reference.palette.some((s) => lab(s.hex).l <= PALE_LIGHTNESS);
      if (!hasColour && readable) {
        expect(lab(pigments!.lead.hex).l, reference.id).toBeLessThanOrEqual(PALE_LIGHTNESS);
      }
    }
  });
});

describe("washStrength", () => {
  it("thins a dark pigment more than a light one, as dilution would", () => {
    expect(washStrength(IVORY_BLACK.hex)).toBeLessThan(washStrength(CADMIUM_YELLOW.hex));
  });

  it("never paints a leaf fully opaque or nearly invisible", () => {
    for (const hex of ["#000000", "#ffffff", IVORY_BLACK.hex, CADMIUM_YELLOW.hex]) {
      expect(washStrength(hex)).toBeGreaterThanOrEqual(0.6);
      expect(washStrength(hex)).toBeLessThanOrEqual(0.92);
    }
  });
});

describe("pooled", () => {
  it("deepens a pigment towards the ink", () => {
    expect(lab(pooled(CADMIUM_YELLOW.hex)).l).toBeLessThan(lab(CADMIUM_YELLOW.hex).l);
  });

  it("returns a well-formed hex", () => {
    expect(pooled(CERULEAN.hex)).toMatch(/^#[0-9a-f]{6}$/);
    expect(pooled(CERULEAN.hex, 0)).toBe(CERULEAN.hex);
  });
});
