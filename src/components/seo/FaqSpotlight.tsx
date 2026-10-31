/**
 * Internally advertised FAQs.
 *
 * A spotlight borrows a tool's own questions and answers and puts them in front
 * of a reader who is already reading about the same work, so the answer arrives
 * where the question forms instead of one navigation away. The copy is never
 * written twice: it is read from the FAQ registry, which is the same source the
 * tool's page and its structured data use.
 *
 * Deliberately no FAQPage markup here. These questions are promotional context
 * on somebody else's page, not that page's own FAQ, and emitting schema for them
 * would describe the article as something it is not.
 */

import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, HelpCircle } from "lucide-react";
import {
  pickSpotlights,
  resolveSpotlight,
  type FaqSpotlightPlacement,
} from "@/config/faq-spotlights";
import { FAQ_CATEGORIES } from "@/config/tool-faqs";
import { classNames } from "@/lib/utils";

interface FaqSpotlightProps {
  placement: FaqSpotlightPlacement;
  /** Page identity, so an article keeps the same referral on every render. */
  seed?: string;
  /** How many tools to advertise here. */
  count?: number;
  className?: string;
}

export default function FaqSpotlight({
  placement,
  seed = "",
  count = 1,
  className,
}: FaqSpotlightProps) {
  const ads = pickSpotlights(placement, seed, count);
  const resolved = ads
    .map((ad) => resolveSpotlight(ad))
    .filter((ad): ad is NonNullable<typeof ad> => Boolean(ad));

  if (resolved.length === 0) return null;

  return (
    <div
      className={classNames(
        "grid gap-4",
        resolved.length > 1 && "sm:grid-cols-2",
        className,
      )}
    >
      {resolved.map((spotlight) => (
        <SpotlightCard key={spotlight.slug} spotlight={spotlight} />
      ))}
    </div>
  );
}

function SpotlightCard({
  spotlight,
}: {
  spotlight: NonNullable<ReturnType<typeof resolveSpotlight>>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const headingId = useId();
  const categoryLabel =
    FAQ_CATEGORIES.find((category) => category.id === spotlight.category)
      ?.label ?? null;

  return (
    <aside
      aria-labelledby={headingId}
      className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 text-card-foreground shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <HelpCircle
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Tool answers
        </span>
        {categoryLabel && (
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {categoryLabel}
          </span>
        )}
      </div>

      <h2
        id={headingId}
        className="mt-3 text-base font-semibold leading-snug text-foreground sm:text-lg"
      >
        Answers from the {spotlight.name}
      </h2>

      <div className="mt-4 space-y-2">
        {spotlight.questions.map((entry, index) => {
          const answerId = `${headingId}-answer-${index}`;
          const isOpen = openIndex === index;
          return (
            <div
              key={entry.question}
              className="rounded-xl border border-border/60 bg-background/40"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={answerId}
                className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <span className="text-sm font-medium leading-snug text-foreground">
                  {entry.question}
                </span>
                <ChevronDown
                  className={classNames(
                    "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
              <div
                id={answerId}
                hidden={!isOpen}
                className="px-3 pb-3 text-sm leading-relaxed text-muted-foreground"
              >
                {entry.answer}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <Link
          to={spotlight.route}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          Open the {spotlight.name}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          to={`/faq/${spotlight.slug}`}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          All {spotlight.totalQuestions} answers
        </Link>
      </div>
    </aside>
  );
}
