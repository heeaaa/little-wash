/**
 * Opening a curated collection on Browse.
 *
 * A theme like Pexels' "Simply Citrus" is a list, not a filter, so it travels
 * as `?collection=<id>`. These cover what a painter actually does with it:
 * open it, narrow inside it, leave it, and follow a link to one that no longer
 * holds anything.
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "@/state/AppContext";
import { Browse } from "@/screens/Browse";
import { COLLECTIONS } from "@/data/collections";
import { makeCredit, makeReference } from "@/test/factory";

const CATALOG = [
  makeReference("lemon-half", { subject: "fruit", minutes: 5 }),
  makeReference("orange-slice", { subject: "fruit", minutes: 30, difficulty: "stretch" }),
  makeReference("far-cottage", { subject: "landscape", minutes: 25 }),
  makeReference("pexels-leaf", {
    subject: "botanical",
    minutes: 8,
    credit: makeCredit({ sourceId: "pexels", institution: "Pexels" }),
  }),
];

const CITRUS = {
  id: "simply-citrus",
  title: "Simply Citrus",
  blurb: "A themed set.",
  pigmentVar: "--pig-fruit",
  filter: {},
  referenceIds: ["lemon-half", "orange-slice"],
  coverSubject: "fruit" as const,
};

/*
  COLLECTIONS is the shipped editorial list and Browse reads it directly, so a
  curated theme is stood in its place for these tests - and put back
  afterwards. Vitest isolates test files, but a module-level array mutated and
  left that way is a trap for whoever adds the next test to this file.
*/
const SHIPPED = [...COLLECTIONS];

beforeEach(() => {
  localStorage.clear();
  COLLECTIONS.length = 0;
  COLLECTIONS.push(CITRUS);
});

afterEach(() => {
  COLLECTIONS.length = 0;
  COLLECTIONS.push(...SHIPPED);
});

function renderBrowse(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/browse${search}`]}>
      <AppProvider references={CATALOG} today={new Date("2026-09-20T09:00:00Z")}>
        <Browse />
      </AppProvider>
    </MemoryRouter>,
  );
}

const cards = () => screen.getAllByRole("listitem");

describe("opening a curated collection", () => {
  it("shows the whole catalogue when no collection is open", () => {
    renderBrowse();
    expect(screen.getByRole("heading", { name: "The whole catalogue" })).toBeVisible();
  });

  it("narrows to the collection's own list", () => {
    renderBrowse("?collection=simply-citrus");
    const results = screen.getByRole("heading", { name: "Simply Citrus" });
    expect(results).toBeVisible();
    // Two curated pieces, not the four in the catalogue.
    expect(screen.getByText("lemon-half")).toBeVisible();
    expect(screen.getByText("orange-slice")).toBeVisible();
    expect(screen.queryByText("far-cottage")).toBeNull();
  });

  it("announces the collection's count, not the catalogue's", () => {
    renderBrowse("?collection=simply-citrus");
    expect(screen.getByText("2 pieces in view.")).toBeInTheDocument();
  });

  it("lets a filter narrow within the collection", () => {
    // A theme decides what is in the set; the filters still decide what fits
    // the afternoon.
    renderBrowse("?collection=simply-citrus&time=short");
    expect(screen.getByText("lemon-half")).toBeVisible();
    expect(screen.queryByText("orange-slice")).toBeNull();
  });

  it("offers a way back out to the whole catalogue", async () => {
    const user = userEvent.setup();
    renderBrowse("?collection=simply-citrus");

    await user.click(screen.getByRole("button", { name: "Show everything" }));

    expect(screen.getByRole("heading", { name: "The whole catalogue" })).toBeVisible();
    expect(screen.getByText("far-cottage")).toBeVisible();
  });

  it("offers no way out when no collection is open", () => {
    renderBrowse();
    expect(screen.queryByRole("button", { name: "Show everything" })).toBeNull();
  });

  it("ignores an id that matches no collection", () => {
    renderBrowse("?collection=not-a-collection");
    expect(screen.getByRole("heading", { name: "The whole catalogue" })).toBeVisible();
  });

  it("ignores a collection whose pieces have all gone", () => {
    // A curated list can empty out when a source is switched off. A stale link
    // should land on something useful rather than on a blank screen.
    COLLECTIONS.length = 0;
    COLLECTIONS.push({ ...CITRUS, referenceIds: ["retired-a", "retired-b"] });
    renderBrowse("?collection=simply-citrus");
    expect(screen.getByRole("heading", { name: "The whole catalogue" })).toBeVisible();
  });
});

describe("the collection card's link", () => {
  it("sends a curated theme as its own id", () => {
    renderBrowse();
    const card = within(cards()[0]!).getByRole("link");
    expect(card).toHaveAttribute("href", expect.stringContaining("collection=simply-citrus"));
  });
});

describe("the shipped collections are left alone", () => {
  it("restores the editorial list after these tests have finished with it", () => {
    // Guards the afterEach above: if the restore ever stops working, this is
    // the test that says so rather than a puzzling failure elsewhere.
    expect(SHIPPED.length).toBeGreaterThan(0);
    expect(SHIPPED.some((c) => c.id === CITRUS.id)).toBe(false);
  });
});
