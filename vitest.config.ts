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
  test: {
    globals: true,
    environment: "jsdom",
    // Unit and component tests only. `e2e/` holds Playwright specs, which share
    // the `.spec.ts` suffix and must not be collected here.
    include: ["src/**/*.test.{ts,tsx}"],
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
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/data/**",
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "src/vite-env.d.ts",
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
      },
    },
  },
});
