import { test } from "@playwright/test";

const PAGES = [
  "/pop-ceiling-calculator?mode=cost",
  "/cost-estimator",
  "/screeding-cost-estimator",
  "/tile-cost-estimator",
];

test("no horizontal overflow with labour section expanded (mobile)", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const path of PAGES) {
    await page.goto(path, { waitUntil: "networkidle" });
    const switches = page.getByRole("switch");
    const count = await switches.count();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const sw = switches.nth(i);
      const label = (await sw.getAttribute("aria-label")) || "";
      if (/labour/i.test(label)) {
        const checked = await sw.getAttribute("aria-checked");
        if (checked === "false") {
          await sw.click();
          clicked = true;
        }
      }
    }
    await page.waitForTimeout(600);

    const overflow = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const offenders = [];
      const all = document.querySelectorAll("*");
      for (const el of all) {
        const r = el.getBoundingClientRect();
        // ignore offscreen-drawer patterns (right <= 0 or left <= -vw)
        if (r.width > 0 && r.right > vw + 1 && r.left >= 0) {
          offenders.push({
            tag: el.tagName,
            cls: (el.className || "").toString().slice(0, 90),
            left: Math.round(r.left),
            right: Math.round(r.right),
            w: Math.round(r.width),
          });
        }
      }
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: vw,
        labourSwitchFound: document.querySelectorAll(
          '[role="switch"][aria-label*="labour" i]',
        ).length,
        offenders: offenders.slice(0, 8),
      };
    });

    console.log(`\n=== ${path} ===`);
    console.log(JSON.stringify(overflow, null, 1));
    if (clicked && path === "/pop-ceiling-calculator?mode=cost") {
      // screenshot the labour section for visual check
      const sw = page
        .locator('[role="switch"][aria-label*="labour" i]')
        .first();
      const box = await sw.boundingBox();
      await page.screenshot({
        path: `test-results/labour-${path.replace(/\W/g, "_")}.png`,
        clip: { x: 0, y: Math.max(0, box.y - 100), width: 393, height: 500 },
      });
    }
  }
});
