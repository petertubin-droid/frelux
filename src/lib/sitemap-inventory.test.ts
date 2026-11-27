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
import { LOCALE_PREFIXES } from "../../scripts/lib/locale-paths.mjs";

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
    const locs = [
      ...readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g),
    ].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(500);
    // Learn articles are read from the database at build time. A build with no
    // reachable Learn tables (local dev, or a sandbox with no Supabase env)
    // emits none of them, and the manifest records that as families.learnArticles
    // === 0. Only in that case are the article URLs exempt, because the family
    // was never produced rather than forgotten. A build that did have the data
    // still has to emit every article it advertises.
    const manifestFile = join(root, "dist/_prerender-manifest.json");
    const families = existsSync(manifestFile)
      ? (
          JSON.parse(readFileSync(manifestFile, "utf8")) as {
            families?: { learnArticles?: number };
          }
        ).families
      : undefined;
    const learnArticlesEmitted = (families?.learnArticles ?? 0) > 0;
    // Every Learn URL below the hub is database content: articles, their
    // categories, the wall-finishing market hubs and the translated copies.
    const learnUrl = (path: string) =>
      /^\/learn\//.test(path) || /^\/[a-z]{2}\/learn\//.test(path);
    const missing = locs.filter((u) => {
      const path = u.replace("https://freluxtools.com", "");
      if (!learnArticlesEmitted && learnUrl(path)) return false;
      const file =
        path === "/" ? "dist/index.html" : join("dist", path, "index.html");
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
        (m) =>
          m[1].replace("https://freluxtools.com", "").replace(/\/$/, "") || "/",
      ),
    );
    const { paths, noindex } = JSON.parse(
      readFileSync(manifestFile, "utf8"),
    ) as { paths: string[]; noindex?: string[] };
    // Two kinds of emitted page are deliberately not advertised: a page the
    // build marked noindex, and any locale-prefixed path, because public/_headers
    // sends X-Robots-Tag noindex for /<locale>/* at the edge. Neither is a page
    // the sitemap forgot; a sitemap that listed them would be advertising URLs
    // Google is told to ignore.
    const excluded = new Set(noindex ?? []);
    for (const p of paths) {
      if (
        LOCALE_PREFIXES.some(
          (code) => p === `/${code}` || p.startsWith(`/${code}/`),
        )
      ) {
        excluded.add(p);
      }
    }
    const unlisted = paths
      .filter((p: string) => !excluded.has(p))
      .filter((p: string) => !locs.has(p === "/" ? "/" : p.replace(/\/$/, "")));
    expect(unlisted).toEqual([]);
  });

  it("never advertises a page the build marked noindex", () => {
    const sitemap = join(root, "dist/sitemap.xml");
    const manifestFile = join(root, "dist/_prerender-manifest.json");
    if (!existsSync(sitemap) || !existsSync(manifestFile)) return;
    const { noindex } = JSON.parse(readFileSync(manifestFile, "utf8")) as {
      noindex?: string[];
    };
    const listed = new Set(
      [...readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) =>
          m[1].replace("https://freluxtools.com", "").replace(/\/$/, "") || "/",
      ),
    );
    const leaked = (noindex ?? []).filter((p) =>
      listed.has(p.replace(/\/$/, "")),
    );
    expect(leaked).toEqual([]);
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
    expect(
      existsSync(join(root, "dist/colors/paint/pure-white/index.html")),
    ).toBe(true);
  });
});

describe("robots and sitemap consistency", () => {
  it("never advertises /color-preview in sitemap since it is disallowed and noindexed", () => {
    const sitemap = join(root, "public/sitemap.xml");
    if (!existsSync(sitemap)) return;
    const xml = readFileSync(sitemap, "utf8");
    expect(xml).not.toContain(
      "<loc>https://freluxtools.com/color-preview/</loc>",
    );
  });

  it("never advertises /tools/offline-sync in sitemap since it is excluded and noindexed", () => {
    const sitemap = join(root, "public/sitemap.xml");
    if (!existsSync(sitemap)) return;
    const xml = readFileSync(sitemap, "utf8");
    expect(xml).not.toContain(
      "<loc>https://freluxtools.com/tools/offline-sync/</loc>",
    );
  });

  it("advertises public /material-prices in the sitemap", () => {
    const sitemap = join(root, "public/sitemap.xml");
    if (!existsSync(sitemap)) return;
    const xml = readFileSync(sitemap, "utf8");
    expect(xml).toContain(
      "<loc>https://freluxtools.com/material-prices/</loc>",
    );
  });
});
