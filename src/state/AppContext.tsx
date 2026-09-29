import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_FILTERS,
  type Difficulty,
  type Filters,
  type PaintReference,
  type Subject,
  type TimeBand,
} from "@/lib/types";
import {
  enabledReferences,
  filterReferences,
  pickDaily,
  surpriseMe,
} from "@/lib/catalog";
import { useFavorites, type FavoritesApi } from "@/hooks/useFavorites";
import { useSources, type SourcesApi } from "@/hooks/useSources";
import { usePainted, type PaintedApi } from "@/hooks/usePainted";
import { rewet } from "@/lib/wash";
import type { RandomSource } from "@/lib/shuffle";

interface AppContextValue extends FavoritesApi, SourcesApi, PaintedApi {
  /**
   * Every reference there is, before source preferences are applied.
   *
   * Saved pieces resolve against this rather than against `catalogue`, so
   * switching a source off never empties a shelf someone filled on purpose.
   */
  references: PaintReference[];
  /** The catalogue after disabled sources are removed; what discovery draws on. */
  catalogue: PaintReference[];
  filters: Filters;
  activeFilters: number;
  setFilter: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  /** References matching the active filters, in catalogue order. */
  visible: PaintReference[];
  /** The piece currently offered as "today's" idea (matches filters). */
  featured: PaintReference | null;
  /** Swap the featured piece for a random different one within the filter. */
  surprise: () => PaintReference | null;
}

const AppContext = createContext<AppContextValue | null>(null);

const TIME_VALUES: TimeBand[] = ["short", "medium", "long"];
const DIFFICULTY_VALUES: Difficulty[] = ["gentle", "steady", "stretch"];
const SUBJECT_VALUES: Subject[] = [
  "fruit",
  "botanical",
  "still-life",
  "creatures",
  "landscape",
  "objects",
];

function readParam<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | "all" {
  if (raw && (allowed as readonly string[]).includes(raw)) return raw as T;
  return "all";
}

interface AppProviderProps {
  references: PaintReference[];
  children: ReactNode;
  /** Injectable randomness keeps "Surprise me" deterministic in tests. */
  random?: RandomSource;
  /** Fixed date for the daily pick; defaults to now. */
  today?: Date;
}

export function AppProvider({
  references,
  children,
  random = Math.random,
  today,
}: AppProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const favorites = useFavorites();
  const sources = useSources();
  // Shares the injected clock with the daily pick, so a marked date is
  // deterministic under test.
  const painted = usePainted(today);

  const catalogue = useMemo(
    () => enabledReferences(references, sources.disabledSources),
    [references, sources.disabledSources],
  );

  const filters: Filters = useMemo(
    () => ({
      time: readParam(searchParams.get("time"), TIME_VALUES),
      difficulty: readParam(searchParams.get("difficulty"), DIFFICULTY_VALUES),
      subject: readParam(searchParams.get("subject"), SUBJECT_VALUES),
    }),
    [searchParams],
  );

  const activeFilters =
    (filters.time !== "all" ? 1 : 0) +
    (filters.difficulty !== "all" ? 1 : 0) +
    (filters.subject !== "all" ? 1 : 0);

  /*
    Narrowing the filters can change which piece is featured, so it is a
    re-wet like a deal is. Centralised here so every route that changes the
    catalogue gets the same behaviour without each control opting in.
  */
  const setFilter = useCallback(
    (patch: Partial<Filters>) => {
      rewet(() =>
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(patch)) {
              if (!value || value === "all") next.delete(key);
              else next.set(key, value);
            }
            /*
              Changing a filter is asking for a fresh suggestion, so the dealt
              piece is released. It also removes the case where a filter that
              still matched the pinned piece played the 520ms wash and changed
              nothing on screen, teaching the user the controls were unreliable.
            */
            next.delete("piece");
            return next;
          },
          { replace: true },
        ),
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setFilter(DEFAULT_FILTERS);
  }, [setFilter]);

  const visible = useMemo(
    () => filterReferences(catalogue, filters),
    [catalogue, filters],
  );

  /*
    Which id the user dealt themselves; null follows the daily default. It lives
    in the URL rather than in component state so the piece someone chose to
    paint survives a reload, a locked phone and a discarded tab, and can be
    shared - none of which component state could do.

    Written with `replace`, so dealing repeatedly does not fill the history
    with pieces the user skipped past. That is the trade: Back leaves the
    screen rather than stepping through previous deals.
  */
  const pinnedId = searchParams.get("piece");

  const setPinnedId = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("piece", id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const featured = useMemo(() => {
    if (visible.length === 0) return null;
    if (pinnedId) {
      const pinned = visible.find((r) => r.id === pinnedId);
      if (pinned) return pinned;
    }
    // Seeded on the day and the filter combination, so narrowing a filter
    // moves to a genuinely different piece instead of the first match.
    return pickDaily(catalogue, filters, today);
  }, [visible, pinnedId, catalogue, filters, today]);

  const surprise = useCallback(() => {
    const next = surpriseMe(catalogue, filters, featured?.id ?? null, random);
    if (next) rewet(() => setPinnedId(next.id));
    return next;
  }, [catalogue, filters, featured, random, setPinnedId]);

  const value = useMemo<AppContextValue>(
    () => ({
      references,
      catalogue,
      filters,
      activeFilters,
      setFilter,
      resetFilters,
      visible,
      featured,
      surprise,
      ...favorites,
      ...sources,
      ...painted,
    }),
    [
      references,
      catalogue,
      filters,
      activeFilters,
      setFilter,
      resetFilters,
      visible,
      featured,
      surprise,
      favorites,
      sources,
      painted,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
