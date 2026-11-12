import { chromium } from '@playwright/test';
const width = Number(process.argv[2]);
const scheme = process.argv[3] || 'light';
const ROUTES = process.argv.slice(4);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 820 }, isMobile: true, hasTouch: true, colorScheme: scheme });
const page = await ctx.newPage();
let bad = 0;
for (const route of ROUTES) {
  try {
    await page.goto('http://localhost:4180' + route, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    const hits = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      const scroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') return true; } return false; };
      const deco = (el) => { for (let p = el; p; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.pointerEvents === 'none' || p.getAttribute('aria-hidden') === 'true' || cs.position === 'fixed') return true; if (p.classList?.contains('sr-only')) return true; } return false; };
      for (const el of document.body.querySelectorAll('*')) {
        if (['SCRIPT','STYLE','SVG','PATH','BR'].includes(el.tagName)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || deco(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const txt = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 3);
        if (txt) {
          const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
          const cutX = el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis';
          const cutY = el.scrollHeight > el.clientHeight + 2 && /hidden|clip/.test(cs.overflowY) && !clamped;
          if (cutX || cutY) out.push(`cut:${el.tagName}:${(el.textContent||'').trim().slice(0,40)}`);
        }
        if (r.right > vw + 1 && !scroller(el)) out.push(`bleed:${Math.round(r.right - vw)}px:${el.tagName}.${(el.className||'').toString().slice(0,40)}`);
      }
      const body = document.body.innerText || '';
      for (const b of ['NaN','undefined','[object Object]']) if (body.includes(b)) out.push('text:' + b);
      return out;
    });
    bad += hits.length;
    if (hits.length) console.log(`${route} [${width}/${scheme}] ${hits.length}:`, hits.slice(0, 3).join(' | '));
  } catch (e) { console.log(`${route} ERR ${String(e).slice(0, 60)}`); }
}
console.log(`done ${width}/${scheme} total=${bad}`);
await browser.close();
