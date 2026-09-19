import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { Studio } from "@/screens/Studio";

const STORAGE_KEY = "little-wash:favorites:v1";

/** Saved ids are stored oldest-first, the way `toggleFavorite` appends them. */
function seed(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids }));
}

function renderStudio() {
  return render(
    <MemoryRouter initialEntries={["/studio"]}>
      <Routes>
        <Route
          path="/studio"
          element={
            <AppProvider references={REFERENCES}>
              <Studio />
            </AppProvider>
          }
        />
        <Route path="/browse" element={<h1>Browse the studio</h1>} />
        <Route path="/piece/:id" element={<div>detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const cards = () =>
  screen.queryAllByRole("listitem").filter((li) => li.querySelector('a[href*="/piece/"]'));

const titleOf = (card: HTMLElement) =>
  card.querySelector<HTMLElement>("a.card-link")?.textContent?.trim();

beforeEach(() => localStorage.clear());

describe("Studio", () => {
  it("shows the pieces you set aside, most recently saved first", () => {
    seed(["ripe-pear", "paper-boat", "two-toadstools"]);
    renderStudio();

    expect(screen.getByRole("heading", { name: "Your studio", level: 1 })).toBeInTheDocument();
    expect(cards()).toHaveLength(3);
    expect(cards().map(titleOf)).toEqual(["Two Toadstools", "Paper Boat", "Ripe Pear"]);
  });

  it("gives every card exactly one link to its piece, as Browse does", () => {
    seed(["ripe-pear", "paper-boat"]);
    renderStudio();

    for (const card of cards()) {
      const links = [...card.querySelectorAll('a[href*="/piece/"]')];
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveClass("card-link");
    }
  });

  /*
    Removing is immediate and final by decision - there is no undo. What must
    not happen is a silent shrink, so the count is announced.
  */
  it("removes a piece from the list as soon as it is unsaved", async () => {
    const user = userEvent.setup();
    seed(["ripe-pear", "paper-boat"]);
    renderStudio();

    expect(cards()).toHaveLength(2);
    const pear = cards().find((c) => titleOf(c) === "Ripe Pear")!;
    await user.click(within(pear).getByRole("button", { name: /^Saved\. Remove Ripe Pear/ }));

    expect(cards()).toHaveLength(1);
    expect(cards().map(titleOf)).toEqual(["Paper Boat"]);
    expect(screen.getByText("1 piece in your studio.")).toBeInTheDocument();
  });

  it("announces how many pieces are in view, and keeps the plural honest", () => {
    seed(["ripe-pear"]);
    renderStudio();
    expect(screen.getByText("1 piece in your studio.")).toBeInTheDocument();
  });

  describe("when nothing is saved", () => {
    it("explains what the studio is for instead of showing an empty grid", () => {
      renderStudio();

      expect(screen.getByText(/nothing set aside yet/i)).toBeInTheDocument();
      expect(screen.getByText(/tap the heart on a piece/i)).toBeInTheDocument();
      expect(cards()).toHaveLength(0);
    });

    it("offers a way out to the catalogue", async () => {
      const user = userEvent.setup();
      renderStudio();

      await user.click(screen.getByRole("link", { name: /find a piece to paint/i }));
      expect(screen.getByRole("heading", { name: "Browse the studio" })).toBeInTheDocument();
    });

    /*
      An empty studio is an ordinary state, not a failure or a nag. PRODUCT.md
      rules out pressure language outright.
    */
    it("says nothing that counts, scolds or urges", () => {
      renderStudio();
      const body = document.body.textContent ?? "";
      for (const word of [/streak/i, /don't forget/i, /keep it up/i, /you haven't/i, /0 pieces/i]) {
        expect(body).not.toMatch(word);
      }
    });
  });

  it("drops a saved id that is no longer in the catalogue rather than rendering a hole", () => {
    seed(["ripe-pear", "a-piece-that-was-removed"]);
    renderStudio();

    expect(cards()).toHaveLength(1);
    expect(cards().map(titleOf)).toEqual(["Ripe Pear"]);
  });
});
