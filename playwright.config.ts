import { defineConfig, devices } from "@playwright/test";

/**
 * FRELUX E2E smoke test configuration.
 * Runs against a local production build (`npm run build && npm run preview`)
 * so tests exercise the same static output that ships to Netlify/Vercel.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run preview -- --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
