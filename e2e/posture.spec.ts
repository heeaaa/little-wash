import { test, expect } from "@playwright/test";
import { isInFirstScreen, ready } from "./support";

/**
 * The propped phone. PRODUCT.md names this scene - "a device set down at an
 * angle", "propped beside a physical sketchbook" - and it is where this app has
 * broken twice: an enlarge dialog that clipped the subject, and screens whose
 * primary action fell a full viewport below the fold.
 *
 * These run on every project; the landscape assertions are skipped where the
 * viewport is not actually short and wide, so the file reads the same as the
 * device it is running on.
 */
const isShortLandscape = (page: { viewportSize: () => { width: number; height: number } | null }) => {
  const v = page.viewportSize();
  return !!v && v.width > v.height && v.height <= 520;
};

test.describe("the propped-phone posture", () => {
  test("nothing scrolls sideways, at any size", async ({ page }) => {
    for (const route of ["#/", "#/browse", "#/piece/ripe-pear", "#/exercises", "#/studio"]) {
      await page.goto(`/${route}`);
      await ready(page);
      const overflow = await page.evaluate(() => {
        const de = document.documentElement;
        return de.scrollWidth - de.clientWidth;
      });
      expect(overflow, `${route} scrolls sideways`).toBeLessThanOrEqual(1);
    }
  });

  test("Detail keeps the reference and its way out on the first screen", async ({ page }) => {
    await page.goto("/#/piece/bowl-of-cherries");
    await ready(page);

    const title = await isInFirstScreen(page, "main h1");
    expect(title.clear).toBe(true);

    if (isShortLandscape(page)) {
      // The plate was 762x762 inside a 390px viewport, with Enlarge 494px below
      // the fold. It must fit, and the escape hatch must be reachable.
      const plate = await page.evaluate(() => {
        const el = document.querySelector(".detail-art");
        return el ? el.getBoundingClientRect().height : 0;
      });
      expect(plate).toBeLessThanOrEqual(page.viewportSize()!.height);

      const enlarge = await isInFirstScreen(page, ".detail-enlarge");
      expect(enlarge.clear).toBe(true);
    }
  });

  test("Today keeps the piece, its identity and the primary action together", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);

    const art = await isInFirstScreen(page, ".featured-plate");
    expect(art.clear).toBe(true);

    if (isShortLandscape(page)) {
      // "Open this piece" sat at y=616 in a 390px viewport when these stacked.
      const cta = await isInFirstScreen(page, ".featured-actions");
      expect(cta.clear).toBe(true);
    }
  });

  test("the enlarged view fills the short axis whichever way the phone is held", async ({ page }) => {
    await page.goto("/#/piece/ripe-pear");
    await ready(page);
    await page.getByRole("button", { name: /^enlarge$/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const fill = await page.evaluate(() => {
      const img = document.querySelector("dialog[open] img") as HTMLImageElement;
      const box = img.getBoundingClientRect();
      const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
      const painted = Math.min(img.naturalWidth * scale, img.naturalHeight * scale);
      return {
        ratio: painted / Math.min(window.innerWidth, window.innerHeight),
        clipped:
          box.top < -1 ||
          box.left < -1 ||
          box.bottom > window.innerHeight + 1 ||
          box.right > window.innerWidth + 1,
      };
    });
    expect(fill.clipped).toBe(false);
    expect(fill.ratio).toBeGreaterThan(0.8);
  });

  test("the reference a painter mixes against is never a filtered image", async ({ page }) => {
    await page.goto("/#/");
    await ready(page);
    await page.getByRole("button", { name: /deal me another/i }).click();
    await page.waitForTimeout(900); // the wash is 520ms; settle well past it

    const settled = await page.evaluate(() => {
      const img = document.querySelector('[data-testid="featured"] img')!;
      const wrap = img.parentElement!;
      return {
        img: getComputedStyle(img).filter,
        wrap: getComputedStyle(wrap).filter,
        transform: getComputedStyle(wrap).transform,
      };
    });
    expect(settled.img).toBe("none");
    expect(settled.wrap).toBe("none");
    expect(settled.transform).toBe("none");
  });
});
