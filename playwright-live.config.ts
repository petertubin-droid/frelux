import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  reporters: [["line"]],
  use: { ...devices["Pixel 5"], baseURL: "https://freluxtools.com" },
  projects: [{ name: "mobile-live", use: { ...devices["Pixel 5"] } }],
});
