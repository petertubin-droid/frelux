import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

/**
 * Home page smoke tests — verify the landing page loads, has correct
 * branding, and key navigation links work.
 */
test.describe("Home page", () => {
  test("loads and shows FRELUX branding", async ({ page }) => {
    await dismissCookieBanner(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/FRELUX/);
    await expect(
      page.locator('a[aria-label="FRELUX PROJECT CALC home"]'),
    ).toBeVisible();
  });

  test("navigates to the calculators page", async ({ page }) => {
    await dismissCookieBanner(page);
    await page.goto("/");
    const calcLink = page.locator('footer a[href*="paint-calculator"]').first();
    await calcLink.click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/paint-calculator");
  });

  test("has no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const realErrors = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("placeholder"),
    );
    expect(realErrors).toHaveLength(0);
  });
});
