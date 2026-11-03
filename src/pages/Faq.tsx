/**
 * Dedicated FAQ page: every tool question FRELUX answers, grouped by trade.
 *
 * One page carries the whole registry so a visitor (and a crawler) can move from
 * "how many coats of paint" to the paint calculator without bouncing back to
 * Google. The layout is a working index rather than a wall of accordions: a
 * sticky rail with the search field and the trades, then one panel per tool with
 * its questions and the two ways out of it, the calculator and the full guide.
 *
 * Structured data mirrors the visible questions through the shared FAQ registry,
 * so a filter that hides a row in the browser never changes what is published in
 * the HTML the crawler receives.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  FAQ_CATEGORIES,
  TOOL_FAQS,
  allToolFaqQuestions,
  type FaqCategoryId,
} from "@/config/tool-faqs";
import { useSeo, useBreadcrumbJsonLd, useFaqJsonLd } from "@/lib/seo";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronDown,
  HelpCircle,
  Search,
  X,
} from "lucide-react";

type Filter = FaqCategoryId | "all";

/** One tool's questions, opened one at a time like a specification sheet. */
function ToolPanel({
  name,
  slug,
  route,
  questions,
}: {
  name: string;
  slug: string;
  route: string;
  questions: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-primary/30 dark:border-white/8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-5 py-4 dark:bg-white/2">
        <h3 className="text-base font-semibold tracking-tight text-foreground dark:text-primary-foreground">
          {name}
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {questions.length}{" "}
            {questions.length === 1 ? "question" : "questions"}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            to={route}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <Calculator className="h-4 w-4" aria-hidden="true" />
            Calculator
          </Link>
          <Link
            to={`/faq/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline dark:text-primary-foreground"
          >
            Full guide
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <ul className="divide-y divide-border/60">
        {questions.map((item, index) => {
          const isOpen = open === index;
          return (
            <li key={item.q}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 sm:px-5"
              >
                <span
                  className="mt-0.5 w-5 shrink-0 text-[11px] font-semibold tabular-nums text-primary/70"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground dark:text-primary-foreground">
                  {item.q}
                </span>
                <ChevronDown
                  className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 sm:pl-12">
                  <p className="max-w-[68ch] text-[15px] leading-[1.75] text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 1;

  const groupsFor = (category: FaqCategoryId) =>
    TOOL_FAQS.filter((g) => g.category === category);

  const matches = (q: { q: string; a: string }) =>
    !searching ||
    q.q.toLowerCase().includes(needle) ||
    q.a.toLowerCase().includes(needle);

  const visible = useMemo(
    () =>
      FAQ_CATEGORIES.map((category) => {
        const groups = groupsFor(category.id)
          .filter(
            (group) =>
              !searching ||
              group.name.toLowerCase().includes(needle) ||
              group.questions.some(matches),
          )
          .map((group) => ({
            ...group,
            questions: searching
              ? group.questions.filter(matches)
              : group.questions,
          }))
          .filter((group) => group.questions.length > 0);
        return { category, groups };
      }).filter(
        ({ category, groups }) =>
          groups.length > 0 && (filter === "all" || category.id === filter),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needle, searching, filter],
  );

  const shownQuestions = visible.reduce(
    (total, section) =>
      total +
      section.groups.reduce((n, group) => n + group.questions.length, 0),
    0,
  );

  const stats = [
    { label: "Questions answered", value: all.length },
    { label: "Tools covered", value: TOOL_FAQS.length },
    { label: "Trades", value: FAQ_CATEGORIES.length },
  ];

  return (
    <>
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Questions and Answers", path: "/faq" },
        ]}
        title="Construction Questions, Answered"
        subtitle={`${all.length} answers across ${TOOL_FAQS.length} tools: what each calculator decides, what it deliberately leaves out, and how to check the numbers it gives you.`}
      />

      <Container className="pb-16 pt-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/70 bg-card px-5 py-4 dark:border-white/8"
            >
              <p className="text-2xl font-semibold tracking-tight text-foreground dark:text-primary-foreground">
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a question"
                aria-label="Search the questions"
                className="w-full rounded-xl border border-border/70 bg-card py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 dark:border-white/10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear the search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </label>

            <nav aria-label="Question categories" className="mt-4">
              <ul className="flex flex-wrap gap-1.5 lg:flex-col">
                <li>
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      filter === "all"
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    All trades
                    <span className="float-right text-xs text-muted-foreground">
                      {TOOL_FAQS.length}
                    </span>
                  </button>
                </li>
                {FAQ_CATEGORIES.map((category) => {
                  const count = groupsFor(category.id).length;
                  if (count === 0) return null;
                  const active = filter === category.id;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setFilter(category.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {category.label}
                        <span className="float-right text-xs text-muted-foreground">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {searching && (
              <p
                className="mt-4 text-xs text-muted-foreground"
                aria-live="polite"
              >
                {shownQuestions} of {all.length} questions match “{query.trim()}
                ”.
              </p>
            )}
          </aside>

          <div className="mt-8 space-y-10 lg:mt-0">
            {visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
                <HelpCircle
                  className="mx-auto h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nothing matches that yet. Try a word like tile, primer,
                  concrete or gutter, or browse the tools.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                  className="mt-4 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Show every question
                </button>
              </div>
            )}

            {visible.map(({ category, groups }) => (
              <section
                key={category.id}
                id={category.id}
                aria-labelledby={`${category.id}-heading`}
                className="scroll-mt-24"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2
                    id={`${category.id}-heading`}
                    className="text-lg font-semibold tracking-tight text-foreground dark:text-primary-foreground"
                  >
                    {category.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {groups.length} {groups.length === 1 ? "tool" : "tools"}
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  {groups.map((group) => (
                    <ToolPanel
                      key={group.slug}
                      name={group.name}
                      slug={group.slug}
                      route={group.route}
                      questions={group.questions.map((question) => ({
                        q: question.q,
                        a: question.a,
                      }))}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <section className="mt-12 rounded-2xl border border-border/70 bg-card p-6 dark:border-white/8">
          <h2 className="flex items-center gap-2 font-semibold text-foreground dark:text-primary-foreground">
            <BookOpen
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            Want the reasoning, not just the answer?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
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
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              All construction tools
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
