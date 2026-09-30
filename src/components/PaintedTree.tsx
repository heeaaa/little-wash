import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useLocation } from "react-router-dom";
import { pigment, type PaintReference } from "@/lib/types";
import {
  branchKnuckle,
  branchOutline,
  frameTree,
  growTree,
  leafCentre,
  leafInPlace,
  leafOutline,
  leafTip,
  midribInPlace,
  type Branch,
  type Leaf,
  type Tree,
} from "@/lib/tree";
import { leafPigments, pooled, washStrength } from "@/lib/leafColour";
import { leavesToArrive, loadSeenLeaves, persistSeenLeaves } from "@/lib/leavesSeen";
import { claimArtwork, prefersReducedMotion } from "@/lib/wash";
import { Icon } from "@/components/Icon";
import { PaintedNote, paintedOn } from "@/components/PaintedNote";
import { RefArt } from "@/components/RefArt";
import { WashLink } from "@/components/WashLink";

export interface PaintedPiece {
  reference: PaintReference;
  /** The day it was marked painted, "YYYY-MM-DD". */
  on: string;
}

interface PaintedTreeProps {
  /** Everything painted, oldest first: the order the leaves grew in. */
  pieces: PaintedPiece[];
}

/** The drawing's shape. The tree is framed to fit it at every size. */
const ASPECT = 5 / 4;
/** How far from a leaf, in CSS pixels, a tap still chooses it - a wet finger's reach. */
const REACH = 32;
/*
  The arrival is composed from the motion scale in DESIGN.md rather than
  given durations of its own: a twig grows in a move (380ms), the leaf is
  pressed in and then dries in a wash each (520ms). These are the offsets
  between those steps.
*/
const STAGGER = 420;
const TWIG_FIRST = 300;
const DRY_AFTER = 300;
const WASH = 520;

interface Paint {
  /** A colour, or a gradient reference when a second pigment is charged in. */
  body: string;
  strength: number;
  rim: string;
  /** The wet paint, a little deeper than it dries - watercolour dries lighter. */
  wet: string;
  lead: string | null;
  charge: string | null;
  gradient: { id: string; from: string; to: string } | null;
}

/**
 * A leaf's paint, from its piece's own palette (see leafColour.ts). A piece
 * with no palette takes its subject's pigment, which is the design system's
 * colour for it rather than an invented one.
 */
function paintFor(reference: PaintReference, uid: string): Paint {
  const pigments = leafPigments(reference.palette);
  if (!pigments) {
    const colour = pigment(reference.subject);
    return { body: colour, strength: 0.8, rim: colour, wet: colour, lead: null, charge: null, gradient: null };
  }
  const { lead, charge } = pigments;
  const gradient = charge
    ? { id: `${uid}-${lead.hex.slice(1)}-${charge.hex.slice(1)}`, from: lead.hex, to: charge.hex }
    : null;
  return {
    body: gradient ? `url(#${gradient.id})` : lead.hex,
    strength: washStrength(lead.hex),
    rim: pooled(lead.hex),
    wet: pooled(lead.hex, 0.18),
    lead: lead.name,
    charge: charge?.name ?? null,
    gradient,
  };
}

/** Where the arrival stands. Pending ids are the leaves still to grow in front of you. */
type Phase =
  | { kind: "still" }
  | { kind: "waiting"; pending: string[] }
  | { kind: "arriving"; pending: string[] };

interface Timing {
  /** When the leaf is pressed in, and when it starts to dry. */
  press: number;
  dry: number;
  /** The twig it brings with it, if it is the first leaf on a new one. */
  twig: string | null;
  twigAt: number;
}

/**
 * The pale wash laid under a branch before the ink: a narrow margin, capped,
 * rather than a multiple of its width - on a thick trunk a multiple became a
 * ghost of it, and on a seedling's stem a fixed margin read as a shadow.
 */
function washOf(branch: Branch): Branch {
  const margin = (w: number) => w + Math.min(2.6, w * 0.8);
  return { ...branch, w0: margin(branch.w0), w1: margin(branch.w1) };
}

/** When each arriving leaf and each twig it brings starts, and when it is all dry. */
function schedule(
  pending: readonly string[],
  indexOf: ReadonlyMap<string, number>,
  leaves: readonly Leaf[],
  branches: ReadonlyMap<string, Branch>,
): { timings: Map<number, Timing>; twigs: Map<string, number>; end: number } {
  const timings = new Map<number, Timing>();
  const twigs = new Map<string, number>();
  let end = 0;
  pending.forEach((id, k) => {
    const index = indexOf.get(id);
    if (index === undefined) return;
    const leaf = leaves[index]!;
    const at = k * STAGGER;
    // Compared with null, not tested for truth: the trunk's id is "".
    const newTwig = branches.get(leaf.branch)?.born === index + 1 ? leaf.branch : null;
    const press = at + (newTwig !== null ? TWIG_FIRST : 0);
    if (newTwig !== null) twigs.set(newTwig, at);
    timings.set(index, { press, dry: press + DRY_AFTER, twig: newTwig, twigAt: at });
    end = Math.max(end, press + DRY_AFTER + WASH);
  });
  return { timings, twigs, end };
}

function place(leaf: Leaf): string {
  return `translate(${leaf.x.toFixed(2)} ${leaf.y.toFixed(2)}) rotate(${leaf.angle.toFixed(1)})`;
}

/**
 * One leaf's paint: the wash, the pigment pooled at its edge, and a faint
 * midrib. An arriving leaf also carries the wet tone and the shine that go off
 * as it dries; at rest both are invisible, so a leaf whose animation never runs
 * is simply dry.
 */
function LeafShape({ leaf, paint, sheen }: { leaf: Leaf; paint: Paint; sheen?: string }) {
  const d = leafOutline(leaf);
  return (
    <>
      <path d={d} style={{ fill: paint.body, fillOpacity: paint.strength }} />
      {sheen ? <path className="leaf-wet" d={d} style={{ fill: paint.wet }} /> : null}
      <path
        className="leaf-rim"
        d={d}
        fill="none"
        style={{ stroke: paint.rim }}
        strokeOpacity={0.5}
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M${(leaf.length * 0.08).toFixed(2)} 0L${(leaf.length * 0.62).toFixed(2)} 0`}
        style={{ stroke: paint.rim }}
        strokeOpacity={0.5}
        strokeWidth={0.8}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {sheen ? (
        <ellipse
          className="leaf-sheen"
          cx={leaf.length * 0.42}
          cy={-leaf.width * 0.14}
          rx={leaf.length * 0.24}
          ry={leaf.width * 0.13}
          style={{ fill: `url(#${sheen})` }}
        />
      ) : null}
    </>
  );
}

/**
 * The settled drawing, in as few elements as it can be: every branch's wash in
 * one path and its ink in another, and each leaf one path in the tree's own
 * coordinates - its body, its pooled rim and its midrib together.
 *
 * Built that way because the cost of a full tree is the element count. As
 * ~1,250 elements (a group and three paths a leaf, four a branch), choosing a
 * leaf on a phone profile at 4x CPU throttle spent ~60ms in hit testing and
 * ~180ms painting; as ~190 it is a fraction of that. Memoised, so it redraws
 * only when the chosen leaf, or what is still arriving, changes.
 */
const SettledDrawing = memo(function SettledDrawing({
  tree,
  paints,
  uid,
  unit,
  hidden,
  growing,
  twigs,
}: {
  tree: Tree;
  paints: readonly Paint[];
  uid: string;
  /** Tree units per CSS pixel, so a rim stays the same fine line whatever the size. */
  unit: number;
  hidden: number | null;
  growing: ReadonlySet<number>;
  twigs: ReadonlySet<string>;
}) {
  // The shapes depend on the tree alone; choosing a leaf only changes which is hidden.
  const { wash, bark } = useMemo(() => {
    const settled = tree.branches.filter((branch) => !twigs.has(branch.id));
    return {
      wash: settled.map((branch) => branchOutline(washOf(branch))).join(""),
      bark: settled.map((branch) => branchOutline(branch) + branchKnuckle(branch)).join(""),
    };
  }, [tree, twigs]);
  const shapes = useMemo(
    () => tree.leaves.map((leaf) => leafInPlace(leaf) + midribInPlace(leaf)),
    [tree],
  );
  return (
    <g>
      <defs>
        {/*
          A leaf's charge runs from its stem to its tip. Drawn in the tree's
          coordinates, a leaf needs its own gradient along its own axis.
        */}
        {tree.leaves.map((leaf, index) => {
          const paint = paints[index]!;
          if (!paint.gradient || growing.has(index)) return null;
          const tip = leafTip(leaf);
          return (
            <linearGradient
              key={index}
              id={`${uid}-g${index}`}
              gradientUnits="userSpaceOnUse"
              x1={leaf.x}
              y1={leaf.y}
              x2={tip.x}
              y2={tip.y}
            >
              <stop offset="0.55" style={{ stopColor: paint.gradient.from }} />
              <stop offset="1" style={{ stopColor: paint.gradient.to }} />
            </linearGradient>
          );
        })}
      </defs>
      <path className="tree-bark-wash" d={wash} />
      <path className="tree-bark" d={bark} />
      {/*
        The rim's width is set once here, in tree units worked out from the
        drawing's size, rather than as a non-scaling stroke on every leaf:
        Chrome transforms each non-scaling path to find its bounds, which
        doubled the cost of hit testing a full tree (measured 55-76ms a move
        at 4x throttle, 26-32ms without).
      */}
      <g strokeWidth={0.8 * unit} strokeOpacity={0.5} strokeLinecap="round">
        {shapes.map((shape, index) => {
          if (growing.has(index)) return null;
          const paint = paints[index]!;
          return (
            <path
              key={index}
              d={shape}
              visibility={index === hidden ? "hidden" : undefined}
              style={{
                fill: paint.gradient ? `url(#${uid}-g${index})` : paint.body,
                fillOpacity: paint.strength,
                stroke: paint.rim,
              }}
            />
          );
        })}
      </g>
    </g>
  );
});

/** A branch: a pale wash laid down first, then the ink over it. */
const BranchMark = memo(function BranchMark({ branch }: { branch: Branch }) {
  return (
    <g>
      <path className="tree-bark-wash" d={branchOutline(washOf(branch))} />
      <path className="tree-bark" d={branchOutline(branch)} />
      <circle className="tree-bark" cx={branch.x0} cy={branch.y0} r={branch.w0 / 2} />
    </g>
  );
});

/**
 * The painted tree: a leaf for every piece someone has marked painted, washed
 * in that piece's own colours.
 *
 * DESIGN.md, "The painted tree", holds the rules; the ones that shape this
 * component are that it is a record and not a scoreboard - no number, no end,
 * nothing waiting to be filled - and that a new leaf arrives once, in front of
 * you, the way watercolour does: the twig reaches out, the brush presses the
 * leaf in, and it dries lighter with the pigment settling at its edge.
 *
 * It is one listbox. A tap chooses the nearest leaf within a finger's reach,
 * the arrow keys step through them in the order they grew, and the leaf card
 * beside the drawing says which piece a leaf is and opens it.
 */
export function PaintedTree({ pieces }: PaintedTreeProps) {
  const uid = `tree${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { pathname, search } = useLocation();

  const count = pieces.length;
  const ids = useMemo(() => pieces.map((piece) => piece.reference.id), [pieces]);
  const tree = useMemo(() => growTree(count), [count]);
  const frame = useMemo(() => frameTree(tree, ASPECT), [tree]);
  const branchById = useMemo(() => new Map(tree.branches.map((b) => [b.id, b])), [tree]);
  const paints = useMemo(() => pieces.map((piece) => paintFor(piece.reference, uid)), [pieces, uid]);
  // What a screen reader hears for each leaf: made once per record, not per tap.
  const names = useMemo(
    () =>
      pieces.map(({ reference, on }, index) => {
        const colour = paints[index]!.lead;
        return colour
          ? `${reference.title}, in ${colour}, painted ${paintedOn(on)}`
          : `${reference.title}, painted ${paintedOn(on)}`;
      }),
    [pieces, paints],
  );
  const gradients = useMemo(() => {
    const unique = new Map<string, NonNullable<Paint["gradient"]>>();
    for (const paint of paints) if (paint.gradient) unique.set(paint.gradient.id, paint.gradient);
    return [...unique.values()];
  }, [paints]);

  /*
    What arrives is decided once, when the tree is first drawn: the leaves not
    yet seen, the newest few at most. Under reduced motion nothing arrives -
    every leaf is simply there, dry.
  */
  const [phase, setPhase] = useState<Phase>(() => {
    const pending = prefersReducedMotion() ? [] : leavesToArrive(ids, loadSeenLeaves());
    return pending.length === 0 ? { kind: "still" } : { kind: "waiting", pending };
  });

  /*
    The record of seen leaves catches up only when the phase changes - on
    being drawn with nothing to arrive, and when an arrival starts - never
    mid-visit. A piece painted while the tree is on screen is then still new
    next time, and arrives, rather than being quietly marked as seen.
  */
  const latestIds = useRef(ids);
  useEffect(() => {
    latestIds.current = ids;
  });
  useEffect(() => {
    if (phase.kind === "still") persistSeenLeaves(latestIds.current);
  }, [phase.kind]);

  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const art = useRef<HTMLDivElement>(null);

  /*
    Waiting for the tree to be looked at. A leaf that grew while the drawing
    was below the fold would be a leaf nobody saw arrive, so the arrival starts
    only once at least half the drawing is on screen. It is recorded as seen at
    the start, so leaving part-way never replays it.
  */
  useEffect(() => {
    if (phase.kind !== "waiting") return;
    const begin = () => {
      persistSeenLeaves(latestIds.current);
      setPhase({ kind: "arriving", pending: phase.pending });
    };
    const element = stage.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      begin();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
          observer.disconnect();
          begin();
        }
      },
      { threshold: [0.5] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [phase]);

  const indexOf = useMemo(() => new Map(ids.map((id, i) => [id, i])), [ids]);
  const plan = useMemo(
    () =>
      phase.kind === "still"
        ? null
        : schedule(phase.pending, indexOf, tree.leaves, branchById),
    [phase, indexOf, tree, branchById],
  );

  // Stable between taps, so the settled drawing is only redrawn when they change.
  const growingLeaves = useMemo(() => new Set(plan?.timings.keys() ?? []), [plan]);
  const growingTwigIds = useMemo(() => new Set(plan?.twigs.keys() ?? []), [plan]);

  // Once the last leaf has dried it joins the rest of the drawing.
  const arrivalEnds = plan?.end ?? 0;
  useEffect(() => {
    if (phase.kind !== "arriving") return;
    const timer = setTimeout(() => setPhase({ kind: "still" }), arrivalEnds + 60);
    return () => clearTimeout(timer);
  }, [phase.kind, arrivalEnds]);

  /*
    The chosen leaf, held by its piece rather than its place, so it stays the
    same piece if the list around it changes. The newest by default: the thing
    you most recently did, as the studio's lists put it first.
  */
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [stir, setStir] = useState<{ id: string; n: number } | null>(null);
  // Said aloud when Previous or Next changes the leaf; the listbox speaks for itself.
  const [said, setSaid] = useState("");
  const safeChosen = (chosenId === null ? undefined : indexOf.get(chosenId)) ?? count - 1;

  const choose = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), count - 1);
      const id = ids[next];
      if (id === undefined) return;
      setChosenId(id);
      /*
        A leaf stirs only when it is touched and can be seen to: never under
        reduced motion, and never one still arriving - that one would stir
        later, untouched, when it settled.
      */
      setStir((previous) =>
        prefersReducedMotion() || growingLeaves.has(next)
          ? null
          : { id, n: (previous?.n ?? 0) + 1 },
      );
    },
    [count, ids, growingLeaves],
  );

  /**
   * The leaf under a pointer, or the nearest within a finger's reach.
   *
   * Measured to the leaf's own shape - a band along its axis, widest in the
   * middle and pointed at both ends - not to its centre: on a desktop a young
   * tree's leaves are ~100px long, and a tap near the tip of one was out of
   * reach of its centre. Where leaves overlap, the one drawn on top wins, and
   * the chosen leaf is drawn over them all.
   */
  const leafAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const m = svg.current?.getScreenCTM?.();
      if (!m) return null;
      const toScreen = (p: { x: number; y: number }) => ({
        x: m.a * p.x + m.c * p.y + m.e,
        y: m.b * p.x + m.d * p.y + m.f,
      });
      const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
      let onTop: number | null = null;
      let onChosen = false;
      let nearest: number | null = null;
      let nearestGap = REACH;
      for (const leaf of tree.leaves) {
        if (growingLeaves.has(leaf.index)) continue;
        const stem = toScreen(leaf);
        const tip = toScreen(leafTip(leaf));
        const [dx, dy] = [tip.x - stem.x, tip.y - stem.y];
        const along = Math.max(
          0,
          Math.min(1, ((clientX - stem.x) * dx + (clientY - stem.y) * dy) / (dx * dx + dy * dy || 1)),
        );
        const offAxis = Math.hypot(clientX - (stem.x + along * dx), clientY - (stem.y + along * dy));
        const halfWidth = leaf.width * 0.42 * scale * Math.sin(Math.PI * along) ** 0.6;
        const gap = offAxis - halfWidth;
        if (gap <= 0) {
          if (leaf.index === safeChosen) onChosen = true;
          if (onTop === null || leaf.index > onTop) onTop = leaf.index;
        } else if (gap < nearestGap) {
          nearestGap = gap;
          nearest = leaf.index;
        }
      }
      return onChosen ? safeChosen : (onTop ?? nearest);
    },
    [tree, growingLeaves, safeChosen],
  );

  /*
    A finger or a mouse, on the drawing. Taken on pointerup rather than click
    so it can live on the stage: the listbox lies over the drawing for focus
    and for screen readers, but takes no pointer at all (see .tree-leaves).
    A drag that becomes a scroll is cancelled by the browser, so scrolling
    past the tree never chooses a leaf.
  */
  function onPick(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const index = leafAt(event.clientX, event.clientY);
    if (index === null) return;
    choose(index);
    // The leaf under the pointer is now the chosen one, ringed already.
    showHover(null);
  }

  /*
    A screen reader's tap is sent to the option itself rather than to a point
    on the screen, so it still reaches the listbox: take the option it names.
  */
  function onOption(event: MouseEvent<HTMLDivElement>) {
    const option = (event.target as Element).closest?.("[data-leaf]");
    if (option) choose(Number(option.getAttribute("data-leaf")));
  }

  /*
    Which leaf a click would choose, for a mouse. Moved by hand rather than
    through state: re-rendering the tree on every pointer move changed the
    page under the pointer, and each change made the browser hit test again.
  */
  const hoverRing = useRef<SVGCircleElement>(null);
  // A different tree has different leaves; a ring left from the last would point at nothing.
  useEffect(() => {
    hoverRing.current?.setAttribute("visibility", "hidden");
  }, [tree]);
  const showHover = (index: number | null) => {
    const ring = hoverRing.current;
    if (!ring) return;
    if (index === null || index === lifted) {
      ring.setAttribute("visibility", "hidden");
      return;
    }
    const leaf = tree.leaves[index]!;
    const c = leafCentre(leaf);
    ring.setAttribute("cx", String(c.x));
    ring.setAttribute("cy", String(c.y));
    ring.setAttribute("r", String(Math.max(leaf.length * 0.72, 13 * unit)));
    ring.setAttribute("visibility", "visible");
  };

  function onHover(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    showHover(leafAt(event.clientX, event.clientY));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Alt+Left is Back, Cmd+Arrows and Ctrl+Home belong to the browser.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const moves: Record<string, number> = {
      ArrowLeft: safeChosen - 1,
      ArrowUp: safeChosen - 1,
      ArrowRight: safeChosen + 1,
      ArrowDown: safeChosen + 1,
      Home: 0,
      End: count - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    if (target !== safeChosen && target >= 0 && target < count) choose(target);
  }

  // How big a tree unit is on screen, so the rings stay a readable size.
  const [stageWidth, setStageWidth] = useState(360);
  useEffect(() => {
    const element = stage.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setStageWidth(entry.contentRect.width || 360);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const unit = frame.width / stageWidth;

  if (count === 0) return null;

  const growing = plan?.timings ?? new Map<number, Timing>();
  const growingTwigs = plan?.twigs ?? new Map<string, number>();
  const waiting = phase.kind === "waiting";
  /*
    The arrival classes go on only when the arrival starts. A CSS animation
    begins when its element first carries it, so leaves drawn while waiting
    below the fold would otherwise have finished growing before anyone looked.
  */
  const animate = phase.kind === "arriving";
  const lifted = growing.has(safeChosen) ? null : safeChosen;
  /*
    The ring follows the chosen leaf even while it is arriving, since the card
    already names it - but not while it waits below the fold unseen, when a
    ring would circle an empty place.
  */
  const ringed = waiting && growing.has(safeChosen) ? null : safeChosen;
  const stirring = stir !== null && lifted !== null && stir.id === ids[lifted];
  const piece = pieces[safeChosen]!;
  const paint = paints[safeChosen]!;
  const optionId = (index: number) => `${uid}-leaf-${index}`;

  const sheen = `${uid}-sheen`;

  /**
   * A ring round a leaf. `press` is set for a leaf still arriving: the ring
   * then appears as the brush lands, never around the empty place first.
   */
  const ringAround = (index: number, className: string, press?: number) => {
    const leaf = tree.leaves[index]!;
    const c = leafCentre(leaf);
    return (
      <circle
        className={press === undefined ? className : `${className} ring-arrive`}
        style={press === undefined ? undefined : { ["--press" as string]: `${press}ms` }}
        cx={c.x}
        cy={c.y}
        r={Math.max(leaf.length * 0.72, 13 * unit)}
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  return (
    <figure className="tree-figure" data-tree="" data-phase={phase.kind}>
      <div
        ref={stage}
        // Anywhere on the drawing chooses the nearest leaf, so it all points.
        className="tree-stage art-mat cursor-pointer"
        onPointerUp={onPick}
        onPointerMove={onHover}
        onPointerLeave={() => showHover(null)}
      >
        <svg
          ref={svg}
          className="tree-drawing"
          viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {/* The shine on wet paint: soft, with no edge of its own. */}
            <radialGradient id={sheen}>
              <stop offset="0" style={{ stopColor: "rgb(var(--surface-raised))", stopOpacity: 0.9 }} />
              <stop offset="1" style={{ stopColor: "rgb(var(--surface-raised))", stopOpacity: 0 }} />
            </radialGradient>
            {gradients.map((g) => (
              <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0.55" style={{ stopColor: g.from }} />
                <stop offset="1" style={{ stopColor: g.to }} />
              </linearGradient>
            ))}
          </defs>

          <ellipse
            className="tree-ground"
            cx={0}
            cy={frame.width * 0.004}
            rx={frame.width * 0.3}
            ry={frame.width * 0.028}
          />

          <SettledDrawing
            tree={tree}
            paints={paints}
            uid={uid}
            unit={unit}
            hidden={lifted}
            growing={growingLeaves}
            twigs={growingTwigIds}
          />

          {/* Twigs and leaves growing in front of you. */}
          {phase.kind === "still" ? null : (
            <g className={waiting ? "tree-waiting" : undefined}>
              {[...growingTwigs.entries()].map(([id, at]) => {
                const branch = branchById.get(id)!;
                return (
                  <g key={`twig-${id}`} transform={`translate(${branch.x0.toFixed(2)} ${branch.y0.toFixed(2)})`}>
                    <g className={animate ? "twig-arrive" : undefined} style={{ ["--at" as string]: `${at}ms` }}>
                      <g transform={`translate(${(-branch.x0).toFixed(2)} ${(-branch.y0).toFixed(2)})`}>
                        <BranchMark branch={branch} />
                      </g>
                    </g>
                  </g>
                );
              })}
              {[...growing.entries()].map(([index, timing]) => (
                <g key={`arriving-${ids[index]}`} transform={place(tree.leaves[index]!)}>
                  <g
                    className={animate ? "leaf-arrive" : undefined}
                    data-arriving={ids[index]}
                    style={{
                      ["--press" as string]: `${timing.press}ms`,
                      ["--dry" as string]: `${timing.dry}ms`,
                    }}
                  >
                    <LeafShape leaf={tree.leaves[index]!} paint={paints[index]!} sheen={sheen} />
                  </g>
                </g>
              ))}
            </g>
          )}

          {/* The chosen leaf, lifted clear of the rest; it stirs when touched. */}
          {lifted === null ? null : (
            <g transform={place(tree.leaves[lifted]!)}>
              <g
                key={`${lifted}:${stirring ? stir.n : 0}`}
                className={stirring ? "leaf-lift leaf-stir" : "leaf-lift"}
              >
                <LeafShape leaf={tree.leaves[lifted]!} paint={paints[lifted]!} />
              </g>
            </g>
          )}

          <circle
            ref={hoverRing}
            className="tree-ring tree-ring-hover"
            visibility="hidden"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          {ringed === null
            ? null
            : ringAround(ringed, "tree-ring", animate ? growing.get(ringed)?.press : undefined)}
        </svg>

        <div
          role="listbox"
          tabIndex={0}
          aria-label="Leaves on your tree, one for each piece you have painted"
          aria-activedescendant={optionId(safeChosen)}
          aria-describedby={`${uid}-hint`}
          className="tree-leaves"
          onClick={onOption}
          onKeyDown={onKeyDown}
        >
          {/*
            One clipped container rather than a hidden, positioned element per
            leaf: 189 of those were 189 layers for the browser to hit test on
            every pointer move over the drawing.
          */}
          <div className="sr-only">
            {pieces.map(({ reference }, index) => (
              <div
                key={reference.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === safeChosen}
                data-leaf={index}
              >
                {names[index]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tree-card">
        {/*
          Previous and Next change the card without moving focus, so the leaf
          they land on is said aloud. The listbox announces its own options.
        */}
        <p aria-live="polite" className="sr-only">
          {said}
        </p>
        {/*
          One link for the whole row, the way a Browse card is: `.card-link`
          spreads the title's hit area over the plate and the lines beside it,
          so the target is the row rather than a line of text.
        */}
        <div className="relative flex items-center gap-4">
          <div className="w-[5.5rem] shrink-0">
            <RefArt
              reference={piece.reference}
              containerRef={art}
              sizes="88px"
              className="aspect-[5/4] w-full rounded-[4px]"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <WashLink
              to={`/piece/${piece.reference.id}`}
              state={{ from: pathname + search }}
              onBeforeMove={() => claimArtwork(art.current)}
              className="card-link inline-block font-display text-lg font-medium leading-tight text-ink underline decoration-[rgb(var(--ink)/0.25)] underline-offset-4 hover:decoration-[rgb(var(--ink)/0.7)]"
            >
              {piece.reference.title}
            </WashLink>
            <PaintedNote on={piece.on} />
            {paint.lead ? (
              <p className="flex flex-wrap items-center gap-x-1.5 text-[0.8rem] text-ink-faint">
                <span
                  aria-hidden="true"
                  className="dab inline-block h-3 w-3 shrink-0"
                  style={{ backgroundColor: paint.gradient?.from ?? paint.body }}
                />
                <span>{paint.lead}</span>
                {paint.charge ? (
                  <>
                    <span aria-hidden="true" className="dab ml-1 inline-block h-3 w-3 shrink-0" style={{ backgroundColor: paint.gradient?.to }} />
                    <span>{paint.charge}</span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        {/* A single leaf has nowhere to step to, so there is nothing to offer. */}
        {count > 1 ? (
          <div className="mt-3 flex gap-2">
            <StepButton
              label="Previous leaf"
              at={safeChosen === 0}
              onStep={() => {
                choose(safeChosen - 1);
                setSaid(names[safeChosen - 1] ?? "");
              }}
            />
            <StepButton
              label="Next leaf"
              at={safeChosen === count - 1}
              flip
              onStep={() => {
                choose(safeChosen + 1);
                setSaid(names[safeChosen + 1] ?? "");
              }}
            />
          </div>
        ) : null}
      </div>

      <figcaption id={`${uid}-hint`} className="tree-caption text-pretty text-[0.85rem] leading-snug text-ink-soft">
        A leaf for every piece you have painted, in that piece&rsquo;s own colours.
        Choose a leaf to see which piece it was.
      </figcaption>
    </figure>
  );
}

/**
 * Previous or next in the order the leaves grew. At either end it says so and
 * does nothing, but keeps its focus: a button that disabled itself under the
 * finger that pressed it would drop keyboard focus onto the page.
 */
function StepButton({
  label,
  at,
  flip = false,
  onStep,
}: {
  label: string;
  at: boolean;
  flip?: boolean;
  onStep: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={at || undefined}
      onClick={() => {
        if (!at) onStep();
      }}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised text-ink transition-colors ${
        at ? "cursor-default opacity-45" : "hover:border-[rgb(var(--ink)/0.35)]"
      }`}
    >
      <Icon name="arrow-left" size={18} className={flip ? "rotate-180" : ""} />
    </button>
  );
}
