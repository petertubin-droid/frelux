import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const card = document.querySelector('form')?.closest('div') || document.body;
  const txt = card.innerText;
  const all = [...card.querySelectorAll('*')];
  const clipped = all.filter(e => e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1)
    .map(e => ({ tag: e.tagName, text: e.textContent.trim().slice(0,40), sw: e.scrollWidth, cw: e.clientWidth }));
  const colors = [...new Set(all.filter(e=>e.children.length===0 && e.textContent.trim()).map(e=>{
    const cs = getComputedStyle(e); return `${cs.color}|${cs.opacity}`;}))].slice(0,12);
  const codes = {};
  for (const ch of txt) if (ch.charCodeAt(0) > 127) codes[ch] = (codes[ch]||0)+1;
  return { txt: txt.slice(0,400), clipped, colors, nonAscii: codes, lang: document.documentElement.lang, dir: getComputedStyle(document.body).direction };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
