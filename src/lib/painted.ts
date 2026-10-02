/**
 * What you have already painted.
 *
 * The same local-first shape as favorites.ts: versioned key, safe wrapper,
 * pure helpers separate from persistence, degrades to in-memory when storage
 * is unavailable.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * What this deliberately cannot do
 * ─────────────────────────────────────────────────────────────────────────
 * PRODUCT.md is unusually firm here. ":38" - "the app must never punish a
 * missed day or apply pressure to keep a run alive. Practice history exists to
 * let someone look back with satisfaction, not to enforce consistency." ":94" -
 * "No pressure, ever. No streaks, no guilt, no achievement language."
 *
 * So this module holds a date per piece and **nothing here reads across those
 * dates**. There is no function for gaps, frequency, last-painted, longest run
 * or this-month-versus-last, and adding one would be the first step towards
 * the scoreboard this feature was held back to avoid. A streak cannot be
 * computed from this API; it would take new code, which is the point.
 */

const STORAGE_KEY = "little-wash:painted:v1";

export interface PaintedEntry {
  id: string;
  /**
   * The local calendar day, "YYYY-MM-DD".
   *
   * Day precision from the user's own clock, because "the day I painted it" is
   * what a person means. Never converted to UTC, and never recomputed later.
   */
  on: string;
}

export interface PaintedState {
  entries: PaintedEntry[];
}

/** Today, in the user's own timezone, at day precision. */
export function today(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isEntry(value: unknown): value is PaintedEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as PaintedEntry;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.on === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(entry.on)
  );
}

function readStorage(): PaintedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as PaintedState).entries)
    ) {
      return { entries: (parsed as PaintedState).entries.filter(isEntry) };
    }
    return { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeStorage(state: PaintedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable; in-memory state (held by the hook) still works.
  }
}

export function loadPainted(): PaintedEntry[] {
  return readStorage().entries;
}

export function isPainted(entries: readonly PaintedEntry[], id: string): boolean {
  return entries.some((entry) => entry.id === id);
}

/**
 * Return the next list with `id` marked or unmarked. Pure; caller persists.
 *
 * A set rather than a log: marking something already painted removes it, the
 * way the heart does. Marking it again afterwards writes the new day, so the
 * record says when you last did it rather than keeping a stale date.
 */
export function togglePainted(
  entries: readonly PaintedEntry[],
  id: string,
  on: string,
): PaintedEntry[] {
  return isPainted(entries, id)
    ? entries.filter((entry) => entry.id !== id)
    : [...entries, { id, on }];
}

export function persistPainted(entries: readonly PaintedEntry[]): void {
  writeStorage({ entries: [...entries] });
}

const replacedListeners = new Set<() => void>();

/** Hear when the stored record is replaced from outside the hook, here or in another tab. */
export function onPaintedReplaced(listener: () => void): () => void {
  replacedListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    replacedListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Replace this browser's record from outside the hook, as `replaceFavorites` does and for the same reason. */
export function replacePainted(entries: readonly PaintedEntry[]): void {
  try {
    if (entries.length === 0) localStorage.removeItem(STORAGE_KEY);
    else writeStorage({ entries: [...entries] });
  } catch {
    // Storage unavailable: the in-memory record is all there was.
  }
  for (const listener of replacedListeners) listener();
}
