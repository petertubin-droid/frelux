import { describe, expect, it } from "vitest";
import { ALL_FAQ_ARTICLES } from "@/config/faq-articles";
import {
  LONG_FORM_ARTICLES,
  faqArticleWordCount,
  mergedQuestions,
} from "@/config/faq-longform";
import { TOOL_FAQS } from "@/config/tool-faqs";

/**
 * Pages still on the short registry copy. Every entry here has to be replaced
 * with a long form article before the site is considered finished, so this
 * number only ever falls.
 */
const SHORT_COPY_BACKLOG = 56;

const rows = TOOL_FAQS.map((group) => ({
  slug: group.slug,
  words: faqArticleWordCount(
    group.slug,
    ALL_FAQ_ARTICLES[group.slug],
    group.questions,
  ),
  long: Boolean(LONG_FORM_ARTICLES[group.slug]),
}));

describe("FAQ article length", () => {
  it("holds every long form article between 800 and 1500 words", () => {
    for (const row of rows.filter((r) => r.long)) {
      expect(row.words, row.slug).toBeGreaterThanOrEqual(800);
      expect(row.words, row.slug).toBeLessThanOrEqual(1500);
    }
  });

  it("keeps the short copy backlog shrinking", () => {
    const remaining = rows.filter((r) => !r.long);
    expect(remaining.length).toBeLessThanOrEqual(SHORT_COPY_BACKLOG);
  });

  it("replaces every answer of a converted page with expanded copy", () => {
    for (const slug of Object.keys(LONG_FORM_ARTICLES)) {
      const group = TOOL_FAQS.find((item) => item.slug === slug);
      expect(group, slug).toBeDefined();
      const merged = mergedQuestions(slug, group!.questions);
      expect(merged.length).toBe(group!.questions.length);
      for (const item of merged) {
        expect(
          item.a.split(/\s+/).length,
          `${slug}: ${item.q}`,
        ).toBeGreaterThan(40);
      }
    }
  });
});
