/**
 * Search visibility coverage for the tool catalogue.
 *
 * A new category or tool is only discoverable if every layer knows about it:
 * the SPA route, the prerendered HTML, the noscript body, the sitemap, and the
 * crawler-facing summary. When Interior Decors shipped, the catalogue and the
 * page were correct but the category had no prerendered page, no sitemap entry
 * and no static body, so the page existed without being reachable.
 *
 * These tests fail on that gap instead of leaving it for an audit to find.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
} from "@/config/construction-tools";
import {
  CATEGORY_LABELS,
  CATEGORY_PATHS,
} from "../../../scripts/lib/tools-directory-content.mjs";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const prerenderSrc = read("scripts/prerender.mjs");
const seoMapSrc = read("scripts/seo-content-map.mjs");
const sitemapGenSrc = read("scripts/generate-sitemap.mjs");
const sitemapXml = read("public/sitemap.xml");
const llmsTxt = read("public/llms.txt");

const SITE = "https://freluxtools.com";
const categoryPaths = TOOL_CATEGORIES.map((c) => `/tools/${c.id}`);
const toolPaths = CONSTRUCTION_TOOLS.map((t) => t.to);

describe("category parity across the visibility layers", () => {
  it("describes every catalogue category in the prerender directory maps", () => {
    const gaps: string[] = [];
    for (const category of TOOL_CATEGORIES) {
      const id = category.id as keyof typeof CATEGORY_LABELS;
      if (!CATEGORY_LABELS[id]) gaps.push(`${category.id}: no label`);
      if (!CATEGORY_PATHS[id]) gaps.push(`${category.id}: no path`);
      if (CATEGORY_LABELS[id] !== category.label) {
        gaps.push(
          `${category.id}: prerender says "${CATEGORY_LABELS[id]}", catalogue says "${category.label}"`,
        );
      }
    }
    expect(gaps).toEqual([]);
  });

  it("prerenders a page for every category", () => {
    const missing = categoryPaths.filter(
      (p) => !prerenderSrc.includes(`path: "${p}"`),
    );
    expect(missing).toEqual([]);
  });

  it("gives every category a noscript body", () => {
    const missing = categoryPaths.filter((p) => !seoMapSrc.includes(`"${p}"`));
    expect(missing).toEqual([]);
  });

  it("lists every category in the sitemap, in both halves", () => {
    const missingFromGenerator = categoryPaths.filter(
      (p) => !sitemapGenSrc.includes(p),
    );
    const missingFromXml = categoryPaths.filter(
      (p) => !sitemapXml.includes(`${SITE}${p}/`),
    );
    expect({ missingFromGenerator, missingFromXml }).toEqual({
      missingFromGenerator: [],
      missingFromXml: [],
    });
  });
});

describe("tool parity across the visibility layers", () => {
  it("lists every catalogue tool in the sitemap", () => {
    const missing = toolPaths.filter(
      (p) => !sitemapXml.includes(`${SITE}${p}/`),
    );
    expect(missing).toEqual([]);
  });

  it("routes every catalogue tool in the application router", () => {
    const app = read("src/App.tsx");
    const missing = toolPaths.filter((p) => !app.includes(`path="${p}"`));
    expect(missing).toEqual([]);
  });

  it("names the blind calculator in the crawler summary, with its guide", () => {
    expect(llmsTxt).toContain(`${SITE}/window-blind-calculator`);
    expect(llmsTxt).toContain(`${SITE}/tools/interiors`);
    expect(llmsTxt).toContain(`${SITE}/faq/window-blinds/`);
  });

  it("finds the blind calculator filed under Interior Decors", () => {
    const interiors = TOOL_CATEGORIES.find((c) => c.id === "interiors");
    expect(interiors?.label).toBe("Interior Decors");
    const blinds = CONSTRUCTION_TOOLS.find(
      (t) => t.to === "/window-blind-calculator",
    );
    expect(blinds?.category).toBe("interiors");
  });
});

describe("no page inherits another page's structured data", () => {
  const shell = read("index.html");

  it("ships no route specific FAQPage or breadcrumb in the shared template", () => {
    // A template block is copied into all 1635 prerendered pages, so anything
    // route specific in it becomes a false claim on every other page.
    expect(shell).not.toContain('id="faq-structured-data"');
    expect(shell).not.toContain('id="breadcrumb-structured-data"');
  });

  it("strips both blocks in the prerenderer as a second line of defence", () => {
    expect(prerenderSrc).toContain('id="faq-structured-data"');
    expect(prerenderSrc).toContain('id="breadcrumb-structured-data"');
  });
});
