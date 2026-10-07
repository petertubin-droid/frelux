import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  CONSTRUCTION_TOOLS,
  TOOL_CATEGORIES,
  type ToolCategoryId,
} from "@/config/construction-tools";

// Registry-driven preview of the complete FRELUX tool library: every
// category with its most popular tools and a count badge. The homepage
// should display what the platform does end-to-end, not just the
// finishing calculators twice.
const CATEGORY_TOP_TOOLS = 4;

const categoryCards = TOOL_CATEGORIES.map((category) => {
  const tools = CONSTRUCTION_TOOLS.filter(
    (t) => t.category === (category.id as ToolCategoryId),
  );
  // Featured tools first, then registry order.
  const top = [...tools].sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false),
  );
  return {
    id: category.id,
    label: category.label,
    blurb: category.blurb,
    count: tools.length,
    tools: top.slice(0, CATEGORY_TOP_TOOLS),
  };
});

export default function ToolsSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section
      data-tour="calculators"
      className="relative overflow-hidden bg-card py-20 sm:py-24 dark:bg-background bg-noise"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-dots opacity-20"
        aria-hidden="true"
      />

      <SectionHeading
        label="The complete tool library"
        title="Every trade, one platform"
        subtitle="Material calculators, cost estimators, project tools and AI assistants: all using market-localized coverage rates and verified prices."
        align="center"
      />

      <Container className="relative mt-14">
        <div
          ref={ref}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {categoryCards.map((category, i) => (
            <div
              key={category.id}
              className="group relative flex flex-col rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-brand-purple/20 hover:shadow-premium dark:border-white/5 dark:bg-card dark:hover:border-brand-purple/30"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(20px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "600ms",
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-base font-bold text-foreground dark:text-primary-foreground">
                  {category.label}
                </h3>
                <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-purple dark:text-brand-purple-lighter">
                  {category.count} tools
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                {category.blurb}
              </p>

              <ul className="mt-4 flex flex-col gap-1.5">
                {category.tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      to={tool.to}
                      className="inline-flex items-center gap-1.5 text-sm text-card-foreground transition-colors hover:text-brand-purple dark:text-muted-foreground dark:hover:text-brand-purple-lighter"
                    >
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-brand-purple/60 transition-all group-hover:text-brand-purple dark:text-brand-purple-lighter/60"
                      />
                      {tool.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* CTA card: the full library lives on /construction-tools */}
          <Link
            to="/construction-tools"
            className="group relative flex flex-col justify-between rounded-2xl border border-brand-purple/30 bg-primary/5 p-6 transition-all duration-300 hover:border-brand-purple/60 hover:shadow-premium dark:border-brand-purple-lighter/30 dark:bg-brand-purple/10 dark:hover:border-brand-purple-lighter/60"
          >
            <div>
              <h3 className="font-display text-base font-bold text-foreground dark:text-primary-foreground">
                Explore all tools
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                The full library with search, categorized by trade: free to use,
                no sign-up required.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
              Open the tool library
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
