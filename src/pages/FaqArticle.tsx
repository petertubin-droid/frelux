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
import { FAQ_CATEGORIES, getToolFaqGroup } from "@/config/tool-faqs";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { ArrowRight, Calculator } from "lucide-react";

export default function FaqArticle() {
  const { slug = "" } = useParams<{ slug: string }>();
  const group = getToolFaqGroup(slug);
  const article = getFaqArticle(slug);
  const categoryLabel =
    FAQ_CATEGORIES.find((category) => category.id === group?.category)?.label ??
    null;

  useSeo({
    title: group
      ? `${group.name}: what it calculates and what it leaves out | FRELUX`
      : "Questions and answers | FRELUX",
    description: article
      ? article.summary
      : "Answers to the questions people ask before buying building materials.",
    canonicalPath: `/faq/${slug}`,
  });
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

          <div className="mt-8 space-y-10">
            {FAQ_ARTICLE_SECTIONS.map((section) => {
              const value = article[section.key];
              return (
                <section
                  key={section.key}
                  aria-labelledby={`${section.key}-heading`}
                >
                  <h2
                    id={`${section.key}-heading`}
                    className="text-xl font-semibold tracking-tight text-foreground"
                  >
                    {section.heading}
                  </h2>
                  {typeof value === "string" ? (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {value}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {value.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </article>

        <div className="mx-auto max-w-3xl">
          <FaqItemsWithSchema
            title={`${group.name} questions`}
            faqs={group.questions.map((question) => ({
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
