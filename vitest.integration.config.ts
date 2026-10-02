import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * The backend checks: the real migrations, the real Auth and the real REST
 * API of a local Supabase stack, reached the way the browser reaches them.
 *
 * They need the stack running (`npx supabase@2.119.0 start`, which needs
 * Docker) and its address and keys in the environment - see integration/env.ts
 * for the names. CI's "Accounts against a local Supabase" job does both. With
 * no stack the suite fails and says why: a skip is not a pass.
 *
 * The live catalogue-provider checks that used to live under this name are
 * `npm run test:providers` now (vitest.providers.config.ts).
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // Like the unit suite, never a developer's own .env.
  envDir: path.resolve(__dirname, "./src/test/env"),
  test: {
    globals: true,
    environment: "node",
    include: ["integration/**/*.test.ts"],
    // One stack, shared: users are created per test with unique emails, but
    // the files run one after another so their logs read in order.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
