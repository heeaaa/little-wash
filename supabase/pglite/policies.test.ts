// @vitest-environment node
/**
 * The database's own rules for saved and painted pieces, tested against the
 * real migration (see database.ts for how and why on PGlite).
 *
 * These are the rules CLAUDE.md asks to be proven rather than trusted: user A
 * cannot read or change user B's rows, and nobody signed out can do anything.
 * Each describe block runs twice - against a project that exposes nothing by
 * default (every Supabase project created since 30/05/2026) and against one
 * that grants everything by default (older projects) - because the migration
 * has to be right on both.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  as,
  asOwner,
  migratedDatabase,
  person,
  SIGNED_OUT,
  type ProjectDefaults,
} from "./database";

const ANA = "0b6f2c1e-0000-4000-8000-00000000000a";
const BEN = "0b6f2c1e-0000-4000-8000-00000000000b";

const TABLES = [
  { table: "saved_pieces", columns: "user_id, piece_id", values: "$1, $2" },
  { table: "painted_pieces", columns: "user_id, piece_id, painted_on", values: "$1, $2, '2026-09-14'" },
] as const;

const DEFAULTS: ProjectDefaults[] = ["exposes-nothing", "exposes-everything"];

describe.each(DEFAULTS)("on a project that %s by default", (defaults) => {
  let db: PGlite;

  beforeAll(async () => {
    db = await migratedDatabase(defaults);
  }, 30_000);

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await asOwner(db, "delete from auth.users");
    await asOwner(db, "insert into auth.users (id, email) values ($1, 'ana@example.test'), ($2, 'ben@example.test')", [ANA, BEN]);
    for (const [who, piece] of [
      [ANA, "ripe-pear"],
      [ANA, "blue-mug"],
      [BEN, "seashell"],
    ] as const) {
      await asOwner(db, "insert into public.saved_pieces (user_id, piece_id) values ($1, $2)", [who, piece]);
      await asOwner(
        db,
        "insert into public.painted_pieces (user_id, piece_id, painted_on) values ($1, $2, '2026-09-14')",
        [who, piece],
      );
    }
  });

  describe.each(TABLES)("$table", ({ table, columns, values }) => {
    it("shows a signed-in person their own rows and nobody else's", async () => {
      const ana = await as<{ piece_id: string }>(db, person(ANA), `select piece_id from public.${table} order by piece_id`);
      const ben = await as<{ piece_id: string }>(db, person(BEN), `select piece_id from public.${table}`);
      expect(ana.map((r) => r.piece_id)).toEqual(["blue-mug", "ripe-pear"]);
      expect(ben.map((r) => r.piece_id)).toEqual(["seashell"]);
    });

    it("refuses anyone signed out, whatever they try", async () => {
      await expect(as(db, SIGNED_OUT, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
      await expect(
        as(db, SIGNED_OUT, `insert into public.${table} (${columns}) values (${values})`, [ANA, "sneaky"]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        as(db, SIGNED_OUT, `update public.${table} set piece_id = 'changed'`),
      ).rejects.toThrow(/permission denied/);
      await expect(as(db, SIGNED_OUT, `delete from public.${table}`)).rejects.toThrow(/permission denied/);
    });

    it("lets a person add their own row", async () => {
      await as(db, person(ANA), `insert into public.${table} (${columns}) values (${values})`, [ANA, "new-piece"]);
      const rows = await asOwner(db, `select 1 from public.${table} where user_id = $1 and piece_id = 'new-piece'`, [ANA]);
      expect(rows).toHaveLength(1);
    });

    it("never lets a person add a row to someone else's account", async () => {
      await expect(
        as(db, person(ANA), `insert into public.${table} (${columns}) values (${values})`, [BEN, "planted"]),
      ).rejects.toThrow(/row-level security/);
      const rows = await asOwner(db, `select 1 from public.${table} where piece_id = 'planted'`);
      expect(rows).toHaveLength(0);
    });

    it("never lets a person change someone else's rows", async () => {
      const changed = await as(db, person(ANA), `update public.${table} set piece_id = 'hijacked' where user_id = $1 returning 1`, [BEN]);
      expect(changed).toHaveLength(0);
      const bens = await asOwner<{ piece_id: string }>(db, `select piece_id from public.${table} where user_id = $1`, [BEN]);
      expect(bens.map((r) => r.piece_id)).toEqual(["seashell"]);
    });

    it("never lets a person give their row to someone else", async () => {
      await expect(
        as(db, person(ANA), `update public.${table} set user_id = $1 where piece_id = 'ripe-pear'`, [BEN]),
      ).rejects.toThrow(/row-level security/);
    });

    it("never lets a person remove someone else's rows", async () => {
      const removed = await as(db, person(ANA), `delete from public.${table} where user_id = $1 returning 1`, [BEN]);
      expect(removed).toHaveLength(0);
      expect(await asOwner(db, `select 1 from public.${table} where user_id = $1`, [BEN])).toHaveLength(1);
    });

    it("lets a person remove their own rows, only theirs", async () => {
      const removed = await as(db, person(ANA), `delete from public.${table} returning piece_id`);
      expect(removed).toHaveLength(2);
      expect(await asOwner(db, `select 1 from public.${table} where user_id = $1`, [BEN])).toHaveLength(1);
    });

    /*
      A statement that names no column is the case that matters most. With a
      WHERE or RETURNING, Postgres also applies the SELECT policy, which hides
      other people's rows anyway - so those tests alone cannot tell whether the
      DELETE and UPDATE policies themselves are right. Found by mutation: a
      delete policy of `using (true)` passed every filtered test.
    */
    it("keeps an unfiltered delete to the person's own rows", async () => {
      await as(db, person(ANA), `delete from public.${table}`);
      expect(await asOwner(db, `select 1 from public.${table} where user_id = $1`, [ANA])).toHaveLength(0);
      expect(await asOwner(db, `select 1 from public.${table} where user_id = $1`, [BEN])).toHaveLength(1);
    });

    it("keeps an unfiltered update to the person's own rows", async () => {
      const column = table === "saved_pieces" ? "saved_at" : "marked_at";
      await as(db, person(ANA), `update public.${table} set ${column} = '2000-01-01T00:00:00Z'`);
      const bens = await asOwner<{ at: Date }>(db, `select ${column} as at from public.${table} where user_id = $1`, [BEN]);
      expect(bens[0]!.at.getUTCFullYear()).not.toBe(2000);
      const anas = await asOwner<{ at: Date }>(db, `select ${column} as at from public.${table} where user_id = $1`, [ANA]);
      expect(anas.every((row) => row.at.getUTCFullYear() === 2000)).toBe(true);
    });

    it("refuses TRUNCATE, which row level security cannot see", async () => {
      await expect(as(db, person(ANA), `truncate public.${table}`)).rejects.toThrow(/permission denied/);
      expect(await asOwner(db, `select 1 from public.${table}`)).toHaveLength(3);
    });

    it("accepts the catalogue's own id shapes and refuses anything else", async () => {
      // Real ids: an Unsplash suffix with capitals, a double hyphen, a museum number.
      for (const id of ["red-and-gold-grapes-xYPg", "colorful-grapefruit-and-lemon-half-on-a-vibrant--3606", "dogwood-vase-9317", "a_b"]) {
        await as(db, person(ANA), `insert into public.${table} (${columns}) values (${values})`, [ANA, id]);
      }
      for (const id of ["", "-leading-hyphen", "has space", "semi;colon", "accént", "x".repeat(121)]) {
        await expect(
          as(db, person(ANA), `insert into public.${table} (${columns}) values (${values})`, [ANA, id]),
        ).rejects.toThrow(/check constraint/);
      }
      // The longest allowed is 120 characters.
      await as(db, person(ANA), `insert into public.${table} (${columns}) values (${values})`, [ANA, "x".repeat(120)]);
    });

    it("keeps at most 1,000 pieces per person, and still lets one be saved again at the limit", async () => {
      await asOwner(db, `delete from public.${table} where user_id = $1`, [ANA]);
      const fill =
        table === "saved_pieces"
          ? "insert into public.saved_pieces (user_id, piece_id) select $1, 'piece-' || g from generate_series(1, 1000) g"
          : "insert into public.painted_pieces (user_id, piece_id, painted_on) select $1, 'piece-' || g, '2026-09-14' from generate_series(1, 1000) g";
      await asOwner(db, fill, [ANA]);

      await expect(
        as(db, person(ANA), `insert into public.${table} (${columns}) values (${values})`, [ANA, "one-too-many"]),
      ).rejects.toThrow(/at most 1000 pieces/);

      // The app saves with an upsert; saving a piece that is already there is not a new row.
      const again = await as(
        db,
        person(ANA),
        `insert into public.${table} (${columns}) values (${values})
           on conflict (user_id, piece_id) do update set piece_id = excluded.piece_id
           returning piece_id`,
        [ANA, "piece-7"],
      );
      expect(again).toHaveLength(1);

      // Someone else's full list is not this person's limit.
      await as(db, person(BEN), `insert into public.${table} (${columns}) values (${values})`, [BEN, "still-room"]);
    });

    /*
      Parallel requests each count only the rows already committed, so
      together they could pass the ceiling. Each request holds this person's
      list until it commits. PGlite has one connection and cannot race two
      requests; integration/account.test.ts does, against the real stack.
    */
    it("holds a person's list for one request at a time while it adds rows, and lets go at the end", async () => {
      const held = await db.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: ANA, role: "authenticated" }),
        ]);
        await tx.exec("set local role authenticated");
        await tx.query(`insert into public.${table} (${columns}) values (${values})`, [ANA, "held-piece"]);
        const locks = await tx.query<{ key: string }>(
          `select ((classid::bigint << 32) | objid::bigint)::text as key
             from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()`,
        );
        return locks.rows.map((row) => row.key);
      });
      const [expected] = await asOwner<{ key: string }>(db, "select hashtextextended($1, 0)::text as key", [
        `${table}:${ANA}`,
      ]);
      expect(held).toEqual([expected!.key]);
      expect(await asOwner(db, "select 1 from pg_locks where locktype = 'advisory'")).toEqual([]);
    });
  });

  it("upserts a saved piece the way the app does, keeping one row per piece", async () => {
    await as(
      db,
      person(ANA),
      `insert into public.saved_pieces (user_id, piece_id, saved_at) values ($1, 'ripe-pear', '2026-10-02T08:00:00Z')
         on conflict (user_id, piece_id) do update set saved_at = excluded.saved_at`,
      [ANA],
    );
    const rows = await asOwner<{ saved_at: Date }>(db, "select saved_at from public.saved_pieces where user_id = $1 and piece_id = 'ripe-pear'", [ANA]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.saved_at.toISOString()).toBe("2026-10-02T08:00:00.000Z");
  });

  it("keeps the painted day exactly as the person's device gave it", async () => {
    await as(
      db,
      person(ANA),
      "insert into public.painted_pieces (user_id, piece_id, painted_on) values ($1, 'late-night', '2026-12-31')",
      [ANA],
    );
    const rows = await asOwner<{ day: string }>(db, "select painted_on::text as day from public.painted_pieces where piece_id = 'late-night'");
    expect(rows[0]!.day).toBe("2026-12-31");
  });

  it("refuses painted days that are not real days in range", async () => {
    for (const day of ["1999-12-31", "2101-01-01"]) {
      await expect(
        as(db, person(ANA), "insert into public.painted_pieces (user_id, piece_id, painted_on) values ($1, 'odd-day', $2)", [ANA, day]),
      ).rejects.toThrow(/painted_on_range/);
    }
    await expect(
      as(db, person(ANA), "insert into public.painted_pieces (user_id, piece_id, painted_on) values ($1, 'odd-day', '2026-02-30')", [ANA]),
    ).rejects.toThrow(/out of range|invalid/);
  });

  describe("leaving", () => {
    it("removes an account's rows with it, and nobody else's", async () => {
      await asOwner(db, "delete from auth.users where id = $1", [ANA]);
      expect(await asOwner(db, "select 1 from public.saved_pieces where user_id = $1", [ANA])).toHaveLength(0);
      expect(await asOwner(db, "select 1 from public.painted_pieces where user_id = $1", [ANA])).toHaveLength(0);
      expect(await asOwner(db, "select 1 from public.saved_pieces where user_id = $1", [BEN])).toHaveLength(1);
    });

    it("lets a signed-in person delete their own account, and only theirs", async () => {
      await as(db, person(ANA), "select public.delete_my_account()");
      const users = await asOwner<{ email: string }>(db, "select email from auth.users");
      expect(users.map((u) => u.email)).toEqual(["ben@example.test"]);
      expect(await asOwner(db, "select 1 from public.painted_pieces where user_id = $1", [ANA])).toHaveLength(0);
      expect(await asOwner(db, "select 1 from public.painted_pieces where user_id = $1", [BEN])).toHaveLength(1);
    });

    it("cannot be called by anyone signed out", async () => {
      await expect(as(db, SIGNED_OUT, "select public.delete_my_account()")).rejects.toThrow(/permission denied/);
      expect(await asOwner(db, "select 1 from auth.users")).toHaveLength(2);
    });

    it("deletes nothing for a request that carries no person, even with the signed-in role", async () => {
      // A token with the authenticated role but no subject: auth.uid() is null.
      const noSubject = db.transaction(async (tx) => {
        await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: "authenticated" })]);
        await tx.exec("set local role authenticated");
        await tx.query("select public.delete_my_account()");
      });
      await expect(noSubject).rejects.toThrow(/Only a signed-in person/);
      expect(await asOwner(db, "select 1 from auth.users")).toHaveLength(2);
    });
  });
});
