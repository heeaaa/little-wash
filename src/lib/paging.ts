/**
 * How much of a long result list to draw at once.
 *
 * Browse used to render every matching piece in one go. Measured 30/09/2026
 * on a Pixel 7 profile with the CPU slowed four times, the whole catalogue of
 * 189 blocked the main thread for 1,113ms on arrival and a filter tap took
 * 1,792ms to paint; thirty pieces took 464ms and 389ms. Images were never the
 * problem - they were already lazy - the cards themselves were, at about 4ms
 * each, and the catalogue grows every curation session.
 *
 * So the list is drawn a page at a time, and the rest comes on request. A
 * button rather than loading on scroll: an endless list keeps the footer, and
 * the credits it carries, out of reach, and it moves under a keyboard or a
 * screen reader without being asked. How many are showing lives in the URL,
 * so Back returns to a list as long as the one you left, which is what lets
 * the browser put you back where you were.
 */

/** Pieces per page: eight rows of three on a wide screen, twelve of two. */
export const PAGE_SIZE = 24;

/** The query parameter holding how many pieces are showing. */
export const SHOWN_PARAM = "shown";

/**
 * How many of `total` pieces to draw, given the URL's value.
 *
 * Anything that is not a whole number above zero means the first page, the
 * same way a stale filter value falls back rather than breaking the page.
 */
export function shownCount(raw: string | null, total: number): number {
  const asked = raw !== null && /^\d+$/.test(raw) ? Number(raw) : PAGE_SIZE;
  return Math.min(total, Math.max(PAGE_SIZE, asked));
}

/** How many will be showing after one more page. */
export function nextShown(current: number, total: number): number {
  return Math.min(total, current + PAGE_SIZE);
}

/** The button's words: "Show 24 more", or "Show the last 13". */
export function showMoreLabel(current: number, total: number): string {
  const coming = nextShown(current, total) - current;
  return coming < PAGE_SIZE ? `Show the last ${coming}` : `Show ${coming} more`;
}
