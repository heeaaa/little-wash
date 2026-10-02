/**
 * The exact requests supabase-js makes for little wash, pinned.
 *
 * supabase-js is given a recording fetch, so these tests see every request the
 * real client sends - the PKCE sign-in, the code exchange, the row reads, the
 * upserts and deletes, the delete-account call, sign-out - and answer each as
 * Supabase would. A change in supabase-js's requests, or in how this module
 * reads the answers, shows up here before it reaches anyone. What these cannot
 * see - the real API and the real database rules - integration/ checks against
 * a real local stack.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REQUEST_TIMEOUT_MS, createSupabaseBackend } from "./supabaseBackend";
import { AUTH_STORAGE_KEY, DEVICE_KEY, saveDevice } from "./device";
import { SyncFailure } from "./backend";
import { createAccountService } from "./service";
import { browserGuestStore } from "./guest";
import type { Change } from "./record";

/*
  Every client a test makes is torn down when it ends. supabase-js gives each
  client its own auto-refresh tick, and all of them share the app's one
  storage key, so a client left over from an earlier test would refresh the
  next test's session with that earlier test's answers. (Found when a stored
  expired session came back refreshed in a test where Auth only ever said
  503.) The app makes exactly one client, so this is about the tests alone.
*/
const clients = vi.hoisted(() => [] as SupabaseClient[]);

vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  return {
    ...actual,
    createClient: ((...args: Parameters<typeof actual.createClient>) => {
      const client = actual.createClient(...args);
      clients.push(client);
      return client;
    }) as typeof actual.createClient,
  };
});

const CONFIG = { url: "https://test-project.supabase.co", publishableKey: "sb_publishable_test", host: "test-project.supabase.co" };
const ANA = "0b6f2c1e-0000-4000-8000-00000000000a";
const NOW_SECONDS = Math.floor(new Date("2026-10-02T08:00:00.000Z").getTime() / 1000);

interface Recorded {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
  signal?: AbortSignal | null;
}

type Responder = (request: Recorded) => Response | Promise<Response>;

function recordingFetch(respond: Responder) {
  const requests: Recorded[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const raw = init?.body;
    const body = typeof raw === "string" && raw.length > 0 ? (JSON.parse(raw) as unknown) : null;
    const request = { method, url, headers: new Headers(init?.headers), body, signal: init?.signal ?? null };
    requests.push(request);
    return respond(request);
  }) as typeof fetch;
  return { fetchImpl, requests };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

const empty = (status: number) => new Response(null, { status });

/** A JWT-shaped access token; supabase-js reads its claims, not its signature. */
function accessToken(sub: string) {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub, role: "authenticated", exp: NOW_SECONDS + 3600, aud: "authenticated" })}.signature`;
}

function sessionFor(sub: string) {
  return {
    access_token: accessToken(sub),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: NOW_SECONDS + 3600,
    refresh_token: "refresh-token",
    user: { id: sub, aud: "authenticated", role: "authenticated", email: "ana@example.test", app_metadata: { provider: "google" }, user_metadata: {}, created_at: "2026-10-02T08:00:00Z" },
  };
}

function storeSession(sub = ANA) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionFor(sub)));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW_SECONDS * 1000));
  window.history.replaceState(null, "", "/");
  /*
    Two warnings from supabase-js are expected here and swallowed; any other
    still prints. Each test makes its own client on the same storage key,
    which it warns about (the app makes exactly one: AccountContext). And it
    warns of each refresh that could not reach Auth, which the tests below
    cause on purpose and check what the app then does.
  */
  const warn = console.warn.bind(console);
  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Multiple GoTrueClient instances")) return;
    if (args[0] instanceof Error && args[0].name === "AuthRetryableFetchError") return;
    warn(...args);
  });
});

afterEach(async () => {
  // Before the clock goes back to real: a client's tick is cleared by the
  // same kind of timer that set it.
  await Promise.all(clients.splice(0).map((client) => client.auth.dispose()));
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("signing in", () => {
  it("goes to Google through Supabase with PKCE, back to the page it was given", async () => {
    const { fetchImpl, requests } = recordingFetch(() => empty(500));
    const navigate = vi.fn();
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl, navigate });
    await backend.start();
    await backend.signIn("http://localhost:3000/");

    expect(navigate).toHaveBeenCalledTimes(1);
    const target = new URL(navigate.mock.calls[0]![0] as string);
    expect(`${target.origin}${target.pathname}`).toBe("https://test-project.supabase.co/auth/v1/authorize");
    expect(target.searchParams.get("provider")).toBe("google");
    expect(target.searchParams.get("redirect_to")).toBe("http://localhost:3000/");
    expect(target.searchParams.get("code_challenge_method")).toBe("s256");
    expect(target.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // The verifier waits in this app's own storage key, ready for the return
    // (supabase-js stores it JSON-encoded).
    expect(JSON.parse(localStorage.getItem(`${AUTH_STORAGE_KEY}-code-verifier`)!)).toMatch(/^[0-9a-f]{56,128}$/);
    // Going to Google is a navigation, not a request from the page.
    expect(requests).toEqual([]);
  });

  it("swaps the returned code for a session using that verifier, and removes the code from the address", async () => {
    const navigate = vi.fn();
    const first = recordingFetch(() => empty(500));
    await createSupabaseBackend(CONFIG, { fetch: first.fetchImpl, navigate }).signIn("http://localhost:3000/");
    const verifier = JSON.parse(localStorage.getItem(`${AUTH_STORAGE_KEY}-code-verifier`)!) as string;

    // Back from Google, in a fresh page with a fresh client.
    window.history.replaceState(null, "", "/?code=returned-code");
    const { fetchImpl, requests } = recordingFetch((request) =>
      request.url.pathname === "/auth/v1/token" ? json(200, sessionFor(ANA)) : empty(404),
    );
    const { user } = await createSupabaseBackend(CONFIG, { fetch: fetchImpl, navigate }).start();

    expect(user).toEqual({ id: ANA, email: "ana@example.test" });
    const exchange = requests.find((r) => r.url.pathname === "/auth/v1/token")!;
    expect(exchange.method).toBe("POST");
    expect(exchange.url.searchParams.get("grant_type")).toBe("pkce");
    expect(exchange.body).toEqual({ auth_code: "returned-code", code_verifier: verifier });
    expect(window.location.search).toBe("");
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!).user.id).toBe(ANA);
  });

  it("recovers a stored session without asking anyone", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch(() => empty(500));
    const { user } = await createSupabaseBackend(CONFIG, { fetch: fetchImpl }).start();
    expect(user?.id).toBe(ANA);
    expect(requests).toEqual([]);
  });

  it("is signed out with nothing stored", async () => {
    const { fetchImpl } = recordingFetch(() => empty(500));
    expect((await createSupabaseBackend(CONFIG, { fetch: fetchImpl }).start()).user).toBeNull();
  });
});

describe("reading the person's rows", () => {
  it("asks for their own rows only, oldest first, as them", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch((request) =>
      request.url.pathname.endsWith("/saved_pieces")
        ? json(200, [
            { piece_id: "pear", saved_at: "2026-10-01T08:00:00+00:00" },
            { piece_id: "bad id!", saved_at: "2026-10-01T08:00:00+00:00" },
          ])
        : json(200, [{ piece_id: "mug", painted_on: "2026-09-14", marked_at: "2026-09-14T09:00:00.123456+00:00" }]),
    );
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    const record = await backend.fetchRecord(ANA);

    expect(record).toEqual({
      saved: [{ id: "pear", at: "2026-10-01T08:00:00.000Z" }],
      painted: [{ id: "mug", on: "2026-09-14", at: "2026-09-14T09:00:00.123Z" }],
    });

    const saved = requests.find((r) => r.url.pathname === "/rest/v1/saved_pieces")!;
    expect(saved.method).toBe("GET");
    expect(saved.url.searchParams.get("select")).toBe("piece_id,saved_at");
    expect(saved.url.searchParams.get("user_id")).toBe(`eq.${ANA}`);
    expect(saved.url.searchParams.get("order")).toBe("saved_at.asc,piece_id.asc");
    expect(saved.url.searchParams.get("offset")).toBe("0");
    expect(saved.url.searchParams.get("limit")).toBe("1000");
    expect(saved.headers.get("apikey")).toBe("sb_publishable_test");
    expect(saved.headers.get("authorization")).toBe(`Bearer ${accessToken(ANA)}`);

    const painted = requests.find((r) => r.url.pathname === "/rest/v1/painted_pieces")!;
    expect(painted.url.searchParams.get("order")).toBe("painted_on.asc,marked_at.asc,piece_id.asc");
  });

  it.each([
    [503, "unavailable"],
    [500, "unavailable"],
    [404, "unavailable"],
    [401, "unauthorised"],
  ] as const)("reports a %i as %s, without retrying behind the service's back", async (status, problem) => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch(() => json(status, { message: "nope", code: "X" }));
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    await expect(backend.fetchRecord(ANA)).rejects.toMatchObject({ problem });
    expect(requests).toHaveLength(2);
  });

  it("reports no connection as offline", async () => {
    storeSession();
    const { fetchImpl } = recordingFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    const failure = await backend.fetchRecord(ANA).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SyncFailure);
    expect(failure).toMatchObject({ problem: "offline" });
  });
});

describe("sending changes", () => {
  const changes: Change[] = [
    { key: "saved:pear", list: "saved", id: "pear", row: { id: "pear", at: "2026-10-02T08:00:00.000Z" } },
    { key: "saved:gone", list: "saved", id: "gone", row: null },
    { key: "painted:mug", list: "painted", id: "mug", row: { id: "mug", on: "2026-10-02", at: "2026-10-02T08:00:01.000Z" } },
    { key: "painted:unmarked", list: "painted", id: "unmarked", row: null },
  ];

  it("upserts and deletes exactly the changed pieces, as the person", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch((request) => empty(request.method === "POST" ? 201 : 204));
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    const result = await backend.push(ANA, changes);

    expect(result).toEqual({ confirmed: ["saved:pear", "saved:gone", "painted:mug", "painted:unmarked"], refused: [], problem: null });

    const upsertSaved = requests.find((r) => r.method === "POST" && r.url.pathname === "/rest/v1/saved_pieces")!;
    expect(upsertSaved.url.searchParams.get("on_conflict")).toBe("user_id,piece_id");
    expect(upsertSaved.headers.get("prefer")).toMatch(/resolution=merge-duplicates/);
    expect(upsertSaved.body).toEqual([{ user_id: ANA, piece_id: "pear", saved_at: "2026-10-02T08:00:00.000Z" }]);

    const deleteSaved = requests.find((r) => r.method === "DELETE" && r.url.pathname === "/rest/v1/saved_pieces")!;
    expect(deleteSaved.url.searchParams.get("user_id")).toBe(`eq.${ANA}`);
    expect(deleteSaved.url.searchParams.get("piece_id")).toBe("in.(gone)");

    const upsertPainted = requests.find((r) => r.method === "POST" && r.url.pathname === "/rest/v1/painted_pieces")!;
    expect(upsertPainted.body).toEqual([
      { user_id: ANA, piece_id: "mug", painted_on: "2026-10-02", marked_at: "2026-10-02T08:00:01.000Z" },
    ]);
    const deletePainted = requests.find((r) => r.method === "DELETE" && r.url.pathname === "/rest/v1/painted_pieces")!;
    expect(deletePainted.url.searchParams.get("piece_id")).toBe("in.(unmarked)");
    expect(requests.every((r) => r.headers.get("authorization") === `Bearer ${accessToken(ANA)}`)).toBe(true);
  });

  it("settles each group on its own and reports the most serious problem", async () => {
    storeSession();
    const { fetchImpl } = recordingFetch((request) => {
      const table = request.url.pathname.split("/").pop();
      if (request.method === "POST" && table === "saved_pieces") return json(400, { code: "23514", message: "check" });
      if (request.method === "DELETE" && table === "saved_pieces") return json(503, { message: "paused" });
      if (request.method === "POST" && table === "painted_pieces") return empty(201);
      throw new TypeError("Failed to fetch");
    });
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    const result = await backend.push(ANA, changes);
    expect(result).toEqual({ confirmed: ["painted:mug"], refused: ["saved:pear"], problem: "offline" });
  });

  it("drops only the row the account refuses, not the whole batch it came in", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch((request) => {
      const rows = request.body as Array<{ piece_id: string }>;
      // Postgres refuses the whole statement if any row breaks a check.
      return rows.some((row) => row.piece_id === "too-many") ? json(400, { code: "23514", message: "limit" }) : empty(201);
    });
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    const result = await backend.push(ANA, [
      { key: "saved:fine", list: "saved", id: "fine", row: { id: "fine", at: "2026-10-02T08:00:00.000Z" } },
      { key: "saved:too-many", list: "saved", id: "too-many", row: { id: "too-many", at: "2026-10-02T08:00:01.000Z" } },
      { key: "saved:also-fine", list: "saved", id: "also-fine", row: { id: "also-fine", at: "2026-10-02T08:00:02.000Z" } },
    ]);
    expect(result).toEqual({ confirmed: ["saved:fine", "saved:also-fine"], refused: ["saved:too-many"], problem: null });
    // The batch, then each row on its own.
    expect(requests.map((r) => (r.body as unknown[]).length)).toEqual([3, 1, 1, 1]);
  });

  it("calls an ended session what it is", async () => {
    storeSession();
    const { fetchImpl } = recordingFetch(() => json(401, { message: "JWT expired", code: "PGRST301" }));
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    expect((await backend.push(ANA, changes.slice(0, 1))).problem).toBe("unauthorised");
  });

  it("splits long deletes, whose ids travel in the address", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch(() => empty(204));
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    const many: Change[] = Array.from({ length: 120 }, (_, index) => ({
      key: `saved:piece-${index}`,
      list: "saved",
      id: `piece-${index}`,
      row: null,
    }));
    const result = await backend.push(ANA, many);
    expect(result.confirmed).toHaveLength(120);
    const deletes = requests.filter((r) => r.method === "DELETE");
    expect(deletes.map((r) => r.url.searchParams.get("piece_id")!.split(",").length)).toEqual([50, 50, 20]);
  });

  it("sends nothing for nothing", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch(() => empty(500));
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    expect(await backend.push(ANA, [])).toEqual({ confirmed: [], refused: [], problem: null });
    expect(requests).toEqual([]);
  });
});

/*
  From the independent review, 02/10/2026, reproduced with this client before
  the fix: an expired access token whose refresh fails for a moment (Auth
  answering 503, or no connection) left supabase-js keeping the session but
  reporting none, so start() said "nobody is signed in" and the app wiped the
  device - its copy, its unsent changes and the session itself. Requests made
  in that state went out with the publishable key as the bearer and came back
  401, which ended the session the same way.
*/
describe("when Auth cannot be reached for a moment", () => {
  // auth-js retries a failed refresh with backoff for up to 30 seconds, so the
  // clock is stepped rather than waited on.
  beforeEach(() => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(NOW_SECONDS * 1000));
  });

  async function until(done: () => boolean, stepMs = 1_000, steps = 300) {
    for (let step = 0; step < steps && !done(); step += 1) await vi.advanceTimersByTimeAsync(stepMs);
    if (!done()) throw new Error("never happened");
  }

  async function settled<T>(promise: Promise<T>): Promise<{ value?: T; error?: unknown }> {
    let outcome: { value?: T; error?: unknown } | null = null;
    promise.then((value) => (outcome = { value }), (error: unknown) => (outcome = { error }));
    await until(() => outcome !== null);
    return outcome!;
  }

  function expiredSession(sub = ANA) {
    const session = sessionFor(sub);
    return { ...session, expires_at: NOW_SECONDS - 600 };
  }

  const authDown = (request: Recorded) =>
    request.url.pathname === "/auth/v1/token" ? new Response("upstream unavailable", { status: 503 }) : empty(204);

  it("reports the account unreachable at start-up, and keeps the session", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(expiredSession()));
    const { fetchImpl } = recordingFetch(authDown);
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    const { error } = await settled(backend.start());
    expect(error).toMatchObject({ problem: "unavailable" });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
  });

  it("sends nothing as an anonymous caller, and says the account was unreachable", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(expiredSession()));
    const { fetchImpl, requests } = recordingFetch(authDown);
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await settled(backend.start());
    const pushed = await settled(
      backend.push(ANA, [
        { key: "saved:pear", list: "saved", id: "pear", row: { id: "pear", at: "2026-10-02T08:00:00.000Z" } },
      ]),
    );
    expect(pushed.value).toEqual({ confirmed: [], refused: [], problem: "unavailable" });
    expect((await settled(backend.fetchRecord(ANA))).error).toMatchObject({ problem: "unavailable" });
    expect((await settled(backend.deleteAccount())).error).toMatchObject({ problem: "unavailable" });
    expect(requests.filter((r) => r.url.pathname.startsWith("/rest/v1/"))).toEqual([]);
  });

  it("calls a session Auth has really ended what it is", async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(expiredSession()));
    const { fetchImpl } = recordingFetch((request) =>
      request.url.pathname === "/auth/v1/token"
        ? json(400, { code: "refresh_token_not_found", message: "Invalid Refresh Token: Refresh Token Not Found" })
        : empty(204),
    );
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    expect((await settled(backend.start())).value?.user).toBeNull();
    const pushed = await settled(
      backend.push(ANA, [
        { key: "saved:pear", list: "saved", id: "pear", row: { id: "pear", at: "2026-10-02T08:00:00.000Z" } },
      ]),
    );
    expect(pushed.value?.problem).toBe("unauthorised");
  });

  it("keeps the studio and its unsent change, then sends it once Auth answers", async () => {
    // The reviewer's experiment E7, with the real client and the real service.
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(expiredSession()));
    saveDevice(localStorage, {
      userId: ANA,
      email: "ana@example.test",
      record: { saved: [], painted: [{ id: "blue-mug", on: "2026-10-01", at: "2026-10-01T19:00:00.000Z" }] },
      pending: ["painted:blue-mug"],
      pulledAt: null,
    });
    let authUp = false;
    const { fetchImpl, requests } = recordingFetch((request) => {
      if (request.url.pathname === "/auth/v1/token") return authUp ? json(200, sessionFor(ANA)) : authDown(request);
      if (request.method === "GET") return json(200, []);
      return empty(201);
    });
    const service = createAccountService({
      config: CONFIG,
      guest: { ...browserGuestStore, forgetSeenLeaves: () => undefined },
      loadBackend: async (config) => createSupabaseBackend(config, { fetch: fetchImpl }),
    });
    service.start();
    await until(() => service.getSnapshot().sync === "failed");
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", pending: 1 });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(DEVICE_KEY)).not.toBeNull();

    authUp = true;
    service.retry();
    await until(() => service.getSnapshot().sync === "idle");
    expect(service.getSnapshot()).toMatchObject({ status: "signed-in", pending: 0 });
    const upsert = requests.find((r) => r.method === "POST" && r.url.pathname === "/rest/v1/painted_pieces")!;
    expect(upsert.body).toEqual([{ user_id: ANA, piece_id: "blue-mug", painted_on: "2026-10-01", marked_at: "2026-10-01T19:00:00.000Z" }]);
    service.stop();
  });
});

describe("a request that never answers", () => {
  it("is given up on after a while, as a failure the service can retry", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(NOW_SECONDS * 1000));
    storeSession();
    const { fetchImpl } = recordingFetch(
      (request) =>
        new Promise<Response>((_, reject) => {
          // Answers only by being abandoned.
          request.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation timed out.", "TimeoutError")),
          );
        }),
    );
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    const reading = backend.fetchRecord(ANA).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await reading).toMatchObject({ problem: "offline" });
  });
});

describe("leaving", () => {
  it("deletes the account through its database function", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch(() => empty(204));
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    await backend.deleteAccount();
    expect(requests.map((r) => `${r.method} ${r.url.pathname}`)).toEqual(["POST /rest/v1/rpc/delete_my_account"]);
  });

  it("says why it could not delete", async () => {
    storeSession();
    const { fetchImpl } = recordingFetch(() => json(500, { message: "boom" }));
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    await backend.start();
    await expect(backend.deleteAccount()).rejects.toMatchObject({ problem: "unavailable" });
  });

  it("signs out this device only, and forgets the session even when the server cannot be reached", async () => {
    storeSession();
    const { fetchImpl, requests } = recordingFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    const backend = createSupabaseBackend(CONFIG, { fetch: fetchImpl });
    const signedOut = vi.fn();
    backend.onSignedOut(signedOut);
    await backend.start();
    await backend.signOut();

    const logout = requests.find((r) => r.url.pathname === "/auth/v1/logout")!;
    expect(logout.url.searchParams.get("scope")).toBe("local");
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(signedOut).toHaveBeenCalled();
  });
});
