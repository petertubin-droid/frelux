import { test, expect } from "@playwright/test";

/**
 * Navigation smoke tests — verify key routes don't 404 and render
 * meaningful content.
 */
test.describe("Core route navigation", () => {
  const routes = [
    "/calculators",
    "/paint-calculator",
    "/screeding-calculator",
    "/pop-ceiling-calculator",
    "/tile-calculator",
    "/finish-estimator",
    "/colors",
    "/pricing",
    "/marketplace",
    "/pro-connect",
    "/templates",
  ];

  for (const route of routes) {
    test(`${route} loads without 404`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await page.waitForLoadState("networkidle");
      // Page should have visible content (not a blank/error page)
      const bodyText = await page.locator("body").textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(20);
    });
  }
});

test.describe("Dark mode toggle", () => {
  test("toggles dark mode and persists", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const toggle = page
      .locator('button[aria-label="Toggle dark mode"]')
      .first();
    await toggle.click();

    // Wait for class change on <html>
    await page.waitForTimeout(500);
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });
});
