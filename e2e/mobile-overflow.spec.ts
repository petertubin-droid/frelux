import { test, expect } from "@playwright/test";

/**
 * Mobile layout regression.
 *
 * A single element a few pixels wider than the phone drags the whole document
 * sideways, or (because the shell clips horizontally) slices labels and price
 * rows off at the edge with no way to scroll to the missing part. Neither shows
 * up on a desktop browser, and both are easy to reintroduce in any card, chip
 * row or control cluster, so the check is mechanical and applies to every route
 * below rather than to the one page that happened to be reported.
 *
 * The deep numeric sweep (form filling, 320px, every tool route, spill sizes)
 * lives in scripts/audit-mobile-overflow.mjs. This spec is the gate: cheap,
 * deterministic, and it fails the build rather than the reader.
 */

const ROUTES = [
  "/",
  "/construction-tools",
  "/screeding-cost-estimator",
  "/cost-estimator",
  "/paint-calculator",
  "/pop-ceiling-calculator",
  "/tile-cost-estimator",
  "/wallpaper-calculator",
  "/window-blind-calculator",
  "/tv-console-calculator",
  "/mathematical-plan-elevation",
  "/structural-calculator",
  "/borehole-water-system-estimator",
  "/marketplace",
  "/my-projects",
  "/escrow",
  "/colors",
  "/learn",
  "/pricing",
];

/** Elements that are wider than the phone, and the box that hides them. */
async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const spill = [];
    const cut = [];

    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // Rows that scroll sideways are a design choice, not a defect.
      let inScroller = false;
      let clippedByAncestor = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (["auto", "scroll"].includes(ps.overflowX)) inScroller = true;
        if (
          ["hidden", "clip"].includes(ps.overflowX) ||
          ps.overflow === "hidden"
        ) {
          clippedByAncestor = true;
        }
      }

      const parentRight = el.parentElement
        ? el.parentElement.getBoundingClientRect().right
        : 0;
      if (
        !inScroller &&
        rect.right > vw + 1 &&
        parentRight <= vw + 1 &&
        style.position !== "absolute" &&
        style.position !== "fixed"
      ) {
        spill.push(
          `${el.tagName.toLowerCase()} +${Math.round(rect.right - vw)}px ${
            typeof el.className === "string" ? el.className.slice(0, 60) : ""
          }`,
        );
      }

      const ownText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 1,
      );
      if (
        !inScroller &&
        !clippedByAncestor &&
        ownText &&
        ["hidden", "clip"].includes(style.overflowX) &&
        style.whiteSpace !== "normal" &&
        el.scrollWidth - el.clientWidth > 2
      ) {
        cut.push(
          `text ${el.tagName.toLowerCase()} loses ${el.scrollWidth - el.clientWidth}px: ${(
            el.textContent || ""
          )
            .trim()
            .slice(0, 30)}`,
        );
      }
    }
    return {
      overflow: document.documentElement.scrollWidth - vw,
      spill: spill.slice(0, 5),
      cut: cut.slice(0, 5),
    };
  });
}

for (const width of [360, 390]) {
  test.describe(`mobile layout at ${width}px`, () => {
    test.use({ viewport: { width, height: 780 } });

    for (const path of ROUTES) {
      test(`${path} does not overflow sideways`, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);

        const result = await measure(page);
        expect(
          result.overflow,
          `document scrolls sideways: ${result.spill}`,
        ).toBeLessThanOrEqual(1);
        expect(result.spill, "element wider than the viewport").toEqual([]);
        expect(
          result.cut,
          "label or number sliced off inside a clipped box",
        ).toEqual([]);
      });
    }
  });
}

test("the bottom navigation clears a bottom ad and keeps its place without one", async ({
  page,
}) => {
  await page.goto("/screeding-cost-estimator", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(400);

  const nav = page.getByRole("navigation", { name: "Bottom navigation" });
  const before = await nav.boundingBox();

  // The slot publishes its height through this variable; nothing published
  // means no ad, and the bar must not have moved.
  const offsetWithNoAd = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue(
      "--frelux-bottom-ad-h",
    ),
  );
  expect(offsetWithNoAd.trim() || "0px").toBe("0px");

  await page.evaluate(() =>
    document.documentElement.style.setProperty("--frelux-bottom-ad-h", "70px"),
  );
  await page.waitForTimeout(350);
  const after = await nav.boundingBox();
  expect(before && after && before.y - after.y).toBe(70);

  // And back to exactly where it started once the ad goes away.
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--frelux-bottom-ad-h", "0px"),
  );
  await page.waitForTimeout(350);
  const restored = await nav.boundingBox();
  expect(restored?.y).toBe(before?.y);
});
