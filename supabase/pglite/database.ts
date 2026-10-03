/**
 * The real migrations, on Postgres in WebAssembly.
 *
 * `supabase start` needs Docker, which the machine this was written on does
 * not have, so the rules in supabase/migrations would otherwise only ever be
 * exercised in CI. PGlite runs them in-process in about a second, with
 * platform.sql standing in for the parts of Supabase they rely on. CI's
 * backend job then runs the same migrations on the real stack, which is what
 * keeps the stand-in honest.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_DIR = path.resolve(HERE, "..");

const platformSql = readFileSync(path.join(HERE, "platform.sql"), "utf8");

/** Every migration, in the order the CLI applies them: by file name. */
function migrationsSql(): string[] {
  const dir = path.join(SUPABASE_DIR, "migrations");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(dir, name), "utf8"));
}

/*
  Until 30/05/2026 every new Supabase project granted each new public table to
  anon, authenticated and service_role by default; new projects grant nothing.
  The migrations must be right under both, so the tests run under both.
*/
const OLDER_PROJECT_DEFAULTS = `
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export type ProjectDefaults = "exposes-nothing" | "exposes-everything";

export async function migratedDatabase(defaults: ProjectDefaults): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(platformSql);
  if (defaults === "exposes-everything") await db.exec(OLDER_PROJECT_DEFAULTS);
  for (const sql of migrationsSql()) await db.exec(sql);
  return db;
}

/** Who a statement runs as: signed out, or a signed-in person. */
export type Caller = { kind: "signed-out" } | { kind: "person"; id: string };

export const SIGNED_OUT: Caller = { kind: "signed-out" };
export const person = (id: string): Caller => ({ kind: "person", id });

/**
 * Run SQL the way PostgREST does for one request: inside a transaction, as the
 * request's role, with its JWT claims set. Everything is rolled back if it
 * throws, and the role and claims end with the transaction.
 */
export async function as<T = Record<string, unknown>>(
  db: PGlite,
  caller: Caller,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return db.transaction(async (tx: Transaction) => {
    const claims =
      caller.kind === "person" ? JSON.stringify({ sub: caller.id, role: "authenticated" }) : "";
    await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await tx.exec(`set local role ${caller.kind === "person" ? "authenticated" : "anon"}`);
    const result = await tx.query<T>(sql, params);
    return result.rows;
  });
}

/** The same statement as the database owner, which row level security does not apply to. */
export async function asOwner<T = Record<string, unknown>>(
  db: PGlite,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
