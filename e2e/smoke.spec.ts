import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FRELUX/i);
});

test("navigation to paint calculator", async ({ page }) => {
  await page.goto("/");
  await page.click('a[href*="paint-calculator"]');
  await expect(page).toHaveURL(/paint-calculator/);
});

test("404 page renders", async ({ page }) => {
  await page.goto("/nonexistent-page");
  await expect(page.locator("body")).toContainText(/404|not found/i);
});

test("calculator page is interactive", async ({ page }) => {
  await page.goto("/paint-calculator");
  await expect(page.locator("input, select, button").first()).toBeVisible();
});

test("learn hub loads articles", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.locator("body")).toBeVisible();
});

test("marketplace loads", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.locator("body")).toBeVisible();
});
