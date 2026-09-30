import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * A new page opens at its top.
 *
 * Nothing reset the scroll on navigation, so a page kept the position of the
 * one before it, clamped to its own height. Measured 30/09/2026 on a Pixel 7:
 * a piece opened from card 41 on Browse (y=21283) landed at scrollY 579, its
 * plate at -370px and entirely off the screen - the reference, which is the
 * point of that screen, was the one thing not in view.
 *
 * - Only a change of page moves the scroll. Filters, deals and warm-ups
 *   rewrite the query string in place, and that is the same page.
 * - Back and Forward are left to the browser, which already returns you to
 *   the place you left: Browse came back at exactly y=21283.
 * - A layout effect, so the page is at its top before it is painted, and
 *   before a view transition takes its snapshot of the new state.
 */
export function useNewPageAtTop(): void {
  const { pathname } = useLocation();
  const type = useNavigationType();
  const shown = useRef(pathname);

  useLayoutEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    if (type === "POP") return;
    window.scrollTo(0, 0);
  }, [pathname, type]);
}
