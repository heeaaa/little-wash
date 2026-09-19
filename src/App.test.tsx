import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/App";

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
    </MemoryRouter>,
  );
}

describe("routing", () => {
  it("serves Today at the root", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /today/i, level: 1 })).toBeInTheDocument();
  });

  it("serves a piece without a direction segment", () => {
    renderAt("/piece/ripe-pear");
    expect(screen.getByRole("heading", { name: "Ripe Pear", level: 1 })).toBeInTheDocument();
  });

  /*
    #/a/piece/ripe-pear links are already shared. Landing them on Today would
    lose the piece the link was about, so the tail is replayed on the flat
    route instead.
  */
  it("replays a legacy /a link onto the flat route, keeping the piece", async () => {
    renderAt("/a/piece/ripe-pear");
    expect(
      await screen.findByRole("heading", { name: "Ripe Pear", level: 1 }),
    ).toBeInTheDocument();
  });

  it("keeps the filters on a legacy browse link", async () => {
    renderAt("/a/browse?subject=landscape");
    expect(await screen.findByText("Cottage on the Hill")).toBeInTheDocument();
    expect(screen.queryByText("Ripe Pear")).not.toBeInTheDocument();
  });

  it("sends a legacy bare /a to Today", async () => {
    renderAt("/a");
    expect(await screen.findByRole("heading", { name: /today/i, level: 1 })).toBeInTheDocument();
  });

  it("serves the studio", async () => {
    renderAt("/studio");
    expect(await screen.findByRole("heading", { name: "Your studio", level: 1 })).toBeInTheDocument();
  });

  it("replays a legacy /a studio link onto the flat route", async () => {
    renderAt("/a/studio");
    expect(await screen.findByRole("heading", { name: "Your studio", level: 1 })).toBeInTheDocument();
  });

  it("sends anything unrecognised to Today", async () => {
    renderAt("/nope/nowhere");
    expect(await screen.findByRole("heading", { name: /today/i, level: 1 })).toBeInTheDocument();
  });
});
