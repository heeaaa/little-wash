import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PIECE_ART,
  claimArtwork,
  move,
  releaseArtworkIfScrolledAway,
  rewet,
} from "@/lib/wash";

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

    it("skips `before`, which only prepares a snapshot that will not be taken", () => {
      const before = vi.fn();
      rewet(() => {}, before);
      move(() => {}, before);
      expect(before).not.toHaveBeenCalled();
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

    it("runs a re-wet's `before` while the outgoing piece is still on screen", () => {
      const { impl } = fakeViewTransitions();
      setViewTransitions(impl);
      const order: string[] = [];
      rewet(
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

describe("claimArtwork", () => {
  /*
    Exactly one element may hold the shared name, or the browser skips the
    morph. A list claims it for the one artwork being left, at click time.
  */
  function artwork() {
    const element = document.createElement("div");
    document.body.append(element);
    return element;
  }

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("gives the shared name to the artwork being left", () => {
    const card = artwork();
    claimArtwork(card);
    expect(card.style.viewTransitionName).toBe(PIECE_ART);
  });

  it("takes the name back from whichever artwork claimed it before", () => {
    // Two quick clicks would otherwise leave two holders.
    const first = artwork();
    const second = artwork();
    claimArtwork(first);
    claimArtwork(second);
    expect(first.style.viewTransitionName).toBe("");
    expect(second.style.viewTransitionName).toBe(PIECE_ART);
  });

  it("leaves a name React set alone", () => {
    // Today and Detail hold the name through their own render; releasing it
    // there would take it from the page that is supposed to have it.
    const plate = artwork();
    plate.style.viewTransitionName = PIECE_ART;
    claimArtwork(artwork());
    expect(plate.style.viewTransitionName).toBe(PIECE_ART);
  });

  it("releases an old claim even when there is nothing new to claim", () => {
    const card = artwork();
    claimArtwork(card);
    claimArtwork(null);
    expect(card.style.viewTransitionName).toBe("");
  });
});

describe("releaseArtworkIfScrolledAway", () => {
  /*
    jsdom lays nothing out, so the plate's position is stated. The browser
    suite measures the real thing: the artwork does not fly in from above
    (e2e/series.spec.ts).
  */
  function plateAt(top: number) {
    const plate = document.createElement("div");
    plate.style.viewTransitionName = PIECE_ART;
    plate.getBoundingClientRect = () => ({ top, bottom: top + 380 }) as DOMRect;
    return plate;
  }

  it("lets go when the plate has scrolled up out of view", () => {
    // Measured on a Pixel 7 from the foot of Detail.
    const plate = plateAt(-485);
    releaseArtworkIfScrolledAway(plate);
    expect(plate.style.viewTransitionName).toBe("none");
  });

  it("lets go when the plate is below the screen", () => {
    const plate = plateAt(window.innerHeight + 10);
    releaseArtworkIfScrolledAway(plate);
    expect(plate.style.viewTransitionName).toBe("none");
  });

  it("keeps the name while the plate's top edge is on screen, so it re-wets in place", () => {
    const plate = plateAt(173);
    releaseArtworkIfScrolledAway(plate);
    expect(plate.style.viewTransitionName).toBe(PIECE_ART);
  });

  it("does nothing without a plate", () => {
    expect(() => releaseArtworkIfScrolledAway(null)).not.toThrow();
  });
});
