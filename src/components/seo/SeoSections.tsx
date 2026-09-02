import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/shadcn/button";

// ── FAQ Section ────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: ReactNode;
}

export function FaqSection({
  title = "Frequently Asked Questions",
  faqs,
}: {
  title?: string;
  faqs: FaqItem[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6"
      aria-label={title}
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-primary-foreground">
        {title}
      </h2>
      <div className="mt-6 space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-border/60 bg-card dark:border-white/8 dark:bg-card"
          >
            <Button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={openIndex === i}
            >
              <span className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                {faq.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              />
            </Button>
            {openIndex === i && (
              <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Related Calculators ─────────────────────────────────────────────

interface RelatedLink {
  label: string;
  path: string;
  description?: string;
}

export function RelatedTools({
  title = "Related calculators & tools",
  links,
}: {
  title?: string;
  links: RelatedLink[];
}) {
  return (
    <section
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      aria-label={title}
    >
      <h2 className="text-xl font-bold tracking-tight text-foreground dark:text-primary-foreground">
        {title}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-5 py-4 transition-all hover:border-brand-purple/30 hover:bg-primary/5 hover:-translate-y-0.5 dark:border-white/8 dark:bg-card dark:hover:border-brand-purple/30 dark:hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                {link.label}
              </p>
              {link.description && (
                <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground">
                  {link.description}
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-brand-purple opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── SEO Content Section ─────────────────────────────────────────────

export function SeoContent({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

// ── Standard related calculator groups ──────────────────────────────

const CALC_LINKS = {
  // Painting routes — differentiated
  paintBuckets: {
    label: "Paint Calculator",
    path: "/paint-calculator",
    description: "How many paint buckets do I need?",
  },
  paintCost: {
    label: "Paint Cost Estimator",
    path: "/cost-estimator",
    description: "How much will my paint materials cost?",
  },
  paintingEstimator: {
    label: "Painting Estimator",
    path: "/painting-estimator",
    description: "Complete painting project estimate & summary",
  },
  // Legacy alias (backward compat)
  paintCalculator: {
    label: "Painting Calculator",
    path: "/paint-calculator",
    description: "Paint buckets, cost & room estimate",
  },
  // Screeding routes
  screedingCalc: {
    label: "Screeding Calculator",
    path: "/screeding-calculator",
    description: "Screeding quantity (m²) & cost",
  },
  screedingCost: {
    label: "Screeding Cost Estimator",
    path: "/screeding-calculator?mode=cost",
    description: "Screeding project cost estimate",
  },
  // POP routes
  popCeilingCalc: {
    label: "POP Ceiling Calculator",
    path: "/pop-ceiling-calculator",
    description: "POP material quantity & cost",
  },
  // Tile routes
  tileCalc: {
    label: "Tile Calculator",
    path: "/tile-calculator",
    description: "Tile quantity, boxes & cost",
  },
  tileCost: {
    label: "Tile Cost Estimator",
    path: "/tile-calculator?mode=cost",
    description: "Tile installation cost breakdown",
  },
  // Finishing
  finishEstimator: {
    label: "Finish Estimator",
    path: "/finish-estimator",
    description: "Compare paint, Tyrolene & Grafitex finishes",
  },
  tyrolene: {
    label: "Tyrolene Estimator",
    path: "/finish-estimator?mode=tyrolene",
    description: "Tyrolene putty estimator",
  },
  // Colors
  aiColor: {
    label: "Smart Color Assistant",
    path: "/ai-color-assistant",
    description: "AI color recommendations",
  },
  colors: {
    label: "Color Library",
    path: "/colors",
    description: "Browse paint colors with HEX, RGB & HSL",
  },
  compareColors: {
    label: "Compare Colors",
    path: "/colors/compare",
    description: "Side-by-side color comparison",
  },
  // Construction
  buildToRoof: {
    label: "Build-to-Roof Estimator",
    path: "/build-to-roof-estimator",
    description: "Foundation to roof construction estimate",
  },
  imageEstimator: {
    label: "AI Photo Estimator",
    path: "/image-estimator",
    description: "AI-assisted photo-based estimate",
  },
  smartCalc: {
    label: "Smart Calculator",
    path: "/smart-calculator",
    description: "AI-powered estimation for any project",
  },
  structuralCalc: {
    label: "Structural Calculator",
    path: "/structural-calculator",
    description: "Preliminary beam, column & slab sizing",
  },
  foundationCalc: {
    label: "Foundation Calculator",
    path: "/foundation-calculator",
    description: "Preliminary foundation sizing by soil type",
  },
  constructionSeq: {
    label: "Construction Sequence",
    path: "/construction-sequence",
    description: "Correct build order with quality gates",
  },
  projectTimeline: {
    label: "Project Timeline",
    path: "/project-timeline",
    description: "Stage-by-stage construction schedule",
  },
  // Templates
  templates: {
    label: "Calculator Templates",
    path: "/templates",
    description: "Pre-set calculator scenarios",
  },
};

export { CALC_LINKS };
