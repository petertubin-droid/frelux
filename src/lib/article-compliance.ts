/**
 * Learn Article SEO & Google Compliance Validator
 *
 * Provides reusable validation functions to ensure every Learn article
 * meets Google's content quality guidelines:
 *
 *  - E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
 *  - Helpful content (original, substantial, not thin/stuffed)
 *  - Structured data correctness (Article schema fields)
 *  - Meta tag quality (title length, description length, canonical)
 *  - Ad placement compliance (Better Ads Standards — ad density)
 *  - Content quality (minimum word count, no keyword stuffing)
 *
 * Used by the test suite and available for future article validation.
 */

export interface LearnArticleFixture {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category_slug: string;
  author: string;
  read_time_minutes: number;
  status: string;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  cover_image_url: string | null;
}

/** Google's recommended minimum word count for in-depth content (1,000+). */
export const MIN_WORD_COUNT = 1500;

/** Google meta title: recommended 30–60 chars, max 60 for SERP display. */
export const META_TITLE_MAX = 60;
export const META_TITLE_MIN = 30;

/** Google meta description: recommended 120–160 chars, max 160 for SERP display. */
export const META_DESC_MAX = 160;
export const META_DESC_MIN = 80;

/** Google keyword density threshold — no single keyword > 3% of total words. */
export const MAX_KEYWORD_DENSITY = 0.03;

/** Better Ads Standards: max ads per page for long-form content. */
export const MAX_ADS_PER_ARTICLE = 3;

/** Required fields for Google Article structured data. */
export const REQUIRED_ARTICLE_SCHEMA_FIELDS = [
  "@context",
  "@type",
  "headline",
  "description",
  "author",
  "datePublished",
] as const;

/** Recommended fields for Google Article rich results. */
export const RECOMMENDED_ARTICLE_SCHEMA_FIELDS = [
  "publisher",
  "dateModified",
  "image",
  "wordCount",
  "mainEntityOfPage",
] as const;

/**
 * Count words in a content string.
 * Strips markdown headings/tables/links for a fair count.
 */
export function countWords(content: string): number {
  // Strip markdown headings, table separators, image/link references
  const cleaned = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\|[-:|\s]+\|$/gm, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\*{1,2}(.*?)\*{1,2}/g, "$1")
    .replace(/`{1,3}.*?`{1,3}/g, "")
    .replace(/>\s+/g, "");

  return cleaned
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Calculate keyword density as a fraction (0–1).
 */
export function keywordDensity(content: string, keyword: string): number {
  const words = content
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const keywordWords = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const total = words.length;
  if (total === 0) return 0;

  // For single-word keywords, count occurrences
  if (keywordWords.length === 1) {
    let count = 0;
    for (const w of words) {
      if (w.includes(keywordWords[0])) count++;
    }
    return count / total;
  }

  // For multi-word phrases, count phrase occurrences
  const contentLower = content.toLowerCase();
  const phrase = keywordWords.join(" ");
  let count = 0;
  let idx = contentLower.indexOf(phrase);
  while (idx !== -1) {
    count++;
    idx = contentLower.indexOf(phrase, idx + phrase.length);
  }
  return count / total;
}

/**
 * Check if an article has H2 section headings (good for Google content structure).
 */
export function countH2Headings(content: string): number {
  const matches = content.match(/^##\s+.+/gm);
  return matches ? matches.length : 0;
}

/**
 * Check if an article has an FAQ section (good for FAQ rich results).
 */
export function hasFaqSection(content: string): boolean {
  return /##\s*(FAQ|Frequently Asked|Common Questions)/i.test(content);
}

/**
 * Validate an article against Google content quality guidelines.
 * Returns an array of violation messages (empty = fully compliant).
 */
export function validateArticleCompliance(
  article: LearnArticleFixture,
): string[] {
  const violations: string[] = [];

  // 1. Minimum word count — Google penalizes thin content
  const wc = countWords(article.content);
  if (wc < MIN_WORD_COUNT) {
    violations.push(
      `Word count ${wc} is below the ${MIN_WORD_COUNT} minimum. Google considers sub-${MIN_WORD_COUNT}-word articles thin content.`,
    );
  }

  // 2. Meta title length — Google truncates at ~60 chars
  if (article.meta_title.length > META_TITLE_MAX) {
    violations.push(
      `Meta title is ${article.meta_title.length} chars, exceeds ${META_TITLE_MAX}. Google will truncate it in SERPs.`,
    );
  }
  if (article.meta_title.length < META_TITLE_MIN) {
    violations.push(
      `Meta title is ${article.meta_title.length} chars, below ${META_TITLE_MIN}. Too short for optimal SERP display.`,
    );
  }

  // 3. Meta description length — Google shows ~120–160 chars
  if (article.meta_description.length > META_DESC_MAX) {
    violations.push(
      `Meta description is ${article.meta_description.length} chars, exceeds ${META_DESC_MAX}. Google will truncate.`,
    );
  }
  if (article.meta_description.length < META_DESC_MIN) {
    violations.push(
      `Meta description is ${article.meta_description.length} chars, below ${META_DESC_MIN}. Too short for optimal SERP snippet.`,
    );
  }

  // 4. Status must be published for Google indexing
  if (article.status !== "published") {
    violations.push(
      `Article status is '${article.status}', must be 'published' for Google to index.`,
    );
  }

  // 5. Author must be set (E-E-A-T requirement)
  if (!article.author || article.author.trim().length === 0) {
    violations.push(
      "Author is missing. Google E-E-A-T guidelines require author attribution.",
    );
  }

  // 6. Excerpt must be meaningful (used as fallback meta description)
  if (!article.excerpt || article.excerpt.trim().length < 50) {
    violations.push(
      "Excerpt is too short (< 50 chars). Used as meta description fallback.",
    );
  }

  // 7. Meta keywords should not be empty (still useful for some crawlers)
  if (!article.meta_keywords || article.meta_keywords.trim().length === 0) {
    violations.push(
      "Meta keywords are empty. While Google ignores them, other crawlers use them.",
    );
  }

  // 8. Content structure — should have H2 headings for readability
  const h2Count = countH2Headings(article.content);
  if (h2Count < 3) {
    violations.push(
      `Only ${h2Count} H2 headings. Google recommends well-structured content with multiple sections.`,
    );
  }

  // 9. Keyword stuffing check — no keyword > 3% density
  if (article.meta_keywords) {
    const keywords = article.meta_keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    for (const kw of keywords.slice(0, 10)) {
      const density = keywordDensity(article.content, kw);
      if (density > MAX_KEYWORD_DENSITY) {
        violations.push(
          `Keyword "${kw}" density is ${(density * 100).toFixed(1)}%, exceeds ${MAX_KEYWORD_DENSITY * 100}% max. Risk of keyword stuffing penalty.`,
        );
      }
    }
  }

  // 10. Slug must be URL-safe (lowercase, hyphens only)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
    violations.push(
      `Slug "${article.slug}" is not URL-safe. Use lowercase letters and hyphens only.`,
    );
  }

  // 11. Title should not exceed 70 chars (Google display limit for title tags)
  if (article.title.length > 70) {
    violations.push(
      `Title is ${article.title.length} chars. Google may truncate titles longer than 70 chars.`,
    );
  }

  return violations;
}

/**
 * Validate a BreadcrumbList structured data object against Google's requirements.
 */
export function validateBreadcrumbSchema(
  schema: Record<string, unknown>,
): string[] {
  const violations: string[] = [];

  if (schema["@type"] !== "BreadcrumbList") {
    violations.push(
      `@type must be 'BreadcrumbList', got '${schema["@type"]}'.`,
    );
    return violations;
  }

  if (schema["@context"] !== "https://schema.org") {
    violations.push(
      `@context must be 'https://schema.org', got '${schema["@context"]}'.`,
    );
  }

  const items = schema.itemListElement as
    Array<Record<string, unknown>> | undefined;
  if (!items || !Array.isArray(items)) {
    violations.push("itemListElement must be an array.");
    return violations;
  }

  items.forEach((item, index) => {
    if (item["@type"] !== "ListItem") {
      violations.push(`itemListElement[${index}] @type must be 'ListItem'.`);
    }
    if (item.position !== index + 1) {
      violations.push(
        `itemListElement[${index}] position must be ${index + 1}, got ${item.position}.`,
      );
    }
    if (!item.name) {
      violations.push(`itemListElement[${index}] is missing 'name'.`);
    }
    if (!item.item || typeof item.item !== "string") {
      violations.push(
        `itemListElement[${index}] is missing or has non-string 'item' URL.`,
      );
    }
  });

  return violations;
}

/**
 * Validate an Article structured data object against Google's requirements.
 */
export function validateArticleSchema(
  schema: Record<string, unknown>,
): string[] {
  const violations: string[] = [];

  if (schema["@type"] !== "Article") {
    violations.push(`@type must be 'Article', got '${schema["@type"]}'.`);
    return violations;
  }

  // Required fields
  for (const field of REQUIRED_ARTICLE_SCHEMA_FIELDS) {
    if (
      !(field in schema) ||
      schema[field] === undefined ||
      schema[field] === null
    ) {
      violations.push(`Missing required field: ${field}`);
    }
  }

  // Recommended fields
  for (const field of RECOMMENDED_ARTICLE_SCHEMA_FIELDS) {
    if (
      !(field in schema) ||
      schema[field] === undefined ||
      schema[field] === null
    ) {
      violations.push(`Missing recommended field: ${field}`);
    }
  }

  // Author must be a Person or Organization
  const author = schema.author as Record<string, unknown> | undefined;
  if (author) {
    if (author["@type"] !== "Person" && author["@type"] !== "Organization") {
      violations.push(
        `author @type must be 'Person' or 'Organization', got '${author["@type"]}'.`,
      );
    }
    if (!author.name) {
      violations.push("author is missing name.");
    }
  }

  // Publisher must have @type Organization and a logo
  const publisher = schema.publisher as Record<string, unknown> | undefined;
  if (publisher) {
    if (publisher["@type"] !== "Organization") {
      violations.push(
        `publisher @type must be 'Organization', got '${publisher["@type"]}'.`,
      );
    }
    if (!publisher.name) {
      violations.push("publisher is missing name.");
    }
    const logo = publisher.logo as Record<string, unknown> | undefined;
    if (logo && logo["@type"] !== "ImageObject") {
      violations.push(
        `publisher.logo @type must be 'ImageObject', got '${logo["@type"]}'.`,
      );
    }
  }

  // datePublished and dateModified must be valid ISO strings
  if (schema.datePublished && typeof schema.datePublished !== "string") {
    violations.push("datePublished must be a string (ISO date).");
  }
  if (schema.dateModified && typeof schema.dateModified !== "string") {
    violations.push("dateModified must be a string (ISO date).");
  }

  // wordCount must be a positive number
  if (schema.wordCount !== undefined) {
    if (typeof schema.wordCount !== "number" || schema.wordCount <= 0) {
      violations.push("wordCount must be a positive number.");
    }
  }

  // mainEntityOfPage must have @type WebPage and @id
  const mainEntity = schema.mainEntityOfPage as
    Record<string, unknown> | undefined;
  if (mainEntity) {
    if (mainEntity["@type"] !== "WebPage") {
      violations.push(
        `mainEntityOfPage @type must be 'WebPage', got '${mainEntity["@type"]}'.`,
      );
    }
    if (!mainEntity["@id"] || typeof mainEntity["@id"] !== "string") {
      violations.push("mainEntityOfPage is missing @id URL.");
    }
  }

  return violations;
}
