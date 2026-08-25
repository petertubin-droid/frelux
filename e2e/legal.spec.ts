import { test, expect } from "@playwright/test";

/**
 * Legal pages smoke tests — verify all required legal pages load
 * and display content.
 */
test.describe("Legal pages", () => {
  const legalPages = [
    { path: "/privacy-policy", heading: "Privacy Policy" },
    { path: "/terms", heading: "Terms" },
    { path: "/cookie-policy", heading: "Cookie" },
    { path: "/disclaimer", heading: "Disclaimer" },
    { path: "/ai-disclaimer", heading: "AI" },
    { path: "/about", heading: "About" },
  ];

  for (const { path, heading } of legalPages) {
    test(`${path} loads with content`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Page should not be blank
      const bodyText = await page.locator("body").textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(50);
      // Should contain the expected heading text
      await expect(
        page.getByText(new RegExp(heading), { exact: false }).first(),
      ).toBeVisible();
    });
  }
});
