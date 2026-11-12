import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:4173";
const ROUTES = (process.env.ROUTES || "/,/products/,/pro-connect/,/calculator/paint,/learn/").split(",");

const browser = await chromium.launch();
const results = [];

for (const route of ROUTES) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  // CPU throttle 4x + slow 4G to approximate a mid-range phone.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: 0, longTaskMs: 0, tbt: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__perf.lcp = Math.max(window.__perf.lcp, entry.startTime);
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__perf.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__perf.longTasks += 1;
        window.__perf.longTaskMs += entry.duration;
        window.__perf.tbt += Math.max(0, entry.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });
  });

  let bytes = 0;
  page.on("response", (response) => {
    const headers = response.headers();
    const length = Number(headers["content-length"] || 0);
    if (Number.isFinite(length)) bytes += length;
  });

  const started = Date.now();
  await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
  const loadMs = Date.now() - started;
  await page.waitForTimeout(2500);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((p) => p.name === "first-contentful-paint");
    return {
      fcp: Math.round(fcp ? fcp.startTime : 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
      requests: performance.getEntriesByType("resource").length,
      ...window.__perf,
      lcp: Math.round(window.__perf.lcp),
      cls: Number(window.__perf.cls.toFixed(3)),
      tbt: Math.round(window.__perf.tbt),
      longTaskMs: Math.round(window.__perf.longTaskMs),
    };
  });

  // Scroll the page to catch late layout work and long tasks during interaction.
  const scrollStart = Date.now();
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  const scrollMs = Date.now() - scrollStart;
  const afterScroll = await page.evaluate(() => ({
    tbt: Math.round(window.__perf.tbt),
    cls: Number(window.__perf.cls.toFixed(3)),
  }));

  results.push({ route, loadMs, jsBytesKB: Math.round(bytes / 1024), scrollMs, ...metrics, scrollTbt: afterScroll.tbt, scrollCls: afterScroll.cls });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
