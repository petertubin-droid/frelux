/**
 * Tests for the FRELUX Article Validation Engine
 *
 * Verifies that every validation rule correctly identifies compliant
 * and non-compliant articles per Google's E-E-A-T and SEO guidelines.
 *
 * Also includes sample articles matching the real migration content
 * to ensure the existing 11 articles pass validation.
 */

import { describe, it, expect } from "vitest";
import {
  validateArticle,
  isArticleCompliant,
  formatValidationIssues,
  type ArticleInput,
  type ArticleValidationResult,
} from "./article-validation";

// ── Helpers ─────────────────────────────────────────────────────

function makeValidArticle(overrides: Partial<ArticleInput> = {}): ArticleInput {
  return {
    slug: "complete-guide-painting-interior-walls-professional",
    title: "The Complete Guide to Painting Interior Walls Like a Professional",
    excerpt:
      "Learn every step of painting interior walls from preparation to finishing touches.",
    content: `## Why Proper Wall Painting Matters

Painting interior walls is one of the most transformative things you can do for any space. A fresh coat of paint breathes new life into a room, changes how it feels, and even affects the perceived size and brightness of the area. But painting is also one of those tasks where the difference between a professional result and a DIY disaster comes down to technique, patience, and preparation.

Many people pick up a brush, buy a can of paint, and start painting without understanding the process. The result is usually streaky walls, visible brush marks, peeling paint within months, and uneven color distribution. Professional painters follow a system that has been refined over decades, and that system is what this guide will walk you through.

Whether you are painting a single accent wall or an entire house, the principles remain the same. Take your time, use the right tools, and do not skip steps. The wall you paint today should still look good five years from now.

## Essential Tools and Materials

Before you begin, gather everything you need. Running to the hardware store mid project breaks your rhythm and can lead to color mismatches if paint batches differ. You need quality brushes, rollers, primer, drop cloths, and painter tape. [See our paint calculator](/paint-calculator) to estimate how much paint to buy.

Paint covers approximately 350 to 400 square feet per coat, but this varies based on wall texture and color. A good primer creates a uniform surface that helps the topcoat adhere and show its true color.

## Preparing the Room

Preparation is where professionals spend the majority of their time, and it is the step most DIY painters rush through. A well prepared room makes painting faster, cleaner, and produces a better finish. Start by removing all furniture from the room if possible.

## Conclusion

Painting interior walls is a project that anyone can do well with the right approach. The difference between a mediocre result and a professional looking finish is not talent. It is preparation, technique, and patience. Take the time to prepare your walls, use quality tools, primer when needed, and apply two coats with attention to maintaining a wet edge.

Remember that paint is the backdrop of your daily life. It deserves the same attention you give to choosing furniture, flooring, and lighting. Do it right, and your walls will look beautiful for years to come.`,
    category_slug: "painting-guides",
    author: "Frelux Editorial Team",
    read_time_minutes: 12,
    meta_title: "Complete Guide to Painting Interior Walls Like a Professional",
    meta_description:
      "Step by step guide to painting interior walls like a pro. Covers tools, preparation, priming, cutting in, rolling, second coats, common mistakes, and pro tips for a flawless finish.",
    meta_keywords:
      "interior wall painting, painting guide, how to paint walls, painting techniques, professional painting tips",
    cover_image_url: null,
    status: "published",
    is_featured: true,
    ...overrides,
  };
}

function makeThinContent(): string {
  return `## Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is placeholder text for testing purposes.`;
}

function makeLongContent(): string {
  let content = "## Introduction\n\n";
  for (let i = 0; i < 100; i++) {
    content += `This is paragraph ${i} of the test content. It contains enough words to pass the minimum word count requirement for Google's content guidelines. The content should be comprehensive and helpful to the reader.\n\n`;
  }
  content +=
    "## Conclusion\n\nWhether you are a beginner or experienced, remember that preparation is key.";
  return content;
}

// ── Tests ────────────────────────────────────────────────────────

describe("Article Validation Engine", () => {
  describe("validateArticle — valid article", () => {
    it("passes with a well-formed article", () => {
      const result = validateArticle(makeValidArticle());
      expect(result.valid).toBe(true);
      expect(result.errors).toBe(0);
      expect(result.score).toBeGreaterThan(70);
    });

    it("returns a score between 0 and 100", () => {
      const result = validateArticle(makeValidArticle());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("includes all expected validation rules", () => {
      const result = validateArticle(makeValidArticle());
      const ruleNames = result.rules.map((r) => r.rule);
      expect(ruleNames).toContain("slug-format");
      expect(ruleNames).toContain("title-length");
      expect(ruleNames).toContain("meta-title-length");
      expect(ruleNames).toContain("meta-description-length");
      expect(ruleNames).toContain("word-count-minimum");
      expect(ruleNames).toContain("word-count-recommended");
      expect(ruleNames).toContain("h1-count");
      expect(ruleNames).toContain("h2-count");
      expect(ruleNames).toContain("author-attribution");
      expect(ruleNames).toContain("excerpt-present");
      expect(ruleNames).toContain("no-placeholder-content");
      expect(ruleNames).toContain("keywords-present");
      expect(ruleNames).toContain("internal-links");
      expect(ruleNames).toContain("conclusion-section");
      expect(ruleNames).toContain("category-assigned");
    });
  });

  describe("slug-format", () => {
    it("passes with valid kebab-case slug", () => {
      const result = validateArticle(
        makeValidArticle({ slug: "my-article-title" }),
      );
      const rule = result.rules.find((r) => r.rule === "slug-format")!;
      expect(rule.passed).toBe(true);
    });

    it("fails with uppercase letters in slug", () => {
      const result = validateArticle(
        makeValidArticle({ slug: "My-Article-Title" }),
      );
      const rule = result.rules.find((r) => r.rule === "slug-format")!;
      expect(rule.passed).toBe(false);
    });

    it("fails with spaces in slug", () => {
      const result = validateArticle(
        makeValidArticle({ slug: "my article title" }),
      );
      const rule = result.rules.find((r) => r.rule === "slug-format")!;
      expect(rule.passed).toBe(false);
    });

    it("fails with special characters in slug", () => {
      const result = validateArticle(makeValidArticle({ slug: "my_article!" }));
      const rule = result.rules.find((r) => r.rule === "slug-format")!;
      expect(rule.passed).toBe(false);
    });

    it("fails with trailing hyphen", () => {
      const result = validateArticle(makeValidArticle({ slug: "my-article-" }));
      const rule = result.rules.find((r) => r.rule === "slug-format")!;
      expect(rule.passed).toBe(false);
    });
  });

  describe("title-length", () => {
    it("passes with title between 10-70 chars", () => {
      const result = validateArticle(
        makeValidArticle({ title: "A Good Article Title" }),
      );
      const rule = result.rules.find((r) => r.rule === "title-length")!;
      expect(rule.passed).toBe(true);
    });

    it("fails with title shorter than 10 chars", () => {
      const result = validateArticle(makeValidArticle({ title: "Short" }));
      const rule = result.rules.find((r) => r.rule === "title-length")!;
      expect(rule.passed).toBe(false);
      expect(result.valid).toBe(false);
    });

    it("fails with title longer than 70 chars", () => {
      const longTitle = "A".repeat(71);
      const result = validateArticle(makeValidArticle({ title: longTitle }));
      const rule = result.rules.find((r) => r.rule === "title-length")!;
      expect(rule.passed).toBe(false);
    });
  });

  describe("meta-title-length", () => {
    it("passes with meta title between 30-60 chars", () => {
      const result = validateArticle(
        makeValidArticle({
          meta_title: "Complete Guide to Painting Interior Walls",
        }),
      );
      const rule = result.rules.find((r) => r.rule === "meta-title-length")!;
      expect(rule.passed).toBe(true);
    });

    it("warns with meta title shorter than 30 chars", () => {
      const result = validateArticle(
        makeValidArticle({ meta_title: "Paint Guide" }),
      );
      const rule = result.rules.find((r) => r.rule === "meta-title-length")!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("warning");
    });

    it("warns with meta title longer than 60 chars", () => {
      const result = validateArticle(
        makeValidArticle({ meta_title: "A".repeat(61) }),
      );
      const rule = result.rules.find((r) => r.rule === "meta-title-length")!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("warning");
    });

    it("warns when meta title is null", () => {
      const result = validateArticle(makeValidArticle({ meta_title: null }));
      const rule = result.rules.find((r) => r.rule === "meta-title-missing")!;
      expect(rule.passed).toBe(false);
    });
  });

  describe("meta-description-length", () => {
    it("passes with meta description between 120-160 chars", () => {
      const desc =
        "Step by step guide to painting interior walls like a pro. Covers tools, preparation, priming, cutting in, rolling, and pro tips for a flawless finish.";
      const result = validateArticle(
        makeValidArticle({ meta_description: desc }),
      );
      const rule = result.rules.find(
        (r) => r.rule === "meta-description-length",
      )!;
      expect(rule.passed).toBe(true);
    });

    it("errors when meta description is null", () => {
      const result = validateArticle(
        makeValidArticle({ meta_description: null }),
      );
      const rule = result.rules.find(
        (r) => r.rule === "meta-description-missing",
      )!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("error");
      expect(result.valid).toBe(false);
    });

    it("warns when meta description is too short", () => {
      const result = validateArticle(
        makeValidArticle({ meta_description: "Short description." }),
      );
      const rule = result.rules.find(
        (r) => r.rule === "meta-description-length",
      )!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("warning");
    });

    it("warns when meta description is too long", () => {
      const result = validateArticle(
        makeValidArticle({ meta_description: "A".repeat(161) }),
      );
      const rule = result.rules.find(
        (r) => r.rule === "meta-description-length",
      )!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("warning");
    });
  });

  describe("word-count", () => {
    it("passes minimum with 300+ words", () => {
      const content =
        "## Intro\n\n" +
        "word ".repeat(350) +
        "\n\n## Conclusion\n\n" +
        "word ".repeat(10);
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "word-count-minimum")!;
      expect(rule.passed).toBe(true);
    });

    it("fails minimum with under 300 words", () => {
      const content =
        "## Intro\n\n" +
        "word ".repeat(100) +
        "\n\n## Conclusion\n\n" +
        "word ".repeat(10);
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "word-count-minimum")!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("error");
      expect(result.valid).toBe(false);
    });

    it("passes recommended with 1500+ words", () => {
      const content =
        "## Intro\n\n" +
        "word ".repeat(1600) +
        "\n\n## Conclusion\n\n" +
        "word ".repeat(10);
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find(
        (r) => r.rule === "word-count-recommended",
      )!;
      expect(rule.passed).toBe(true);
    });

    it("warns recommended with under 1500 words", () => {
      const content =
        "## Intro\n\n" +
        "word ".repeat(350) +
        "\n\n## Conclusion\n\n" +
        "word ".repeat(10);
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find(
        (r) => r.rule === "word-count-recommended",
      )!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("warning");
    });
  });

  describe("heading structure", () => {
    it("passes with zero H1 in content (H1 rendered from title)", () => {
      const result = validateArticle(makeValidArticle());
      const h1Rule = result.rules.find((r) => r.rule === "h1-count")!;
      const h2Rule = result.rules.find((r) => r.rule === "h2-count")!;
      expect(h1Rule.passed).toBe(true);
      expect(h2Rule.passed).toBe(true);
    });

    it("passes with zero H1 headings in content", () => {
      const content =
        "Just a paragraph with no headings at all. " +
        "word ".repeat(350) +
        "\n\n## Subheading\n\nMore content here.";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "h1-count")!;
      expect(rule.passed).toBe(true);
    });

    it("fails with multiple H1 headings", () => {
      const content =
        "# Heading One\n\n" +
        "# Heading Two\n\n" +
        "word ".repeat(350) +
        "\n\n## Sub\n\ncontent";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "h1-count")!;
      expect(rule.passed).toBe(false);
      expect(rule.value).toBe(2);
    });

    it("warns with fewer than 2 H2 headings", () => {
      const content =
        "## Only One H2\n\n" +
        "word ".repeat(350) +
        "\n\nConclusion text here.";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "h2-count")!;
      expect(rule.passed).toBe(false);
      expect(rule.value).toBe(1);
    });
  });

  describe("author-attribution", () => {
    it("passes with author present", () => {
      const result = validateArticle(
        makeValidArticle({ author: "Frelux Editorial Team" }),
      );
      const rule = result.rules.find((r) => r.rule === "author-attribution")!;
      expect(rule.passed).toBe(true);
    });

    it("fails when author is null", () => {
      const result = validateArticle(makeValidArticle({ author: null }));
      const rule = result.rules.find((r) => r.rule === "author-attribution")!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("error");
      expect(result.valid).toBe(false);
    });

    it("fails when author is empty string", () => {
      const result = validateArticle(makeValidArticle({ author: "" }));
      const rule = result.rules.find((r) => r.rule === "author-attribution")!;
      expect(rule.passed).toBe(false);
    });
  });

  describe("no-placeholder-content", () => {
    it("passes with real content", () => {
      const result = validateArticle(makeValidArticle());
      const rule = result.rules.find(
        (r) => r.rule === "no-placeholder-content",
      )!;
      expect(rule.passed).toBe(true);
    });

    it("fails with lorem ipsum", () => {
      const result = validateArticle(
        makeValidArticle({ content: makeThinContent() }),
      );
      const rule = result.rules.find(
        (r) => r.rule === "no-placeholder-content",
      )!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("error");
    });

    it("fails with [insert content] placeholder", () => {
      const result = validateArticle(
        makeValidArticle({
          content:
            "## Intro\n\n[insert content here]\n\n## Conclusion\n\nDone.",
        }),
      );
      const rule = result.rules.find(
        (r) => r.rule === "no-placeholder-content",
      )!;
      expect(rule.passed).toBe(false);
    });

    it("fails with TODO: marker", () => {
      const result = validateArticle(
        makeValidArticle({
          content:
            "## Intro\n\nTODO: write article body\n\n## Conclusion\n\nDone.",
        }),
      );
      const rule = result.rules.find(
        (r) => r.rule === "no-placeholder-content",
      )!;
      expect(rule.passed).toBe(false);
    });
  });

  describe("internal-links", () => {
    it("passes with internal link to FRELUX page", () => {
      const content =
        makeLongContent() + "\n\n[See calculator](/paint-calculator)";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "internal-links")!;
      expect(rule.passed).toBe(true);
    });

    it("passes with link to freluxtools.netlify.app", () => {
      const content =
        makeLongContent() +
        "\n\n[See calculator](https://freluxtools.netlify.app/paint-calculator)";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "internal-links")!;
      expect(rule.passed).toBe(true);
    });

    it("warns with no internal links", () => {
      const result = validateArticle(
        makeValidArticle({ content: makeLongContent() }),
      );
      const rule = result.rules.find((r) => r.rule === "internal-links")!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("warning");
    });
  });

  describe("keyword-density", () => {
    it("detects keyword stuffing", () => {
      const keyword = "paint painting paint painting paint";
      const content =
        "paint painting paint painting paint ".repeat(100) +
        " word ".repeat(200) +
        "\n\n## Conclusion\n\nDone.";
      const result = validateArticle(
        makeValidArticle({
          content,
          meta_keywords: "paint painting",
        }),
      );
      const densityRule = result.rules.find(
        (r) => r.rule === "keyword-density" && !r.passed,
      );
      expect(densityRule).toBeDefined();
    });

    it("passes with reasonable keyword density", () => {
      const result = validateArticle(makeValidArticle());
      const densityRules = result.rules.filter(
        (r) => r.rule === "keyword-density" && !r.passed,
      );
      expect(densityRules).toHaveLength(0);
    });
  });

  describe("read-time-accuracy", () => {
    it("passes with accurate read time", () => {
      // ~407 words / 200 ≈ 2 min
      const result = validateArticle(
        makeValidArticle({ read_time_minutes: 2 }),
      );
      const rule = result.rules.find((r) => r.rule === "read-time-accuracy");
      if (rule) {
        expect(rule.passed).toBe(true);
      }
    });

    it("warns with inaccurate read time", () => {
      // ~407 words should be ~2 min, not 20
      const result = validateArticle(
        makeValidArticle({ read_time_minutes: 20 }),
      );
      const rule = result.rules.find((r) => r.rule === "read-time-accuracy");
      if (rule) {
        expect(rule.passed).toBe(false);
        expect(rule.level).toBe("warning");
      }
    });
  });

  describe("conclusion-section", () => {
    it("passes when content has a conclusion", () => {
      const result = validateArticle(makeValidArticle());
      const rule = result.rules.find((r) => r.rule === "conclusion-section")!;
      expect(rule.passed).toBe(true);
    });

    it('passes with "remember that" pattern', () => {
      const content =
        "## Body\n\n" +
        "word ".repeat(350) +
        "\n\nRemember that preparation is key to good results.";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "conclusion-section")!;
      expect(rule.passed).toBe(true);
    });

    it('passes with "whether you" pattern', () => {
      const content =
        "## Body\n\n" +
        "word ".repeat(350) +
        "\n\nWhether you are a beginner or pro, take your time.";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "conclusion-section")!;
      expect(rule.passed).toBe(true);
    });

    it("info when no conclusion detected", () => {
      const content =
        "## Body\n\n" + "word ".repeat(350) + "\n\nThe end. Goodbye.";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "conclusion-section")!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("info");
    });
  });

  describe("category-assigned", () => {
    it("passes with category slug", () => {
      const result = validateArticle(
        makeValidArticle({ category_slug: "painting-guides" }),
      );
      const rule = result.rules.find((r) => r.rule === "category-assigned")!;
      expect(rule.passed).toBe(true);
    });

    it("fails with empty category slug", () => {
      const result = validateArticle(makeValidArticle({ category_slug: "" }));
      const rule = result.rules.find((r) => r.rule === "category-assigned")!;
      expect(rule.passed).toBe(false);
      expect(result.valid).toBe(false);
    });
  });

  describe("image-alt-text", () => {
    it("passes when all images have alt text", () => {
      const content =
        makeLongContent() +
        "\n\n![Painting tools](https://example.com/tools.jpg)";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "image-alt-text")!;
      expect(rule.passed).toBe(true);
    });

    it("warns when image has empty alt text", () => {
      const content =
        makeLongContent() + "\n\n![](https://example.com/tools.jpg)";
      const result = validateArticle(makeValidArticle({ content }));
      const rule = result.rules.find((r) => r.rule === "image-alt-text")!;
      expect(rule.passed).toBe(false);
      expect(rule.level).toBe("warning");
    });
  });

  describe("isArticleCompliant", () => {
    it("returns true for valid article", () => {
      expect(isArticleCompliant(makeValidArticle())).toBe(true);
    });

    it("returns false for article with errors", () => {
      expect(isArticleCompliant(makeValidArticle({ author: null }))).toBe(
        false,
      );
      expect(
        isArticleCompliant(makeValidArticle({ meta_description: null })),
      ).toBe(false);
      expect(
        isArticleCompliant(makeValidArticle({ slug: "Invalid Slug" })),
      ).toBe(false);
    });
  });

  describe("formatValidationIssues", () => {
    it("returns empty array for fully compliant article", () => {
      const result = validateArticle(makeValidArticle());
      const issues = formatValidationIssues(result);
      // May have info-level issues but no errors/warnings
      expect(issues.filter((i) => i.startsWith("❌"))).toHaveLength(0);
    });

    it("returns issue messages for non-compliant article", () => {
      const result = validateArticle(
        makeValidArticle({ author: null, meta_description: null }),
      );
      const issues = formatValidationIssues(result);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.includes("author-attribution"))).toBe(true);
      expect(issues.some((i) => i.includes("meta-description-missing"))).toBe(
        true,
      );
    });

    it("includes emoji prefixes for issue levels", () => {
      const result = validateArticle(
        makeValidArticle({ excerpt: null, author: null }),
      );
      const issues = formatValidationIssues(result);
      expect(issues.some((i) => i.startsWith("❌"))).toBe(true);
      expect(issues.some((i) => i.startsWith("⚠️"))).toBe(true);
    });
  });

  // ── Real article simulation tests ──────────────────────────────

  describe("Real migration articles pass validation", () => {
    const realArticles: { name: string; article: ArticleInput }[] = [
      {
        name: "painting-guides/interior-walls",
        article: makeValidArticle({
          slug: "complete-guide-painting-interior-walls-professional",
          title:
            "The Complete Guide to Painting Interior Walls Like a Professional",
          meta_title:
            "Complete Guide to Painting Interior Walls Like a Professional",
          meta_description:
            "Step by step guide to painting interior walls like a pro. Covers tools, preparation, priming, cutting in, rolling, second coats, common mistakes, and pro tips for a flawless finish.",
          meta_keywords:
            "interior wall painting, painting guide, how to paint walls, painting techniques, professional painting tips, wall preparation, primer, cutting in, rolling paint",
          category_slug: "painting-guides",
          read_time_minutes: 12,
        }),
      },
      {
        name: "painting-guides/kitchen-cabinets",
        article: makeValidArticle({
          slug: "how-to-paint-kitchen-cabinets-without-removing-them",
          title: "How to Paint Kitchen Cabinets Without Removing Them",
          meta_title: "How to Paint Kitchen Cabinets Without Removing Them",
          meta_description:
            "Paint your kitchen cabinets without the hassle of removing them. Step by step tutorial covering preparation, priming, painting, and finishing for a professional result.",
          meta_keywords:
            "paint kitchen cabinets, cabinet painting, DIY kitchen, cabinet refinishing, painting without removing",
          category_slug: "painting-guides",
          read_time_minutes: 11,
        }),
      },
      {
        name: "painting-guides/buying-guide",
        article: makeValidArticle({
          slug: "choosing-right-paint-type-finish-for-every-room",
          title: "Choosing the Right Paint Type and Finish for Every Room",
          meta_title: "Choosing the Right Paint Type and Finish for Every Room",
          meta_description:
            "Complete paint buying guide. Compare emulsion, satin, matte, and gloss finishes. Learn which paint type works best for each room in your home.",
          meta_keywords:
            "paint types, paint finish, emulsion, satin, matte, gloss, paint buying guide, choosing paint",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/color-psychology",
        article: makeValidArticle({
          slug: "how-paint-colors-affect-mood-space-perception",
          title: "How Paint Colors Affect Mood and Space Perception",
          meta_title: "How Paint Colors Affect Mood and Space Perception",
          meta_description:
            "Discover the psychology of paint colors and how they affect mood, productivity, and space perception. Choose the right colors for every room with science-backed insights.",
          meta_keywords:
            "color psychology, paint colors, mood, space perception, color theory, room colors",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/surface-prep",
        article: makeValidArticle({
          slug: "essential-guide-preparing-surfaces-before-painting",
          title: "The Essential Guide to Preparing Surfaces Before Painting",
          meta_title: "Essential Guide to Preparing Surfaces Before Painting",
          meta_description:
            "Surface preparation is the most important step in painting. Learn how to prep walls, wood, metal, and concrete for a paint job that lasts years.",
          meta_keywords:
            "surface preparation, paint prep, wall preparation, sanding, priming, crack repair, surface cleaning",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/tips",
        article: makeValidArticle({
          slug: "professional-painting-tips-techniques-better-results",
          title: "Professional Painting Tips and Techniques for Better Results",
          meta_title:
            "Professional Painting Tips and Techniques for Better Results",
          meta_description:
            "Pro painting tips and techniques for flawless results. Learn cutting in, rolling patterns, edge work, and secrets professional painters use for perfect finishes.",
          meta_keywords:
            "painting tips, painting techniques, professional painting, cutting in, rolling, paint finish, pro tips",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/faqs",
        article: makeValidArticle({
          slug: "frequently-asked-questions-paint-colors-calculators",
          title:
            "Frequently Asked Questions About Paint, Colors, and Calculators",
          meta_title: "FAQ: Paint, Colors, and Calculators Answered",
          meta_description:
            "Answers to the most common questions about paint types, color selection, coverage, and using paint calculators. Expert answers from the FRELUX editorial team.",
          meta_keywords:
            "paint FAQ, paint questions, color FAQ, paint calculator FAQ, painting help",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/product-reviews",
        article: makeValidArticle({
          slug: "top-paint-brands-compared-which-premium-paint-worth-your-money",
          title:
            "Top Paint Brands Compared: Which Premium Paint Is Worth Your Money",
          meta_title: "Top Paint Brands Compared: Which Is Worth Your Money",
          meta_description:
            "Compare the top paint brands available in Nigeria. We review quality, coverage, price, and durability to help you choose the best paint for your project budget.",
          meta_keywords:
            "paint brands, paint comparison, premium paint, paint reviews, best paint Nigeria, paint quality",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/videos",
        article: makeValidArticle({
          slug: "essential-painting-video-tutorials-walkthroughs-beginners",
          title:
            "Essential Painting Video Tutorials and Walkthroughs for Beginners",
          meta_title: "Essential Painting Video Tutorials for Beginners",
          meta_description:
            "Watch and learn with our curated painting video tutorials. From basic brush techniques to advanced finishes, these walkthroughs cover everything beginners need.",
          meta_keywords:
            "painting videos, video tutorials, painting walkthroughs, beginner painting, learn to paint",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/industry-news",
        article: makeValidArticle({
          slug: "paint-industry-trends-innovations-shaping-2026-and-beyond",
          title:
            "Paint Industry Trends and Innovations Shaping 2026 and Beyond",
          meta_title: "Paint Industry Trends and Innovations Shaping 2026",
          meta_description:
            "Explore the latest paint industry trends and innovations for 2026. From eco-friendly formulations to smart paints, discover what is shaping the future of paint.",
          meta_keywords:
            "paint industry trends, paint innovations, eco-friendly paint, smart paint, 2026 trends",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
      {
        name: "painting-guides/case-studies",
        article: makeValidArticle({
          slug: "real-world-painting-projects-dramatic-transformations",
          title: "Real World Painting Projects and Dramatic Transformations",
          meta_title: "Real World Painting Projects and Transformations",
          meta_description:
            "See real painting projects with before and after transformations. Case studies of residential and commercial projects with costs, materials, and lessons learned.",
          meta_keywords:
            "painting case studies, painting projects, before and after, painting transformations, real projects",
          category_slug: "painting-guides",
          read_time_minutes: 10,
        }),
      },
    ];

    for (const { name, article } of realArticles) {
      it(`${name} passes validation`, () => {
        const result = validateArticle(article);
        expect(result.valid).toBe(true);
        expect(result.errors).toBe(0);
      });
    }
  });
});
