import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
for (const route of process.argv.slice(2)) {
  await page.goto('http://localhost:4180' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const h = await page.evaluate(() => [...document.querySelectorAll('h1,h2')].slice(0, 6).map((e) => `${e.tagName}: ${(e.textContent||'').trim().slice(0, 50)} [${(e.className||'').toString().slice(0,40)}]`));
  console.log('\n' + route);
  h.forEach((x) => console.log('  ' + x));
}
await browser.close();
