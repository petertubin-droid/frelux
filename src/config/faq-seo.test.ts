import { describe, expect, it } from "vitest";
import { faqSeoFor } from "@/config/faq-seo";
import { ALL_FAQ_ARTICLES } from "@/config/faq-articles";
import { TOOL_FAQS } from "@/config/tool-faqs";

const rows = TOOL_FAQS.map((group) => {
  const article = ALL_FAQ_ARTICLES[group.slug];
  return {
    slug: group.slug,
    seo: faqSeoFor(
      {
        slug: group.slug,
        name: group.name,
        route: group.route,
        category: group.category,
      },
      article,
    ),
  };
});

describe("FAQ article SEO metadata", () => {
  it("gives every article page a title short enough to display in full", () => {
    for (const row of rows) {
      expect(row.seo.title.length, row.slug).toBeGreaterThan(8);
      expect(row.seo.title.length, row.slug).toBeLessThanOrEqual(62);
      expect(row.seo.title.trim(), row.slug).toBe(row.seo.title);
    }
  });

  it("writes a description long enough to be useful and short enough not to be cut", () => {
    for (const row of rows) {
      expect(row.seo.description.length, row.slug).toBeGreaterThanOrEqual(80);
      expect(row.seo.description.length, row.slug).toBeLessThanOrEqual(158);
      expect(row.seo.description, row.slug).toMatch(/[a-z)]\.?$/i);
    }
  });

  it("keeps titles and descriptions unique across the set", () => {
    const titles = rows.map((r) => r.seo.title);
    const descriptions = rows.map((r) => r.seo.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("names the tool in the keywords for every page", () => {
    for (const row of rows) {
      expect(row.seo.keywords.toLowerCase(), row.slug).toContain(
        row.seo.title.toLowerCase().split(":")[0].slice(0, 12),
      );
      expect(row.seo.keywords, row.slug).toContain("Nigeria");
    }
  });
});
