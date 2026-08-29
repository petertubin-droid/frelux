/**
 * E2E test helpers for the FRELUX app.
 */

/**
 * Pre-set localStorage flags so the cookie banner and onboarding tour
 * don't appear and intercept clicks during tests.
 *
 * - `frelux_cookie_consent` — prevents the CookieBanner overlay
 * - `frelux_onboarding_complete` — prevents the OnboardingTour overlay
 */
export async function dismissCookieBanner(
  page: import("@playwright/test").Page,
): Promise<void> {
  const consent = {
    version: 2,
    categories: { essential: true, analytics: false, advertising: false },
    timestamp: Date.now(),
    source: "banner",
  };
  await page.addInitScript((c) => {
    localStorage.setItem("frelux_cookie_consent", JSON.stringify(c));
    localStorage.setItem("frelux_onboarding_complete", "true");
  }, consent);
}
