/**
 * Crawl-inventory guard for the domain consolidation.
 *
 * Two independent sitemap producers exist:
 *   1. scripts/generate-sitemap.mjs -> dist/sitemap.xml (build time)
 *   2. netlify/functions/sitemap.js -> live /sitemap.xml (request time, DB aware)
 *
 * Both must list only URLs the site can actually serve, otherwise Google is
 * handed 404s and duplicate home pages during (and after) a domain migration.
 * These tests pin the invariants that were violated on the live site on
 * 2026-11-01: 1,216 market-template 404s, 724 colour pages serving the home
 * shell, and 150 locale clone URLs.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fnSrc = readFileSync(join(root, "netlify/functions/sitemap.js"), "utf8");

describe("sitemap serving path", () => {
  it("serves the build artifact instead of a runtime-generated sitemap", () => {
    const toml = readFileSync(join(root, "netlify.toml"), "utf8");
    expect(toml).not.toContain('to = "/.netlify/functions/sitemap"');
  });
});

describe("live sitemap function", () => {
  it("does not emit locale clone URLs that serve the English shell", () => {
    expect(fnSrc).not.toContain("add(`/${t.locale}${base}`");
  });

  it("does not emit colour detail pages that are not prerendered", () => {
    expect(fnSrc).not.toContain("add(`/colors/paint/${c.slug}/`");
  });

  it("does not emit colour palette pages that are not prerendered", () => {
    expect(fnSrc).not.toContain("color_combinations");
  });

  it("builds market template URLs from the prerender catalog, not from DB slugs", () => {
    expect(fnSrc).not.toContain("/rest/v1/calculator_templates");
  });

  it("still emits every market template hub", () => {
    expect(fnSrc).toContain("add(`/market/${code}/templates/`");
  });

  it("uses the canonical custom domain for the sitemap host", () => {
    const hosts = [...fnSrc.matchAll(/https:\/\/[a-z0-9.-]+/g)]
      .map((m) => m[0])
      .filter((h) => !h.includes("supabase") && !h.includes("w3.org"));
    expect(hosts.every((h) => h === "https://freluxtools.com")).toBe(true);
  });
});

describe("build sitemap", () => {
  it("lists only URLs that were actually prerendered", () => {
    const sitemap = join(root, "dist/sitemap.xml");
    if (!existsSync(sitemap)) return; // dist exists only after a build
    const locs = [...readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(500);
    const missing = locs.filter((u) => {
      const path = u.replace("https://freluxtools.com", "");
      const file = path === "/" ? "dist/index.html" : join("dist", path, "index.html");
      return !existsSync(join(root, file));
    });
    expect(missing).toEqual([]);
  });

  it("advertises every page the build actually emitted", () => {
    const sitemap = join(root, "dist/sitemap.xml");
    const manifestFile = join(root, "dist/_prerender-manifest.json");
    if (!existsSync(sitemap) || !existsSync(manifestFile)) return;
    const locs = new Set(
      [...readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => m[1].replace("https://freluxtools.com", "").replace(/\/$/, "") || "/",
      ),
    );
    const { paths } = JSON.parse(readFileSync(manifestFile, "utf8"));
    const unlisted = paths.filter((p: string) => !locs.has(p === "/" ? "/" : p.replace(/\/$/, "")));
    expect(unlisted).toEqual([]);
  });

  it("prerenders the colour, palette and template families it advertises", () => {
    const sitemap = join(root, "dist/sitemap.xml");
    const manifestFile = join(root, "dist/_prerender-manifest.json");
    if (!existsSync(sitemap) || !existsSync(manifestFile)) return;
    const xml = readFileSync(sitemap, "utf8");
    const { families } = JSON.parse(readFileSync(manifestFile, "utf8")) as {
      families?: { colours: number };
    };
    // Colour pages used to be advertised without a prerendered file, so they
    // served the home shell. Both halves must now agree, in whichever direction
    // the build had data for: a build with no reachable database has to stay
    // quiet about the family, and a build with colour rows has to list it.
    if (!families || families.colours === 0) {
      expect(xml).not.toContain("/colors/paint/");
      return;
    }
    expect(xml).toContain("/colors/paint/");
    expect(existsSync(join(root, "dist/colors/paint/pure-white/index.html"))).toBe(true);
  });
});
