import { test, expect } from "@playwright/test";
import { pieceCards, pieceIdsFrom, ready } from "./support";

/**
 * A record of what you have already painted.
 *
 * PRODUCT.md:94 - "No pressure, ever. No streaks, no guilt, no achievement
 * language. History is a record to enjoy, never a target to maintain." The
 * last test here is that rule, checked against what the browser actually
 * renders rather than against the component in isolation.
 */
test.describe("marking a piece painted", () => {
  test("marks from the detail view and keeps it after a reload", async ({
    page,
    context,
  }) => {
    const [id] = await pieceIdsFrom(context, 1);
    await page.goto(`/#/piece/${id}`);
    await ready(page);

    const mark = page.getByRole("button", { name: /^Mark .* as painted$/ });
    await expect(mark).toHaveAttribute("aria-pressed", "false");
    await mark.click();

    const marked = page.getByRole("button", { name: /^Painted\. Remove / });
    await expect(marked).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await ready(page);
    await expect(page.getByRole("button", { name: /^Painted\. Remove / })).toBeVisible();
  });

  test("the piece then appears in the studio, dated", async ({ page, context }) => {
    const [id] = await pieceIdsFrom(context, 1);
    await page.goto(`/#/piece/${id}`);
    await ready(page);
    await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();

    await page.goto("/#/studio");
    await ready(page);

    const painted = page
      .getByRole("heading", { name: "Painted" })
      .locator("xpath=ancestor::section[1]");
    await expect(painted.locator("li")).toHaveCount(1);
    // On the piece's card. The tree's leaf card gives the date too, so the
    // section as a whole holds it twice.
    await expect(painted.locator("li").getByText(/^Painted \d+ \w+/)).toBeVisible();
  });

  test("unmarking removes it from the record again", async ({ page, context }) => {
    const [id] = await pieceIdsFrom(context, 1);
    await page.goto(`/#/piece/${id}`);
    await ready(page);

    await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();
    await page.getByRole("button", { name: /^Painted\. Remove / }).click();

    await page.goto("/#/studio");
    await ready(page);
    await expect(page.getByText("Nothing painted yet")).toBeVisible();
  });

  test("can be marked from the enlarged view, where the painting happens", async ({
    page,
    context,
  }) => {
    const [id] = await pieceIdsFrom(context, 1);
    await page.goto(`/#/piece/${id}`);
    await ready(page);

    await page.getByRole("button", { name: /^enlarge$/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: /^Mark .* as painted$/ }).click();
    await expect(
      dialog.getByRole("button", { name: /^Painted\. Remove / }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("an empty studio still says the saved list is empty, not that you are behind", async ({
    page,
  }) => {
    await page.goto("/#/studio");
    await ready(page);
    await expect(pieceCards(page)).toHaveCount(0);
    await expect(page.getByText("Nothing painted yet")).toBeVisible();
  });

  test("the record reads as a record, not a scoreboard", async ({ page, context }) => {
    const [id] = await pieceIdsFrom(context, 1);
    await page.goto(`/#/piece/${id}`);
    await ready(page);
    await page.getByRole("button", { name: /^Mark .* as painted$/ }).click();

    await page.goto("/#/studio");
    await ready(page);

    /*
      Scoped to the record itself. The screen's own intro says "nothing here is
      keeping score" - the app disavowing scorekeeping, which is the opposite
      of what this rule guards against, and which a page-wide match reads as a
      violation.
    */
    const record = page
      .getByRole("heading", { name: "Painted" })
      .locator("xpath=ancestor::section[1]");
    const text = (await record.textContent()) ?? "";
    // No duration measured from now, and no achievement vocabulary.
    expect(text).not.toMatch(/\b(ago|yesterday|days? in a row|streak)\b/i);
    expect(text).not.toMatch(/\b(achiev\w*|milestone|badge|level|score)\b/i);
    // A date, stated plainly.
    expect(text).toMatch(/Painted \d+ \w+/);

    // And nothing about paintings in the app's own furniture.
    const header = (await page.locator("header").textContent()) ?? "";
    expect(header).not.toMatch(/painted/i);
  });
});
