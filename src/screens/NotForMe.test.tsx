/**
 * "Not for me", through the screens: Today, a piece's own page, Browse and the
 * list on Sources (docs/plans/not-for-me-reminders-curation.md, Phase 1).
 *
 * One AppProvider above every route, as in the app, so a piece hidden on one
 * screen is gone from the next.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Today } from "@/screens/Today";
import { Browse } from "@/screens/Browse";
import { Sources } from "@/screens/Sources";
import { Detail } from "@/screens/Detail";
import { mulberry32 } from "@/lib/shuffle";
import { makeReference } from "@/test/factory";
import type { PaintReference } from "@/lib/types";

const HIDDEN = "little-wash:hidden:v1";
const DAY = new Date("2026-10-19T09:00:00");

const CATALOG: PaintReference[] = [
  makeReference("tabby-cat", { title: "Tabby Cat", subject: "creatures", minutes: 15 }),
  makeReference("blue-jug", { title: "Blue Jug", subject: "objects", minutes: 10 }),
  makeReference("one-pear", { title: "One Pear", subject: "fruit", minutes: 5 }),
  makeReference("hill-line", { title: "Hill Line", subject: "landscape", minutes: 20 }),
  makeReference("fern-frond", { title: "Fern Frond", subject: "botanical", minutes: 12 }),
];

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname + location.search}</output>;
}

function renderApp(entry: string | { pathname: string; state?: unknown } = "/", references = CATALOG) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppProvider references={references} random={mulberry32(7)} today={DAY}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/piece/:id" element={<Detail />} />
        </Routes>
        <Where />
      </AppProvider>
    </MemoryRouter>,
  );
}

function featuredTitle(): string {
  return within(screen.getByTestId("featured")).getAllByRole("heading")[0]!.textContent!.trim();
}

const storedHidden = (): string[] => JSON.parse(localStorage.getItem(HIDDEN) ?? '{"ids":[]}').ids;

beforeEach(() => {
  localStorage.clear();
});

describe("Not for me on Today", () => {
  it("hides today's piece and deals another in its place", async () => {
    const user = userEvent.setup();
    renderApp();
    const before = featuredTitle();

    await user.click(screen.getByRole("button", { name: "Not for me" }));

    expect(featuredTitle()).not.toBe(before);
    expect(storedHidden()).toEqual([CATALOG.find((piece) => piece.title === before)!.id]);
    expect(screen.getByText(/won.t come up again/)).toHaveTextContent(`${before} won’t come up again.`);
  });

  it("says what was hidden and what is showing now", async () => {
    const user = userEvent.setup();
    renderApp();
    const before = featuredTitle();
    await user.click(screen.getByRole("button", { name: "Not for me" }));
    const now = featuredTitle();
    expect(screen.getByText(/is hidden\. Now showing/)).toHaveTextContent(`${before} is hidden. Now showing ${now},`);
  });

  it("describes what the button does to a screen reader", () => {
    renderApp();
    expect(screen.getByRole("button", { name: "Not for me" })).toHaveAccessibleDescription(
      `Hides ${featuredTitle()} from Today and Browse. You can bring it back from Where ideas come from.`,
    );
  });

  it("keeps focus on Not for me, so the next one can be passed over too", async () => {
    const user = userEvent.setup();
    renderApp();
    screen.getByRole("button", { name: "Not for me" }).focus();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Not for me" }));
  });

  it("puts exactly that piece back with Undo, and gives focus back to Not for me", async () => {
    const user = userEvent.setup();
    renderApp();
    const before = featuredTitle();
    await user.click(screen.getByRole("button", { name: "Not for me" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(featuredTitle()).toBe(before);
    expect(storedHidden()).toEqual([]);
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Not for me" }));
  });

  it("stops offering Undo once another piece is dealt, with no timer", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Not for me" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /deal me another/i }));
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("never deals a hidden piece", async () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat", "blue-jug"] }));
    const user = userEvent.setup();
    renderApp();
    for (let deal = 0; deal < 12; deal += 1) {
      expect(["Tabby Cat", "Blue Jug"]).not.toContain(featuredTitle());
      await user.click(screen.getByRole("button", { name: /deal me another/i }));
    }
  });

  it("leaves a way back when the last piece that matched is hidden", async () => {
    const user = userEvent.setup();
    renderApp("/?subject=fruit");
    expect(featuredTitle()).toBe("One Pear");

    await user.click(screen.getByRole("button", { name: "Not for me" }));

    expect(screen.queryByTestId("featured")).not.toBeInTheDocument();
    expect(screen.getByText("You’ve hidden everything that matches")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See what you’ve hidden" })).toHaveAttribute("href", "/sources");
    // The button that hid it has gone with the piece; Undo takes focus.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText(/Every piece that matches your filters is hidden/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(featuredTitle()).toBe("One Pear");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Not for me" }));
  });

  it("says something matches, not that nothing does, when the matches are all hidden", () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["one-pear"] }));
    renderApp("/?subject=fruit");
    expect(screen.queryByText("Nothing matches just yet")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "The only piece that fits these filters is one you marked Not for me. Drop a filter for something new, or bring one back.",
      ),
    ).toBeInTheDocument();
  });
});

describe("Today when every match is hidden: the words fit the count", () => {
  it("counts several hidden matches under a filter", () => {
    const fruit = [
      ...CATALOG,
      makeReference("kiwi-half", { title: "Kiwi Half", subject: "fruit", minutes: 8 }),
    ];
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["one-pear", "kiwi-half"] }));
    renderApp("/?subject=fruit", fruit);
    expect(screen.getByText("You’ve hidden everything that matches")).toBeInTheDocument();
    expect(
      screen.getByText(
        "All 2 pieces that fit these filters are ones you marked Not for me. Drop a filter for something new, or bring one back.",
      ),
    ).toBeInTheDocument();
  });

  it("speaks of the catalogue, not of filters, when there are none", () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: CATALOG.map((piece) => piece.id) }));
    renderApp("/");
    expect(screen.getByText("You’ve hidden every piece")).toBeInTheDocument();
    expect(
      screen.getByText("All 5 pieces in the catalogue are ones you marked Not for me. Bring one back to paint from."),
    ).toBeInTheDocument();
    // Nothing to drop, so no filter chips: only the way to the list.
    expect(screen.queryByRole("button", { name: /^Drop / })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See what you’ve hidden" })).toBeInTheDocument();
  });

  it("says the only piece in the catalogue, when there is one", () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["one-pear"] }));
    renderApp("/", [CATALOG[2]!]);
    expect(
      screen.getByText("The only piece in the catalogue is one you marked Not for me. Bring one back to paint from."),
    ).toBeInTheDocument();
  });
});

describe("Not for me on a piece's own page", () => {
  it("hides the piece, says so, and offers to show it again, keeping focus", async () => {
    const user = userEvent.setup();
    renderApp("/piece/tabby-cat");
    const button = screen.getByRole("button", { name: "Not for me" });
    button.focus();
    await user.keyboard("{Enter}");

    expect(storedHidden()).toEqual(["tabby-cat"]);
    expect(screen.getByText("Hidden from Today and Browse.")).toBeInTheDocument();
    const again = screen.getByRole("button", { name: "Bring it back" });
    expect(document.activeElement).toBe(again);
    expect(again).toHaveAccessibleDescription("Hidden from Today and Browse.");
    expect(screen.getByText(/Tabby Cat is hidden\. It won’t come up/)).toBeInTheDocument();

    await user.click(again);
    expect(storedHidden()).toEqual([]);
    expect(screen.getByRole("button", { name: "Not for me" })).toBeInTheDocument();
    expect(screen.getByText(/Tabby Cat can come up again/)).toBeInTheDocument();
  });

  it("still opens a hidden piece from a link", () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat"] }));
    renderApp("/piece/tabby-cat");
    expect(screen.getByRole("heading", { level: 1, name: "Tabby Cat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bring it back" })).toBeInTheDocument();
  });
});

describe("Not for me in Browse", () => {
  it("leaves hidden pieces out and says how many match", () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat"] }));
    renderApp("/browse");
    expect(screen.queryByRole("link", { name: "Tabby Cat" })).not.toBeInTheDocument();
    expect(screen.getByText("1 piece you’ve hidden is left out.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Blue Jug" })).toBeInTheDocument();
  });

  it("shows them, marked, on request, and leaves them out again", async () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat", "blue-jug"] }));
    const user = userEvent.setup();
    renderApp("/browse");

    expect(screen.getByText("2 pieces you’ve hidden are left out.")).toBeInTheDocument();
    // Its words say what it will do, so it is not also a pressed/unpressed toggle.
    const toggle = screen.getByRole("button", { name: "Show them" });
    expect(toggle).not.toHaveAttribute("aria-pressed");
    await user.click(toggle);

    expect(screen.getByText("Including 2 pieces you’ve hidden, first.")).toBeInTheDocument();
    // First, so showing them visibly brings them into view.
    const titles = screen.getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/piece/"));
    expect(titles.slice(0, 2).map((link) => link.textContent)).toEqual(["Tabby Cat", "Blue Jug"]);
    const card = screen.getByRole("link", { name: "Tabby Cat" }).closest("li")!;
    expect(within(card).getByText("Hidden")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "One Pear" }).closest("li")!).queryByText("Hidden")).toBeNull();
    expect(screen.getByTestId("where")).toHaveTextContent("hidden=shown");

    await user.click(screen.getByRole("button", { name: "Leave them out" }));
    expect(screen.queryByRole("link", { name: "Tabby Cat" })).not.toBeInTheDocument();
  });

  it("says nothing about hidden pieces when none match", () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat"] }));
    renderApp("/browse?subject=fruit");
    expect(screen.queryByText(/hidden piece/)).not.toBeInTheDocument();
  });
});

describe("The list of hidden pieces, on Sources", () => {
  it("invites rather than corrects when nothing is hidden", () => {
    renderApp("/sources");
    expect(screen.getByRole("heading", { name: "Pieces you’ve hidden" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing hidden\. Anything you mark Not for me waits here/)).toBeInTheDocument();
  });

  it("lists them newest first, and shows one again, moving focus to the next", async () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat", "blue-jug", "hill-line"] }));
    const user = userEvent.setup();
    renderApp("/sources");
    const list = () => screen.getAllByRole("button", { name: /^Bring back: / });
    expect(list().map((button) => button.getAttribute("aria-label"))).toEqual([
      "Bring back: Hill Line",
      "Bring back: Blue Jug",
      "Bring back: Tabby Cat",
    ]);

    await user.click(screen.getByRole("button", { name: "Bring back: Blue Jug" }));
    expect(storedHidden()).toEqual(["tabby-cat", "hill-line"]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Bring back: Tabby Cat" }));
    expect(screen.getByText("Blue Jug can come up again on Today and in Browse.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bring back: Tabby Cat" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Bring back: Hill Line" }));
    await user.click(screen.getByRole("button", { name: "Bring back: Hill Line" }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Pieces you’ve hidden" }));
    expect(screen.getByText(/Nothing hidden/)).toBeInTheDocument();
  });

  it("comes straight to the list from the way in on Today", () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat"] }));
    renderApp({ pathname: "/sources", state: { show: "hidden" } });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Pieces you’ve hidden" }));
  });

  it("names the way back on a piece opened from the list", async () => {
    localStorage.setItem(HIDDEN, JSON.stringify({ ids: ["tabby-cat"] }));
    const user = userEvent.setup();
    renderApp("/sources");
    await user.click(screen.getByRole("link", { name: "Tabby Cat" }));
    expect(screen.getByRole("link", { name: /Where ideas come from/ })).toHaveAttribute("href", "/sources");
  });
});
