import { useCallback, useEffect, useState } from "react";
import {
  isHidden as isHiddenIn,
  loadHidden,
  onHiddenReplaced,
  persistHidden,
  toggleHidden as toggleHiddenIn,
} from "@/lib/hidden";

export interface HiddenApi {
  /** Ids someone has said are not for them, oldest first. */
  hidden: string[];
  isHidden: (id: string) => boolean;
  /** Hide the piece, or show it again if it is hidden. */
  toggleHidden: (id: string) => void;
}

/** Local-first hidden pieces: in-memory state mirrored to localStorage, as useFavorites. */
export function useHidden(): HiddenApi {
  const [hidden, setHidden] = useState<string[]>(() => loadHidden());

  // Replaced from outside - signing in, a session ending, another tab. The
  // in-memory copy follows storage each time, as useFavorites explains.
  useEffect(() => onHiddenReplaced(() => setHidden(loadHidden())), []);

  const toggleHidden = useCallback((id: string) => {
    setHidden((prev) => {
      const next = toggleHiddenIn(prev, id);
      persistHidden(next);
      return next;
    });
  }, []);

  const isHidden = useCallback((id: string) => isHiddenIn(hidden, id), [hidden]);

  return { hidden, isHidden, toggleHidden };
}
