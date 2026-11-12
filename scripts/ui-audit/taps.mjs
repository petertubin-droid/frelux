import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const route = process.argv[2] || '/';
await page.goto('http://localhost:4180' + route, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const rows = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select')) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 2) continue;
    const t = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 34);
    if (!t) continue;
    if (r.height >= 32) continue;
    // which landmark does it live in
    const land = el.closest('footer') ? 'footer' : el.closest('nav,header') ? 'nav/header' : 'body';
    out.push({ t, h: Math.round(r.height), land, tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,60) });
  }
  return out;
});
const byLand = {};
for (const r of rows) byLand[r.land] = (byLand[r.land] || 0) + 1;
console.log(route, rows.length, JSON.stringify(byLand));
const seen = new Set();
for (const r of rows) { const k = r.t + r.h + r.land; if (seen.has(k)) continue; seen.add(k); if (seen.size > 18) break; console.log(`  ${r.land} ${r.h}px ${r.tag} "${r.t}" [${r.cls}]`); }
await browser.close();
