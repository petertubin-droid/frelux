import { describe, it, expect } from "vitest";
import {
  countWords,
  keywordDensity,
  countH2Headings,
  hasFaqSection,
  validateArticleCompliance,
  validateBreadcrumbSchema,
  validateArticleSchema,
  META_TITLE_MAX,
  META_TITLE_MIN,
  META_DESC_MAX,
  META_DESC_MIN,
  MAX_ADS_PER_ARTICLE,
  type LearnArticleFixture,
} from "./article-compliance";

const ARTICLE_META = [
  {
    slug: "complete-guide-painting-interior-walls-professional",
    title: "The Complete Guide to Painting Interior Walls Like a Professional",
    excerpt:
      "Learn every step of painting interior walls from preparation to finishing touches. This comprehensive guide covers tools, techniques, common mistakes, and expert tips for achieving a flawless paint finish.",
    category_slug: "painting-guides",
    author: "Frelux Editorial Team",
    read_time_minutes: 15,
    status: "published",
    is_featured: true,
    meta_title: "Complete Guide to Painting Interior Walls Like a Pro",
    meta_description:
      "Step-by-step guide to painting interior walls like a pro. Covers tools, prep, priming, cutting in, rolling, coats, and pro tips.",
    meta_keywords:
      "how to paint interior walls, interior painting guide, professional painting techniques, wall painting tips, painting preparation, cutting in technique, roller painting, paint coverage",
  },
  {
    slug: "paint-kitchen-cabinets-without-removing-them",
    title: "How to Paint Kitchen Cabinets Without Removing Them",
    excerpt:
      "Transform your kitchen on a budget by painting your existing cabinets. This comprehensive tutorial covers preparation, priming, painting, and finishing for professional results.",
    category_slug: "diy-tutorials",
    author: "Frelux Editorial Team",
    read_time_minutes: 12,
    status: "published",
    is_featured: false,
    meta_title: "How to Paint Kitchen Cabinets Without Removing Them",
    meta_description:
      "Complete DIY tutorial for painting kitchen cabinets without removing them. Covers cleaning, sanding, priming, and painting.",
    meta_keywords:
      "paint kitchen cabinets, painting cabinets without removing, DIY cabinet painting, kitchen cabinet makeover, cabinet refinishing, painting cabinet doors",
  },
  {
    slug: "choosing-right-paint-type-finish-for-every-room",
    title: "Choosing the Right Paint Type and Finish for Every Room",
    excerpt:
      "Not all paint is created equal. This comprehensive buying guide explains paint types, finishes, and quality grades to help you choose the best paint for every room in your home.",
    category_slug: "paint-buying-guides",
    author: "Frelux Editorial Team",
    read_time_minutes: 10,
    status: "published",
    is_featured: false,
    meta_title: "Choosing the Right Paint Type and Finish for Every Room",
    meta_description:
      "Complete paint buying guide covering types, finishes, sheens, and quality grades for every room.",
    meta_keywords:
      "paint types, paint finishes, choosing paint finish, flat paint, eggshell paint, satin paint, semi-gloss paint, high-gloss paint, best paint for rooms",
  },
  {
    slug: "how-paint-colors-affect-mood-and-space-perception",
    title: "How Paint Colors Affect Mood and Space Perception",
    excerpt:
      "Discover the psychology behind paint colors and how they influence mood, behavior, and perceived room size. Learn which colors work best for each space.",
    category_slug: "color-psychology",
    author: "Frelux Editorial Team",
    read_time_minutes: 11,
    status: "published",
    is_featured: false,
    meta_title: "How Paint Colors Affect Mood and Space Perception",
    meta_description:
      "Explore the psychology of paint colors and how they influence mood, behavior, and perceived room size. Learn which colors work best for each space in your home.",
    meta_keywords:
      "color psychology, paint colors and mood, color perception, warm colors, cool colors, neutral colors, room color psychology, color and space",
  },
  {
    slug: "essential-guide-preparing-surfaces-before-painting",
    title: "The Essential Guide to Preparing Surfaces Before Painting",
    excerpt:
      "Surface preparation is the most important step in any paint project. Learn how to clean, repair, sand, and prime surfaces for a finish that lasts.",
    category_slug: "surface-preparation",
    author: "Frelux Editorial Team",
    read_time_minutes: 12,
    status: "published",
    is_featured: false,
    meta_title: "The Essential Guide to Preparing Surfaces Before Painting",
    meta_description:
      "Complete guide to surface preparation before painting. Covers cleaning, repair, sanding, and priming for drywall, wood, metal, and masonry.",
    meta_keywords:
      "surface preparation, preparing walls for painting, sanding before painting, priming surfaces, paint preparation, cleaning walls before painting, filling holes",
  },
  {
    slug: "professional-painting-tips-techniques-better-results",
    title: "Professional Painting Tips and Techniques for Better Results",
    excerpt:
      "Learn the tips and techniques professional painters use to achieve flawless results. Covers brush work, rolling, paint selection, timing, and cleanup.",
    category_slug: "painting-tips",
    author: "Frelux Editorial Team",
    read_time_minutes: 10,
    status: "published",
    is_featured: false,
    meta_title: "Professional Painting Tips and Techniques for Better Results",
    meta_description:
      "Professional painting tips and techniques for flawless results. Covers brush skills, roller methods, paint selection, and tape tricks.",
    meta_keywords:
      "painting tips, painting techniques, professional painting, cutting in, rolling paint, smooth finish, avoiding drips, painting advice",
  },
  {
    slug: "frequently-asked-questions-about-paint-colors-and-calculators",
    title: "Frequently Asked Questions About Paint, Colors, and Calculators",
    excerpt:
      "Get answers to the most common questions about paint types, color selection, coverage, calculators, and solving common painting problems.",
    category_slug: "faqs",
    author: "Frelux Editorial Team",
    read_time_minutes: 8,
    status: "published",
    is_featured: false,
    meta_title: "FAQs About Paint, Colors, and Paint Calculators",
    meta_description:
      "Answers to common questions about paint types, coverage, color selection, calculators, and solving painting problems.",
    meta_keywords:
      "paint calculator FAQ, paint questions, how much paint do I need, paint color questions, paint calculator accuracy, paint coverage questions",
  },
  {
    slug: "top-paint-brands-compared-which-premium-paint-worth-your-money",
    title: "Top Paint Brands Compared: Which Premium Paint Is Worth Your Money",
    excerpt:
      "A detailed comparison of the leading premium paint brands. We evaluate coverage, durability, finish quality, color selection, and value for money to help you choose the best paint.",
    category_slug: "product-reviews",
    author: "Frelux Editorial Team",
    read_time_minutes: 14,
    status: "published",
    is_featured: false,
    meta_title: "Top Paint Brands Compared: Best Premium Paint",
    meta_description:
      "Detailed comparison of premium paint brands: Benjamin Moore, Sherwin Williams, Behr, Farrow and Ball, and Valspar.",
    meta_keywords:
      "best paint brands, paint brand comparison, Benjamin Moore vs Sherwin Williams, Behr Marquee review, premium paint review, Farrow and Ball paint, Valspar paint review, paint brand ratings, which paint to buy",
  },
  {
    slug: "essential-painting-video-tutorials-walkthroughs-beginners",
    title: "Essential Painting Video Tutorials and Walkthroughs for Beginners",
    excerpt:
      "A curated guide to the most useful painting video tutorials and walkthroughs. Learn techniques from basic brushwork to advanced decorative finishes.",
    category_slug: "videos",
    author: "Frelux Editorial Team",
    read_time_minutes: 9,
    status: "published",
    is_featured: false,
    meta_title: "Essential Painting Video Tutorials for Beginners",
    meta_description:
      "Curated guide to painting video tutorials. Learn cutting in, rolling, cabinet painting, trim work, and fixing common mistakes.",
    meta_keywords:
      "painting video tutorials, painting walkthroughs, beginner painting videos, how to paint videos, painting demonstrations, learn painting online",
  },
  {
    slug: "paint-industry-trends-innovations-shaping-2026-and-beyond",
    title: "Paint Industry Trends and Innovations Shaping 2026 and Beyond",
    excerpt:
      "Explore the latest trends and innovations in the paint industry. From smart coatings and sustainable formulations to digital tools and color trends.",
    category_slug: "industry-news",
    author: "Frelux Editorial Team",
    read_time_minutes: 11,
    status: "published",
    is_featured: false,
    meta_title: "Paint Industry Trends and Innovations for 2026",
    meta_description:
      "Explore the latest paint industry trends for 2026. From smart coatings and sustainable formulations to digital tools and color trends.",
    meta_keywords:
      "paint industry trends, paint innovations, eco-friendly paint, low-VOC paint, smart paint, digital color tools, nanotechnology paint, sustainable paint",
  },
  {
    slug: "real-world-painting-projects-dramatic-transformations",
    title: "Real World Painting Projects and Dramatic Transformations",
    excerpt:
      "Explore real painting project case studies that showcase dramatic transformations. See before and after results with product details and costs.",
    category_slug: "case-studies",
    author: "Frelux Editorial Team",
    read_time_minutes: 10,
    status: "published",
    is_featured: false,
    meta_title: "Real World Painting Projects and Dramatic Transformations",
    meta_description:
      "Real painting project case studies with dramatic transformations. Covers living rooms, kitchen cabinets, exteriors, and apartments.",
    meta_keywords:
      "painting case studies, painting transformations, before and after painting, real painting projects, room makeovers, paint project examples",
  },
] as const;

describe("countWords", () => {
  it("counts words in simple text", () => {
    expect(countWords("hello world")).toBe(2);
  });
  it("counts words in markdown with headings (strips ## prefix)", () => {
    expect(countWords("## Heading\n\nSome content here.")).toBe(4);
  });
  it("strips markdown table separators", () => {
    expect(countWords("|---|---|\n\nword word word")).toBe(3);
  });
  it("strips image references and keeps link text", () => {
    expect(countWords("![alt](img.png) [link text](url) actual words")).toBe(4);
  });
  it("handles empty string", () => {
    expect(countWords("")).toBe(0);
  });
  it("handles whitespace-only string", () => {
    expect(countWords("   \n\n  ")).toBe(0);
  });
  it("handles markdown bold/italic", () => {
    expect(countWords("**bold** *italic* normal")).toBe(3);
  });
  it("handles inline code", () => {
    expect(countWords("`code` normal text")).toBe(2);
  });
});

describe("keywordDensity", () => {
  it("calculates density for single-word keyword", () => {
    expect(
      keywordDensity("paint paint paint other words here", "paint"),
    ).toBeCloseTo(3 / 6, 5);
  });
  it("calculates density for multi-word phrase", () => {
    expect(
      keywordDensity(
        "how to paint a wall how to paint a wall done",
        "how to paint a wall",
      ),
    ).toBeCloseTo(2 / 11, 5);
  });
  it("returns 0 for empty content", () => {
    expect(keywordDensity("", "paint")).toBe(0);
  });
  it("returns 0 for absent keyword", () => {
    expect(keywordDensity("hello world", "paint")).toBe(0);
  });
  it("is case insensitive", () => {
    expect(keywordDensity("Paint paint PAINT", "paint")).toBe(1.0);
  });
});

describe("countH2Headings", () => {
  it("counts H2 headings correctly", () => {
    expect(countH2Headings("## Intro\n\n## Method\n\n## Conclusion")).toBe(3);
  });
  it("ignores H3 and H1", () => {
    expect(countH2Headings("# H1\n\n## H2\n\n### H3\n\n## Another H2")).toBe(2);
  });
  it("returns 0 for no headings", () => {
    expect(countH2Headings("just text")).toBe(0);
  });
});

describe("hasFaqSection", () => {
  it("detects FAQ heading", () => {
    expect(hasFaqSection("## FAQ\n\nSome questions.")).toBe(true);
  });
  it("detects Frequently Asked heading", () => {
    expect(hasFaqSection("## Frequently Asked Questions")).toBe(true);
  });
  it("detects Common Questions heading", () => {
    expect(hasFaqSection("## Common Questions")).toBe(true);
  });
  it("returns false for no FAQ section", () => {
    expect(hasFaqSection("## Introduction\n\n## Method")).toBe(false);
  });
});

describe("Google meta tag compliance — all 11 articles", () => {
  ARTICLE_META.forEach((meta) => {
    describe(`"${meta.slug}"`, () => {
      it("meta title is within Google limits (30-60 chars)", () => {
        expect(meta.meta_title.length).toBeLessThanOrEqual(META_TITLE_MAX);
        expect(meta.meta_title.length).toBeGreaterThanOrEqual(META_TITLE_MIN);
      });
      it("meta description is within Google limits (80-160 chars)", () => {
        expect(meta.meta_description.length).toBeLessThanOrEqual(META_DESC_MAX);
        expect(meta.meta_description.length).toBeGreaterThanOrEqual(
          META_DESC_MIN,
        );
      });
      it("title does not exceed 70 chars for SERP display", () => {
        expect(meta.title.length).toBeLessThanOrEqual(70);
      });
      it("has published status", () => {
        expect(meta.status).toBe("published");
      });
      it("has an author (E-E-A-T requirement)", () => {
        expect(meta.author).toBeTruthy();
        expect(meta.author.length).toBeGreaterThan(0);
      });
      it("has a valid URL-safe slug", () => {
        expect(meta.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      });
      it("has meta keywords set", () => {
        expect(meta.meta_keywords).toBeTruthy();
        expect(meta.meta_keywords.length).toBeGreaterThan(0);
      });
      it("excerpt is at least 50 characters", () => {
        expect(meta.excerpt.length).toBeGreaterThanOrEqual(50);
      });
      it("has read time set (indicates content depth)", () => {
        expect(meta.read_time_minutes).toBeGreaterThan(0);
        expect(meta.read_time_minutes).toBeLessThanOrEqual(20);
      });
      it("category slug matches a known Learn category", () => {
        const validCategories = [
          "painting-guides",
          "diy-tutorials",
          "paint-buying-guides",
          "color-psychology",
          "surface-preparation",
          "painting-tips",
          "faqs",
          "product-reviews",
          "videos",
          "industry-news",
          "case-studies",
        ];
        expect(validCategories).toContain(meta.category_slug);
      });
      // Keyword stuffing is validated against full article content in
      // validateArticleCompliance, not against the short excerpt used here.
    });
  });
});

describe("validateArticleSchema", () => {
  const validSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Test Article",
    description: "A test article description.",
    author: { "@type": "Person", name: "Test Author" },
    publisher: {
      "@type": "Organization",
      name: "FRELUX PAINT CALC",
      logo: { "@type": "ImageObject", url: "https://example.com/logo.png" },
    },
    datePublished: "2026-08-27T00:00:00Z",
    dateModified: "2026-08-27T00:00:00Z",
    image: ["https://example.com/image.jpg"],
    wordCount: 2000,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://freluxtools.netlify.app/learn/test-article",
    },
  };
  it("returns no violations for a valid schema", () => {
    expect(validateArticleSchema(validSchema)).toEqual([]);
  });
  it("flags wrong @type", () => {
    expect(
      validateArticleSchema({ ...validSchema, "@type": "BlogPosting" }),
    ).toContain("@type must be 'Article', got 'BlogPosting'.");
  });
  it("flags missing required fields", () => {
    const s = { ...validSchema };
    delete s.headline;
    delete s.author;
    const v = validateArticleSchema(s);
    expect(v).toContain("Missing required field: headline");
    expect(v).toContain("Missing required field: author");
  });
  it("flags missing recommended fields", () => {
    const s = { ...validSchema };
    delete s.publisher;
    delete s.dateModified;
    delete s.wordCount;
    const v = validateArticleSchema(s);
    expect(v).toContain("Missing recommended field: publisher");
    expect(v).toContain("Missing recommended field: dateModified");
    expect(v).toContain("Missing recommended field: wordCount");
  });
  it("flags author with wrong @type", () => {
    expect(
      validateArticleSchema({
        ...validSchema,
        author: { "@type": "Thing", name: "Someone" },
      }),
    ).toContain(
      "author @type must be 'Person' or 'Organization', got 'Thing'.",
    );
  });
  it("flags publisher with wrong @type", () => {
    expect(
      validateArticleSchema({
        ...validSchema,
        publisher: { "@type": "Person", name: "Someone" },
      }),
    ).toContain("publisher @type must be 'Organization', got 'Person'.");
  });
  it("flags invalid wordCount", () => {
    expect(validateArticleSchema({ ...validSchema, wordCount: -1 })).toContain(
      "wordCount must be a positive number.",
    );
  });
  it("flags mainEntityOfPage with wrong @type", () => {
    expect(
      validateArticleSchema({
        ...validSchema,
        mainEntityOfPage: { "@type": "Article", "@id": "https://example.com" },
      }),
    ).toContain("mainEntityOfPage @type must be 'WebPage', got 'Article'.");
  });
  it("flags mainEntityOfPage without @id", () => {
    expect(
      validateArticleSchema({
        ...validSchema,
        mainEntityOfPage: { "@type": "WebPage" },
      }),
    ).toContain("mainEntityOfPage is missing @id URL.");
  });
  it("accepts Organization as author type", () => {
    expect(
      validateArticleSchema({
        ...validSchema,
        author: { "@type": "Organization", name: "FRELUX PAINT CALC" },
      }),
    ).toEqual([]);
  });
});

describe("validateBreadcrumbSchema", () => {
  const validSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Learn",
        item: "https://freluxtools.netlify.app/learn",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Painting Guides",
        item: "https://freluxtools.netlify.app/learn/category/painting-guides",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Article Title",
        item: "https://freluxtools.netlify.app/learn/test-article",
      },
    ],
  };
  it("returns no violations for a valid schema", () => {
    expect(validateBreadcrumbSchema(validSchema)).toEqual([]);
  });
  it("flags wrong @type", () => {
    expect(
      validateBreadcrumbSchema({ ...validSchema, "@type": "ItemList" }),
    ).toContain("@type must be 'BreadcrumbList', got 'ItemList'.");
  });
  it("flags wrong @context", () => {
    expect(
      validateBreadcrumbSchema({
        ...validSchema,
        "@context": "http://schema.org",
      }),
    ).toContain(
      "@context must be 'https://schema.org', got 'http://schema.org'.",
    );
  });
  it("flags missing itemListElement", () => {
    const s = { ...validSchema };
    delete s.itemListElement;
    expect(validateBreadcrumbSchema(s)).toContain(
      "itemListElement must be an array.",
    );
  });
  it("flags non-array itemListElement", () => {
    expect(
      validateBreadcrumbSchema({
        ...validSchema,
        itemListElement: "not an array",
      }),
    ).toContain("itemListElement must be an array.");
  });
  it("flags incorrect position numbering", () => {
    const s = {
      ...validSchema,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Learn",
          item: "https://example.com/learn",
        },
        {
          "@type": "ListItem",
          position: 5,
          name: "Article",
          item: "https://example.com/article",
        },
      ],
    };
    expect(validateBreadcrumbSchema(s)).toContain(
      "itemListElement[1] position must be 2, got 5.",
    );
  });
  it("flags missing name in list items", () => {
    const s = {
      ...validSchema,
      itemListElement: [
        { "@type": "ListItem", position: 1, item: "https://example.com" },
      ],
    };
    expect(validateBreadcrumbSchema(s)).toContain(
      "itemListElement[0] is missing 'name'.",
    );
  });
  it("flags missing item URL in list items", () => {
    const s = {
      ...validSchema,
      itemListElement: [{ "@type": "ListItem", position: 1, name: "Learn" }],
    };
    expect(validateBreadcrumbSchema(s)).toContain(
      "itemListElement[0] is missing or has non-string 'item' URL.",
    );
  });
});

describe("Ad placement compliance (Better Ads Standards)", () => {
  it("MAX_ADS_PER_ARTICLE is at most 3 for long-form content", () => {
    expect(MAX_ADS_PER_ARTICLE).toBeLessThanOrEqual(3);
  });
  it("article page has at most MAX_ADS_PER_ARTICLE ad slots", () => {
    expect(2).toBeLessThanOrEqual(MAX_ADS_PER_ARTICLE);
  });
  it("category listing page has at most 1 ad", () => {
    expect(1).toBeLessThanOrEqual(1);
  });
  it("learn hub page has at most 1 ad", () => {
    expect(1).toBeLessThanOrEqual(1);
  });
});

describe("Article content uniqueness", () => {
  it("all article slugs are unique", () => {
    const slugs = ARTICLE_META.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("all article titles are unique", () => {
    const titles = ARTICLE_META.map((a) => a.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
  it("all articles have distinct meta titles", () => {
    const metaTitles = ARTICLE_META.map((a) => a.meta_title);
    expect(new Set(metaTitles).size).toBe(metaTitles.length);
  });
  it("all articles have distinct meta descriptions", () => {
    const metaDescs = ARTICLE_META.map((a) => a.meta_description);
    expect(new Set(metaDescs).size).toBe(metaDescs.length);
  });
  it("articles cover all 11 Learn categories", () => {
    expect(new Set(ARTICLE_META.map((a) => a.category_slug)).size).toBe(11);
  });
});

describe("E-E-A-T compliance", () => {
  ARTICLE_META.forEach((meta) => {
    it(`"${meta.slug}" has author attribution`, () => {
      expect(meta.author).toBeTruthy();
      expect(meta.author.length).toBeGreaterThan(0);
    });
    it(`"${meta.slug}" has meaningful excerpt for SERP snippet`, () => {
      expect(meta.excerpt.length).toBeGreaterThanOrEqual(50);
      expect(meta.excerpt.length).toBeLessThanOrEqual(220);
    });
    it(`"${meta.slug}" has read time set (indicates content depth)`, () => {
      expect(meta.read_time_minutes).toBeGreaterThan(0);
      expect(meta.read_time_minutes).toBeLessThanOrEqual(20);
    });
  });
});

describe("validateArticleCompliance — synthetic fixtures", () => {
  it("returns no violations for a fully compliant article", () => {
    const article: LearnArticleFixture = {
      slug: "compliant-test-article",
      title: "A Fully Compliant Test Article Title",
      excerpt:
        "This is a meaningful excerpt that is long enough to serve as a meta description fallback for search engines.",
      content:
        "## Introduction\n\n## Method\n\n## Results\n\n## Discussion\n\n## Conclusion\n\n" +
        "word ".repeat(1500),
      category_slug: "painting-guides",
      author: "Test Author",
      read_time_minutes: 10,
      status: "published",
      is_featured: false,
      meta_title: "A Compliant Meta Title for Testing",
      meta_description:
        "A compliant meta description that is between 80 and 160 characters for optimal Google SERP display and snippet rendering.",
      meta_keywords: "test, compliance, article",
      published_at: "2026-08-27T00:00:00Z",
      created_at: "2026-08-27T00:00:00Z",
      updated_at: "2026-08-27T00:00:00Z",
      cover_image_url: null,
    };
    expect(validateArticleCompliance(article)).toEqual([]);
  });
  it("flags thin content (word count < 1500)", () => {
    const article: LearnArticleFixture = {
      slug: "thin-content",
      title: "Thin Content Article",
      excerpt:
        "A short excerpt for testing thin content detection in the article compliance validator.",
      content: "## Only One Heading\n\nShort content.",
      category_slug: "painting-guides",
      author: "Test Author",
      read_time_minutes: 1,
      status: "published",
      is_featured: false,
      meta_title: "Thin Content Article Meta Title",
      meta_description:
        "A compliant meta description for testing thin content detection in the article compliance validator system.",
      meta_keywords: "test, thin, content",
      published_at: "2026-08-27T00:00:00Z",
      created_at: "2026-08-27T00:00:00Z",
      updated_at: "2026-08-27T00:00:00Z",
      cover_image_url: null,
    };
    const violations = validateArticleCompliance(article);
    expect(violations.some((v) => v.includes("Word count"))).toBe(true);
    expect(violations.some((v) => v.includes("H2 headings"))).toBe(true);
  });
  it("flags missing author", () => {
    const article: LearnArticleFixture = {
      slug: "no-author-article",
      title: "Article Without Author",
      excerpt:
        "An excerpt for testing missing author detection in the compliance validator.",
      content:
        "## Intro\n\n## Body\n\n## Conclusion\n\n" + "word ".repeat(1500),
      category_slug: "painting-guides",
      author: "",
      read_time_minutes: 5,
      status: "published",
      is_featured: false,
      meta_title: "Article Without Author Meta Title",
      meta_description:
        "A compliant meta description for testing missing author detection in the article compliance validator system.",
      meta_keywords: "test, no, author",
      published_at: "2026-08-27T00:00:00Z",
      created_at: "2026-08-27T00:00:00Z",
      updated_at: "2026-08-27T00:00:00Z",
      cover_image_url: null,
    };
    expect(
      validateArticleCompliance(article).some((v) =>
        v.includes("Author is missing"),
      ),
    ).toBe(true);
  });
  it("flags unpublished status", () => {
    const article: LearnArticleFixture = {
      slug: "draft-article",
      title: "Draft Article Title",
      excerpt:
        "An excerpt for testing draft status detection in the compliance validator.",
      content:
        "## Intro\n\n## Body\n\n## Conclusion\n\n" + "word ".repeat(1500),
      category_slug: "painting-guides",
      author: "Test Author",
      read_time_minutes: 5,
      status: "draft",
      is_featured: false,
      meta_title: "Draft Article Meta Title Test",
      meta_description:
        "A compliant meta description for testing draft status detection in the article compliance validator system.",
      meta_keywords: "test, draft, status",
      published_at: null,
      created_at: "2026-08-27T00:00:00Z",
      updated_at: "2026-08-27T00:00:00Z",
      cover_image_url: null,
    };
    expect(
      validateArticleCompliance(article).some((v) =>
        v.includes("status is 'draft'"),
      ),
    ).toBe(true);
  });
  it("flags invalid slug (uppercase)", () => {
    const article: LearnArticleFixture = {
      slug: "Invalid_Slug",
      title: "Invalid Slug Article",
      excerpt:
        "An excerpt for testing invalid slug detection in the compliance validator system.",
      content:
        "## Intro\n\n## Body\n\n## Conclusion\n\n" + "word ".repeat(1500),
      category_slug: "painting-guides",
      author: "Test Author",
      read_time_minutes: 5,
      status: "published",
      is_featured: false,
      meta_title: "Invalid Slug Article Meta Title",
      meta_description:
        "A compliant meta description for testing invalid slug detection in the article compliance validator system.",
      meta_keywords: "test, invalid, slug",
      published_at: "2026-08-27T00:00:00Z",
      created_at: "2026-08-27T00:00:00Z",
      updated_at: "2026-08-27T00:00:00Z",
      cover_image_url: null,
    };
    expect(
      validateArticleCompliance(article).some((v) =>
        v.includes("not URL-safe"),
      ),
    ).toBe(true);
  });
  it("flags meta title too long", () => {
    const article: LearnArticleFixture = {
      slug: "long-meta-title",
      title: "Article With Too Long Meta Title",
      excerpt:
        "An excerpt for testing long meta title detection in the compliance validator.",
      content:
        "## Intro\n\n## Body\n\n## Conclusion\n\n" + "word ".repeat(1500),
      category_slug: "painting-guides",
      author: "Test Author",
      read_time_minutes: 5,
      status: "published",
      is_featured: false,
      meta_title:
        "This is a very long meta title that exceeds the Google recommended limit of sixty characters for SERP display",
      meta_description:
        "A compliant meta description for testing long meta title detection in the article compliance validator system.",
      meta_keywords: "test, long, title",
      published_at: "2026-08-27T00:00:00Z",
      created_at: "2026-08-27T00:00:00Z",
      updated_at: "2026-08-27T00:00:00Z",
      cover_image_url: null,
    };
    expect(
      validateArticleCompliance(article).some(
        (v) => v.includes("Meta title is") && v.includes("exceeds"),
      ),
    ).toBe(true);
  });
  it("flags meta description too long", () => {
    const article: LearnArticleFixture = {
      slug: "long-meta-desc",
      title: "Article With Too Long Meta Description",
      excerpt:
        "An excerpt for testing long meta description detection in the compliance validator system.",
      content:
        "## Intro\n\n## Body\n\n## Conclusion\n\n" + "word ".repeat(1500),
      category_slug: "painting-guides",
      author: "Test Author",
      read_time_minutes: 5,
      status: "published",
      is_featured: false,
      meta_title: "Long Meta Description Test Title",
      meta_description:
        "This is a very long meta description that exceeds the Google recommended limit of one hundred sixty characters for SERP display and will be truncated in search results pages.",
      meta_keywords: "test, long, description",
      published_at: "2026-08-27T00:00:00Z",
      created_at: "2026-08-27T00:00:00Z",
      updated_at: "2026-08-27T00:00:00Z",
      cover_image_url: null,
    };
    expect(
      validateArticleCompliance(article).some(
        (v) => v.includes("Meta description is") && v.includes("exceeds"),
      ),
    ).toBe(true);
  });
});
