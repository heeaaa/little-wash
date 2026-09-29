/**
 * The provider registry.
 *
 * Adding a source is one file in providers/ and one line here. Nothing in the
 * application changes: the app reads a built catalogue and a display registry
 * (src/lib/sources/registry.ts), never this.
 */

import { met } from "./providers/met.ts";
import { pexels } from "./providers/pexels.ts";
import { unsplash } from "./providers/unsplash.ts";
import type { HarvestContext, SourceId, SourceProvider } from "./types.ts";

export const PROVIDERS: Partial<Record<SourceId, SourceProvider>> = {
  pexels,
  unsplash,
  met,
};

export function getProvider(id: string): SourceProvider {
  const provider = PROVIDERS[id as SourceId];
  if (!provider) {
    throw new Error(
      `Unknown source "${id}". Available: ${Object.keys(PROVIDERS).join(", ")}`,
    );
  }
  return provider;
}

/** The real context: live fetch, process env, the wall clock. */
export function liveContext(): HarvestContext {
  return {
    fetch: globalThis.fetch,
    env: process.env,
    now: () => new Date(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

/**
 * Providers whose key is present. Used to skip integration checks with a clear
 * reason rather than failing them, since CI deliberately holds no secrets.
 */
export function configuredProviders(
  env: Record<string, string | undefined> = process.env,
): SourceProvider[] {
  return Object.values(PROVIDERS).filter(
    (p): p is SourceProvider => !p.keyEnvVar || Boolean(env[p.keyEnvVar]),
  );
}
