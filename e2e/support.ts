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

const PAINTED_KEY = "little-wash:painted:v1";

/**
 * Put pieces in the painted record before the app boots.
 *
 * Dated in the past on purpose: a fixed date keeps the rendered text stable,
 * and it exercises the "not this year / this year" branch of the date format
 * rather than only ever the day it happens to be run.
 */
export async function seedPainted(
  context: BrowserContext,
  ids: string[],
  on = "2026-09-14",
) {
  await context.addInitScript(
    ([key, seeded, day]) => {
      try {
        localStorage.setItem(
          key as string,
          JSON.stringify({
            entries: (seeded as string[]).map((id) => ({ id, on: day })),
          }),
        );
      } catch {
        /* private mode - the app degrades to in-memory, which is what we want to see */
      }
    },
    [PAINTED_KEY, ids, on] as const,
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

/*
  ───────────────────────────────────────────────────────────────────────────
  Reading the catalogue instead of hard-coding it.
  ───────────────────────────────────────────────────────────────────────────
  These specs used to assert `toHaveCount(12)` and a 4/5/3 split across the
  time bands, and to navigate to literal ids like `ripe-pear`. That was fine
  while the catalogue was twelve fixed placeholder SVGs and worthless the
  moment it became a curated set that grows every session.

  Worse, the magic numbers were standing in for properties nobody had written
  down. "4, 5 and 3" was really "the bands partition the catalogue and none of
  them returns all of it" - which is the defect that was actually being
  guarded, and which holds at any catalogue size. Asserting the property
  directly is both catalogue-independent and a stronger test.

  Everything below reads what the app is actually showing, through the same
  DOM a painter sees. Nothing is exported from the app for testing.
*/

/** Every piece the unfiltered catalogue offers: id, title, minutes. */
export async function catalogue(page: Page) {
  await page.goto("/#/browse");
  await ready(page);
  return readPieces(page);
}

/** The pieces currently on screen, whatever filter is applied. */
export async function readPieces(page: Page) {
  return pieceCards(page).evaluateAll((cards) =>
    cards.map((card) => {
      const link = card.querySelector('a[href*="/piece/"]') as HTMLAnchorElement | null;
      return {
        id: link?.getAttribute("href")?.split("/piece/")[1]?.split("?")[0] ?? "",
        title: link?.textContent?.trim() ?? "",
        minutes: Number(card.textContent?.match(/(\d+)\s*min/)?.[1] ?? Number.NaN),
      };
    }),
  );
}

/**
 * Real piece ids, for navigating to a detail view.
 *
 * Taken from Browse rather than named, so a spec keeps working when the
 * catalogue is rebuilt from a different harvest. This navigates the page it is
 * given; use `pieceIdsFrom` when the page must stay where it is.
 */
export async function pieceIds(page: Page, count = 1): Promise<string[]> {
  return take((await catalogue(page)).map((p) => p.id), count);
}

/**
 * The same, read on a scratch page so the page under test is left alone.
 *
 * Needed wherever ids are wanted *before* seeding: `addInitScript` applies from
 * the next navigation onwards, so navigating the page under test to go and
 * look up an id first means the seed never lands.
 */
export async function pieceIdsFrom(
  context: BrowserContext,
  count = 1,
): Promise<string[]> {
  const scratch = await context.newPage();
  try {
    return await pieceIds(scratch, count);
  } finally {
    await scratch.close();
  }
}

function take(ids: string[], count: number): string[] {
  const usable = ids.filter(Boolean);
  if (usable.length < count) {
    throw new Error(`Needed ${count} pieces, the catalogue has ${usable.length}`);
  }
  return usable.slice(0, count);
}

/** The time bands the app filters by, and what each one promises. */
export const TIME_BANDS = [
  { label: "Under 10 min", holds: (m: number) => m < 10 },
  { label: "10-20 min", holds: (m: number) => m >= 10 && m <= 20 },
  { label: "Over 20 min", holds: (m: number) => m > 20 },
] as const;

/** The app's subjects, as the filter offers them. */
const SUBJECTS = [
  "fruit",
  "botanical",
  "still-life",
  "creatures",
  "landscape",
  "objects",
] as const;

/**
 * The subject with the fewest pieces, and how many it has.
 *
 * Used where a spec needs a filter that genuinely narrows. Naming a subject
 * outright would tie the test to one harvest; the smallest non-empty one is
 * the sharpest available assertion whatever the catalogue holds.
 */
export async function smallestSubject(page: Page, catalogueSize: number) {
  let best: { name: string; count: number } | null = null;

  for (const name of SUBJECTS) {
    await page.goto(`/#/browse?subject=${name}`);
    await ready(page);
    const count = await pieceCards(page).count();
    if (count > 0 && count < catalogueSize && (!best || count < best.count)) {
      best = { name, count };
    }
  }

  if (!best) throw new Error("No subject narrows the catalogue; is it all one subject?");
  return best;
}
