/**
 * Marking a piece painted, and the record it leaves.
 *
 * The behaviour tests are ordinary. The ones under "the register" are the
 * requirement: PRODUCT.md:94 says "No pressure, ever. No streaks, no guilt, no
 * achievement language", and :38 that history exists "to let someone look back
 * with satisfaction, not to enforce consistency". Those are the lines this
 * feature was held back over, so they are asserted rather than trusted.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { PaintedButton } from "@/components/PaintedButton";
import { Studio } from "@/screens/Studio";
import { makeReference } from "@/test/factory";

const PAINTED_KEY = "little-wash:painted:v1";
const SAVED_KEY = "little-wash:favorites:v1";
const TODAY = new Date(2026, 8, 20, 10, 0);

const CATALOGUE = [
  makeReference("pear", { title: "Ripe Pear" }),
  makeReference("mug", { title: "Blue Mug" }),
  makeReference("hill", { title: "One Hill" }),
];

function seedPainted(entries: Array<{ id: string; on: string }>) {
  localStorage.setItem(PAINTED_KEY, JSON.stringify({ entries }));
}

beforeEach(() => {
  localStorage.clear();
});

function renderStudio() {
  return render(
    <MemoryRouter initialEntries={["/studio"]}>
      <Routes>
        <Route
          path="/studio"
          element={
            <AppProvider references={CATALOGUE} today={TODAY}>
              <Studio />
            </AppProvider>
          }
        />
        <Route path="*" element={<div>elsewhere</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderButton(id = "pear") {
  return render(
    <MemoryRouter>
      <AppProvider references={CATALOGUE} today={TODAY}>
        <PaintedButton reference={CATALOGUE.find((r) => r.id === id)!} variant="full" />
      </AppProvider>
    </MemoryRouter>,
  );
}

const paintedSection = () =>
  screen.getByRole("heading", { name: "Painted" }).closest("section")!;

describe("marking a piece painted", () => {
  it("starts unmarked and names the action", () => {
    renderButton();
    const button = screen.getByRole("button", { name: /mark ripe pear as painted/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("Mark as painted");
  });

  it("marks, and says so", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /mark ripe pear as painted/i }));

    const button = screen.getByRole("button", { name: /painted\. remove ripe pear/i });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("Painted");
  });

  it("unmarks again, so a mistap is recoverable", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: /mark ripe pear as painted/i }));
    await user.click(screen.getByRole("button", { name: /painted\. remove ripe pear/i }));

    expect(
      screen.getByRole("button", { name: /mark ripe pear as painted/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("records the day it was marked", async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole("button", { name: /mark ripe pear as painted/i }));

    expect(JSON.parse(localStorage.getItem(PAINTED_KEY) ?? "{}")).toEqual({
      entries: [{ id: "pear", on: "2026-09-20" }],
    });
  });
});

describe("the studio's painted section", () => {
  it("invites rather than corrects when there is nothing in it", () => {
    renderStudio();
    const section = paintedSection();
    expect(within(section).getByText("Nothing painted yet")).toBeVisible();
    expect(within(section).getByText(/look back on/i)).toBeVisible();
  });

  it("lists what was painted, newest first", () => {
    seedPainted([
      { id: "pear", on: "2026-09-01" },
      { id: "mug", on: "2026-09-18" },
    ]);
    renderStudio();

    const titles = within(paintedSection())
      .getAllByRole("listitem")
      .map((li) => within(li).getByRole("link").textContent?.trim());
    expect(titles).toEqual(["Blue Mug", "Ripe Pear"]);
  });

  it("counts the way the saved section counts", () => {
    seedPainted([{ id: "pear", on: "2026-09-01" }]);
    renderStudio();
    expect(within(paintedSection()).getByText("1")).toBeVisible();
  });

  it("shows the day each piece was painted", () => {
    seedPainted([{ id: "pear", on: "2026-09-14" }]);
    renderStudio();
    // On the piece's own card. The tree's leaf card says it too, so the
    // section as a whole holds the date more than once.
    const [card] = within(paintedSection()).getAllByRole("listitem");
    expect(within(card!).getByText(/painted 14 september/i)).toBeVisible();
  });

  it("draws a tree with a leaf for each piece painted, oldest first", () => {
    seedPainted([
      { id: "pear", on: "2026-09-01" },
      { id: "mug", on: "2026-09-18" },
    ]);
    renderStudio();
    const tree = within(paintedSection()).getByRole("listbox", { name: /leaves on your tree/i });
    const names = within(tree)
      .getAllByRole("option")
      .map((option) => option.textContent ?? "");
    expect(names).toHaveLength(2);
    expect(names[0]).toMatch(/^Ripe Pear/);
    expect(names[1]).toMatch(/^Blue Mug/);
  });

  it("draws no tree while nothing is painted - no bare branch, no seed waiting", () => {
    renderStudio();
    expect(document.querySelector("[data-tree]")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("drops a piece the catalogue no longer holds", () => {
    seedPainted([
      { id: "pear", on: "2026-09-14" },
      { id: "a-retired-piece", on: "2026-09-15" },
    ]);
    renderStudio();
    expect(within(paintedSection()).getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("painted and saved are independent", () => {
  it("leaves a saved piece saved when it is painted", async () => {
    const user = userEvent.setup();
    localStorage.setItem(SAVED_KEY, JSON.stringify({ ids: ["pear"] }));
    renderButton("pear");

    await user.click(screen.getByRole("button", { name: /mark ripe pear as painted/i }));

    // Saved means "I want to paint this", painted means "I did". The app never
    // quietly discards something someone chose to keep.
    expect(JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}")).toEqual({
      ids: ["pear"],
    });
    expect(JSON.parse(localStorage.getItem(PAINTED_KEY) ?? "{}").entries).toHaveLength(1);
  });

  it("keeps both records for the same piece", () => {
    localStorage.setItem(SAVED_KEY, JSON.stringify({ ids: ["pear"] }));
    seedPainted([{ id: "pear", on: "2026-09-14" }]);
    renderStudio();

    expect(
      within(screen.getByRole("heading", { name: "Saved" }).closest("section")!)
        .getAllByRole("listitem"),
    ).toHaveLength(1);
    expect(within(paintedSection()).getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("the register: no pressure, ever", () => {
  /*
    PRODUCT.md:94. These are the tests that make the difference between a
    record and a scoreboard, and they are why this feature was held back until
    it could be built properly.
  */
  function paintedText(): string {
    return paintedSection().textContent ?? "";
  }

  it("dates the record absolutely, never as a duration from now", () => {
    // "six days ago" measures you against a clock. "14 September" does not.
    seedPainted([
      { id: "pear", on: "2026-09-14" },
      { id: "mug", on: "2026-09-20" },
    ]);
    renderStudio();
    expect(paintedText()).not.toMatch(
      /\b(ago|yesterday|last week|this week|days? in a row|streak)\b/i,
    );
    expect(paintedText()).toMatch(/14 September/);
  });

  it("uses no achievement language", () => {
    seedPainted([{ id: "pear", on: "2026-09-14" }]);
    renderStudio();
    expect(paintedText()).not.toMatch(
      /\b(complete|completed|done|finish|finished|achiev\w*|milestone|goal|target|badge|level|score)\b/i,
    );
  });

  it("says nothing corrective when the record is empty", () => {
    renderStudio();
    expect(paintedText()).not.toMatch(
      /\b(yet again|haven'?t|still no|get started|keep going|don'?t forget|why not)\b/i,
    );
  });

  it("states no total as progress towards anything", () => {
    seedPainted([
      { id: "pear", on: "2026-09-14" },
      { id: "mug", on: "2026-09-18" },
    ]);
    renderStudio();
    // A bare count beside the heading is a fact about the list, the same as
    // Saved's. "2 of 10" or "2 this month" would not be.
    expect(paintedText()).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/);
    expect(paintedText()).not.toMatch(/\bthis (week|month|year)\b/i);
  });

  it("keeps the record out of the app chrome", async () => {
    // The header carries a saved count. A count of paintings in the furniture
    // would be a scoreboard however it was worded.
    seedPainted([{ id: "pear", on: "2026-09-14" }]);
    const { container } = renderStudio();
    const header = container.querySelector("header");
    expect(header?.textContent ?? "").not.toMatch(/painted/i);
  });
});
