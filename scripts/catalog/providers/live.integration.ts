/**
 * Schema-drift checks against the live provider APIs.
 *
 *   npm run test:integration
 *
 * The unit suite proves each adapter against a payload captured on 20/09/2026.
 * That is the right default - deterministic, offline, no secrets in CI - but it
 * cannot tell you a provider changed its response since. This can.
 *
 * A provider whose key is absent is skipped with its reason printed, rather
 * than failed: CI deliberately holds no credentials, and a skipped check that
 * says why is honest where a green one would not be.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { getProvider, liveContext } from "../provider.ts";

// The CLIs load .env themselves; a test run has not.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf-8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match?.[1] && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

function reason(id: string): string | null {
  const provider = getProvider(id);
  if (provider.keyEnvVar && !process.env[provider.keyEnvVar]) {
    return `${provider.keyEnvVar} is not set`;
  }
  return null;
}

for (const [id, query] of [
  ["pexels", { query: "single pear", perPage: 3 }],
  ["unsplash", { query: "single pear", perPage: 3 }],
  ["met", { query: "pear", perPage: 3 }],
] as const) {
  const skip = reason(id);

  describe.skipIf(skip !== null)(`${id} (live)`, () => {
    it(`still returns the shape ${id}'s adapter expects`, async () => {
      const candidates = await getProvider(id).harvest(query, liveContext());

      expect(candidates.length).toBeGreaterThan(0);
      for (const candidate of candidates) {
        expect(candidate.sourceId).toBe(id);
        expect(candidate.externalId).toBeTruthy();
        expect(candidate.objectUrl).toMatch(/^https:\/\//);
        expect(candidate.imageUrl).toMatch(/^https:\/\//);
        expect(candidate.licenceId).toBeTruthy();
        expect(candidate.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  if (skip) {
    // eslint-disable-next-line no-console
    console.log(`SKIPPED ${id} live check: ${skip}. This is not a pass.`);
  }
}
