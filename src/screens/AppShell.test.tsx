import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/screens/AppShell";
import { Studio } from "@/screens/Studio";

const STORAGE_KEY = "little-wash:favorites:v1";

function seed(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids }));
}

function renderShell(entry = "/studio") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="studio" element={<Studio />} />
          <Route path="browse" element={<h1>Browse the studio</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Both navs carry the same items; the desktop one is enough to assert on. */
const navLinks = () =>
  within(screen.getAllByRole("navigation", { name: /primary/i })[0]!)
    .getAllByRole("link")
    .map((a) => a.textContent?.trim());

beforeEach(() => localStorage.clear());

describe("AppShell header", () => {
  it("leaves the studio out of the nav until something is saved", () => {
    renderShell();
    expect(navLinks()).toEqual(["Today", "Browse", "Exercises"]);
  });

  it("adds the studio to the nav once a piece is saved", () => {
    seed(["ripe-pear"]);
    renderShell();
    expect(navLinks()).toEqual(["Today", "Browse", "Exercises", "Studio"]);
  });

  /*
    The nav entry is a convenience, not the only way in. Someone standing on
    the studio who removes their last piece loses the nav item - the route and
    the palette link must both keep working, or they are stranded on a page
    they can no longer navigate back to.
  */
  it("keeps the studio reachable after the last piece is removed", async () => {
    const user = userEvent.setup();
    seed(["ripe-pear"]);
    renderShell();

    expect(navLinks()).toContain("Studio");
    await user.click(screen.getByRole("link", { name: /your studio/i }));
    expect(screen.getByRole("heading", { name: "Your studio", level: 1 })).toBeInTheDocument();

    // Actually remove the last piece, which is the case this guards: the nav
    // entry goes, and someone standing on /studio must not be stranded there.
    await user.click(screen.getByRole("button", { name: /^Saved\. Remove Ripe Pear/ }));

    expect(navLinks()).not.toContain("Studio");
    expect(screen.getByRole("heading", { name: "Your studio", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /your studio/i })).toHaveAttribute("href", "/studio");
  });

  it("always offers the palette as a way in, even with nothing saved", () => {
    renderShell("/browse");
    expect(screen.getByRole("link", { name: /your studio: nothing set aside yet/i })).toHaveAttribute(
      "href",
      "/studio",
    );
  });
});
