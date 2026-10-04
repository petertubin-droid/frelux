import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

/**
 * /calculators is now a permanent redirect to /construction-tools
 * (commit 92034e88 — "unified tool library replacing the
 * Calculators/Estimators split"). These specs verify the legacy URL
 * still lands on the tool library, that the core finish calculators
 * are listed there, and that the paint calculator is navigable.
 */
test.describe("Calculators legacy route", () => {
  test("redirects to the unified tool library and lists core calculators", async ({
    page,
  }) => {
    await dismissCookieBanner(page);
    await page.goto("/calculators");
    await page.waitForLoadState("networkidle");

    // The legacy URL must redirect to the unified tool library.
    expect(page.url()).toContain("/construction-tools");

    // Card titles from the CONSTRUCTION_TOOLS registry (finishes group).
    const expectedTools = [
      "Paint Calculator",
      "Wall Screeding",
      "Tile Calculator",
      "Build-to-Roof Estimator",
    ];

    for (const tool of expectedTools) {
      await expect(
        page.getByRole("link", { name: new RegExp(tool) }).first(),
      ).toBeVisible();
    }
  });

  test("navigates to the paint calculator", async ({ page }) => {
    await dismissCookieBanner(page);
    await page.goto("/construction-tools");
    await page.waitForLoadState("networkidle");

    // Scope to the finishes category section ("Materials & Finishes") so
    // the locator targets the real card link. The search input is an
    // input, not a link, and a fresh browser context has no
    // "Recently used" chips that could duplicate the title.
    await page
      .getByRole("region", { name: "Materials & Finishes" })
      .getByRole("link", { name: /Paint Calculator/ })
      .click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/paint-calculator");
  });
});
