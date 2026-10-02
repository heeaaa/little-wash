/**
 * Where the local Supabase stack is, from the environment.
 *
 * CI's backend job sets these from `supabase status -o json` after
 * `supabase start`. Locally, with Docker:
 *
 *   npx supabase@2.119.0 start
 *   npx supabase@2.119.0 status -o env     # API_URL, PUBLISHABLE_KEY, SECRET_KEY
 *
 * then export SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY
 * from those. The local stack's keys are fixed public demo values, not
 * secrets - but never point these at a real project: the tests create and
 * delete users.
 */

export interface IntegrationEnv {
  url: string;
  publishableKey: string;
  /** Admin access, to create test users. The local stack's demo key only. */
  secretKey: string;
}

export function integrationEnv(): IntegrationEnv {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) {
    throw new Error(
      "The backend checks need a local Supabase stack: set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and " +
        "SUPABASE_SECRET_KEY (see integration/env.ts). They are not skipped without one - a skip is not a pass.",
    );
  }
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing to run the backend checks against ${host}: they create and delete users. Local stack only.`);
  }
  return { url, publishableKey, secretKey };
}

/** A session store for Node, which has no localStorage. */
export function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}
