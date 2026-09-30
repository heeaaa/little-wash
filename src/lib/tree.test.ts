/**
 * The painted tree's geometry.
 *
 * Most of these are the brief rather than implementation detail. "Never
 * punishing" means painting another piece can only add to the tree; "no
 * targets" means nothing is ever drawn waiting to be filled. Both are
 * properties of every count, so they are checked across a range of counts
 * rather than at one or two hand-picked ones.
 */

import { describe, it, expect } from "vitest";
import {
  branchOutline,
  frameTree,
  growTree,
  leafCentre,
  leafOutline,
  leafTip,
  treeBounds,
  type Branch,
  type Tree,
} from "./tree";

/** Every count up to here is checked for the properties that must always hold. */
const RANGE = 250;

function counts(to = RANGE): number[] {
  return Array.from({ length: to }, (_, i) => i + 1);
}

function allNumbers(tree: Tree): number[] {
  return [
    ...tree.branches.flatMap((b) => [b.x0, b.y0, b.cx, b.cy, b.x1, b.y1, b.w0, b.w1]),
    ...tree.leaves.flatMap((l) => [l.x, l.y, l.angle, l.length, l.width, l.lean]),
  ];
}

/** Is p inside the triangle abc, give or take a hair? A quadratic curve never leaves it. */
function inTriangle(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): boolean {
  const cross = (o: typeof a, u: typeof a, v: typeof a) =>
    (u.x - o.x) * (v.y - o.y) - (u.y - o.y) * (v.x - o.x);
  const d1 = cross(a, b, p);
  const d2 = cross(b, c, p);
  const d3 = cross(c, a, p);
  const eps = 1e-6;
  const hasNeg = d1 < -eps || d2 < -eps || d3 < -eps;
  const hasPos = d1 > eps || d2 > eps || d3 > eps;
  return !(hasNeg && hasPos);
}

function endpoints(branch: Branch) {
  return {
    start: { x: branch.x0, y: branch.y0 },
    control: { x: branch.cx, y: branch.cy },
    end: { x: branch.x1, y: branch.y1 },
  };
}

describe("growTree", () => {
  it("draws nothing for nothing painted", () => {
    expect(growTree(0)).toEqual({ branches: [], leaves: [] });
  });

  it("draws nothing rather than failing for a count that is not a number of pieces", () => {
    // Infinity would otherwise never stop growing.
    for (const odd of [-3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(growTree(odd)).toEqual({ branches: [], leaves: [] });
    }
  });

  it("grows exactly one leaf per piece", () => {
    for (const n of [...counts(), 300, 401]) {
      expect(growTree(n).leaves).toHaveLength(n);
    }
  });

  it("numbers the leaves in the order they arrive", () => {
    expect(growTree(40).leaves.map((leaf) => leaf.index)).toEqual(
      Array.from({ length: 40 }, (_, i) => i),
    );
  });

  it("is the same tree every time, on every device", () => {
    expect(growTree(120)).toEqual(growTree(120));
  });

  it("has no last leaf: there is always room for the next one", () => {
    const big = growTree(1000);
    expect(big.leaves).toHaveLength(1000);
    expect(allNumbers(big).every(Number.isFinite)).toBe(true);
  });

  it("produces only real numbers", () => {
    for (const n of counts()) {
      expect(allNumbers(growTree(n)).every(Number.isFinite)).toBe(true);
    }
  });
});

describe("never punishing: painting another piece only ever adds", () => {
  it("keeps every leaf on its branch, the same shape, when another arrives", () => {
    for (const n of counts()) {
      const before = growTree(n).leaves;
      const after = growTree(n + 1).leaves;
      before.forEach((leaf, i) => {
        const same = after[i]!;
        expect(same.branch).toBe(leaf.branch);
        expect(same.length).toBe(leaf.length);
        expect(same.width).toBe(leaf.width);
        expect(same.lean).toBe(leaf.lean);
      });
    }
  });

  it("keeps every branch it had", () => {
    for (const n of counts()) {
      const after = new Map(growTree(n + 1).branches.map((b) => [b.id, b]));
      for (const branch of growTree(n).branches) {
        const same = after.get(branch.id);
        expect(same, `branch "${branch.id}" lost at ${n + 1}`).toBeDefined();
        expect(same!.parent).toBe(branch.parent);
        expect(same!.born).toBe(branch.born);
      }
    }
  });

  it("never jumps: a leaf moves only a little as its branch grows", () => {
    // Measured 01/10/2026: the most any leaf moves from one count to the next
    // is 7.06% of the drawing's width, at 7 leaves, while the young trunk is
    // growing fastest. A leaf that jumped would read as a different tree.
    for (const n of counts()) {
      const before = growTree(n);
      const after = growTree(n + 1);
      const width = frameTree(before, 5 / 4).width;
      before.leaves.forEach((leaf, i) => {
        const moved = Math.hypot(after.leaves[i]!.x - leaf.x, after.leaves[i]!.y - leaf.y);
        expect(moved / width).toBeLessThan(0.08);
      });
    }
  });

  it("never gets smaller", () => {
    let previous = frameTree(growTree(1), 5 / 4);
    for (const n of counts().slice(1)) {
      const frame = frameTree(growTree(n), 5 / 4);
      expect(frame.width).toBeGreaterThanOrEqual(previous.width);
      expect(frame.height).toBeGreaterThanOrEqual(previous.height);
      previous = frame;
    }
  });
});

describe("no targets: nothing is drawn waiting to be filled", () => {
  it("draws a branch only once a leaf grows on it", () => {
    for (const n of counts()) {
      const tree = growTree(n);
      const holding = new Set(tree.leaves.map((leaf) => leaf.branch));
      for (const branch of tree.branches) {
        expect(holding.has(branch.id), `bare branch "${branch.id}" at ${n}`).toBe(true);
      }
    }
  });

  it("starts as a single stem with a single leaf", () => {
    const seedling = growTree(1);
    expect(seedling.branches.map((b) => b.id)).toEqual([""]);
    expect(seedling.leaves).toHaveLength(1);
  });

  it("frames the tree it is, not the one it might become", () => {
    // A seedling fills its drawing rather than sitting small on an empty page.
    const seedling = frameTree(growTree(1), 5 / 4);
    const grown = frameTree(growTree(189), 5 / 4);
    expect(seedling.width).toBeLessThan(grown.width / 2);
  });
});

describe("a tree that holds together", () => {
  it("starts every branch where its parent ends", () => {
    for (const n of [5, 21, 54, 189]) {
      const tree = growTree(n);
      const byId = new Map(tree.branches.map((b) => [b.id, b]));
      for (const branch of tree.branches) {
        if (branch.parent === null) {
          expect([branch.x0, branch.y0]).toEqual([0, 0]);
          continue;
        }
        const parent = byId.get(branch.parent)!;
        expect(parent, `orphan branch "${branch.id}"`).toBeDefined();
        expect(branch.x0).toBeCloseTo(parent.x1, 9);
        expect(branch.y0).toBeCloseTo(parent.y1, 9);
      }
    }
  });

  it("grows every leaf from a point on its own branch", () => {
    for (const n of [3, 21, 120, 250]) {
      const tree = growTree(n);
      const byId = new Map(tree.branches.map((b) => [b.id, b]));
      for (const leaf of tree.leaves) {
        const { start, control, end } = endpoints(byId.get(leaf.branch)!);
        expect(inTriangle(leaf, start, control, end), `leaf ${leaf.index} off its branch`).toBe(
          true,
        );
      }
    }
  });

  it("thickens towards the trunk, as a branch carries more", () => {
    const tree = growTree(189);
    const byId = new Map(tree.branches.map((b) => [b.id, b]));
    for (const branch of tree.branches) {
      expect(branch.w1).toBeLessThanOrEqual(branch.w0);
      if (branch.parent !== null) {
        expect(branch.w0).toBeLessThanOrEqual(byId.get(branch.parent)!.w0);
      }
    }
    expect(byId.get("")!.w0).toBeGreaterThan(growTree(1).branches[0]!.w0 * 4);
  });

  it("stands on the ground: no leaf reaches below it", () => {
    // Measured: the lowest point of any leaf, at any count to 400, is 20.6
    // units above the ground line at y = 0.
    for (const n of counts()) {
      for (const leaf of growTree(n).leaves) {
        expect(leaf.y).toBeLessThan(0);
        expect(leafTip(leaf).y).toBeLessThan(0);
      }
    }
  });

  it("stays balanced at every count: the two halves never differ by more than a leaf", () => {
    // Consecutive leaves land on opposite halves, so the tree never grows
    // lopsided while a level fills - not just once it is full.
    for (const n of counts()) {
      const leaves = growTree(n).leaves;
      const leader = leaves.filter((leaf) => leaf.branch.startsWith("0")).length;
      const lateral = leaves.filter((leaf) => leaf.branch.startsWith("1")).length;
      expect(Math.abs(leader - lateral), `lopsided at ${n}`).toBeLessThanOrEqual(1);
    }
  });
});

describe("frameTree", () => {
  it("keeps the drawing's shape", () => {
    for (const n of [1, 12, 189]) {
      const frame = frameTree(growTree(n), 5 / 4);
      expect(frame.width / frame.height).toBeCloseTo(5 / 4, 9);
    }
  });

  it("holds all of the tree", () => {
    for (const n of [1, 7, 54, 189, 250]) {
      const tree = growTree(n);
      const frame = frameTree(tree, 5 / 4);
      const { minX, maxX, minY, maxY } = treeBounds(tree);
      expect(minX).toBeGreaterThanOrEqual(frame.x);
      expect(maxX).toBeLessThanOrEqual(frame.x + frame.width);
      expect(minY).toBeGreaterThanOrEqual(frame.y);
      expect(maxY).toBeLessThanOrEqual(frame.y + frame.height);
    }
  });

  it("stays centred on the trunk, so the tree never slides sideways as it grows", () => {
    for (const n of [1, 30, 189]) {
      const frame = frameTree(growTree(n), 5 / 4);
      expect(frame.x + frame.width / 2).toBeCloseTo(0, 9);
    }
  });

  it("does not blow a seedling up past a sensible size", () => {
    expect(frameTree(growTree(1), 5 / 4).width).toBe(84);
    expect(frameTree(growTree(1), 5 / 4, 112).width).toBe(112);
  });
});

describe("outlines", () => {
  it("draws a leaf as one closed stroke from its stem", () => {
    const [leaf] = growTree(1).leaves;
    const d = leafOutline(leaf!);
    // Starts exactly at the stem - "M0 0", not "M0 0.4" - and closes there.
    expect(d).toMatch(/^M0 0(?![\d.])/);
    expect(d.endsWith("0.00 0.00Z")).toBe(true);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it("gives every leaf an edge of its own, the same every time", () => {
    const [a, b] = growTree(2).leaves;
    expect(leafOutline(a!)).not.toBe(leafOutline({ ...b!, length: a!.length, width: a!.width, lean: a!.lean }));
    expect(leafOutline(a!)).toBe(leafOutline(growTree(2).leaves[0]!));
  });

  it("draws a branch as a closed, tapering shape", () => {
    for (const branch of growTree(21).branches) {
      const d = branchOutline(branch);
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity/);
    }
  });

  it("puts a leaf's centre halfway to its tip", () => {
    const [leaf] = growTree(1).leaves;
    const tip = leafTip(leaf!);
    const centre = leafCentre(leaf!);
    expect(centre.x).toBeCloseTo((leaf!.x + tip.x) / 2, 9);
    expect(centre.y).toBeCloseTo((leaf!.y + tip.y) / 2, 9);
  });
});
