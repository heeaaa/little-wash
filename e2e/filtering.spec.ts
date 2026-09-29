import { test, expect } from "@playwright/test";
import {
  TIME_BANDS,
  catalogue,
  isInFirstScreen,
  pieceCards,
  readPieces,
  ready,
  scrollSettled,
  smallestSubject,
  startsInView,
} from "./support";

/**
 * The filters are the product's positioning: "how long have I got, how much
 * energy do I have today". CLAUDE.md asks explicitly for empty filter results
 * and state persistence to be covered.
 */
test.describe("filtering", () => {
  test("the time bands partition the catalogue, and none of them returns all of it", async ({
    page,
  }) => {
    /*
      Bands used to be upper bounds, so "Over 20 min" matched everything and a
      chip that styled itself as narrowing did nothing. This used to be pinned
      as a 4/5/3 split of twelve placeholders. The property those numbers stood
      for is that the three bands partition the catalogue and no single one
      returns all of it - true at any catalogue size, and the actual defect.
    */
    const whole = await catalogue(page);
    expect(whole.length).toBeGreaterThan(1);

    let across = 0;
    for (const band of TIME_BANDS) {
      const expected = whole.filter((p) => band.holds(p.minutes)).length;

      await page.getByRole("button", { name: band.label }).first().click();
      // Waits for the re-render, which a one-shot DOM read would race.
      await expect(pieceCards(page)).toHaveCount(expected);

      // No band may quietly be "everything" - the original defect.
      expect(expected).toBeLessThan(whole.length);

      // And everything on screen really does belong in this band.
      const shown = await readPieces(page);
      expect(
        shown.every((p) => band.holds(p.minutes)),
        `${band.label} shows ${JSON.stringify(shown.map((p) => p.minutes))}`,
      ).toBe(true);
      across += shown.length;

      await page.getByRole("button", { name: "Any time" }).first().click();
      await expect(pieceCards(page)).toHaveCount(whole.length);
    }

    // Together they account for the whole catalogue exactly once.
    expect(across).toBe(whole.length);
  });

  test("filters survive a reload, so a filtered view can be shared", async ({ page }) => {
    // Whichever subject the catalogue happens to hold least of, so the
    // assertion stays sharp without naming a piece that may not exist.
    const whole = await catalogue(page);
    const subject = await smallestSubject(page, whole.length);

    await page.goto(`/#/browse?subject=${subject.name}`);
    await ready(page);

    await expect(pieceCards(page)).toHaveCount(subject.count);
    expect(subject.count).toBeLessThan(whole.length);
    const before = await readPieces(page);

    await page.reload();
    await ready(page);
    await expect(pieceCards(page)).toHaveCount(subject.count);
    expect(await readPieces(page)).toEqual(before);
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
    const whole = await catalogue(page);

    // The card states its own count, so the assertion is that opening it
    // delivers what it advertised - which holds at any catalogue size.
    const card = page.getByRole("link", { name: /quick starts/i });
    const advertised = Number(
      (await card.textContent())?.match(/(\d+)\s*pieces?/)?.[1] ?? Number.NaN,
    );
    expect(advertised).toBeGreaterThan(0);
    expect(advertised).toBeLessThan(whole.length);

    await card.click();
    await expect(pieceCards(page)).toHaveCount(advertised);

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

    await expect(pieceCards(page)).toHaveCount((await catalogue(page)).length);
    await expect(page.getByRole("heading", { name: /the whole catalogue/i })).toBeVisible();
  });
});
