import { createHash, randomUUID } from "node:crypto";
import type { BrowserContext, Route } from "@playwright/test";

/**
 * A small stand-in for Supabase's Auth and REST APIs, answered by Playwright,
 * for the end-to-end build (.env.e2e points it at https://supabase.e2e.test,
 * a host that can never resolve).
 *
 * It plays Google too: `/auth/v1/authorize` signs in whoever the test chose,
 * or reports a cancel, and sends the browser back the way Supabase does. The
 * code exchange checks the PKCE verifier against the challenge for real, and
 * the REST endpoints keep each person's rows from everyone else's, as row
 * level security does. It is a fake, so these journeys are reported as mocked;
 * the same journeys run against a real local stack in e2e-live/ (CI).
 *
 * Measured 02/10/2026: Playwright answers a cross-origin fetch with custom
 * headers here without a separate CORS preflight, but a fulfilled 302 for a
 * navigation fails - so `authorize` answers with a page that redirects.
 */

export const FAKE_SUPABASE = "https://supabase.e2e.test";

export interface FakePerson {
  id: string;
  email: string;
}

interface SavedRow {
  piece_id: string;
  saved_at: string;
}

interface PaintedRow {
  piece_id: string;
  painted_on: string;
  marked_at: string;
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-expose-headers": "content-range",
};

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/** In-list values from a PostgREST filter: `in.(a,b,c)`. */
function inList(filter: string | null): string[] {
  const match = /^in\.\((.*)\)$/.exec(filter ?? "");
  return match ? match[1]!.split(",").filter(Boolean) : [];
}

export class FakeSupabase {
  people = new Map<string, FakePerson>();
  saved = new Map<string, Map<string, SavedRow>>();
  painted = new Map<string, Map<string, PaintedRow>>();
  /** Every request, as "METHOD /path", in order. */
  log: string[] = [];
  /** Every authorize request's parameters, for checking what the app asked for. */
  authorizations: URLSearchParams[] = [];
  /** Who Google signs in next, or "cancel" for someone saying no. */
  google: FakePerson | "cancel" | null = null;

  private codes = new Map<string, { personId: string; challenge: string }>();
  private accessTokens = new Map<string, string>();
  private refreshTokens = new Map<string, string>();

  person(name: string): FakePerson {
    const person = { id: randomUUID(), email: `${name}@example.test` };
    this.people.set(person.id, person);
    this.saved.set(person.id, new Map());
    this.painted.set(person.id, new Map());
    return person;
  }

  savedIds(person: FakePerson): string[] {
    return [...(this.saved.get(person.id)?.values() ?? [])]
      .sort((a, b) => a.saved_at.localeCompare(b.saved_at) || a.piece_id.localeCompare(b.piece_id))
      .map((row) => row.piece_id);
  }

  paintedRows(person: FakePerson): PaintedRow[] {
    return [...(this.painted.get(person.id)?.values() ?? [])].sort((a, b) => a.piece_id.localeCompare(b.piece_id));
  }

  /** A session as supabase-js stores it, for a test that starts signed in. */
  sessionFor(person: FakePerson) {
    const issued = Math.floor(Date.now() / 1000);
    const accessToken = [
      base64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
      base64url(JSON.stringify({ sub: person.id, email: person.email, role: "authenticated", aud: "authenticated", exp: issued + 3600, iat: issued })),
      base64url(randomUUID()),
    ].join(".");
    const refreshToken = randomUUID();
    this.accessTokens.set(accessToken, person.id);
    this.refreshTokens.set(refreshToken, person.id);
    return {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: issued + 3600,
      refresh_token: refreshToken,
      user: {
        id: person.id,
        aud: "authenticated",
        role: "authenticated",
        email: person.email,
        app_metadata: { provider: "google", providers: ["google"] },
        user_metadata: { full_name: person.email.split("@")[0] },
        created_at: new Date().toISOString(),
      },
    };
  }

  async attach(context: BrowserContext): Promise<void> {
    await context.route(`${FAKE_SUPABASE}/**`, (route) => this.handle(route));
  }

  private who(route: Route): string | null {
    const header = route.request().headers()["authorization"] ?? "";
    return this.accessTokens.get(header.replace(/^Bearer /, "")) ?? null;
  }

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  private empty(route: Route, status: number) {
    return route.fulfill({ status, headers: CORS, body: "" });
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    this.log.push(`${method} ${url.pathname}`);
    if (method === "OPTIONS") return this.empty(route, 204);

    if (url.pathname === "/auth/v1/authorize") return this.authorize(route, url);
    if (url.pathname === "/auth/v1/token") return this.token(route, url);
    if (url.pathname === "/auth/v1/logout") {
      const header = request.headers()["authorization"] ?? "";
      this.accessTokens.delete(header.replace(/^Bearer /, ""));
      return this.empty(route, 204);
    }
    if (url.pathname === "/auth/v1/user") {
      const id = this.who(route);
      const person = id ? this.people.get(id) : null;
      return person ? this.json(route, 200, this.sessionFor(person).user) : this.json(route, 401, { code: 401, msg: "invalid JWT" });
    }
    if (url.pathname === "/rest/v1/rpc/delete_my_account") return this.deleteAccount(route);
    if (url.pathname === "/rest/v1/saved_pieces" || url.pathname === "/rest/v1/painted_pieces") {
      return this.rows(route, url, url.pathname.endsWith("saved_pieces") ? "saved" : "painted");
    }
    return this.json(route, 404, { message: `The fake has no ${method} ${url.pathname}` });
  }

  private authorize(route: Route, url: URL) {
    this.authorizations.push(url.searchParams);
    const back = url.searchParams.get("redirect_to")!;
    let target: string;
    if (this.google === "cancel" || this.google === null) {
      const error = "error=access_denied&error_code=access_denied&error_description=The+user+denied+access";
      target = `${back}?${error}#${error}`;
    } else {
      const code = randomUUID();
      this.codes.set(code, { personId: this.google.id, challenge: url.searchParams.get("code_challenge") ?? "" });
      target = `${back}?code=${code}`;
    }
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><title>Google</title><script>location.replace(${JSON.stringify(target)})</script>`,
    });
  }

  private token(route: Route, url: URL) {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, string>;
    if (url.searchParams.get("grant_type") === "pkce") {
      const pending = this.codes.get(body.auth_code ?? "");
      this.codes.delete(body.auth_code ?? "");
      const proof = base64url(createHash("sha256").update(body.code_verifier ?? "").digest());
      if (!pending || proof !== pending.challenge) {
        return this.json(route, 400, { error: "invalid_grant", error_description: "Invalid code or verifier" });
      }
      return this.json(route, 200, this.sessionFor(this.people.get(pending.personId)!));
    }
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const id = this.refreshTokens.get(body.refresh_token ?? "");
      const person = id ? this.people.get(id) : null;
      if (!person) return this.json(route, 400, { error: "invalid_grant", error_description: "Refresh Token Not Found" });
      return this.json(route, 200, this.sessionFor(person));
    }
    return this.json(route, 400, { error: "unsupported_grant_type" });
  }

  private rows(route: Route, url: URL, list: "saved" | "painted") {
    const caller = this.who(route);
    if (!caller) return this.json(route, 401, { code: "42501", message: "permission denied" });
    const table = list === "saved" ? this.saved : this.painted;
    const mine = table.get(caller) ?? new Map();
    const asked = url.searchParams.get("user_id")?.replace(/^eq\./, "");
    const method = route.request().method();

    if (method === "GET") {
      // Row level security: whatever is asked for, only the caller's rows.
      const rows = asked && asked !== caller ? [] : [...mine.values()];
      return this.json(route, 200, rows);
    }
    if (method === "POST") {
      const rows = (route.request().postDataJSON() ?? []) as Array<Record<string, string>>;
      if (rows.some((row) => row.user_id !== caller)) {
        return this.json(route, 403, { code: "42501", message: "new row violates row-level security policy" });
      }
      for (const row of rows) {
        mine.set(row.piece_id!, list === "saved"
          ? { piece_id: row.piece_id!, saved_at: row.saved_at! }
          : { piece_id: row.piece_id!, painted_on: row.painted_on!, marked_at: row.marked_at! });
      }
      table.set(caller, mine);
      return this.empty(route, 201);
    }
    if (method === "DELETE") {
      if (!asked || asked === caller) for (const id of inList(url.searchParams.get("piece_id"))) mine.delete(id);
      return this.empty(route, 204);
    }
    return this.json(route, 405, { message: "method not allowed" });
  }

  private deleteAccount(route: Route) {
    const caller = this.who(route);
    if (!caller) return this.json(route, 401, { code: "42501", message: "permission denied" });
    this.people.delete(caller);
    this.saved.delete(caller);
    this.painted.delete(caller);
    for (const [token, id] of this.refreshTokens) if (id === caller) this.refreshTokens.delete(token);
    return this.empty(route, 204);
  }
}
