// Google refused the live sitemap with "Incorrect namespace" because three
// generators wrote http://www.sitemaps.org/sitemap/0.9 (missing "/schemas").
// The files must declare the exact namespace from the sitemap protocol; a
// typo makes the whole file invalid even when it parses fine locally.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";

const SOURCES = [
  "netlify/functions/sitemap.js",
  "supabase/functions/sitemap/index.ts",
  "scripts/generate-sitemap.mjs",
  "public/sitemap.xml",
];

describe("sitemap namespace", () => {
  it.each(SOURCES)("%s declares the protocol namespace", (file) => {
    const text = readFileSync(resolve(ROOT, file), "utf8");
    expect(text).toContain(NAMESPACE);
    // Guard the exact typo that broke Search Console: the namespace without
    // the /schemas segment.
    expect(text).not.toMatch(/sitemaps\.org\/sitemap\/0\.9/);
  });

  it("every generated urlset closes properly", () => {
    for (const file of SOURCES) {
      const text = readFileSync(resolve(ROOT, file), "utf8");
      expect(text).toContain("</urlset>");
    }
  });
});
