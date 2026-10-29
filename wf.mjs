import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('frelux_cookie_consent', JSON.stringify({ version: 2, categories: { essential: true, analytics: false, advertising: false, performance: false, functional: false } })); localStorage.removeItem('frelux_wallfin_saved'); } catch {} });
const p = await ctx.newPage();
p.on('pageerror', (e) => { const m = String(e.message); if (!/^Y$/.test(m)) console.log('ERR:', m.slice(0, 90)); });
await p.goto('http://localhost:4173/wall-finish-estimator', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
console.log('buttons:', (await p.evaluate(() => [...document.querySelectorAll('#main-content button')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 14))).join(' | '));
const n = await p.locator('#main-content input[type="number"]').count();
for (let i = 0; i < n; i++) {
  const el = p.locator('#main-content input[type="number"]').nth(i);
  if (!(await el.inputValue())) { await el.click().catch(() => {}); await el.type('3.5').catch(() => {}); }
}
const calc = p.locator('#main-content button', { hasText: /calculate|compute|estimate/i }).first();
await calc.click({ timeout: 6000 }).catch((e) => console.log('calc:', String(e).slice(0, 50)));
await p.waitForTimeout(3500);
const has = await p.evaluate(() => [...document.querySelectorAll('button')].map((e) => (e.innerText || '').trim()).filter((l) => /whatsapp|pdf|copy|export/i.test(l)));
console.log('share/export:', has.join(' / ') || 'none');
await b.close();
