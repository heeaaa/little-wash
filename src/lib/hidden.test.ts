import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HIDDEN_KEY,
  isHidden,
  loadHidden,
  onHiddenReplaced,
  persistHidden,
  replaceHidden,
  toggleHidden,
} from "./hidden";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toggleHidden", () => {
  it("adds a piece that is not hidden, at the end", () => {
    expect(toggleHidden(["a"], "b")).toEqual(["a", "b"]);
  });

  it("shows again a piece that is hidden", () => {
    expect(toggleHidden(["a", "b"], "a")).toEqual(["b"]);
  });

  it("does not change the list it was given", () => {
    const input = ["a"];
    toggleHidden(input, "b");
    expect(input).toEqual(["a"]);
  });
});

describe("isHidden", () => {
  it("reports membership", () => {
    expect(isHidden(["a", "b"], "b")).toBe(true);
    expect(isHidden(["a", "b"], "c")).toBe(false);
  });
});

describe("the stored list", () => {
  it("is kept under its own versioned key", () => {
    expect(HIDDEN_KEY).toBe("little-wash:hidden:v1");
    persistHidden(["pear"]);
    expect(JSON.parse(localStorage.getItem(HIDDEN_KEY)!)).toEqual({ ids: ["pear"] });
  });

  it("reads back what was written, in order", () => {
    persistHidden(["pear", "mug"]);
    expect(loadHidden()).toEqual(["pear", "mug"]);
  });

  it("is empty when nothing is stored", () => {
    expect(loadHidden()).toEqual([]);
  });

  it("is empty when what is stored is not JSON", () => {
    localStorage.setItem(HIDDEN_KEY, "{ not json");
    expect(loadHidden()).toEqual([]);
  });

  it("is empty when what is stored has the wrong shape", () => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(["pear"]));
    expect(loadHidden()).toEqual([]);
  });

  it("drops entries that are not ids, and repeats", () => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify({ ids: ["ok", 5, null, "", "fine", "ok"] }));
    expect(loadHidden()).toEqual(["ok", "fine"]);
  });

  it("is empty, not an error, when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadHidden()).toEqual([]);
  });

  it("does not throw when storage will not take a write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => persistHidden(["pear"])).not.toThrow();
  });
});

describe("replacing the list from outside", () => {
  it("writes the new list and tells every listener", () => {
    const heard = vi.fn();
    const stop = onHiddenReplaced(heard);
    replaceHidden(["jug"]);
    expect(loadHidden()).toEqual(["jug"]);
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });

  it("removes the key altogether when the list is emptied", () => {
    persistHidden(["jug"]);
    replaceHidden([]);
    expect(localStorage.getItem(HIDDEN_KEY)).toBeNull();
  });

  it("still tells listeners when storage will not take the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const heard = vi.fn();
    const stop = onHiddenReplaced(heard);
    expect(() => replaceHidden(["jug"])).not.toThrow();
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });

  it("hears another tab change this key, or clear storage, and nothing else", () => {
    const heard = vi.fn();
    const stop = onHiddenReplaced(heard);
    window.dispatchEvent(new StorageEvent("storage", { key: HIDDEN_KEY }));
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    window.dispatchEvent(new StorageEvent("storage", { key: "little-wash:favorites:v1" }));
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
  });

  it("stops listening once asked to", () => {
    const heard = vi.fn();
    onHiddenReplaced(heard)();
    replaceHidden(["jug"]);
    window.dispatchEvent(new StorageEvent("storage", { key: HIDDEN_KEY }));
    expect(heard).not.toHaveBeenCalled();
  });
});
