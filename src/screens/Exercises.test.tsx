import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Exercises } from "@/screens/Exercises";
import { EXERCISES } from "@/data/exercises";
import { makeReference } from "@/test/factory";

/** The query string the screen has written, so URL state can be asserted. */
function Search() {
  return <span data-testid="search">{useLocation().search}</span>;
}

function renderWarmups(entry = "/exercises") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/exercises"
          element={
            <AppProvider references={[makeReference("one")]}>
              <Exercises />
              <Search />
            </AppProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const search = () => screen.getByTestId("search").textContent;
const toggle = (name: RegExp) => screen.getByRole("button", { name });
const sheet = () => screen.getByRole("region");
const steps = () =>
  within(sheet())
    .getAllByRole("listitem")
    .filter((li) => li.closest("ol"))
    // The step number is decoration; the step is the text beside it.
    .map((li) => li.lastElementChild?.textContent);

const GRADED = EXERCISES.find((e) => e.id === "graded-wash")!;
const variation = (id: string) => GRADED.variations.find((v) => v.id === id)!;
const CLASSIC = variation("classic-rectangle");
const FADING = variation("fading-sky");
const SUNSET = variation("sunset-wash");

afterEach(() => {
  delete (navigator as { wakeLock?: unknown }).wakeLock;
});

describe("Warm-ups", () => {
  it("lists the five warm-ups to scan, each with its focus, time and variations", () => {
    renderWarmups();
    const rows = screen.getAllByRole("heading", { level: 2 });
    expect(rows).toHaveLength(5);

    // Named by the title alone; the rest is its description, not fifteen words of name.
    expect(screen.getByRole("heading", { level: 2, name: "Graded wash" })).toBeInTheDocument();
    const graded = toggle(/graded wash/i);
    expect(graded).toHaveAccessibleName("Graded wash");
    expect(graded).toHaveAccessibleDescription(/One smooth, even transition.*8-12 min.*4 variations/);
    expect(graded).toHaveAttribute("aria-expanded", "false");
    expect(graded).toHaveTextContent("One smooth, even transition");
    expect(graded).toHaveTextContent("8-12 min");
    expect(graded).toHaveTextContent("4 variations");
    expect(toggle(/value ladder/i)).toHaveTextContent("5 variations");

    // Variations live inside a warm-up, not as cards on the page.
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("opens a warm-up on its classic, with the preview and guide to match", async () => {
    const user = userEvent.setup();
    renderWarmups();
    await user.click(toggle(/graded wash/i));

    expect(toggle(/graded wash/i)).toHaveAttribute("aria-expanded", "true");
    const region = sheet();
    expect(region).toHaveAccessibleName(/graded wash/i);

    const choices = within(region).getAllByRole("radio");
    expect(choices).toHaveLength(4);
    expect(within(region).getByRole("radio", { name: "Classic rectangle" })).toBeChecked();

    expect(within(region).getByRole("img", { name: CLASSIC.artAlt })).toBeInTheDocument();
    expect(within(region).getByRole("heading", { level: 3 })).toHaveTextContent(CLASSIC.name);
    expect(steps()).toEqual(CLASSIC.steps);
    expect(region).toHaveTextContent(CLASSIC.notice);
    expect(region).toHaveTextContent("Sap Green");
    expect(search()).toBe("?warmup=graded-wash");
  });

  it("changes the preview and the guide together when a variation is chosen", async () => {
    const user = userEvent.setup();
    renderWarmups();
    await user.click(toggle(/graded wash/i));
    await user.click(screen.getByRole("radio", { name: "Sunset wash" }));

    const region = sheet();
    expect(within(region).getByRole("radio", { name: "Sunset wash" })).toBeChecked();
    expect(within(region).getByRole("radio", { name: "Classic rectangle" })).not.toBeChecked();
    expect(within(region).getByRole("img", { name: SUNSET.artAlt })).toBeInTheDocument();
    expect(within(region).queryByRole("img", { name: CLASSIC.artAlt })).toBeNull();
    expect(within(region).getByRole("heading", { level: 3 })).toHaveTextContent("Sunset wash");
    expect(steps()).toEqual(SUNSET.steps);
    expect(region).toHaveTextContent(SUNSET.notice);
    expect(region).toHaveTextContent("New Gamboge");
    expect(region).not.toHaveTextContent("Sap Green");
    expect(search()).toBe("?warmup=graded-wash&variation=sunset-wash");

    // Back to the classic keeps the URL clean.
    await user.click(screen.getByRole("radio", { name: "Classic rectangle" }));
    expect(search()).toBe("?warmup=graded-wash");
  });

  it("moves between variations with the arrow keys, like any radio group", async () => {
    const user = userEvent.setup();
    renderWarmups();
    await user.click(toggle(/graded wash/i));
    screen.getByRole("radio", { name: "Classic rectangle" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: FADING.name })).toBeChecked();
    expect(screen.getByRole("img", { name: FADING.artAlt })).toBeInTheDocument();
  });

  it("keeps one warm-up open at a time", async () => {
    const user = userEvent.setup();
    renderWarmups();
    await user.click(toggle(/graded wash/i));
    await user.click(toggle(/value ladder/i));

    expect(toggle(/graded wash/i)).toHaveAttribute("aria-expanded", "false");
    expect(toggle(/value ladder/i)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("region")).toHaveLength(1);
    // A different warm-up starts on its own classic.
    expect(screen.getByRole("radio", { name: "Classic squares" })).toBeChecked();
  });

  it("closes from the row, from the button, and with Escape, returning focus to the row", async () => {
    const user = userEvent.setup();
    renderWarmups();

    await user.click(toggle(/graded wash/i));
    await user.click(toggle(/graded wash/i));
    expect(screen.queryByRole("region")).toBeNull();

    await user.click(toggle(/graded wash/i));
    await user.click(screen.getByRole("button", { name: /close warm-up/i }));
    expect(screen.queryByRole("region")).toBeNull();
    expect(toggle(/graded wash/i)).toHaveFocus();
    expect(search()).toBe("");

    await user.click(toggle(/graded wash/i));
    await user.click(screen.getByRole("radio", { name: "Fading sky" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region")).toBeNull();
    expect(toggle(/graded wash/i)).toHaveFocus();
  });

  it("filters by kind, and closes a warm-up the filter hides", async () => {
    const user = userEvent.setup();
    renderWarmups();
    await user.click(toggle(/graded wash/i));
    await user.click(screen.getByRole("button", { name: /^Colour$/ }));

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /graded wash/i })).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
    expect(search()).toBe("?kind=colour");

    await user.click(screen.getByRole("button", { name: /^All$/ }));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(search()).toBe("");
  });

  it("keeps a stale link's hidden warm-up closed when the filter is cleared", async () => {
    const user = userEvent.setup();
    renderWarmups("/exercises?kind=colour&warmup=graded-wash");
    expect(screen.queryByRole("region")).toBeNull();
    await user.click(screen.getByRole("button", { name: /^All$/ }));
    expect(screen.queryByRole("region")).toBeNull();
    expect(toggle(/graded wash/i)).toHaveAttribute("aria-expanded", "false");
  });

  it("restores the filter, the warm-up and the variation from the URL", () => {
    renderWarmups("/exercises?kind=brushwork&warmup=graded-wash&variation=misty-landscape");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.getByRole("button", { name: /^Brushwork$/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("radio", { name: "Misty landscape" })).toBeChecked();
  });

  it("ignores URL values it does not recognise", () => {
    renderWarmups("/exercises?kind=color&warmup=graded-wash&variation=nope");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Classic rectangle" })).toBeChecked();
  });

  it("opens nothing for an unknown warm-up", () => {
    renderWarmups("/exercises?warmup=nope");
    expect(screen.queryByRole("region")).toBeNull();
  });

  describe("photo inspiration", () => {
    it("shows the approved photo, labelled and credited, where a variation has one", async () => {
      renderWarmups("/exercises?warmup=graded-wash&variation=sunset-wash");
      const region = sheet();
      expect(within(region).getByText("Photo inspiration")).toBeInTheDocument();
      expect(within(region).getByRole("img", { name: SUNSET.photo!.alt })).toBeInTheDocument();
      expect(region).toHaveTextContent("Photo by César Couto on Unsplash");
      expect(within(region).getByRole("link", { name: "César Couto" })).toHaveAttribute(
        "href",
        SUNSET.photo!.credit.creatorUrl,
      );
      // The illustration is labelled as ours; the photo as a photograph.
      expect(region).toHaveTextContent("A Little Wash illustration.");
      expect(region).toHaveTextContent("A real photograph to look at");
    });

    /*
      Graded wash has three photo variations in a row. A photo that failed to
      load must not leave the next one stuck on "didn't load" without ever
      asking for it.
    */
    it("asks for the next photo after one failed to load", async () => {
      const user = userEvent.setup();
      renderWarmups("/exercises?warmup=graded-wash&variation=sunset-wash");
      fireEvent.error(screen.getByRole("img", { name: SUNSET.photo!.alt }));
      expect(await screen.findByText(/didn.t load/)).toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: "Misty landscape" }));
      const misty = GRADED.variations.find((v) => v.id === "misty-landscape")!;
      const img = screen.getByRole("img", { name: misty.photo!.alt });
      expect(img.tagName).toBe("IMG");
      expect(screen.queryByText(/didn.t load/)).toBeNull();
    });

    it("shows none where a variation has none", () => {
      renderWarmups("/exercises?warmup=graded-wash");
      expect(within(sheet()).queryByText("Photo inspiration")).toBeNull();
    });

    it("obeys the sources switch: no Unsplash photo once Unsplash is off", () => {
      localStorage.setItem("little-wash:sources:v1", JSON.stringify({ disabled: ["unsplash"] }));
      renderWarmups("/exercises?warmup=graded-wash&variation=sunset-wash");
      expect(within(sheet()).queryByText("Photo inspiration")).toBeNull();
    });
  });

  describe("keep screen on", () => {
    it("is not offered where the browser cannot do it", () => {
      renderWarmups("/exercises?warmup=graded-wash");
      expect(screen.queryByRole("switch")).toBeNull();
    });

    it("is a switch that reflects the lock", async () => {
      const release = vi.fn(async () => undefined);
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: {
          request: vi.fn(async () => {
            const lock = new EventTarget() as EventTarget & { released: boolean; release: typeof release };
            lock.released = false;
            lock.release = release;
            return lock;
          }),
        },
      });
      const user = userEvent.setup();
      renderWarmups("/exercises?warmup=graded-wash");

      const keep = screen.getByRole("switch", { name: /keep screen on/i });
      expect(keep).toHaveAttribute("aria-checked", "false");
      await user.click(keep);
      expect(keep).toHaveAttribute("aria-checked", "true");
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/screen will stay on/i),
      );

      // Closing the warm-up lets the screen sleep again.
      await user.click(screen.getByRole("button", { name: /close warm-up/i }));
      await waitFor(() => expect(release).toHaveBeenCalled());
    });
  });
});
