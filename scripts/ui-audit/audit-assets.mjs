import { chromium } from '@playwright/test';
const ROUTES = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
for (const route of ROUTES) {
  const errs = [];
  const failed = [];
  page.removeAllListeners('console');
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('response');
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 110)); });
  page.on('requestfailed', (r) => failed.push(r.url().slice(-60)));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('supabase')) failed.push(r.status() + ' ' + r.url().slice(-50)); });
  try {
    await page.goto('http://localhost:4180' + route, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(700);
    const meta = await page.evaluate(() => ({
      h1: [...document.querySelectorAll('h1')].map((h) => (h.textContent || '').trim().slice(0, 48)),
      title: document.title.slice(0, 60),
      brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(-45)),
      emptyLinks: [...document.querySelectorAll('a[href="#"], a[href=""]')].length,
    }));
    const notes = [];
    if (meta.h1.length !== 1) notes.push(`h1x${meta.h1.length}`);
    if (!meta.title) notes.push('no title');
    if (meta.brokenImgs.length) notes.push('broken img: ' + meta.brokenImgs.join(','));
    if (meta.emptyLinks) notes.push(`empty links x${meta.emptyLinks}`);
    if (errs.length) notes.push('console: ' + errs.slice(0, 2).join(' ~ '));
    if (failed.length) notes.push('http: ' + failed.slice(0, 2).join(' ~ '));
    console.log(`${route} :: ${notes.length ? notes.join(' ; ') : 'ok'}`);
  } catch (e) { console.log(`${route} ERR ${String(e).slice(0, 70)}`); }
}
await browser.close();
