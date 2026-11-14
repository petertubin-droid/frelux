import { chromium } from "playwright";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => {
  const asides = [...document.querySelectorAll("aside")].map((a) => ({
    label: a.getAttribute("aria-label"), cls: a.className.slice(0, 60),
    w: Math.round(a.getBoundingClientRect().width), right: Math.round(a.getBoundingClientRect().right),
    display: getComputedStyle(a).display,
  }));
  const navs = [...document.querySelectorAll("aside nav")].map((n) => ({
    label: n.getAttribute("aria-label"), w: Math.round(n.getBoundingClientRect().width),
    scrolls: n.scrollHeight > n.clientHeight + 4,
  }));
  const hero = document.querySelector('[data-tour="hero"]');
  const imgs = hero ? [...hero.querySelectorAll("img")].map((i) => ({ src: i.currentSrc.slice(-40), w: Math.round(i.getBoundingClientRect().width) })) : [];
  return { asides, navs, heroImgs: imgs };
}), null, 1));
await b.close();
