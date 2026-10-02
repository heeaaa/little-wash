/**
 * A guest's lists follow storage when something outside the hook replaces
 * them: another tab, or the account service in this one.
 *
 * From the independent review (02/10/2026): when one tab signed in and
 * emptied the shared lists, a guest tab kept its old copy in memory, and its
 * next save wrote every old piece back - pieces the next start would merge
 * into the account again, even ones the person had since unsaved there.
 */

import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFavorites } from "./useFavorites";
import { usePainted } from "./usePainted";
import { replaceFavorites } from "@/lib/favorites";
import { replacePainted } from "@/lib/painted";

const FAVOURITES = "little-wash:favorites:v1";
const PAINTED = "little-wash:painted:v1";
const DAY = new Date(2026, 9, 3, 9, 0);

/** Another tab changed the key: the browser tells this one with a storage event. */
function changedElsewhere(key: string, value: unknown | null) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
}

describe("a guest's saved list", () => {
  it("follows another tab emptying it, so a later save cannot bring the old pieces back", () => {
    localStorage.setItem(FAVOURITES, JSON.stringify({ ids: ["ripe-pear", "blue-jug"] }));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual(["ripe-pear", "blue-jug"]);

    changedElsewhere(FAVOURITES, null);
    expect(result.current.favorites).toEqual([]);

    act(() => result.current.toggleSave("teacup"));
    expect(JSON.parse(localStorage.getItem(FAVOURITES)!)).toEqual({ ids: ["teacup"] });
  });

  it("follows storage being cleared altogether, and a replacement made in this tab", () => {
    localStorage.setItem(FAVOURITES, JSON.stringify({ ids: ["ripe-pear"] }));
    const { result } = renderHook(() => useFavorites());

    localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.favorites).toEqual([]);

    act(() => replaceFavorites(["blue-jug"]));
    expect(result.current.favorites).toEqual(["blue-jug"]);
  });
});

describe("a guest's painted record", () => {
  it("follows another tab emptying it, so a later mark cannot bring the old days back", () => {
    localStorage.setItem(PAINTED, JSON.stringify({ entries: [{ id: "ripe-pear", on: "2026-10-01" }] }));
    const { result } = renderHook(() => usePainted(DAY));
    expect(result.current.isPainted("ripe-pear")).toBe(true);

    changedElsewhere(PAINTED, null);
    expect(result.current.painted).toEqual([]);

    act(() => result.current.togglePainted("teacup"));
    expect(JSON.parse(localStorage.getItem(PAINTED)!)).toEqual({ entries: [{ id: "teacup", on: "2026-10-03" }] });
  });

  it("follows a replacement made in this tab, such as pieces put back after a session ended", () => {
    const { result } = renderHook(() => usePainted(DAY));
    act(() => replacePainted([{ id: "blue-jug", on: "2026-09-30" }]));
    expect(result.current.painted).toEqual([{ id: "blue-jug", on: "2026-09-30" }]);
  });
});
