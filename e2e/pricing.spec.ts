import { test, expect } from "@playwright/test";

/**
 * Pricing page — verifies all four subscription tiers render with
 * correct Naira pricing and feature lists.
 */
test.describe("Pricing page", () => {
  test("displays all four pricing tiers", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Free").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();
    await expect(page.getByText("Premium").first()).toBeVisible();
    await expect(page.getByText("Enterprise").first()).toBeVisible();
  });

  test("shows Naira currency formatting", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // ₦5,000 for Pro monthly
    await expect(page.getByText(/5,000/).first()).toBeVisible();
    // ₦15,000 for Premium monthly
    await expect(page.getByText(/15,000/).first()).toBeVisible();
  });

  test("displays plan badges and CTAs", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Most Popular")).toBeVisible();
    await expect(page.getByText("Get Started").first()).toBeVisible();
    await expect(page.getByText("Contact Sales").first()).toBeVisible();
  });

  test("lists features for each plan", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Free plan features
    await expect(page.getByText("Paint Calculator").first()).toBeVisible();
    // Pro plan features
    await expect(page.getByText("AI Photo Estimations").first()).toBeVisible();
    // Premium plan features
    await expect(
      page.getByText("Structural Load Calculator").first(),
    ).toBeVisible();
    // Enterprise plan features
    await expect(
      page.getByText("Multi-seat team accounts").first(),
    ).toBeVisible();
  });
});
