import { describe, expect, it } from "vitest";
import { EXERCISES, type Exercise } from "@/data/exercises";
import {
  PARAM,
  durationLabel,
  filterByKind,
  isDefaultVariation,
  minutesRange,
  readKind,
  resolveSelection,
  variationCountLabel,
  withKind,
  withOpen,
  withVariation,
} from "@/lib/exercises";

const byId = (id: string) => EXERCISES.find((e) => e.id === id)!;
const GRADED = byId("graded-wash");
const WHEEL = byId("three-colour-wheel");

/** A warm-up whose variations all take the same time, and only one of them. */
function single(minutes: number): Exercise {
  const [classic] = GRADED.variations;
  return { ...GRADED, id: "single", variations: [{ ...classic, minutes }] };
}

describe("readKind", () => {
  it("accepts the two kinds", () => {
    expect(readKind("brushwork")).toBe("brushwork");
    expect(readKind("colour")).toBe("colour");
  });

  it("degrades anything else to all, rather than an empty list", () => {
    expect(readKind(null)).toBe("all");
    expect(readKind("")).toBe("all");
    expect(readKind("color")).toBe("all");
    expect(readKind("all")).toBe("all");
  });
});

describe("filterByKind", () => {
  it("returns every warm-up for all, as a copy", () => {
    const all = filterByKind(EXERCISES, "all");
    expect(all).toEqual(EXERCISES);
    expect(all).not.toBe(EXERCISES);
  });

  it("keeps only the chosen kind", () => {
    expect(filterByKind(EXERCISES, "colour").map((e) => e.id)).toEqual([
      "three-colour-wheel",
      "two-colour-mixing-strip",
    ]);
    expect(filterByKind(EXERCISES, "brushwork").map((e) => e.id)).toEqual([
      "wet-on-wet-blooms",
      "value-ladder",
      "graded-wash",
    ]);
  });
});

describe("resolveSelection", () => {
  it("is closed when nothing is named", () => {
    expect(resolveSelection(EXERCISES, null, null)).toBeNull();
  });

  it("ignores a warm-up that does not exist", () => {
    expect(resolveSelection(EXERCISES, "nope", null)).toBeNull();
  });

  it("treats a warm-up the filter has hidden as closed", () => {
    const colourOnly = filterByKind(EXERCISES, "colour");
    expect(resolveSelection(colourOnly, "graded-wash", "sunset-wash")).toBeNull();
  });

  it("opens on the classic by default", () => {
    const selection = resolveSelection(EXERCISES, "graded-wash", null);
    expect(selection?.exercise.id).toBe("graded-wash");
    expect(selection?.variation.id).toBe("classic-rectangle");
  });

  it("opens on the named variation", () => {
    expect(resolveSelection(EXERCISES, "graded-wash", "sunset-wash")?.variation.name).toBe(
      "Sunset wash",
    );
  });

  it("falls back to the classic for a variation of a different warm-up", () => {
    // "petals" belongs to the mixing strip, not the graded wash.
    expect(resolveSelection(EXERCISES, "graded-wash", "petals")?.variation.id).toBe(
      "classic-rectangle",
    );
  });
});

describe("labels", () => {
  it("gives a range when variations take different times", () => {
    expect(minutesRange(GRADED)).toEqual({ min: 8, max: 12 });
    expect(durationLabel(GRADED)).toBe("8-12 min");
  });

  it("gives one number when they all take the same time", () => {
    expect(durationLabel(WHEEL)).toBe("15 min");
    expect(durationLabel(single(7))).toBe("7 min");
  });

  it("counts variations, in the singular where there is one", () => {
    expect(variationCountLabel(GRADED)).toBe("4 variations");
    expect(variationCountLabel(single(5))).toBe("1 variation");
  });

  it("knows which variation is the default", () => {
    expect(isDefaultVariation(GRADED, "classic-rectangle")).toBe(true);
    expect(isDefaultVariation(GRADED, "fading-sky")).toBe(false);
  });
});

describe("URL writers", () => {
  const params = (init: string) => new URLSearchParams(init);

  describe("withKind", () => {
    it("sets a narrowing kind and clears all", () => {
      expect(withKind(params(""), "colour", EXERCISES).toString()).toBe("kind=colour");
      expect(withKind(params("kind=colour"), "all", EXERCISES).toString()).toBe("");
    });

    it("closes the open warm-up when the filter hides it", () => {
      const next = withKind(params("warmup=graded-wash&variation=sunset-wash"), "colour", EXERCISES);
      expect(next.get(PARAM.warmup)).toBeNull();
      expect(next.get(PARAM.variation)).toBeNull();
      expect(next.get(PARAM.kind)).toBe("colour");
    });

    /*
      A stale link - `?kind=colour&warmup=graded-wash` - shows nothing open,
      because the filter hides it. Clearing the filter must not then spring
      it open: nobody asked for it on this screen.
    */
    it("does not revive a warm-up the old filter was hiding", () => {
      const next = withKind(params("kind=colour&warmup=graded-wash&variation=sunset-wash"), "all", EXERCISES);
      expect(next.get(PARAM.warmup)).toBeNull();
      expect(next.get(PARAM.variation)).toBeNull();
    });

    it("leaves the open warm-up alone when it is still shown", () => {
      const next = withKind(params("warmup=graded-wash&variation=sunset-wash"), "brushwork", EXERCISES);
      expect(next.get(PARAM.warmup)).toBe("graded-wash");
      expect(next.get(PARAM.variation)).toBe("sunset-wash");
    });

    it("does not touch parameters it does not own", () => {
      expect(withKind(params("utm=x"), "colour", EXERCISES).get("utm")).toBe("x");
    });

    it("does not mutate what it was given", () => {
      const prev = params("warmup=graded-wash");
      withKind(prev, "colour", EXERCISES);
      expect(prev.toString()).toBe("warmup=graded-wash");
    });
  });

  describe("withOpen", () => {
    it("opens on the classic, dropping a variation left from before", () => {
      const next = withOpen(params("warmup=graded-wash&variation=sunset-wash"), "value-ladder");
      expect(next.get(PARAM.warmup)).toBe("value-ladder");
      expect(next.get(PARAM.variation)).toBeNull();
    });

    it("closes, keeping the filter", () => {
      expect(withOpen(params("kind=colour&warmup=three-colour-wheel"), null).toString()).toBe(
        "kind=colour",
      );
    });
  });

  describe("withVariation", () => {
    it("names a non-default variation", () => {
      const next = withVariation(params(""), GRADED, "misty-landscape");
      expect(next.get(PARAM.warmup)).toBe("graded-wash");
      expect(next.get(PARAM.variation)).toBe("misty-landscape");
    });

    it("keeps the URL clean for the classic", () => {
      expect(withVariation(params("variation=fading-sky"), GRADED, "classic-rectangle").toString()).toBe(
        "warmup=graded-wash",
      );
    });

    it("refuses a variation the warm-up does not have", () => {
      expect(withVariation(params("variation=fading-sky"), GRADED, "petals").get(PARAM.variation)).toBeNull();
    });
  });
});
