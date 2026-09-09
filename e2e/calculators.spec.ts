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

    // Scope to the calculator card link, not the bare text: the hub now has
    // a decorative auto-sliding marquee above the grid that also renders
    // "Painting Calculator". getByText(...).first() matches that marquee
    // copy, which never reaches a stable position, so the click times out.
    // The marquee is aria-hidden and not a link, so a role-based locator
    // scoped to the tools grid targets the real card.
    await page
      .getByRole("region", { name: "Calculator tools" })
      .getByRole("link", { name: /Painting Calculator/ })
      .click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/paint-calculator");
  });
});
