import { test } from "@playwright/test";

test("weather location selector works on mobile", async ({ page }) => {
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
    } catch {
      /* localStorage unavailable pre-consent — best-effort only */
    }
  }, CONSENT);

  // 1. Home page widget
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h3:has-text('Best Days to Paint')", {
    timeout: 25000,
  });
  const select = page.locator("select[aria-label*='state' i]").first();
  await select.waitFor({ timeout: 10000 });
  console.log("select visible, default =", await select.inputValue());

  // change to Kano
  await select.selectOption("kano");
  await page.waitForTimeout(1200);
  const stored = await page.evaluate(() =>
    localStorage.getItem("frelux_weather_location"),
  );
  console.log("stored after change:", stored);
  await page.screenshot({
    path: "test-results/weather-home-kano.png",
    fullPage: false,
  });

  // overflow check
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  console.log("home horizontal overflow px:", overflow);

  // 2. WorkWeatherBanner on paint calculator — sync check
  await page.goto("/paint-calculator", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const bannerSelect = page.locator("select[aria-label*='state' i]").first();
  if (await bannerSelect.count()) {
    console.log(
      "banner select value (should sync to kano):",
      await bannerSelect.inputValue(),
    );
  } else {
    console.log("no banner select found on /paint-calculator");
  }
  const overflow2 = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  console.log("paint-calculator overflow px:", overflow2);
  await page.screenshot({
    path: "test-results/weather-banner.png",
    fullPage: false,
  });
});
