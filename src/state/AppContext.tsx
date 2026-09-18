import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
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
import { filterReferences, pickDaily, surpriseMe } from "@/lib/catalog";
import { useFavorites, type FavoritesApi } from "@/hooks/useFavorites";
import type { RandomSource } from "@/lib/shuffle";

export type DirectionId = "a" | "b";
export type Treatment = "chaos" | "scattered";

interface AppContextValue extends FavoritesApi {
  direction: DirectionId;
  treatment: Treatment;
  references: PaintReference[];
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

const TIME_VALUES: TimeBand[] = ["5", "15", "30"];
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
  direction: DirectionId;
  references: PaintReference[];
  children: ReactNode;
  /** Injectable randomness keeps "Surprise me" deterministic in tests. */
  random?: RandomSource;
  /** Fixed date for the daily pick; defaults to now. */
  today?: Date;
}

export function AppProvider({
  direction,
  references,
  children,
  random = Math.random,
  today,
}: AppProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const favorites = useFavorites();

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

  const setFilter = useCallback(
    (patch: Partial<Filters>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (!value || value === "all") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setFilter(DEFAULT_FILTERS);
  }, [setFilter]);

  const visible = useMemo(
    () => filterReferences(references, filters),
    [references, filters],
  );

  // Which id the user pinned via "Surprise me"; null follows the daily default.
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const featured = useMemo(() => {
    if (visible.length === 0) return null;
    if (pinnedId) {
      const pinned = visible.find((r) => r.id === pinnedId);
      if (pinned) return pinned;
    }
    // Seeded on the day and the filter combination, so narrowing a filter
    // moves to a genuinely different piece instead of the first match.
    return pickDaily(references, filters, today);
  }, [visible, pinnedId, references, filters, today]);

  const surprise = useCallback(() => {
    const next = surpriseMe(references, filters, featured?.id ?? null, random);
    if (next) setPinnedId(next.id);
    return next;
  }, [references, filters, featured, random]);

  const treatment: Treatment = direction === "a" ? "chaos" : "scattered";

  const value = useMemo<AppContextValue>(
    () => ({
      direction,
      treatment,
      references,
      filters,
      activeFilters,
      setFilter,
      resetFilters,
      visible,
      featured,
      surprise,
      ...favorites,
    }),
    [
      direction,
      treatment,
      references,
      filters,
      activeFilters,
      setFilter,
      resetFilters,
      visible,
      featured,
      surprise,
      favorites,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
