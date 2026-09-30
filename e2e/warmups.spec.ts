import { test, expect, type Page } from "@playwright/test";
import { ready, scrollSettled, startsInView } from "./support";

/**
 * Warm-ups, in a real browser, on every project.
 *
 * The component tests prove the state: which variation is chosen, which guide
 * shows, what the URL says. These prove what jsdom cannot see - that the
 * example and the steps are actually on screen together while someone paints,
 * that nothing scrolls sideways with a sheet open, and that focus is visible
 * on controls whose input is visually hidden.
 */

const row = (page: Page, name: RegExp) => page.getByRole("button", { name });
const sheet = (page: Page) => page.getByRole("region");

async function openGraded(page: Page) {
  await page.goto("/#/exercises");
  await ready(page);
  await row(page, /graded wash/i).click();
  await expect(sheet(page)).toBeVisible();
}

test.describe("warm-ups", () => {
  test("choose a warm-up, pick a variation, and the preview and guide follow", async ({ page }) => {
    await openGraded(page);
    const region = sheet(page);

    await expect(region.getByRole("radio", { name: "Classic rectangle" })).toBeChecked();
    await region.getByText("Sunset wash", { exact: true }).click();

    await expect(region.getByRole("radio", { name: "Sunset wash" })).toBeChecked();
    await expect(region.getByRole("heading", { level: 3 })).toHaveText("Sunset wash");
    await expect(region.getByRole("img", { name: /rose at the top through coral into gold/ })).toBeVisible();
    await expect(region.locator("ol li").first()).toContainText("Mix two puddles");
    await expect(region.getByText("Photo inspiration")).toBeVisible();
    await expect(region.getByText(/Photo by César Couto on/)).toBeVisible();
    await expect(page).toHaveURL(/warmup=graded-wash&variation=sunset-wash/);

    // A reload - a locked phone, a discarded tab - lands on the same guide.
    await page.reload();
    await ready(page);
    await expect(sheet(page).getByRole("radio", { name: "Sunset wash" })).toBeChecked();
  });

  test("the example and the steps stay in view together while painting", async ({ page }) => {
    await openGraded(page);
    const firstStep = sheet(page).locator("ol li").first();
    await firstStep.scrollIntoViewIfNeeded();
    await page.evaluate(() =>
      document.querySelector("ol li")!.scrollIntoView({ block: "center" }),
    );
    await scrollSettled(page);

    const seen = await page.evaluate(() => {
      const headerBottom = document.querySelector("header")!.getBoundingClientRect().bottom;
      const art = document.querySelector(".warmup-example svg")!.getBoundingClientRect();
      const step = document.querySelector(".warmup-guide ol li")!.getBoundingClientRect();
      const visible = (r: DOMRect) => r.top >= headerBottom - 1 && r.bottom <= window.innerHeight + 1;
      return {
        art: visible(art),
        step: visible(step),
        artTop: Math.round(art.top),
        headerBottom: Math.round(headerBottom),
      };
    });

    expect(seen.step, "the first step is on screen").toBe(true);
    expect(seen.art, `the example is on screen (top ${seen.artTop}, header ${seen.headerBottom})`).toBe(true);
  });

  test("a warm-up opened low on the page comes up to meet you", async ({ page }) => {
    await page.goto("/#/exercises");
    await ready(page);
    await row(page, /graded wash/i).click();
    await scrollSettled(page);

    const start = await startsInView(page, "article:has([aria-expanded='true'])");
    expect(start.clear, `the open warm-up starts at ${start.top}, under the header`).toBe(true);
    await expect(row(page, /graded wash/i)).toBeFocused();
  });

  test("the keyboard can open, choose and close, with focus always visible", async ({ page }) => {
    await page.goto("/#/exercises");
    await ready(page);
    await row(page, /graded wash/i).focus();
    await page.keyboard.press("Enter");
    await expect(sheet(page)).toBeVisible();

    // Into the variation group: the checked radio takes focus, arrows choose.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("radio", { name: "Classic rectangle" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Fading sky" })).toBeChecked();
    await expect(sheet(page).getByRole("heading", { level: 3 })).toHaveText("Fading sky");

    // The input is visually hidden, so its card carries the ring.
    const ring = await page.evaluate(() => {
      const label = (document.activeElement as HTMLElement).closest("label")!;
      const s = getComputedStyle(label);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(ring.style).not.toBe("none");
    expect(ring.width).toBeGreaterThanOrEqual(2);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("region")).toHaveCount(0);
    await expect(row(page, /graded wash/i)).toBeFocused();
  });

  test("filters narrow the list and survive a reload", async ({ page }) => {
    await page.goto("/#/exercises");
    await ready(page);
    await page.getByRole("button", { name: /^Colour$/ }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
    await page.reload();
    await ready(page);
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^Colour$/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("with a sheet open, nothing scrolls sideways and every target is 44px", async ({ page }) => {
    await page.goto("/#/exercises?warmup=value-ladder&variation=layered-mountains");
    await ready(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const small = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll("main button, main a[href], main label")) {
        const box = el.getBoundingClientRect();
        if (box.width < 1) continue;
        // Credit links are inline text in a sentence, exempt under WCAG 2.5.8.
        if (el.closest("figcaption")) continue;
        if (box.width < 43.5 || box.height < 43.5) {
          out.push(`${(el.textContent ?? "").trim().slice(0, 24)} ${Math.round(box.width)}x${Math.round(box.height)}`);
        }
      }
      return out;
    });
    expect(small, small.join(" | ")).toEqual([]);
  });

  /*
    Real-browser check of the Wake Lock wiring. A headless browser may grant
    or refuse the lock; either is a legitimate answer, and the switch must
    tell the truth about which it got. Whether a phone's screen actually stays
    awake can only be checked on a device.

    Requests are counted on the real API, not stubbed, so this also proves one
    tap after a refusal asks again - a refusal used to leave the switch needing
    two.
  */
  test("keep screen on answers truthfully, and asks again on one tap", async ({ page }) => {
    await page.addInitScript(() => {
      const lock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock;
      if (!lock) return;
      const real = lock.request.bind(lock);
      const w = window as unknown as { __requests: number };
      w.__requests = 0;
      lock.request = (type?: WakeLockType) => {
        w.__requests += 1;
        return real(type);
      };
    });
    await openGraded(page);
    const keep = page.getByRole("switch", { name: /keep screen on/i });
    if ((await keep.count()) === 0) {
      test.skip(true, "this browser offers no Screen Wake Lock, so the switch is rightly absent");
    }

    // The live region is in the page before it has anything to say, so the
    // message is announced when it arrives rather than appearing unannounced.
    const status = sheet(page).getByRole("status");
    expect(await status.evaluate((el) => getComputedStyle(el).display)).not.toBe("none");

    await keep.click();
    await expect(status).toHaveText(/stay on|didn't keep/);
    const said = (await status.textContent()) ?? "";
    const granted = /stay on/.test(said);
    await expect(keep).toHaveAttribute("aria-checked", granted ? "true" : "false");

    if (!granted) {
      await keep.click();
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { __requests: number }).__requests))
        .toBe(2);
    }
  });
});
