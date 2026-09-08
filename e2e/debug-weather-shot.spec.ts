import { test } from "@playwright/test";

test("capture weather widget", async ({ page }) => {
  test.setTimeout(60000);
  const CONSENT = {
    version: 2,
    categories: { essential: true, analytics: true, advertising: true },
    timestamp: Date.now(),
    source: "banner",
  };
  await page.addInitScript((c) => {
    try {
      localStorage.setItem("frelux_cookie_consent", JSON.stringify(c));
      localStorage.setItem("frelux_weather_location", JSON.stringify("kano"));
    } catch {}
  }, CONSENT);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const widget = page
    .locator("h3:has-text('Best Days to Paint')")
    .locator("xpath=ancestor::div[contains(@class,'card')][1]");
  await widget.waitFor({ timeout: 25000 });
  await widget.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await widget.screenshot({ path: "test-results/weather-widget-only.png" });
});
