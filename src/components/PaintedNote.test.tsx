import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaintedNote } from "./PaintedNote";

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

  it("adds the year for a piece painted in another one", () => {
    // "14 September" alone would be read as this year's.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2027, 0, 5, 10, 0));
    render(<PaintedNote on="2026-09-14" />);
    expect(screen.getByText("Painted 14 September 2026")).toBeInTheDocument();
  });
});
