import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("https://www.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
await page.getByRole("button", { name: /Platform/i }).first().click();
await page.waitForTimeout(700);
const menuTop = () => page.evaluate(() => {
  const t = [...document.querySelectorAll("a")].find((a) => /Agent Runners/i.test(a.textContent || ""));
  return t ? Math.round(t.getBoundingClientRect().top) : null;
});
const before = { y: await page.evaluate(() => window.scrollY), menu: await menuTop() };
await page.mouse.move(720, 640);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(700);
const after = { y: await page.evaluate(() => window.scrollY), menu: await menuTop() };
console.log(JSON.stringify({ before, after, menuStillOpen: after.menu !== null }, null, 1));
await browser.close();
