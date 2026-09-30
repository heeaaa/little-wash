import { describe, it, expect } from "vitest";
import { PAGE_SIZE, nextShown, showMoreLabel, shownCount } from "./paging";

describe("shownCount", () => {
  it("starts on the first page", () => {
    expect(shownCount(null, 189)).toBe(PAGE_SIZE);
  });

  it("keeps however many the URL says are showing", () => {
    expect(shownCount("48", 189)).toBe(48);
  });

  it("never asks for more than there are", () => {
    expect(shownCount("9999", 189)).toBe(189);
  });

  it("shows everything when there is less than a page", () => {
    expect(shownCount(null, 7)).toBe(7);
    expect(shownCount("48", 7)).toBe(7);
  });

  it("never shows less than a page, whatever the URL asks", () => {
    // Asking for fewer than a page is not a thing the button can do, so the
    // only way here is a hand-edited link.
    expect(shownCount("3", 189)).toBe(PAGE_SIZE);
    expect(shownCount("0", 189)).toBe(PAGE_SIZE);
  });

  it("falls back to the first page for a value that is not a count", () => {
    for (const junk of ["", "banana", "-48", "4.5", "48abc", " 48"]) {
      expect(shownCount(junk, 189), junk).toBe(PAGE_SIZE);
    }
  });

  it("shows nothing when nothing matches", () => {
    expect(shownCount(null, 0)).toBe(0);
  });
});

describe("nextShown", () => {
  it("adds a page", () => {
    expect(nextShown(24, 189)).toBe(48);
  });

  it("stops at the end", () => {
    expect(nextShown(168, 189)).toBe(189);
    expect(nextShown(189, 189)).toBe(189);
  });
});

describe("showMoreLabel", () => {
  it("says how many a full page brings", () => {
    expect(showMoreLabel(24, 189)).toBe("Show 24 more");
  });

  it("says when what is left is the last of them", () => {
    expect(showMoreLabel(168, 189)).toBe("Show the last 21");
  });

  it("counts a final page of exactly one page as a full one", () => {
    expect(showMoreLabel(24, 48)).toBe("Show 24 more");
  });
});
