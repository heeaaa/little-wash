import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Sources } from "@/screens/Sources";
import { Today } from "@/screens/Today";
import { makeCredit, makeReference } from "@/test/factory";

const STORAGE_KEY = "little-wash:sources:v1";

const CATALOG = [
  makeReference("placeholder-pear"),
  makeReference("pexels-leaf", {
    subject: "botanical",
    credit: makeCredit({ sourceId: "pexels", institution: "Pexels" }),
  }),
  makeReference("pexels-shell", {
    subject: "objects",
    credit: makeCredit({ sourceId: "pexels", institution: "Pexels" }),
  }),
];

beforeEach(() => {
  localStorage.clear();
});

function renderSources(initial = "/sources") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AppProvider references={CATALOG} today={new Date("2026-09-20T09:00:00Z")}>
        <Routes>
          <Route path="/sources" element={<Sources />} />
          <Route path="/" element={<Today />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  );
}

const toggles = () => screen.getAllByRole("switch");

describe("Sources: what is on offer", () => {
  it("lists only the sources the catalogue actually holds", () => {
    renderSources();
    const names = toggles().map((t) => t.getAttribute("aria-labelledby"));
    expect(names).toEqual(["source-pexels-name", "source-placeholder-name"]);
    expect(screen.queryByText("The Met")).toBeNull();
  });

  it("counts what each source contributes", () => {
    renderSources();
    expect(screen.getByText("2 references")).toBeVisible();
    expect(screen.getByText("1 reference")).toBeVisible();
  });

  it("names each licence and links to the source", () => {
    renderSources();
    expect(screen.getByText(/Pexels License/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Visit Pexels" })).toHaveAttribute(
      "href",
      "https://www.pexels.com",
    );
  });

  it("says plainly when a source is placeholder art", () => {
    renderSources();
    expect(screen.getByText("Placeholder")).toBeVisible();
  });

  it("starts with everything switched on", () => {
    renderSources();
    for (const toggle of toggles()) {
      expect(toggle).toHaveAttribute("aria-checked", "true");
    }
  });
});

describe("Sources: switching a source off", () => {
  it("remembers the choice", async () => {
    const user = userEvent.setup();
    renderSources();

    await user.click(screen.getByRole("switch", { name: "Pexels" }));

    expect(screen.getByRole("switch", { name: "Pexels" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
      disabled: ["pexels"],
    });
  });

  it("switches back on again", async () => {
    const user = userEvent.setup();
    renderSources();

    await user.click(screen.getByRole("switch", { name: "Pexels" }));
    await user.click(screen.getByRole("switch", { name: "Pexels" }));

    expect(screen.getByRole("switch", { name: "Pexels" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("explains an emptied catalogue rather than leaving a blank screen", async () => {
    const user = userEvent.setup();
    renderSources();

    await user.click(screen.getByRole("switch", { name: "Pexels" }));
    expect(screen.queryByRole("status")).toBeNull();

    await user.click(screen.getByRole("switch", { name: "Prototype placeholders" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Every source is switched off/);
  });
});

describe("Sources: what the preference actually changes", () => {
  it("keeps a disabled source out of the ideas on Today", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ disabled: ["placeholder"] }));
    renderSources("/");

    // Only the two Pexels pieces remain, so today's piece must be one of them.
    expect(await screen.findByAltText(/pexels-/)).toBeVisible();
    expect(screen.queryByAltText(/placeholder-pear/)).toBeNull();
  });
});
