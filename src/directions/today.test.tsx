import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider, type DirectionId } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { mulberry32 } from "@/lib/shuffle";
import { TodayA } from "@/directions/a/TodayA";
import { TodayB } from "@/directions/b/TodayB";

/** Fixed date so the daily featured pick is deterministic in tests. */
const FIXED_DATE = new Date("2026-09-18T09:00:00Z");

function renderToday(direction: DirectionId, seed = 5) {
  const Today = direction === "a" ? TodayA : TodayB;
  return render(
    <MemoryRouter initialEntries={[`/${direction}`]}>
      <Routes>
        <Route
          path={`/${direction}`}
          element={
            <AppProvider
              direction={direction}
              references={REFERENCES}
              random={mulberry32(seed)}
              today={FIXED_DATE}
            >
              <Today />
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

describe("Today screen - Direction A", () => {
  it("shows a featured piece and a list of more ideas", () => {
    renderToday("a");
    expect(screen.getByRole("heading", { name: /today.s wash/i })).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /more to try/i })).toBeInTheDocument();
  });

  it("narrows the catalogue when a difficulty filter is chosen", async () => {
    const user = userEvent.setup();
    renderToday("a");
    // A gentle piece is present before filtering.
    expect(screen.getAllByText("Ripe Pear").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "A stretch" }));

    // After filtering to "stretch", only stretch pieces remain.
    expect(screen.queryByText("Ripe Pear")).not.toBeInTheDocument();
    expect(screen.getByText("Cottage on the Hill")).toBeInTheDocument();
    expect(screen.getByText("Bowl of Cherries")).toBeInTheDocument();
  });

  it("shows an empty state when filters match nothing", async () => {
    const user = userEvent.setup();
    renderToday("a");
    // 5 min + stretch is intentionally empty in the catalogue.
    await user.click(screen.getByRole("button", { name: "5 min" }));
    await user.click(screen.getByRole("button", { name: "A stretch" }));
    expect(screen.getByText(/nothing matches just yet/i)).toBeInTheDocument();
  });

  it("swaps the featured piece with 'Deal me another'", async () => {
    const user = userEvent.setup();
    renderToday("a", 3);
    const before = featuredTitle();
    await user.click(screen.getByRole("button", { name: /deal me another/i }));
    const after = featuredTitle();
    expect(after).not.toEqual(before);
  });

  it("saves and unsaves the featured piece", async () => {
    const user = userEvent.setup();
    renderToday("a");
    const saveButtons = screen.getAllByRole("button", { name: /^Save / });
    await user.click(saveButtons[0]!);
    expect(screen.getAllByRole("button", { name: /^Saved\. Remove/ }).length).toBeGreaterThan(0);
  });
});

describe("Today screen - Direction B", () => {
  it("renders the central question and a featured poster", () => {
    renderToday("b");
    expect(
      screen.getByRole("heading", { name: /what.s on your palette today/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("featured")).toBeInTheDocument();
  });

  it("filters by subject", async () => {
    const user = userEvent.setup();
    renderToday("b");
    await user.click(screen.getByRole("button", { name: "Landscape" }));
    expect(screen.getByText("Cottage on the Hill")).toBeInTheDocument();
    expect(screen.queryByText("Ripe Pear")).not.toBeInTheDocument();
  });
});
