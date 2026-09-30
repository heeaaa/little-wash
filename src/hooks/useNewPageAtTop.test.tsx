/**
 * Which navigations open at the top of the page.
 *
 * jsdom does not scroll, so these assert the decision - whether the scroll is
 * reset - and the browser suite asserts where the page actually lands
 * (e2e/discovery.spec.ts, "starts at its top" and "Back returns").
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useNewPageAtTop } from "./useNewPageAtTop";

function Controls() {
  useNewPageAtTop();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/piece")}>
        open a piece
      </button>
      <button type="button" onClick={() => navigate("?time=short", { replace: true })}>
        narrow in place
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        forward
      </button>
      <button type="button" onClick={() => navigate("/elsewhere", { replace: true })}>
        replace the page
      </button>
    </>
  );
}

function renderAt(entry = "/browse") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="*" element={<Controls />} />
      </Routes>
    </MemoryRouter>,
  );
}

let scrollTo: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  scrollTo.mockRestore();
});

describe("a new page opens at its top", () => {
  it("leaves the first page alone, so a reload keeps its place", () => {
    renderAt();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("moves to the top when a link opens another page", async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole("button", { name: "open a piece" }));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("stays put when only the query changes, because that is the same page", async () => {
    // Filters, deals and warm-ups all rewrite the query in place. Jumping to
    // the top under a filter chip would be the ruder bug.
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole("button", { name: "narrow in place" }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("leaves Back and Forward to the browser, which restores the place you left", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "open a piece" }));
    scrollTo.mockClear();

    await user.click(screen.getByRole("button", { name: "back" }));
    await user.click(screen.getByRole("button", { name: "forward" }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("stays put when a query change follows a new page", async () => {
    // The navigation type changes from PUSH to REPLACE here while the page
    // does not, which is the case a naive dependency on the type would
    // mistake for a new page.
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "open a piece" }));
    scrollTo.mockClear();

    await user.click(screen.getByRole("button", { name: "narrow in place" }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("moves to the top when a page is replaced by another", async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole("button", { name: "replace the page" }));

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
