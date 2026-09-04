import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    launchOptions: {
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        // Disable service workers — they can trigger background network
        // requests that crash the headless shell in sandboxed environments.
        "--disable-features=ServiceWorker,BackgroundFetch,PeriodicBackgroundSync",
        // Block all external network at the browser level.
        //
        // In sandboxed CI environments the system NSS library may be
        // incompatible with Playwright's Chromium headless shell.  When the
        // SPA's JavaScript attempts an HTTPS request (Supabase auth,
        // analytics, etc.) the browser crashes with a SIGTRAP from
        // nss_util.cc.
        //
        // Routing everything through a dead proxy while bypassing localhost
        // ensures external requests fail instantly without touching NSS,
        // while local dev-server requests still work normally.
        "--proxy-server=http://127.0.0.1:0",
        "--proxy-bypass-list=localhost;127.0.0.1",
      ],
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    // CI downloads a prebuilt dist artifact — skip the redundant build.
    command: process.env.CI
      ? "npm run preview"
      : "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
