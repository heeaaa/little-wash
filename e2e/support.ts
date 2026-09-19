import type { BrowserContext, Page } from "@playwright/test";

/** The one store this prototype has. Versioned, so the key is worth naming once. */
const FAVOURITES_KEY = "little-wash:favorites:v1";

/**
 * Put pieces in the studio before the app boots.
 *
 * Ids are stored oldest-first, the order `toggleFavorite` appends them in, so
 * the last id here is the one the studio and the header palette show first.
 */
export async function seedFavourites(context: BrowserContext, ids: string[]) {
  await context.addInitScript(
    ([key, seeded]) => {
      try {
        localStorage.setItem(key as string, JSON.stringify({ ids: seeded }));
      } catch {
        /* private mode - the app degrades to in-memory, which is what we want to see */
      }
    },
    [FAVOURITES_KEY, ids] as const,
  );
}

/** Wait for fonts and the first paint to settle before measuring anything. */
export async function ready(page: Page) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForLoadState("networkidle");
}

/** The title of the piece Today is currently offering. */
export function featuredTitle(page: Page) {
  return page.getByTestId("featured").getByRole("heading").first();
}

/** Cards in a results grid, whichever screen they are on. */
export function pieceCards(page: Page) {
  return page.locator("li").filter({ has: page.locator('a[href*="/piece/"]') });
}

/**
 * Wait for a smooth scroll to come to rest.
 *
 * The app scrolls smoothly when it brings something to you, so measuring
 * straight after the click reads a position mid-flight.
 */
export async function scrollSettled(page: Page) {
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __y?: number; __still?: number };
      const y = Math.round(window.scrollY);
      if (w.__y === y) w.__still = (w.__still ?? 0) + 1;
      else {
        w.__y = y;
        w.__still = 0;
      }
      return (w.__still ?? 0) > 3;
    },
    null,
    { timeout: 5_000 },
  );
}

/**
 * Is the *start* of this element visible and clear of the sticky header?
 *
 * For anything that can be taller than the screen - a panel of copy and
 * buttons on a landscape phone - requiring the whole element to fit is a
 * test that can never pass. What matters is that it does not begin underneath
 * the header, which is the defect this guards.
 */
export async function startsInView(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false, clear: false, top: null as number | null };
    const box = el.getBoundingClientRect();
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    return {
      found: true,
      clear: box.top >= headerBottom - 1 && box.top < window.innerHeight,
      top: Math.round(box.top),
    };
  }, selector);
}

/** Is this element inside the viewport and clear of the sticky header? */
export async function isInFirstScreen(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false, clear: false, top: null as number | null };
    const box = el.getBoundingClientRect();
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    return {
      found: true,
      clear: box.top >= headerBottom - 1 && box.bottom <= window.innerHeight,
      top: Math.round(box.top),
    };
  }, selector);
}
