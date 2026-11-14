import { chromium } from "playwright";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
console.log("HERO IMG", JSON.stringify(await p.evaluate(() => {
  const hero = document.querySelector('[data-tour="hero"]');
  const img = hero?.querySelector("img");
  if (!img) return null;
  const parent = img.closest("div");
  return { alt: img.alt, src: img.currentSrc, cls: img.className, parentCls: parent?.className,
    opacity: getComputedStyle(img).opacity, filter: getComputedStyle(img).filter.slice(0, 40) };
}), null, 1));

await p.goto("http://localhost:4173/paint-calculator", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
console.log("TOOL PAGE", JSON.stringify(await p.evaluate(() => {
  const rail = document.querySelector('aside[aria-label="Primary navigation"]');
  const navs = [...document.querySelectorAll("aside nav")].map((n) => ({
    label: n.getAttribute("aria-label"),
    w: Math.round(n.getBoundingClientRect().width),
    scrolls: n.scrollHeight > n.clientHeight + 4,
    items: n.querySelectorAll("a").length,
  }));
  const main = document.querySelector("main");
  const child = main?.querySelector("h1, section");
  return {
    railW: Math.round(rail.getBoundingClientRect().width),
    navs,
    mainPaddingLeft: getComputedStyle(main).paddingLeft,
    firstContentLeft: child ? Math.round(child.getBoundingClientRect().left) : null,
    viewport: window.innerWidth,
  };
}), null, 1));
await b.close();
