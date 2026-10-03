/**
 * What people see of accounts, through the whole app shell: the studio's line
 * and section, the sign-in sheet, the notices, the footer, and - as important -
 * everywhere that must say nothing at all.
 *
 * The app runs with a real AccountService over the in-memory backend
 * (src/test/fakeAccountBackend.ts), injected through AccountServiceOverride.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, useLocation } from "react-router-dom";
import { routeElements } from "@/routes";
import { AccountServiceOverride } from "@/state/AccountContext";
import { createAccountService, type AccountService } from "@/lib/account/service";
import { browserGuestStore } from "@/lib/account/guest";
import { AUTH_STORAGE_KEY, saveDevice } from "@/lib/account/device";
import { SyncFailure } from "@/lib/account/backend";
import type { AccountRecord } from "@/lib/account/record";
import { noticeText } from "@/components/account/AccountNotice";
import { CATALOGUE } from "@/data/catalogue";
import { ANA, TEST_CONFIG, createFakeBackend, createFakeServer, type FakeServer } from "@/test/fakeAccountBackend";

const PIECE = CATALOGUE[0]!;
const OTHER = CATALOGUE[1]!;

// jsdom ships <dialog> without the modal methods (as EnlargeDialog.test.tsx).
beforeAll(() => {
  const proto = window.HTMLDialogElement.prototype;
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  proto.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

let server: FakeServer;
let service: AccountService;

function makeService(config = TEST_CONFIG as typeof TEST_CONFIG | null) {
  service = createAccountService({ config, guest: browserGuestStore, loadBackend: async () => createFakeBackend(server) });
  return service;
}

let location = "";
function WhereAmI() {
  const here = useLocation();
  location = `${here.pathname}${here.search}`;
  return null;
}

function renderApp(path: string, withService: AccountService | null = makeService()) {
  const tree = (
    <MemoryRouter initialEntries={[path]}>
      <WhereAmI />
      <Routes>{routeElements}</Routes>
    </MemoryRouter>
  );
  return render(
    withService ? <AccountServiceOverride.Provider value={withService}>{tree}</AccountServiceOverride.Provider> : tree,
  );
}

function signedInAs(record: AccountRecord = { saved: [], painted: [] }) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ access_token: "a.b.c", user: { id: ANA.id, email: ANA.email } }));
  saveDevice(localStorage, { userId: ANA.id, email: ANA.email, record, pending: [], pulledAt: null });
  server.session = ANA;
  server.rows.set(ANA.id, record);
}

const main = () => screen.getByRole("main");
const footer = () => screen.getByRole("contentinfo");

beforeEach(() => {
  server = createFakeServer();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  service?.stop();
  vi.restoreAllMocks();
});

describe("a build without accounts", () => {
  it("offers nothing and says plainly where things are kept", () => {
    renderApp("/studio", null);
    expect(within(main()).queryByRole("button", { name: /sign in/i })).toBeNull();
    expect(screen.queryByText(/your studio is kept in this browser/i)).toBeNull();
    expect(footer()).toHaveTextContent("What you save, paint and switch off stays in this browser.");
    expect(within(footer()).queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("explains privacy without promising accounts it does not have", () => {
    renderApp("/privacy", null);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Without an account" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: /sign in with google/i })).toBeNull();
  });
});

describe("signed out, with accounts available", () => {
  it("offers sign-in once, quietly, in the studio", () => {
    renderApp("/studio");
    expect(within(main()).getByText("Your studio is kept in this browser.")).toBeVisible();
    expect(within(main()).getAllByRole("button", { name: /sign in/i })).toHaveLength(1);
  });

  it("offers it in the footer's small print too, and nowhere else on the page", () => {
    renderApp("/studio");
    expect(footer()).toHaveTextContent("What you save and paint stays in this browser unless you sign in.");
    // The header and nav carry nothing about accounts (DESIGN.md register rule 6).
    expect(within(screen.getByRole("banner")).queryByText(/sign in|account/i)).toBeNull();
  });

  it.each([
    ["Today", "/"],
    ["Detail", `/piece/${PIECE.id}`],
    ["Browse", "/browse"],
  ])("never asks on %s", (_name, path) => {
    renderApp(path);
    expect(within(main()).queryByRole("button", { name: /sign in/i })).toBeNull();
    expect(within(main()).queryByText(/sign in|account/i)).toBeNull();
  });

  it("opens the sheet, which says what signing in does before Google appears", async () => {
    const user = userEvent.setup();
    renderApp("/studio");
    await user.click(within(main()).getByRole("button", { name: "Sign in to keep it on every device" }));

    const sheet = screen.getByRole("dialog", { name: "Keep your studio with you" });
    expect(sheet).toHaveAttribute("open");
    expect(within(sheet).getByText(/you don.t need an account to use little wash/i)).toBeVisible();
    expect(within(sheet).getByText(/moves into your account when you sign in/i)).toBeVisible();
    // Google's screen will name this host; the sheet says so first.
    expect(within(sheet).getByText(TEST_CONFIG.host)).toBeVisible();
    expect(within(sheet).getByRole("button", { name: "Sign in with Google" })).toBeVisible();
    expect(within(sheet).getByRole("link", { name: /what.s kept, and where/i })).toHaveAttribute("href", "/privacy");
  });

  it("goes to Google from the sheet's button, keeping its words while it leaves", async () => {
    const user = userEvent.setup();
    renderApp("/studio");
    await user.click(within(main()).getByRole("button", { name: /sign in to keep it/i }));
    const button = screen.getByRole("button", { name: "Sign in with Google" });
    await user.click(button);
    await waitFor(() => expect(server.signInTargets).toEqual(["http://localhost:3000/"]));
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Opening Google…")).toBeVisible();
    // A second tap while leaving does nothing.
    await user.click(button);
    expect(server.signInTargets).toHaveLength(1);
  });

  it("closes with Not now and gives focus back to what opened it", async () => {
    const user = userEvent.setup();
    renderApp("/studio");
    const opener = within(main()).getByRole("button", { name: /sign in to keep it/i });
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();
  });

  it("says inside the sheet when sign-in cannot start, where the page behind cannot be reached", async () => {
    service = createAccountService({
      config: TEST_CONFIG,
      guest: browserGuestStore,
      loadBackend: async () => ({
        ...createFakeBackend(server),
        signIn: async () => {
          throw new SyncFailure("unavailable");
        },
      }),
    });
    const user = userEvent.setup();
    renderApp("/studio", service);
    const opener = within(main()).getByRole("button", { name: /sign in to keep it/i });
    await user.click(opener);
    const sheet = screen.getByRole("dialog", { name: "Keep your studio with you" });
    await user.click(within(sheet).getByRole("button", { name: "Sign in with Google" }));

    const said = noticeText({ kind: "sign-in-failed", reason: "unavailable" });
    await waitFor(() => expect(within(sheet).getByRole("status")).toHaveTextContent(said));
    expect(sheet).toHaveAttribute("open");

    // Opened again, it starts quiet: that failure was before this opening.
    await user.click(within(sheet).getByRole("button", { name: "Not now" }));
    await user.click(opener);
    expect(within(sheet).getByRole("status")).toHaveTextContent(/^$/);
  });

  it("closes for good when another tab signs in while it is open", async () => {
    const user = userEvent.setup();
    renderApp("/studio");
    await user.click(within(main()).getByRole("button", { name: /sign in to keep it/i }));
    const sheet = screen.getByRole("dialog", { name: "Keep your studio with you" });

    // Ana signs in in another tab; this one follows.
    server.session = ANA;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ access_token: "a.b.c", user: { id: ANA.id, email: ANA.email } }));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));
    });
    expect(await within(main()).findByText(/^Signed in as/)).toBeVisible();
    expect(sheet).not.toHaveAttribute("open");

    // Signing out here later must not bring back a sheet nobody asked for.
    await user.click(within(main()).getByRole("button", { name: "Sign out" }));
    expect(await within(main()).findByText("Your studio is kept in this browser.")).toBeVisible();
    expect(sheet).not.toHaveAttribute("open");
  });

  it("opens from the footer too", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await user.click(within(footer()).getByRole("button", { name: "sign in" }));
    expect(screen.getByRole("dialog", { name: "Keep your studio with you" })).toHaveAttribute("open");
  });

  it("warns inside an app's own browser, where Google will refuse", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 380.0.0.24.84",
    );
    const user = userEvent.setup();
    renderApp("/studio");
    await user.click(within(main()).getByRole("button", { name: /sign in to keep it/i }));
    expect(screen.getByText(/won.t sign anyone in from inside Instagram/)).toBeVisible();
  });

  it("keeps working exactly as before: a save stays in this browser and sends nothing", async () => {
    const user = userEvent.setup();
    renderApp(`/piece/${PIECE.id}`);
    await user.click(screen.getAllByRole("button", { name: new RegExp(`save ${PIECE.title}`, "i") })[0]!);
    expect(JSON.parse(localStorage.getItem("little-wash:favorites:v1")!)).toEqual({ ids: [PIECE.id] });
    expect(server.log).toEqual([]);
  });
});

describe("signed in", () => {
  it("shows who, the account's pieces, and a way out", async () => {
    signedInAs({ saved: [{ id: PIECE.id, at: "2026-10-01T08:00:00.000Z" }], painted: [] });
    renderApp("/studio");
    // Named twice on purpose: the line under the lede, and "Your account".
    expect(await within(main()).findByText(/^Signed in as/)).toHaveTextContent(`Signed in as ${ANA.email}.`);
    expect(within(main()).getAllByText(ANA.email!)).toHaveLength(2);
    expect(within(main()).getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(within(main()).getByRole("link", { name: PIECE.title })).toBeVisible();
    expect(within(main()).getByRole("heading", { level: 2, name: "Your account" })).toBeVisible();
    expect(footer()).toHaveTextContent("Signed in: what you save and paint is kept with your account.");
    expect(within(main()).queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("saves to the account, not to this browser", async () => {
    signedInAs();
    const user = userEvent.setup();
    renderApp(`/piece/${OTHER.id}`);
    await waitFor(() => expect(service.getSnapshot().sync).toBe("idle"));
    await user.click(screen.getAllByRole("button", { name: new RegExp(`save ${OTHER.title}`, "i") })[0]!);
    expect(service.getSnapshot().record?.saved.map((r) => r.id)).toEqual([OTHER.id]);
    expect(localStorage.getItem("little-wash:favorites:v1")).toBeNull();
    await waitFor(() => expect(server.rowsOf(ANA.id).saved.map((r) => r.id)).toEqual([OTHER.id]), { timeout: 3000 });
  });

  it("marks painted in the account, on today's date", async () => {
    signedInAs();
    const user = userEvent.setup();
    renderApp(`/piece/${OTHER.id}`);
    await waitFor(() => expect(service.getSnapshot().sync).toBe("idle"));
    await user.click(screen.getAllByRole("button", { name: `Mark ${OTHER.title} as painted` })[0]!);
    const marked = service.getSnapshot().record?.painted;
    expect(marked?.map((r) => r.id)).toEqual([OTHER.id]);
    expect(marked?.[0]?.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("says nothing about the connection while all is well, and speaks up when a change is stuck", async () => {
    signedInAs();
    renderApp("/studio");
    await waitFor(() => expect(service.getSnapshot().sync).toBe("idle"));
    expect(within(main()).queryByText(/offline|can.t reach/i)).toBeNull();

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
      service.toggleSaved(PIECE.id);
    });
    expect(within(main()).getByText(/you.re offline\. 1 change will reach your account/i)).toBeVisible();
  });

  it("offers a way to try again when the account cannot be reached", async () => {
    signedInAs();
    server.failures.push("unavailable");
    const user = userEvent.setup();
    renderApp("/studio");
    expect(await within(main()).findByText(/can.t reach your account just now/i)).toBeVisible();
    await user.click(within(main()).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(within(main()).queryByText(/can.t reach/i)).toBeNull());
  });

  it("signs out, leaving an empty studio and a word about where things went", async () => {
    signedInAs({ saved: [{ id: PIECE.id, at: "2026-10-01T08:00:00.000Z" }], painted: [] });
    const user = userEvent.setup();
    renderApp("/studio");
    await user.click(await within(main()).findByRole("button", { name: "Sign out" }));
    expect(await within(main()).findByText("Your studio is kept in this browser.")).toBeVisible();
    expect(within(main()).queryByRole("link", { name: PIECE.title })).toBeNull();
    // Said aloud through the live region, and shown in the notice card.
    expect(screen.getAllByText("Signed out. Your studio is kept with your account for next time.")).toHaveLength(2);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    // The button went with the signed-in view; focus carries on from the words.
    expect(screen.getByRole("button", { name: "Dismiss this message" })).toHaveFocus();
  });

  it("leaves focus alone when the session ends in another tab, which nobody here asked for", async () => {
    signedInAs();
    renderApp("/studio");
    await waitFor(() => expect(service.getSnapshot().sync).toBe("idle"));
    // As after a click on the page itself: focus is on nothing in particular.
    (document.activeElement as HTMLElement | null)?.blur();
    act(() => server.endSessionElsewhere());
    expect(await screen.findAllByText(noticeText({ kind: "session-ended" }))).not.toHaveLength(0);
    expect(document.body).toHaveFocus();
  });

  it("says inside the dialog when the account cannot be deleted, and nothing is removed", async () => {
    signedInAs({ saved: [{ id: PIECE.id, at: "2026-10-01T08:00:00.000Z" }], painted: [] });
    const user = userEvent.setup();
    renderApp("/studio");
    await waitFor(() => expect(service.getSnapshot().sync).toBe("idle"));
    server.failures.push("unavailable");
    await user.click(within(main()).getByRole("button", { name: "Delete my account" }));
    const dialog = screen.getByRole("dialog", { name: "Delete your account?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete my account" }));

    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent(noticeText({ kind: "delete-failed" })),
    );
    expect(dialog).toHaveAttribute("open");
    expect(server.rows.has(ANA.id)).toBe(true);

    // Asked again, the question starts without the old failure.
    await user.click(within(dialog).getByRole("button", { name: "Keep my account" }));
    await user.click(within(main()).getByRole("button", { name: "Delete my account" }));
    expect(within(dialog).getByRole("status")).toHaveTextContent(/^$/);
  });

  it("asks before deleting the account, with the safe answer first", async () => {
    signedInAs({ saved: [{ id: PIECE.id, at: "2026-10-01T08:00:00.000Z" }], painted: [] });
    const user = userEvent.setup();
    renderApp("/studio");
    await user.click(await within(main()).findByRole("button", { name: "Delete my account" }));
    const dialog = screen.getByRole("dialog", { name: "Delete your account?" });
    expect(dialog).toHaveTextContent("1 saved piece and 0 painted pieces, on every device. It can’t be undone.");
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Keep my account", "Delete my account"]);

    await user.click(within(dialog).getByRole("button", { name: "Keep my account" }));
    expect(server.rows.has(ANA.id)).toBe(true);

    await user.click(within(main()).getByRole("button", { name: "Delete my account" }));
    await user.click(within(screen.getByRole("dialog", { name: "Delete your account?" })).getByRole("button", { name: "Delete my account" }));
    await waitFor(() => expect(server.rows.has(ANA.id)).toBe(false));
    expect((await screen.findAllByText("Your account and everything in it has been deleted.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Dismiss this message" })).toHaveFocus();
  });

  it("asks before signing out would lose a change that cannot be sent", async () => {
    signedInAs();
    const user = userEvent.setup();
    renderApp("/studio");
    await waitFor(() => expect(service.getSnapshot().sync).toBe("idle"));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => service.toggleSaved(PIECE.id));
    await user.click(within(main()).getByRole("button", { name: "Sign out" }));
    const dialog = await screen.findByRole("dialog", { name: "Sign out with changes unsent?" });
    expect(dialog).toHaveTextContent("1 change hasn't reached your account yet");
    await user.click(within(dialog).getByRole("button", { name: "Stay signed in" }));
    expect(service.getSnapshot().status).toBe("signed-in");
    expect(service.getSnapshot().pending).toBe(1);
  });
});

describe("the privacy page, with accounts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("says what an account holds, where, and how to delete it", () => {
    renderApp("/privacy");
    expect(screen.getByRole("heading", { name: "If you sign in with Google" })).toBeVisible();
    expect(screen.getByText(/your email address, the name and picture link Google shared/i)).toBeVisible();
    expect(screen.getByText(/records the internet address each sign-in came from/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Signing out and deleting" })).toBeVisible();
    expect(screen.getByRole("link", { name: "your studio" })).toHaveAttribute("href", "/studio");
    expect(screen.getByText(/Privacy Act 2020/)).toBeVisible();
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
  });

  it("gives an address for questions only when the build has a real one", () => {
    vi.stubEnv("VITE_SUPPORT_EMAIL", "hello@little-wash.example");
    const { unmount } = renderApp("/privacy");
    expect(screen.getByRole("link", { name: "hello@little-wash.example" })).toHaveAttribute(
      "href",
      "mailto:hello@little-wash.example",
    );
    unmount();
    service.stop();

    vi.stubEnv("VITE_SUPPORT_EMAIL", "not an address");
    renderApp("/privacy");
    expect(screen.queryByRole("link", { name: /address/ })).toBeNull();
  });
});

describe("finishing a sign-in", () => {
  it("says the studio is opening while the account is reached", async () => {
    window.history.replaceState(null, "", "/?code=from-google");
    // A client that is still loading.
    service = createAccountService({ config: TEST_CONFIG, guest: browserGuestStore, loadBackend: () => new Promise(() => undefined) });
    renderApp("/studio", service);
    expect(await within(main()).findByText("Opening your studio…")).toBeVisible();
    expect(within(main()).queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("names how many changes are kept when the account cannot be reached", async () => {
    signedInAs();
    renderApp("/studio");
    await waitFor(() => expect(service.getSnapshot().sync).toBe("idle"));
    server.failures.push("unavailable");
    act(() => {
      service.toggleSaved(PIECE.id);
      service.toggleSaved(OTHER.id);
    });
    expect(await within(main()).findByText(/2 changes are kept here until it.s back/i, {}, { timeout: 3000 })).toBeVisible();
  });
});

describe("back from Google", () => {
  it("returns to where sign-in started, saying what came across", async () => {
    localStorage.setItem("little-wash:favorites:v1", JSON.stringify({ ids: [PIECE.id] }));
    localStorage.setItem("little-wash:sign-in:v1", JSON.stringify({ returnTo: "/studio", startedAt: new Date().toISOString() }));
    window.history.replaceState(null, "", "/?code=from-google");
    server.session = ANA;
    renderApp("/");
    await waitFor(() => expect(location).toBe("/studio"));
    expect(
      (await screen.findAllByText(`Signed in as ${ANA.email}. 1 saved piece from this browser is now in your account.`)).length,
    ).toBeGreaterThan(0);
    expect(within(main()).getByRole("link", { name: PIECE.title })).toBeVisible();
  });

  it("can be dismissed", async () => {
    window.history.replaceState(null, "", "/?error=access_denied");
    const user = userEvent.setup();
    renderApp("/");
    await user.click(await screen.findByRole("button", { name: "Dismiss this message" }));
    expect(screen.queryByRole("button", { name: "Dismiss this message" })).toBeNull();
  });
});

describe("the words of every notice", () => {
  it.each([
    [{ kind: "signed-in", email: "a@b.test", added: { saved: 0, painted: 0 }, sent: true }, "Signed in as a@b.test."],
    [{ kind: "signed-in", email: null, added: { saved: 2, painted: 1 }, sent: true }, "Signed in. 2 saved pieces and 1 painted piece from this browser are now in your account."],
    [{ kind: "signed-in", email: null, added: { saved: 0, painted: 3 }, sent: true }, "Signed in. 3 painted pieces from this browser are now in your account."],
    [{ kind: "signed-in", email: "a@b.test", added: { saved: 1, painted: 0 }, sent: false }, "Signed in as a@b.test. 1 saved piece from this browser will move into your account as soon as it can be reached."],
    [{ kind: "sign-in-failed", reason: "cancelled" }, "Sign-in was cancelled. little wash works just the same without an account."],
    [{ kind: "sign-in-failed", reason: "not-finished" }, "Sign-in didn’t finish in this browser. If you started it somewhere else, start again here."],
    [{ kind: "sign-in-failed", reason: "unavailable" }, "Sign-in isn’t working right now. Please try again a little later."],
    [{ kind: "sign-in-failed", reason: "offline" }, "You’re offline. Sign in when you’re back online."],
    [{ kind: "sign-in-failed", reason: "other" }, "Sign-in didn’t work. Please try again."],
    [{ kind: "sign-in-unfinished" }, "Sign-in didn’t finish. You can try again whenever you like."],
    [{ kind: "session-ended" }, "You’ve been signed out. Sign in again to see your studio."],
    [{ kind: "delete-failed" }, "Your account couldn’t be deleted just now. Nothing was removed. Please try again."],
    [{ kind: "changes-refused", count: 1 }, "1 change couldn’t be saved to your account, so your account’s version has been kept."],
  ] as const)("%o", (notice, words) => {
    expect(noticeText(notice)).toBe(words);
  });

  it("uses none of the words the register rules out", () => {
    const all = [
      noticeText({ kind: "signed-in", email: null, added: { saved: 3, painted: 2 }, sent: true }),
      noticeText({ kind: "signed-in", email: null, added: { saved: 3, painted: 2 }, sent: false }),
      noticeText({ kind: "signed-out" }),
      noticeText({ kind: "deleted" }),
    ].join(" ");
    expect(all).not.toMatch(/complete|done|finished|achievement|milestone|goal|streak|unlock|don.t lose/i);
  });
});
