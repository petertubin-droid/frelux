import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const found = {};
for (const [name, url] of [
  ["dashboard", "https://docs.netlify.com/manage/get-started/"],
  ["ui", "https://docs.netlify.com/manage/overview/"],
]) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(1500);
  found[name] = {
    url: page.url(),
    title: await page.title(),
    images: await page.evaluate(() => [...document.images].map((img) => img.currentSrc || img.src).filter((s) => /\.(png|jpg|jpeg|webp|gif)/i.test(s)).slice(0, 8)),
  };
}
console.log(JSON.stringify(found, null, 1));
await browser.close();
