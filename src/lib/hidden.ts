/**
 * Pieces someone has said are not for them.
 *
 * Today, "Deal me another" and Browse leave these out; nothing else does.
 * Saved, Painted and the series are deliberate choices and stay as they are
 * (docs/plans/not-for-me-reminders-curation.md, Phase 1).
 *
 * Shaped exactly like favorites.ts: local-first, in localStorage behind a
 * versioned key, in memory when storage is unavailable, and followed across
 * open tabs. When someone signs in, the list moves into their account
 * (src/lib/account) like the other two.
 */

export const HIDDEN_KEY = "little-wash:hidden:v1";

interface HiddenState {
  ids: string[];
}

function readStorage(): HiddenState {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (!raw) return { ids: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as HiddenState).ids)) {
      const ids: string[] = [];
      for (const id of (parsed as HiddenState).ids) {
        if (typeof id === "string" && id.length > 0 && !ids.includes(id)) ids.push(id);
      }
      return { ids };
    }
    return { ids: [] };
  } catch {
    return { ids: [] };
  }
}

function writeStorage(state: HiddenState): void {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable; the in-memory list held by the hook still works.
  }
}

export function loadHidden(): string[] {
  return readStorage().ids;
}

export function isHidden(ids: readonly string[], id: string): boolean {
  return ids.includes(id);
}

/** The next list with `id` hidden, or shown again if it already was. Pure. */
export function toggleHidden(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function persistHidden(ids: readonly string[]): void {
  writeStorage({ ids: [...ids] });
}

const replacedListeners = new Set<() => void>();

/**
 * Hear when the stored list is replaced from outside the hook: by
 * `replaceHidden` in this tab, or by another tab. See onFavoritesReplaced.
 */
export function onHiddenReplaced(listener: () => void): () => void {
  replacedListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === HIDDEN_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    replacedListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Replace this browser's list from outside the hook: emptied when signing in
 * moves it into the account, put back if the session ends before the account
 * has it. See replaceFavorites.
 */
export function replaceHidden(ids: readonly string[]): void {
  try {
    if (ids.length === 0) localStorage.removeItem(HIDDEN_KEY);
    else writeStorage({ ids: [...ids] });
  } catch {
    // Storage unavailable: the in-memory list is all there was.
  }
  for (const listener of replacedListeners) listener();
}
