import { describe, expect, it } from "vitest";
import {
  EMPTY_RECORD,
  changesFor,
  isDay,
  isPieceId,
  mergeGuest,
  overlay,
  parsePending,
  parseRecord,
  pendingKey,
  settle,
  sortPainted,
  sortSaved,
  toInstant,
  togglePainted,
  toggleSaved,
  type AccountRecord,
} from "./record";

const T1 = "2026-10-01T08:00:00.000Z";
const T2 = "2026-10-01T09:00:00.000Z";
const T3 = "2026-10-01T10:00:00.000Z";

describe("what counts as a piece id and a day", () => {
  it("accepts the catalogue's own ids and refuses the rest, like the database", () => {
    for (const id of ["dogwood-vase-9317", "red-and-gold-grapes-xYPg", "colorful-grapefruit-and-lemon-half-on-a-vibrant--3606", "a_b", "x".repeat(120)]) {
      expect(isPieceId(id)).toBe(true);
    }
    for (const id of ["", "-leading", "has space", "semi;colon", "accént", "x".repeat(121), 42, null]) {
      expect(isPieceId(id)).toBe(false);
    }
  });

  it("accepts real calendar days in the database's range only", () => {
    expect(isDay("2026-09-14")).toBe(true);
    expect(isDay("2024-02-29")).toBe(true);
    for (const day of ["2026-02-30", "2025-02-29", "2026-13-01", "1999-12-31", "2101-01-01", "14/09/2026", "2026-9-14", 20260914]) {
      expect(isDay(day)).toBe(false);
    }
  });

  it("normalises any parseable instant and refuses the rest", () => {
    // The REST API writes timestamptz as +00:00; the device writes Z.
    expect(toInstant("2026-10-01T08:00:00+00:00")).toBe(T1);
    expect(toInstant("2026-10-01T21:00:00+13:00")).toBe(T1);
    expect(toInstant("not a time")).toBeNull();
    expect(toInstant("")).toBeNull();
    expect(toInstant(undefined)).toBeNull();
  });
});

describe("toggling", () => {
  it("saves a piece after the others and marks it pending, once", () => {
    const first = toggleSaved(EMPTY_RECORD, [], "pear", T2);
    const second = toggleSaved(first.record, first.pending, "mug", T3);
    expect(second.record.saved.map((r) => r.id)).toEqual(["pear", "mug"]);
    expect(second.pending).toEqual([pendingKey("saved", "pear"), pendingKey("saved", "mug")]);

    const again = toggleSaved(second.record, second.pending, "pear", T3);
    expect(again.record.saved.map((r) => r.id)).toEqual(["mug"]);
    // Still one pending entry for the pear: its latest state is "not saved".
    expect(again.pending).toEqual([pendingKey("saved", "pear"), pendingKey("saved", "mug")]);
  });

  it("marks painted on a day, and marking again later writes the new day", () => {
    const marked = togglePainted(EMPTY_RECORD, [], "pear", "2026-09-14", T1);
    expect(marked.record.painted).toEqual([{ id: "pear", on: "2026-09-14", at: T1 }]);
    const unmarked = togglePainted(marked.record, marked.pending, "pear", "2026-10-02", T2);
    expect(unmarked.record.painted).toEqual([]);
    const remarked = togglePainted(unmarked.record, unmarked.pending, "pear", "2026-10-02", T3);
    expect(remarked.record.painted).toEqual([{ id: "pear", on: "2026-10-02", at: T3 }]);
    expect(remarked.pending).toEqual([pendingKey("painted", "pear")]);
  });

  it("keeps the order things were saved in, even in the same millisecond", () => {
    // Firefox can round the clock to 100ms; two quick taps then share a time.
    const one = toggleSaved(EMPTY_RECORD, [], "pear", T1);
    const two = toggleSaved(one.record, one.pending, "mug", T1);
    const three = toggleSaved(two.record, two.pending, "apple", T1);
    expect(three.record.saved.map((r) => r.id)).toEqual(["pear", "mug", "apple"]);
    // And after a row whose clock ran ahead of this one.
    const ahead = toggleSaved({ saved: [{ id: "from-a-fast-clock", at: T3 }], painted: [] }, [], "now", T1);
    expect(ahead.record.saved.map((r) => r.id)).toEqual(["from-a-fast-clock", "now"]);

    const painted = togglePainted(EMPTY_RECORD, [], "zebra", "2026-10-02", T1);
    const second = togglePainted(painted.record, painted.pending, "ant", "2026-10-02", T1);
    expect(second.record.painted.map((r) => r.id)).toEqual(["zebra", "ant"]);
  });

  it("keeps saving and painting independent", () => {
    const saved = toggleSaved(EMPTY_RECORD, [], "pear", T1);
    const painted = togglePainted(saved.record, saved.pending, "pear", "2026-09-14", T2);
    expect(painted.record.saved).toHaveLength(1);
    expect(painted.record.painted).toHaveLength(1);
    expect(painted.pending).toEqual([pendingKey("saved", "pear"), pendingKey("painted", "pear")]);
  });
});

describe("order", () => {
  it("lists saved pieces oldest first, ties by id", () => {
    expect(
      sortSaved([
        { id: "b", at: T2 },
        { id: "c", at: T1 },
        { id: "a", at: T2 },
      ]).map((r) => r.id),
    ).toEqual(["c", "a", "b"]);
  });

  it("lists painted pieces by their day, then by when they were marked", () => {
    expect(
      sortPainted([
        { id: "late-mark-early-day", on: "2026-09-01", at: T3 },
        { id: "second", on: "2026-09-14", at: T2 },
        { id: "first", on: "2026-09-14", at: T1 },
      ]).map((r) => r.id),
    ).toEqual(["late-mark-early-day", "first", "second"]);
  });
});

describe("hearing back from the account", () => {
  const account: AccountRecord = {
    saved: [
      { id: "from-the-phone", at: T1 },
      { id: "removed-here", at: T1 },
    ],
    painted: [{ id: "painted-there", on: "2026-09-20", at: T1 }],
  };

  it("takes the account's version of every piece that has no unsent change", () => {
    const device: AccountRecord = { saved: [{ id: "stale", at: T1 }], painted: [] };
    const result = overlay(account, device, []);
    expect(result.saved.map((r) => r.id)).toEqual(["from-the-phone", "removed-here"]);
    expect(result.painted.map((r) => r.id)).toEqual(["painted-there"]);
  });

  it("keeps this device's version of every piece with an unsent change, present or absent", () => {
    const device: AccountRecord = {
      saved: [
        { id: "from-the-phone", at: T1 },
        { id: "saved-offline", at: T3 },
      ],
      painted: [],
    };
    const pending = [pendingKey("saved", "removed-here"), pendingKey("saved", "saved-offline"), pendingKey("painted", "painted-there")];
    const result = overlay(account, device, pending);
    expect(result.saved.map((r) => r.id)).toEqual(["from-the-phone", "saved-offline"]);
    // Unmarked here while offline: stays unmarked, whatever the account says.
    expect(result.painted).toEqual([]);
  });
});

describe("sending", () => {
  const record: AccountRecord = {
    saved: [{ id: "pear", at: T1 }],
    painted: [{ id: "mug", on: "2026-09-14", at: T2 }],
  };

  it("turns each pending piece into an upsert or a delete", () => {
    const changes = changesFor(record, [pendingKey("saved", "pear"), pendingKey("saved", "gone"), pendingKey("painted", "mug")]);
    expect(changes).toEqual([
      { key: "saved:pear", list: "saved", id: "pear", row: { id: "pear", at: T1 } },
      { key: "saved:gone", list: "saved", id: "gone", row: null },
      { key: "painted:mug", list: "painted", id: "mug", row: { id: "mug", on: "2026-09-14", at: T2 } },
    ]);
  });

  it("clears a piece once the account has exactly what it holds now", () => {
    const pending = [pendingKey("saved", "pear"), pendingKey("painted", "mug")];
    const sent = changesFor(record, pending);
    expect(settle(record, pending, sent, new Set(pending))).toEqual([]);
  });

  it("keeps a piece pending when it changed again while the send was in flight", () => {
    const pending = [pendingKey("saved", "pear")];
    const sent = changesFor(record, pending);
    // The pear was unsaved after the request left.
    const now: AccountRecord = { ...record, saved: [] };
    expect(settle(now, pending, sent, new Set(pending))).toEqual(["saved:pear"]);
    // And a painted day that changed is a different row too.
    const paintedPending = [pendingKey("painted", "mug")];
    const paintedSent = changesFor(record, paintedPending);
    const remarked: AccountRecord = { ...record, painted: [{ id: "mug", on: "2026-10-02", at: T3 }] };
    expect(settle(remarked, paintedPending, paintedSent, new Set(paintedPending))).toEqual(["painted:mug"]);
  });

  it("keeps everything that was not settled, and anything changed since that was never sent", () => {
    const pending = [pendingKey("saved", "pear"), pendingKey("painted", "mug"), pendingKey("saved", "new")];
    const sent = changesFor(record, [pendingKey("saved", "pear"), pendingKey("painted", "mug")]);
    expect(settle(record, pending, sent, new Set([pendingKey("saved", "pear")]))).toEqual(["painted:mug", "saved:new"]);
  });
});

describe("first sign-in: this browser's pieces move into the account", () => {
  const NOW = new Date("2026-10-02T08:00:00.000Z");
  const account: AccountRecord = {
    saved: [{ id: "already-saved", at: T1 }],
    painted: [
      { id: "painted-earlier-there", on: "2026-09-01", at: T1 },
      { id: "painted-later-there", on: "2026-09-30", at: T1 },
    ],
  };

  it("adds every saved piece the account lacks, after its own, in this browser's order", () => {
    const result = mergeGuest(account, [], { saved: ["b-second", "already-saved", "a-first"].reverse(), painted: [] }, NOW);
    expect(result.record.saved.map((r) => r.id)).toEqual(["already-saved", "a-first", "b-second"]);
    expect(result.added).toEqual({ saved: 2, painted: 0 });
    expect(result.pending).toEqual(["saved:a-first", "saved:b-second"]);
  });

  it("adds painted pieces on their own day, so they fall into place", () => {
    const result = mergeGuest(account, [], { saved: [], painted: [{ id: "mid-september", on: "2026-09-14" }] }, NOW);
    expect(result.record.painted.map((r) => r.id)).toEqual(["painted-earlier-there", "mid-september", "painted-later-there"]);
    expect(result.added.painted).toBe(1);
  });

  it("keeps the later day for a piece painted in both places, and does not count it as new", () => {
    const result = mergeGuest(
      account,
      [],
      {
        saved: [],
        painted: [
          { id: "painted-earlier-there", on: "2026-09-20" },
          { id: "painted-later-there", on: "2026-09-02" },
        ],
      },
      NOW,
    );
    const days = Object.fromEntries(result.record.painted.map((r) => [r.id, r.on]));
    expect(days).toEqual({ "painted-earlier-there": "2026-09-20", "painted-later-there": "2026-09-30" });
    expect(result.added.painted).toBe(0);
    // Only the one that changed has to be sent.
    expect(result.pending).toEqual(["painted:painted-earlier-there"]);
  });

  it("drops anything malformed rather than sending what the account would refuse", () => {
    const result = mergeGuest(
      EMPTY_RECORD,
      [],
      { saved: ["fine", "has space", ""], painted: [{ id: "ok", on: "2026-02-30" }, { id: "bad id!", on: "2026-09-14" }] },
      NOW,
    );
    expect(result.record.saved.map((r) => r.id)).toEqual(["fine"]);
    expect(result.record.painted).toEqual([]);
  });

  it("changes nothing the second time", () => {
    const guest = { saved: ["a"], painted: [{ id: "b", on: "2026-09-14" }] };
    const once = mergeGuest(account, [], guest, NOW);
    const twice = mergeGuest(once.record, once.pending, guest, NOW);
    expect(twice.record).toEqual(once.record);
    expect(twice.added).toEqual({ saved: 0, painted: 0 });
    expect(twice.pending).toEqual(once.pending);
  });
});

describe("reading back what was stored", () => {
  it("keeps well-formed rows and drops the rest", () => {
    const record = parseRecord({
      saved: [{ id: "pear", at: T2 }, { id: "pear", at: T3 }, { id: "bad id", at: T1 }, { id: "no-time" }, null, "x"],
      painted: [{ id: "mug", on: "2026-09-14", at: "2026-10-01T21:00:00+13:00" }, { id: "odd", on: "2026-02-30", at: T1 }],
    });
    expect(record.saved).toEqual([{ id: "pear", at: T3 }]);
    expect(record.painted).toEqual([{ id: "mug", on: "2026-09-14", at: T1 }]);
  });

  it("treats anything that is not a record as empty", () => {
    for (const value of [null, undefined, 3, "text", [], { saved: "no" }]) {
      expect(parseRecord(value)).toEqual(EMPTY_RECORD);
    }
  });

  it("keeps only well-formed pending keys, once each", () => {
    expect(parsePending(["saved:a", "saved:a", "painted:b", "other:c", "saved:", "saved:bad id", 7, "saved"])).toEqual([
      "saved:a",
      "painted:b",
    ]);
    expect(parsePending("saved:a")).toEqual([]);
  });
});
