/**
 * Long form copy for the FAQ article pages.
 *
 * The registry entries carry a short article: enough to answer the page's
 * question, not enough to rank for it or to settle an argument on site. This
 * file carries the full treatment for a page: two paragraph introduction, the
 * calculation broken down, a worked example, the commercial case, the limits,
 * and expanded answers written to be read rather than skimmed.
 *
 * The page merges this over the registry entry, so a tool appears here as its
 * long copy is written and keeps working on the short copy until then. Prices,
 * coverage rates and codes stay out of the prose: every figure a reader needs
 * comes from the market they select, which keeps the same page true in Lagos,
 * Nairobi, Manchester and Houston.
 */

import type { FaqArticle } from "@/config/faq-articles";
import { FINISHES_LONGFORM } from "@/config/faq-longform/finishes";
import { STRUCTURE_LONGFORM } from "@/config/faq-longform/structure";

export interface LongFormArticle {
  /** Introduction, with a blank line between paragraphs. */
  description: string;
  functions: string[];
  /** One scenario carried through the arithmetic. */
  worked: string;
  advantages: string[];
  limits: string[];
  /** Expanded answers, in the same order as the group's questions. */
  answers: string[];
}

export const LONG_FORM_ARTICLES: Record<string, LongFormArticle> = {
  ...FINISHES_LONGFORM,
  ...STRUCTURE_LONGFORM,
};

export function longFormFor(slug: string): LongFormArticle | null {
  return LONG_FORM_ARTICLES[slug] ?? null;
}

/** The article as the page should render it: long copy where it exists. */
export function mergedArticle(slug: string, short: FaqArticle): FaqArticle {
  const long = longFormFor(slug);
  if (!long) return short;
  return {
    ...short,
    description: long.description,
    functions: long.functions,
    advantages: long.advantages,
    limits: long.limits,
  };
}

/** Answers to display and to mark up, kept identical so schema matches text. */
export function mergedQuestions(
  slug: string,
  questions: { q: string; a: string }[],
): { q: string; a: string }[] {
  const long = longFormFor(slug);
  if (!long) return questions;
  return questions.map((question, index) => ({
    q: question.q,
    a: long.answers[index] ?? question.a,
  }));
}

/** Words a reader sees on the page, used to hold the length floor. */
export function faqArticleWordCount(
  slug: string,
  short: FaqArticle,
  questions: { q: string; a: string }[],
): number {
  const long = longFormFor(slug);
  const article = mergedArticle(slug, short);
  const asked = mergedQuestions(slug, questions);
  const parts = [
    article.summary,
    article.description,
    ...article.functions,
    ...article.advantages,
    ...article.limits,
    ...(long ? [long.worked] : []),
    ...asked.flatMap((item) => [item.q, item.a]),
  ];
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}
