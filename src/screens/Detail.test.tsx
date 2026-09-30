import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { CATALOGUE } from "@/data/catalogue";
import { makeReference } from "@/test/factory";
import type { PaintReference } from "@/lib/types";

// Whichever piece the catalogue happens to lead with; naming one ties the
// test to a particular harvest.
const piece = CATALOGUE[0]!;
import { Detail } from "@/screens/Detail";

/** `state.from` is what `PieceCard` records when a card is opened. */
function renderDetail(from?: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: `/piece/${piece.id}`, search: "", state: from ? { from } : null },
      ]}
    >
      <Routes>
        <Route
          path="/piece/:id"
          element={
            <AppProvider references={CATALOGUE}>
              <Detail />
            </AppProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const backLink = () => screen.getAllByRole("link")[0]!;

describe("Detail", () => {
  /*
    Back always returned to Today, so arriving from Browse or the studio and
    going back lost your place in the catalogue - and it put a third link to
    `/` on a page that already had two.
  */
  it("offers the way back to where you came from", () => {
    renderDetail("/browse?subject=landscape");
    expect(backLink()).toHaveTextContent("Browse");
    expect(backLink()).toHaveAttribute("href", "/browse?subject=landscape");
  });

  it("names the studio when you came from there", () => {
    renderDetail("/studio");
    expect(backLink()).toHaveTextContent("Your studio");
    expect(backLink()).toHaveAttribute("href", "/studio");
  });

  it("falls back to Today when opened cold, from a shared link", () => {
    renderDetail();
    expect(backLink()).toHaveTextContent("Today");
    expect(backLink()).toHaveAttribute("href", "/");
  });

  it("ignores a junk origin rather than trusting it", () => {
    renderDetail("https://example.com/phishing");
    expect(backLink()).toHaveTextContent("Today");
    expect(backLink()).toHaveAttribute("href", "/");
  });

  it("still shows the piece itself", () => {
    renderDetail();
    expect(screen.getByRole("heading", { name: piece.title, level: 1 })).toBeInTheDocument();
  });
});


describe("Detail when a piece has no prompt or tip", () => {
  /*
    Both are optional on a reference: some pieces say everything they need to
    by being the image, and a line of invented encouragement under every one
    of them reads as filler. What must not happen is the shape of the missing
    thing being left behind - an empty italic line, or a tinted card headed
    "Tip" with nothing in it.
  */
  function renderPiece(reference: PaintReference) {
    return render(
      <MemoryRouter
        initialEntries={[{ pathname: `/piece/${reference.id}`, search: "", state: null }]}
      >
        <Routes>
          <Route
            path="/piece/:id"
            element={
              <AppProvider references={[reference]}>
                <Detail />
              </AppProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows both when the curator wrote them", () => {
    renderPiece(
      makeReference("with-both", {
        prompt: "One pear, one wash.",
        tip: "Tilt the paper while the wash is wet.",
      }),
    );
    expect(screen.getByText("One pear, one wash.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tip/ })).toBeInTheDocument();
    expect(screen.getByText("Tilt the paper while the wash is wet.")).toBeInTheDocument();
  });

  it("drops the whole tip panel rather than heading an empty one", () => {
    renderPiece(makeReference("no-tip", { prompt: "One pear, one wash." }));
    expect(screen.getByText("One pear, one wash.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Tip/ })).not.toBeInTheDocument();
  });

  it("still shows the title, the palette and the artwork with neither", () => {
    renderPiece(makeReference("bare"));
    expect(screen.getByRole("heading", { level: 1, name: "bare" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Suggested palette/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /A test subject for bare/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Tip/ })).not.toBeInTheDocument();
  });
});

describe("Detail's plate is shaped by its reference", () => {
  /*
    Found at the switch to the curated catalogue, 29/09/2026. `.detail-art`
    caps its width with `calc(var(--detail-cap) * var(--ar, 1))`, but `--ar`
    was only set on the artwork inside it, and a custom property never reaches
    its parent. The cap therefore always assumed a square: a 9:16 door on a
    phone got a 380px-wide plate 655px tall, pushing the title off the first
    screen. Square placeholders hid it, because 1 is their right answer.
  */
  function plateFor(width: number, height: number) {
    const reference = makeReference("shaped", {
      image: { delivery: "remote", baseUrl: "https://images.example.test/p.jpg", intrinsicWidth: width, intrinsicHeight: height, lqip: null },
    });
    const { container } = render(
      <MemoryRouter initialEntries={[{ pathname: "/piece/shaped", search: "", state: null }]}>
        <Routes>
          <Route
            path="/piece/:id"
            element={
              <AppProvider references={[reference]}>
                <Detail />
              </AppProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    return container.querySelector<HTMLElement>(".detail-art")!;
  }

  it("carries the reference's own ratio on the plate that is capped", () => {
    expect(plateFor(900, 1600).style.getPropertyValue("--ar")).toBe(String(900 / 1600));
  });

  it("uses the same clamp as the artwork, so a strip cannot collapse the plate", () => {
    expect(plateFor(400, 2000).style.getPropertyValue("--ar")).toBe("0.5");
    expect(plateFor(4000, 1000).style.getPropertyValue("--ar")).toBe("2");
  });
});
