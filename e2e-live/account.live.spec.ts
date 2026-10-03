import { randomUUID } from "node:crypto";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { integrationEnv } from "../integration/env";

/*
  The account journeys against a REAL local Supabase stack: real Auth, the real
  REST API, the real row level security. Run by `npm run test:e2e:live` in CI's
  "Accounts against a local Supabase" job, after `supabase start`.

  Not covered here, because it cannot be driven: Google itself, and the PKCE
  exchange after it (e2e/account.spec.ts covers both against a fake, and the
  deploy guide's step 6 covers them for real).
*/

const AUTH_KEY = "little-wash:auth:v1";
const env = integrationEnv();
const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin: SupabaseClient = createClient(env.url, env.secretKey, noSession);

interface Person {
  id: string;
  email: string;
  password: string;
}

async function person(name: string): Promise<Person> {
  const email = `${name}-${randomUUID()}@example.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return { id: data.user.id, email, password };
}

/** Hand the page a real session, exactly as supabase-js stores one after signing in. */
async function signIn(context: BrowserContext, who: Person) {
  const client = createClient(env.url, env.publishableKey, noSession);
  const { data, error } = await client.auth.signInWithPassword({ email: who.email, password: who.password });
  if (error || !data.session) throw error ?? new Error("no session");
  await context.addInitScript(
    ([key, session]) => {
      if (sessionStorage.getItem("signed-in")) return;
      sessionStorage.setItem("signed-in", "1");
      localStorage.setItem(key, session);
    },
    [AUTH_KEY, JSON.stringify(data.session)] as const,
  );
}

async function rows(table: "saved_pieces" | "painted_pieces", who: Person) {
  const { data, error } = await admin.from(table).select("piece_id").eq("user_id", who.id).order("piece_id");
  if (error) throw error;
  return (data ?? []).map((row: { piece_id: string }) => row.piece_id);
}

async function ready(page: Page) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForLoadState("networkidle");
}

/** A real piece id, read from Browse rather than named. */
async function anyPiece(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  try {
    await page.goto("/#/browse");
    await ready(page);
    const href = await page.locator('main a[href*="/piece/"]').first().getAttribute("href");
    return href!.split("/piece/")[1]!.split("?")[0]!;
  } finally {
    await page.close();
  }
}

test("this build talks to the local stack, and to nothing else", async ({ page, context }) => {
  const ana = await person("ana");
  await signIn(context, ana);
  const hosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/auth/v1/")) hosts.add(url.origin);
  });
  await page.goto("/#/studio");
  await ready(page);
  await expect(page.getByText(`Signed in as ${ana.email}.`)).toBeVisible();
  expect([...hosts]).toEqual([new URL(env.url).origin]);
});

test("what one device saves and paints is in the account, and on the next device", async ({ page, context, browser, baseURL }) => {
  const ana = await person("ana");
  const id = await anyPiece(context);
  await signIn(context, ana);

  await page.goto(`/#/piece/${id}`);
  await ready(page);
  await page.getByRole("button", { name: /^Save .* to your saved pieces$/ }).first().click();
  await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();
  await expect.poll(() => rows("saved_pieces", ana)).toEqual([id]);
  await expect.poll(() => rows("painted_pieces", ana)).toEqual([id]);

  const laptop = await browser.newContext({ baseURL });
  try {
    await signIn(laptop, ana);
    const other = await laptop.newPage();
    await other.goto("/#/studio");
    await ready(other);
    await expect(other.getByRole("main").locator(`a[href*="/piece/${id}"]`).first()).toBeVisible();
    await expect(other.getByRole("heading", { level: 2, name: "Painted" })).toBeVisible();
  } finally {
    await laptop.close();
  }
});

test("someone else signed in sees none of it", async ({ context, browser, baseURL }) => {
  const ana = await person("ana");
  const ben = await person("ben");
  const id = await anyPiece(context);
  const { error } = await admin.from("saved_pieces").insert({ user_id: ana.id, piece_id: id });
  expect(error).toBeNull();

  const bens = await browser.newContext({ baseURL });
  try {
    await signIn(bens, ben);
    const his = await bens.newPage();
    await his.goto("/#/studio");
    await ready(his);
    await expect(his.getByText(`Signed in as ${ben.email}.`)).toBeVisible();
    await expect(his.getByText("Nothing set aside yet")).toBeVisible();
    await expect(his.getByRole("main").locator(`a[href*="/piece/${id}"]`)).toHaveCount(0);
  } finally {
    await bens.close();
  }
  // Ana's is untouched.
  expect(await rows("saved_pieces", ana)).toEqual([id]);
});

test("this browser's own pieces move into the account on signing in", async ({ page, context }) => {
  const ana = await person("ana");
  const id = await anyPiece(context);
  await context.addInitScript((piece) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("little-wash:favorites:v1", JSON.stringify({ ids: [piece] }));
  }, id);
  await signIn(context, ana);

  await page.goto("/#/studio");
  await ready(page);
  await expect.poll(() => rows("saved_pieces", ana)).toEqual([id]);
  expect(await page.evaluate(() => localStorage.getItem("little-wash:favorites:v1"))).toBeNull();
});

test("signing out keeps the account's pieces in the account and none in the browser", async ({ page, context }) => {
  const ana = await person("ana");
  const id = await anyPiece(context);
  await admin.from("saved_pieces").insert({ user_id: ana.id, piece_id: id });
  await signIn(context, ana);

  await page.goto("/#/studio");
  await ready(page);
  await expect(page.getByRole("main").locator(`a[href*="/piece/${id}"]`).first()).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("Your studio is kept in this browser.")).toBeVisible();

  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter((key) => key.startsWith(AUTH_KEY) || key === "little-wash:account:v1")).toEqual([]);
  expect(await rows("saved_pieces", ana)).toEqual([id]);
});

test("deleting the account removes it and its pieces", async ({ page, context }) => {
  const ana = await person("ana");
  const id = await anyPiece(context);
  await admin.from("painted_pieces").insert({ user_id: ana.id, piece_id: id, painted_on: "2026-09-14" });
  await signIn(context, ana);

  await page.goto("/#/studio");
  await ready(page);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByRole("dialog", { name: "Delete your account?" }).getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your account and everything in it has been deleted." })).toBeVisible();

  const { data } = await admin.auth.admin.getUserById(ana.id);
  expect(data.user).toBeNull();
  expect(await rows("painted_pieces", ana)).toEqual([]);
});
