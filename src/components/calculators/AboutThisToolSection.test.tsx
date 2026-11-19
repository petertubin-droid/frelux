import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ABOUT_TOOL_ROUTES,
  METHOD_BY_SLUG,
  VERIFIED_STANDARDS,
  getAboutToolConfig,
  getAboutToolFaqs,
} from "@/config/about-this-tool";
import { CONSTRUCTION_TOOLS } from "@/config/construction-tools";

function sourceCorpus(): string {
  const parts: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) {
        parts.push(readFileSync(full, "utf8"));
      }
    }
  };
  walk(join(process.cwd(), "src"));
  return parts.join("\n");
}

describe("About This Tool content registry", () => {
  it("covers every existing catalogued tool route without changing the catalog", () => {
    expect(ABOUT_TOOL_ROUTES.length).toBeGreaterThan(0);
    for (const route of ABOUT_TOOL_ROUTES) {
      const content = getAboutToolConfig(route);
      expect(content, route).toBeDefined();
      expect(content?.route).toBe(route);
      expect(content?.scope.trim().length).toBeGreaterThan(0);
      expect(content?.inputs.trim().length).toBeGreaterThan(0);
      expect(content?.result.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses the existing FAQ registry and does not invent FAQ schema copy", () => {
    const route = "/paint-calculator";
    const faqs = getAboutToolFaqs(route);
    expect(faqs.length).toBeGreaterThan(0);
    expect(faqs[0]).toHaveProperty("question");
    expect(faqs[0]).toHaveProperty("answer");
  });

  it("publishes no formula or rate assertion the calculator does not implement", () => {
    // Formulas and default rates are only asserted where a tool's own engine
    // has been checked; nothing here is filled in for coverage's sake.
    for (const route of ABOUT_TOOL_ROUTES) {
      const content = getAboutToolConfig(route)!;
      expect(content.verifiedFormula).toBeUndefined();
      expect(content.verifiedAssumptions).toBeUndefined();
    }
  });

  it("attaches methodology only for tools with written, verified copy", () => {
    const slugs = new Set(CONSTRUCTION_TOOLS.map((tool) => tool.slug));
    for (const slug of Object.keys(METHOD_BY_SLUG)) {
      expect(slugs.has(slug), slug).toBe(true);
    }
    for (const route of ABOUT_TOOL_ROUTES) {
      const content = getAboutToolConfig(route)!;
      if (METHOD_BY_SLUG[content.slug]) {
        expect(content.methodology?.trim().length ?? 0).toBeGreaterThan(40);
      } else {
        expect(content.methodology).toBeUndefined();
      }
    }
  });

  it("names a standard only where the repository cites it", () => {
    const corpus = sourceCorpus();
    for (const [slug, standards] of Object.entries(VERIFIED_STANDARDS)) {
      expect(standards.length).toBeGreaterThan(0);
      for (const standard of standards) {
        for (const token of standard.code.split(/\s+/).filter(Boolean)) {
          expect(
            corpus.includes(token),
            `${slug}: ${standard.code} (${token})`,
          ).toBe(true);
        }
        expect(standard.name.trim().length).toBeGreaterThan(10);
        expect(standard.use.trim().length).toBeGreaterThan(10);
      }
    }
  });
});
