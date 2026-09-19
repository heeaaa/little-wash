import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PIECE_ART, move, rewet } from "@/lib/wash";

/* The real signature is wider than this module needs; a loose handle keeps the
   stub honest about what wash.ts actually calls. */
type Doc = Record<"startViewTransition", unknown>;
const doc = document as unknown as Doc;

function setViewTransitions(impl: ((cb: () => void) => unknown) | undefined) {
  if (impl) doc.startViewTransition = impl;
  else delete (doc as Partial<Doc>).startViewTransition;
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** A stand-in for the real API: runs the callback and reports when it settles. */
function fakeViewTransitions() {
  const calls: Array<() => void> = [];
  const impl = (cb: () => void) => {
    calls.push(cb);
    cb();
    return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
  };
  return { impl, calls };
}

beforeEach(() => {
  setReducedMotion(false);
  document.documentElement.removeAttribute("data-wash");
});

afterEach(() => {
  setViewTransitions(undefined);
  vi.restoreAllMocks();
});

describe("wash", () => {
  it("names the artwork one thing, so only one element can hold it", () => {
    expect(PIECE_ART).toBe("piece-art");
  });

  describe("without View Transitions", () => {
    beforeEach(() => setViewTransitions(undefined));

    it("still performs the update on a re-wet", () => {
      const update = vi.fn();
      rewet(update);
      expect(update).toHaveBeenCalledOnce();
    });

    it("still performs the update on a move", () => {
      const update = vi.fn();
      move(update);
      expect(update).toHaveBeenCalledOnce();
    });

    it("leaves no transition state stranded on the document", () => {
      rewet(() => {});
      expect(document.documentElement.hasAttribute("data-wash")).toBe(false);
    });
  });

  describe("with reduced motion", () => {
    beforeEach(() => {
      const { impl } = fakeViewTransitions();
      setViewTransitions(impl);
      setReducedMotion(true);
    });

    it("skips the transition entirely rather than running a fast one", () => {
      const start = vi.spyOn(doc as never, "startViewTransition" as never);
      const update = vi.fn();
      rewet(update);
      expect(update).toHaveBeenCalledOnce();
      expect(start).not.toHaveBeenCalled();
    });

    it("never marks the document as washing, so no wash CSS can apply", () => {
      rewet(() => {});
      move(() => {});
      expect(document.documentElement.hasAttribute("data-wash")).toBe(false);
    });
  });

  describe("with View Transitions", () => {
    it("marks the document while a re-wet runs and clears it afterwards", async () => {
      const { impl } = fakeViewTransitions();
      setViewTransitions(impl);

      let markedDuringUpdate: string | null = null;
      rewet(() => {
        markedDuringUpdate = document.documentElement.getAttribute("data-wash");
      });

      // The wash CSS is scoped to this attribute, so it has to be on the
      // document before the browser snapshots, not after.
      expect(markedDuringUpdate).toBe("rewet");
      await Promise.resolve();
      await Promise.resolve();
      expect(document.documentElement.hasAttribute("data-wash")).toBe(false);
    });

    it("runs `before` while the outgoing page is still on screen", () => {
      const { impl } = fakeViewTransitions();
      setViewTransitions(impl);
      const order: string[] = [];
      move(
        () => order.push("update"),
        () => order.push("before"),
      );
      expect(order).toEqual(["before", "update"]);
    });

    it("does not mark a move as a re-wet", () => {
      const { impl } = fakeViewTransitions();
      setViewTransitions(impl);
      let marked: string | null = "unset";
      move(() => {
        marked = document.documentElement.getAttribute("data-wash");
      });
      expect(marked).toBeNull();
    });
  });
});
