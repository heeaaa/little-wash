import { describe, expect, it } from "vitest";
import { EXERCISES, type ExerciseVariation } from "@/data/exercises";
import { INSPIRATION_PHOTOS } from "@/data/inspiration";
import { EXERCISE_ART_IDS } from "@/components/ExerciseArt";

/*
  The warm-ups are content, but the brief sets rules for that content which
  are easy to break with one careless edit: every variation teaches the same
  technique as its warm-up, stays short, and carries its own guide rather than
  a new title on the classic's.
*/

const variations = EXERCISES.flatMap((e) => e.variations as readonly ExerciseVariation[]);
const byId = (id: string) => EXERCISES.find((e) => e.id === id)!;
const names = (id: string) => byId(id).variations.map((v) => v.name);

describe("the warm-ups", () => {
  it("keeps the five warm-ups, with the variations the brief asked for", () => {
    expect(EXERCISES.map((e) => e.title)).toEqual([
      "Wet-on-wet blooms",
      "Three-colour wheel",
      "Value ladder",
      "Two-colour mixing strip",
      "Graded wash",
    ]);
    expect(names("wet-on-wet-blooms")).toEqual([
      "Classic blooms",
      "Loose flowers",
      "Soft clouds",
      "Abstract puddles",
    ]);
    expect(names("three-colour-wheel")).toEqual(["Classic wheel", "Colour-wheel tree", "Feather wheel"]);
    expect(names("value-ladder")).toEqual([
      "Classic squares",
      "Layered mountains",
      "Row of trees",
      "Sky bands",
      "Circles and moons",
    ]);
    expect(names("two-colour-mixing-strip")).toEqual(["Classic strip", "Turning leaves", "Teardrops", "Petals"]);
    expect(names("graded-wash")).toEqual([
      "Classic rectangle",
      "Fading sky",
      "Sunset wash",
      "Misty landscape",
    ]);
  });

  it("puts the original exercise first, as the default", () => {
    for (const exercise of EXERCISES) {
      expect(exercise.variations[0].name, exercise.id).toMatch(/^Classic /);
    }
  });

  it("gives every variation a unique id, so a URL names exactly one", () => {
    const ids = variations.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every variation its own guide, not the classic's with a new title", () => {
    for (const exercise of EXERCISES) {
      const [classic, ...rest] = exercise.variations;
      for (const v of rest) {
        expect(v.steps, v.id).not.toEqual(classic.steps);
        expect(v.notice, v.id).not.toBe(classic.notice);
        expect(v.summary, v.id).not.toBe(classic.summary);
      }
    }
  });

  it("keeps each guide to three to five steps and one tip", () => {
    for (const v of variations) {
      expect(v.steps.length, v.id).toBeGreaterThanOrEqual(3);
      expect(v.steps.length, v.id).toBeLessThanOrEqual(5);
      expect(v.notice.length, v.id).toBeGreaterThan(20);
      expect(v.summary.length, v.id).toBeGreaterThan(20);
    }
  });

  it("stays a warm-up, not a painting project", () => {
    for (const v of variations) expect(v.minutes, v.id).toBeLessThanOrEqual(15);
  });

  it("suggests colours with a substitution, and minimal materials", () => {
    for (const v of variations) {
      expect(v.colours.length, v.id).toBeGreaterThan(0);
      expect(v.colourNote.length, v.id).toBeGreaterThan(10);
      expect(v.materials.length, v.id).toBeGreaterThanOrEqual(3);
      expect(v.materials.length, v.id).toBeLessThanOrEqual(5);
    }
  });

  /*
    The underlying learning, preserved: a wheel is three primaries, a value
    study is one pigment, a mixing strip is exactly two.
  */
  it("keeps each technique's palette", () => {
    for (const v of byId("three-colour-wheel").variations) expect(v.colours, v.id).toHaveLength(3);
    for (const v of byId("value-ladder").variations) expect(v.colours, v.id).toHaveLength(1);
    for (const v of byId("two-colour-mixing-strip").variations) expect(v.colours, v.id).toHaveLength(2);
  });

  it("draws a distinct illustration for every variation, and describes it", () => {
    const arts = variations.map((v) => v.art);
    expect(new Set(arts).size).toBe(arts.length);
    expect([...arts].sort()).toEqual([...EXERCISE_ART_IDS].sort());
    for (const v of variations) expect(v.artAlt, v.id).toMatch(/^Illustrated example: .{30,}/);
  });

  it("uses New Zealand spelling and no long dashes", () => {
    const copy = EXERCISES.flatMap((e) => [
      e.title,
      e.focus,
      ...e.variations.flatMap((v) => [
        v.name,
        v.summary,
        v.colourNote,
        v.notice,
        v.artAlt,
        ...v.steps,
        ...v.materials,
        ...v.colours.map((c) => c.name),
      ]),
    ]).join("\n");
    expect(copy).not.toMatch(/[–—]/);
    expect(copy).not.toMatch(/\bcolor|gray\b|center\b/i);
  });
});

describe("the inspiration photos", () => {
  const withPhotos = variations.filter((v) => v.photo);

  it("sit only on the five approved scenic variations, fixed to each", () => {
    expect(withPhotos.map((v) => v.id).sort()).toEqual(
      ["fading-sky", "layered-mountains", "misty-landscape", "soft-clouds", "sunset-wash"],
    );
    for (const v of withPhotos) {
      expect(v.photo, v.id).toBe(INSPIRATION_PHOTOS[v.id as keyof typeof INSPIRATION_PHOTOS]);
    }
  });

  it("are photographs, credited to a named photographer on a free-licence platform", () => {
    for (const photo of Object.values(INSPIRATION_PHOTOS)) {
      const { credit } = photo;
      expect(photo.kind).toBe("photograph");
      expect(credit.creator).toBeTruthy();
      expect(credit.creatorUrl).toMatch(/^https:\/\//);
      expect(credit.objectUrl).toMatch(/^https:\/\//);
      expect(credit.licence.id).toBe(credit.sourceId);
      expect(["pexels", "unsplash"]).toContain(credit.sourceId);
      if (credit.sourceId === "unsplash") {
        // Unsplash's guidelines require its referral parameters on every link.
        expect(credit.objectUrl).toContain("utm_source=little_wash");
        expect(credit.creatorUrl).toContain("utm_source=little_wash");
      }
      expect(photo.image.delivery).toBe("remote");
      expect(photo.image.intrinsicWidth).toBeGreaterThan(0);
      expect(photo.image.intrinsicHeight).toBeGreaterThan(0);
    }
  });

  it("carry alt text of our own, not the provider's caption", () => {
    for (const photo of Object.values(INSPIRATION_PHOTOS)) {
      expect(photo.alt.length).toBeGreaterThan(60);
      // The provider's machine caption for the sunset claims a plane that is not there.
      expect(photo.alt).not.toMatch(/plane/i);
    }
  });
});
