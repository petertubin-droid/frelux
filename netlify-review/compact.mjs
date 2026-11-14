import { chromium } from "playwright";
const b = await chromium.launch();
const rows = [];
for (const width of [1024, 1280, 1440]) {
  const c = await b.newContext({ viewport: { width, height: 900 } });
  const p = await c.newPage();
  await p.goto("http://localhost:4173/paint-calculator", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  for (const sel of ['button:has-text("Accept")', '[aria-label="Close"]']) {
    const el = p.locator(sel).first();
    if (await el.count().catch(() => 0)) { await el.click({ timeout: 2000 }).catch(() => {}); break; }
  }
  await p.waitForSelector('[aria-labelledby="cookie-banner-title"]', { state: "detached", timeout: 3000 }).catch(() => {});
  const read = () => p.evaluate(() => {
    const rail = document.querySelector('aside[aria-label="Primary navigation"]');
    const main = document.querySelector("main");
    return {
      railW: Math.round(rail.getBoundingClientRect().width),
      pad: getComputedStyle(main).paddingLeft,
      content: Math.round(main.querySelector("h1").getBoundingClientRect().left),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      toggle: document.querySelector('button[aria-label*="navigation"]').getAttribute("aria-label"),
    };
  });
  const first = await read();
  await p.click('button[aria-label="Open navigation"]');
  await p.waitForTimeout(500);
  const open = await read();
  rows.push({ width, first, open });
  await c.close();
}
console.log(JSON.stringify(rows));
await b.close();
