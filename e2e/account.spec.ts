import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { FakeSupabase, type FakePerson } from "./fakeSupabase";
import { pieceIdsFrom, ready } from "./support";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const AUTH_KEY = "little-wash:auth:v1";
const ACCOUNT_KEY = "little-wash:account:v1";

/*
  Optional Google sign-in, end to end, against the mocked backend in
  fakeSupabase.ts: these are MOCKED journeys. The same journeys against a real
  local Supabase stack are e2e-live/ (CI). Real Google, and real phones, are
  checked by hand on the deploy preview (docs/deploying-accounts.md, step 6).
*/

/**
 * Seed this browser's own lists once - not on every navigation, as support.ts
 * does - because these journeys watch the app empty them on sign-in.
 */
async function seedOnce(context: BrowserContext, { saved = [] as string[], painted = [] as string[] }) {
  await context.addInitScript(
    ([savedIds, paintedIds]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      if (savedIds.length) localStorage.setItem("little-wash:favorites:v1", JSON.stringify({ ids: savedIds }));
      if (paintedIds.length) {
        localStorage.setItem(
          "little-wash:painted:v1",
          JSON.stringify({ entries: paintedIds.map((id) => ({ id, on: "2026-09-14" })) }),
        );
      }
    },
    [saved, painted] as const,
  );
}

/** Start already signed in, as someone returning to a device would. */
async function startSignedIn(context: BrowserContext, fake: FakeSupabase, person: FakePerson) {
  await context.addInitScript(
    ([key, session]) => {
      if (sessionStorage.getItem("signed-in")) return;
      sessionStorage.setItem("signed-in", "1");
      localStorage.setItem(key, session);
    },
    [AUTH_KEY, JSON.stringify(fake.sessionFor(person))] as const,
  );
}

/**
 * A notice, as it is announced. Its words are on the page twice by design -
 * in the always-present live region a screen reader hears, and in the card the
 * eye reads, whose copy is hidden from assistive technology (AccountNotice) -
 * so the live region is the one to name. Playwright counts the 1px live region
 * as visible, so a visibility filter cannot tell the two apart.
 */
function notice(page: Page, words: string) {
  return page.getByRole("status").filter({ hasText: words });
}

/** The card the eye reads, which carries the way to dismiss it. */
function noticeCard(page: Page) {
  return page.getByRole("button", { name: "Dismiss this message" });
}

async function storageKeys(page: Page) {
  return page.evaluate(() => Object.keys(localStorage).sort());
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: typeof import("axe-core").run } }).axe.run(document, {
      resultTypes: ["violations"],
    });
    return result.violations.map((v) => ({ id: v.id, target: v.nodes[0]?.target?.join(" ") ?? "" }));
  });
}

test.describe("a guest", () => {
  test("never reaches the account service, and never downloads its code", async ({ page, context }) => {
    const fake = new FakeSupabase();
    await fake.attach(context);
    const fetchedChunks: string[] = [];
    page.on("request", (request) => {
      if (/supabaseBackend/.test(request.url())) fetchedChunks.push(request.url());
    });

    const [id] = await pieceIdsFrom(context, 1);
    for (const path of ["/#/", "/#/browse", `/#/piece/${id}`]) {
      await page.goto(path);
      await ready(page);
    }
    await page.getByRole("button", { name: /^Save .* to your saved pieces$/ }).first().click();
    await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();
    await page.goto("/#/studio");
    await ready(page);
    await expect(page.getByText("Your studio is kept in this browser.")).toBeVisible();

    expect(fake.log).toEqual([]);
    expect(fetchedChunks).toEqual([]);
    // The chunk exists in this build, so its absence above means something.
    expect(readdirSync("dist/assets").some((file) => /^supabaseBackend-.*\.js$/.test(file))).toBe(true);
  });
});

test.describe("signing in", () => {
  test("from the studio, through Google, and back to the studio with this browser's pieces", async ({
    page,
    context,
    baseURL,
  }) => {
    const fake = new FakeSupabase();
    await fake.attach(context);
    const ana = fake.person("ana");
    fake.google = ana;
    const [saved, painted] = await pieceIdsFrom(context, 2);
    await seedOnce(context, { saved: [saved!], painted: [painted!] });

    await page.goto("/#/studio");
    await ready(page);
    await page.getByRole("button", { name: "Sign in to keep it on every device" }).click();
    const sheet = page.getByRole("dialog", { name: "Keep your studio with you" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("supabase.e2e.test")).toBeVisible();
    await sheet.getByRole("button", { name: "Sign in with Google" }).click();

    await page.waitForURL(/#\/studio$/);
    await expect(
      notice(page, `Signed in as ${ana.email}. 1 saved piece and 1 painted piece from this browser are now in your account.`),
    ).toBeVisible();
    await expect(page.getByText(/^Signed in as/).first()).toBeVisible();

    // What the app asked Supabase for: Google, PKCE, back to this page.
    const asked = fake.authorizations[0]!;
    expect(asked.get("provider")).toBe("google");
    expect(asked.get("code_challenge_method")).toBe("s256");
    expect(asked.get("redirect_to")).toBe(`${baseURL}/`);

    // This browser's pieces are in the account now, and no longer here.
    await expect.poll(() => fake.savedIds(ana)).toEqual([saved]);
    expect(fake.paintedRows(ana).map((row) => row.piece_id)).toEqual([painted]);
    const keys = await storageKeys(page);
    expect(keys).not.toContain("little-wash:favorites:v1");
    expect(keys).not.toContain("little-wash:painted:v1");
    expect(new URL(page.url()).search).toBe("");
  });

  test("a cancel at Google comes back with a plain word and nothing else changed", async ({ page, context }) => {
    const fake = new FakeSupabase();
    await fake.attach(context);
    fake.google = "cancel";
    await page.goto("/#/browse");
    await ready(page);
    await page.getByRole("contentinfo").getByRole("button", { name: "sign in" }).click();
    await page.getByRole("button", { name: "Sign in with Google" }).click();

    await expect(notice(page, "Sign-in was cancelled. little wash works just the same without an account.")).toBeVisible();
    await expect(noticeCard(page)).toBeVisible();
    await expect(page).toHaveURL(/#\/$/);
    expect(new URL(page.url()).search).toBe("");
    expect(await storageKeys(page)).not.toContain(AUTH_KEY);
  });
});

test.describe("signed in", () => {
  test("what one device saves and paints, another device signed in as the same person sees", async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    const fake = new FakeSupabase();
    const ana = fake.person("ana");
    await fake.attach(context);
    await startSignedIn(context, fake, ana);
    const [id] = await pieceIdsFrom(context, 1);

    await page.goto(`/#/piece/${id}`);
    await ready(page);
    await page.getByRole("button", { name: /^Save .* to your saved pieces$/ }).first().click();
    await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();
    await expect.poll(() => fake.savedIds(ana)).toEqual([id]);
    await expect.poll(() => fake.paintedRows(ana).map((row) => row.piece_id)).toEqual([id]);

    // A second device: its own browser, signed in as Ana.
    const laptop = await browser.newContext({ baseURL });
    try {
      await fake.attach(laptop);
      await startSignedIn(laptop, fake, ana);
      const other = await laptop.newPage();
      await other.goto("/#/studio");
      await ready(other);
      const main = other.getByRole("main");
      await expect(main.getByRole("heading", { level: 2, name: "Saved" })).toBeVisible();
      await expect(main.locator(`a[href*="/piece/${id}"]`).first()).toBeVisible();
      await expect(main.getByRole("heading", { level: 2, name: "Painted" })).toBeVisible();

      // Unsaved on the laptop; the phone sees it on its next visit.
      await other.goto(`/#/piece/${id}`);
      await ready(other);
      await other.getByRole("button", { name: /^Saved\. Remove .* from your saved pieces$/ }).first().click();
      await expect.poll(() => fake.savedIds(ana)).toEqual([]);
    } finally {
      await laptop.close();
    }
    await page.reload();
    await ready(page);
    await expect(page.getByRole("button", { name: /^Save .* to your saved pieces$/ }).first()).toBeVisible();
  });

  test("a change made offline reaches the account when the connection returns", async ({ page, context }) => {
    const fake = new FakeSupabase();
    const ana = fake.person("ana");
    await fake.attach(context);
    await startSignedIn(context, fake, ana);
    const [id] = await pieceIdsFrom(context, 1);
    await page.goto(`/#/piece/${id}`);
    await ready(page);

    await context.setOffline(true);
    await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();
    // Into the studio by the app's own routing: nothing loads from the network.
    await page.evaluate(() => {
      window.location.hash = "#/studio";
    });
    await expect(page.getByText(/You.re offline\. 1 change will reach your account when you.re back online\./)).toBeVisible();
    expect(fake.paintedRows(ana)).toEqual([]);

    await context.setOffline(false);
    await expect.poll(() => fake.paintedRows(ana).map((row) => row.piece_id)).toEqual([id]);
    await expect(page.getByText(/You.re offline/)).toHaveCount(0);
  });

  test("signing out leaves nothing of the account in this browser", async ({ page, context }) => {
    const fake = new FakeSupabase();
    const ana = fake.person("ana");
    await fake.attach(context);
    const [id] = await pieceIdsFrom(context, 1);
    fake.saved.get(ana.id)!.set(id!, { piece_id: id!, saved_at: "2026-10-01T08:00:00.000Z" });
    await startSignedIn(context, fake, ana);

    await page.goto("/#/studio");
    await ready(page);
    await expect(page.getByRole("main").locator(`a[href*="/piece/${id}"]`).first()).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.getByText("Your studio is kept in this browser.")).toBeVisible();
    await expect(page.getByRole("main").locator(`a[href*="/piece/${id}"]`)).toHaveCount(0);
    // The button went with the signed-in view; focus carries on from the words.
    await expect(noticeCard(page)).toBeFocused();
    const keys = await storageKeys(page);
    expect(keys.filter((key) => key.startsWith(AUTH_KEY) || key === ACCOUNT_KEY)).toEqual([]);
    expect(fake.log).toContain("POST /auth/v1/logout");
    // Still in the account for next time.
    expect(fake.savedIds(ana)).toEqual([id]);
  });

  test("deleting the account asks first, then removes it and everything in it", async ({ page, context }) => {
    const fake = new FakeSupabase();
    const ana = fake.person("ana");
    await fake.attach(context);
    await startSignedIn(context, fake, ana);
    await page.goto("/#/studio");
    await ready(page);

    await page.getByRole("button", { name: "Delete my account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your account?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Keep my account" })).toBeFocused();
    await dialog.getByRole("button", { name: "Delete my account" }).click();

    await expect(notice(page, "Your account and everything in it has been deleted.")).toBeVisible();
    expect(fake.people.has(ana.id)).toBe(false);
    await expect(page.getByText("Your studio is kept in this browser.")).toBeVisible();
    await expect(noticeCard(page)).toBeFocused();
  });
});

test.describe("other tabs", () => {
  test("a tab left open follows a sign-in made in another tab, and the sign-out after it", async ({
    page,
    context,
  }) => {
    const fake = new FakeSupabase();
    await fake.attach(context);
    const ana = fake.person("ana");
    fake.google = ana;

    await page.goto("/#/studio");
    await ready(page);
    await expect(page.getByText("Your studio is kept in this browser.")).toBeVisible();

    const other = await context.newPage();
    await other.goto("/#/studio");
    await ready(other);
    await other.getByRole("button", { name: "Sign in to keep it on every device" }).click();
    await other
      .getByRole("dialog", { name: "Keep your studio with you" })
      .getByRole("button", { name: "Sign in with Google" })
      .click();
    await other.waitForURL(/#\/studio$/);
    await expect(other.getByText(/^Signed in as/).first()).toBeVisible();

    // The first tab is never touched: it hears the session arrive, and follows.
    await expect(page.getByText(/^Signed in as/).first()).toBeVisible();
    await expect(page.getByText("Your studio is kept in this browser.")).toHaveCount(0);

    // And back: signing out there signs this tab out too.
    await other.getByRole("main").getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Your studio is kept in this browser.")).toBeVisible();
    await expect(notice(page, "You’ve been signed out. Sign in again to see your studio.")).toBeVisible();
  });
});

/**
 * Where an open dialog has come to rest: on a phone the foot of the screen (a
 * bottom sheet, reached by thumb); from 640px, the middle (a centred card).
 */
async function restingPlace(page: Page) {
  return page.evaluate(async () => {
    const dialog = document.querySelector("dialog[open]") as HTMLDialogElement;
    await Promise.all(dialog.getAnimations().map((animation) => animation.finished));
    const box = dialog.getBoundingClientRect();
    const wide = window.innerWidth >= 640;
    return {
      wide,
      offBy: wide ? Math.abs(box.top - (window.innerHeight - box.height) / 2) : Math.abs(window.innerHeight - box.bottom),
    };
  });
}

test.describe("where the questions sit", () => {
  test("the sign-in sheet rests at the foot of a phone and the middle of a wide screen", async ({ page, context }) => {
    const fake = new FakeSupabase();
    await fake.attach(context);
    await page.goto("/#/studio");
    await ready(page);
    await page.getByRole("button", { name: "Sign in to keep it on every device" }).click();
    expect((await restingPlace(page)).offBy).toBeLessThanOrEqual(2);
  });

  /*
    Found in the screenshot review, 02/10/2026: the delete question sat inside
    a space-y block, whose margin utility outranked the sheet's own margin and
    pinned it to the top of the screen at every size.
  */
  test("so does the question before deleting the account", async ({ page, context }) => {
    const fake = new FakeSupabase();
    const ana = fake.person("ana");
    await fake.attach(context);
    await startSignedIn(context, fake, ana);
    await page.goto("/#/studio");
    await ready(page);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page.getByRole("dialog", { name: "Delete your account?" })).toBeVisible();
    expect((await restingPlace(page)).offBy).toBeLessThanOrEqual(2);
  });
});

test.describe("accounts, accessibly", () => {
  test("the studio signed out, the sheet open, and the studio signed in have no axe violations", async ({
    page,
    context,
  }) => {
    const fake = new FakeSupabase();
    await fake.attach(context);
    await page.goto("/#/studio");
    await ready(page);
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole("button", { name: "Sign in to keep it on every device" }).click();
    await expect(page.getByRole("dialog", { name: "Keep your studio with you" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("signed in, with the delete question open, has no axe violations", async ({ page, context }) => {
    const fake = new FakeSupabase();
    const ana = fake.person("ana");
    await fake.attach(context);
    await startSignedIn(context, fake, ana);
    await page.goto("/#/studio");
    await ready(page);
    await expect(page.getByText(/^Signed in as/)).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await expect(page.getByRole("dialog", { name: "Delete your account?" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test("the sheet fits the screen and its button is within reach", async ({ page, context }) => {
    const fake = new FakeSupabase();
    await fake.attach(context);
    await page.goto("/#/studio");
    await ready(page);
    await page.getByRole("button", { name: "Sign in to keep it on every device" }).click();
    const sheet = page.getByRole("dialog", { name: "Keep your studio with you" });
    await expect(sheet).toBeVisible();
    // Measured once the sheet has risen into place (--t-rise), not mid-flight.
    await page.evaluate(() => Promise.all(document.querySelector("dialog[open]")!.getAnimations().map((a) => a.finished)));

    const fit = await page.evaluate(() => {
      const dialog = document.querySelector("dialog[open]")!.getBoundingClientRect();
      const button = [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent?.includes("Sign in with Google"))!;
      const box = button.getBoundingClientRect();
      return {
        inside: dialog.left >= -1 && dialog.right <= window.innerWidth + 1 && dialog.bottom <= window.innerHeight + 1,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        buttonHeight: Math.round(box.height),
        font: getComputedStyle(button).fontFamily,
      };
    });
    expect(fit.inside).toBe(true);
    expect(fit.overflowX).toBe(false);
    expect(fit.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(fit.font).toContain("Google Sans");
    // The button scrolls into view inside the sheet if the screen is short.
    await sheet.getByRole("button", { name: "Sign in with Google" }).scrollIntoViewIfNeeded();
    await expect(sheet.getByRole("button", { name: "Sign in with Google" })).toBeInViewport();
  });
});
