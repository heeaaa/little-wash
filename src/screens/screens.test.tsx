import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider, type DirectionId } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { DIFFICULTY_NOTE } from "@/lib/types";
import { mulberry32 } from "@/lib/shuffle";
import { Today } from "@/screens/Today";
import { Browse } from "@/screens/Browse";
import { Exercises } from "@/screens/Exercises";

const FIXED_DATE = new Date("2026-09-18T09:00:00Z");

function renderScreen(
  Screen: () => JSX.Element,
  { direction = "a", entry, seed = 5 }: { direction?: DirectionId; entry?: string; seed?: number } = {},
) {
  const path = `/${direction}${Screen === Browse ? "/browse" : Screen === Exercises ? "/exercises" : ""}`;
  return render(
    <MemoryRouter initialEntries={[entry ?? path]}>
      <Routes>
        <Route
          path={path}
          element={
            <AppProvider direction={direction} references={REFERENCES} random={mulberry32(seed)} today={FIXED_DATE}>
              <Screen />
            </AppProvider>
          }
        />
        <Route path={`/${direction}/piece/:id`} element={<div>detail</div>} />
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
    renderScreen(Today, { direction: "a" });
    expect(screen.getByRole("heading", { name: /today.s wash/i })).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
    // "More to try" belongs to Browse now: offering it here reopens the very
    // decision this screen exists to close.
    expect(screen.queryByRole("heading", { name: /more to try/i })).not.toBeInTheDocument();
  });

  it("leads with time and energy, and keeps subject behind a control", () => {
    renderScreen(Today, { direction: "a" });
    // Both primary questions are present as labelled groups.
    expect(screen.getAllByRole("group", { name: /how long have you got/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("group", { name: /how much energy/i }).length).toBeGreaterThan(0);
    // Subject is reachable, but not as a seven-option row on the surface.
    expect(screen.getAllByRole("button", { name: /^Subject/ }).length).toBeGreaterThan(0);
  });

  it("narrows to stretch pieces when filtered", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    expect(featuredTitle()).toBe("Potted Succulent");
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    expect(screen.queryByText("Potted Succulent")).not.toBeInTheDocument();
    expect(featuredTitle()).toBe("Cottage on the Hill");
  });

  /**
   * Regression for the daily pick collapsing onto the first match. Narrowing a
   * filter must move to a piece chosen for that filter state, not fall back to
   * whichever piece happens to lead the filtered catalogue.
   */
  it("moves to a different piece when a filter narrows the pool", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    const before = featuredTitle();
    await user.click(screen.getAllByRole("button", { name: "Gentle" })[0]!);
    const after = featuredTitle();
    expect(after).not.toBe(before);
    // Not simply the first gentle piece in catalogue order.
    expect(after).not.toBe("Ripe Pear");
  });

  it("announces the piece, not just the count, when it changes", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    expect(screen.getByRole("status")).toHaveTextContent("");
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    expect(screen.getByRole("status")).toHaveTextContent(/now showing cottage on the hill/i);
  });

  it("explains the difficulty instead of only labelling it", () => {
    renderScreen(Today, { direction: "a" });
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
    renderScreen(Today, { direction: "a" });
    await user.click(screen.getAllByRole("button", { name: "5 min" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    expect(screen.getByText(/nothing matches just yet/i)).toBeInTheDocument();
    expect(screen.getByText(/5 min \+ A stretch/)).toBeInTheDocument();
  });

  it("lets a single filter be dropped from the empty state", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    await user.click(screen.getAllByRole("button", { name: "5 min" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    await user.click(screen.getByRole("button", { name: /drop 5 min/i }));
    expect(screen.queryByText(/nothing matches just yet/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
  });

  it("keeps the controls reachable while the empty state is showing", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    await user.click(screen.getAllByRole("button", { name: "5 min" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "A stretch" })[0]!);
    expect(screen.getAllByRole("group", { name: /how long have you got/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("group", { name: /how much energy/i }).length).toBeGreaterThan(0);
  });

  it("swaps the featured piece with Deal me another", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a", seed: 3 });
    const before = featuredTitle();
    await user.click(screen.getByRole("button", { name: /deal me another/i }));
    expect(featuredTitle()).not.toEqual(before);
  });

  it("saves and unsaves the featured piece", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    const saveButtons = screen.getAllByRole("button", { name: /^Save / });
    await user.click(saveButtons[0]!);
    expect(screen.getAllByRole("button", { name: /^Saved\. Remove/ }).length).toBeGreaterThan(0);
  });
});

describe("Browse", () => {
  it("lists collections and the whole catalogue by default", () => {
    renderScreen(Browse, { direction: "a" });
    expect(screen.getByRole("heading", { name: /browse the studio/i })).toBeInTheDocument();
    expect(screen.getByText("Five-minute starts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /the whole catalogue/i })).toBeInTheDocument();
  });

  it("respects a filter passed in the URL", () => {
    renderScreen(Browse, { direction: "a", entry: "/a/browse?subject=landscape" });
    expect(screen.getByText("Cottage on the Hill")).toBeInTheDocument();
    expect(screen.queryByText("Ripe Pear")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /matching pieces/i })).toBeInTheDocument();
  });
});

describe("Exercises", () => {
  it("shows warm-ups and filters by kind", async () => {
    const user = userEvent.setup();
    renderScreen(Exercises, { direction: "a" });
    expect(screen.getByRole("heading", { name: /warm-ups/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /three-colour wheel/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Brushwork" }));
    expect(screen.queryByRole("heading", { name: /three-colour wheel/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /graded wash/i })).toBeInTheDocument();
  });
});
