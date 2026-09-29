import { useCallback, useState } from "react";
import {
  isPainted as isPaintedIn,
  loadPainted,
  persistPainted,
  today,
  togglePainted,
  type PaintedEntry,
} from "@/lib/painted";

export interface PaintedApi {
  painted: PaintedEntry[];
  isPainted: (id: string) => boolean;
  togglePainted: (id: string) => void;
}

/**
 * Local-first record of what you have painted: in-memory state mirrored to
 * localStorage, the same shape as useFavorites.
 *
 * `now` is injectable because the date is part of what is stored, and a test
 * that depends on the wall clock is a test that fails on the wrong day.
 * AppProvider already threads a fixed date through for the daily pick.
 */
export function usePainted(now?: Date): PaintedApi {
  // Lazy init so storage is read once, not on every render.
  const [painted, setPainted] = useState<PaintedEntry[]>(() => loadPainted());

  const toggle = useCallback(
    (id: string) => {
      setPainted((prev) => {
        const next = togglePainted(prev, id, today(now));
        persistPainted(next);
        return next;
      });
    },
    [now],
  );

  const isPainted = useCallback((id: string) => isPaintedIn(painted, id), [painted]);

  return { painted, isPainted, togglePainted: toggle };
}
