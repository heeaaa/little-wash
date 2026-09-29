/**
 * Read .env without a dependency.
 *
 * Node's --env-file would do, but its behaviour when the file is absent has
 * varied between versions, and an ingestion script that dies because nobody
 * has made a .env yet is a bad first experience. Missing file, missing key:
 * both are reported by the provider that needs them.
 */

import { existsSync, readFileSync } from "node:fs";

export function loadEnv(path = ".env"): void {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    // Never override something already exported in the shell.
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

/** Minimal --flag=value parsing. */
export function args(argv = process.argv.slice(2)): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (match) out[match[1]!] = match[2] ?? "true";
  }
  return out;
}
