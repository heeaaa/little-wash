/**
 * The provider's own promise: one account service for the page. A second
 * would mean a second supabase-js client on the same session, with the first
 * one's timers and listeners still running.
 */

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createAccountService } from "@/lib/account/service";
import { AccountProvider } from "./AccountContext";

vi.mock("@/lib/account/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/account/service")>();
  return { ...actual, createAccountService: vi.fn(actual.createAccountService) };
});

function shell() {
  return (
    <MemoryRouter>
      <AccountProvider>
        <p>studio</p>
      </AccountProvider>
    </MemoryRouter>
  );
}

describe("the account provider", () => {
  it("makes one service for the page, however often the shell mounts", () => {
    // As on leaving the shell for a route outside it, and coming back.
    render(shell()).unmount();
    render(shell()).unmount();
    render(shell());
    expect(createAccountService).toHaveBeenCalledTimes(1);
  });
});
