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
  it("loads the ad script without blocking the first paint", () => {
    const html = read("index.html");
    // The loader is in the served source because AdSense will not verify the
    // site without it. It still has to stay off the critical path, so it is
    // async and the request pause is bootstrapped before it appears.
    const tag = html.match(/<script[^>]*adsbygoogle\.js[^>]*><\/script>/)?.[0];
    expect(tag).toBeTruthy();
    expect(tag).toContain("async");
    expect(html.indexOf("pauseAdRequests = 1")).toBeLessThan(
      html.indexOf("adsbygoogle.js?client="),
    );
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
