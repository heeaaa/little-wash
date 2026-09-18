import { describe, it, expect, beforeEach } from "vitest";
import {
  isSaved,
  loadFavorites,
  persistFavorites,
  toggleFavorite,
} from "./favorites";

beforeEach(() => {
  localStorage.clear();
});

describe("toggleFavorite", () => {
  it("adds an id that is not present", () => {
    expect(toggleFavorite([], "a")).toEqual(["a"]);
  });

  it("removes an id that is present", () => {
    expect(toggleFavorite(["a", "b"], "a")).toEqual(["b"]);
  });

  it("does not mutate the input", () => {
    const input = ["a"];
    toggleFavorite(input, "b");
    expect(input).toEqual(["a"]);
  });
});

describe("isSaved", () => {
  it("reports membership", () => {
    expect(isSaved(["a", "b"], "b")).toBe(true);
    expect(isSaved(["a", "b"], "c")).toBe(false);
  });
});

describe("persist + load round-trip", () => {
  it("writes and reads back the same ids", () => {
    persistFavorites(["pear", "mug"]);
    expect(loadFavorites()).toEqual(["pear", "mug"]);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(loadFavorites()).toEqual([]);
  });

  it("recovers from malformed stored data", () => {
    localStorage.setItem("little-wash:favorites:v1", "{ not json");
    expect(loadFavorites()).toEqual([]);
  });

  it("ignores non-string entries in stored data", () => {
    localStorage.setItem(
      "little-wash:favorites:v1",
      JSON.stringify({ ids: ["ok", 5, null, "fine"] }),
    );
    expect(loadFavorites()).toEqual(["ok", "fine"]);
  });
});
