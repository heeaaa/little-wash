/**
 * A series page, and a piece opened from one.
 *
 * The behaviour tests are ordinary: the run in order, the way through it on
 * Detail, and the states where a series cannot be shown. The ones under "the
 * register" are the requirement. A finite, numbered run is exactly where "3 of
 * 7", "day 3" or "series complete" would creep in, and PRODUCT.md:94 rules all
 * of it out, so it is asserted rather than trusted.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Series } from "@/screens/Series";
import { Detail } from "@/screens/Detail";
import { SERIES, type Series as SeriesEntry } from "@/data/series";
import { makePhoto, makeReference } from "@/test/factory";

const TODAY = new Date(2026, 8, 30, 10, 0);
const PAINTED_KEY = "little-wash:painted:v1";
const SOURCES_KEY = "little-wash:sources:v1";

const CATALOGUE = [
  makeReference("pear-three", { title: "Pear Three", minutes: 25, difficulty: "steady" }),
  makeReference("pear-one", { title: "Pear One", minutes: 8 }),
  makePhoto("pear-two", "unsplash", { title: "Pear Two", minutes: 12 }),
  makeReference("elsewhere", { title: "Elsewhere" }),
];

const THREE_PEARS: SeriesEntry = {
  id: "three-pears",
  title: "Three pears",
  blurb: "Three pears, simplest first.",
  pigmentVar: "--pig-fruit",
  pieceIds: ["pear-one", "pear-two", "pear-three"],
};

const GONE: SeriesEntry = {
  id: "gone-pears",
  title: "Two gone pears",
  blurb: "One of these left the catalogue.",
  pigmentVar: "--pig-fruit",
  pieceIds: ["pear-one", "a-retired-pear"],
};

/*
  SERIES is the shipped editorial list and both screens read it directly, so
  test series stand in its place here and are put back afterwards, the way
  BrowseCollection.test.tsx treats COLLECTIONS.
*/
const shipped = SERIES as SeriesEntry[];
const SHIPPED = [...shipped];

beforeEach(() => {
  localStorage.clear();
  shipped.length = 0;
  shipped.push(THREE_PEARS, GONE);
});

afterEach(() => {
  shipped.length = 0;
  shipped.push(...SHIPPED);
});

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/"
          element={
            <AppProvider references={CATALOGUE} today={TODAY}>
              <Outlet />
            </AppProvider>
          }
        >
          <Route index element={<p>today</p>} />
          <Route path="series/:id" element={<Series />} />
          <Route path="piece/:id" element={<Detail />} />
          <Route path="browse" element={<p>browse</p>} />
          <Route path="sources" element={<p>sources</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const rows = () => screen.getAllByRole("listitem");
const main = () => document.body;

describe("a series page", () => {
  it("is titled by the series and says what it is", () => {
    renderAt("/series/three-pears");
    expect(screen.getByRole("heading", { level: 1, name: "Three pears" })).toBeVisible();
    expect(screen.getByText("Three pears, simplest first.")).toBeVisible();
  });

  it("answers how long before it is opened", () => {
    renderAt("/series/three-pears");
    expect(screen.getByText("3 pieces · 8-25 min each")).toBeVisible();
  });

  it("lists the pieces in the curator's order, numbered from 1", () => {
    renderAt("/series/three-pears");
    const listed = rows().map((row) => ({
      number: row.textContent?.trim().match(/^\d+/)?.[0],
      title: within(row).getByRole("link").textContent,
    }));
    expect(listed).toEqual([
      { number: "1", title: "Pear One" },
      { number: "2", title: "Pear Two" },
      { number: "3", title: "Pear Three" },
    ]);
  });

  it("gives each row exactly one link, which keeps the piece in its series", () => {
    renderAt("/series/three-pears");
    for (const row of rows()) {
      const links = within(row).getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", expect.stringMatching(/^\/piece\/pear-\w+\?series=three-pears$/));
    }
  });

  it("saves from a row without opening the piece", async () => {
    const user = userEvent.setup();
    renderAt("/series/three-pears");

    await user.click(screen.getByRole("button", { name: /save pear two/i }));

    expect(screen.getByRole("button", { name: /saved\. remove pear two/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Three pears" })).toBeVisible();
  });

  it("shows the day a piece was painted, on that piece only", () => {
    localStorage.setItem(
      PAINTED_KEY,
      JSON.stringify({ entries: [{ id: "pear-two", on: "2026-09-14" }] }),
    );
    renderAt("/series/three-pears");

    const [one, two, three] = rows();
    expect(within(two!).getByText("Painted 14 September")).toBeVisible();
    expect(within(one!).queryByText(/painted/i)).toBeNull();
    expect(within(three!).queryByText(/painted/i)).toBeNull();
  });
});

describe("when a series cannot be shown", () => {
  it("explains a series whose source is switched off, and offers the switch", () => {
    localStorage.setItem(SOURCES_KEY, JSON.stringify({ disabled: ["unsplash"] }));
    renderAt("/series/three-pears");

    // Still titled by the series, so a followed link says what it was for.
    expect(screen.getByRole("heading", { level: 1, name: "Three pears" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "This series needs Unsplash" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Where ideas come from" })).toHaveAttribute(
      "href",
      "/sources",
    );
    // Whole or not at all: no rows with a gap where Pear Two was.
    expect(screen.queryByRole("link", { name: "Pear One" })).toBeNull();
  });

  it("names every switched-off source it needs", () => {
    localStorage.setItem(SOURCES_KEY, JSON.stringify({ disabled: ["unsplash", "placeholder"] }));
    renderAt("/series/three-pears");
    expect(
      screen.getByRole("heading", { name: "This series needs Prototype placeholders and Unsplash" }),
    ).toBeVisible();
  });

  it("says a series is not here when a piece has left the catalogue", () => {
    // No switch would bring it back, so it must not promise one.
    renderAt("/series/gone-pears");
    expect(screen.getByRole("heading", { level: 1, name: "That series isn’t here" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Where ideas come from" })).toBeNull();
  });

  it("says so for an id that names no series, and offers the way back", () => {
    renderAt("/series/no-such-series");
    expect(screen.getByRole("heading", { level: 1, name: "That series isn’t here" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse the catalogue" })).toHaveAttribute(
      "href",
      "/browse",
    );
  });
});

describe("a piece opened from a series", () => {
  const steps = () => screen.getByRole("navigation", { name: /three pears/i });

  it("goes back to the series, by name", () => {
    renderAt("/piece/pear-two?series=three-pears");
    const back = screen.getAllByRole("link")[0]!;
    expect(back).toHaveTextContent("Three pears");
    expect(back).toHaveAttribute("href", "/series/three-pears");
  });

  it("says where it sits, and offers the pieces either side", () => {
    renderAt("/piece/pear-two?series=three-pears");
    expect(within(steps()).getByRole("heading", { name: "Three pears · No. 2" })).toBeVisible();
    expect(within(steps()).getByRole("link", { name: /previous no\. 1 pear one/i })).toHaveAttribute(
      "href",
      "/piece/pear-one?series=three-pears",
    );
    expect(within(steps()).getByRole("link", { name: /next no\. 3 pear three/i })).toHaveAttribute(
      "href",
      "/piece/pear-three?series=three-pears",
    );
  });

  it("offers no previous on the first piece", () => {
    renderAt("/piece/pear-one?series=three-pears");
    expect(within(steps()).queryByRole("link", { name: /previous/i })).toBeNull();
    expect(within(steps()).getByRole("link", { name: /next no\. 2 pear two/i })).toBeVisible();
  });

  it("offers the way back to the series in place of next on the last piece", () => {
    renderAt("/piece/pear-three?series=three-pears");
    expect(within(steps()).queryByRole("link", { name: /^next/i })).toBeNull();
    expect(within(steps()).getByRole("link", { name: /back to the series/i })).toHaveAttribute(
      "href",
      "/series/three-pears",
    );
  });

  it("steps to the next piece, still in the series", async () => {
    const user = userEvent.setup();
    renderAt("/piece/pear-one?series=three-pears");

    await user.click(within(steps()).getByRole("link", { name: /next/i }));

    expect(screen.getByRole("heading", { level: 1, name: "Pear Two" })).toBeVisible();
    expect(within(steps()).getByRole("heading", { name: "Three pears · No. 2" })).toBeVisible();
  });

  it("tries the next piece's image even when this one failed to load", async () => {
    /*
      Previous and Next keep Detail mounted and change only the piece. RefArt
      remembers whether its image loaded, so without a fresh page per piece a
      reference that failed would show the next one as failed without trying.
    */
    const user = userEvent.setup();
    renderAt("/piece/pear-one?series=three-pears");
    fireEvent.error(screen.getByRole("img", { name: /a test subject for pear-one/i }));
    expect(screen.getByText(/this reference didn.t load/i)).toBeInTheDocument();

    await user.click(within(steps()).getByRole("link", { name: /next/i }));

    expect(screen.getByRole("heading", { level: 1, name: "Pear Two" })).toBeVisible();
    expect(screen.queryByText(/this reference didn.t load/i)).toBeNull();
    expect(
      screen.getAllByRole("img", { name: /a test subject for pear-two/i })[0]!.tagName,
    ).toBe("IMG");
  });

  it("ignores a series it is not part of", () => {
    renderAt("/piece/elsewhere?series=three-pears");
    expect(screen.queryByRole("navigation", { name: /three pears/i })).toBeNull();
    expect(screen.getAllByRole("link")[0]).toHaveTextContent("Today");
  });

  it("ignores an id that names no series", () => {
    renderAt("/piece/pear-one?series=no-such-series");
    expect(screen.queryByRole("navigation", { name: /three pears/i })).toBeNull();
    expect(screen.getAllByRole("link")[0]).toHaveTextContent("Today");
  });

  it("ignores a series that has been withdrawn, rather than offering half of it", () => {
    localStorage.setItem(SOURCES_KEY, JSON.stringify({ disabled: ["unsplash"] }));
    renderAt("/piece/pear-one?series=three-pears");
    expect(screen.getByRole("heading", { level: 1, name: "Pear One" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: /three pears/i })).toBeNull();
  });
});

describe("the register: no pressure, ever", () => {
  function seedPainted() {
    localStorage.setItem(
      PAINTED_KEY,
      JSON.stringify({
        entries: [
          { id: "pear-one", on: "2026-09-14" },
          { id: "pear-two", on: "2026-09-29" },
        ],
      }),
    );
  }

  const screensToRead = [
    ["the series page", "/series/three-pears"],
    ["the first piece", "/piece/pear-one?series=three-pears"],
    ["the last piece", "/piece/pear-three?series=three-pears"],
  ] as const;

  for (const [name, entry] of screensToRead) {
    describe(name, () => {
      it("states no position as progress through the series", () => {
        // "No. 2" is a place in the order. "2 of 3", "2/3" and "1 to go" are
        // how far through you are.
        seedPainted();
        renderAt(entry);
        const text = main().textContent ?? "";
        expect(text).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/i);
        expect(text).not.toMatch(/\b\d+\s*(to go|left|remaining)\b/i);
        expect(text).not.toMatch(/\b\d+\s*%/);
      });

      it("uses no achievement or schedule language", () => {
        seedPainted();
        renderAt(entry);
        expect(main().textContent ?? "").not.toMatch(
          /\b(complete[sd]?|finish(ed)?|done|well done|congrat\w*|streak|unlock(ed)?|achiev\w*|goal|target|badge|progress|day\s*\d+|last one)\b/i,
        );
      });

      it("dates what was painted absolutely, never as a duration from now", () => {
        seedPainted();
        renderAt(entry);
        expect(main().textContent ?? "").not.toMatch(
          /\b(ago|yesterday|last week|this week|in a row)\b/i,
        );
      });
    });
  }

  it("says nothing about a series being over when everything in it is painted", () => {
    localStorage.setItem(
      PAINTED_KEY,
      JSON.stringify({
        entries: THREE_PEARS.pieceIds.map((id) => ({ id, on: "2026-09-20" })),
      }),
    );
    renderAt("/series/three-pears");
    // The page reads exactly as it does with nothing painted, plus the dates.
    expect(main().textContent ?? "").not.toMatch(
      /\b(all (three|3)|every one|the whole series|whole set|all done)\b/i,
    );
    expect(screen.getAllByText(/^Painted /)).toHaveLength(3);
  });
});
