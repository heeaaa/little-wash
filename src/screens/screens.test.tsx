import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider, type DirectionId } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
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
  it("shows featured + more to try for treatment A", () => {
    renderScreen(Today, { direction: "a" });
    expect(screen.getByRole("heading", { name: /today.s wash/i })).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /more to try/i })).toBeInTheDocument();
  });

  it("renders in treatment B too", () => {
    renderScreen(Today, { direction: "b" });
    expect(screen.getByTestId("featured")).toBeInTheDocument();
  });

  it("narrows to stretch pieces when filtered", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    expect(screen.getAllByText("Ripe Pear").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "A stretch" }));
    expect(screen.queryByText("Ripe Pear")).not.toBeInTheDocument();
    expect(screen.getByText("Cottage on the Hill")).toBeInTheDocument();
  });

  it("shows an empty state for an impossible combination", async () => {
    const user = userEvent.setup();
    renderScreen(Today, { direction: "a" });
    await user.click(screen.getByRole("button", { name: "5 min" }));
    await user.click(screen.getByRole("button", { name: "A stretch" }));
    expect(screen.getByText(/nothing matches just yet/i)).toBeInTheDocument();
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
    renderScreen(Browse, { direction: "b", entry: "/b/browse?subject=landscape" });
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
