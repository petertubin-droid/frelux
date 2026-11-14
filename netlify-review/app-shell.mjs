import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = {};
for (const [name, url] of [
  ["drop", "https://app.netlify.com/drop"],
  ["app", "https://app.netlify.com/"],
  ["login", "https://app.netlify.com/login"],
]) {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => ({ status: () => "ERR " + e.message }));
  await page.waitForTimeout(2500);
  out[name] = {
    finalUrl: page.url(),
    status: typeof resp?.status === "function" ? resp.status() : null,
    title: await page.title(),
    text: (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n+/g, " | "),
  };
  await page.screenshot({ path: `netlify-review/app-${name}.png` });
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
