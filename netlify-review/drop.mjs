import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("https://app.netlify.com/drop", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
const input = page.locator('input[type="file"]').first();
console.log("file inputs:", await page.locator('input[type="file"]').count());
await input.setInputFiles("netlify-review/drop/index.html");
await page.waitForTimeout(9000);
console.log(JSON.stringify({ url: page.url(), title: await page.title(),
  text: (await page.evaluate(() => document.body.innerText)).slice(0, 600).replace(/\n+/g, " | ") }, null, 1));
await page.screenshot({ path: "netlify-review/09-drop-result.png" });
await browser.close();
