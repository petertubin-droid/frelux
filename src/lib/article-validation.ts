import { SITE_URL } from "./seo";

/**
 * FRELUX Article Validation Engine
 *
 * Validates learn articles against Google's E-E-A-T and SEO content guidelines.
 * Used as a gatekeeper before publishing — every future article must pass.
 *
 * Google guidelines covered:
 * - E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness
 * - Helpful Content Update: people-first content, not search-engine-first
 * - Meta title (30-60 chars), meta description (120-160 chars)
 * - Content depth (minimum 300 words, 1500+ recommended for guides)
 * - Heading structure (exactly one H1, multiple H2s)
 * - Author attribution required for E-E-A-T
 * - Slug format (kebab-case, no spaces)
 * - Keyword density (not stuffed, not absent)
 * - No thin content / placeholder text
 * - Image alt text awareness
 * - Internal linking presence
 */

// ── Types ──────────────────────────────────────────────────────

export type ValidationLevel = "error" | "warning" | "info";

export interface ArticleValidationRule {
  rule: string;
  level: ValidationLevel;
  passed: boolean;
  message: string;
  value?: string | number;
}

export interface ArticleValidationResult {
  valid: boolean;
  errors: number;
  warnings: number;
  rules: ArticleValidationRule[];
  score: number; // 0-100
}

export interface ArticleInput {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category_slug: string;
  author: string | null;
  read_time_minutes: number | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  cover_image_url: string | null;
  status: string;
  is_featured: boolean;
}

// ── Constants ──────────────────────────────────────────────────

const META_TITLE_MIN = 30;
const META_TITLE_MAX = 60;
const META_DESC_MIN = 120;
const META_DESC_MAX = 160;
const MIN_WORD_COUNT = 300;
const RECOMMENDED_WORD_COUNT = 1500;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const THIN_CONTENT_PATTERNS = [
  /lorem\s+ipsum/i,
  /placeholder\s+text/i,
  /coming\s+soon/i,
  /todo:/i,
  /\[insert\s+content/i,
  /\[tbd\]/i,
  /\[placeholder\]/i,
];
const MAX_KEYWORD_DENSITY = 0.05; // 5% max for any single keyword

// ── Validation Functions ───────────────────────────────────────

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function extractHeadings(content: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2].trim() });
    }
  }
  return headings;
}

function calculateKeywordDensity(content: string, keyword: string): number {
  if (!keyword || !content) return 0;
  const words = content
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const totalWords = words.length;
  if (totalWords === 0) return 0;
  const keywordWords = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  let count = 0;
  const kwLen = keywordWords.length;
  for (let i = 0; i <= words.length - kwLen; i++) {
    const slice = words.slice(i, i + kwLen).join(" ");
    if (slice === keyword.toLowerCase()) count++;
  }
  return count / totalWords;
}

function extractLinks(content: string): { text: string; url: string }[] {
  const links: { text: string; url: string }[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }
  return links;
}

function countImages(content: string): number {
  const matches = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
  return matches ? matches.length : 0;
}

function countImagesWithAlt(content: string): number {
  const matches = content.match(/!\[([^\]]+)\]\(([^)]+)\)/g);
  if (!matches) return 0;
  return matches.filter((m) => {
    const altMatch = m.match(/^!\[([^\]]+)\]/);
    return altMatch && altMatch[1].trim().length > 0;
  }).length;
}

// ── Main Validation Entry Point ────────────────────────────────

export function validateArticle(
  article: ArticleInput,
): ArticleValidationResult {
  const rules: ArticleValidationRule[] = [];

  // 1. Slug format (kebab-case)
  const slugValid = SLUG_REGEX.test(article.slug);
  rules.push({
    rule: "slug-format",
    level: "error",
    passed: slugValid,
    message: slugValid
      ? "Slug is valid kebab-case"
      : 'Slug must be lowercase kebab-case (e.g., "my-article-title")',
    value: article.slug,
  });

  // 2. Title length
  const titleLen = article.title.length;
  const titleValid = titleLen >= 10 && titleLen <= 70;
  rules.push({
    rule: "title-length",
    level: "error",
    passed: titleValid,
    message: titleValid
      ? `Title length is ${titleLen} chars (within 10-70)`
      : `Title is ${titleLen} chars — should be 10-70 characters`,
    value: titleLen,
  });

  // 3. Meta title
  const metaTitle = article.meta_title ?? "";
  if (metaTitle) {
    const mtLen = metaTitle.length;
    const mtValid = mtLen >= META_TITLE_MIN && mtLen <= META_TITLE_MAX;
    rules.push({
      rule: "meta-title-length",
      level: mtValid ? "info" : "warning",
      passed: mtValid,
      message: mtValid
        ? `Meta title is ${mtLen} chars (optimal ${META_TITLE_MIN}-${META_TITLE_MAX})`
        : `Meta title is ${mtLen} chars — should be ${META_TITLE_MIN}-${META_TITLE_MAX}`,
      value: mtLen,
    });
  } else {
    rules.push({
      rule: "meta-title-missing",
      level: "warning",
      passed: false,
      message: "Meta title is missing — will fall back to article title",
    });
  }

  // 4. Meta description
  const metaDesc = article.meta_description ?? "";
  if (metaDesc) {
    const mdLen = metaDesc.length;
    const mdValid = mdLen >= META_DESC_MIN && mdLen <= META_DESC_MAX;
    rules.push({
      rule: "meta-description-length",
      level: mdValid ? "info" : "warning",
      passed: mdValid,
      message: mdValid
        ? `Meta description is ${mdLen} chars (optimal ${META_DESC_MIN}-${META_DESC_MAX})`
        : `Meta description is ${mdLen} chars — should be ${META_DESC_MIN}-${META_DESC_MAX}`,
      value: mdLen,
    });
  } else {
    rules.push({
      rule: "meta-description-missing",
      level: "error",
      passed: false,
      message: "Meta description is required for Google search results",
    });
  }

  // 5. Content word count
  const wordCount = countWords(article.content);
  const minWordsMet = wordCount >= MIN_WORD_COUNT;
  const recWordsMet = wordCount >= RECOMMENDED_WORD_COUNT;
  rules.push({
    rule: "word-count-minimum",
    level: "error",
    passed: minWordsMet,
    message: minWordsMet
      ? `Content has ${wordCount} words (meets minimum of ${MIN_WORD_COUNT})`
      : `Content has only ${wordCount} words — minimum is ${MIN_WORD_COUNT} (Google flags thin content)`,
    value: wordCount,
  });
  rules.push({
    rule: "word-count-recommended",
    level: "warning",
    passed: recWordsMet,
    message: recWordsMet
      ? `Content has ${wordCount} words (meets recommended ${RECOMMENDED_WORD_COUNT}+)`
      : `Content has ${wordCount} words — recommended ${RECOMMENDED_WORD_COUNT}+ for comprehensive guides`,
    value: wordCount,
  });

  // 6. Heading structure — exactly one H1, at least two H2s
  const headings = extractHeadings(article.content);
  const h1Count = headings.filter((h) => h.level === 1).length;
  const h2Count = headings.filter((h) => h.level === 2).length;
  const _h3Count = headings.filter((h) => h.level === 3).length;

  // H1 is rendered by the LearnArticle component from article.title.
  // Content should not contain H1 headings (use H2 for sections).
  // 0 H1s in content is correct; 2+ is an error (duplicate H1s).
  rules.push({
    rule: "h1-count",
    level: "error",
    passed: h1Count === 0 || h1Count === 1,
    message:
      h1Count === 0
        ? "No H1 in content (correct — H1 is rendered from article title)"
        : h1Count === 1
          ? "One H1 heading present"
          : `Found ${h1Count} H1 headings — content should use H2+ (H1 comes from article title)`,
    value: h1Count,
  });

  rules.push({
    rule: "h2-count",
    level: "warning",
    passed: h2Count >= 2,
    message:
      h2Count >= 2
        ? `${h2Count} H2 headings present (good structure)`
        : `Only ${h2Count} H2 headings — should have at least 2 for content structure`,
    value: h2Count,
  });

  // 7. Author attribution (E-E-A-T)
  const hasAuthor = !!article.author && article.author.trim().length > 0;
  rules.push({
    rule: "author-attribution",
    level: "error",
    passed: hasAuthor,
    message: hasAuthor
      ? `Author: "${article.author}" (E-E-A-T requirement met)`
      : "No author attributed — Google E-E-A-T requires author attribution",
    value: article.author ?? undefined,
  });

  // 8. Excerpt
  const hasExcerpt = !!article.excerpt && article.excerpt.trim().length > 0;
  rules.push({
    rule: "excerpt-present",
    level: "warning",
    passed: hasExcerpt,
    message: hasExcerpt
      ? "Excerpt present (used for search snippets and previews)"
      : "No excerpt — recommended for search snippets and social previews",
  });

  // 9. Thin content / placeholder detection
  let hasThinContent = false;
  for (const pattern of THIN_CONTENT_PATTERNS) {
    if (pattern.test(article.content)) {
      hasThinContent = true;
      break;
    }
  }
  rules.push({
    rule: "no-placeholder-content",
    level: "error",
    passed: !hasThinContent,
    message: hasThinContent
      ? "Placeholder/lorem ipsum text detected — Google flags this as unhelpful content"
      : "No placeholder content detected",
  });

  // 10. Keyword density (if keywords provided)
  if (article.meta_keywords) {
    const keywords = article.meta_keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    for (const kw of keywords) {
      const density = calculateKeywordDensity(article.content, kw);
      if (density > MAX_KEYWORD_DENSITY) {
        rules.push({
          rule: "keyword-density",
          level: "warning",
          passed: false,
          message: `Keyword "${kw}" density is ${(density * 100).toFixed(1)}% — should be under ${MAX_KEYWORD_DENSITY * 100}% to avoid keyword stuffing`,
          value: density,
        });
      }
    }
    if (keywords.length > 0) {
      rules.push({
        rule: "keywords-present",
        level: "info",
        passed: true,
        message: `${keywords.length} keyword(s) specified`,
        value: keywords.length,
      });
    }
  } else {
    rules.push({
      rule: "keywords-missing",
      level: "warning",
      passed: false,
      message:
        "No meta keywords specified — recommended for topical relevance signals",
    });
  }

  // 11. Internal linking
  const links = extractLinks(article.content);
  const internalLinks = links.filter(
    (l) =>
      l.url.startsWith("/") ||
      l.url.includes(SITE_URL.replace("https://", "")) ||
      l.url.includes("frelux.com"),
  );
  rules.push({
    rule: "internal-links",
    level: "warning",
    passed: internalLinks.length >= 1,
    message:
      internalLinks.length >= 1
        ? `${internalLinks.length} internal link(s) found (good for SEO)`
        : "No internal links — add links to related FRELUX pages for better crawling",
    value: internalLinks.length,
  });

  // 12. Image alt text
  const totalImages = countImages(article.content);
  if (totalImages > 0) {
    const imagesWithAlt = countImagesWithAlt(article.content);
    rules.push({
      rule: "image-alt-text",
      level: "warning",
      passed: imagesWithAlt === totalImages,
      message:
        imagesWithAlt === totalImages
          ? `All ${totalImages} image(s) have alt text`
          : `${imagesWithAlt}/${totalImages} image(s) have alt text — all images need descriptive alt text`,
      value: `${imagesWithAlt}/${totalImages}`,
    });
  }

  // 13. Read time accuracy
  if (article.read_time_minutes !== null) {
    // Average reading speed: 200-250 words per minute
    const expectedMin = Math.max(1, Math.round(wordCount / 250));
    const expectedMax = Math.max(1, Math.round(wordCount / 180));
    const readTimeValid =
      article.read_time_minutes >= expectedMin &&
      article.read_time_minutes <= expectedMax + 2; // +2 for tolerance
    rules.push({
      rule: "read-time-accuracy",
      level: "warning",
      passed: readTimeValid,
      message: readTimeValid
        ? `Read time ${article.read_time_minutes} min matches word count (${wordCount} words)`
        : `Read time ${article.read_time_minutes} min doesn't match expected ${expectedMin}-${expectedMax} min for ${wordCount} words`,
      value: article.read_time_minutes,
    });
  }

  // 14. Content has a conclusion paragraph (helpful content signal)
  const lastParagraphs = article.content
    .split("\n\n")
    .slice(-3)
    .join(" ")
    .toLowerCase();
  const hasConclusion =
    /(conclusion|in summary|to summarize|final thought|takeaway|remember that|key takeaway|whether you)/.test(
      lastParagraphs,
    );
  rules.push({
    rule: "conclusion-section",
    level: "info",
    passed: hasConclusion,
    message: hasConclusion
      ? "Conclusion/wrap-up section detected (helpful content signal)"
      : "No conclusion section detected — articles should end with a summary or takeaway",
  });

  // 15. Category slug is non-empty
  rules.push({
    rule: "category-assigned",
    level: "error",
    passed: !!article.category_slug && article.category_slug.trim().length > 0,
    message: article.category_slug
      ? `Category: ${article.category_slug}`
      : "No category assigned — articles must belong to a category",
    value: article.category_slug ?? undefined,
  });

  // ── Score calculation ────────────────────────────────────────
  const errors = rules.filter((r) => r.level === "error" && !r.passed).length;
  const warnings = rules.filter(
    (r) => r.level === "warning" && !r.passed,
  ).length;
  const passedRules = rules.filter((r) => r.passed).length;
  const score = Math.round((passedRules / rules.length) * 100);
  const valid = errors === 0;

  return { valid, errors, warnings, rules, score };
}

/**
 * Quick check — returns true if an article passes all error-level rules.
 * Use this before publishing to block non-compliant articles.
 */
export function isArticleCompliant(article: ArticleInput): boolean {
  return validateArticle(article).valid;
}

/**
 * Returns a human-readable summary of validation issues.
 */
export function formatValidationIssues(
  result: ArticleValidationResult,
): string[] {
  const issues: string[] = [];
  for (const rule of result.rules) {
    if (!rule.passed) {
      const prefix =
        rule.level === "error" ? "❌" : rule.level === "warning" ? "⚠️" : "ℹ️";
      issues.push(`${prefix} [${rule.rule}] ${rule.message}`);
    }
  }
  return issues;
}
