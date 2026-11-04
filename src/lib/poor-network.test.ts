import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loading performance on a weak connection is easy to regress silently: an
 * eagerly attached ad script, a render-blocking image, or a network-first
 * service worker all look fine on a desk with fibre. These assertions keep the
 * decisions that were made deliberately.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf-8");

describe("poor network behaviour", () => {
  it("attaches the ad script only after first paint or first interaction", () => {
    const html = read("index.html");
    expect(html).not.toMatch(
      /<script[^>]*async[^>]*adsbygoogle\.js[^>]*><\/script>/,
    );
    expect(html).toContain("requestIdleCallback(loadAds");
    expect(html).toContain('"pointerdown"');
  });

  it("serves the hero as a srcset of WebP candidates", () => {
    const hero = read("src/components/home/Hero.tsx");
    expect(hero).toContain("construction-site-900.webp 900w");
    expect(hero).toContain("construction-site-1400.webp 1400w");
    expect(hero).toContain("sizes=");
  });

  it("paints navigations from cache and revalidates in the background", () => {
    const sw = read("public/sw-template.js");
    const nav = sw.slice(sw.indexOf("request.mode === 'navigate'"));
    const block = nav.slice(0, nav.indexOf("Same-origin static assets"));
    expect(block).toContain("const cached = await cache.match(request)");
    expect(block).toContain("event.waitUntil(network)");
    expect(block).not.toContain("if (cached) {\n          return cached;");
  });

  it("caches the WebP assets immutably at the edge", () => {
    expect(read("netlify.toml")).toContain('for = "/*.webp"');
  });
});
