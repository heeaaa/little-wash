import { describe, it, expect } from "vitest";
import { mulberry32, pickOne, pickDifferent } from "./shuffle";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("returns floats within [0, 1)", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 200; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("pickOne", () => {
  it("returns null for an empty list", () => {
    expect(pickOne([], mulberry32(1))).toBeNull();
  });

  it("selects a deterministic item for a seed", () => {
    const items = ["a", "b", "c", "d"];
    expect(pickOne(items, mulberry32(7))).toBe(pickOne(items, mulberry32(7)));
  });
});

describe("pickDifferent", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("never returns the excluded id when alternatives exist", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const chosen = pickDifferent(items, "a", mulberry32(seed));
      expect(chosen?.id).not.toBe("a");
    }
  });

  it("returns the only item even if it is excluded", () => {
    expect(pickDifferent([{ id: "solo" }], "solo", mulberry32(3))?.id).toBe("solo");
  });

  it("returns null for an empty list", () => {
    expect(pickDifferent([], null, mulberry32(1))).toBeNull();
  });
});
