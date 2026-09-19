import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { Detail } from "@/screens/Detail";

/** `state.from` is what `PieceCard` records when a card is opened. */
function renderDetail(from?: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/piece/ripe-pear", search: "", state: from ? { from } : null },
      ]}
    >
      <Routes>
        <Route
          path="/piece/:id"
          element={
            <AppProvider references={REFERENCES}>
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
    expect(screen.getByRole("heading", { name: "Ripe Pear", level: 1 })).toBeInTheDocument();
  });
});
