/**
 * The series on Browse.
 *
 * A card per series that is whole in the catalogue the painter has switched
 * on, and nothing for one that is not: a series with a gap in it would break
 * its own title.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Browse } from "@/screens/Browse";
import { SERIES, type Series as SeriesEntry } from "@/data/series";
import { makePhoto, makeReference } from "@/test/factory";

const SOURCES_KEY = "little-wash:sources:v1";

const CATALOGUE = [
  makeReference("sky-one", { title: "Sky One", minutes: 8 }),
  makeReference("sky-two", { title: "Sky Two", minutes: 20 }),
  makePhoto("leaf-one", "unsplash", { title: "Leaf One", minutes: 9 }),
  makeReference("leaf-two", { title: "Leaf Two", minutes: 9 }),
];

const SKIES: SeriesEntry = {
  id: "two-skies",
  title: "Two skies",
  blurb: "A sky, then another.",
  pigmentVar: "--pig-landscape",
  pieceIds: ["sky-one", "sky-two"],
};

const LEAVES: SeriesEntry = {
  id: "two-leaves",
  title: "Two leaves",
  blurb: "A leaf, then another.",
  pigmentVar: "--pig-botanical",
  pieceIds: ["leaf-one", "leaf-two"],
};

// The shipped list is read directly by Browse; see Series.test.tsx.
const shipped = SERIES as SeriesEntry[];
const SHIPPED = [...shipped];

beforeEach(() => {
  localStorage.clear();
  shipped.length = 0;
  shipped.push(SKIES, LEAVES);
});

afterEach(() => {
  shipped.length = 0;
  shipped.push(...SHIPPED);
});

function renderBrowse() {
  return render(
    <MemoryRouter initialEntries={["/browse"]}>
      <AppProvider references={CATALOGUE} today={new Date(2026, 8, 30)}>
        <Browse />
      </AppProvider>
    </MemoryRouter>,
  );
}

const seriesSection = () =>
  screen.getByRole("heading", { level: 2, name: "Series" }).closest("section")!;

describe("the series on Browse", () => {
  it("offers a card for each series, in the editorial order", () => {
    renderBrowse();
    const titles = within(seriesSection())
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(["Two skies", "Two leaves"]);
  });

  it("gives each card one link, to its series, named by its title alone", () => {
    // The strip of plates is decorative: seven descriptions read out inside
    // the link would bury the title.
    renderBrowse();
    const links = within(seriesSection()).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Two skies", "/series/two-skies"],
      ["Two leaves", "/series/two-leaves"],
    ]);
  });

  it("says how many pieces a series holds and how long each takes", () => {
    renderBrowse();
    expect(within(seriesSection()).getByText("2 pieces · 8-20 min each")).toBeVisible();
    expect(within(seriesSection()).getByText("2 pieces · 9 min each")).toBeVisible();
  });

  it("leaves out a series whose source is switched off", () => {
    localStorage.setItem(SOURCES_KEY, JSON.stringify({ disabled: ["unsplash"] }));
    renderBrowse();
    expect(within(seriesSection()).getByRole("link", { name: "Two skies" })).toBeVisible();
    expect(within(seriesSection()).queryByRole("link", { name: "Two leaves" })).toBeNull();
  });

  it("drops the whole section when no series is whole", () => {
    localStorage.setItem(SOURCES_KEY, JSON.stringify({ disabled: ["unsplash", "placeholder"] }));
    renderBrowse();
    expect(screen.queryByRole("heading", { level: 2, name: "Series" })).toBeNull();
  });

  it("does not count the series' pieces among the catalogue's cards", () => {
    // pieceCards() in e2e/support.ts reads every list item that links to a
    // piece. A series card links to its series, so the catalogue count holds.
    renderBrowse();
    const pieceLinks = within(seriesSection())
      .queryAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/piece/"));
    expect(pieceLinks).toEqual([]);
  });
});
