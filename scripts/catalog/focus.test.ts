import { describe, it, expect } from "vitest";
import {
  SUBJECT_THRESHOLD,
  countRegions,
  estimateBackground,
  measureFocus,
  subjectMask,
} from "./focus.ts";
import { hexToRgb } from "./pigments.ts";
import type { Pixels } from "./imageAnalysis.ts";

const SIZE = 48;

function blank(hex: string, size = SIZE): Pixels {
  const rgb = hexToRgb(hex)!;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = rgb.r;
    data[i * 4 + 1] = rgb.g;
    data[i * 4 + 2] = rgb.b;
    data[i * 4 + 3] = 255;
  }
  return { data, width: size, height: size };
}

function paint(pixels: Pixels, hex: string, x0: number, y0: number, w: number, h: number) {
  const rgb = hexToRgb(hex)!;
  for (let y = y0; y < y0 + h && y < pixels.height; y += 1) {
    for (let x = x0; x < x0 + w && x < pixels.width; x += 1) {
      const i = (y * pixels.width + x) * 4;
      pixels.data[i] = rgb.r;
      pixels.data[i + 1] = rgb.g;
      pixels.data[i + 2] = rgb.b;
    }
  }
}

/** One clear subject, centred on a quiet backdrop. */
function oneSubject(size = SIZE): Pixels {
  const p = blank("#f2efe9", size);
  const side = Math.round(size * 0.45);
  paint(p, "#c8322c", Math.round((size - side) / 2), Math.round((size - side) / 2), side, side);
  return p;
}

/** A tableful: several things scattered across the frame. */
function scattered(size = SIZE): Pixels {
  const p = blank("#f2efe9", size);
  const side = Math.round(size * 0.12);
  for (const [x, y] of [
    [0.06, 0.08], [0.55, 0.1], [0.12, 0.6], [0.7, 0.62], [0.4, 0.35], [0.8, 0.3],
  ] as Array<[number, number]>) {
    paint(p, "#c8322c", Math.round(size * x), Math.round(size * y), side, side);
  }
  return p;
}

describe("estimating the background", () => {
  it("reads the backdrop off the border", () => {
    expect(estimateBackground(oneSubject())).toMatchObject({ r: 242, g: 239, b: 233 });
  });

  it("is not dragged by one object touching the edge", () => {
    // A median, not a mean: a dark thing in the corner is not the backdrop.
    const p = blank("#f2efe9");
    paint(p, "#000000", 0, 0, 6, 6);
    const background = estimateBackground(p);
    expect(background.r).toBeGreaterThan(200);
  });
});

describe("the subject mask", () => {
  it("marks the subject and not the backdrop", () => {
    const p = oneSubject();
    const mask = subjectMask(p);
    const centre = mask[Math.floor(SIZE / 2) * SIZE + Math.floor(SIZE / 2)];
    const corner = mask[0];
    expect(centre).toBe(true);
    expect(corner).toBe(false);
  });

  it("marks nothing in an entirely flat image", () => {
    expect(subjectMask(blank("#f2efe9")).some(Boolean)).toBe(false);
  });

  it("ignores a difference below the threshold", () => {
    // A barely-there tint is backdrop variation, not a subject.
    const p = blank("#f2efe9");
    paint(p, "#f0ede7", 10, 10, 20, 20);
    expect(SUBJECT_THRESHOLD).toBeGreaterThan(0);
    expect(subjectMask(p).filter(Boolean).length).toBe(0);
  });
});

describe("counting regions: 'there's no focus subject'", () => {
  it("counts one subject as one", () => {
    expect(countRegions(oneSubject(), subjectMask(oneSubject()))).toBe(1);
  });

  it("counts a tableful as several", () => {
    const p = scattered();
    expect(countRegions(p, subjectMask(p))).toBeGreaterThan(3);
  });

  it("keeps a subject with an attached part as one thing", () => {
    // A pear plus its stem is one subject, not two.
    const p = blank("#f2efe9");
    paint(p, "#c8322c", 16, 20, 18, 18);
    paint(p, "#6b432a", 23, 12, 3, 9);
    expect(countRegions(p, subjectMask(p))).toBe(1);
  });

  it("counts nothing in an empty frame", () => {
    const p = blank("#f2efe9");
    expect(countRegions(p, subjectMask(p))).toBe(0);
  });
});

describe("measureFocus", () => {
  it("reports the share of the frame the subject fills", () => {
    const focus = measureFocus(oneSubject());
    expect(focus.subjectArea).toBeGreaterThan(0.15);
    expect(focus.subjectArea).toBeLessThan(0.3);
  });

  it("calls a centred subject centred", () => {
    expect(measureFocus(oneSubject()).subjectCentrality).toBeLessThan(0.1);
  });

  it("notices a subject pushed into a corner", () => {
    const p = blank("#f2efe9");
    paint(p, "#c8322c", 2, 2, 10, 10);
    expect(measureFocus(p).subjectCentrality).toBeGreaterThan(0.4);
  });

  it("gives a flat image no subject at all", () => {
    const focus = measureFocus(blank("#f2efe9"));
    expect(focus.subjectArea).toBe(0);
    expect(focus.subjectCentrality).toBe(0);
    expect(focus.subjectRegions).toBe(0);
  });

  it("scores a hard-edged subject sharper than a soft-edged one", () => {
    const crisp = oneSubject();

    // The same subject with a graded edge, as a shallow depth of field gives.
    const soft = blank("#f2efe9");
    const centre = SIZE / 2;
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const d = Math.hypot(x - centre, y - centre);
        const t = Math.max(0, Math.min(1, (14 - d) / 10));
        const i = (y * SIZE + x) * 4;
        soft.data[i] = Math.round(242 + (200 - 242) * t);
        soft.data[i + 1] = Math.round(239 + (50 - 239) * t);
        soft.data[i + 2] = Math.round(233 + (44 - 233) * t);
      }
    }

    expect(measureFocus(crisp).subjectSharpness).toBeGreaterThan(
      measureFocus(soft).subjectSharpness,
    );
  });

  it("scores a fiddly image as carrying more detail than a plain one", () => {
    const busy = blank("#f2efe9");
    for (let y = 0; y < SIZE; y += 2) {
      for (let x = 0; x < SIZE; x += 2) paint(busy, "#33312c", x, y, 1, 1);
    }
    expect(measureFocus(busy).detailLoad).toBeGreaterThan(
      measureFocus(oneSubject()).detailLoad,
    );
  });

  it("is deterministic, so a harvest is reproducible", () => {
    expect(measureFocus(oneSubject())).toEqual(measureFocus(oneSubject()));
  });
});
