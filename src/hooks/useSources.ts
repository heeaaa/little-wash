import { useCallback, useState } from "react";
import {
  isSourceEnabled as isEnabledIn,
  loadDisabledSources,
  persistDisabledSources,
  toggleSource,
} from "@/lib/sourcePrefs";
import type { SourceId } from "@/lib/sources/types";

export interface SourcesApi {
  /** Sources the painter has switched off. Everything else is on. */
  disabledSources: SourceId[];
  isSourceEnabled: (id: SourceId) => boolean;
  toggleSourceEnabled: (id: SourceId) => void;
}

/** Local-first source preferences: in-memory state mirrored to localStorage. */
export function useSources(): SourcesApi {
  // Lazy init so storage is read once, not on every render.
  const [disabledSources, setDisabled] = useState<SourceId[]>(() =>
    loadDisabledSources(),
  );

  const toggleSourceEnabled = useCallback((id: SourceId) => {
    setDisabled((prev) => {
      const next = toggleSource(prev, id);
      persistDisabledSources(next);
      return next;
    });
  }, []);

  const isSourceEnabled = useCallback(
    (id: SourceId) => isEnabledIn(disabledSources, id),
    [disabledSources],
  );

  return { disabledSources, isSourceEnabled, toggleSourceEnabled };
}
