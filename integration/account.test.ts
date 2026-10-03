/**
 * Saved and painted pieces against a real local Supabase stack: the real
 * migrations, Auth (GoTrue), the REST API (PostgREST) and its gateway, reached
 * through the app's own backend module exactly as the browser reaches them.
 *
 * This is what proves supabase/pglite's stand-in right. Each test makes its
 * own people with unique emails, signed in with a password (the local stack's
 * email provider is on for this; the hosted project's is off and uses Google).
 */

import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBackend } from "@/lib/account/supabaseBackend";
import { AUTH_STORAGE_KEY } from "@/lib/account/device";
import type { AccountBackend } from "@/lib/account/backend";
import type { Change } from "@/lib/account/record";
import { integrationEnv, memoryStorage, type IntegrationEnv } from "./env";

let env: IntegrationEnv;
let admin: SupabaseClient;

interface Person {
  id: string;
  email: string;
  password: string;
  /** supabase-js signed in as this person, for raw requests. */
  client: SupabaseClient;
  /** The app's own backend, signed in as this person. */
  backend: AccountBackend;
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

async function signIn(email: string, password: string) {
  const client = createClient(env.url, env.publishableKey, noSession);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("no session");
  return { client, session: data.session };
}

async function person(name: string): Promise<Person> {
  const email = `${name}-${randomUUID()}@example.test`;
  const password = randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const { client, session } = await signIn(email, password);
  const backend = createSupabaseBackend(
    { url: env.url, publishableKey: env.publishableKey, host: new URL(env.url).host },
    { storage: memoryStorage({ [AUTH_STORAGE_KEY]: JSON.stringify(session) }) },
  );
  const started = await backend.start();
  expect(started.user?.id).toBe(created.data.user!.id);
  return { id: created.data.user!.id, email, password, client, backend };
}

const saved = (id: string, at = "2026-10-02T08:00:00.000Z"): Change => ({
  key: `saved:${id}`,
  list: "saved",
  id,
  row: { id, at },
});
const painted = (id: string, on = "2026-10-02", at = "2026-10-02T08:00:00.000Z"): Change => ({
  key: `painted:${id}`,
  list: "painted",
  id,
  row: { id, on, at },
});
const unsaved = (id: string): Change => ({ key: `saved:${id}`, list: "saved", id, row: null });

async function rowsAsAdmin(table: "saved_pieces" | "painted_pieces", userId: string) {
  const { data, error } = await admin.from(table).select("piece_id").eq("user_id", userId).order("piece_id");
  if (error) throw error;
  return (data ?? []).map((row: { piece_id: string }) => row.piece_id);
}

beforeAll(() => {
  env = integrationEnv();
  admin = createClient(env.url, env.secretKey, noSession);
});

describe("a signed-in person's own pieces", () => {
  it("are kept and read back in order, through the app's own requests", async () => {
    const ana = await person("ana");
    const result = await ana.backend.push(ana.id, [
      saved("second", "2026-10-02T08:00:01.000Z"),
      saved("first", "2026-10-02T08:00:00.000Z"),
      painted("late-day", "2026-10-02"),
      painted("early-day", "2026-09-14", "2026-10-02T09:00:00.000Z"),
    ]);
    expect(result).toEqual({
      confirmed: ["saved:second", "saved:first", "painted:late-day", "painted:early-day"],
      refused: [],
      problem: null,
    });

    const record = await ana.backend.fetchRecord(ana.id);
    expect(record.saved.map((r) => r.id)).toEqual(["first", "second"]);
    expect(record.painted).toEqual([
      { id: "early-day", on: "2026-09-14", at: "2026-10-02T09:00:00.000Z" },
      { id: "late-day", on: "2026-10-02", at: "2026-10-02T08:00:00.000Z" },
    ]);
  });

  it("keep one row per piece when saved again, and go when unsaved", async () => {
    const ana = await person("ana");
    await ana.backend.push(ana.id, [saved("pear", "2026-10-01T08:00:00.000Z")]);
    await ana.backend.push(ana.id, [saved("pear", "2026-10-02T08:00:00.000Z")]);
    expect((await ana.backend.fetchRecord(ana.id)).saved).toEqual([{ id: "pear", at: "2026-10-02T08:00:00.000Z" }]);
    expect((await ana.backend.push(ana.id, [unsaved("pear")])).confirmed).toEqual(["saved:pear"]);
    expect(await rowsAsAdmin("saved_pieces", ana.id)).toEqual([]);
  });
});

describe("everyone else", () => {
  it("cannot read a person's pieces", async () => {
    const ana = await person("ana");
    const ben = await person("ben");
    await ana.backend.push(ana.id, [saved("anas-pear"), painted("anas-mug")]);

    // Asking for Ana's rows by her id, as Ben: row level security returns none.
    expect(await ben.backend.fetchRecord(ana.id)).toEqual({ saved: [], painted: [] });
    // And an unfiltered read shows Ben only his own.
    const { data } = await ben.client.from("saved_pieces").select("user_id, piece_id");
    expect(data).toEqual([]);
  });

  it("cannot add, change or remove a person's pieces", async () => {
    const ana = await person("ana");
    const ben = await person("ben");
    await ana.backend.push(ana.id, [saved("anas-pear")]);

    const planted = await ben.backend.push(ana.id, [saved("planted-by-ben")]);
    expect(planted.confirmed).toEqual([]);
    expect(planted.problem).not.toBeNull();

    const update = await ben.client.from("saved_pieces").update({ saved_at: "2000-01-01T00:00:00Z" }).eq("user_id", ana.id).select();
    expect(update.data).toEqual([]);
    const removal = await ben.client.from("saved_pieces").delete().eq("user_id", ana.id).select();
    expect(removal.data).toEqual([]);

    expect(await rowsAsAdmin("saved_pieces", ana.id)).toEqual(["anas-pear"]);
  });

  it("who is signed out can do nothing at all", async () => {
    const ana = await person("ana");
    await ana.backend.push(ana.id, [saved("anas-pear")]);
    const anonymous = createClient(env.url, env.publishableKey, noSession);

    const read = await anonymous.from("saved_pieces").select("*");
    expect(read.error?.code).toBe("42501");
    const write = await anonymous.from("painted_pieces").insert({ user_id: ana.id, piece_id: "x", painted_on: "2026-10-02" });
    expect(write.error?.code).toBe("42501");
    const leave = await anonymous.rpc("delete_my_account");
    expect(leave.error).not.toBeNull();
    expect(await rowsAsAdmin("saved_pieces", ana.id)).toEqual(["anas-pear"]);
  });
});

describe("the database's limits", () => {
  it("refuse a piece id that is not a catalogue id, for good, and only that piece", async () => {
    const ana = await person("ana");
    // Both rows travel in one upsert, which the check refuses as a whole; the
    // backend then sends each on its own.
    const result = await ana.backend.push(ana.id, [saved("has space"), saved("fine-piece")]);
    expect(result).toEqual({ confirmed: ["saved:fine-piece"], refused: ["saved:has space"], problem: null });
    expect(await rowsAsAdmin("saved_pieces", ana.id)).toEqual(["fine-piece"]);
  });

  it("refuse a 1,001st piece, and still take a piece saved again", async () => {
    const ana = await person("ana");
    const rows = Array.from({ length: 1000 }, (_, index) => ({ user_id: ana.id, piece_id: `piece-${index}` }));
    const filled = await admin.from("saved_pieces").insert(rows);
    expect(filled.error).toBeNull();

    expect((await ana.backend.push(ana.id, [saved("one-too-many")])).refused).toEqual(["saved:one-too-many"]);
    expect((await ana.backend.push(ana.id, [saved("piece-7")])).confirmed).toEqual(["saved:piece-7"]);
    // And the whole list still reads back in one request.
    expect((await ana.backend.fetchRecord(ana.id)).saved).toHaveLength(1000);
  });

  it("are not passed by requests sent at the same moment", async () => {
    const ana = await person("ana");
    // Four requests of 400 new pieces, at once: 1,600 together. Each counts
    // only rows already committed, so without the trigger's lock all four
    // could fit. With it they take turns, and exactly two do.
    const batch = (from: number) =>
      Array.from({ length: 400 }, (_, index) => ({ user_id: ana.id, piece_id: `piece-${from + index}` }));
    const results = await Promise.all(
      [0, 400, 800, 1200].map((from) => ana.client.from("saved_pieces").insert(batch(from))),
    );

    const refused = results.filter((result) => result.error !== null);
    expect(refused).toHaveLength(2);
    for (const result of refused) expect(result.error?.message).toMatch(/at most 1000 pieces/);
    expect(await rowsAsAdmin("saved_pieces", ana.id)).toHaveLength(800);
  });
});

describe("leaving", () => {
  it("deletes the account and its pieces, and nobody else's", async () => {
    const ana = await person("ana");
    const ben = await person("ben");
    await ana.backend.push(ana.id, [saved("anas-pear"), painted("anas-mug")]);
    await ben.backend.push(ben.id, [saved("bens-pear")]);

    await ana.backend.deleteAccount();

    const gone = await admin.auth.admin.getUserById(ana.id);
    expect(gone.data.user).toBeNull();
    expect(await rowsAsAdmin("saved_pieces", ana.id)).toEqual([]);
    expect(await rowsAsAdmin("painted_pieces", ana.id)).toEqual([]);
    expect(await rowsAsAdmin("saved_pieces", ben.id)).toEqual(["bens-pear"]);
    // Every session Ana had has stopped working.
    expect((await ana.client.auth.refreshSession()).error).not.toBeNull();
    await expect(ana.backend.fetchRecord(ana.id)).resolves.toEqual({ saved: [], painted: [] });
  });

  it("signs one device out without signing out the others", async () => {
    const ana = await person("ana");
    const other = await signIn(ana.email, ana.password);
    await ana.backend.signOut();
    expect((await ana.backend.start()).user).toBeNull();
    // The other device's session still refreshes.
    expect((await other.client.auth.refreshSession()).error).toBeNull();
  });
});
