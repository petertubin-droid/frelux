/**
 * Tests for Google structured data compliance on Learn articles.
 *
 * Google requires the following for Article rich results:
 * - @type must be "Article" (or NewsArticle, BlogPosting)
 * - headline must be present
 * - author must be present (Person or Organization)
 * - publisher must be present with logo
 * - datePublished must be present and valid ISO date
 * - image is strongly recommended
 * - mainEntityOfPage is recommended
 *
 * For BreadcrumbList:
 * - itemListElement must have at least 2 items
 * - Each item must have ListItem @type, position, name, item URL
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/article
 * @see https://developers.google.com/search/docs/appearance/structured-data/breadcrumbs
 */

import { describe, it, expect } from "vitest";

// Simulate the structured data built by LearnArticle.tsx
function buildArticleStructuredData(
  article: {
    title: string;
    meta_description: string | null;
    excerpt: string | null;
    author: string | null;
    content: string;
    cover_image_url: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    meta_keywords: string | null;
    category_slug: string;
  },
  articleSlug: string,
) {
  const SITE_URL = "https://freluxtools.netlify.app";
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.meta_description ?? article.excerpt ?? "",
      author: article.author
        ? { "@type": "Person", name: article.author }
        : { "@type": "Organization", name: "FRELUX PROJECT CALC" },
      publisher: {
        "@type": "Organization",
        name: "FRELUX PROJECT CALC",
        logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
      },
      datePublished: article.published_at ?? article.created_at,
      dateModified: article.updated_at,
      image: article.cover_image_url ? [article.cover_image_url] : undefined,
      articleBody: article.content.slice(0, 5000),
      wordCount: article.content.split(/\s+/).length,
      keywords: article.meta_keywords ?? undefined,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${SITE_URL}/learn/${articleSlug}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Learn",
          item: `${SITE_URL}/learn`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: article.category_slug.replace(/-/g, " "),
          item: `${SITE_URL}/learn/category/${article.category_slug}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: article.title,
          item: `${SITE_URL}/learn/${articleSlug}`,
        },
      ],
    },
  ];
}

function makeValidArticleData(): {
  title: string;
  meta_description: string | null;
  excerpt: string | null;
  author: string | null;
  content: string;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  meta_keywords: string | null;
  category_slug: string;
} {
  return {
    title: "The Complete Guide to Painting Interior Walls Like a Professional",
    meta_description:
      "Step by step guide to painting interior walls like a pro.",
    excerpt: "Learn every step of painting interior walls.",
    author: "Frelux Editorial Team",
    content:
      "## Introduction\n\nThis is a comprehensive article about painting. " +
      "word ".repeat(400),
    cover_image_url: "https://example.com/cover.jpg",
    published_at: "2026-08-27T00:00:00Z",
    created_at: "2026-08-27T00:00:00Z",
    updated_at: "2026-08-27T00:00:00Z",
    meta_keywords: "painting, guide, interior walls",
    category_slug: "painting-guides",
  };
}

describe("Article Structured Data — Google Compliance", () => {
  describe("Article schema", () => {
    it("has @context set to schema.org", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article["@context"]).toBe("https://schema.org");
    });

    it("has @type set to Article", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article["@type"]).toBe("Article");
    });

    it("has headline matching article title", () => {
      const data = makeValidArticleData();
      const [article] = buildArticleStructuredData(data, "test-slug");
      expect(article.headline).toBe(data.title);
    });

    it("has author as Person when author is present", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.author!["@type"]).toBe("Person");
      expect(article.author!.name).toBe("Frelux Editorial Team");
    });

    it("has author as Organization when author is null", () => {
      const data = makeValidArticleData();
      data.author = null;
      const [article] = buildArticleStructuredData(data, "test-slug");
      expect(article.author!["@type"]).toBe("Organization");
      expect(article.author!.name).toBe("FRELUX PROJECT CALC");
    });

    it("has publisher with Organization type and logo", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.publisher!["@type"]).toBe("Organization");
      expect(article.publisher!.name).toBe("FRELUX PROJECT CALC");
      expect(article.publisher!.logo["@type"]).toBe("ImageObject");
      expect(article.publisher!.logo.url).toContain("logo.png");
    });

    it("has datePublished in ISO format", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.datePublished).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it("has dateModified", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.dateModified).toBeDefined();
    });

    it("includes image array when cover image exists", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.image).toBeInstanceOf(Array);
      expect(article.image![0]).toBe("https://example.com/cover.jpg");
    });

    it("image is undefined when no cover image", () => {
      const data = makeValidArticleData();
      data.cover_image_url = null;
      const [article] = buildArticleStructuredData(data, "test-slug");
      expect(article.image).toBeUndefined();
    });

    it("has mainEntityOfPage with correct @id URL", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.mainEntityOfPage!["@type"]).toBe("WebPage");
      expect(article.mainEntityOfPage!["@id"]).toContain("/learn/test-slug");
    });

    it("has wordCount", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.wordCount).toBeGreaterThan(0);
    });

    it("has keywords when meta_keywords is present", () => {
      const [article] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(article.keywords).toBe("painting, guide, interior walls");
    });

    it("keywords is undefined when meta_keywords is null", () => {
      const data = makeValidArticleData();
      data.meta_keywords = null;
      const [article] = buildArticleStructuredData(data, "test-slug");
      expect(article.keywords).toBeUndefined();
    });

    it("falls back to excerpt when meta_description is null", () => {
      const data = makeValidArticleData();
      data.meta_description = null;
      const [article] = buildArticleStructuredData(data, "test-slug");
      expect(article.description).toBe(data.excerpt);
    });

    it("description is empty string when both meta_description and excerpt are null", () => {
      const data = makeValidArticleData();
      data.meta_description = null;
      data.excerpt = null;
      const [article] = buildArticleStructuredData(data, "test-slug");
      expect(article.description).toBe("");
    });
  });

  describe("BreadcrumbList schema", () => {
    it("has @type BreadcrumbList", () => {
      const [, breadcrumb] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    });

    it("has 3 breadcrumb items (Learn → Category → Article)", () => {
      const [, breadcrumb] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(breadcrumb.itemListElement!).toHaveLength(3);
    });

    it("each item has ListItem type and position", () => {
      const [, breadcrumb] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      for (const item of breadcrumb.itemListElement!) {
        expect(item["@type"]).toBe("ListItem");
        expect(item.position).toBeGreaterThan(0);
        expect(item.name).toBeTruthy();
        expect(item.item).toMatch(/^https:\/\//);
      }
    });

    it("first item links to Learn hub", () => {
      const [, breadcrumb] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      expect(breadcrumb.itemListElement![0].name).toBe("Learn");
      expect(breadcrumb.itemListElement![0].item).toContain("/learn");
    });

    it("last item links to the article itself", () => {
      const [, breadcrumb] = buildArticleStructuredData(
        makeValidArticleData(),
        "test-slug",
      );
      const last = breadcrumb.itemListElement![2];
      expect(last.name).toBe(
        "The Complete Guide to Painting Interior Walls Like a Professional",
      );
      expect(last.item).toContain("/learn/test-slug");
    });
  });
});
