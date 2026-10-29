import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => {
  localStorage.setItem('frelux_cookie_consent', JSON.stringify({
    version: 2,
    categories: { essential: true, analytics: true, advertising: true },
    timestamp: Date.now(),
    source: 'banner',
  }));
});
const page = await ctx.newPage();
for (const path of process.argv.slice(2)) {
  await page.goto(`http://localhost:4173${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);
  const before = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.ad-label-subtle')].filter((el) => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.height > 0 && s.display !== 'none' && Number(s.opacity) > 0;
    });
    const units = [...document.querySelectorAll('.frelux-ad-unit')];
    return {
      slots: units.length,
      keys: units.map((u) => u.getAttribute('data-ad-slot-key')),
      filled: units.filter((u) => u.getAttribute('data-ad-filled') === 'true').length,
      visibleLabels: labels.length,
      adWordOnPage: (document.body.innerText.match(/Advertisement/g) || []).length,
    };
  });
  await page.screenshot({ path: `/tmp/shot_${path.replace(/\W+/g, '_')}.png`, fullPage: false });
  console.log(path, JSON.stringify(before));
}
await browser.close();
