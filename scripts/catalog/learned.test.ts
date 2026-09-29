import { describe, it, expect } from "vitest";
import { EMPTY_VOCABULARY, forget, learnedSignal, record, type LearnedVocabulary } from "./learned.ts";

const at = "2026-09-21";
const didNotLoad = (note: { reason: string }) => note.reason === "Image did not load";

describe("forgetting decisions that were not judgements", () => {
  const texts: Record<string, string> = {
    "pexels:1": "snail on a mossy log",
    "pexels:2": "snail on a leaf",
    "pexels:3": "tabby kitten asleep",
  };
  const textOf = (id: string) => texts[id];

  it("reverses exactly what record added, back to nothing", () => {
    const v = record(EMPTY_VOCABULARY, "rejected", "pexels:1", texts["pexels:1"]!, "Image did not load", at, "creatures");
    const { vocabulary, forgotten, kept } = forget(v, didNotLoad, textOf);
    expect(vocabulary).toEqual(EMPTY_VOCABULARY);
    expect(forgotten).toHaveLength(1);
    expect(kept).toEqual([]);
  });

  it("leaves real judgements and their counts alone", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "rejected", "pexels:1", texts["pexels:1"]!, "Image did not load", at, "creatures");
    v = record(v, "approved", "pexels:2", texts["pexels:2"]!, "Simple focus subject", at, "creatures");
    const { vocabulary } = forget(v, didNotLoad, textOf);

    expect(vocabulary.notes.map((n) => n.candidateId)).toEqual(["pexels:2"]);
    expect(vocabulary.phrases.find((p) => p.phrase === "snail")).toEqual({
      phrase: "snail",
      subject: "creatures",
      approved: 1,
      rejected: 0,
    });
    // Only the forgotten candidate had these words, so they are gone.
    expect(vocabulary.phrases.find((p) => p.phrase === "mossy")).toBeUndefined();
  });

  it("undoes each note once when a candidate was set aside twice", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "rejected", "pexels:1", texts["pexels:1"]!, "Image did not load", at, "creatures");
    v = record(v, "rejected", "pexels:1", texts["pexels:1"]!, "Image did not load", at, "creatures");
    v = record(v, "rejected", "pexels:2", texts["pexels:2"]!, "Too busy", at, "creatures");
    const { vocabulary, forgotten } = forget(v, didNotLoad, textOf);
    expect(forgotten).toHaveLength(2);
    expect(vocabulary.phrases.find((p) => p.phrase === "snail")?.rejected).toBe(1);
  });

  it("keeps the candidate decided when a real judgement of it remains", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "rejected", "pexels:1", texts["pexels:1"]!, "Image did not load", at, "creatures");
    v = record(v, "rejected", "pexels:1", texts["pexels:1"]!, "Out of focus", at, "creatures");
    const { vocabulary } = forget(v, didNotLoad, textOf);
    expect(vocabulary.notes).toEqual([
      expect.objectContaining({ candidateId: "pexels:1", reason: "Out of focus" }),
    ]);
    expect(vocabulary.phrases.find((p) => p.phrase === "snail")?.rejected).toBe(1);
  });

  it("only touches counts in the note's own subject", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "rejected", "pexels:1", texts["pexels:1"]!, "Image did not load", at, "creatures");
    v = record(v, "rejected", "pexels:9", "snail shell", "Too busy", at, "objects");
    const { vocabulary } = forget(v, didNotLoad, textOf);
    expect(vocabulary.phrases).toEqual([
      { phrase: "shell", subject: "objects", approved: 0, rejected: 1 },
      { phrase: "snail", subject: "objects", approved: 0, rejected: 1 },
      { phrase: "snail shell", subject: "objects", approved: 0, rejected: 1 },
    ]);
  });

  it("keeps a note it cannot undo, and says so", () => {
    const v = record(EMPTY_VOCABULARY, "rejected", "pexels:404", "lost candidate", "Image did not load", at, "creatures");
    const { vocabulary, forgotten, kept } = forget(v, didNotLoad, textOf);
    expect(vocabulary).toEqual(v);
    expect(forgotten).toEqual([]);
    expect(kept).toHaveLength(1);
  });

  it("never drives a count below zero", () => {
    // A note whose counts were already lost, say from an older file.
    const v: LearnedVocabulary = {
      notes: [{ decision: "rejected", reason: "Image did not load", candidateId: "pexels:3", at, subject: "creatures" }],
      phrases: [{ phrase: "tabby", subject: "creatures", approved: 2, rejected: 0 }],
    };
    const { vocabulary } = forget(v, didNotLoad, textOf);
    expect(vocabulary.phrases).toEqual([{ phrase: "tabby", subject: "creatures", approved: 2, rejected: 0 }]);
  });

  it("stops the shortlist being pushed by decisions nobody made", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    for (let i = 0; i < 4; i += 1) {
      v = record(v, "rejected", "pexels:2", texts["pexels:2"]!, "Image did not load", at, "creatures");
    }
    expect(learnedSignal(v, "snail on a leaf", "creatures").delta).toBeLessThan(0);
    const { vocabulary } = forget(v, didNotLoad, textOf);
    expect(learnedSignal(vocabulary, "snail on a leaf", "creatures").delta).toBe(0);
  });
});
