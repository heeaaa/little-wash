import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  /*
    No .env reaches the unit suite. A developer's own .env may point at the
    real Supabase project (docs/deploying-accounts.md, "Local development"),
    and a test that quietly became a signed-in app would be testing whatever
    that file says. This directory holds no .env files, so `import.meta.env`
    carries no VITE_SUPABASE_ values here and accounts are simply unavailable
    unless a test configures them itself.
  */
  envDir: path.resolve(__dirname, "./src/test/env"),
  test: {
    globals: true,
    environment: "jsdom",
    // Unit and component tests only. `e2e/` holds Playwright specs, which share
    // the `.spec.ts` suffix and must not be collected here. `supabase/pglite/`
    // runs the real migrations on Postgres in WebAssembly.
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "supabase/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      /*
        Substantive code only, and no hiding behind exclusions: screens and
        components count too. What is left out is genuinely not logic - the
        bootstrap, static catalogue data, and the tests themselves.
      */
      include: ["src/**/*.{ts,tsx}", "scripts/catalog/**/*.ts"],
      exclude: [
        "src/main.tsx",
        // Bootstrap too: stylesheet imports and nothing else. The fonts are
        // tested where they can be, in a browser (e2e/fonts.spec.ts).
        "src/fonts.ts",
        "src/data/**",
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "src/vite-env.d.ts",
        /*
          Declarations only - interfaces and type aliases that compile away to
          nothing, so v8 instruments an empty module and reports 0%. Excluded
          on the same grounds as vite-env.d.ts, not to hide logic: any runtime
          value in the sources layer lives in registry.ts, attribution.ts,
          images.ts or preferences, all of which are held to the gate below.
        */
        "src/lib/sources/types.ts",
        // Same grounds: the pipeline's shared shapes compile away to nothing.
        "scripts/catalog/types.ts",
        // CLI entry points - argument parsing and file IO around the tested
        // pure functions. Exercised by running them, not by unit tests.
        "scripts/catalog/cli/**",
      ],
      /*
        Set just below what the suite actually achieves, so they ratchet rather
        than rubber-stamp: a real drop fails the build, and raising them is a
        deliberate act. Measured at the time of writing: 94.88 statements,
        89.44 branches, 88.54 functions, 94.88 lines overall.
      */
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 85,
        lines: 90,
        // Domain logic carries the selection, daily-pick and persistence rules,
        // so it is held higher than the app as a whole (98.23 / 90.32 / 100).
        "src/lib/**": {
          statements: 95,
          branches: 88,
          functions: 95,
          lines: 95,
        },
        /*
          New domain logic starts at 80, per the project's floor for a new
          module. The parts that matter - each provider's normalise, the
          shortlist heuristics and the licence gates - are tested against real
          API payloads captured in catalog/fixtures/.
        */
        "scripts/catalog/**": {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
