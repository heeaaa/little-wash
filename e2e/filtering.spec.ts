import { test, expect } from "@playwright/test";
import {
  TIME_BANDS,
  catalogueSize,
  isInFirstScreen,
  pieceCards,
  readPieces,
  ready,
  resultsCount,
  scrollSettled,
  showEveryPiece,
  smallestSubject,
  startsInView,
} from "./support";

/** Browse draws this many at a time; see src/lib/paging.ts. */
const PAGE = 24;

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

      Every piece of every band is read and checked, which is every piece in
      the catalogue once; the whole list is not also drawn up front, which
      pushed this journey past its time limit.

      Slow by nature, not by accident: it pages through the whole catalogue in
      the UI, so its cost grows with every curation session. Measured
      30/09/2026 on the propped phone: 42.5s under the full suite when it also
      drew the catalogue up front, 27.2s alone without - too close to the 30s
      budget to be anything but flaky. `test.slow()` gives it a longer limit;
      retries stay at zero and every assertion stands.
    */
    test.slow();
    await page.goto("/#/browse");
    await ready(page);
    const total = Number(await resultsCount(page).textContent());
    expect(total).toBeGreaterThan(1);

    const seen = new Set<string>();
    for (const band of TIME_BANDS) {
      await page.getByRole("button", { name: band.label }).first().click();
      // Waits for the re-render, which a one-shot DOM read would race.
      await expect(resultsCount(page)).not.toHaveText(String(total));
      const stated = Number(await resultsCount(page).textContent());

      // A new result starts on its first page; the rest comes on request.
      await expect(pieceCards(page)).toHaveCount(Math.min(stated, PAGE));
      await showEveryPiece(page);
      await expect(pieceCards(page)).toHaveCount(stated);

      // No band may quietly be "everything" - the original defect.
      expect(stated).toBeLessThan(total);

      // And everything in it really does belong in this band.
      const shown = await readPieces(page);
      expect(
        shown.every((p) => band.holds(p.minutes)),
        `${band.label} shows ${JSON.stringify(shown.map((p) => p.minutes))}`,
      ).toBe(true);
      for (const piece of shown) {
        expect(seen.has(piece.id), `${piece.id} is in two bands`).toBe(false);
        seen.add(piece.id);
      }

      await page.getByRole("button", { name: "Any time" }).first().click();
      await expect(resultsCount(page)).toHaveText(String(total));
    }

    // Together they account for the whole catalogue exactly once.
    expect(seen.size).toBe(total);
  });

  test("filters survive a reload, so a filtered view can be shared", async ({ page }) => {
    // Whichever subject the catalogue happens to hold least of, so the
    // assertion stays sharp without naming a piece that may not exist.
    const total = await catalogueSize(page);
    const subject = await smallestSubject(page, total);

    await page.goto(`/#/browse?subject=${subject.name}`);
    await ready(page);

    await expect(resultsCount(page)).toHaveText(String(subject.count));
    expect(subject.count).toBeLessThan(total);
    const before = await readPieces(page);

    await page.reload();
    await ready(page);
    await expect(resultsCount(page)).toHaveText(String(subject.count));
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
    const total = await catalogueSize(page);

    // The card states its own count, so the assertion is that opening it
    // delivers what it advertised - which holds at any catalogue size.
    const card = page.getByRole("link", { name: /quick starts/i });
    const advertised = Number(
      (await card.textContent())?.match(/(\d+)\s*pieces?/)?.[1] ?? Number.NaN,
    );
    expect(advertised).toBeGreaterThan(0);
    expect(advertised).toBeLessThan(total);

    await card.click();
    await expect(resultsCount(page)).toHaveText(String(advertised));
    await expect(pieceCards(page)).toHaveCount(Math.min(advertised, PAGE));

    // The results used to sit ~1500px below the fold, so the tap read as a hang.
    const heading = page.getByRole("heading", { name: /matching pieces/i });
    await expect(heading).toBeFocused();
    await scrollSettled(page);
    const placed = await isInFirstScreen(page, "h2.jump-target");
    expect(placed.clear).toBe(true);
  });

  test("a stale filter value is ignored rather than breaking the page", async ({ page }) => {
    /*
      The catalogue is read first. This used to read it inside the assertion,
      which navigates away - so the count and the heading were checked on
      plain Browse, and the stale link itself was never looked at.
    */
    const total = await catalogueSize(page);
    await page.goto("/#/browse?time=banana&difficulty=??&shown=lots");
    await ready(page);

    await expect(resultsCount(page)).toHaveText(String(total));
    await expect(pieceCards(page)).toHaveCount(Math.min(total, PAGE));
    await expect(page.getByRole("heading", { name: /the whole catalogue/i })).toBeVisible();
  });
});
