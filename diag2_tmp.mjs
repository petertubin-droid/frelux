import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem('frelux_cookie_consent', JSON.stringify({version:2,categories:{essential:true,analytics:true,advertising:true},timestamp:Date.now(),source:'banner'})));
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
for (const path of process.argv.slice(2)) {
  errs.length = 0;
  await p.goto(`http://localhost:4173${path}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);
  const info = await p.evaluate(() => ({
    units: document.querySelectorAll('.frelux-ad-unit').length,
    anyAd: document.querySelectorAll('[data-ad-slot-key]').length,
    text: (document.body.innerText.match(/Advertisement/g) || []).length,
  }));
  console.log(path, JSON.stringify(info), errs.slice(0, 2).join(' | '));
}
await b.close();
