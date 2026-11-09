import { test, expect, type Page } from "@playwright/test";

/**
 * Phone-width layout gate.
 *
 * A single element that cannot shrink (a grid child keeping its min-content
 * width, a button that will not wrap its label) widens the whole document or
 * gets sliced off at a card edge. Both are invisible on a desktop screen and
 * easy to reintroduce, so this walks the pages that carry the widest content
 * at a real phone width and fails on the element that spilled.
 *
 * Deliberate horizontal scrollers (tab strips, wide tables) are not failures:
 * their overflow is reachable by swiping.
 */

const ROUTES = [
  "/",
  "/cost-estimator",
  "/screeding-calculator?mode=cost",
  "/screeding-cost-estimator",
  "/finish-estimator",
  "/pop-ceiling-calculator",
  "/tile-calculator",
  "/paint-calculator",
  "/colors",
  "/compliance/data-residency",
  "/tools/offline-sync",
  "/tools/finishes/pop",
  "/tools/finishes/tiles",
  "/tyrolene-estimator",
  "/material-price-index",
  "/marketplace",
  // The standalone takeoff page renders ten engines from one template; each
  // returns a different result shape, so each needs its own pass with the
  // Calculate button actually pressed.
  "/masonry-calculator",
  "/plastering-calculator",
  "/drywall-calculator",
  "/paving-calculator",
  "/drainage-calculator",
  "/septic-sizing-calculator",
  "/temporary-works-calculator",
  "/insulation-calculator",
  "/demolition-calculator",
];

async function spill(page: Page) {
  return page.evaluate(() => {
    // The display scale is applied at the viewport (src/lib/display-viewport.ts),
    // so on a phone the layout is deliberately wider than the screen and scaled
    // down to fit: 412 CSS px at 50% lays out at 824. Measure against the layout
    // viewport the page actually has. Anything past that still spills off the
    // physical screen, which is what this gate exists to catch.
    const width = document.documentElement.clientWidth || window.innerWidth;
    const found: { tag: string; cls: string; over: number; text: string }[] =
      [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (cs.position === "absolute" || cs.position === "fixed") continue;
      // Text kept for crawlers and screen readers ("sr-only") sits inside a
      // 1px clipped box: it is not visible, so it cannot spill. Its children
      // are position:static, so the checks above miss them and every
      // build-sequence step reported as an overflow.
      let clipped = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const pcs = getComputedStyle(p);
        const box = { w: p.clientWidth, h: p.clientHeight };
        const hidden =
          pcs.overflow === "hidden" ||
          pcs.overflowX === "hidden" ||
          (pcs.clipPath || "").startsWith("inset(50%");
        if (hidden && (box.w <= 1 || box.h <= 1)) {
          clipped = true;
          break;
        }
      }
      if (clipped) continue;
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      let inScroller = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (["auto", "scroll"].includes(ps.overflowX)) {
          inScroller = true;
          break;
        }
      }
      if (inScroller) continue;
      const parentRight = el.parentElement
        ? el.parentElement.getBoundingClientRect().right
        : 0;
      if (box.right > width + 1 && parentRight <= width + 1) {
        found.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 120),
          over: Math.round(box.right - width),
          text: (el.textContent || "").trim().slice(0, 40),
        });
        continue;
      }

      // A label that cannot wrap keeps its box inside the card but paints its
      // text past the screen edge. The box check above cannot see that, so the
      // text itself is measured.
      const directText = Array.from(el.childNodes).filter(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim(),
      );
      for (const node of directText) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const textBox = range.getBoundingClientRect();
        if (textBox.width && textBox.right > width + 1) {
          found.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 120),
            over: Math.round(textBox.right - width),
            text: (node.textContent || "").trim().slice(0, 40),
          });
          break;
        }
      }
    }
    return {
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      layoutWidth: width,
      found: found.sort((a, b) => b.over - a.over).slice(0, 5),
    };
  });
}

test.describe("no layout spills on a phone", () => {
  test.setTimeout(180000);

  for (const route of ROUTES) {
    test(`360px ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Wait for real content: an unpainted page has no width to spill.
      await page
        .locator(".select-card, main input[type='number']")
        .first()
        .waitFor({ timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(1200);

      // Long figures are what actually break the row: an empty field shows a
      // placeholder, five digits show a ₦ sign and a comma.
      if (/calculator|estimator|cost/i.test(route)) {
        const inputs = page.locator("input[type='number']");
        for (let i = 0; i < Math.min(await inputs.count(), 4); i++) {
          await inputs
            .nth(i)
            .fill(String(i === 0 ? 20 : 25000))
            .catch(() => {});
        }
        const switches = page.getByRole("switch");
        for (let i = 0; i < Math.min(await switches.count(), 3); i++) {
          await switches
            .nth(i)
            .click({ timeout: 1000 })
            .catch(() => {});
        }
        await page.waitForTimeout(500);
      }

      // Results only exist after the calculate action, and the results block is
      // where the widest content lives. Submit, then check the summary text for
      // a stringified object, which is what broke the plastering card.
      if (/calculator|estimator|takeoff|sizing|flooring/i.test(route)) {
        await page
          .getByRole("button", { name: /^(calculate|estimate|compute)/i })
          .first()
          .click({ timeout: 3000 })
          .catch(() => {});
        await page.waitForTimeout(900);
        const text = await page
          .locator("main")
          .first()
          .innerText()
          .catch(() => "");
        expect(
          text,
          "a result row is printing raw JSON instead of a readable value",
        ).not.toMatch(/\{"?[A-Za-z_]+"?\s*:/);
      }

      const result = await spill(page);
      // Guard the gate itself: if the layout viewport were narrow, a spill
      // could hide behind the tolerance below.
      expect(result.layoutWidth, "layout viewport measured").toBeGreaterThan(0);
      expect(
        result.overflow,
        "document is wider than the layout viewport",
      ).toBeLessThanOrEqual(1);
      expect(
        result.found,
        `elements spilling the viewport: ${JSON.stringify(result.found)}`,
      ).toEqual([]);
    });
  }

  test("320px calculators", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const route of [
      "/finish-estimator",
      "/pop-ceiling-calculator",
      "/tile-calculator",
      "/screeding-calculator?mode=cost",
      "/tyrolene-estimator",
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const result = await spill(page);
      expect(
        result.overflow,
        `${route} is wider than 320px`,
      ).toBeLessThanOrEqual(1);
      expect(
        result.found,
        `${route} spills at 320px: ${JSON.stringify(result.found)}`,
      ).toEqual([]);
    }
  });
});
