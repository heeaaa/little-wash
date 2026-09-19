import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { DIFFICULTY_NOTE } from "@/lib/types";
import { mulberry32 } from "@/lib/shuffle";
import { Today } from "@/screens/Today";
import { Browse } from "@/screens/Browse";
import { Exercises } from "@/screens/Exercises";

const FIXED_DATE = new Date("2026-09-18T09:00:00Z");

function renderScreen(
  Screen: () => JSX.Element,
  { entry, seed = 5 }: { entry?: string; seed?: number } = {},
) {
  const path = Screen === Browse ? "/browse" : Screen === Exercises ? "/exercises" : "/";
  return render(
    <MemoryRouter initialEntries={[entry ?? path]}>
      <Routes>
        <Route
          path={path}
          element={
            <AppProvider references={REFERENCES} random={mulberry32(seed)} today={FIXED_DATE}>
              <Screen />
            </AppProvider>
          }
        />
        <Route path="/piece/:id" element={<div>detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function featuredTitle(): string {
  const region = screen.getByTestId("featured");
  return within(region).getAllByRole("heading")[0]?.textContent?.trim() ?? "";
}

describe("Today (shared editorial screen)", () => {
  it("shows one piece and does not hand back the catalogue", () => {
    renderScreen(Today);
    expect(screen.getByRole("heading", { name: /today.s wash/i })).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
    // "More to try" belongs to Browse now: offering it here reopens the very
    // decision this screen exists to close.
    expect(screen.queryByRole("heading", { name: /more to try/i })).not.toBeInTheDocument();
  });

  it("leads with time and energy, and keeps subject behind a control", () => {
    renderScreen(Today);
    // Both primary questions are present as labelled groups.
    expect(screen.getAllByRole("group", { name: /how long have you got/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("group", { name: /how much energy/i }).length).toBeGreaterThan(0);
    // Subject is reachable, but not as a seven-option row on the surface.
    expect(screen.getAllByRole("button", { name: /^Subject/ }).length).toBeGreaterThan(0);
  });

  it("narrows to stretch pieces when filtered", async () => {
    const user = userEvent.setup();
    renderScreen(Today);
    expect(featuredTitle()).toBe("Potted Succulent");
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    await waitFor(() => expect(featuredTitle()).toBe("Cottage on the Hill"));
    expect(screen.queryByText("Potted Succulent")).not.toBeInTheDocument();
  });

  /**
   * Regression for the daily pick collapsing onto the first match. Narrowing a
   * filter must move to a piece chosen for that filter state, not fall back to
   * whichever piece happens to lead the filtered catalogue.
   */
  it("moves to a different piece when a filter narrows the pool", async () => {
    const user = userEvent.setup();
    renderScreen(Today);
    const before = featuredTitle();
    await user.click(screen.getAllByRole("button", { name: "Gentle" })[0]!);
    await waitFor(() => expect(featuredTitle()).not.toBe(before));
    const after = featuredTitle();
    // Not simply the first gentle piece in catalogue order.
    expect(after).not.toBe("Ripe Pear");
  });

  it("announces the piece, not just the count, when it changes", async () => {
    const user = userEvent.setup();
    renderScreen(Today);
    expect(screen.getByRole("status")).toHaveTextContent("");
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/now showing cottage on the hill/i),
    );
  });

  it("explains the difficulty instead of only labelling it", () => {
    renderScreen(Today);
    const featured = screen.getByTestId("featured");
    const piece = REFERENCES.find((r) => r.title === featuredTitle());
    expect(piece).toBeDefined();
    // The plain-English note that gives a nervous beginner permission has to be
    // on screen, not only defined in the data.
    expect(
      within(featured).getByText(DIFFICULTY_NOTE[piece!.difficulty]),
    ).toBeInTheDocument();
  });

  it("shows an empty state naming the combination that excludes everything", async () => {
    const user = userEvent.setup();
    renderScreen(Today);
    await user.click(screen.getAllByRole("button", { name: "Under 10 min" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    expect(await screen.findByText(/nothing matches just yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Under 10 min \+ A stretch/)).toBeInTheDocument();
  });

  it("lets a single filter be dropped from the empty state", async () => {
    const user = userEvent.setup();
    renderScreen(Today);
    await user.click(screen.getAllByRole("button", { name: "Under 10 min" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    await screen.findByText(/nothing matches just yet/i);
    await user.click(screen.getByRole("button", { name: /drop under 10 min/i }));
    expect(await screen.findByTestId("featured")).toBeInTheDocument();
    expect(screen.queryByText(/nothing matches just yet/i)).not.toBeInTheDocument();
  });

  it("keeps the controls reachable while the empty state is showing", async () => {
    const user = userEvent.setup();
    renderScreen(Today);
    await user.click(screen.getAllByRole("button", { name: "Under 10 min" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    await screen.findByText(/nothing matches just yet/i);
    expect(screen.getAllByRole("group", { name: /how long have you got/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("group", { name: /how much energy/i }).length).toBeGreaterThan(0);
  });

  /*
    The dealt piece used to live in component state, so a reload, a locked
    phone or a discarded tab lost the piece someone had chosen to paint. It
    lives in the URL now, which is also what makes it shareable.
  */
  it("takes the dealt piece from the URL, so a reload keeps it", () => {
    renderScreen(Today, { entry: "/?piece=two-toadstools" });
    expect(featuredTitle()).toBe("Two Toadstools");
  });

  it("releases the dealt piece when a filter changes, so the tap visibly acts", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { entry: "/?piece=two-toadstools" });
    expect(featuredTitle()).toBe("Two Toadstools");

    // Two Toadstools is a 15-minute steady piece, so it still matches "Steady":
    // before, the pin survived and the 520ms wash played over an unchanged
    // piece, teaching the user the controls were unreliable.
    await user.click(screen.getAllByRole("button", { name: "Steady" })[0]!);
    await waitFor(() => expect(featuredTitle()).not.toBe("Two Toadstools"));
  });

  it("swaps the featured piece with Deal me another", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { seed: 3 });
    const before = featuredTitle();
    await user.click(screen.getByRole("button", { name: /deal me another/i }));
    expect(featuredTitle()).not.toEqual(before);
  });

  it("saves and unsaves the featured piece", async () => {
    const user = userEvent.setup();
    renderScreen(Today);
    const saveButtons = screen.getAllByRole("button", { name: /^Save / });
    await user.click(saveButtons[0]!);
    expect(screen.getAllByRole("button", { name: /^Saved\. Remove/ }).length).toBeGreaterThan(0);
  });
});

describe("Browse", () => {
  it("lists collections and the whole catalogue by default", () => {
    renderScreen(Browse);
    expect(screen.getByRole("heading", { name: /browse the studio/i })).toBeInTheDocument();
    expect(screen.getByText("Quick starts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the whole catalogue/i })).toBeInTheDocument();
  });

  it("respects a filter passed in the URL", () => {
    renderScreen(Browse, { entry: "/browse?subject=landscape" });
    expect(screen.getByText("Cottage on the Hill")).toBeInTheDocument();
    expect(screen.queryByText("Ripe Pear")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /matching pieces/i })).toBeInTheDocument();
  });

  /*
    Choosing a collection changes results that sit ~1500px below the fold on a
    phone, behind five collection cards and the filter panel. The count changed
    and nothing visible did, so the tap read as a hang. Focus moving to the
    results heading is what carries the keyboard and the screen reader there;
    the scroll is verified in the browser, which jsdom cannot do.
  */
  it("sends you to the results when you choose a collection", async () => {
    const user = userEvent.setup();
    renderScreen(Browse);

    expect(document.activeElement).toBe(document.body);
    await user.click(screen.getByRole("link", { name: /quick starts/i }));

    const heading = await screen.findByRole("heading", { name: /matching pieces/i });
    expect(document.activeElement).toBe(heading);
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("does not grab focus on arrival, only when a collection is chosen", async () => {
    renderScreen(Browse, { entry: "/browse?time=short" });

    expect(screen.getByRole("heading", { name: /matching pieces/i })).toBeInTheDocument();
    // A shared link lands you where you meant to be; nothing was tapped.
    expect(document.activeElement).toBe(document.body);
  });

  it("leaves focus alone when a filter chip is used", async () => {
    const user = userEvent.setup();
    renderScreen(Browse);

    const chip = screen.getAllByRole("button", { name: "Gentle" })[0]!;
    await user.click(chip);

    await screen.findByRole("heading", { name: /matching pieces/i });
    expect(document.activeElement).toBe(chip);
  });

  /*
    Each card used to carry an image link and a title link to the same piece,
    so the twelve-card grid put twenty-four identical destinations in the tab
    order and in a screen reader's link list. One card, one link.
  */
  it("gives every catalogue card exactly one link to its piece", () => {
    renderScreen(Browse);

    const cards = screen
      .getAllByRole("listitem")
      .filter((li) => li.querySelector('a[href*="/piece/"]'));
    expect(cards.length).toBe(REFERENCES.length);

    for (const card of cards) {
      const links = [...card.querySelectorAll('a[href*="/piece/"]')];
      const hrefs = new Set(links.map((a) => a.getAttribute("href")));
      expect(links).toHaveLength(1);
      expect(hrefs.size).toBe(1);
      expect(links[0]).toHaveClass("card-link");
      // The one link must still name the piece for a link-list reader.
      expect(links[0]?.textContent?.trim()).toBeTruthy();
    }
  });
});

describe("Exercises", () => {
  /*
    DESIGN.md reserves teal for a chip that is actually narrowing and requires a
    check on every selected chip, so selection never depends on colour alone.
    This group filled "All" with teal and showed no check at all.
  */
  it("styles its chips by the same rule as the filters", async () => {
    const user = userEvent.setup();
    renderScreen(Exercises);

    const all = screen.getByRole("button", { name: /^All$/ });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(all.className).not.toContain("bg-accent");
    expect(all.querySelector("svg")).toBeInTheDocument();

    const brushwork = screen.getByRole("button", { name: /^Brushwork$/ });
    await user.click(brushwork);
    expect(brushwork).toHaveAttribute("aria-pressed", "true");
    expect(brushwork.className).toContain("bg-accent");
    expect(brushwork.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^All$/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows warm-ups and filters by kind", async () => {
    const user = userEvent.setup();
    renderScreen(Exercises);
    expect(screen.getByRole("heading", { name: /warm-ups/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /three-colour wheel/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Brushwork" }));
    expect(screen.queryByRole("heading", { name: /three-colour wheel/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /graded wash/i })).toBeInTheDocument();
  });
});
