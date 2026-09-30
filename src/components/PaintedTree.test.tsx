/**
 * The painted tree as someone meets it.
 *
 * The behaviour tests are ordinary: one leaf per piece, chosen by tap, keyboard
 * or step, and a leaf card that says which piece it was. The arrival tests are
 * about the one authored moment - a new leaf grows once, in front of you, and
 * never again. The register tests at the foot are the requirement: DESIGN.md's
 * painted register, applied to a drawing rather than a list.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PaintedTree, type PaintedPiece } from "@/components/PaintedTree";
import { growTree, leafCentre, leafTip } from "@/lib/tree";
import { makeReference } from "@/test/factory";

const SEEN_KEY = "little-wash:leaves-seen:v1";
const TODAY = new Date(2026, 8, 30, 10, 0);

const YELLOW = { name: "Cadmium Yellow", hex: "#f7c531" };
const SIENNA = { name: "Burnt Sienna", hex: "#9c4c2b" };
const COOL_GREY = { name: "Cool Grey", hex: "#8e9699" };
const CERULEAN = { name: "Cerulean Blue", hex: "#4f93bd" };

const PEAR = makeReference("pear", { title: "Ripe Pear", palette: [YELLOW, SIENNA] });
const MUG = makeReference("mug", { title: "Blue Mug", palette: [COOL_GREY, CERULEAN, SIENNA] });
const HILL = makeReference("hill", { title: "One Hill", subject: "landscape", palette: [] });

const THREE: PaintedPiece[] = [
  { reference: PEAR, on: "2026-09-01" },
  { reference: MUG, on: "2026-09-14" },
  { reference: HILL, on: "2026-09-18" },
];

function many(count: number): PaintedPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    reference: makeReference(`piece-${i}`, { title: `Piece ${i}`, palette: [YELLOW] }),
    on: "2026-09-10",
  }));
}

/** An IntersectionObserver the test decides for: the tree is on screen when it says so. */
class FakeObserver {
  static made: FakeObserver[] = [];
  watching: Element[] = [];
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeObserver.made.push(this);
  }
  observe(element: Element) {
    this.watching.push(element);
  }
  unobserve() {}
  disconnect() {
    this.watching = [];
  }
  takeRecords() {
    return [];
  }
  static see(ratio = 1) {
    act(() => {
      for (const observer of [...FakeObserver.made]) {
        if (observer.watching.length === 0) continue;
        observer.callback(
          observer.watching.map(
            (target) =>
              ({ target, isIntersecting: ratio > 0, intersectionRatio: ratio }) as IntersectionObserverEntry,
          ),
          observer as unknown as IntersectionObserver,
        );
      }
    });
  }
}

function reducedMotion(on: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: on && query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

function seenAlready(pieces: PaintedPiece[]) {
  localStorage.setItem(SEEN_KEY, JSON.stringify({ ids: pieces.map((p) => p.reference.id) }));
}

function seen(): string[] {
  return (JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as { ids?: string[] }).ids ?? [];
}

function renderTree(pieces: PaintedPiece[] = THREE) {
  return render(
    <MemoryRouter initialEntries={["/studio"]}>
      <PaintedTree pieces={pieces} />
    </MemoryRouter>,
  );
}

const figure = () => document.querySelector<HTMLElement>("[data-tree]")!;
const phase = () => figure().getAttribute("data-phase");
const leaves = () => screen.getByRole("listbox", { name: /leaves on your tree/i });
const chosenLeaf = () => within(leaves()).getByRole("option", { selected: true });
const card = () => figure().querySelector<HTMLElement>(".tree-card")!;

beforeEach(() => {
  localStorage.clear();
  FakeObserver.made = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  // The date on a leaf gains a year in any other year; pin the clock.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a leaf for every piece", () => {
  beforeEach(() => seenAlready(THREE));

  it("grows one leaf per painted piece, in the order they were painted", () => {
    renderTree();
    expect(within(leaves()).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Ripe Pear, in Cadmium Yellow, painted 1 September",
      "Blue Mug, in Cerulean Blue, painted 14 September",
      "One Hill, painted 18 September",
    ]);
  });

  it("chooses the newest leaf first, and its card says which piece it was", () => {
    renderTree();
    expect(chosenLeaf()).toHaveTextContent("One Hill");
    expect(within(card()).getByRole("link", { name: "One Hill" })).toHaveAttribute(
      "href",
      "/piece/hill",
    );
    expect(within(card()).getByText("Painted 18 September")).toBeInTheDocument();
  });

  it("paints a leaf in its own piece's colours, passing over the greys", () => {
    renderTree();
    act(() => within(leaves()).getAllByRole("option")[1]!.click());
    // The mug opens on Cool Grey; its leaf is Cerulean charged with Sienna.
    expect(within(card()).getByText("Cerulean Blue")).toBeInTheDocument();
    expect(within(card()).getByText("Burnt Sienna")).toBeInTheDocument();
    expect(within(card()).queryByText("Cool Grey")).toBeNull();
    const stops = [...figure().querySelectorAll("linearGradient stop")].map((s) =>
      (s as SVGStopElement).style.stopColor,
    );
    expect(stops).toEqual(expect.arrayContaining(["rgb(79, 147, 189)", "rgb(156, 76, 43)"]));
  });

  it("names nothing it does not have: a piece with no palette gives no colour", () => {
    renderTree();
    expect(within(card()).queryByText(/yellow|blue|sienna|grey/i)).toBeNull();
  });

  it("draws nothing at all for nothing painted", () => {
    const { container } = renderTree([]);
    expect(container.querySelector("[data-tree]")).toBeNull();
  });

  it("drops an unmarked piece's leaf, and the pieces after it close up", () => {
    // Leaves are places in the order things were painted, so taking one out
    // moves each later piece one place back - the tree loses its newest place,
    // not a hole in the middle. The piece chosen stays chosen.
    const { rerender } = renderTree();
    act(() => within(leaves()).getAllByRole("option")[2]!.click());
    rerender(
      <MemoryRouter initialEntries={["/studio"]}>
        <PaintedTree pieces={[THREE[0]!, THREE[2]!]} />
      </MemoryRouter>,
    );
    const names = within(leaves()).getAllByRole("option").map((o) => o.textContent);
    expect(names).toHaveLength(2);
    expect(names.join(" ")).not.toMatch(/Blue Mug/);
    expect(chosenLeaf()).toHaveTextContent("One Hill");
    // Two leaves drawn: one settled, and the chosen one lifted clear of it.
    expect(figure().querySelectorAll("svg path[visibility='hidden']")).toHaveLength(1);
  });

  it("keeps the chosen piece chosen when an earlier one is unmarked", () => {
    const { rerender } = renderTree();
    act(() => within(leaves()).getAllByRole("option")[1]!.click());
    expect(chosenLeaf()).toHaveTextContent("Blue Mug");
    rerender(
      <MemoryRouter initialEntries={["/studio"]}>
        <PaintedTree pieces={[THREE[1]!, THREE[2]!]} />
      </MemoryRouter>,
    );
    expect(chosenLeaf()).toHaveTextContent("Blue Mug");
  });
});

describe("choosing a leaf", () => {
  beforeEach(() => seenAlready(THREE));

  it("steps through the leaves with the arrow keys, Home and End", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTree();
    leaves().focus();

    await user.keyboard("{ArrowLeft}");
    expect(chosenLeaf()).toHaveTextContent("Blue Mug");
    expect(leaves()).toHaveAttribute("aria-activedescendant", chosenLeaf().id);

    await user.keyboard("{Home}");
    expect(chosenLeaf()).toHaveTextContent("Ripe Pear");
    await user.keyboard("{ArrowUp}");
    expect(chosenLeaf()).toHaveTextContent("Ripe Pear");

    await user.keyboard("{ArrowDown}");
    expect(chosenLeaf()).toHaveTextContent("Blue Mug");
    await user.keyboard("{End}");
    expect(chosenLeaf()).toHaveTextContent("One Hill");
    expect(within(card()).getByRole("link", { name: "One Hill" })).toBeInTheDocument();
  });

  it("leaves the browser's own shortcuts alone - Alt+Left is Back", () => {
    renderTree();
    for (const shortcut of [
      { key: "ArrowLeft", altKey: true },
      { key: "ArrowRight", metaKey: true },
      { key: "Home", ctrlKey: true },
    ]) {
      // fireEvent returns false when the handler prevented the default.
      expect(fireEvent.keyDown(leaves(), shortcut)).toBe(true);
      expect(chosenLeaf()).toHaveTextContent("One Hill");
    }
  });

  it("is one stop on the keyboard, not one per leaf", () => {
    renderTree(many(40));
    expect(leaves()).toHaveAttribute("tabindex", "0");
    expect(figure().querySelectorAll('[role="option"][tabindex]')).toHaveLength(0);
  });

  it("chooses a leaf an assistive technology taps", () => {
    renderTree();
    act(() => within(leaves()).getAllByRole("option")[0]!.click());
    expect(chosenLeaf()).toHaveTextContent("Ripe Pear");
  });

  it("steps with Previous and Next, and keeps focus on a step at its end", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTree();
    const next = within(card()).getByRole("button", { name: "Next leaf" });
    const previous = within(card()).getByRole("button", { name: "Previous leaf" });

    // The newest is chosen, so Next is at its end - and says so without
    // disabling itself, which would drop keyboard focus onto the page.
    expect(next).toHaveAttribute("aria-disabled", "true");
    next.focus();
    await user.keyboard("{Enter}");
    expect(next).toHaveFocus();
    expect(chosenLeaf()).toHaveTextContent("One Hill");

    await user.click(previous);
    expect(chosenLeaf()).toHaveTextContent("Blue Mug");
    expect(next).not.toHaveAttribute("aria-disabled");
  });

  describe("by pointer", () => {
    /*
      jsdom lays nothing out, so the drawing's screen matrix is stood in for
      by the identity: a point in tree units is the same point on screen.
      Which leaf a tap finds is then the component's own arithmetic.
    */
    /*
      jsdom has no PointerEvent either, and without one fireEvent falls back to
      a bare Event that drops clientX and pointerType - so every tap would miss
      and the "chooses nothing" cases would pass for the wrong reason.
    */
    class TestPointerEvent extends MouseEvent {
      readonly pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerType = init.pointerType ?? "mouse";
      }
    }
    beforeEach(() => {
      Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", {
        configurable: true,
        value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      });
      vi.stubGlobal("PointerEvent", TestPointerEvent);
    });
    afterEach(() => {
      delete (SVGSVGElement.prototype as { getScreenCTM?: unknown }).getScreenCTM;
    });

    const stage = () => figure().querySelector<HTMLElement>(".tree-stage")!;
    const centreOf = (index: number) => leafCentre(growTree(THREE.length).leaves[index]!);

    it("chooses a big leaf tapped near its tip, not only near its middle", () => {
      // A young tree on a desktop draws each leaf ~100px long. Measured from
      // the leaf's centre, a tap at the outer end was out of reach.
      Object.defineProperty(SVGSVGElement.prototype, "getScreenCTM", {
        configurable: true,
        value: () => ({ a: 7.6, b: 0, c: 0, d: 7.6, e: 0, f: 0 }),
      });
      renderTree();
      const leaf = growTree(THREE.length).leaves[0]!;
      const tip = leafTip(leaf);
      const x = (leaf.x + 0.9 * (tip.x - leaf.x)) * 7.6;
      const y = (leaf.y + 0.9 * (tip.y - leaf.y)) * 7.6;
      fireEvent.pointerUp(stage(), { clientX: x, clientY: y, pointerType: "mouse", button: 0 });
      expect(chosenLeaf()).toHaveTextContent("Ripe Pear");
    });

    it("chooses the leaf under the finger, even where another leaf's middle is nearer", () => {
      // In a full crown, the leaf whose centre is nearest is often not the one
      // being touched. Found by plain geometry, independent of the component:
      // a point near a leaf's tip that no other leaf covers, where some other
      // leaf's centre is closer than this one's.
      const pieces = many(60);
      seenAlready(pieces);
      const tree = growTree(pieces.length);
      const distanceToAxis = (p: { x: number; y: number }, l: (typeof tree.leaves)[number]) => {
        const t = leafTip(l);
        const [dx, dy] = [t.x - l.x, t.y - l.y];
        const k = Math.max(0, Math.min(1, ((p.x - l.x) * dx + (p.y - l.y) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(p.x - (l.x + k * dx), p.y - (l.y + k * dy));
      };
      // A leaf is under half its width either side of its axis, so a point 0.6
      // of a width from every other axis is on no other leaf.
      const found = tree.leaves
        .flatMap((leaf) =>
          [0.7, 0.8, 0.9].map((along) => {
            const tip = leafTip(leaf);
            const p = { x: leaf.x + along * (tip.x - leaf.x), y: leaf.y + along * (tip.y - leaf.y) };
            const clear = tree.leaves.every(
              (other) => other === leaf || distanceToAxis(p, other) > other.width * 0.6,
            );
            const own = Math.hypot(p.x - leafCentre(leaf).x, p.y - leafCentre(leaf).y);
            const nearer = tree.leaves.some(
              (other) =>
                other !== leaf &&
                Math.hypot(p.x - leafCentre(other).x, p.y - leafCentre(other).y) < own,
            );
            return { leaf, p, ok: clear && nearer };
          }),
        )
        .find((candidate) => candidate.ok);
      expect(found, "no such spot in a 60-leaf tree").toBeDefined();

      renderTree(pieces);
      fireEvent.pointerUp(stage(), { clientX: found!.p.x, clientY: found!.p.y, pointerType: "touch" });
      expect(chosenLeaf()).toHaveTextContent(`Piece ${found!.leaf.index},`);
    });

    it("chooses the leaf nearest a tap, a little off its centre", () => {
      renderTree();
      const { x, y } = centreOf(0);
      fireEvent.pointerUp(stage(), { clientX: x + 3, clientY: y - 2, pointerType: "touch" });
      expect(chosenLeaf()).toHaveTextContent("Ripe Pear");
    });

    it("chooses nothing for a tap out of reach of every leaf", () => {
      renderTree();
      fireEvent.pointerUp(stage(), { clientX: 5000, clientY: 5000, pointerType: "touch" });
      expect(chosenLeaf()).toHaveTextContent("One Hill");
    });

    it("chooses nothing for a right click", () => {
      renderTree();
      const { x, y } = centreOf(0);
      fireEvent.pointerUp(stage(), { clientX: x, clientY: y, pointerType: "mouse", button: 2 });
      expect(chosenLeaf()).toHaveTextContent("One Hill");
    });

    it("shows a mouse which leaf a click would take, and stops when it leaves", () => {
      renderTree();
      const ring = figure().querySelector("circle.tree-ring-hover")!;
      expect(ring).toHaveAttribute("visibility", "hidden");
      const { x, y } = centreOf(1);
      fireEvent.pointerMove(stage(), { clientX: x, clientY: y, pointerType: "mouse" });
      expect(ring).toHaveAttribute("visibility", "visible");
      expect(Number(ring.getAttribute("cx"))).toBeCloseTo(x, 5);
      fireEvent.pointerLeave(stage(), { pointerType: "mouse" });
      expect(ring).toHaveAttribute("visibility", "hidden");
    });

    it("previews nothing for a finger, which has no hover", () => {
      renderTree();
      const { x, y } = centreOf(1);
      fireEvent.pointerMove(stage(), { clientX: x, clientY: y, pointerType: "touch" });
      expect(figure().querySelector("circle.tree-ring-hover")).toHaveAttribute("visibility", "hidden");
    });
  });

  it("says aloud which leaf Previous and Next land on", async () => {
    // The buttons change the card without moving focus, so nothing else would.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTree();
    const live = card().querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent("");
    await user.click(within(card()).getByRole("button", { name: "Previous leaf" }));
    expect(live).toHaveTextContent("Blue Mug, in Cerulean Blue, painted 14 September");
  });

  it("offers no steps for a single leaf", () => {
    seenAlready(THREE.slice(0, 1));
    renderTree(THREE.slice(0, 1));
    expect(within(card()).queryByRole("button", { name: /leaf/i })).toBeNull();
  });
});

describe("a new leaf arrives once, in front of you", () => {
  it("waits for the tree to be on screen before anything grows", () => {
    renderTree();
    expect(phase()).toBe("waiting");
    expect(figure().querySelector(".leaf-arrive")).toBeNull();
    // Not seen yet, so leaving now keeps them to arrive next time.
    expect(seen()).toEqual([]);

    FakeObserver.see(0.3);
    expect(phase()).toBe("waiting");

    FakeObserver.see(0.8);
    expect(phase()).toBe("arriving");
    expect(figure().querySelectorAll(".leaf-arrive")).toHaveLength(3);
    // Recorded at the start, so leaving part-way never replays it.
    expect(seen()).toEqual(["pear", "mug", "hill"]);
  });

  it("grows the first leaf's stem before pressing the leaf in", () => {
    // The trunk's id is the empty string, and an empty string is falsy.
    renderTree(THREE.slice(0, 1));
    FakeObserver.see();
    expect(figure().querySelectorAll(".twig-arrive")).toHaveLength(1);
    const leaf = figure().querySelector<SVGGElement>('[data-arriving="pear"]')!;
    expect(leaf.style.getPropertyValue("--press")).toBe("300ms");
  });

  it("lets only the newest six arrive together; the rest are already there", () => {
    renderTree(many(10));
    FakeObserver.see();
    const arriving = [...figure().querySelectorAll("[data-arriving]")].map((el) =>
      el.getAttribute("data-arriving"),
    );
    expect(arriving).toEqual(["piece-4", "piece-5", "piece-6", "piece-7", "piece-8", "piece-9"]);
  });

  it("keeps a piece painted while the tree is on screen new, to arrive next time", () => {
    // Not quietly marked as seen mid-visit: nobody watched it grow.
    seenAlready(THREE.slice(0, 2));
    const { rerender } = renderTree(THREE.slice(0, 2));
    expect(phase()).toBe("still");
    rerender(
      <MemoryRouter initialEntries={["/studio"]}>
        <PaintedTree pieces={THREE} />
      </MemoryRouter>,
    );
    expect(seen()).toEqual(["pear", "mug"]);
  });

  it("does not arrive again once seen", () => {
    seenAlready(THREE);
    renderTree();
    expect(phase()).toBe("still");
    expect(figure().querySelector("[data-arriving]")).toBeNull();
  });

  it("grows only the leaf that is new", () => {
    seenAlready(THREE.slice(0, 2));
    renderTree();
    FakeObserver.see();
    expect([...figure().querySelectorAll("[data-arriving]")].map((el) => el.getAttribute("data-arriving"))).toEqual([
      "hill",
    ]);
  });

  it("settles into the drawing once the last leaf is dry", () => {
    // Fake timers cannot be re-configured while installed - a second
    // useFakeTimers is silently ignored - so start again from real ones.
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(TODAY);
    renderTree();
    FakeObserver.see();
    expect(phase()).toBe("arriving");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(phase()).toBe("still");
    expect(figure().querySelector(".leaf-arrive")).toBeNull();
    expect(within(leaves()).getAllByRole("option")).toHaveLength(3);
  });

  it("rings the chosen leaf even while it is still arriving", () => {
    // The newest leaf is chosen first and is also the one arriving; the card
    // names it, so the drawing has to show which leaf that is.
    renderTree();
    FakeObserver.see();
    expect(phase()).toBe("arriving");
    expect(figure().querySelector("circle.tree-ring:not(.tree-ring-hover)")).not.toBeNull();
  });

  it("lets that ring appear with its leaf, never around empty paper", () => {
    // The newest leaf arrives last, seconds in. A ring shown from the start
    // circled the place it would grow - an outline waiting to be filled.
    renderTree();
    FakeObserver.see();
    const ring = figure().querySelector<SVGCircleElement>("circle.tree-ring:not(.tree-ring-hover)")!;
    const leaf = figure().querySelector<SVGGElement>('[data-arriving="hill"]')!;
    expect(ring).toHaveClass("ring-arrive");
    expect(ring.style.getPropertyValue("--press")).toBe(leaf.style.getPropertyValue("--press"));
  });

  it("never stirs a leaf by itself when its arrival ends", () => {
    // Chosen while it was still arriving, a leaf has nothing to stir yet. It
    // must not stir later, untouched, when it settles.
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(TODAY);
    renderTree();
    FakeObserver.see();
    fireEvent.keyDown(leaves(), { key: "ArrowLeft" });
    expect(chosenLeaf()).toHaveTextContent("Blue Mug");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(phase()).toBe("still");
    expect(figure().querySelector(".leaf-stir")).toBeNull();
    expect(figure().querySelector(".leaf-lift")).not.toBeNull();
  });

  it("grows at once where there is no way to tell it is on screen", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    renderTree();
    expect(phase()).toBe("arriving");
  });

  it("under reduced motion lets nothing arrive, and still records it all as seen", () => {
    reducedMotion(true);
    renderTree();
    expect(phase()).toBe("still");
    expect(figure().querySelector("[data-arriving]")).toBeNull();
    expect(seen()).toEqual(["pear", "mug", "hill"]);
  });

  it("under reduced motion does not stir a leaf that is chosen", () => {
    reducedMotion(true);
    renderTree();
    act(() => within(leaves()).getAllByRole("option")[0]!.click());
    expect(figure().querySelector(".leaf-stir")).toBeNull();
    expect(figure().querySelector(".leaf-lift")).not.toBeNull();
  });

  it("stirs a leaf when it is chosen", () => {
    seenAlready(THREE);
    renderTree();
    expect(figure().querySelector(".leaf-stir")).toBeNull();
    act(() => within(leaves()).getAllByRole("option")[0]!.click());
    expect(figure().querySelector(".leaf-stir")).not.toBeNull();
  });
});

describe("the register: a record, never a scoreboard", () => {
  beforeEach(() => seenAlready(THREE));

  it("carries no count, target, stage or achievement word", () => {
    renderTree();
    const text = figure().textContent ?? "";
    expect(text).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/);
    expect(text).not.toMatch(/\b(complete|completed|done|finish|finished|achiev\w*|milestone|goal|target|badge|level|score|streak|unlock\w*)\b/i);
    expect(text).not.toMatch(/\b(sapling|seedling|grown|full|stage)\b/i);
    expect(text).not.toMatch(/\b(ago|yesterday|this (week|month|year)|days? in a row)\b/i);
  });

  it("draws the same tree whatever the date: time passing changes nothing", () => {
    // Only painting changes the tree. A year later, the same record draws
    // exactly the same drawing - no seasons, no wilting, nothing that reads
    // the clock.
    const drawing = () =>
      figure()
        .querySelector("svg")!
        .outerHTML.replace(/tree[a-z0-9]+/gi, "tree");
    const { unmount } = renderTree();
    const now = drawing();
    unmount();

    vi.setSystemTime(new Date(2027, 10, 3, 18, 0));
    renderTree();
    expect(drawing()).toBe(now);
  });
});
