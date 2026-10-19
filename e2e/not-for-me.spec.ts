import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { FakeSupabase } from "./fakeSupabase";
import { animationsSettled, featuredTitle, ready } from "./support";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const HIDDEN_KEY = "little-wash:hidden:v1";
const AUTH_KEY = "little-wash:auth:v1";

/*
  "Not for me" (docs/plans/not-for-me-reminders-curation.md, Phase 1): a guest
  passes over a piece on Today, it stays out of Today and Browse, and the list
  on Sources brings it back. Signed in, it follows the account - against the
  MOCKED backend in fakeSupabase.ts; e2e-live/ runs the same against a real
  local stack in CI.
*/

async function hiddenIds(page: Page): Promise<string[]> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"ids":[]}').ids as string[], HIDDEN_KEY);
}

/*
  Measured 19/10/2026: straight after Not for me, the re-wet is still fading
  the new piece in, and axe read the credit line at 3.79:1 and the Open button
  at 4.08:1 mid-fade. Once the animations end there is nothing to report - so
  the page is checked as it rests, which is what a person reads.
*/
async function axeViolations(page: Page) {
  await animationsSettled(page);
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: typeof import("axe-core").run } }).axe.run(document, {
      resultTypes: ["violations"],
    });
    return result.violations.map((v) => ({ id: v.id, target: v.nodes[0]?.target?.join(" ") ?? "" }));
  });
}

async function startSignedIn(context: BrowserContext, fake: FakeSupabase, person: ReturnType<FakeSupabase["person"]>) {
  await context.addInitScript(
    ([key, session]) => {
      if (sessionStorage.getItem("signed-in")) return;
      sessionStorage.setItem("signed-in", "1");
      localStorage.setItem(key, session);
    },
    [AUTH_KEY, JSON.stringify(fake.sessionFor(person))] as const,
  );
}

test.describe("Not for me, as a guest", () => {
  test("passes a piece over on Today, keeps it out of Today and Browse, and brings it back from Sources", async ({
    page,
  }) => {
    await page.goto("/#/");
    await ready(page);
    const passedOver = (await featuredTitle(page).textContent())!.trim();

    await page.getByRole("button", { name: "Not for me" }).click();
    await expect(featuredTitle(page)).not.toHaveText(passedOver);
    await expect(page.getByText(`${passedOver} won’t come up again.`)).toBeVisible();
    const [id] = await hiddenIds(page);
    expect(id).toBeTruthy();

    // A reload, and a link that pins it, still do not offer it.
    await page.goto(`/#/?piece=${id}`);
    await page.reload();
    await ready(page);
    await expect(featuredTitle(page)).not.toHaveText(passedOver);

    // Browse leaves it out and says so; "Show them" brings it back, marked.
    await page.goto("/#/browse");
    await ready(page);
    await expect(page.getByText("1 piece you’ve hidden is left out.")).toBeVisible();
    await expect(page.locator(`a[href*="/piece/${id}"]`)).toHaveCount(0);
    await page.getByRole("button", { name: "Show it" }).click();
    await expect(page.getByText("Including 1 piece you’ve hidden, first.")).toBeVisible();

    // Sources lists it; showing it again returns it to Browse.
    await page.goto("/#/sources");
    await ready(page);
    await page.getByRole("button", { name: `Bring back: ${passedOver}` }).click();
    await expect(page.getByText(/Nothing hidden\./)).toBeVisible();
    expect(await hiddenIds(page)).toEqual([]);
    await page.goto("/#/browse");
    await ready(page);
    await expect(page.getByText(/hidden piece/)).toHaveCount(0);
  });

  /*
    The featured piece is replaced when it changes, and with it the button that
    was pressed. Measured before the fix (19/10/2026, component test): focus
    fell to the page after Deal me another. Here, in a real browser, for both.
  */
  test("keeps keyboard focus on Deal me another and on Not for me", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    const deal = page.getByRole("button", { name: /deal me another/i });
    await deal.focus();
    const before = (await featuredTitle(page).textContent())!.trim();
    await page.keyboard.press("Enter");
    await expect(featuredTitle(page)).not.toHaveText(before);
    await expect(deal).toBeFocused();

    const notForMe = page.getByRole("button", { name: "Not for me" });
    await notForMe.focus();
    const dealt = (await featuredTitle(page).textContent())!.trim();
    await page.keyboard.press("Enter");
    await expect(featuredTitle(page)).not.toHaveText(dealt);
    await expect(notForMe).toBeFocused();

    // Undo is the next stop, and puts the piece back.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Undo" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(featuredTitle(page)).toHaveText(dealt);
    await expect(notForMe).toBeFocused();
  });

  /*
    From the design critique, 19/10/2026: propped sideways, "Not for me" is
    one short scroll down, and pressing it there put Undo under the fold
    (measured at 667x375: 383-427 of 375). A stray tap with wet hands then
    looked exactly like a deal, with no way back in sight.
  */
  test("brings Undo into view after hiding, with Not for me at the very foot of the screen", async ({ page }) => {
    await page.goto("/#/?piece=dogwood-vase-9317");
    await ready(page);
    const notForMe = page.getByRole("button", { name: "Not for me" });
    // Scrolled only just far enough to reach it, as a thumb would.
    await notForMe.evaluate((button) => {
      const { bottom } = button.getBoundingClientRect();
      window.scrollBy(0, Math.max(0, bottom - window.innerHeight + 2));
    });
    await expect(notForMe).toBeInViewport();
    await notForMe.click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeInViewport({ ratio: 1 });
  });

  test("hides from a piece's own page, which stays open", async ({ page }) => {
    await page.goto("/#/browse");
    await ready(page);
    const card = page.locator('a[href*="/piece/"]').first();
    const title = (await card.textContent())!.trim();
    await card.click();
    await ready(page);

    await page.getByRole("button", { name: "Not for me" }).click();
    await expect(page.getByText("Hidden from Today and Browse.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await page.getByRole("button", { name: "Bring it back" }).click();
    await expect(page.getByRole("button", { name: "Not for me" })).toBeVisible();
  });

  test("every state has no axe violations", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);
    await page.getByRole("button", { name: "Not for me" }).click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    const [id] = await hiddenIds(page);
    await page.goto(`/#/piece/${id}`);
    await ready(page);
    await expect(page.getByText("Hidden from Today and Browse.")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    await page.goto("/#/browse?hidden=shown");
    await ready(page);
    await expect(page.getByText("Including 1 piece you’ve hidden, first.")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);

    await page.goto("/#/sources");
    await ready(page);
    await expect(page.getByRole("heading", { name: "Pieces you’ve hidden" })).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe("Not for me, signed in", () => {
  test("a piece hidden on one device is hidden on another signed in as the same person", async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    const fake = new FakeSupabase();
    const ana = fake.person("ana");
    await fake.attach(context);
    await startSignedIn(context, fake, ana);

    await page.goto("/#/");
    await ready(page);
    const passedOver = (await featuredTitle(page).textContent())!.trim();
    await page.getByRole("button", { name: "Not for me" }).click();
    await expect.poll(() => fake.hiddenIds(ana)).toHaveLength(1);
    const [id] = fake.hiddenIds(ana);
    // Kept with the account, not in this browser's own list.
    expect(await hiddenIds(page)).toEqual([]);

    const laptop = await browser.newContext({ baseURL });
    try {
      await fake.attach(laptop);
      await startSignedIn(laptop, fake, ana);
      const other = await laptop.newPage();
      await other.goto("/#/sources");
      await ready(other);
      await expect(other.getByRole("button", { name: `Bring back: ${passedOver}` })).toBeVisible();
      await other.goto(`/#/?piece=${id}`);
      await ready(other);
      await expect(featuredTitle(other)).not.toHaveText(passedOver);
    } finally {
      await laptop.close();
    }
  });
});
