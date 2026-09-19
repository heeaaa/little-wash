import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { SavedPalette } from "@/components/SavedPalette";
import { SaveButton } from "@/components/SaveButton";

const STORAGE_KEY = "little-wash:favorites:v1";

function seed(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids }));
}

function renderPalette(extra?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AppProvider references={REFERENCES}>
        <SavedPalette />
        {extra}
      </AppProvider>
    </MemoryRouter>,
  );
}

const palette = () => screen.getByRole("link", { name: /your studio/i });
const swatches = () =>
  [...palette().querySelectorAll<HTMLElement>("span[style*='background-color']")];
const firstHex = (id: string) => REFERENCES.find((r) => r.id === id)!.palette[0]!.hex;

beforeEach(() => localStorage.clear());

describe("SavedPalette", () => {
  it("shows an empty well, not a zero, before anything is saved", () => {
    renderPalette();
    expect(palette()).toHaveAccessibleName("Your studio: nothing set aside yet");
    expect(swatches()).toHaveLength(0);
    // The slot is still occupied, so the header does not reflow on first save.
    expect(palette().querySelector(".dab")).toBeInTheDocument();
  });

  it("lays a swatch in the saved piece's own first pigment", () => {
    seed(["ripe-pear"]);
    renderPalette();

    const [dab] = swatches();
    expect(swatches()).toHaveLength(1);
    expect(dab!.style.backgroundColor).toBe("rgb(220, 215, 126)"); // #dcd77e
    expect(firstHex("ripe-pear")).toBe("#dcd77e");
    expect(palette()).toHaveAccessibleName("Your studio: 1 saved piece");
  });

  it("puts the most recently saved colour at the front", () => {
    seed(["ripe-pear", "paper-boat"]);
    renderPalette();

    const [first, second] = swatches();
    expect(first!.style.backgroundColor).toBe("rgb(159, 178, 187)"); // paper-boat, saved last
    expect(second!.style.backgroundColor).toBe("rgb(220, 215, 126)"); // ripe-pear
  });

  it("caps the row and lets the count carry the rest", () => {
    const ids = REFERENCES.slice(0, 8).map((r) => r.id);
    seed(ids);
    renderPalette();

    expect(swatches()).toHaveLength(5);
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(palette()).toHaveAccessibleName("Your studio: 8 saved pieces");
  });

  /*
    The record is a record, not a score: it has to be able to go down, and it
    says nothing about having lost anything when it does. PRODUCT.md rules out
    streaks, targets and achievement language.
  */
  it("lifts the swatch back off when a piece is unsaved, with no loss language", async () => {
    const user = userEvent.setup();
    seed(["paper-boat"]);
    renderPalette(<SaveButton reference={REFERENCES.find((r) => r.id === "paper-boat")!} />);

    expect(swatches()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /^Saved\. Remove/ }));

    expect(swatches()).toHaveLength(0);
    expect(palette()).toHaveAccessibleName("Your studio: nothing set aside yet");
  });

  /*
    The point of the whole component: saving used to lead nowhere. It links
    whether or not anything is saved, so an empty studio can explain itself
    rather than being unreachable.
  */
  it("is the way into the studio, saved or not", () => {
    renderPalette();
    expect(palette()).toHaveAttribute("href", "/studio");

    cleanup();
    seed(["ripe-pear"]);
    renderPalette();
    expect(palette()).toHaveAttribute("href", "/studio");
  });

  it("settles only the swatch added this session, not the whole row on load", async () => {
    const user = userEvent.setup();
    seed(["ripe-pear"]);
    renderPalette(<SaveButton reference={REFERENCES.find((r) => r.id === "paper-boat")!} />);

    // Nothing animates on first paint: a quiet record, not a fanfare.
    expect(swatches().filter((d) => d.classList.contains("dab-settle"))).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /^Save Paper Boat/ }));

    const settling = swatches().filter((d) => d.classList.contains("dab-settle"));
    expect(swatches()).toHaveLength(2);
    expect(settling).toHaveLength(1);
    expect(settling[0]!.style.backgroundColor).toBe("rgb(159, 178, 187)"); // the new one
  });
});
