import { describe, it, expect } from "vitest";
import {
  PIGMENTS,
  hexToRgb,
  nearestPigment,
  rgbToHex,
  rgbToLab,
  suggestPalette,
} from "./pigments.ts";
import {
  analyseImage,
  borderVariance,
  readColours,
  readsAsPaper,
  type Pixels,
} from "./imageAnalysis.ts";
import { difficultyFrom, minutesFrom, suggestFields } from "./suggest.ts";
import {
  EMPTY_VOCABULARY,
  MAX_LEARNED_WEIGHT,
  learnedSignal,
  phrasesOf,
  record,
} from "./learned.ts";
import { assess } from "./shortlist.ts";
import type { Candidate } from "./types.ts";

/** Build an image of solid colour blocks: [[hex, share], ...] left to right. */
function image(blocks: Array<[string, number]>, size = 32): Pixels {
  const data = new Uint8ClampedArray(size * size * 4);
  let x = 0;
  for (const [hex, share] of blocks) {
    const rgb = hexToRgb(hex)!;
    const columns = Math.round(size * share);
    for (let c = 0; c < columns && x < size; c += 1, x += 1) {
      for (let y = 0; y < size; y += 1) {
        const i = (y * size + x) * 4;
        data[i] = rgb.r;
        data[i + 1] = rgb.g;
        data[i + 2] = rgb.b;
        data[i + 3] = 255;
      }
    }
  }
  return { data, width: size, height: size };
}

/** A centred subject on a flat backdrop - the shape sketchability likes. */
function subjectOnPlain(subjectHex: string, groundHex: string, size = 32): Pixels {
  const data = new Uint8ClampedArray(size * size * 4);
  const subject = hexToRgb(subjectHex)!;
  const ground = hexToRgb(groundHex)!;
  const inset = Math.round(size * 0.3);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inside = x >= inset && x < size - inset && y >= inset && y < size - inset;
      const rgb = inside ? subject : ground;
      const i = (y * size + x) * 4;
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = 255;
    }
  }
  return { data, width: size, height: size };
}

describe("colour conversion", () => {
  it("round-trips hex and rgb", () => {
    expect(rgbToHex(hexToRgb("#685342")!)).toBe("#685342");
  });

  it("accepts a hex with or without the hash, in any case", () => {
    expect(hexToRgb("FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("refuses anything that is not a six-digit hex", () => {
    expect(hexToRgb("#abc")).toBeNull();
    expect(hexToRgb("rebeccapurple")).toBeNull();
  });

  it("puts white and black at the ends of the lightness axis", () => {
    expect(rgbToLab({ r: 255, g: 255, b: 255 }).l).toBeCloseTo(100, 0);
    expect(rgbToLab({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 0);
  });

  it("puts a pure red on the red side of a*", () => {
    expect(rgbToLab({ r: 255, g: 0, b: 0 }).a).toBeGreaterThan(50);
  });

  it("clamps out-of-range channels rather than emitting a broken hex", () => {
    expect(rgbToHex({ r: 300, g: -20, b: 128 })).toBe("#ff0080");
  });
});

describe("every pigment in the table is usable", () => {
  it("has a well-formed hex", () => {
    for (const pigment of PIGMENTS) {
      expect(hexToRgb(pigment.hex), `${pigment.name} has a malformed hex`).not.toBeNull();
    }
  });

  it("has a unique name", () => {
    expect(new Set(PIGMENTS.map((p) => p.name)).size).toBe(PIGMENTS.length);
  });
});

describe("matching a colour to a pigment", () => {
  it("matches a colour to its own pigment exactly", () => {
    for (const pigment of PIGMENTS) {
      expect(nearestPigment(hexToRgb(pigment.hex)!).pigment.name).toBe(pigment.name);
    }
  });

  it("puts a sky blue in the blues", () => {
    expect(nearestPigment({ r: 110, g: 160, b: 210 }).pigment.family).toBe("blue");
  });

  it("puts a leaf green in the greens", () => {
    expect(nearestPigment({ r: 90, g: 130, b: 60 }).pigment.family).toBe("green");
  });

  it("recognises a thinned pigment, not just its masstone", () => {
    // Dilution is how value is controlled in watercolour, so a pale wash of
    // ultramarine must still read as ultramarine rather than as a grey.
    const thinned = { r: 150, g: 165, b: 215 };
    expect(nearestPigment(thinned).pigment.family).toBe("blue");
  });
});

describe("suggesting a palette", () => {
  it("names a pigment per sampled colour", () => {
    const palette = suggestPalette([
      { r: 240, g: 200, b: 60 },
      { r: 90, g: 130, b: 60 },
    ]);
    expect(palette).toHaveLength(2);
    expect(palette[0]?.name).toBeTruthy();
  });

  it("never repeats a pigment", () => {
    const same = { r: 240, g: 200, b: 60 };
    const palette = suggestPalette([same, same, same]);
    expect(new Set(palette.map((p) => p.name)).size).toBe(palette.length);
  });

  it("does not hand back four of one family with nothing to shade with", () => {
    const yellows = [
      { r: 245, g: 225, b: 90 },
      { r: 247, g: 197, b: 49 },
      { r: 232, g: 214, b: 160 },
      { r: 240, g: 210, b: 80 },
    ];
    const families = suggestPalette(yellows).map(
      (p) => PIGMENTS.find((q) => q.name === p.name)!.family,
    );
    for (const family of new Set(families)) {
      expect(families.filter((f) => f === family).length).toBeLessThanOrEqual(2);
    }
  });

  it("respects the limit", () => {
    expect(
      suggestPalette(
        [
          { r: 200, g: 40, b: 40 },
          { r: 40, g: 80, b: 200 },
          { r: 60, g: 140, b: 70 },
          { r: 230, g: 200, b: 90 },
          { r: 120, g: 90, b: 60 },
        ],
        3,
      ),
    ).toHaveLength(3);
  });

  it("handles being given nothing", () => {
    expect(suggestPalette([])).toEqual([]);
  });
});

describe("reading an image", () => {
  it("finds the dominant colours, most area first", () => {
    const analysis = analyseImage(image([["#c8322c", 0.75], ["#2f4a9c", 0.25]]));
    expect(analysis.clusters[0]?.share).toBeGreaterThan(0.6);
    expect(nearestPigment(analysis.clusters[0]!.rgb).pigment.family).toBe("red");
  });

  it("counts only colours that carry real area", () => {
    const analysis = analyseImage(image([["#c8322c", 0.97], ["#2f4a9c", 0.03]]));
    expect(analysis.distinctColours).toBeLessThanOrEqual(2);
  });

  it("reports a flat border as near-zero variance", () => {
    expect(borderVariance(subjectOnPlain("#c8322c", "#f0ece2"))).toBeLessThan(1);
  });

  it("reports a busy border as high variance", () => {
    const noisy = image([
      ["#c8322c", 0.2], ["#2f4a9c", 0.2], ["#f2e55c", 0.2],
      ["#33312c", 0.2], ["#2e7a63", 0.2],
    ]);
    expect(borderVariance(noisy)).toBeGreaterThan(18);
  });

  it("measures the value range between light and dark", () => {
    const contrasty = analyseImage(image([["#ffffff", 0.5], ["#000000", 0.5]]));
    const flat = analyseImage(image([["#8e9699", 1]]));
    expect(contrasty.valueRange).toBeGreaterThan(80);
    expect(flat.valueRange).toBeLessThan(5);
  });

  it("tells warm from cool", () => {
    expect(analyseImage(image([["#e2702c", 1]])).warmth).toBeGreaterThan(6);
    expect(analyseImage(image([["#2f4a9c", 1]])).warmth).toBeLessThan(-6);
  });

  it("tells muted from saturated", () => {
    expect(analyseImage(image([["#a89c8c", 1]])).meanChroma).toBeLessThan(20);
    expect(analyseImage(image([["#c8322c", 1]])).meanChroma).toBeGreaterThan(45);
  });

  it("ignores transparent padding rather than counting it as black", () => {
    const size = 8;
    const data = new Uint8ClampedArray(size * size * 4);
    // Half opaque red, half fully transparent.
    for (let i = 0; i < (size * size) / 2; i += 1) {
      data[i * 4] = 200;
      data[i * 4 + 3] = 255;
    }
    const analysis = analyseImage({ data, width: size, height: size });
    expect(analysis.clusters.every((c) => c.rgb.r > 100)).toBe(true);
  });

  it("survives an entirely transparent image", () => {
    const analysis = analyseImage({
      data: new Uint8ClampedArray(4 * 16),
      width: 4,
      height: 4,
    });
    expect(analysis.clusters).toEqual([]);
    expect(analysis.distinctColours).toBe(0);
  });
});

describe("what the reading says out loud", () => {
  it("notices a plain backdrop", () => {
    const reading = readColours(analyseImage(subjectOnPlain("#c8322c", "#f0ece2")));
    expect(reading.observations.join(" ")).toMatch(/plain backdrop/);
    expect(reading.concerns.join(" ")).not.toMatch(/Busy edges/);
  });

  it("raises busy edges as a concern", () => {
    const noisy = image([
      ["#c8322c", 0.2], ["#2f4a9c", 0.2], ["#f2e55c", 0.2],
      ["#33312c", 0.2], ["#2e7a63", 0.2],
    ]);
    expect(readColours(analyseImage(noisy)).concerns.join(" ")).toMatch(/Busy edges/);
  });

  it("raises too many colours as a concern", () => {
    const many = image([
      ["#c8322c", 0.15], ["#2f4a9c", 0.15], ["#f2e55c", 0.15], ["#2e7a63", 0.15],
      ["#5b3b78", 0.15], ["#6b432a", 0.15], ["#f0ece2", 0.1],
    ]);
    expect(readColours(analyseImage(many)).concerns.join(" ")).toMatch(/colours carry real area/);
  });

  it("raises a flat value range as a concern", () => {
    expect(readColours(analyseImage(image([["#8e9699", 1]]))).concerns.join(" ")).toMatch(
      /Narrow value range/,
    );
  });

  it("suggests pigments drawn from the image's own colours", () => {
    const reading = readColours(analyseImage(image([["#e2702c", 0.6], ["#2e7a63", 0.4]])));
    expect(reading.palette.length).toBeGreaterThan(0);
    expect(reading.palette.every((p) => /^#[0-9a-f]{6}$/.test(p.hex))).toBe(true);
  });

  it("always says something about temperature", () => {
    const reading = readColours(analyseImage(image([["#a89c8c", 1]])));
    expect(reading.observations.join(" ")).toMatch(/[Ww]arm|[Cc]ool|Balanced/);
  });
});

describe("the suggested fields", () => {
  const plain = analyseImage(subjectOnPlain("#e2702c", "#f0ece2"));
  const reading = readColours(plain);
  const fields = suggestFields(plain, reading, "fruit");

  it("offers three prompts and three tips to choose between", () => {
    expect(fields.prompts).toHaveLength(3);
    expect(fields.tips).toHaveLength(3);
  });

  it("never offers the same line twice in one list", () => {
    expect(new Set(fields.prompts).size).toBe(fields.prompts.length);
    expect(new Set(fields.tips).size).toBe(fields.tips.length);
  });

  it("names the subject the curator chose", () => {
    expect(suggestFields(plain, reading, "landscape").prompts.join(" ")).toMatch(/scene/);
    expect(suggestFields(plain, reading, "creatures").prompts.join(" ")).toMatch(/creature/);
  });

  it("leaves alt text as a scaffold with blanks, never a description", () => {
    /*
      The load-bearing test. Nothing here can see the subject, so a finished
      sentence would be a guess dressed up as a description - the exact thing
      the build's alt gate exists to catch. The blanks are what make the
      curator look at the image.
    */
    for (const scaffold of fields.altScaffolds) {
      expect(scaffold).toMatch(/\[.+\]/);
    }
  });

  it("names real pigments in the tip, taken from the image", () => {
    expect(fields.tips.join(" ").toLowerCase()).toContain(
      fields.palette[0]!.name.toLowerCase(),
    );
  });

  it("carries the observations and concerns through unchanged", () => {
    expect(fields.observations).toEqual(reading.observations);
    expect(fields.concerns).toEqual(reading.concerns);
  });
});

describe("the suggestions do not repeat themselves", () => {
  /*
    The defect this pool exists for. The suggester used to pick each line with
    a single if/else, so a whole curation session saw the same two prompts and
    the same two tips under candidate after candidate and stopped reading
    them. Seeded by the candidate's own id, two images that measure alike are
    still offered different true things to say.
  */
  const plain = analyseImage(subjectOnPlain("#e2702c", "#f0ece2"));
  const reading = readColours(plain);
  const ids = ["12561245", "12561230", "21575203", "21575207", "21273793", "27796657",
               "13032215", "17818760", "11213118", "37029833", "7561674", "3173141"];
  const runs = ids.map((id) => suggestFields(plain, reading, "botanical", id));

  it("offers more than a handful of distinct lines across a queue", () => {
    const prompts = new Set(runs.flatMap((r) => r.prompts));
    const tips = new Set(runs.flatMap((r) => r.tips));
    expect(prompts.size).toBeGreaterThan(4);
    expect(tips.size).toBeGreaterThan(4);
  });

  it("does not hand every candidate the same opening line", () => {
    expect(new Set(runs.map((r) => r.prompts[0])).size).toBeGreaterThan(1);
    expect(new Set(runs.map((r) => r.tips[0])).size).toBeGreaterThan(1);
  });

  it("gives the same candidate the same suggestions every time", () => {
    // Reopening the tool part-way through a queue must not reshuffle the
    // advice under a piece the curator was halfway through reading.
    expect(suggestFields(plain, reading, "botanical", "12561245").prompts).toEqual(
      suggestFields(plain, reading, "botanical", "12561245").prompts,
    );
    expect(suggestFields(plain, reading, "botanical", "12561245").tips).toEqual(
      suggestFields(plain, reading, "botanical", "12561245").tips,
    );
  });

  it("still names the chosen subject in its first prompt, whatever the seed", () => {
    for (const id of ids) {
      expect(suggestFields(plain, reading, "creatures", id).prompts[0]).toMatch(/creature/);
    }
  });

  it("still names a pigment from the image in its first tip, whatever the seed", () => {
    const first = reading.palette[0]!.name.toLowerCase();
    for (const id of ids) {
      expect(suggestFields(plain, reading, "fruit", id).tips[0]!.toLowerCase()).toContain(first);
    }
  });

  it("uses 'an' before a subject noun that starts with a vowel", () => {
    // Found proposing the first still-life batch: "A arrangement and almost
    // nothing else". Still life and objects are the two nouns it catches.
    for (const subject of ["still-life", "objects"] as const) {
      for (const id of ids) {
        for (const line of suggestFields(plain, reading, subject, id).prompts) {
          expect(line).not.toMatch(/\bA (arrangement|object)\b/);
        }
      }
    }
    const opening = ids
      .map((id) => suggestFields(plain, reading, "still-life", id).prompts[0])
      .find((line) => /^An arrangement/.test(line ?? ""));
    expect(opening).toBe("An arrangement and almost nothing else. A good one to start cold on.");
  });
});

describe("every suggestion is true of the image it is offered for", () => {
  /*
    Variety must not become invention. A line is only eligible when the
    measurement behind it holds, so advice for a contrasty image never appears
    under a flat one - which is also what keeps the suggestions agreeing with
    the "what the pixels say" panel beside them.
  */
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];

  function allLines(pixels: Pixels, subject: Parameters<typeof suggestFields>[2]) {
    const analysis = analyseImage(pixels);
    const reading = readColours(analysis);
    return ids
      .flatMap((id) => {
        const fields = suggestFields(analysis, reading, subject, id);
        return [...fields.prompts, ...fields.tips];
      })
      .join(" ");
  }

  it("does not tell a flat image to build a shadow side", () => {
    const flat = allLines(image([["#8e9699", 1]]), "objects");
    expect(flat).not.toMatch(/shadow side/);
    expect(flat).not.toMatch(/darkest dark/);
  });

  it("does not tell a contrasty image to stay in a narrow range of tones", () => {
    const contrasty = allLines(image([["#ffffff", 0.5], ["#141414", 0.5]]), "objects");
    expect(contrasty).not.toMatch(/narrow range of tones/);
    expect(contrasty).not.toMatch(/close in tone/);
  });

  it("does not tell an image with a busy border to leave the background alone", () => {
    const noisy = allLines(
      image([
        ["#c8322c", 0.2], ["#2f4a9c", 0.2], ["#f2e55c", 0.2],
        ["#33312c", 0.2], ["#2e7a63", 0.2],
      ]),
      "still-life",
    );
    expect(noisy).not.toMatch(/Leave the background alone/);
    expect(noisy).not.toMatch(/nothing behind this/i);
  });

  it("never leaves a gap where a pigment it does not have would go", () => {
    /*
      The failure mode of naming colours in a sentence: an image that yields
      one pigment must not be handed "drop the  into the still-wet burnt
      sienna". Every pigment-naming line states how many it needs.
    */
    for (const pixels of [
      image([["#e2702c", 1]]),
      image([["#e2702c", 0.6], ["#2e7a63", 0.4]]),
      subjectOnPlain("#e2702c", "#f0ece2"),
    ]) {
      const analysis = analyseImage(pixels);
      const reading = readColours(analysis);
      const named = reading.palette.map((p) => p.name.toLowerCase());
      for (const id of ids) {
        const fields = suggestFields(analysis, reading, "fruit", id);
        for (const line of [...fields.prompts, ...fields.tips]) {
          expect(line, `"${line}" has a gap where a pigment should be`).not.toMatch(/ {2}|\s[,.]/);
        }
        expect(named).toContain(
          named.find((name) => fields.tips[0]!.toLowerCase().includes(name)),
        );
      }
    }
  });

  it("says something even when no palette could be read", () => {
    const blank = analyseImage({ data: new Uint8ClampedArray(4 * 16), width: 4, height: 4 });
    const fields = suggestFields(blank, readColours(blank), "landscape", "x");
    expect(fields.prompts.length).toBeGreaterThan(0);
    expect(fields.tips.length).toBeGreaterThan(0);
    expect(fields.tips.every((t) => t.trim().length > 0)).toBe(true);
  });
});

describe("the suggested difficulty", () => {
  it("calls a simple subject on a plain ground gentle", () => {
    expect(difficultyFrom(analyseImage(subjectOnPlain("#e2702c", "#f0ece2")))).toBe("gentle");
  });

  it("calls a busy, many-coloured image a stretch", () => {
    const busy = image([
      ["#c8322c", 0.15], ["#2f4a9c", 0.15], ["#f2e55c", 0.15], ["#2e7a63", 0.15],
      ["#5b3b78", 0.15], ["#6b432a", 0.15], ["#f0ece2", 0.1],
    ]);
    expect(difficultyFrom(analyseImage(busy))).toBe("stretch");
  });

  it("gives minutes that match its own difficulty band", () => {
    const gentle = analyseImage(subjectOnPlain("#e2702c", "#f0ece2"));
    expect(difficultyFrom(gentle)).toBe("gentle");
    expect(minutesFrom(gentle)).toBeLessThan(10);
  });
});

describe("the learned vocabulary", () => {
  const at = "2026-09-20";

  it("extracts words and adjacent pairs, dropping filler", () => {
    const phrases = phrasesOf("A flat lay of the various citrus");
    expect(phrases).toContain("flat lay");
    expect(phrases).toContain("citrus");
    expect(phrases).not.toContain("the");
  });

  it("records a decision against every phrase in the text", () => {
    const v = record(EMPTY_VOCABULARY, "rejected", "c1", "flat lay of citrus", "Too busy", at);
    expect(v.phrases.find((p) => p.phrase === "flat lay")?.rejected).toBe(1);
    expect(v.notes[0]).toMatchObject({ decision: "rejected", reason: "Too busy" });
  });

  it("keeps the reason only when one was given", () => {
    expect(record(EMPTY_VOCABULARY, "approved", "c1", "a pear", "  ", at).notes).toEqual([]);
  });

  it("says nothing about a phrase it has barely seen", () => {
    let v = EMPTY_VOCABULARY;
    v = record(v, "rejected", "c1", "wooden board", "", at);
    v = record(v, "rejected", "c2", "wooden board", "", at);
    // Two observations is below the floor, so it must not start penalising yet.
    expect(learnedSignal(v, "wooden board").delta).toBe(0);
  });

  it("penalises a phrase the curator keeps setting aside", () => {
    let v = EMPTY_VOCABULARY;
    for (let i = 0; i < 4; i += 1) {
      v = record(v, "rejected", `c${i}`, "wooden board", "", at);
    }
    const signal = learnedSignal(v, "a wooden board");
    expect(signal.delta).toBeLessThan(0);
    expect(signal.concerns.join(" ")).toMatch(/set aside 4 of 4/);
  });

  it("promotes a phrase the curator keeps approving", () => {
    let v = EMPTY_VOCABULARY;
    for (let i = 0; i < 4; i += 1) {
      v = record(v, "approved", `c${i}`, "single pear", "", at);
    }
    const signal = learnedSignal(v, "a single pear");
    expect(signal.delta).toBeGreaterThan(0);
    expect(signal.reasons.join(" ")).toMatch(/approved 4 of 4/);
  });

  it("stays quiet about a phrase that goes both ways", () => {
    let v = EMPTY_VOCABULARY;
    v = record(v, "approved", "c1", "lemon", "", at);
    v = record(v, "approved", "c2", "lemon", "", at);
    v = record(v, "rejected", "c3", "lemon", "", at);
    v = record(v, "rejected", "c4", "lemon", "", at);
    expect(learnedSignal(v, "lemon").delta).toBe(0);
  });

  it("caps how far it can move a score", () => {
    // One strong opinion must not be able to override the hard rules.
    let v = EMPTY_VOCABULARY;
    const text = "alpha bravo charlie delta echo foxtrot";
    for (let i = 0; i < 6; i += 1) v = record(v, "rejected", `c${i}`, text, "", at);
    expect(learnedSignal(v, text).delta).toBe(-MAX_LEARNED_WEIGHT);
  });
});

describe("the vocabulary reaching the shortlist", () => {
  function candidate(over: Partial<Candidate> = {}): Candidate {
    return {
      sourceId: "pexels",
      externalId: "1",
      providerTitle: "A pear on a wooden board",
      providerAlt: "A pear on a wooden board",
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

  it("scores the same as before when nothing has been learned", () => {
    expect(assess(candidate()).score).toBe(assess(candidate(), EMPTY_VOCABULARY).score);
  });

  it("demotes a candidate whose phrasing keeps being set aside", () => {
    let v = EMPTY_VOCABULARY;
    for (let i = 0; i < 4; i += 1) {
      v = record(v, "rejected", `c${i}`, "wooden board", "Too busy", "2026-09-20");
    }
    const taught = assess(candidate(), v);
    expect(taught.score).toBeLessThan(assess(candidate()).score);
    expect(taught.concerns.join(" ")).toMatch(/set aside/);
  });

  it("never lets what it learned override a hard rule", () => {
    // A panorama stays out however many times its phrasing was approved.
    let v = EMPTY_VOCABULARY;
    for (let i = 0; i < 9; i += 1) {
      v = record(v, "approved", `c${i}`, "a pear on a wooden board", "", "2026-09-20");
    }
    const panorama = candidate({ intrinsicWidth: 6000, intrinsicHeight: 1200 });
    expect(assess(panorama, v).shortlisted).toBe(false);
  });
});

describe("the palette is the subject's, not the backdrop's", () => {
  /*
    From the first real run: a bowl of lemons on a pale tabletop suggested
    "Chinese White, Warm Grey" because the table outweighed the fruit by area.
    A painter is mixing for the subject, and white is the paper's job.
  */
  function subjectInPaleRoom(subjectHex: string, size = 40): Pixels {
    const data = new Uint8ClampedArray(size * size * 4);
    const subject = hexToRgb(subjectHex)!;
    const paper = hexToRgb("#f2efe9")!;
    const inset = Math.round(size * 0.25);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const middle = x >= inset && x < size - inset && y >= inset && y < size - inset;
        const rgb = middle ? subject : paper;
        const i = (y * size + x) * 4;
        data[i] = rgb.r;
        data[i + 1] = rgb.g;
        data[i + 2] = rgb.b;
        data[i + 3] = 255;
      }
    }
    return { data, width: size, height: size };
  }

  it("clusters the centre separately from the whole image", () => {
    const analysis = analyseImage(subjectInPaleRoom("#e2702c"));
    expect(analysis.centreClusters.length).toBeGreaterThan(0);
    // The backdrop dominates overall; the subject dominates the middle.
    expect(nearestPigment(analysis.clusters[0]!.rgb).pigment.family).toBe("neutral");
    expect(nearestPigment(analysis.centreClusters[0]!.rgb).pigment.family).not.toBe(
      "neutral",
    );
  });

  it("suggests the subject's pigment, not the tabletop's", () => {
    const reading = readColours(analyseImage(subjectInPaleRoom("#e2702c")));
    expect(reading.palette[0]?.name).not.toBe("Chinese White");
    expect(reading.palette.map((p) => p.name)).not.toContain("Chinese White");
  });

  it("recognises bare paper by lightness and lack of colour", () => {
    expect(readsAsPaper(hexToRgb("#f2efe9")!)).toBe(true);
    expect(readsAsPaper(hexToRgb("#ffffff")!)).toBe(true);
    expect(readsAsPaper(hexToRgb("#e2702c")!)).toBe(false);
    // A pale wash still carries colour, so it is a pigment, not paper.
    expect(readsAsPaper(hexToRgb("#f7e6b0")!)).toBe(false);
  });

  it("still suggests something for an image that is genuinely all pale", () => {
    // A high-key subject must not end up with an empty palette.
    const reading = readColours(analyseImage(image([["#f2efe9", 1]])));
    expect(reading.palette.length).toBeGreaterThan(0);
  });

  it("does not describe colour as white in the alt scaffold", () => {
    const analysis = analyseImage(subjectInPaleRoom("#e2702c"));
    const fields = suggestFields(analysis, readColours(analysis), "fruit");
    expect(fields.altScaffolds.join(" ").toLowerCase()).not.toContain("chinese white");
  });
});
