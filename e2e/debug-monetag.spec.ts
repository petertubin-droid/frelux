import { test } from "@playwright/test";

test("diagnose monetag tag on live site", async ({ page }) => {
  test.setTimeout(90000);
  const adRequests: string[] = [];
  const consoleErrors: string[] = [];

  page.on("request", (r) => {
    const u = r.url();
    if (
      u.includes("quge5.com") ||
      u.includes("omg10.com") ||
      u.includes("monetag") ||
      u.includes("6opo") ||
      u.includes("vaimucuvikuwu")
    ) {
      adRequests.push(`REQ ${u.slice(0, 120)}`);
    }
  });
  page.on("response", (r) => {
    const u = r.url();
    if (
      (u.includes("quge5.com") || u.includes("omg10.com")) &&
      r.status() >= 400
    ) {
      adRequests.push(`ERR ${r.status()} ${u.slice(0, 120)}`);
    }
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });

  const CONSENT = {
    version: 2,
    categories: { essential: true, analytics: true, advertising: true },
    timestamp: Date.now(),
    source: "banner",
  };
  await page.addInitScript((c) => {
    try {
      localStorage.setItem("frelux_cookie_consent", JSON.stringify(c));
    } catch {}
  }, CONSENT);

  await page.goto("https://freluxtools.netlify.app/", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(15000);

  const hasTag = await page.evaluate(
    () =>
      !!document.querySelector(
        'script[data-monetag-tag="true"], script[src*="quge5.com"]',
      ),
  );
  console.log("tag script in DOM:", hasTag);
  console.log("ad network requests captured:", adRequests.length);
  adRequests.slice(0, 15).forEach((r) => console.log("  ", r));
  console.log("console errors (first 8):");
  consoleErrors.slice(0, 8).forEach((e) => console.log("  ", e));

  // try a click to trigger popunder, then check for opened pages
  await page.mouse.click(400, 300).catch(() => {});
  await page.waitForTimeout(5000);
  console.log("ad requests after click:", adRequests.length);
  adRequests.slice(15).forEach((r) => console.log("  ", r));
});
