import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem('frelux_cookie_consent', JSON.stringify({version:2,categories:{essential:true,analytics:true,advertising:true},timestamp:Date.now(),source:'banner'})));
const p = await ctx.newPage();
for (const path of process.argv.slice(2)) {
  await p.goto(`http://localhost:4173${path}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(10000);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.frelux-ad-unit')].map((u) => {
    const label = u.querySelector('.ad-label-subtle');
    const lr = label?.getBoundingClientRect();
    const frames = [...u.querySelectorAll('iframe')].map((f) => ({ src: (f.src || '').slice(0, 42), w: Math.round(f.getBoundingClientRect().width), h: Math.round(f.getBoundingClientRect().height) }));
    return { key: u.getAttribute('data-ad-slot-key'), filled: u.getAttribute('data-ad-filled'), label: !!lr && lr.height > 0, h: Math.round(u.getBoundingClientRect().height), frames };
  }));
  console.log(path, JSON.stringify(rows, null, 0));
}
await b.close();
