import { ArrowRight, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { CONSTRUCTION_TOOLS, type Tool } from "@/config/construction-tools";

/**
 * In-article promotion for the calculators and engines.
 *
 * Every string here comes from the tool registry, so the card can only promise
 * what the calculator actually does. Nothing is inferred from the article's
 * own claims: the mapping is explicit, and a category with no mapping renders
 * nothing rather than a generic sales block.
 */
const CATEGORY_TOOLS: Record<string, string[]> = {
  "surface-preparation": [
    "screeding",
    "waterproofing",
    "plastering-calculator",
  ],
  "painting-guides": ["paint", "paint-comparison", "wall-finish-estimator"],
  "painting-tips": ["paint", "paint-comparison"],
  "tile-guides": ["tile", "flooring", "paving-calculator"],
  "screeding-guides": [
    "screeding",
    "plastering-calculator",
    "wall-finish-estimator",
  ],
  "pop-ceiling-guides": [
    "pop-ceiling",
    "drywall-calculator",
    "wall-finish-estimator",
  ],
  "cost-guides": ["boq", "build-to-roof", "material-price-index"],
  "construction-guides": ["build-to-roof", "concrete", "measurement-converter"],
  "finishing-guides": ["finish", "flooring", "waterproofing"],
};

function toolsFor(category: string | null | undefined): Tool[] {
  if (!category) return [];
  const slugs = CATEGORY_TOOLS[category] ?? [];
  return slugs
    .map((slug) => CONSTRUCTION_TOOLS.find((tool) => tool.slug === slug))
    .filter((tool): tool is Tool => Boolean(tool));
}

export default function ArticleToolPromo({
  category,
  heading = "Put this article into numbers",
  intro = "The calculators behind this guide run on the same engines that price FRELUX estimates. They are free and need no account.",
}: {
  category: string | null | undefined;
  heading?: string;
  intro?: string;
}) {
  const tools = toolsFor(category);
  if (tools.length === 0) return null;
  const [primary, ...rest] = tools;

  return (
    <section
      aria-label="Calculators for this topic"
      className="my-10 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Calculator
            className="h-4.5 w-4.5 text-brand-purple"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
            {heading}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {intro}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[primary, ...rest].map((tool, index) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.slug}
              to={tool.to}
              className={
                index === 0
                  ? "group flex flex-col justify-between rounded-xl border border-primary/25 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
                  : "group flex flex-col justify-between rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/60"
              }
            >
              <div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-card">
                  <Icon
                    className="h-4 w-4 text-brand-purple"
                    aria-hidden="true"
                  />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {tool.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {tool.benefit}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple">
                Open calculator
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
