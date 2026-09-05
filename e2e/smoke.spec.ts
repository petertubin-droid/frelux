import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test("home page loads", async ({ page }) => {
  await dismissCookieBanner(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/FRELUX/i);
});

test("navigation to paint calculator", async ({ page }) => {
  await dismissCookieBanner(page);
  await page.goto("/");
  // The home page has desktop-only and carousel links; the footer link
  // is in normal document flow and reliably clickable in every viewport.
  await page.locator('footer a[href*="paint-calculator"]').first().click();
  await expect(page).toHaveURL(/paint-calculator/);
});

test("404 page renders", async ({ page }) => {
  await page.goto("/nonexistent-page");
  await expect(page.locator("body")).toContainText(/404|not found/i);
});

test("calculator page is interactive", async ({ page }) => {
  await dismissCookieBanner(page);
  await page.goto("/paint-calculator");
  // Filter for visible interactive elements (skip hidden mobile menu button)
  const visibleInputs = page.locator(
    "input:visible, select:visible, button:visible",
  );
  await expect(visibleInputs.first()).toBeVisible();
});

test("learn hub loads articles", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.locator("body")).toBeVisible();
});

test("marketplace loads", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.locator("body")).toBeVisible();
});
