import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4180);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CI = !!process.env.CI;

/**
 * Account journeys against a REAL local Supabase stack (`npm run test:e2e:live`).
 *
 * The build is the e2e build with its account address overridden from the
 * environment, so the browser talks to the local stack's real Auth and REST
 * API, and the database's real rules. People sign in with a password made
 * through the admin API - Google cannot be driven here - and the session is
 * handed to the page as supabase-js would have stored it. CI runs this in the
 * "Accounts against a local Supabase" job; see e2e-live/ for what it covers.
 *
 * One project, one worker: these share one stack, and the phone is the scene
 * the product is designed for. The mocked journeys (e2e/account.spec.ts) run
 * at every size.
 */
export default defineConfig({
  testDir: "./e2e-live",
  outputDir: "./test-results-live",
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  // As the main suite: no retries, so flakiness shows.
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-live" }], ["github"]]
    : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: { mode: "retain-on-failure", screenshots: false },
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
