import { test } from "@playwright/test";

test("local overflow culprit chain (real supabase)", async ({ page }) => {
  test.setTimeout(90000);
  // pre-accept cookies so the banner never renders
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

  await page.goto("/pop-ceiling-calculator?mode=cost", {
    waitUntil: "domcontentloaded",
  });
  const found = await page
    .waitForSelector("h2:has-text('Labour')", { timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  console.log("labour heading found:", found);
  if (!found) {
    console.log(
      "PAGE:",
      (await page.locator("body").innerText()).slice(0, 300),
    );
    return;
  }
  const tgl = page.locator('button[aria-label*="abour" i]');
  await tgl.first().click();
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const chain: any[] = [];
    const walk = (el: Element, depth: number) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && depth < 18) {
        chain.push({
          d: depth,
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 110),
          w: Math.round(r.width),
        });
        for (const c of Array.from(el.children)) walk(c, depth + 1);
      }
    };
    walk(document.body, 0);
    let deepest: any = null;
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && !el.children.length && r.width > 0) {
        if (!deepest || r.right > deepest.right)
          deepest = {
            tag: el.tagName,
            text: (el.textContent || "").slice(0, 60),
            cls: (el.className || "").toString().slice(0, 80),
            right: Math.round(r.right),
          };
      }
    }
    return {
      chain: chain.slice(0, 30),
      deepest,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: "test-results/labour-expanded.png" });
});
