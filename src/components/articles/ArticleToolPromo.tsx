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

/**
 * One restrained unit in the shape publishers use for display inventory: a
 * single line of disclosure, one headline, one sentence of proof, one action,
 * and the related tools as plain links underneath. No nested cards, no second
 * call to action competing with the first.
 */
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
  const PrimaryIcon = primary.icon;

  return (
    <section
      aria-label="Calculators for this topic"
      className="my-10 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40"
          >
            <PrimaryIcon className="h-5 w-5 text-brand-purple" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Calculator className="h-3 w-3" aria-hidden="true" />
              FRELUX tool
            </p>
            <h2 className="mt-1 font-display text-base font-bold leading-snug text-foreground sm:text-[17px]">
              {heading}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {intro}
            </p>
            <Link
              to={primary.to}
              className="mt-2 inline-block text-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:underline"
            >
              {primary.title}
            </Link>
            {primary.benefit ? (
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                {primary.benefit}
              </p>
            ) : null}
          </div>
        </div>

        <Link
          to={primary.to}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Open calculator
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {rest.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-muted/20 px-5 py-3 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Also for this topic
          </span>
          {rest.map((tool) => (
            <Link
              key={tool.slug}
              to={tool.to}
              className="group inline-flex items-center gap-1 text-[13px] font-medium text-foreground transition-colors hover:text-brand-purple"
            >
              {tool.title}
              <ArrowRight
                className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
