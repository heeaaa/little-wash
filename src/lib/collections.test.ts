import { describe, it, expect } from "vitest";
import { isListBacked, resolveCollection, visibleCollections } from "./collections";
import { enabledReferences } from "./catalog";
import { makeCredit, makeReference } from "@/test/factory";
import { collectionSearch, type Collection } from "@/data/collections";

function collection(over: Partial<Collection> = {}): Collection {
  return {
    id: "c",
    title: "A collection",
    blurb: "",
    pigmentVar: "--pig-fruit",
    filter: {},
    coverSubject: "fruit",
    ...over,
  };
}

const CATALOG = [
  makeReference("quick-pear", { minutes: 5, subject: "fruit" }),
  makeReference("slow-cottage", {
    minutes: 30,
    subject: "landscape",
    difficulty: "stretch",
  }),
  makeReference("photo-leaf", {
    subject: "botanical",
    credit: makeCredit({ sourceId: "pexels", institution: "Pexels" }),
  }),
];

describe("isListBacked", () => {
  it("tells a curated list apart from a saved filter", () => {
    expect(isListBacked(collection({ referenceIds: ["quick-pear"] }))).toBe(true);
    expect(isListBacked(collection({ filter: { time: "short" } }))).toBe(false);
  });

  it("treats an empty list as a list, not as an absent one", () => {
    expect(isListBacked(collection({ referenceIds: [] }))).toBe(true);
  });
});

describe("resolveCollection: filter-backed", () => {
  it("returns whatever the filter matches", () => {
    const pieces = resolveCollection(collection({ filter: { time: "short" } }), CATALOG);
    expect(pieces.map((p) => p.id)).toEqual(["quick-pear", "photo-leaf"]);
  });

  it("returns the whole catalogue for a collection that narrows nothing", () => {
    expect(resolveCollection(collection(), CATALOG)).toHaveLength(3);
  });
});

describe("resolveCollection: list-backed", () => {
  it("returns the curated pieces in the curator's order", () => {
    const themed = collection({ referenceIds: ["photo-leaf", "quick-pear"] });
    expect(resolveCollection(themed, CATALOG).map((p) => p.id)).toEqual([
      "photo-leaf",
      "quick-pear",
    ]);
  });

  it("ignores the filter when a list is present", () => {
    // A curated theme is a mood, not a query. If both were applied, a theme
    // could silently lose pieces its curator chose.
    const both = collection({
      referenceIds: ["slow-cottage"],
      filter: { time: "short" },
    });
    expect(resolveCollection(both, CATALOG).map((p) => p.id)).toEqual(["slow-cottage"]);
  });

  it("drops ids the catalogue no longer has rather than rendering holes", () => {
    const stale = collection({ referenceIds: ["quick-pear", "retired-piece"] });
    expect(resolveCollection(stale, CATALOG).map((p) => p.id)).toEqual(["quick-pear"]);
  });

  it("shrinks honestly when a source is switched off", () => {
    const themed = collection({ referenceIds: ["photo-leaf", "quick-pear"] });
    const withoutPexels = enabledReferences(CATALOG, ["pexels"]);
    expect(resolveCollection(themed, withoutPexels).map((p) => p.id)).toEqual([
      "quick-pear",
    ]);
  });
});

describe("visibleCollections", () => {
  it("pairs each collection with the pieces actually in it", () => {
    const entries = visibleCollections(
      [collection({ id: "short", filter: { time: "short" } })],
      CATALOG,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.pieces.map((p) => p.id)).toEqual(["quick-pear", "photo-leaf"]);
  });

  it("drops a collection that has emptied out rather than leaving a dead end", () => {
    const entries = visibleCollections(
      [
        collection({ id: "gone", referenceIds: ["photo-leaf"] }),
        collection({ id: "kept", referenceIds: ["quick-pear"] }),
      ],
      enabledReferences(CATALOG, ["pexels"]),
    );
    expect(entries.map((e) => e.collection.id)).toEqual(["kept"]);
  });

  it("returns nothing when every source is off", () => {
    expect(
      visibleCollections([collection()], enabledReferences(CATALOG, ["placeholder", "pexels"])),
    ).toEqual([]);
  });
});

describe("enabledReferences", () => {
  it("returns the whole catalogue when nothing is disabled", () => {
    expect(enabledReferences(CATALOG, [])).toHaveLength(3);
  });

  it("removes only the disabled sources", () => {
    expect(enabledReferences(CATALOG, ["pexels"]).map((r) => r.id)).toEqual([
      "quick-pear",
      "slow-cottage",
    ]);
  });

  it("can return nothing when every source is off", () => {
    expect(enabledReferences(CATALOG, ["placeholder", "pexels"])).toEqual([]);
  });

  it("does not mutate the catalogue it is given", () => {
    enabledReferences(CATALOG, ["pexels"]);
    expect(CATALOG).toHaveLength(3);
  });
});

describe("collectionSearch", () => {
  it("sends a filter-backed collection as its filter", () => {
    expect(collectionSearch(collection({ filter: { time: "short" } }))).toBe("?time=short");
  });

  it("sends a curated list as its own id", () => {
    // Without this a list-backed collection set no parameters at all, so
    // opening "Simply Citrus" quietly showed the entire catalogue.
    expect(collectionSearch(collection({ id: "citrus", referenceIds: ["a"] }))).toBe(
      "?collection=citrus",
    );
  });

  it("prefers the list over any filter the collection also carries", () => {
    const both = collection({
      id: "citrus",
      referenceIds: ["a"],
      filter: { time: "short" },
    });
    expect(collectionSearch(both)).toBe("?collection=citrus");
  });

  it("sends nothing for a collection that narrows nothing", () => {
    expect(collectionSearch(collection())).toBe("");
  });

  it("combines every filter a collection sets", () => {
    const search = collectionSearch(
      collection({ filter: { time: "short", difficulty: "gentle", subject: "fruit" } }),
    );
    expect(search).toContain("time=short");
    expect(search).toContain("difficulty=gentle");
    expect(search).toContain("subject=fruit");
  });
});
