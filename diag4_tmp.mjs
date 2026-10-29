import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem('frelux_cookie_consent', JSON.stringify({version:2,categories:{essential:true,analytics:true,advertising:true},timestamp:Date.now(),source:'banner'})));
const p = await ctx.newPage();
await p.goto('http://localhost:4173/paint-calculator/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(11000);
console.log(await p.evaluate(() => [...document.querySelectorAll('.frelux-ad-unit')].map(u => ({
  key: u.dataset.adSlotKey, filled: u.dataset.adFilled,
  html: u.innerHTML.replace(/\s+/g, ' ').slice(0, 420),
}))));
await b.close();
