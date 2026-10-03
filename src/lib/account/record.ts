/**
 * A signed-in person's saved and painted pieces, as this device holds them.
 *
 * Pure: no storage, no network, no clock - callers pass the time in. The
 * device shows this record at all times, so it renders at once and keeps
 * working without a connection; the sync in service.ts carries changes to the
 * account and brings the account's own changes back.
 *
 * The rules, each tested in record.test.ts:
 *
 * - One row per piece, as in the browser's own lists (favorites.ts,
 *   painted.ts) and the database (primary key user_id, piece_id).
 * - A piece whose latest change has not yet reached the account is "pending".
 *   When the account's rows come back, a pending piece keeps this device's
 *   version: an unsent change is never overwritten by older account data.
 * - A pending piece is cleared only once the account has the exact version it
 *   holds now, so a change made while a send is in flight is sent again.
 * - Like the browser's own record, nothing here reads across dates. There is
 *   no function for gaps, frequency or runs, by design (PRODUCT.md:94).
 */

export interface SavedRow {
  id: string;
  /** When it was saved, as an ISO timestamp. Orders the list. */
  at: string;
}

export interface PaintedRow {
  id: string;
  /** The person's own calendar day, "YYYY-MM-DD", never converted. */
  on: string;
  /** When it was marked, as an ISO timestamp. Orders pieces within a day. */
  at: string;
}

export interface AccountRecord {
  saved: SavedRow[];
  painted: PaintedRow[];
}

export type PieceList = "saved" | "painted";
export type PendingKey = `${PieceList}:${string}`;

export const EMPTY_RECORD: AccountRecord = { saved: [], painted: [] };

/** The database's own check, so nothing is queued that it would refuse. */
const PIECE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isPieceId(value: unknown): value is string {
  return typeof value === "string" && PIECE_ID.test(value);
}

/** A real calendar day inside the range the database accepts (2000-2100). */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DAY.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** An instant any engine can parse, normalised to `toISOString()` form. */
export function toInstant(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function pendingKey(list: PieceList, id: string): PendingKey {
  return `${list}:${id}`;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareInstant(a: string, b: string): number {
  return Date.parse(a) - Date.parse(b);
}

/** Oldest first, the order the browser's own list keeps (it appends). */
export function sortSaved(rows: readonly SavedRow[]): SavedRow[] {
  return [...rows].sort((a, b) => compareInstant(a.at, b.at) || compareText(a.id, b.id));
}

/**
 * By the day painted, then by when it was marked. On one device that is the
 * order things were marked in; pieces painted on another device fall into
 * place by their day, like pages in a sketchbook.
 */
export function sortPainted(rows: readonly PaintedRow[]): PaintedRow[] {
  return [...rows].sort(
    (a, b) => compareText(a.on, b.on) || compareInstant(a.at, b.at) || compareText(a.id, b.id),
  );
}

function withPending(pending: readonly PendingKey[], key: PendingKey): PendingKey[] {
  return pending.includes(key) ? [...pending] : [...pending, key];
}

/**
 * `at`, or a millisecond after the latest row if that is later. A new piece
 * always lands at the end, the way the browser's own lists append: two taps
 * in the same millisecond - or on a clock rounded to 100ms for privacy, as
 * Firefox can - would otherwise tie and fall back to alphabetical order.
 * Found by a test running on a frozen clock.
 */
function afterLatest(rows: readonly { at: string }[], at: string): string {
  const latest = rows.reduce((max, row) => Math.max(max, Date.parse(row.at)), Number.NEGATIVE_INFINITY);
  const wanted = Date.parse(at);
  return latest >= wanted ? new Date(latest + 1).toISOString() : at;
}

/** Save the piece, or unsave it if it is already saved - the heart's toggle. */
export function toggleSaved(
  record: AccountRecord,
  pending: readonly PendingKey[],
  id: string,
  at: string,
): { record: AccountRecord; pending: PendingKey[] } {
  const saved = record.saved.some((row) => row.id === id)
    ? record.saved.filter((row) => row.id !== id)
    : sortSaved([...record.saved, { id, at: afterLatest(record.saved, at) }]);
  return { record: { ...record, saved }, pending: withPending(pending, pendingKey("saved", id)) };
}

/**
 * Mark the piece painted on `on`, or unmark it. As on the device: a set, not a
 * log, so marking it again later writes the new day.
 */
export function togglePainted(
  record: AccountRecord,
  pending: readonly PendingKey[],
  id: string,
  on: string,
  at: string,
): { record: AccountRecord; pending: PendingKey[] } {
  const painted = record.painted.some((row) => row.id === id)
    ? record.painted.filter((row) => row.id !== id)
    : sortPainted([...record.painted, { id, on, at: afterLatest(record.painted, at) }]);
  return { record: { ...record, painted }, pending: withPending(pending, pendingKey("painted", id)) };
}

/**
 * The account's rows with this device's unsent changes laid over them.
 *
 * For every pending piece the device's version wins - present or absent - and
 * every other piece is exactly what the account says, so a piece saved on the
 * phone appears here and one removed there goes.
 */
export function overlay(
  account: AccountRecord,
  device: AccountRecord,
  pending: readonly PendingKey[],
): AccountRecord {
  const waiting = new Set(pending);
  const keep = <T extends { id: string }>(list: PieceList, accountRows: T[], deviceRows: T[]) => [
    ...accountRows.filter((row) => !waiting.has(pendingKey(list, row.id))),
    ...deviceRows.filter((row) => waiting.has(pendingKey(list, row.id))),
  ];
  return {
    saved: sortSaved(keep("saved", account.saved, device.saved)),
    painted: sortPainted(keep("painted", account.painted, device.painted)),
  };
}

/** One piece's latest state, as it is sent: the row, or null for "not there". */
export type Change =
  | { key: PendingKey; list: "saved"; id: string; row: SavedRow | null }
  | { key: PendingKey; list: "painted"; id: string; row: PaintedRow | null };

/** What sending the pending pieces means: an upsert or a delete for each. */
export function changesFor(record: AccountRecord, pending: readonly PendingKey[]): Change[] {
  const changes: Change[] = [];
  for (const key of pending) {
    const split = key.indexOf(":");
    const list = key.slice(0, split);
    const id = key.slice(split + 1);
    if (list === "saved") {
      changes.push({ key, list, id, row: record.saved.find((row) => row.id === id) ?? null });
    } else if (list === "painted") {
      changes.push({ key, list, id, row: record.painted.find((row) => row.id === id) ?? null });
    }
  }
  return changes;
}

function sameRow(a: SavedRow | PaintedRow | null, b: SavedRow | PaintedRow | null): boolean {
  if (a === null || b === null) return a === b;
  return a.id === b.id && a.at === b.at && ("on" in a ? "on" in b && a.on === b.on : !("on" in b));
}

/**
 * The pieces still pending after a send: everything not `settled`, and any
 * settled piece that has changed again since it was sent.
 */
export function settle(
  record: AccountRecord,
  pending: readonly PendingKey[],
  sent: readonly Change[],
  settled: ReadonlySet<PendingKey>,
): PendingKey[] {
  const now = new Map(changesFor(record, pending).map((change) => [change.key, change.row]));
  const sentRows = new Map(sent.map((change) => [change.key, change.row]));
  return pending.filter((key) => {
    if (!settled.has(key) || !sentRows.has(key)) return true;
    return !sameRow(now.get(key) ?? null, sentRows.get(key) ?? null);
  });
}

/** What this browser held before anyone signed in. */
export interface GuestLibrary {
  saved: readonly string[];
  painted: readonly { id: string; on: string }[];
}

export interface MergeResult {
  record: AccountRecord;
  pending: PendingKey[];
  /** Pieces that are new to the account, for the notice that says so. */
  added: { saved: number; painted: number };
}

/**
 * Move this browser's pieces into the account, on first sign-in.
 *
 * Nothing is lost: every saved piece the account lacks is added, after what
 * the account already has, in the order it was saved here. Every painted
 * piece the account lacks is added on its own day, and a piece painted in
 * both places keeps the later day - the browser's record keeps the last time
 * you painted something, and so does this.
 */
export function mergeGuest(
  record: AccountRecord,
  pending: readonly PendingKey[],
  guest: GuestLibrary,
  now: Date,
): MergeResult {
  let next: PendingKey[] = [...pending];
  const saved = [...record.saved];
  const painted = [...record.painted];
  const added = { saved: 0, painted: 0 };

  guest.saved.forEach((id, index) => {
    if (!isPieceId(id) || saved.some((row) => row.id === id)) return;
    // A millisecond apart, so their order here survives the account's sort.
    saved.push({ id, at: new Date(now.getTime() + index).toISOString() });
    next = withPending(next, pendingKey("saved", id));
    added.saved += 1;
  });

  guest.painted.forEach(({ id, on }, index) => {
    if (!isPieceId(id) || !isDay(on)) return;
    // Midday on its own day: it was marked that day, at a time this browser
    // never recorded. The index keeps the browser's order within one day.
    const at = new Date(Date.parse(`${on}T12:00:00.000Z`) + index).toISOString();
    const existing = painted.findIndex((row) => row.id === id);
    if (existing === -1) {
      painted.push({ id, on, at });
      added.painted += 1;
    } else if (on > painted[existing]!.on) {
      painted[existing] = { id, on, at };
    } else {
      return;
    }
    next = withPending(next, pendingKey("painted", id));
  });

  return { record: { saved: sortSaved(saved), painted: sortPainted(painted) }, pending: next, added };
}

/**
 * A record read back from storage or the network, with anything malformed
 * dropped rather than trusted: a bad id, a day that is not a day, a duplicate.
 */
export function parseRecord(value: unknown): AccountRecord {
  const source = (value && typeof value === "object" ? value : {}) as {
    saved?: unknown;
    painted?: unknown;
  };
  const saved = new Map<string, SavedRow>();
  for (const row of Array.isArray(source.saved) ? source.saved : []) {
    const candidate = row as Partial<SavedRow> | null;
    const at = toInstant(candidate?.at);
    if (candidate && isPieceId(candidate.id) && at) saved.set(candidate.id, { id: candidate.id, at });
  }
  const painted = new Map<string, PaintedRow>();
  for (const row of Array.isArray(source.painted) ? source.painted : []) {
    const candidate = row as Partial<PaintedRow> | null;
    const at = toInstant(candidate?.at);
    if (candidate && isPieceId(candidate.id) && isDay(candidate.on) && at) {
      painted.set(candidate.id, { id: candidate.id, on: candidate.on, at });
    }
  }
  return { saved: sortSaved([...saved.values()]), painted: sortPainted([...painted.values()]) };
}

/** Pending keys read back from storage, keeping only well-formed ones. */
export function parsePending(value: unknown): PendingKey[] {
  if (!Array.isArray(value)) return [];
  const keys: PendingKey[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const split = item.indexOf(":");
    const list = item.slice(0, split);
    const id = item.slice(split + 1);
    if ((list === "saved" || list === "painted") && isPieceId(id)) {
      const key = pendingKey(list, id);
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}
