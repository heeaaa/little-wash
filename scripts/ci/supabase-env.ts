/**
 * `supabase status -o json` -> the environment the backend checks and the live
 * journeys read (integration/env.ts), one NAME=value per line for $GITHUB_ENV.
 *
 *   supabase status -o json | npx tsx scripts/ci/supabase-env.ts >> "$GITHUB_ENV"
 *
 * Newer CLIs name the keys PUBLISHABLE_KEY and SECRET_KEY, older ones ANON_KEY
 * and SERVICE_ROLE_KEY; either works locally. These are the local stack's
 * fixed demo values, printed in every Supabase CLI's docs - not secrets.
 */

import { readFileSync } from "node:fs";

const status = JSON.parse(readFileSync(0, "utf8")) as Record<string, string | undefined>;
const pick = (...names: string[]) => names.map((name) => status[name]).find((value) => Boolean(value));

const url = pick("API_URL");
const publishableKey = pick("PUBLISHABLE_KEY", "ANON_KEY");
const secretKey = pick("SECRET_KEY", "SERVICE_ROLE_KEY");

if (!url || !publishableKey || !secretKey) {
  console.error(`supabase status lacked an API URL or keys. It had: ${Object.keys(status).join(", ")}`);
  process.exit(1);
}

console.log(`SUPABASE_URL=${url}`);
console.log(`SUPABASE_PUBLISHABLE_KEY=${publishableKey}`);
console.log(`SUPABASE_SECRET_KEY=${secretKey}`);
