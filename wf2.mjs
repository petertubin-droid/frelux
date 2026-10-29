import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('frelux_cookie_consent', JSON.stringify({ version: 2, categories: { essential: true, analytics: false, advertising: false, performance: false, functional: false } })); } catch {} });
const p = await ctx.newPage();
p.on('pageerror', (e) => { const m = String(e.message); if (!/^Y$/.test(m)) console.log('ERR:', m.slice(0, 90)); });
await p.goto('http://localhost:4173/wall-finish-estimator', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.locator('#main-content button', { hasText: /add room/i }).first().click({ timeout: 6000 });
await p.waitForTimeout(1200);
const n = await p.locator('#main-content input[type="number"]').count();
for (let i = 0; i < n; i++) {
  const el = p.locator('#main-content input[type="number"]').nth(i);
  const v = await el.inputValue();
  if (!v) { await el.click(); await el.type(i % 2 === 0 ? '4' : '3').catch(() => {}); }
}
await p.locator('#main-content button', { hasText: /calculate finishing/i }).first().click({ timeout: 8000 }).catch((e) => console.log('calc err', String(e).slice(0, 40)));
await p.waitForTimeout(4000);
const has = await p.evaluate(() => [...document.querySelectorAll('button')].map((e) => (e.innerText || '').trim()).filter((l) => /whatsapp|pdf|copy|export/i.test(l)));
console.log('numbers:', n, '| share/export:', has.join(' / ') || 'none');
let file = null;
p.on('download', (d) => { file = d.suggestedFilename(); });
if (has.some((l) => /whatsapp/i.test(l))) {
  await p.getByRole('button', { name: /save pdf/i }).click({ timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(4500);
}
console.log('pdf:', file || 'none');
await b.close();
