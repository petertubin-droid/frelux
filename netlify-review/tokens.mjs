import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("https://www.netlify.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);

const base = await page.evaluate(() => {
  const g = (el, ...props) => { const s = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, s[p]])); };
  const header = document.querySelector("header");
  const h1 = document.querySelector("h1");
  const h2 = document.querySelector("h2");
  const cta = [...document.querySelectorAll("a,button")].find((b) => /Start building/i.test(b.textContent || ""));
  const sections = [...document.querySelectorAll("section")].slice(0, 6).map((s) => Math.round(parseFloat(getComputedStyle(s).paddingTop)));
  const card = [...document.querySelectorAll("a div, article, li div")].map((d) => ({ d, r: d.getBoundingClientRect() })).find((x) => x.r.width > 260 && x.r.width < 520 && x.r.height > 120);
  return {
    body: g(document.body, "fontFamily", "fontSize", "color", "backgroundColor", "lineHeight"),
    header: header ? { h: Math.round(header.getBoundingClientRect().height), ...g(header, "position", "backgroundColor", "borderBottom", "boxShadow", "backdropFilter", "zIndex") } : null,
    h1: h1 ? { text: h1.textContent.trim().slice(0, 30), ...g(h1, "fontSize", "lineHeight", "fontWeight", "letterSpacing") } : null,
    h2: h2 ? g(h2, "fontSize", "lineHeight", "fontWeight", "letterSpacing") : null,
    cta: cta ? { text: cta.textContent.trim().slice(0, 20), ...g(cta, "borderRadius", "padding", "fontSize", "fontWeight", "backgroundColor", "color") } : null,
    sectionPaddingTop: sections,
    card: card ? { w: Math.round(card.r.width), h: Math.round(card.r.height), ...g(card.d, "borderRadius", "backgroundColor", "border", "boxShadow") } : null,
    navLink: (() => { const a = [...document.querySelectorAll("header button, header a")].find((n) => /Platform/i.test(n.textContent || "")); return a ? g(a, "fontSize", "fontWeight", "color", "padding", "borderRadius") : null; })(),
  };
});
console.log("BASE", JSON.stringify(base, null, 1));

await page.getByRole("button", { name: /Platform/i }).first().click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "netlify-review/05-platform-menu.png" });
const menu = await page.evaluate(() => {
  const t = [...document.querySelectorAll("a")].find((a) => /Agent Runners/i.test(a.textContent || ""));
  if (!t) return null;
  let p = t;
  for (let i = 0; i < 8 && p.parentElement; i += 1) {
    p = p.parentElement;
    const s = getComputedStyle(p);
    if ((s.position === "absolute" || s.position === "fixed") && p.getBoundingClientRect().width > 500) break;
  }
  const items = [...p.querySelectorAll("a")].map((a) => {
    const txt = (a.textContent || "").trim().replace(/\s+/g, " ");
    return txt.slice(0, 110);
  });
  const labels = [...p.querySelectorAll("p")].map((n) => (n.textContent || "").trim()).filter((t2) => t2 && t2.length < 24);
  const r = p.getBoundingClientRect();
  const s = getComputedStyle(p);
  return { count: items.length, items, labels: [...new Set(labels)].slice(0, 8), risk: { w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius, shadow: s.boxShadow.slice(0, 80) } };
});
console.log("MENU", JSON.stringify(menu, null, 1));

// crops for review
const shots = [
  ["07-hero", { x: 0, y: 0, width: 1440, height: 780 }],
];
for (const [name, clip] of shots) await page.screenshot({ path: `netlify-review/${name}.png`, clip });
await browser.close();
