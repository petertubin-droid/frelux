// The 100 reviewed Spanish Learn articles are the only locale pages FRELUX
// allows in the index. Being indexable is not enough: Google has to be told
// that /es/learn/x and /learn/x are the same article in two languages, or the
// pair competes with itself. Prerender writes the alternates into the HTML and
// the sitemap repeats them; these tests fail if either half goes quiet.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SITEMAP = resolve(ROOT, "public/sitemap.xml");
const GEN = resolve(ROOT, "scripts/generate-sitemap.mjs");
const XHTML_NS = "http://www.w3.org/1999/xhtml";

const read = (p: string) => readFileSync(p, "utf8");

describe("spanish article hreflang", () => {
  it("declares the xhtml namespace it uses for alternates", () => {
    expect(read(GEN)).toContain(XHTML_NS);
    if (existsSync(SITEMAP)) expect(read(SITEMAP)).toContain(XHTML_NS);
  });

  it("agrees with prerender about which locales may be indexed", () => {
    // A locale listed here but not indexable upstream would advertise pages
    // that carry noindex, which is a Search Console error per URL.
    const prerender = read(resolve(ROOT, "scripts/prerender.mjs"));
    expect(prerender).toMatch(/const INDEXABLE_LOCALES = \["es"\]/);
    expect(read(GEN)).toMatch(/const INDEXABLE_LOCALE_CODES = \["es"\]/);
  });

  it("pairs every listed spanish article with its english original", () => {
    if (!existsSync(SITEMAP)) return;
    const xml = read(SITEMAP);
    const urls = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    // Library articles only: market-tagged ones live on their market path and
    // are covered by the test below.
    const spanish = urls
      .filter((u) => u.includes("<loc>https://freluxtools.com/es/learn/"))
      .filter((u) => !u.includes("/es/learn/wall-finishing/"));

    for (const entry of spanish) {
      const slug = /\/es\/learn\/([^/]+)\//.exec(entry)?.[1];
      expect(slug, "a Spanish entry must name its slug").toBeTruthy();
      // Every alternate set carries the English original and the Spanish copy,
      // so neither language can be indexed without the other.
      expect(entry).toContain(
        `hreflang="en" href="https://freluxtools.com/learn/${slug}/"`,
      );
      expect(entry).toContain(
        `hreflang="es" href="https://freluxtools.com/es/learn/${slug}/"`,
      );
      expect(entry).toContain('hreflang="x-default"');
    }
  });

  it("pairs market-tagged articles on their market path", () => {
    // US wall-finishing guides live at /learn/wall-finishing/us/<slug>, not
    // /learn/<slug>. Their 50 reviewed Spanish translations were published but
    // unreachable: no page, no alternate, no sitemap entry.
    if (!existsSync(SITEMAP)) return;
    const xml = read(SITEMAP);
    const urls = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    const market = urls.filter((u) =>
      u.includes("<loc>https://freluxtools.com/es/learn/wall-finishing/"),
    );
    expect(market.length).toBeGreaterThan(0);
    for (const entry of market) {
      const slug = /\/es\/learn\/wall-finishing\/[a-z]{2}\/([^/]+)\//.exec(
        entry,
      )?.[1];
      expect(slug).toBeTruthy();
      expect(entry).toContain(
        `hreflang="en" href="https://freluxtools.com/learn/wall-finishing/`,
      );
      expect(entry).toContain(`/${slug}/"`);
    }
  });

  it("gives every listed locale article a page and a crawl path", () => {
    // A localized article with no sibling links is only discoverable through
    // the sitemap, which is exactly how those 50 went missing.
    if (!existsSync(SITEMAP)) return;
    const page = resolve(
      ROOT,
      "dist/es/learn/wall-finishing/us/us-drywall-finish-levels-overview/index.html",
    );
    if (!existsSync(page)) return;
    const html = read(page);
    expect(html).toContain('<div lang="es">');
    expect(html).toContain('href="/es/learn/wall-finishing/us/');
    expect(html).toContain('hreflang="es"');
  });

  it("lists no spanish article that has no reviewed translation", () => {
    if (!existsSync(SITEMAP)) return;
    const xml = read(SITEMAP);
    const urls = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    for (const entry of urls) {
      if (!entry.includes("<loc>https://freluxtools.com/es/")) continue;
      // A bare /es/ page with no alternates is either the locale shell (which
      // must stay out of the sitemap) or an untranslated clone.
      expect(entry).toContain("xhtml:link");
    }
  });
});
