import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("https://www.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);

const btn = page.getByRole("button", { name: /Platform/i }).first();
await btn.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: "netlify-review/05-platform-menu-open.png" });

const info = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll("div,section,ul")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((x) => x.r.width > 500 && x.r.height > 200 && x.r.top < 400 && x.r.top > 20)
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
  const panel = boxes[0];
  if (!panel) return null;
  const s = getComputedStyle(panel.el);
  const headings = [...panel.el.querySelectorAll("p,span,h3,h4")].map((n) => (n.textContent || "").trim()).filter((t) => t && t.length < 30).slice(0, 12);
  const links = [...panel.el.querySelectorAll("a")].map((a) => {
    const t = a.querySelector("p,span,strong,h3");
    const d = a.querySelectorAll("p,span");
    const desc = d.length > 1 ? (d[d.length - 1].textContent || "").trim() : "";
    return { title: (t?.textContent || a.textContent || "").trim().slice(0, 32), desc: desc.slice(0, 70) };
  });
  return {
    geometry: { w: Math.round(panel.r.width), h: Math.round(panel.r.height), top: Math.round(panel.r.top), left: Math.round(panel.r.left) },
    style: { bg: s.backgroundColor, radius: s.borderRadius, shadow: s.boxShadow.slice(0, 90), padding: s.padding, gap: s.gap, grid: s.gridTemplateColumns },
    headings, linkCount: links.length, links: links.slice(0, 14),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
