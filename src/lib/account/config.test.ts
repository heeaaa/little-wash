import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_CONFIG, readAccountConfig } from "./config";
import { isSecretKey, variablesHoldingSecrets } from "./secrets";

/** A JWT-shaped string with this payload. Only the payload matters here. */
function token(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("account configuration", () => {
  it("is absent in the unit suite, which reads no .env (vitest.config.ts)", () => {
    expect(ACCOUNT_CONFIG).toBeNull();
  });

  it("needs both the address and the key", () => {
    expect(readAccountConfig({})).toBeNull();
    expect(readAccountConfig({ VITE_SUPABASE_URL: "https://abc.supabase.co" })).toBeNull();
    expect(readAccountConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" })).toBeNull();
    expect(readAccountConfig({ VITE_SUPABASE_URL: "  ", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" })).toBeNull();
  });

  it("reads a hosted project, keeping the origin and the host Google will name", () => {
    expect(
      readAccountConfig({
        VITE_SUPABASE_URL: " https://dbbjvtbaljprmfhmxdmr.supabase.co/ ",
        VITE_SUPABASE_PUBLISHABLE_KEY: " sb_publishable_abc ",
      }),
    ).toEqual({
      url: "https://dbbjvtbaljprmfhmxdmr.supabase.co",
      publishableKey: "sb_publishable_abc",
      host: "dbbjvtbaljprmfhmxdmr.supabase.co",
    });
  });

  it("allows plain http only to a local stack", () => {
    const key = { VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local" };
    expect(readAccountConfig({ ...key, VITE_SUPABASE_URL: "http://127.0.0.1:54321" })?.host).toBe("127.0.0.1:54321");
    expect(readAccountConfig({ ...key, VITE_SUPABASE_URL: "http://localhost:54321" })?.url).toBe("http://localhost:54321");
    expect(readAccountConfig({ ...key, VITE_SUPABASE_URL: "http://abc.supabase.co" })).toBeNull();
    expect(readAccountConfig({ ...key, VITE_SUPABASE_URL: "ftp://abc.supabase.co" })).toBeNull();
  });

  it("refuses an address that is not just an origin", () => {
    const key = { VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" };
    for (const url of [
      "https://abc.supabase.co/rest/v1",
      "https://abc.supabase.co/?x=1",
      "https://abc.supabase.co/#x",
      "https://user:pass@abc.supabase.co",
      "not a url",
    ]) {
      expect(readAccountConfig({ ...key, VITE_SUPABASE_URL: url })).toBeNull();
    }
  });

  it("refuses a key with whitespace in it", () => {
    expect(
      readAccountConfig({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable x" }),
    ).toBeNull();
  });

  it("refuses a secret key outright, and says so", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const key of ["sb_secret_abc", token({ role: "service_role" })]) {
      expect(readAccountConfig({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: key })).toBeNull();
    }
    expect(error).toHaveBeenCalledTimes(2);
    expect(String(error.mock.calls[0]![0])).toMatch(/secret key/);
  });

  it("accepts the local stack's legacy anon token", () => {
    expect(
      readAccountConfig({
        VITE_SUPABASE_URL: "http://127.0.0.1:54321",
        VITE_SUPABASE_PUBLISHABLE_KEY: token({ role: "anon", iss: "supabase-demo" }),
      }),
    ).not.toBeNull();
  });
});

describe("recognising secret keys", () => {
  it("knows Supabase's secret keys and service tokens", () => {
    // Shaped like a real key, but built here: the source never holds a
    // key-shaped string for secret scanning to flag.
    const realShaped = ["sb", "secret", `${"Q7".repeat(11)}-${"w".repeat(8)}`].join("_");
    expect(isSecretKey(realShaped)).toBe(true);
    expect(isSecretKey(` ${token({ role: "service_role" })} `)).toBe(true);
    expect(isSecretKey(token({ role: "supabase_admin" }))).toBe(true);
  });

  it("does not mistake public keys or junk for secrets", () => {
    expect(isSecretKey("sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH")).toBe(false);
    expect(isSecretKey(token({ role: "anon" }))).toBe(false);
    expect(isSecretKey(token({ sub: "x" }))).toBe(false);
    expect(isSecretKey("a.b")).toBe(false);
    expect(isSecretKey("a.%%%.c")).toBe(false);
    expect(isSecretKey("")).toBe(false);
  });

  it("names every VITE_ variable holding one, for the build to refuse", () => {
    expect(
      variablesHoldingSecrets({
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_oops",
        VITE_SUPABASE_URL: "https://abc.supabase.co",
        VITE_OTHER: token({ role: "service_role" }),
        // Not a browser variable, so not the build's business.
        SUPABASE_SECRET_KEY: "sb_secret_fine_here",
        VITE_EMPTY: undefined,
      }),
    ).toEqual(["VITE_OTHER", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  });
});
