import { chromium } from "playwright";
const browser = await chromium.launch();
const out = {};
for (const width of [1440, 1280, 1024]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4173/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  out[width] = await page.evaluate(() => {
    const rail = document.querySelector('aside[aria-label="Primary navigation"], aside');
    const column = [...document.querySelectorAll("nav")].find((n) => n.className.includes("overflow-y-auto") && n.closest("aside"));
    const main = document.querySelector("main");
    const header = document.querySelector("header");
    const hero = document.querySelector('[data-tour="hero"]');
    const root = getComputedStyle(document.documentElement);
    return {
      railOffsetVar: root.getPropertyValue("--rail-w").trim(),
      railWidth: rail ? Math.round(rail.getBoundingClientRect().width) : null,
      railRight: rail ? Math.round(rail.getBoundingClientRect().right) : null,
      columnScrolls: column ? column.scrollHeight > column.clientHeight + 4 : null,
      columnWidth: column ? Math.round(column.getBoundingClientRect().width) : null,
      mainLeft: main ? Math.round(main.getBoundingClientRect().left) : null,
      headerLeft: header ? Math.round(header.getBoundingClientRect().left) : null,
      heroImages: hero ? hero.querySelectorAll("img").length : null,
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  if (width === 1440) {
    await page.screenshot({ path: "netlify-review/10-frelux-desktop.png" });
    await page.goto("http://localhost:4173/paint-calculator", { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "netlify-review/11-frelux-tool.png" });
    out.toolColumn = await page.evaluate(() => {
      const nav = [...document.querySelectorAll("aside nav")].pop();
      return { label: nav?.getAttribute("aria-label"), items: nav?.querySelectorAll("a").length };
    });
  }
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
