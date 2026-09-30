import { test, expect } from "@playwright/test";
import { pieceCards, ready, resultsCount } from "./support";

/**
 * Where ideas come from.
 *
 * The source preference shapes what a painter is offered, and it is the first
 * thing in the app that can empty the catalogue, so the journeys that matter
 * are: it holds, it is reversible, it never touches saved work, and switching
 * everything off explains itself instead of showing a blank screen.
 */
test.describe("source preferences", () => {
  test("the footer offers a way to the sources screen", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    await page.getByRole("link", { name: "Where ideas come from" }).click();
    await expect(
      page.getByRole("heading", { name: "Where ideas come from", level: 1 }),
    ).toBeVisible();
  });

  test("every source names its licence and links to the source", async ({ page }) => {
    await page.goto("/#/sources");
    await ready(page);

    const toggles = page.getByRole("switch");
    await expect(toggles).not.toHaveCount(0);
    await expect(page.getByText("CC0 1.0").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Visit / }).first()).toBeVisible();
  });

  test("switching every source off empties the catalogue and says so", async ({ page }) => {
    await page.goto("/#/sources");
    await ready(page);

    for (const toggle of await page.getByRole("switch").all()) {
      await toggle.click();
    }

    await expect(page.getByRole("status")).toContainText("Every source is switched off");

    await page.goto("/#/browse");
    await ready(page);
    await expect(pieceCards(page)).toHaveCount(0);
  });

  test("the choice survives a reload", async ({ page }) => {
    await page.goto("/#/sources");
    await ready(page);

    const toggle = page.getByRole("switch").first();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await ready(page);
    await expect(page.getByRole("switch").first()).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("turning a source back on restores the catalogue", async ({ page }) => {
    // The stated count, not the cards drawn: Browse draws a page at a time, so
    // two first pages would match whatever had happened to the catalogue.
    await page.goto("/#/browse");
    await ready(page);
    const before = await resultsCount(page).textContent();

    await page.goto("/#/sources");
    await ready(page);
    await page.getByRole("switch").first().click();
    await page.getByRole("switch").first().click();

    await page.goto("/#/browse");
    await ready(page);
    await expect(resultsCount(page)).toHaveText(before!);
  });
});
