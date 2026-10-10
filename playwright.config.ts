import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the running app.
 *
 * Reuses a dev server already on :3000 (the Google OAuth redirect URI is
 * registered for that port), and starts one otherwise.
 *
 * These write to the database in MONGODB_URI — every record they create is
 * named "E2E …" and deleted by the test that made it. Point MONGODB_URI at a
 * development database, never production.
 */

// Playwright does not read .env files; the admin session helper needs
// AUTH_SECRET from here.
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI provides the variables directly.
}

// Rate limits are per IP, and locally every request shares one. A fresh
// documentation-range address per run keeps one run's submissions from
// exhausting the next run's allowance. Only honoured because nothing sits in
// front of the dev server — on Vercel the proxy overwrites this header.
const runIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;

export default defineConfig({
  testDir: "./e2e",
  // One worker: the tests share a database and some read what others wrote.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: { "x-forwarded-for": runIp },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
