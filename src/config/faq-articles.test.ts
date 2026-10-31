import { describe, expect, it } from "vitest";
import {
  FAQ_ARTICLES,
  FAQ_ARTICLE_SECTIONS,
  getFaqArticle,
} from "@/config/faq-articles";
import { TOOL_FAQS } from "@/config/tool-faqs";

describe("FAQ article bodies", () => {
  it("covers every registry group", () => {
    for (const group of TOOL_FAQS) {
      expect(
        getFaqArticle(group.slug),
        `${group.slug} has no article body`,
      ).toBeDefined();
    }
    expect(Object.keys(FAQ_ARTICLES).sort()).toEqual(
      TOOL_FAQS.map((g) => g.slug).sort(),
    );
  });

  it("renders five sections per article: description, functions, advantages, limits, answers", () => {
    expect(FAQ_ARTICLE_SECTIONS).toHaveLength(4);
    for (const group of TOOL_FAQS) {
      const article = getFaqArticle(group.slug)!;
      expect(
        article.summary.length,
        `${group.slug} summary too short`,
      ).toBeGreaterThan(30);
      expect(
        article.description.length,
        `${group.slug} description too short`,
      ).toBeGreaterThan(80);
      expect(
        article.functions.length,
        `${group.slug} functions`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        article.advantages.length,
        `${group.slug} advantages`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        article.limits.length,
        `${group.slug} limits`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        group.questions.length,
        `${group.slug} answers`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every line substantial and free of invented prices", () => {
    const pricePattern = /(?:₦|\$|£|€)\s?\d/;
    const taxPattern = /\b\d+(?:\.\d+)?\s?%\s?(?:vat|tax|gst)\b/i;
    for (const [slug, article] of Object.entries(FAQ_ARTICLES)) {
      const lines = [
        article.summary,
        article.description,
        ...article.functions,
        ...article.advantages,
        ...article.limits,
      ];
      for (const line of lines) {
        expect(line.trim().length, `${slug} has an empty line`).toBeGreaterThan(
          20,
        );
        expect(pricePattern.test(line), `${slug} quotes a price`).toBe(false);
        expect(taxPattern.test(line), `${slug} states a tax rate`).toBe(false);
      }
    }
  });

  it("states the tax position honestly on every tool that totals money", () => {
    for (const slug of [
      "paint-calculator",
      "foundation-calculator",
      "steel-beam-calculator",
      "client-estimate",
    ]) {
      const article = getFaqArticle(slug)!;
      const text = [...article.limits, ...article.functions]
        .join(" ")
        .toLowerCase();
      expect(text, `${slug} never mentions tax`).toContain("tax");
      expect(text, `${slug} hardcodes a tax rate`).not.toMatch(/\d+\s?%/);
    }
  });

  it("has no article for an unknown slug", () => {
    expect(getFaqArticle("does-not-exist")).toBeUndefined();
  });
});
