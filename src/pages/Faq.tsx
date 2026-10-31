/**
 * Dedicated FAQ page: every tool question FRELUX answers, grouped by trade.
 *
 * One page carries the whole registry so a visitor (and a crawler) can move from
 * "how many coats of paint" to the paint calculator without bouncing back to
 * Google. Structured data mirrors the visible questions through the shared
 * ToolFaqs component family, and each answer links onward to its own tool.
 */

import { Link } from "react-router-dom";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { FaqSection } from "@/components/seo/SeoSections";
import {
  FAQ_CATEGORIES,
  TOOL_FAQS,
  allToolFaqQuestions,
  type FaqCategoryId,
} from "@/config/tool-faqs";
import { useSeo, useBreadcrumbJsonLd, useFaqJsonLd } from "@/lib/seo";
import { BookOpen, Calculator } from "lucide-react";

export default function Faq() {
  const all = allToolFaqQuestions();

  useSeo({
    title: "Construction and Material Questions, Answered | FRELUX",
    description:
      "Answers to the questions people ask before buying building materials: paint and tile quantities, screed and POP materials, foundation concrete, retaining wall footings, gutters, conduit, steel beam weight and how FRELUX estimates work.",
    canonicalPath: "/faq",
    keywords:
      "construction questions answered, how many coats of paint, how many tiles do I need, retaining wall footing width, steel beam weight, gutter and fascia quantities",
  });
  useBreadcrumbJsonLd([{ name: "Questions and Answers", path: "/faq" }]);
  useFaqJsonLd(all.map((q) => ({ question: q.q, answer: q.a })));

  const groupsFor = (category: FaqCategoryId) =>
    TOOL_FAQS.filter((g) => g.category === category);
  const totalQuestions = all.length;

  return (
    <>
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Questions and Answers", path: "/faq" },
        ]}
        title="Construction Questions, Answered"
        subtitle={`${totalQuestions} answers across ${TOOL_FAQS.length} tools: what each calculator decides, what it deliberately leaves out, and how to check the numbers it gives you.`}
      />

      <Container className="pb-16 pt-6">
        <nav
          aria-label="Question categories"
          className="mb-8 flex flex-wrap gap-2"
        >
          {FAQ_CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {c.label}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {FAQ_CATEGORIES.map((category) => {
            const groups = groupsFor(category.id);
            if (groups.length === 0) return null;
            return (
              <section
                key={category.id}
                id={category.id}
                aria-labelledby={`${category.id}-heading`}
              >
                <h2
                  id={`${category.id}-heading`}
                  className="text-xl font-semibold tracking-tight"
                >
                  {category.label}
                </h2>

                <div className="mt-4 space-y-8">
                  {groups.map((group) => (
                    <div key={group.slug}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-medium">{group.name}</h3>
                        <Link
                          to={group.route}
                          className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                        >
                          <Calculator className="h-4 w-4" aria-hidden="true" />{" "}
                          Open the calculator
                        </Link>
                      </div>
                      <FaqSection
                        title={`${group.name} questions`}
                        faqs={group.questions.map((q) => ({
                          question: q.q,
                          answer: q.a,
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-12 rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <BookOpen
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />{" "}
            Want the reasoning, not just the answer?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The construction guides explain the methods behind the calculators:
            how quantities are derived, where site conditions change them, and
            how to read a breakdown before you send money to a supplier.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Read the guides
            </Link>
            <Link
              to="/construction-tools"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              All construction tools
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
