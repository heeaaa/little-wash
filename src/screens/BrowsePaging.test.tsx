/**
 * Browse draws its results a page at a time.
 *
 * Every matching piece used to be rendered at once, which on a slowed phone
 * profile blocked the main thread for over a second and made a filter tap
 * take 1.8s to paint (lib/paging.ts has the numbers). These cover what a
 * painter meets: a first page, more on request, a place that survives a
 * reload, and a fresh start when the results change.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Browse } from "@/screens/Browse";
import { makeReference } from "@/test/factory";
import type { PaintReference } from "@/lib/types";

/** Numbered so the order on screen is checkable: piece-01, piece-02... */
function catalogueOf(count: number, over: (i: number) => Partial<PaintReference> = () => ({})) {
  return Array.from({ length: count }, (_, i) =>
    makeReference(`piece-${String(i + 1).padStart(2, "0")}`, over(i)),
  );
}

let location = "";
function Where() {
  const { search } = useLocation();
  location = search;
  return null;
}

function renderBrowse(references: PaintReference[], search = "") {
  return render(
    <MemoryRouter initialEntries={[`/browse${search}`]}>
      <Routes>
        <Route
          path="/browse"
          element={
            <AppProvider references={references} today={new Date(2026, 8, 30)}>
              <Browse />
              <Where />
            </AppProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const results = () =>
  screen.getByRole("heading", { level: 2, name: /the whole catalogue|matching pieces/i })
    .closest("div")!.parentElement!;
const cardTitles = () =>
  within(results())
    .getAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/piece/"))
    .map((link) => link.textContent);

beforeEach(() => {
  localStorage.clear();
  location = "";
});

describe("a long list, a page at a time", () => {
  it("draws the first page and says how many there are in all", () => {
    renderBrowse(catalogueOf(30));
    expect(cardTitles()).toHaveLength(24);
    expect(cardTitles()[0]).toBe("piece-01");
    expect(screen.getByText("Showing 24 of 30")).toBeVisible();
    // The heading still states the whole result, not the page.
    expect(within(results()).getByText("30")).toBeVisible();
  });

  it("brings the rest on request, in order", async () => {
    const user = userEvent.setup();
    renderBrowse(catalogueOf(30));

    await user.click(screen.getByRole("button", { name: "Show the last 6" }));

    expect(cardTitles()).toHaveLength(30);
    expect(cardTitles().slice(-2)).toEqual(["piece-29", "piece-30"]);
    // Nothing left to show, so nothing offers to.
    expect(screen.queryByRole("button", { name: /^show/i })).toBeNull();
    expect(screen.queryByText(/^Showing/)).toBeNull();
  });

  it("takes focus to the first piece it added", async () => {
    // The new pieces arrive above the button. Leaving focus on the button, or
    // losing it when the button goes, would put the keyboard past them.
    const user = userEvent.setup();
    renderBrowse(catalogueOf(60));

    await user.click(screen.getByRole("button", { name: "Show 24 more" }));

    expect(screen.getByRole("link", { name: "piece-25" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Show the last 12" })).toBeVisible();
  });

  it("keeps how many are showing in the address, so Back and reload return to it", async () => {
    const user = userEvent.setup();
    renderBrowse(catalogueOf(60));
    await user.click(screen.getByRole("button", { name: "Show 24 more" }));
    expect(location).toBe("?shown=48");
  });

  it("opens a link at the length it was shared at", () => {
    renderBrowse(catalogueOf(60), "?shown=48");
    expect(cardTitles()).toHaveLength(48);
  });

  it("ignores a count it cannot read, and starts on the first page", () => {
    renderBrowse(catalogueOf(60), "?shown=lots");
    expect(cardTitles()).toHaveLength(24);
  });

  it("offers nothing more when everything fits on the first page", () => {
    renderBrowse(catalogueOf(7));
    expect(cardTitles()).toHaveLength(7);
    expect(screen.queryByRole("button", { name: /^show/i })).toBeNull();
  });
});

describe("a new set of results starts again", () => {
  it("returns to the first page when a filter changes", async () => {
    // Forty gentle pieces and twenty steady ones: narrowing to gentle still
    // leaves more than a page, so a kept count would be visible.
    const user = userEvent.setup();
    renderBrowse(
      catalogueOf(60, (i) => ({ difficulty: i < 40 ? "gentle" : "steady" })),
      "?shown=48",
    );
    expect(cardTitles()).toHaveLength(48);

    await user.click(screen.getAllByRole("button", { name: "Gentle" })[0]!);

    expect(cardTitles()).toHaveLength(24);
    expect(screen.getByText("Showing 24 of 40")).toBeVisible();
    expect(location).not.toContain("shown");
  });
});
