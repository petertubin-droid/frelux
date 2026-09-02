import { Link } from "react-router-dom";
import {
  Calculator,
  DollarSign,
  ArrowRight,
  Paintbrush,
  Layers,
  Grid3x3,
  Building2,
  Palette,
  Square,
  type LucideIcon,
} from "lucide-react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Tool {
  icon: LucideIcon;
  title: string;
  description: string;
  benefit: string;
  to: string;
  accent: string;
  glow: string;
  featured?: boolean;
}

const allTools: Tool[] = [
  {
    icon: Paintbrush,
    title: "Painting Estimator",
    description:
      "Complete room-by-room painting project estimate: paint buckets, ceiling, walls, surface conditions, and material costs.",
    benefit: "Bucket-level accuracy",
    to: "/paint-calculator?mode=room-estimate",
    accent: "text-brand-purple bg-primary/10",
    glow: "group-hover:bg-primary/10",
    featured: true,
  },
  {
    icon: Calculator,
    title: "Paint Calculator",
    description:
      "Estimate how many paint buckets you need based on wall area, coats, doors, and windows.",
    benefit: "Paint buckets",
    to: "/paint-calculator",
    accent: "text-accent-orange bg-accent-orange/10",
    glow: "group-hover:bg-accent-orange/10",
  },
  {
    icon: Square,
    title: "Screeding Calculator",
    description:
      "Calculate the wall surface area that needs screeding, with door and window deductions.",
    benefit: "Surface area & materials",
    to: "/screeding-calculator",
    accent: "text-accent-cyan bg-accent-cyan/10",
    glow: "group-hover:bg-accent-cyan/10",
  },
  {
    icon: Layers,
    title: "POP Ceiling Calculator",
    description:
      "Calculate POP cement, fibreglass mesh, and materials needed for your ceiling project.",
    benefit: "Cement & mesh quantities",
    to: "/pop-ceiling-calculator",
    accent: "text-brand-purple bg-primary/10",
    glow: "group-hover:bg-primary/10",
  },
  {
    icon: Grid3x3,
    title: "Tile Calculator",
    description:
      "Calculate how many tiles you need, plus adhesive and grout, for floors and walls.",
    benefit: "Tiles, adhesive & grout",
    to: "/tile-calculator",
    accent: "text-accent-cyan bg-accent-cyan/10",
    glow: "group-hover:bg-accent-cyan/10",
  },
  {
    icon: Building2,
    title: "Tyrolene Estimator",
    description:
      "Partition-based exterior finish estimator. Calculate cement, sand, acrylic bond, and additives.",
    benefit: "Exterior finishing",
    to: "/finish-estimator?mode=tyrolene",
    accent: "text-amber-600 bg-amber-100 dark:bg-amber-500/10",
    glow: "group-hover:bg-amber-400/10",
  },
  {
    icon: DollarSign,
    title: "Paint Cost Estimator",
    description:
      "Estimate the cost of your paint materials — buckets, primer, and supplies — using configurable product prices.",
    benefit: "Full cost breakdown",
    to: "/paint-calculator?mode=cost",
    accent: "text-accent-green bg-accent-green/10",
    glow: "group-hover:bg-accent-green/10",
  },
  {
    icon: Building2,
    title: "Finish Estimator",
    description:
      "Compare painting, Tyrolene, and Grafitex finishes, material quantities and costs side by side.",
    benefit: "Side-by-side comparison",
    to: "/finish-estimator",
    accent: "text-amber-600 bg-amber-100 dark:bg-amber-500/10",
    glow: "group-hover:bg-amber-400/10",
  },
];

export default function ToolsSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section
      data-tour="calculators"
      className="relative overflow-hidden bg-card py-20 sm:py-24 dark:bg-background bg-noise"
    >
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none absolute inset-0 bg-dots opacity-40"
        aria-hidden="true"
      />

      <SectionHeading
        label="All calculators"
        title="Everything you need, organized by trade"
        subtitle="Pick a calculator and start calculating. Every tool uses Nigerian coverage rates and real product prices."
        align="center"
      />

      <Container className="relative mt-14">
        {/* Bento-style grid: featured card spans 2 columns */}
        <div ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {allTools.map((tool, i) => {
            const Icon = tool.icon;
            const isFeatured = tool.featured;
            return (
              <Link
                key={tool.to}
                to={tool.to}
                className={`card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 dark:border-white/5 dark:bg-card lg:col-span-1 ${
                  isFeatured ? "lg:col-span-2 lg:row-span-1" : ""
                } lg:col-span-1`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(20px)",
                  transitionProperty: "opacity, transform",
                  transitionDuration: "600ms",
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: `${i * 60}ms`,
                }}
              >
                {/* Subtle hover gradient */}
                <div
                  className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/0 blur-3xl transition-all duration-500 ${tool.glow}`}
                />

                {/* Shimmer border on top */}
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all duration-500 group-hover:via-primary/30" />

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tool.accent} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-purple dark:bg-primary/15 dark:text-brand-purple-lighter">
                      Recommended
                    </span>
                  )}
                </div>

                <h4 className="mt-4 font-display text-base font-bold text-foreground dark:text-primary-foreground">
                  {tool.title}
                </h4>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                  {tool.description}
                </p>

                {/* Benefit tag */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                    {tool.benefit}
                  </span>
                </div>

                {/* CTA */}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                  Open calculator
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}

          {/* Color & AI — smaller card */}
          <Link
            to="/colors"
            className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 dark:border-white/5 dark:bg-card"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(20px)",
              transitionProperty: "opacity, transform",
              transitionDuration: "600ms",
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: `${allTools.length * 60}ms`,
            }}
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/0 blur-3xl transition-all duration-500 group-hover:bg-primary/10" />
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-brand-purple bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                <Palette className="h-5 w-5" />
              </span>
            </div>
            <h4 className="mt-4 font-display text-base font-bold text-foreground dark:text-primary-foreground">
              Color Library & AI
            </h4>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
              Browse hundreds of paint colours with names and codes. Get
              AI-powered recommendations.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
              Explore colors
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </Container>

      {/* Explore all CTA */}
      <Container className="relative mt-12 text-center">
        <Link
          to="/templates"
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:border-brand-purple/20 hover:text-brand-purple hover:shadow-md dark:border-white/10 dark:bg-card dark:text-primary-foreground/80"
        >
          Explore Calculator Templates
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Container>
    </section>
  );
}
