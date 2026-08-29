import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

/**
 * Calculators index page — verifies all calculator tools are listed
 * and navigable.
 */
test.describe("Calculators page", () => {
  test("lists all core calculator tools", async ({ page }) => {
    await dismissCookieBanner(page);
    await page.goto("/calculators");
    await page.waitForLoadState("networkidle");

    const expectedTools = [
      "Painting Calculator",
      "Screeding Calculator",
      "POP Ceiling Calculator",
      "Tile Calculator",
      "Finishing Calculator",
      "Build-to-Roof Estimator",
    ];

    for (const tool of expectedTools) {
      await expect(page.getByText(tool).first()).toBeVisible();
    }
  });

  test("navigates to the painting calculator", async ({ page }) => {
    await dismissCookieBanner(page);
    await page.goto("/calculators");
    await page.waitForLoadState("networkidle");

    await page.getByText("Painting Calculator").first().click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/paint-calculator");
  });
});
