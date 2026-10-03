/**
 * Whether accounts are available in this build, and where they live.
 *
 * Two build-time values, set in Netlify (docs/deploying-accounts.md, step 5):
 * the Supabase project's address and its publishable key. Both are public by
 * design - row level security in the database is what protects people's
 * pieces, not the key. Missing values are not an error: local development, CI
 * unit runs and a fork without its own project simply have no sign-in, and the
 * app is exactly the guest app it was before accounts existed.
 */

import { isSecretKey } from "./secrets";

export interface AccountConfig {
  /** The project's API origin, e.g. https://abcdefghijklmnopqrst.supabase.co */
  url: string;
  /** The publishable key (or, on a local stack, its legacy anon key). Public. */
  publishableKey: string;
  /**
   * The host Google names on its consent screen: "to continue to <host>".
   * Shown in the sign-in sheet so the screen that follows is not a surprise.
   */
  host: string;
}

export interface AccountEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

/** Hosts where plain http is acceptable: a local Supabase stack. */
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * The account configuration, or null when this build has no accounts.
 *
 * Refuses anything malformed rather than half-working: a URL that is not an
 * origin, plain http to anywhere but a local stack, or a secret key - which
 * would mean the key is already public, so the right response is to stop and
 * say so, not to carry on and use it.
 */
export function readAccountConfig(env: AccountEnv): AccountConfig | null {
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!rawUrl || !key) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const secure = url.protocol === "https:";
  const local = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (!secure && !local) return null;
  if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) return null;
  if (url.username || url.password) return null;

  if (/\s/.test(key)) return null;
  if (isSecretKey(key)) {
    console.error(
      "little wash: VITE_SUPABASE_PUBLISHABLE_KEY holds a secret key. Sign-in is off. " +
        "Rotate that key in Supabase now: it is in this build's JavaScript.",
    );
    return null;
  }

  return { url: url.origin, publishableKey: key, host: url.host };
}

/** This build's configuration, read from Vite's environment once. */
export const ACCOUNT_CONFIG: AccountConfig | null = readAccountConfig(import.meta.env);
