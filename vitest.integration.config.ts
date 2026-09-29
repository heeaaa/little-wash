import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Live-API checks, kept apart from the routine suite.
 *
 * The unit tests run each provider's `normalise` against payloads captured in
 * catalog/fixtures/, which is deterministic and needs no keys - but a
 * committed fixture cannot notice that a provider changed its response last
 * week. These hit the real APIs to catch exactly that.
 *
 * Never on pull requests: they need credentials, they are slow, and a provider
 * having a bad afternoon must not turn someone's PR red.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    globals: true,
    environment: "node",
    include: ["scripts/**/*.integration.ts"],
    // Third-party endpoints over a real network.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
