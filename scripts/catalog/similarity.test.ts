import { describe, it, expect } from "vitest";
import {
  DUPLICATE_DISTANCE,
  dedupe,
  dominantHue,
  findDuplicate,
  hammingDistance,
  hueDistance,
  perceptualHash,
} from "./similarity.ts";
import { hexToRgb } from "./pigments.ts";
import type { Pixels } from "./imageAnalysis.ts";

/** A gradient with a blob, so the hash has real structure to encode. */
function scene(offsetX = 0, brightness = 1, size = 32): Pixels {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const base = (x / size) * 180 + (y / size) * 40;
      const blob = Math.hypot(x - (size / 2 + offsetX), y - size / 2) < size / 5 ? 70 : 0;
      const v = Math.min(255, (base + blob) * brightness);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, width: size, height: size };
}

describe("the hash", () => {
  it("is 16 hex characters, so 64 bits", () => {
    expect(perceptualHash(scene())).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is the same for the same image", () => {
    expect(perceptualHash(scene())).toBe(perceptualHash(scene()));
  });

  it("survives a change of size, which is how the same photo differs between APIs", () => {
    expect(hammingDistance(perceptualHash(scene(0, 1, 32)), perceptualHash(scene(0, 1, 64))))
      .toBeLessThanOrEqual(DUPLICATE_DISTANCE);
  });

  it("survives a change of exposure", () => {
    // dHash encodes whether one cell is brighter than its neighbour, so
    // brightening the whole frame should not change it much.
    expect(hammingDistance(perceptualHash(scene(0, 1)), perceptualHash(scene(0, 0.8))))
      .toBeLessThanOrEqual(DUPLICATE_DISTANCE);
  });

  it("separates a genuinely different composition", () => {
    expect(hammingDistance(perceptualHash(scene(0)), perceptualHash(scene(10))))
      .toBeGreaterThan(0);
  });
});

describe("hammingDistance", () => {
  it("is zero for identical hashes", () => {
    expect(hammingDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  });

  it("counts every differing bit", () => {
    expect(hammingDistance("0000000000000000", "ffffffffffffffff")).toBe(64);
    expect(hammingDistance("0000000000000000", "0000000000000001")).toBe(1);
  });

  it("refuses to compare hashes of different lengths", () => {
    expect(hammingDistance("ffff", "ffffffffffffffff")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("hue", () => {
  it("reports a hue for a colour and nothing for a grey", () => {
    expect(dominantHue(hexToRgb("#c8322c")!)).not.toBeNull();
    expect(dominantHue(hexToRgb("#8e9699")!)).toBeNull();
  });

  it("measures the short way round the circle", () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
  });

  it("treats an unknown hue as maximally distant, so it cannot force a match", () => {
    expect(hueDistance(null, 10)).toBe(180);
  });
});

describe("findDuplicate", () => {
  const a = { id: "a", hash: "0000000000000000", hue: 30 };

  it("finds an identical image", () => {
    expect(findDuplicate(a, [{ id: "b", hash: "0000000000000000", hue: 30 }]))
      .toMatchObject({ id: "b", distance: 0 });
  });

  it("ignores something far away", () => {
    expect(findDuplicate(a, [{ id: "b", hash: "ffffffffffffffff", hue: 30 }])).toBeNull();
  });

  it("never matches an item against itself", () => {
    expect(findDuplicate(a, [a])).toBeNull();
  });

  it("returns the closest when several are near", () => {
    const found = findDuplicate(a, [
      { id: "far", hash: "0000000000000007", hue: 30 },
      { id: "near", hash: "0000000000000001", hue: 30 },
    ]);
    expect(found?.id).toBe("near");
  });

  it("lets hue veto a borderline structural match", () => {
    // Same layout, completely different palette: more often two photographs of
    // a similar arrangement than the same photograph.
    const borderline = { id: "b", hash: "000000000000001f", hue: 200 };
    expect(findDuplicate(a, [borderline])).toBeNull();
  });

  it("does not let hue veto a very close match", () => {
    expect(findDuplicate(a, [{ id: "b", hash: "0000000000000001", hue: 200 }]))
      .not.toBeNull();
  });
});

describe("dedupe", () => {
  const items = [
    { id: "first", hash: "0000000000000000", hue: 30 },
    { id: "copy", hash: "0000000000000001", hue: 30 },
    { id: "other", hash: "ffffffffffffffff", hue: 30 },
  ];

  it("keeps the first of a group and reports what it dropped", () => {
    const { kept, dropped } = dedupe(items);
    expect(kept.map((k) => k.id)).toEqual(["first", "other"]);
    expect(dropped[0]).toMatchObject({ duplicateOf: { id: "first" } });
  });

  it("drops anything already approved, so a harvest cannot reintroduce it", () => {
    const { kept } = dedupe(items, [{ id: "approved", hash: "0000000000000000", hue: 30 }]);
    expect(kept.map((k) => k.id)).toEqual(["other"]);
  });

  it("keeps everything when nothing is close", () => {
    const { kept, dropped } = dedupe([items[0]!, items[2]!]);
    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it("handles an empty harvest", () => {
    expect(dedupe([])).toEqual({ kept: [], dropped: [] });
  });
});
