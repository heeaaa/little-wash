import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaintedNote, paintedOn } from "./PaintedNote";

/*
  The date a painted piece keeps, as the studio and the series pages show it.
  Absolute, always: DESIGN.md's painted register, rule 1.
*/
describe("PaintedNote", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives the day and the month for this year", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
    render(<PaintedNote on="2026-09-14" />);
    expect(screen.getByText("Painted 14 September")).toBeInTheDocument();
  });

  it("gives the stored day whatever zone the device is in, even after it changes", () => {
    // The date is a calendar day, not an instant. A formatter made in one zone
    // and used after the device moved to another showed a day out.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 30, 12, 0));
    const original = process.env.TZ;
    try {
      for (const zone of ["America/Los_Angeles", "Pacific/Auckland", "Pacific/Kiritimati", "UTC"]) {
        process.env.TZ = zone;
        expect(paintedOn("2026-09-14"), zone).toBe("14 September");
      }
    } finally {
      process.env.TZ = original;
    }
  });

  it("adds the year for a piece painted in another one", () => {
    // "14 September" alone would be read as this year's.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2027, 0, 5, 10, 0));
    render(<PaintedNote on="2026-09-14" />);
    expect(screen.getByText("Painted 14 September 2026")).toBeInTheDocument();
  });
});
