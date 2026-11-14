import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const out = {};
await page.goto("https://docs.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => null);
await page.waitForTimeout(2000);
out.docs = {
  url: page.url(),
  title: await page.title(),
  links: await page.evaluate(() =>
    [...document.querySelectorAll("a")].map((a) => (a.textContent || "").trim()).filter((t) => /dashboard|overview|manage|interface/i.test(t)).slice(0, 12),
  ),
};
await page.goto("https://www.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => null);
await page.waitForTimeout(2500);
out.homeImages = await page.evaluate(() =>
  [...document.images].map((i) => ({ alt: i.alt, src: (i.currentSrc || i.src).slice(-60), w: i.naturalWidth })).filter((i) => i.w > 500).slice(0, 12),
);
console.log(JSON.stringify(out, null, 1));
await browser.close();
