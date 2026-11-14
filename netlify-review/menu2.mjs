import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("https://www.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);

await page.getByRole("button", { name: /Platform/i }).first().hover();
await page.waitForTimeout(600);
await page.getByRole("button", { name: /Platform/i }).first().click();
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const anchors = [...document.querySelectorAll("a")].filter((a) => {
    const r = a.getBoundingClientRect();
    return r.width > 60 && r.height > 10 && r.top > 60 && r.top < 700 && r.left > 100;
  });
  const target = anchors.find((a) => /Agent Runners|Deploy Previews|AI Gateway/i.test(a.textContent || ""));
  if (!target) {
    return { found: false, sample: anchors.slice(0, 10).map((a) => (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)) };
  }
  let panel = target;
  for (let i = 0; i < 8 && panel.parentElement; i += 1) {
    panel = panel.parentElement;
    const s = getComputedStyle(panel);
    if ((s.position === "absolute" || s.position === "fixed") && panel.getBoundingClientRect().width > 500) break;
  }
  const r = panel.getBoundingClientRect();
  const s = getComputedStyle(panel);
  const links = [...panel.querySelectorAll("a")].map((a) => {
    const lines = [...a.querySelectorAll("p,span,h3,strong")].map((n) => (n.textContent || "").trim()).filter(Boolean);
    return { title: lines[0]?.slice(0, 34) || "", desc: (lines[1] || "").slice(0, 80) };
  });
  const headings = [...panel.querySelectorAll("p,span,h3,h4,button")].map((n) => (n.textContent || "").trim()).filter((t) => t && t.length < 26).slice(0, 10);
  return {
    found: true,
    geometry: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) },
    style: { bg: s.backgroundColor, radius: s.borderRadius, boxShadow: s.boxShadow.slice(0, 120), padding: s.padding, display: s.display, gap: s.gap },
    linkCount: links.length, links: links.slice(0, 16), headings,
  };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: "netlify-review/05-platform-menu.png" });
const box = await page.evaluate(() => {
  const t = [...document.querySelectorAll("a")].find((a) => /Agent Runners/i.test(a.textContent || ""));
  if (!t) return null;
  let p = t;
  for (let i = 0; i < 8 && p.parentElement; i += 1) {
    p = p.parentElement;
    const s = getComputedStyle(p);
    if ((s.position === "absolute" || s.position === "fixed") && p.getBoundingClientRect().width > 500) break;
  }
  const r = p.getBoundingClientRect();
  return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8), width: Math.min(1440 - Math.max(0, r.left - 8), r.width + 16), height: Math.min(880, r.height + 16) };
});
if (box) await page.screenshot({ path: "netlify-review/06-menu-crop.png", clip: box });
await browser.close();
