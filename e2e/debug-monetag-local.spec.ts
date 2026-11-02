import { test, expect } from "@playwright/test";

test("monetag display tag uses display zone", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("script[data-monetag-tag='true']", {
    timeout: 15000,
  });
  const zone = await page.getAttribute(
    "script[data-monetag-tag='true']",
    "data-zone",
  );
  console.log("injected data-zone:", zone);
  expect(zone).toBe("275352");
});
