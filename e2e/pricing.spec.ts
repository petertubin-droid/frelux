import { test, expect } from "@playwright/test";

/**
 * Pricing page — verifies all four subscription tiers render with
 * correct Naira pricing and feature lists.
 */
/**
 * The price list a visitor sees is a location fact: the browser's country
 * picks it, and a saved country choice only counts when the browser offers
 * no signal. CI's default locale reads as the United States, so the shared
 * block below checks the dollar list and the Nigerian locale block checks
 * the naira list.
 */
const CONSENT = {
  categories: { essential: true, analytics: true, advertising: true },
  timestamp: Date.now(),
  source: "banner",
};

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((consent) => {
      try {
        localStorage.setItem("frelux_cookie_consent", JSON.stringify(consent));
      } catch {
        /* storage unavailable before consent */
      }
    }, CONSENT);
  });

  test("displays all four pricing tiers", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Free").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();
    await expect(page.getByText("Premium").first()).toBeVisible();
    await expect(page.getByText("Enterprise").first()).toBeVisible();
  });

  test("shows the dollar list where no local list applies", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Pro monthly $4.99 and Premium monthly $9.99 are the canonical anchors.
    await expect(page.getByText(/4\.99/).first()).toBeVisible();
    await expect(page.getByText(/9\.99/).first()).toBeVisible();
  });

  test("displays plan badges and CTAs", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Most Popular")).toBeVisible();
    await expect(page.getByText("Get Started").first()).toBeVisible();
    await expect(page.getByText("Start Enterprise").first()).toBeVisible();
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

/**
 * The naira list belongs to Nigerian visitors. The browser locale is the
 * location signal the app reads, so this block declares one instead of
 * stretching the daily-usage default.
 */
test.describe("Nigerian price list", () => {
  test.use({ locale: "en-NG", timezoneId: "Africa/Lagos" });

  test("shows naira pricing for a Nigerian visitor", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // ₦5,000 for Pro monthly
    await expect(page.getByText(/5,000/).first()).toBeVisible();
    // ₦15,000 for Premium monthly
    await expect(page.getByText(/15,000/).first()).toBeVisible();
  });
});
