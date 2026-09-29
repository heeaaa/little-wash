import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "@/App";
import { CATALOGUE } from "@/data/catalogue";

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
    renderAt(`/piece/${CATALOGUE[0]!.id}`);
    expect(screen.getByRole("heading", { name: CATALOGUE[0]!.title, level: 1 })).toBeInTheDocument();
  });

  /*
    #/a/piece/ripe-pear links are already shared. Landing them on Today would
    lose the piece the link was about, so the tail is replayed on the flat
    route instead.
  */
  it("replays a legacy /a link onto the flat route, keeping the piece", async () => {
    renderAt(`/a/piece/${CATALOGUE[0]!.id}`);
    expect(
      await screen.findByRole("heading", { name: CATALOGUE[0]!.title, level: 1 }),
    ).toBeInTheDocument();
  });

  it("keeps the filters on a legacy browse link", async () => {
    /*
      The point is that the redirect carries the query through, not which piece
      comes back - the catalogue may hold no landscapes at all while it is
      being curated. Asserting the filter survived is the actual behaviour.
    */
    const subject = CATALOGUE[0]!.subject;
    renderAt(`/a/browse?subject=${subject}`);

    expect(
      await screen.findByRole("heading", { name: /matching pieces/i }),
    ).toBeInTheDocument();
    const chosen = screen.getAllByRole("button", { name: /^Subject/ })[0];
    expect(chosen?.textContent?.toLowerCase()).toContain(subject.replace("-", " "));
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
