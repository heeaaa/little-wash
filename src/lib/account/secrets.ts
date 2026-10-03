/**
 * Recognising keys that must never reach a browser.
 *
 * Supabase's secret keys (`sb_secret_...`) and legacy `service_role` tokens
 * bypass row level security entirely. Anything in a VITE_ variable is written
 * into the site's JavaScript, so one of these there is a published master key.
 * Used twice: by vite.config.ts, which refuses to build, and by config.ts,
 * which refuses to use one if a build somehow carries it.
 *
 * No `import.meta` here, so Node can load it for the build guard.
 */

/** `atob` exists in every browser and in Node 16+, where the build guard runs. */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
}

export function isSecretKey(value: string): boolean {
  const key = value.trim();
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]!)) as { role?: unknown };
    return payload.role === "service_role" || payload.role === "supabase_admin";
  } catch {
    return false;
  }
}

/** The names of any variables holding a secret key, for the build to refuse. */
export function variablesHoldingSecrets(env: Record<string, string | undefined>): string[] {
  return Object.entries(env)
    .filter(([name, value]) => name.startsWith("VITE_") && typeof value === "string" && isSecretKey(value))
    .map(([name]) => name)
    .sort();
}
