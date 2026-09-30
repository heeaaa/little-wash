import { test, expect, type Page } from "@playwright/test";
import { firstSeries, ready, seedPainted, seriesRows, startsInView } from "./support";

/**
 * Small themed series: a short run of pieces in the order they are meant to
 * be painted. What must hold is that a series arrives whole and in order, that
 * a piece opened from one keeps the way through it - across a reload - and
 * that nothing about the run reads as a score (PRODUCT.md:94).
 *
 * The series are read from Browse rather than named, like every piece in this
 * suite, so the specs survive a curator reordering or renaming them.
 */

/** The pieces-in-this-series navigation on Detail. */
function steps(page: Page) {
  return page.getByRole("navigation", { name: /· No\. \d+$/ });
}

async function openSeries(page: Page) {
  const series = await firstSeries(page);
  await page.goto(`/${series.href}`);
  await ready(page);
  return series;
}

test.describe("small series", () => {
  test("Browse offers a series, and it opens whole and in order", async ({ page }) => {
    const series = await firstSeries(page);
    expect(series.size).toBeGreaterThan(1);

    await page.locator(`a[href="${series.href}"]`).click();
    await expect(page.getByRole("heading", { level: 1, name: series.title })).toBeVisible();

    // The card's promise is kept: that many pieces, numbered 1 to n.
    const rows = await seriesRows(page);
    expect(rows.map((row) => row.number)).toEqual(
      Array.from({ length: series.size }, (_, i) => i + 1),
    );
    // Every row keeps its piece in the series.
    for (const row of rows) expect(row.href).toContain("series=");
  });

  test("a piece opened from a series steps through it, survives a reload, and goes back", async ({
    page,
  }) => {
    const series = await openSeries(page);
    const rows = await seriesRows(page);

    await page.getByRole("link", { name: rows[0]!.title, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: rows[0]!.title })).toBeVisible();
    await expect(steps(page).getByRole("heading")).toHaveText(`${series.title} · No. 1`);
    // The first piece has nothing before it.
    await expect(steps(page).getByRole("link", { name: /^Previous/ })).toHaveCount(0);

    await steps(page).getByRole("link", { name: /^Next/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: rows[1]!.title })).toBeVisible();
    await expect(steps(page).getByRole("heading")).toHaveText(`${series.title} · No. 2`);

    // The series is in the address, so a reload keeps the way through.
    await page.reload();
    await ready(page);
    await expect(steps(page).getByRole("heading")).toHaveText(`${series.title} · No. 2`);

    await steps(page).getByRole("link", { name: /^Previous/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: rows[0]!.title })).toBeVisible();

    // Back names the series and returns to it.
    await page.locator("#main").getByRole("link", { name: series.title, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: series.title })).toBeVisible();
  });

  test("the last piece offers the way back instead of a next one", async ({ page }) => {
    const series = await openSeries(page);
    const rows = await seriesRows(page);
    const last = rows[rows.length - 1]!;

    await page.getByRole("link", { name: last.title, exact: true }).click();
    await expect(steps(page).getByRole("heading")).toHaveText(`${series.title} · No. ${last.number}`);
    await expect(steps(page).getByRole("link", { name: /^Next/ })).toHaveCount(0);

    await steps(page).getByRole("link", { name: /back to the series/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: series.title })).toBeVisible();
  });

  /*
    Measured 30/09/2026 on a Pixel 7: tapped from the foot of Detail, the plate
    was 485px above the screen and the artwork flew 694px down across the
    header into place. It now resolves where it sits, and the next piece opens
    at its top.
  */
  test("Next opens the next piece at its top, and the artwork never flies in", async ({
    page,
  }) => {
    await openSeries(page);
    const rows = await seriesRows(page);
    await page.getByRole("link", { name: rows[0]!.title, exact: true }).click();
    await expect(page.locator(".detail-art")).toBeVisible();

    const next = steps(page).getByRole("link", { name: /^Next/ });
    await next.scrollIntoViewIfNeeded();
    // Record where the artwork's morph starts, if there is one at all.
    await page.evaluate(() => {
      const w = window as unknown as { __from: number | null | undefined };
      w.__from = undefined;
      const started = performance.now();
      const sample = () => {
        const group = document
          .getAnimations()
          .find(
            (a) =>
              (a.effect as KeyframeEffect | null)?.pseudoElement ===
              "::view-transition-group(piece-art)",
          );
        if (group && w.__from === undefined) {
          const from = (group.effect as KeyframeEffect).getKeyframes()[0]?.transform;
          const y = String(from ?? "").match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([-\d.]+)\)/);
          w.__from = y ? Number(y[1]) : null;
        }
        if (performance.now() - started < 1500) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await next.click();
    await expect(page.getByRole("heading", { level: 1, name: rows[1]!.title })).toBeVisible();
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-wash"), null, {
      timeout: 5_000,
    });

    const from = await page.evaluate(
      () => (window as unknown as { __from: number | null | undefined }).__from,
    );
    // No morph at all, or one that starts on the screen.
    expect(from ?? 0, `the artwork's morph starts at y=${from}`).toBeGreaterThanOrEqual(0);

    const plate = await startsInView(page, ".detail-art");
    expect(plate.clear, `the plate starts at y=${plate.top}`).toBe(true);
  });

  test("a series with its sources switched off leaves Browse, and its page says why", async ({
    page,
  }) => {
    const series = await firstSeries(page);

    await page.goto("/#/sources");
    await ready(page);
    for (const toggle of await page.getByRole("switch").all()) await toggle.click();

    await page.goto("/#/browse");
    await ready(page);
    await expect(page.getByRole("heading", { level: 2, name: "Series" })).toHaveCount(0);

    // A saved or shared link still lands somewhere that explains itself.
    await page.goto(`/${series.href}`);
    await ready(page);
    await expect(page.getByRole("heading", { level: 1, name: series.title })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^This series needs / })).toBeVisible();
    await page.getByRole("link", { name: "Where ideas come from" }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Where ideas come from" }),
    ).toBeVisible();
  });

  test("the register: a painted piece keeps its date, and nothing adds them up", async ({
    page,
    context,
  }) => {
    const scratch = await context.newPage();
    const series = await firstSeries(scratch);
    await scratch.goto(`/${series.href}`);
    await ready(scratch);
    const rows = await seriesRows(scratch);
    await scratch.close();

    const painted = rows.slice(0, 2).map((row) => row.href.match(/\/piece\/([^?]+)/)![1]!);
    await seedPainted(context, painted);
    await page.goto(`/${series.href}`);
    await ready(page);

    await expect(page.getByText(/^Painted \d+ \w+/)).toHaveCount(2);
    const text = (await page.locator("main").textContent()) ?? "";
    expect(text).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/i);
    expect(text).not.toMatch(
      /\b(complete[sd]?|finish(ed)?|done|streak|unlock(ed)?|progress|goal|day\s*\d+|\d+\s*(to go|left))\b/i,
    );
  });
});
