import { describe, it, expect, beforeEach } from "vitest";
import {
  enabledSources,
  isSourceEnabled,
  loadDisabledSources,
  persistDisabledSources,
  toggleSource,
} from "./sourcePrefs";
import { SOURCE_ORDER } from "./sources/registry";

beforeEach(() => {
  localStorage.clear();
});

describe("toggleSource", () => {
  it("disables a source that was on", () => {
    expect(toggleSource([], "pexels")).toEqual(["pexels"]);
  });

  it("re-enables a source that was off", () => {
    expect(toggleSource(["pexels", "met"], "pexels")).toEqual(["met"]);
  });

  it("does not mutate the input", () => {
    const input = ["met"] as const;
    toggleSource(input, "pexels");
    expect(input).toEqual(["met"]);
  });
});

describe("isSourceEnabled", () => {
  it("treats anything not explicitly disabled as on", () => {
    expect(isSourceEnabled([], "unsplash")).toBe(true);
    expect(isSourceEnabled(["unsplash"], "unsplash")).toBe(false);
  });
});

describe("enabledSources", () => {
  it("returns every source in registry order by default", () => {
    expect(enabledSources([])).toEqual([...SOURCE_ORDER]);
  });

  it("omits the disabled ones and keeps the order", () => {
    expect(enabledSources(["pexels", "placeholder"])).toEqual(
      SOURCE_ORDER.filter((id) => id !== "pexels" && id !== "placeholder"),
    );
  });

  it("can return nothing when everything is switched off", () => {
    expect(enabledSources([...SOURCE_ORDER])).toEqual([]);
  });
});

describe("persist + load round-trip", () => {
  it("writes and reads back the same ids", () => {
    persistDisabledSources(["met", "pexels"]);
    expect(loadDisabledSources()).toEqual(["met", "pexels"]);
  });

  it("starts with nothing disabled, so a new source is on by default", () => {
    // Storing the enabled set instead would mean any provider added later
    // arrived switched off, silently, for everyone who had already visited.
    expect(loadDisabledSources()).toEqual([]);
  });

  it("recovers from malformed stored data", () => {
    localStorage.setItem("little-wash:sources:v1", "{ not json");
    expect(loadDisabledSources()).toEqual([]);
  });

  it("drops ids that are no longer known sources", () => {
    localStorage.setItem(
      "little-wash:sources:v1",
      JSON.stringify({ disabled: ["met", "a-retired-provider", 7, null] }),
    );
    expect(loadDisabledSources()).toEqual(["met"]);
  });

  it("ignores a stored object of the wrong shape", () => {
    localStorage.setItem("little-wash:sources:v1", JSON.stringify({ ids: ["met"] }));
    expect(loadDisabledSources()).toEqual([]);
  });
});
