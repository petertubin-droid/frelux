import { chromium } from "playwright";

const OUT = "netlify-review";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  return name;
};

await page.goto("https://www.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
// dismiss the announcement bar's close button if present
for (const sel of ['button[aria-label*="lose" i]', '[aria-label*="close" i]']) {
  const el = page.locator(sel).first();
  if (await el.count().catch(() => 0)) { await el.click({ timeout: 2000 }).catch(() => {}); break; }
}
await page.waitForTimeout(500);
await shot("01-home-hero");

// header measurements
const metrics = await page.evaluate(() => {
  const px = (v) => v;
  const header = document.querySelector("header") || document.querySelector("nav");
  const cs = header ? getComputedStyle(header) : null;
  const links = [...document.querySelectorAll("nav a, header a")].slice(0, 12).map((a) => {
    const s = getComputedStyle(a);
    return { text: (a.textContent || "").trim().slice(0, 24), fontSize: s.fontSize, fontWeight: s.fontWeight, color: s.color, padding: s.padding };
  });
  const h1 = document.querySelector("h1");
  const h1s = h1 ? getComputedStyle(h1) : null;
  return {
    docWidth: document.documentElement.clientWidth,
    headerHeight: header ? header.getBoundingClientRect().height : null,
    headerPosition: cs?.position, headerBg: cs?.backgroundColor, headerShadow: cs?.boxShadow, headerBackdrop: cs?.backdropFilter,
    h1: h1s ? { text: h1.textContent.trim().slice(0, 40), fontSize: h1s.fontSize, lineHeight: h1s.lineHeight, weight: h1s.fontWeight, letterSpacing: h1s.letterSpacing, color: h1s.color } : null,
    links,
  };
});
console.log("HEADER", JSON.stringify(metrics, null, 1));

// open the Platform mega-menu
const platform = page.getByRole("button", { name: /^Platform/ }).first();
await platform.hover().catch(() => {});
await page.waitForTimeout(900);
await shot("02-home-platform-menu");
const menu = await page.evaluate(() => {
  const panel = [...document.querySelectorAll('[role="menu"],[class*="mega"],[class*="dropdown"]')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((x) => x.r.width > 300 && x.r.height > 200)
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0];
  if (!panel) return null;
  const s = getComputedStyle(panel.el);
  const links = [...panel.el.querySelectorAll("a")].slice(0, 8).map((a) => {
    const as = getComputedStyle(a);
    const title = a.querySelector("h3,h4,strong,span");
    const ts = title ? getComputedStyle(title) : null;
    return { text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60), fontSize: ts?.fontSize, padding: as.padding, radius: as.borderRadius };
  });
  return {
    width: Math.round(panel.r.width), height: Math.round(panel.r.height),
    left: Math.round(panel.r.left), top: Math.round(panel.r.top),
    background: s.backgroundColor, radius: s.borderRadius, shadow: s.boxShadow, padding: s.padding,
    columns: getComputedStyle(panel.el).gridTemplateColumns,
    linkCount: panel.el.querySelectorAll("a").length, links,
  };
});
console.log("MEGAMENU", JSON.stringify(menu, null, 1));

// pricing
await page.goto("https://www.netlify.com/pricing/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
await shot("03-pricing");

// a product page
await page.goto("https://www.netlify.com/platform/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);
await shot("04-platform");

await browser.close();
