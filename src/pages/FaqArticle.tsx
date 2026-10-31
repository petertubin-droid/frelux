/**
 * One FAQ group as a full article: what the tool is, what it calculates, why it
 * is worth using, what it refuses to do, and then the group's own questions.
 *
 * The questions alone answer a single point each; a contractor sending a quote
 * or a client checking one usually needs the frame around them. Both halves come
 * from the same registries, so nothing on this page can contradict the tool page
 * or its structured data.
 */

import { Link, useParams } from "react-router-dom";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
import { getFaqArticle, FAQ_ARTICLE_SECTIONS } from "@/config/faq-articles";
import {
  longFormFor,
  mergedArticle,
  mergedQuestions,
} from "@/config/faq-longform";
import { faqSeoFor } from "@/config/faq-seo";
import { SITE_URL } from "@/lib/site-config";
import { FAQ_CATEGORIES, getToolFaqGroup } from "@/config/tool-faqs";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { ArrowRight, Calculator } from "lucide-react";

export default function FaqArticle() {
  const { slug = "" } = useParams<{ slug: string }>();
  const group = getToolFaqGroup(slug);
  const shortArticle = getFaqArticle(slug);
  const article = shortArticle ? mergedArticle(slug, shortArticle) : undefined;
  const longForm = longFormFor(slug);
  const categoryLabel =
    FAQ_CATEGORIES.find((category) => category.id === group?.category)?.label ??
    null;

  const seo =
    group && article
      ? faqSeoFor(
          {
            slug: group.slug,
            name: group.name,
            route: group.route,
            category: group.category,
          },
          article,
        )
      : null;

  useSeo(
    seo && group && article
      ? {
          title: seo.title,
          description: seo.description,
          keywords: seo.keywords,
          canonicalPath: `/faq/${slug}`,
          ogType: "article",
          structuredData: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: group.name,
            description: seo.description,
            abstract: article.summary,
            articleSection: categoryLabel ?? "Construction",
            inLanguage: "en",
            isAccessibleForFree: true,
            mainEntityOfPage: `${SITE_URL}/faq/${slug}/`,
            about: {
              "@type": "Thing",
              name: `${group.name} quantities and costs`,
            },
            publisher: {
              "@type": "Organization",
              name: "FRELUX SMART CALC",
              url: SITE_URL,
            },
          },
        }
      : {
          title: "Questions and answers | FRELUX",
          description:
            "Answers to the questions people ask before buying building materials.",
          canonicalPath: `/faq/${slug}`,
          noIndex: true,
        },
  );
  useBreadcrumbJsonLd([
    { name: "Questions and Answers", path: "/faq" },
    ...(group ? [{ name: group.name, path: `/faq/${group.slug}` }] : []),
  ]);

  if (!group || !article) {
    return (
      <>
        <PageHeader
          variant="tool"
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Questions and Answers", path: "/faq" },
          ]}
          title="That answer page does not exist"
          subtitle="The question list is still there, grouped by trade."
        />
        <Container className="pb-16">
          <Link
            to="/faq"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Browse every question
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Container>
      </>
    );
  }

  const sections = [
    ...FAQ_ARTICLE_SECTIONS.filter((section) => section.key !== "advantages"),
    ...(longForm
      ? [{ key: "worked" as const, heading: "A worked example" }]
      : []),
    ...FAQ_ARTICLE_SECTIONS.filter((section) => section.key === "advantages"),
  ];

  return (
    <>
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Questions and Answers", path: "/faq" },
          { label: group.name, path: `/faq/${group.slug}` },
        ]}
        title={group.name}
        subtitle={article.summary}
      />

      <Container className="pb-16 pt-6">
        <article className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {categoryLabel && (
              <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {categoryLabel}
              </span>
            )}
            <Link
              to={group.route}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <Calculator className="h-4 w-4" aria-hidden="true" />
              Open the tool
            </Link>
          </div>

          <p className="article-body mt-6 border-l-2 border-border pl-4">
            {group.name} works in any supported market. Bag sizes, tin sizes,
            coverage rates, currencies and codes come from the market you
            select, and where a market has no verified figure the tool asks for
            one instead of falling back to a default.
          </p>

          <div className="mt-9 space-y-9">
            {sections.map((section, index) => {
              const value =
                section.key === "worked"
                  ? (longForm?.worked ?? "")
                  : article[section.key];
              return (
                <section
                  key={section.key}
                  aria-labelledby={`${section.key}-heading`}
                  className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-5"
                >
                  <span aria-hidden="true" className="faq-marker pt-1.5">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2
                      id={`${section.key}-heading`}
                      className="article-heading"
                    >
                      {section.heading}
                    </h2>
                    {typeof value === "string" ? (
                      value.split("\n\n").map((paragraph) => (
                        <p
                          key={paragraph.slice(0, 24)}
                          className="article-body mt-2.5"
                        >
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <ul className="mt-3 space-y-2.5">
                        {value.map((item) => (
                          <li key={item} className="article-body flex gap-3">
                            <span
                              aria-hidden="true"
                              className="mt-[0.55rem] h-1 w-3 shrink-0 rounded-full bg-primary/50"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <div className="mx-auto max-w-3xl">
          <FaqItemsWithSchema
            title={`${group.name} questions`}
            faqs={mergedQuestions(slug, group.questions).map((question) => ({
              question: question.q,
              answer: question.a,
            }))}
          />
          <p className="text-sm text-muted-foreground">
            <Link
              to="/faq"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Every question FRELUX answers
            </Link>{" "}
            covers the rest of the tools in the same format.
          </p>
        </div>
      </Container>
    </>
  );
}
