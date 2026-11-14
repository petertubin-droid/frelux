import { chromium } from "playwright";
const b = await chromium.launch();
const out = {};
for (const width of [1440, 1024]) {
  const c = await b.newContext({ viewport: { width, height: 900 } });
  const p = await c.newPage();
  const dismiss = async () => {
    for (const sel of ['button:has-text("Accept")', 'button:has-text("Got it")', 'button:has-text("Agree")', '[aria-label="Close"]']) {
      const el = p.locator(sel).first();
      if (await el.count().catch(() => 0)) { await el.click({ timeout: 2000 }).catch(() => {}); break; }
    }
    await p.waitForSelector('[aria-labelledby="cookie-banner-title"]', { state: "detached", timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(300);
  };
  await p.goto("http://localhost:4173/paint-calculator", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await dismiss();
  const read = () => p.evaluate(() => {
    const rail = document.querySelector('aside[aria-label="Primary navigation"]');
    const main = document.querySelector("main");
    const cols = rail.querySelectorAll(":scope > div").length;
    return {
      railW: Math.round(rail.getBoundingClientRect().width),
      cols,
      mainPad: getComputedStyle(main).paddingLeft,
      firstContent: Math.round(main.querySelector("h1").getBoundingClientRect().left),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      toggle: document.querySelector('button[aria-label*="navigation"]')?.getAttribute("aria-label"),
    };
  });
  const first = await read();
  await p.click('button[aria-label="Open navigation"]');
  await p.waitForTimeout(600);
  const open = await read();
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await dismiss();
  const afterReload = await read();
  await p.click('button[aria-label="Close navigation"]');
  await p.waitForTimeout(600);
  const closed = await read();
  if (width === 1440) await p.screenshot({ path: "netlify-review/15-book-closed.png" });
  await p.click('button[aria-label="Open navigation"]');
  await p.waitForTimeout(600);
  if (width === 1440) await p.screenshot({ path: "netlify-review/16-book-open.png" });
  out[width] = { first, open, afterReload, closed };
  await c.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
