import { useMemo } from "react";
import type { AccountContextValue } from "@/state/AccountContext";
import type { FavoritesApi } from "@/hooks/useFavorites";
import type { PaintedApi } from "@/hooks/usePainted";
import { today } from "@/lib/painted";

/**
 * A signed-in account's pieces in exactly the shape the guest hooks give, so
 * no screen has to know which it is looking at. Null when nobody is signed in,
 * and the guest lists apply.
 *
 * `now` is AppProvider's injectable clock, shared with the guest record so a
 * marked date is deterministic under test whichever store takes it.
 */
export function useAccountLists(
  account: Pick<AccountContextValue, "status" | "record" | "toggleSaved" | "togglePainted">,
  now?: Date,
): { favorites: FavoritesApi; painted: PaintedApi } | null {
  const { status, record, toggleSaved, togglePainted } = account;

  return useMemo(() => {
    if (status !== "signed-in" || !record) return null;
    const ids = record.saved.map((row) => row.id);
    const saved = new Set(ids);
    const entries = record.painted.map((row) => ({ id: row.id, on: row.on }));
    const painted = new Set(entries.map((entry) => entry.id));
    return {
      favorites: {
        favorites: ids,
        isSaved: (id: string) => saved.has(id),
        toggleSave: toggleSaved,
      },
      painted: {
        painted: entries,
        isPainted: (id: string) => painted.has(id),
        togglePainted: (id: string) => togglePainted(id, today(now)),
      },
    };
  }, [status, record, toggleSaved, togglePainted, now]);
}
