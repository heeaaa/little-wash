import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// A jsdom-friendly matchMedia stub so components that read prefers-reduced-motion
// or breakpoints during tests do not throw.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom implements no scrolling at all, so components that move the viewport
// would throw here. Scroll position is verified in the browser; these tests
// assert the behaviour that survives without it - chiefly where focus lands.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom defines window.scrollTo but only to report "not implemented", which
// every navigation in a test would print. Tests that care spy on it.
if (typeof window !== "undefined") {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // ignore - storage may be unavailable in some environments
  }
});
