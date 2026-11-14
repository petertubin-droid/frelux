import { chromium } from "playwright";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto("http://localhost:4173/paint-calculator", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
for (const sel of ['button:has-text("Accept")', '[aria-label="Close"]']) {
  const el = p.locator(sel).first();
  if (await el.count().catch(() => 0)) { await el.click({ timeout: 2000 }).catch(() => {}); break; }
}
await p.waitForSelector('[aria-labelledby="cookie-banner-title"]', { state: "detached", timeout: 3000 }).catch(() => {});
await p.waitForTimeout(400);
const closed = await p.evaluate(() => {
  const rail = document.querySelector('aside[aria-label="Primary navigation"]');
  const book = rail.querySelector('button[aria-label*="navigation"]');
  const br = book.getBoundingClientRect();
  const icons = [...rail.querySelectorAll("nav a")].map((a) => ({
    label: a.getAttribute("aria-label"),
    current: a.getAttribute("aria-current"),
  }));
  return {
    railW: Math.round(rail.getBoundingClientRect().width),
    bookTop: Math.round(br.top),
    bookBelowBrand: br.top < 130,
    lit: icons.filter((i) => i.current === "page").map((i) => i.label),
  };
});
await p.hover('aside[aria-label="Primary navigation"] nav a[aria-label="Market Intelligence"]');
await p.waitForTimeout(400);
await p.screenshot({ path: "netlify-review/17-rail-hover.png" });
const tip = await p.evaluate(() =>
  [...document.querySelectorAll('aside[aria-label="Primary navigation"] nav a span')]
    .some((s) => s.textContent === "Market Intelligence" && getComputedStyle(s).display === "block"),
);
// the active icon opens the column instead of navigating
await p.click('aside[aria-label="Primary navigation"] nav a[aria-label="Construction Tools"]');
await p.waitForTimeout(600);
const opened = await p.evaluate(() => {
  const rail = document.querySelector('aside[aria-label="Primary navigation"]');
  return {
    railW: Math.round(rail.getBoundingClientRect().width),
    url: location.pathname,
    columns: [...rail.querySelectorAll("nav")].map((n) => n.getAttribute("aria-label")),
  };
});
await p.screenshot({ path: "netlify-review/18-rail-opened.png" });
console.log(JSON.stringify({ closed, tipVisibleOnHover: tip, opened }, null, 1));
await b.close();
