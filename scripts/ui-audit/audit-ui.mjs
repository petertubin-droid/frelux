import { chromium } from '@playwright/test';

const ROUTES = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
let total = 0;

for (const route of ROUTES) {
  try {
    await page.goto('http://localhost:4180' + route, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(700);
    const res = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      const desc = (el) => {
        const cls = (el.className || '').toString().replace(/\s+/g, ' ').slice(0, 70);
        const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
        return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${cls} :: "${txt}"`;
      };
      const decorative = (el) => {
        for (let p = el; p; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.pointerEvents === 'none' || p.getAttribute('aria-hidden') === 'true' || cs.position === 'fixed') return true;
          if (p.classList && p.classList.contains('sr-only')) return true;
        }
        return false;
      };
      const scroller = (el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'auto' || ox === 'scroll') return true;
        }
        return false;
      };
      for (const el of document.body.querySelectorAll('*')) {
        if (['SCRIPT', 'STYLE', 'SVG', 'PATH', 'BR'].includes(el.tagName)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (decorative(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 3);
        if (hasText) {
          const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
          const cutX = el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis';
          const cutY = el.scrollHeight > el.clientHeight + 2 && /hidden|clip/.test(cs.overflowY) && !clamped;
          if (cutX || cutY) out.push({ k: 'text-cut', px: cutX ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight, el: desc(el) });
        }
        if (r.right > vw + 1 && !scroller(el)) out.push({ k: 'bleeds-right', px: Math.round(r.right - vw), el: desc(el) });
      }
      // interactive below the 24 px WCAG AA minimum
      for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')) {
        if (decorative(el)) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 2) continue;
        const t = (el.textContent || el.getAttribute('aria-label') || '').trim();
        if (!t) continue;
        if (r.height < 24) out.push({ k: 'tap<24', px: Math.round(r.height), el: desc(el) });
        else if (el.tagName === 'BUTTON' && r.height < 32) out.push({ k: 'btn<32', px: Math.round(r.height), el: desc(el) });
      }
      for (const el of document.querySelectorAll('p, span, li, td, label, button, div')) {
        if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 2)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs > 0 && fs < 11) out.push({ k: 'font<11', px: fs, el: desc(el) });
      }
      // broken values leaking into copy
      const body = document.body.innerText || '';
      for (const bad of ['NaN', 'undefined', 'Infinity', '[object Object]', 'TODO', 'lorem ipsum']) {
        const i = body.indexOf(bad);
        if (i >= 0) out.push({ k: 'bad-text:' + bad, px: 0, el: body.slice(Math.max(0, i - 60), i + 40).replace(/\s+/g, ' ') });
      }
      return out;
    });
    const byKind = res.reduce((a, f) => ({ ...a, [f.k.split(':')[0]]: (a[f.k.split(':')[0]] || 0) + 1 }), {});
    total += res.length;
    console.log(`\n### ${route} — ${res.length} (${JSON.stringify(byKind)})`);
    const seen = new Set();
    for (const f of res) {
      const key = f.k + f.el.slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);
      if (seen.size > 8) break;
      console.log(`  ${f.k} ${f.px} :: ${f.el.slice(0, 130)}`);
    }
  } catch (e) {
    console.log(`\n### ${route} ERROR ${String(e).slice(0, 80)}`);
  }
}
console.log(`\nTOTAL ${total}`);
await browser.close();
