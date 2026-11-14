import { chromium } from "playwright";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await c.newPage();
await p.goto("http://localhost:4173/paint-calculator", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
// dismiss the cookie banner so it cannot intercept clicks
for (const sel of ['[aria-label*="ccept" i]', '[aria-label*="lose" i]', 'button:has-text("Accept")', 'button:has-text("Got it")']) {
  const el = p.locator(sel).first();
  if (await el.count().catch(() => 0)) { await el.click({ timeout: 2500 }).catch(() => {}); break; }
}
await p.waitForTimeout(500);
await p.screenshot({ path: "netlify-review/12-desktop-tool.png" });
// collapse and measure
await p.click('button[aria-label="Collapse navigation"]');
await p.waitForTimeout(600);
const collapsed = await p.evaluate(() => {
  const rail = document.querySelector('aside[aria-label="Primary navigation"]');
  const main = document.querySelector("main");
  return {
    railW: Math.round(rail.getBoundingClientRect().width),
    columns: rail.querySelectorAll(":scope > div").length,
    mainPadding: getComputedStyle(main).paddingLeft,
    heroOrContentLeft: Math.round(main.querySelector("h1").getBoundingClientRect().left),
  };
});
await p.screenshot({ path: "netlify-review/13-desktop-collapsed.png" });
// and the home page expanded
await p.click('button[aria-label="Expand navigation"]');
await p.waitForTimeout(500);
await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);
await p.screenshot({ path: "netlify-review/14-desktop-home.png" });
console.log(JSON.stringify(collapsed, null, 1));
await b.close();
