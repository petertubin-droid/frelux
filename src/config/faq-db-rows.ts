/**
 * The database rows for the tool FAQ content.
 *
 * Built from the same registries the pages render, so the table and the page
 * cannot say different things. The SQL generator and the sync test both use
 * this function: the generator writes it, the test proves what was written is
 * still what the registries describe.
 */

import { ALL_FAQ_ARTICLES } from "@/config/faq-articles";
import {
  faqArticleWordCount,
  longFormFor,
  mergedArticle,
  mergedQuestions,
} from "@/config/faq-longform";
import { faqSeoFor } from "@/config/faq-seo";
import { TOOL_FAQS } from "@/config/tool-faqs";

export interface FaqDbRow {
  slug: string;
  name: string;
  route: string;
  category: string;
  question_count: number;
  questions: { q: string; a: string }[];
  article: {
    summary: string;
    description: string;
    functions: string[];
    worked: string | null;
    advantages: string[];
    limits: string[];
  };
  seo: { title: string; description: string; keywords: string };
  word_count: number;
  source: "longform" | "registry";
}

export function buildFaqDbRows(): FaqDbRow[] {
  return TOOL_FAQS.map((group) => {
    const short = ALL_FAQ_ARTICLES[group.slug];
    const article = mergedArticle(group.slug, short);
    const questions = mergedQuestions(group.slug, group.questions);
    const long = longFormFor(group.slug);
    return {
      slug: group.slug,
      name: group.name,
      route: group.route,
      category: group.category,
      question_count: questions.length,
      questions: questions.map((item) => ({ q: item.q, a: item.a })),
      article: {
        summary: article.summary,
        description: article.description,
        functions: article.functions,
        worked: long?.worked ?? null,
        advantages: article.advantages,
        limits: article.limits,
      },
      seo: faqSeoFor(
        {
          slug: group.slug,
          name: group.name,
          route: group.route,
          category: group.category,
        },
        article,
      ),
      word_count: faqArticleWordCount(group.slug, short, group.questions),
      source: long ? "longform" : "registry",
    };
  });
}
