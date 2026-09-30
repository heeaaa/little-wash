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

/**
 * How much of the screen's short axis the open enlarged view fills.
 *
 * Measures the painted image (object-fit: contain) along whichever of the
 * viewport's axes is shorter, which is the axis a reference can always fill
 * whatever its shape. This used to compare the image's own short side with the
 * viewport's, which only holds for square images: a portrait photo filling a
 * landscape phone top to bottom scored 0.77 because its width is its short
 * side. Measured 29/09/2026 on the Dogwood Vase, 3:4 portrait: 344 of 360px
 * tall on a Pixel 7 held sideways, 749 of 900px on desktop.
 */
export async function enlargedFill(page: Page) {
  return page.evaluate(() => {
    const img = document.querySelector("dialog[open] img") as HTMLImageElement;
    const box = img.getBoundingClientRect();
    const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const painted = { width: img.naturalWidth * scale, height: img.naturalHeight * scale };
    const shortIsHeight = window.innerHeight <= window.innerWidth;
    return {
      ratio: shortIsHeight
        ? painted.height / window.innerHeight
        : painted.width / window.innerWidth,
      clipped:
        box.top < -1 ||
        box.left < -1 ||
        box.bottom > window.innerHeight + 1 ||
        box.right > window.innerWidth + 1,
    };
  });
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

/*
  Browse draws a page at a time and keeps the length in the URL. A spec that
  needs every piece asks for more than there are, which the app clamps to the
  whole list - one navigation rather than a button press per page.
*/
const EVERY_PIECE = "shown=100000";

/** Every piece the unfiltered catalogue offers: id, title, minutes. */
export async function catalogue(page: Page) {
  await page.goto(`/#/browse?${EVERY_PIECE}`);
  await ready(page);
  return readPieces(page);
}

/** The number the results heading states: every match, not only the page drawn. */
export function resultsCount(page: Page) {
  return page.locator("main h2.jump-target + span");
}

/**
 * How many pieces the unfiltered catalogue holds, as Browse states it.
 *
 * For a spec that needs only the size. Drawing all 189 cards to count them was
 * most of the time in journeys that sat at their 30s limit.
 */
export async function catalogueSize(page: Page) {
  await page.goto("/#/browse");
  await ready(page);
  return Number(await resultsCount(page).textContent());
}

/** Press "Show more" until the whole result is on screen, as a painter would. */
export async function showEveryPiece(page: Page) {
  const more = page.getByRole("button", { name: /^Show (\d+ more|the last \d+)$/ });
  while (await more.isVisible()) {
    const before = await pieceCards(page).count();
    await more.click();
    await page.waitForFunction(
      (count) =>
        document.querySelectorAll('main li a[href*="/piece/"]').length > count,
      before,
    );
  }
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

/**
 * The first series Browse offers: its page and what its card promises.
 *
 * Read from Browse for the same reason pieces are: a curator can rename,
 * reorder or add series, and a spec that names one breaks for a reason that
 * has nothing to do with the behaviour it guards.
 */
export async function firstSeries(page: Page) {
  await page.goto("/#/browse");
  await ready(page);
  const section = page.locator("section").filter({
    has: page.getByRole("heading", { level: 2, name: "Series" }),
  });
  // The inner locator must be a fresh one: `has` is queried inside each list
  // item, so one already rooted at the section would look for a section there.
  const card = section.locator("li").filter({ has: page.locator('a[href*="/series/"]') }).first();
  const link = card.locator('a[href*="/series/"]');
  const size = Number((await card.textContent())?.match(/(\d+)\s*pieces/)?.[1] ?? Number.NaN);
  return {
    href: (await link.getAttribute("href"))!,
    title: (await link.textContent())!.trim(),
    size,
  };
}

/** The pieces a series page lists, in order: number, title and link. */
export async function seriesRows(page: Page) {
  return page.locator("main ol > li").evaluateAll((rows) =>
    rows.map((row) => {
      const link = row.querySelector('a[href*="/piece/"]') as HTMLAnchorElement;
      // The numeral sits beside the title, not first in the row: a picture
      // that fails to load puts its message ahead of it.
      return {
        number: Number(link.parentElement?.textContent?.trim().match(/^\d+/)?.[0] ?? Number.NaN),
        title: link.textContent?.trim() ?? "",
        href: link.getAttribute("href") ?? "",
      };
    }),
  );
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
    // The count the results heading states, rather than drawing every card of
    // every subject: this ran inside journeys already near their time limit.
    await page.goto(`/#/browse?subject=${name}`);
    await ready(page);
    const count = Number(await resultsCount(page).textContent());
    if (count > 0 && count < catalogueSize && (!best || count < best.count)) {
      best = { name, count };
    }
  }

  if (!best) throw new Error("No subject narrows the catalogue; is it all one subject?");
  return best;
}
