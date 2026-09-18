/**
 * Favourites store.
 *
 * Local-first per PRODUCT.md: saving works with no account, on-device. This
 * prototype persists to localStorage behind a small versioned schema and a
 * safe wrapper, and degrades to in-memory when storage is unavailable
 * (private mode, quota, SSR). No network, no sync - clearly simulated.
 */

const STORAGE_KEY = "little-wash:favorites:v1";

export interface FavoritesState {
  ids: string[];
}

function readStorage(): FavoritesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ids: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as FavoritesState).ids)
    ) {
      const ids = (parsed as FavoritesState).ids.filter(
        (id): id is string => typeof id === "string",
      );
      return { ids };
    }
    return { ids: [] };
  } catch {
    return { ids: [] };
  }
}

function writeStorage(state: FavoritesState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable; in-memory state (held by the hook) still works.
  }
}

export function loadFavorites(): string[] {
  return readStorage().ids;
}

export function isSaved(ids: readonly string[], id: string): boolean {
  return ids.includes(id);
}

/** Return the next list with `id` toggled. Pure; caller persists the result. */
export function toggleFavorite(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function persistFavorites(ids: readonly string[]): void {
  writeStorage({ ids: [...ids] });
}
