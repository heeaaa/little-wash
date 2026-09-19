import { test, expect } from "@playwright/test";
import { isInFirstScreen, pieceCards, ready, scrollSettled, startsInView } from "./support";

/**
 * The filters are the product's positioning: "how long have I got, how much
 * energy do I have today". CLAUDE.md asks explicitly for empty filter results
 * and state persistence to be covered.
 */
test.describe("filtering", () => {
  test("every time band narrows, and none of them returns the whole catalogue", async ({ page }) => {
    await page.goto("/#/browse");
    await ready(page);
    await expect(pieceCards(page)).toHaveCount(12);

    // Bands used to be upper bounds, so "Over 20 min" matched everything.
    for (const [label, expected, bound] of [
      ["Under 10 min", 4, (m: number) => m < 10],
      ["10-20 min", 5, (m: number) => m >= 10 && m <= 20],
      ["Over 20 min", 3, (m: number) => m > 20],
    ] as const) {
      await page.getByRole("button", { name: label }).first().click();
      await expect(pieceCards(page)).toHaveCount(expected);

      const minutes = await pieceCards(page).evaluateAll((cards) =>
        cards.map((c) => Number(c.textContent?.match(/(\d+)\s*min/)?.[1] ?? NaN)),
      );
      expect(minutes.every(bound)).toBe(true);

      await page.getByRole("button", { name: "Any time" }).first().click();
      await expect(pieceCards(page)).toHaveCount(12);
    }
  });

  test("filters survive a reload, so a filtered view can be shared", async ({ page }) => {
    await page.goto("/#/browse?subject=landscape");
    await ready(page);

    await expect(pieceCards(page)).toHaveCount(1);
    await expect(pieceCards(page).first().locator("a.card-link")).toHaveText("Cottage on the Hill");

    await page.reload();
    await ready(page);
    await expect(pieceCards(page)).toHaveCount(1);
  });

  test("an impossible combination explains itself where you can see it", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    await page.getByRole("button", { name: "Under 10 min" }).first().click();
    await page.getByRole("button", { name: "A stretch" }).first().click();

    const panel = page.getByText(/nothing matches just yet/i);
    await expect(panel).toBeVisible();
    // It names the combination rather than saying "too narrow".
    await expect(page.getByText(/Under 10 min \+ A stretch/)).toBeVisible();

    // And it is not hiding behind the sticky header, which is where it landed
    // before: the explanation sat at y=31 under a 121px header. On a landscape
    // phone the panel is taller than the screen, so what must hold is that it
    // starts below the header - not that all of it fits.
    await scrollSettled(page);
    const placed = await startsInView(page, ".jump-target");
    expect(placed.found).toBe(true);
    expect(placed.clear, `panel top ${placed.top}`).toBe(true);
  });

  test("the way out of an empty result is one tap", async ({ page }) => {
    await page.goto("/#/?time=short&difficulty=stretch");
    await ready(page);

    await expect(page.getByText(/nothing matches just yet/i)).toBeVisible();
    await page.getByRole("button", { name: /drop under 10 min/i }).click();

    await expect(page.getByTestId("featured")).toBeVisible();
    await expect(page.getByText(/nothing matches just yet/i)).toHaveCount(0);
  });

  test("choosing a collection takes you to its results", async ({ page }) => {
    await page.goto("/#/browse");
    await ready(page);

    await page.getByRole("link", { name: /quick starts/i }).click();
    await expect(pieceCards(page)).toHaveCount(4);

    // The results used to sit ~1500px below the fold, so the tap read as a hang.
    const heading = page.getByRole("heading", { name: /matching pieces/i });
    await expect(heading).toBeFocused();
    await scrollSettled(page);
    const placed = await isInFirstScreen(page, "h2.jump-target");
    expect(placed.clear).toBe(true);
  });

  test("a stale filter value is ignored rather than breaking the page", async ({ page }) => {
    await page.goto("/#/browse?time=banana&difficulty=??");
    await ready(page);

    await expect(pieceCards(page)).toHaveCount(12);
    await expect(page.getByRole("heading", { name: /the whole catalogue/i })).toBeVisible();
  });
});
