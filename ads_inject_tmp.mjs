import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem('frelux_cookie_consent', JSON.stringify({version:2,categories:{essential:true,analytics:true,advertising:true},timestamp:Date.now(),source:'banner'})));
const p = await ctx.newPage();
await p.goto('http://localhost:4173/paint-calculator/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(7000);
// Simulate a network creative of standard size landing in the first slot.
await p.evaluate(() => {
  const u = document.querySelector('.frelux-ad-unit');
  const host = u.querySelector('[data-ad-provider]') || u.querySelector('.flex.justify-center');
  const f = document.createElement('iframe');
  f.src = 'about:blank';
  f.style.cssText = 'width:300px;height:250px;border:0;display:block';
  host.appendChild(f);
});
await p.waitForTimeout(2500);
const state = await p.evaluate(() => [...document.querySelectorAll('.frelux-ad-unit')].map(u => ({
  key: u.dataset.adSlotKey, filled: u.dataset.adFilled,
  label: u.innerText.trim().slice(0, 14), h: Math.round(u.getBoundingClientRect().height),
})));
console.log(JSON.stringify(state));
await p.screenshot({ path: '/tmp/ads_filled.png', clip: { x: 0, y: '400', width: 390, height: 500 } }).catch(() => {});
await b.close();
