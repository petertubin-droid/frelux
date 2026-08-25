import { test, expect } from "@playwright/test";

/**
 * Home page smoke tests — verify the landing page loads, has correct
 * branding, and key navigation links work.
 */
test.describe("Home page", () => {
  test("loads and shows FRELUX branding", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/FRELUX PAINT CALC/);
    // The navbar logo link should be present
    await expect(
      page.locator('a[aria-label="FRELUX PAINT CALC home"]'),
    ).toBeVisible();
  });

  test("navigates to the calculators page", async ({ page }) => {
    await page.goto("/");
    // Click the "Start Building" / CTA link to paint calculator
    const calcLink = page.locator('a[href*="paint-calculator"]').first();
    await calcLink.click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/paint-calculator");
  });

  test("has no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Filter out expected Supabase placeholder warnings
    const realErrors = errors.filter(
      (e) => !e.includes("supabase") && !e.includes("placeholder"),
    );
    expect(realErrors).toHaveLength(0);
  });
});
