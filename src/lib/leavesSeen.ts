/**
 * Which leaves on the painted tree have already been seen arriving.
 *
 * A new leaf grows in front of you once - the first time the tree is on screen
 * after the piece was marked painted - and is simply there after that. Without
 * this record the arrival would replay on every visit, and a quiet record
 * would turn into a fanfare (DESIGN.md: nothing replays an entrance).
 *
 * The same local-first shape as favorites.ts and painted.ts. It holds piece
 * ids and nothing else: no dates, no counts, nothing that could say how often
 * anyone paints. When storage is unavailable the record lives in memory, so a
 * leaf arrives once per visit rather than every time the studio is opened.
 */

const STORAGE_KEY = "little-wash:leaves-seen:v1";

/** How many leaves may arrive together; any more are simply there already. */
export const ARRIVALS_AT_ONCE = 6;

let memory: string[] = [];
/** Set once a write has failed: storage then holds a stale record, not ours. */
let unwritable = false;

function readStorage(): string[] {
  /*
    Different failures, kept apart. Storage that cannot be reached, or that
    has stopped taking writes (a full quota), falls back to what this visit
    remembers - a stale stored record would have every leaf arrive again on
    every visit. Stored data that cannot be read is simply nothing seen yet,
    and must not resurrect an older in-memory record.
  */
  if (unwritable) return memory;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return memory;
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { ids: unknown }).ids)) {
      return (parsed as { ids: unknown[] }).ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      );
    }
    return [];
  } catch {
    return [];
  }
}

export function loadSeenLeaves(): string[] {
  return readStorage();
}

/**
 * Remember these as seen, and only these: a piece that has been unmarked
 * drops out, so marking it painted again grows its leaf again.
 */
export function persistSeenLeaves(ids: readonly string[]): void {
  memory = [...ids];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: memory }));
    unwritable = false;
  } catch {
    // Storage unavailable or full; the in-memory record still stops a replay.
    unwritable = true;
  }
}

/**
 * Forget every leaf seen. Signing out removes an account's pieces from this
 * browser, and this record names some of them, so it goes too.
 */
export function clearSeenLeaves(): void {
  memory = [];
  unwritable = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: memory, now empty, was the whole record.
  }
}

/**
 * The leaves still to arrive, oldest first: the pieces in `painted` (in the
 * order they were painted) that have not been seen, and at most the newest
 * `limit` of those. Older unseen leaves are already there - someone opening
 * the studio for the first time with twenty pieces painted watches the last
 * few grow, not twenty.
 */
export function leavesToArrive(
  painted: readonly string[],
  seen: readonly string[],
  limit = ARRIVALS_AT_ONCE,
): string[] {
  const known = new Set(seen);
  const unseen = painted.filter((id) => !known.has(id));
  return limit > 0 ? unseen.slice(-limit) : [];
}
