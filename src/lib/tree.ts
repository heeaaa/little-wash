/**
 * The painted tree: one leaf for every piece someone has painted.
 *
 * This module is the drawing's geometry and nothing else. It takes a count and
 * returns a tree with exactly that many leaves; it knows nothing about pieces,
 * colours or dates, and that is deliberate. DESIGN.md's painted register says
 * nothing may read across the dates, so the shape of the tree cannot depend on
 * when anything was painted: time passing never changes it. Only painting
 * another piece does.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * How it grows
 * ─────────────────────────────────────────────────────────────────────────
 * A tree of branches, each forking into a leader that carries on nearly
 * straight and a lateral that turns off to alternating sides (Honda's model -
 * symmetric forks make a flat umbrella; a leader fills the crown). Every
 * branch's shape comes from a hash of its path from the trunk, so the tree is
 * the same on every device and every render.
 *
 * Leaves arrive level by level - the stem, then the first fork, then the next -
 * and within a level they alternate sides, so the tree stays balanced at every
 * count. A branch is drawn only once its first leaf exists, and grows longer
 * as the tree ages. Two things follow, and both are the brief:
 *
 * - **No targets.** Nothing is ever drawn waiting for a leaf: no bare twig, no
 *   empty place, no outline to colour in. A tree of three leaves is a complete
 *   seedling, not a big tree with three leaves on it.
 * - **Never punishing.** Adding a leaf never removes one, never moves one to
 *   another branch and never changes its shape. The tree only ever gets bigger.
 *
 * There is no last level. However many pieces are painted, there is room for
 * the next one.
 */

import { mulberry32 } from "./shuffle";

/** Degrees; 0 points right and -90 straight up, since SVG's y runs downward. */
type Degrees = number;

export interface Branch {
  /** The path from the trunk: "" is the trunk, then "0" leader, "1" lateral. */
  id: string;
  parent: string | null;
  depth: number;
  /** The count at which this branch first appears. */
  born: number;
  /** A quadratic curve from (x0, y0) through (cx, cy) to (x1, y1), in tree units. */
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  /** Width at the base and the tip. It thickens with every leaf it carries. */
  w0: number;
  w1: number;
}

export interface Leaf {
  /** Position in the order leaves arrive: 0 is the first piece painted. */
  index: number;
  /** The branch it grows on. */
  branch: string;
  /** Where its stem meets the branch. */
  x: number;
  y: number;
  /** The direction from stem to tip. */
  angle: Degrees;
  length: number;
  width: number;
  /** Asymmetry of the two sides, so no two leaves are the same shape. */
  lean: number;
}

export interface Tree {
  branches: Branch[];
  leaves: Leaf[];
}

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEG = Math.PI / 180;

/*
  The shape of the tree, tuned by eye against screenshots at every count from
  1 to 400 (see docs/plans/artistic-progress.md). They are constants rather
  than options because the tree is one drawing, not a family of them.
*/
const TRUNK = 58;
const LEAN = 4;
const LEADER_RATIO = 0.8;
const LATERAL_RATIO = 0.68;
const RATIO_JITTER = 0.14;
const LEADER_TURN = 12;
const LATERAL_TURN = [0, 44, 42, 40, 38, 36, 34, 32];
const TURN_JITTER = 12;
const LEADER_JITTER = 8;
const BEND = 0.3;
/** A new branch starts at this fraction of its grown length. */
const YOUTH = 0.38;
const LEAF_LENGTH = 15;
const LEAF_WIDTH = [0.44, 0.58] as const;
const SIDE_TURN = [44, 70] as const;
/** Where along the trunk its leaves sit: near the top, so they end up in the crown. */
const TRUNK_PLACES = [1, 0.9, 0.8];
const PLACES: Record<number, number[]> = { 3: [1, 0.76, 0.52], 4: [1, 0.8, 0.6, 0.4] };
const WIDTH_TIP = 0.9;
const WIDTH_PER_LEAF = 1.05;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function smoothstep(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** How many leaves a branch holds at each depth. */
function places(depth: number): number {
  return depth <= 2 ? 3 : 4;
}

/** Leaves it takes a branch to grow up, from the count it was born at. */
function growingTime(born: number): number {
  return Math.max(10, born * 1.1);
}

/** Everything about a branch that never changes as the tree grows. */
interface BranchGenes {
  id: string;
  parent: string | null;
  depth: number;
  angle: Degrees;
  length: number;
  bend: number;
  born: number;
}

interface LeafGenes {
  branch: string;
  at: number;
  turn: Degrees;
  length: number;
  width: number;
  lean: number;
}

function trunkGenes(): BranchGenes {
  const random = mulberry32(hash("trunk"));
  return {
    id: "",
    parent: null,
    depth: 0,
    angle: -90 + (random() - 0.5) * 2 * LEAN,
    length: TRUNK,
    bend: (random() - 0.5) * 0.16,
    born: 1,
  };
}

function childGenes(parent: BranchGenes, side: 0 | 1): BranchGenes {
  const id = parent.id + side;
  const random = mulberry32(hash(`branch:${id}`));
  const depth = parent.depth + 1;
  const leader = side === 0;
  // The lateral changes side level by level, with a seeded flip per branch so
  // the pattern never reads as a zigzag.
  const sign = (depth + (hash(`flip:${parent.id}`) & 1)) % 2 === 0 ? 1 : -1;
  const ratio =
    (leader ? LEADER_RATIO : LATERAL_RATIO) * (1 - RATIO_JITTER / 2 + RATIO_JITTER * random());
  const turn = leader
    ? -sign * (LEADER_TURN + LEADER_JITTER * (random() - 0.5))
    : sign * (LATERAL_TURN[Math.min(depth, LATERAL_TURN.length - 1)]! + TURN_JITTER * (random() - 0.5));
  let angle = parent.angle + turn;
  // A little pull towards the light, stronger near the trunk.
  angle += (-90 - angle) * (depth <= 2 ? 0.1 : 0.05);
  // Low branches climb; outer twigs may reach out and down a little, as a
  // round crown's do, but never straight down.
  angle = depth <= 2 ? clamp(angle, -160, -20) : clamp(angle, -200, 30);
  return {
    id,
    parent: parent.id,
    depth,
    angle,
    length: parent.length * ratio,
    bend: (random() - 0.5) * BEND,
    born: 0,
  };
}

function leafGenes(branch: BranchGenes, place: number): LeafGenes {
  const random = mulberry32(hash(`leaf:${branch.id}:${place}`));
  const flip = hash(`flip:${branch.id}`) & 1;
  const side = place === 0 ? 0 : (place + flip) % 2 === 0 ? -1 : 1;
  const turn =
    place === 0
      ? (random() - 0.5) * 26
      : side * (SIDE_TURN[0] + (SIDE_TURN[1] - SIDE_TURN[0]) * random());
  const length = LEAF_LENGTH * (0.88 + 0.26 * random()) * Math.pow(0.985, branch.depth);
  return {
    branch: branch.id,
    at: branch.depth === 0 ? TRUNK_PLACES[place]! : PLACES[places(branch.depth)]![place]!,
    turn,
    length,
    width: length * (LEAF_WIDTH[0] + (LEAF_WIDTH[1] - LEAF_WIDTH[0]) * random()),
    lean: (random() - 0.5) * 0.5,
  };
}

/** Reverse the lowest `bits` bits: 0b001 -> 0b100. */
function bitReverse(value: number, bits: number): number {
  let out = 0;
  for (let i = 0; i < bits; i += 1) out = (out << 1) | ((value >> i) & 1);
  return out;
}

/**
 * Which branches exist and which leaf goes where, for `count` leaves.
 *
 * Level by level. Within a level every branch gets its first leaf before any
 * gets a second, in bit-reversed order of its path, so consecutive leaves land
 * on opposite halves of the tree and it never grows lopsided.
 */
function plan(count: number): { genes: BranchGenes[]; leaves: LeafGenes[] } {
  const genes: BranchGenes[] = [];
  const leaves: LeafGenes[] = [];
  let level = [trunkGenes()];
  for (let depth = 0; leaves.length < count; depth += 1) {
    if (depth > 0) {
      level = level
        .flatMap((parent) => [childGenes(parent, 0), childGenes(parent, 1)])
        .sort(
          (a, b) => bitReverse(parseInt(a.id, 2), depth) - bitReverse(parseInt(b.id, 2), depth),
        );
    }
    for (let place = 0; place < places(depth) && leaves.length < count; place += 1) {
      for (const branch of level) {
        if (leaves.length >= count) break;
        if (place === 0) {
          branch.born = leaves.length + 1;
          genes.push(branch);
        }
        leaves.push(leafGenes(branch, place));
      }
    }
  }
  return { genes, leaves };
}

interface Curve {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
}

function pointOn(curve: Curve, t: number): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * curve.x0 + 2 * u * t * curve.cx + t * t * curve.x1,
    y: u * u * curve.y0 + 2 * u * t * curve.cy + t * t * curve.y1,
  };
}

function directionOn(curve: Curve, t: number): Degrees {
  const dx = 2 * (1 - t) * (curve.cx - curve.x0) + 2 * t * (curve.x1 - curve.cx);
  const dy = 2 * (1 - t) * (curve.cy - curve.y0) + 2 * t * (curve.y1 - curve.cy);
  return Math.atan2(dy, dx) / DEG;
}

function normalise(angle: Degrees): Degrees {
  let a = angle % 360;
  if (a <= -180) a += 360;
  if (a > 180) a -= 360;
  return a;
}

/**
 * The tree with exactly `count` leaves.
 *
 * Deterministic, and a function of the count alone: nothing about when
 * anything was painted can reach it.
 */
export function growTree(count: number): Tree {
  // A count that is not a real number of pieces draws nothing rather than
  // looping for ever on Infinity.
  const wanted = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (wanted === 0) return { branches: [], leaves: [] };

  const { genes, leaves: leafPlan } = plan(wanted);

  // Lay the branches out from the trunk upward; each starts where its parent ends.
  const curves = new Map<string, Curve>();
  for (const gene of genes) {
    const grown = smoothstep((wanted - gene.born) / growingTime(gene.born));
    const length = gene.length * (YOUTH + (1 - YOUTH) * grown);
    const parent = gene.parent === null ? undefined : curves.get(gene.parent);
    const x0 = parent?.x1 ?? 0;
    const y0 = parent?.y1 ?? 0;
    const ux = Math.cos(gene.angle * DEG);
    const uy = Math.sin(gene.angle * DEG);
    const x1 = x0 + ux * length;
    const y1 = y0 + uy * length;
    curves.set(gene.id, {
      x0,
      y0,
      x1,
      y1,
      cx: (x0 + x1) / 2 - uy * gene.bend * length,
      cy: (y0 + y1) / 2 + ux * gene.bend * length,
    });
  }

  const leaves = leafPlan.map((gene, index): Leaf => {
    const curve = curves.get(gene.branch)!;
    const stem = pointOn(curve, gene.at);
    let angle = normalise(directionOn(curve, gene.at) + gene.turn);
    // A leaf may hang out and down, but never straight down.
    if (angle > 62 && angle < 118) angle = -angle;
    return {
      index,
      branch: gene.branch,
      x: stem.x,
      y: stem.y,
      angle,
      length: gene.length,
      width: gene.width,
      lean: gene.lean,
    };
  });

  // The pipe model: a branch is as thick as the leaves it carries need.
  const carried = new Map<string, number>();
  for (const leaf of leaves) {
    for (let id = leaf.branch; ; id = id.slice(0, -1)) {
      carried.set(id, (carried.get(id) ?? 0) + 1);
      if (id === "") break;
    }
  }
  const baseWidth = (id: string) => WIDTH_TIP + WIDTH_PER_LEAF * Math.sqrt(carried.get(id) ?? 0);
  const branches = genes.map((gene): Branch => {
    const curve = curves.get(gene.id)!;
    const w0 = baseWidth(gene.id);
    const children = [`${gene.id}0`, `${gene.id}1`].filter((id) => curves.has(id));
    const w1 = children.length
      ? Math.max(...children.map(baseWidth))
      : Math.max(0.6, w0 * 0.42);
    return {
      id: gene.id,
      parent: gene.parent,
      depth: gene.depth,
      born: gene.born,
      ...curve,
      w0,
      w1: Math.min(w0, w1),
    };
  });

  return { branches, leaves };
}

/** The point at the far end of a leaf, for hit testing and bounds. */
export function leafTip(leaf: Leaf): { x: number; y: number } {
  return {
    x: leaf.x + Math.cos(leaf.angle * DEG) * leaf.length,
    y: leaf.y + Math.sin(leaf.angle * DEG) * leaf.length,
  };
}

/** The middle of a leaf, which is what a finger aims at. */
export function leafCentre(leaf: Leaf): { x: number; y: number } {
  return {
    x: leaf.x + Math.cos(leaf.angle * DEG) * leaf.length * 0.5,
    y: leaf.y + Math.sin(leaf.angle * DEG) * leaf.length * 0.5,
  };
}

/*
  ─────────────────────────────────────────────────────────────────────────
  The hand in the line.

  A drawn edge is never perfectly smooth. The unevenness is part of the
  geometry, seeded per leaf and per branch, rather than an SVG displacement
  filter: a filter over the whole drawing was re-rasterised on the CPU every
  time a leaf was chosen, and measured at 660-780ms a tap on a phone profile
  at 4x CPU throttle with 189 leaves. A path costs almost nothing to redraw.
  ─────────────────────────────────────────────────────────────────────────
*/

/** A small, smooth, repeatable wander in [-1, 1], one value per point. */
function tremor(seed: string, count: number): number[] {
  const random = mulberry32(hash(`tremor:${seed}`));
  const raw = Array.from({ length: count }, () => random() * 2 - 1);
  // Smoothed with its neighbours, so an edge wanders rather than jitters.
  return raw.map((v, i) => (raw[Math.max(0, i - 1)]! + 2 * v + raw[Math.min(count - 1, i + 1)]!) / 4);
}

type Point = [number, number];

function cubicAt(p: readonly Point[], t: number): Point {
  const u = 1 - t;
  const [a, b, c, d] = p as [Point, Point, Point, Point];
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

/** A smooth curve through the points, pointed at both ends (Catmull-Rom as cubics). */
function smoothThrough(points: readonly Point[]): string {
  const f = (v: number) => v.toFixed(2);
  let d = "";
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * A one-stroke leaf: the round brush pressed down and lifted, so it swells
 * from the stem and comes to a point. Drawn from (0, 0) along +x, to be placed
 * with a translate and a rotate so it can grow from its own stem. Each side
 * wanders a little, as a hand-painted edge does; the stem and the tip stay
 * sharp.
 */
export function leafOutline(leaf: Pick<Leaf, "index" | "length" | "width" | "lean">): string {
  const [upper, lower] = leafSides(leaf);
  return `M0 0${smoothThrough(upper)}${smoothThrough([...lower].reverse())}Z`;
}

/** Both sides of a leaf, stem to tip, in its own coordinates. */
function leafSides(leaf: Pick<Leaf, "index" | "length" | "width" | "lean">): [Point[], Point[]] {
  const l = leaf.length;
  const w = leaf.width / 2;
  const s = leaf.lean;
  const steps = 7;
  const amount = leaf.width * 0.045;
  const sides: Array<{ curve: Point[]; outward: 1 | -1 }> = [
    { curve: [[0, 0], [0.22 * l, -w * (1.05 + s)], [0.72 * l, -w * (1.1 + s)], [l, 0]], outward: -1 },
    { curve: [[0, 0], [0.22 * l, w * (1.05 - s)], [0.72 * l, w * (1.1 - s)], [l, 0]], outward: 1 },
  ];
  const [upper, lower] = sides.map(({ curve, outward }, side) => {
    const wander = tremor(`leaf:${leaf.index}:${side}`, steps + 1);
    return Array.from({ length: steps + 1 }, (_, k): Point => {
      const [x, y] = cubicAt(curve, k / steps);
      // The stem and the tip are where the brush lands and lifts: exact.
      const push = k === 0 || k === steps ? 0 : wander[k]! * amount;
      return [x, y + outward * push];
    });
  });
  return [upper!, lower!];
}

/** Local leaf coordinates to the tree's: rotate about the stem, then move to it. */
function placeOnTree(leaf: Leaf): (p: Point) => Point {
  const cos = Math.cos(leaf.angle * DEG);
  const sin = Math.sin(leaf.angle * DEG);
  return ([x, y]) => [leaf.x + x * cos - y * sin, leaf.y + x * sin + y * cos];
}

/**
 * The same leaf drawn where it grows, in the tree's own coordinates.
 *
 * The settled drawing uses this rather than one transformed group per leaf:
 * a full tree was ~1,250 elements, and on a throttled phone the browser spent
 * ~60ms hit testing and ~180ms painting them each time a leaf was chosen.
 */
export function leafInPlace(leaf: Leaf): string {
  const [upper, lower] = leafSides(leaf);
  const place = placeOnTree(leaf);
  const f = (v: number) => v.toFixed(2);
  return `M${f(leaf.x)} ${f(leaf.y)}${smoothThrough(upper.map(place))}${smoothThrough(
    [...lower].reverse().map(place),
  )}Z`;
}

/** A leaf's midrib, in the tree's coordinates: a faint line from near the stem. */
export function midribInPlace(leaf: Leaf): string {
  const place = placeOnTree(leaf);
  const [a, b] = [place([leaf.length * 0.08, 0]), place([leaf.length * 0.62, 0])];
  return `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
}

/** Where a branch joins its parent, rounded over as a brush lifting and landing does. */
export function branchKnuckle(branch: Branch): string {
  const r = branch.w0 / 2;
  const f = (v: number) => v.toFixed(2);
  return `M${f(branch.x0 - r)} ${f(branch.y0)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

/**
 * A branch as a filled brush stroke rather than a line: it tapers from base to
 * tip along its curve, the way a loaded brush lifts off the paper, and its
 * width wavers a little along the way.
 */
export function branchOutline(branch: Branch): string {
  const steps = 10;
  const leftWander = tremor(`branch:${branch.id}:left`, steps + 1);
  const rightWander = tremor(`branch:${branch.id}:right`, steps + 1);
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const p = pointOn(branch, t);
    const a = directionOn(branch, t) * DEG;
    const half = (branch.w0 + (branch.w1 - branch.w0) * t) / 2;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const l = half * (1 + 0.14 * leftWander[i]!);
    const r = half * (1 + 0.14 * rightWander[i]!);
    left.push(`${(p.x + nx * l).toFixed(2)} ${(p.y + ny * l).toFixed(2)}`);
    right.push(`${(p.x - nx * r).toFixed(2)} ${(p.y - ny * r).toFixed(2)}`);
  }
  return `M${[...left, ...right.reverse()].join("L")}Z`;
}

/** Everything the tree covers, including the ground it stands on. */
export function treeBounds(tree: Tree): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  const cover = (x: number, y: number, pad: number) => {
    minX = Math.min(minX, x - pad);
    maxX = Math.max(maxX, x + pad);
    minY = Math.min(minY, y - pad);
    maxY = Math.max(maxY, y + pad);
  };
  for (const b of tree.branches) {
    cover(b.x0, b.y0, b.w0 / 2);
    cover(b.x1, b.y1, b.w1 / 2);
    cover(b.cx, b.cy, 0);
  }
  for (const leaf of tree.leaves) {
    const tip = leafTip(leaf);
    cover(leaf.x, leaf.y, 1);
    cover(tip.x, tip.y, leaf.width / 2);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Where to look: the tree fitted to the drawing, standing on its ground.
 *
 * Always framed to the tree it is, never to one it might become - an empty
 * page around a small tree would be room still to fill, which is a target.
 * Centred on the trunk rather than on the crown, so the tree never slides
 * sideways as it grows. `minWidth` keeps a seedling from being blown up past
 * the size a leaf is meant to be seen at.
 */
export function frameTree(tree: Tree, aspect: number, minWidth = 84): Frame {
  const { minX, maxX, minY, maxY } = treeBounds(tree);
  let width = Math.max(Math.max(-minX, maxX) * 2 * 1.16, minWidth);
  let height = (maxY - minY) * 1.14 + 8;
  if (width / height < aspect) width = height * aspect;
  else height = width / aspect;
  // The ground sits a little above the bottom edge, with room for its shadow.
  const bottom = height * 0.07;
  return { x: -width / 2, y: bottom - height, width, height };
}
