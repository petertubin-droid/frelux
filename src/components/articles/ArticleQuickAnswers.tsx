import { ArrowRight, HelpCircle } from "lucide-react";

/**
 * The first three questions, answered inside the article body.
 *
 * The full list already sits at the end of the page and is emitted as FAQPage
 * data. This block exists because a reader who has just finished a section
 * should not have to scroll past three more screens to find the answer to the
 * question they actually came with.
 */
export default function ArticleQuickAnswers({
  items,
  heading = "Questions this article answers",
  moreHref = "#faqs",
}: {
  items: Array<{ question: string; answer: string }>;
  heading?: string;
  moreHref?: string;
}) {
  const shown = items.slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <section
      aria-label={heading}
      className="my-10 rounded-2xl border border-border bg-muted/20 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-card">
          <HelpCircle
            className="h-4 w-4 text-brand-purple"
            aria-hidden="true"
          />
        </span>
        <h2 className="font-display text-base font-bold text-foreground">
          {heading}
        </h2>
      </div>

      <div className="mt-4 divide-y divide-border/70">
        {shown.map((item) => (
          <details key={item.question} className="group py-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-foreground marker:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-90"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      {items.length > shown.length && (
        <a
          href={moreHref}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple"
        >
          All {items.length} questions
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
