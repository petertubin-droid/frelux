import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("https://www.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /Platform/i }).first().click();
await page.waitForTimeout(800);
const pos = async () => page.evaluate(() => {
  const t = [...document.querySelectorAll("a")].find((a) => /Agent Runners/i.test(a.textContent || ""));
  return t ? Math.round(t.getBoundingClientRect().top) : null;
});
const before = await pos();
await page.mouse.wheel(0, 240);
await page.waitForTimeout(600);
const afterScroll = await pos();
await page.mouse.wheel(0, -2400);
await page.waitForTimeout(400);
const titles = {};
for (const [name, url] of [["pricing", "https://www.netlify.com/pricing/"], ["platform", "https://www.netlify.com/platform/"]]) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
  titles[name] = { title: await page.title(), h1: await page.locator("h1").first().textContent().catch(() => null) };
}
console.log(JSON.stringify({ menuItemTopBeforeScroll: before, afterScroll, stillOpen: afterScroll !== null, titles }, null, 1));
await browser.close();
