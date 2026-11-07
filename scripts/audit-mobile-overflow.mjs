/**
 * Mobile overflow audit.
 *
 * A page that is one pixel wider than the phone forces the whole document to
 * scroll sideways: the layout looks bored out, fixed bars detach from the edge
 * and numbers get cut off. It is invisible in a desktop browser and easy to
 * reintroduce in any card, so this walks real routes at a real phone width and
 * reports the exact element that spilled.
 *
 *   node scripts/audit-mobile-overflow.mjs [--width 360] [--limit 200]
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const WIDTH = Number(arg("width", 360));
const LIMIT = Number(arg("limit", 200));
const OFFSET = Number(arg("offset", 0));
const ONLY = (arg("routes", "") || "").split(",").filter(Boolean);
const BASE = arg("base", "http://localhost:4173");

const sitemap = readFileSync("public/sitemap.xml", "utf8");
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .filter((p) => !p.startsWith("/admin"))
  .filter((p) => !/\/\d{3,}|[a-z]-in-/.test(p));

// Always audit these, however the sitemap is ordered: the tools a phone user
// actually lands on from search.
const PINNED = [
  "/",
  "/construction-tools",
  "/screeding-cost-estimator",
  "/cost-estimator",
  "/pop-ceiling-calculator",
  "/tile-cost-estimator",
  "/paint-calculator",
  "/mathematical-plan-elevation",
  "/marketplace",
  "/my-projects",
];

const seen = new Set();
const targets = [];
for (const p of [...PINNED, ...routes]) {
  const key = p.replace(/\/$/, "") || "/";
  if (seen.has(key)) continue;
  seen.add(key);
  targets.push(key);
}
const sample = ONLY.length ? ONLY : targets.slice(OFFSET, OFFSET + LIMIT);

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--proxy-server=http://127.0.0.1:0", "--proxy-bypass-list=localhost;127.0.0.1"],
});
const context = await browser.newContext({
  viewport: { width: WIDTH, height: 800 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
});

const results = [];

for (const path of sample) {
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(900);
    // Calculators only look wrong once they have numbers in them: a value of
    // ₦262,500 is three characters wider than the 0 that ships in the HTML.
    // Exercise the form before measuring.
    if (/calculator|estimator/.test(path)) {
      const inputs = page.locator("input[type='number']");
      const n = Math.min(await inputs.count(), 4);
      for (let i = 0; i < n; i++) {
        await inputs.nth(i).fill(String(i === 0 ? 20 : i === 1 ? 25000 : 7500)).catch(() => {});
      }
      const switches = page.getByRole("switch");
      const count = Math.min(await switches.count(), 4);
      for (let i = 0; i < count; i++) {
        await switches.nth(i).click({ trial: false }).catch(() => {});
      }
      await page.waitForTimeout(700);
    }

    const report = await page.evaluate((vw) => {
      const doc = document.documentElement;

      /**
       * The two ways this bug actually reaches a phone:
       *  a) an element is wider than the viewport, and whatever clips it
       *     (overflow-x-clip on the shell) hides the scrollbar, so the page
       *     simply looks wrong with no way to scroll to the missing part;
       *  b) a label, number or chip is wider than the box that clips it, so
       *     text is sliced off at a card edge.
       * Both are reported from the element that causes them, not its ancestors.
       */
      const clipped = [];
      for (const el of document.querySelectorAll("body *")) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (style.position === "absolute" || style.position === "fixed") continue;

        // A row that scrolls sideways is a deliberate design (tab strips, jump
        // pills, wide tables); its overflow is reachable, not lost.
        let inScroller = false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ps = getComputedStyle(p);
          if (["auto", "scroll"].includes(ps.overflowX)) {
            inScroller = true;
            break;
          }
        }

        const parent = el.parentElement;
        const parentRight = parent ? parent.getBoundingClientRect().right : 0;
        const spillsViewport = r.right > vw + 1;
        const firstSpill =
          !inScroller && spillsViewport && (!parent || parentRight <= vw + 1);

        const directText = Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 1,
        );
        const cutsOwnText =
          !inScroller &&
          directText &&
          ["hidden", "clip"].includes(style.overflowX) &&
          el.scrollWidth - el.clientWidth > 2 &&
          style.whiteSpace !== "normal";

        if (!firstSpill && !cutsOwnText) continue;
        const cls = typeof el.className === "string" ? el.className.slice(0, 140) : "";
        clipped.push({
          tag: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ""),
          cls,
          spill: firstSpill
            ? Math.round(r.right - vw)
            : el.scrollWidth - el.clientWidth,
          width: Math.round(r.width),
          text: (el.textContent || "").trim().slice(0, 45),
        });
      }
      clipped.sort((a, b) => b.spill - a.spill);

      const offenders = [];
      for (const el of document.querySelectorAll("body *")) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right <= vw + 1) continue;
        let clippedByParent = false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ps = getComputedStyle(p);
          if (["hidden", "clip"].includes(ps.overflowX) || ps.overflow === "hidden") {
            clippedByParent = true;
            break;
          }
        }
        if (clippedByParent) continue;
        const id = el.id ? `#${el.id}` : "";
        const cls = typeof el.className === "string" ? el.className.slice(0, 160) : "";
        offenders.push({
          tag: el.tagName.toLowerCase() + id,
          cls,
          right: Math.round(r.right - vw),
          width: Math.round(r.width),
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow: doc.scrollWidth - doc.clientWidth,
        offenders: offenders.slice(0, 12),
        clipped: clipped.slice(0, 10),
      };
    }, WIDTH);
    results.push({ path, ...report });
  } catch (error) {
    results.push({ path, error: String(error).slice(0, 120) });
  } finally {
    await page.close();
  }
}

const broken = results.filter(
  (r) => (r.overflow ?? 0) > 1 || (r.clipped?.length ?? 0) > 0,
);

console.log(`\n=== ${WIDTH}px viewport · ${results.length} routes · ${broken.length} overflowing ===\n`);
for (const r of broken) {
  console.log(`✗ ${r.path}  +${r.overflow}px`);
  for (const o of r.offenders.slice(0, 4)) {
    console.log(`    spill ${o.tag} +${o.right}px w=${o.width} → "${o.cls}"${o.text ? ` | ${o.text}` : ""}`);
  }
  for (const c of r.clipped ?? []) {
    console.log(`    cut   ${c.tag} (${c.spill}px hidden, box ${c.width}) → "${c.cls}"${c.text ? ` | ${c.text}` : ""}`);
  }
}
const clean = results.length - broken.length;
console.log(`\n✓ clean: ${clean}/${results.length}`);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(results, null, 2));
}

await browser.close();
process.exit(broken.length ? 1 : 0);
