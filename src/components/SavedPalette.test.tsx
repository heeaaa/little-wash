import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { CATALOGUE } from "@/data/catalogue";
import { SavedPalette } from "@/components/SavedPalette";
import { SaveButton } from "@/components/SaveButton";

const STORAGE_KEY = "little-wash:favorites:v1";

function seed(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids }));
}

function renderPalette(extra?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AppProvider references={CATALOGUE}>
        <SavedPalette />
        {extra}
      </AppProvider>
    </MemoryRouter>,
  );
}

const palette = () => screen.getByRole("link", { name: /your studio/i });
const swatches = () =>
  [...palette().querySelectorAll<HTMLElement>("span[style*='background-color']")];
const firstHex = (id: string) => CATALOGUE.find((r) => r.id === id)!.palette[0]!.hex;

/*
  Two pieces, whichever the catalogue leads with. Naming ids and hex values
  tied these assertions to twelve placeholder illustrations; what they are
  really about is that a saved piece's dot carries that piece's own first
  swatch, which holds for any catalogue.
*/
const [alpha, beta] = CATALOGUE as [typeof CATALOGUE[number], typeof CATALOGUE[number]];
const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

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
    seed([alpha.id]);
    renderPalette();

    const [dab] = swatches();
    expect(swatches()).toHaveLength(1);
    expect(dab!.style.backgroundColor).toBe(rgbOf(alpha.palette[0]!.hex));
    expect(firstHex(alpha.id)).toBe(alpha.palette[0]!.hex);
    expect(palette()).toHaveAccessibleName("Your studio: 1 saved piece");
  });

  it("puts the most recently saved colour at the front", () => {
    seed([alpha.id, beta.id]);
    renderPalette();

    const [first, second] = swatches();
    expect(first!.style.backgroundColor).toBe(rgbOf(beta.palette[0]!.hex)); // saved last
    expect(second!.style.backgroundColor).toBe(rgbOf(alpha.palette[0]!.hex));
  });

  it("caps the row and lets the count carry the rest", () => {
    const ids = CATALOGUE.slice(0, 8).map((r) => r.id);
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
    seed([beta.id]);
    renderPalette(<SaveButton reference={beta} />);

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
    seed([alpha.id]);
    renderPalette();
    expect(palette()).toHaveAttribute("href", "/studio");
  });

  it("settles only the swatch added this session, not the whole row on load", async () => {
    const user = userEvent.setup();
    seed([alpha.id]);
    renderPalette(<SaveButton reference={beta} />);

    // Nothing animates on first paint: a quiet record, not a fanfare.
    expect(swatches().filter((d) => d.classList.contains("dab-settle"))).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: new RegExp(`^Save ${beta.title}`) }));

    const settling = swatches().filter((d) => d.classList.contains("dab-settle"));
    expect(swatches()).toHaveLength(2);
    expect(settling).toHaveLength(1);
    expect(settling[0]!.style.backgroundColor).toBe(rgbOf(beta.palette[0]!.hex));
  });
});
