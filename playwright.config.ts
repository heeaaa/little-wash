import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4180);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CI = !!process.env.CI;

/**
 * End-to-end journeys for Little Wash.
 *
 * Runs against the production build, not the dev server: these journeys guard
 * shipped behaviour, and a Vite dev bundle is not what anyone uses.
 *
 * Data is isolated per test by construction - every Playwright test gets a
 * fresh browser context, so `localStorage` (the only store this prototype has)
 * starts empty. Tests that need saved pieces seed them through
 * `seedFavourites` in `e2e/support.ts` rather than by clicking through the UI.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",

  fullyParallel: true,
  forbidOnly: CI,
  workers: CI ? 2 : undefined,

  /*
    No retries, deliberately. A retry that turns a flaky failure into a green
    run hides exactly the thing CI exists to surface; if a journey here is
    unreliable, the suite should say so and we fix the test or the app.
  */
  retries: 0,

  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    // Kept on the first failure only, so a red run is diagnosable without
    // every green run writing a trace nobody opens.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      /* The scene PRODUCT.md describes: a phone, one hand, beside a sketchbook. */
      name: "phone",
      use: { ...devices["Pixel 7"] },
    },
    {
      /* The propped-on-a-stand posture, which this app has had to fix twice. */
      name: "phone-landscape",
      use: { ...devices["Pixel 7 landscape"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: {
    // `npm run preview` serves `dist/`, so the build has to exist first; the
    // e2e script builds before calling Playwright.
    // Bind explicitly: `vite preview` defaults to `localhost`, which does not
    // always resolve to the address Playwright polls.
    command: `npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
