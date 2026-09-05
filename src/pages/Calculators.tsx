import { Link } from "react-router-dom";
import AdSlot from "@/components/ui/AdSlot";
import {
  Paintbrush,

  Grid3x3,
  Square,
  Layers,
  Building2,
  Camera,
  Calendar,
  ListChecks,
  Palette,
  ArrowRight,
  Brain,
  type LucideIcon,
} from "lucide-react";
import Container from "@/components/ui/Container";
import { useSeo } from "@/lib/seo";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SITE_URL } from "@/lib/seo";

interface Tool {
  icon: LucideIcon;
  title: string;
  description: string;
  benefit: string;
  to: string;
  accent: string;
  featured?: boolean;
}

const calculators: Tool[] = [
  {
    icon: Paintbrush,
    title: "Painting Calculator",
    description:
      "Calculate paint quantities, painting requirements and estimated cost — all in one tool.",
    benefit: "Quantity · Cost · Estimate",
    to: "/paint-calculator",
    accent: "text-brand-purple bg-primary/10",
    featured: true,
  },
  {
    icon: Square,
    title: "Screeding Calculator",
    description:
      "Calculate wall screeding quantity, material requirements and cost estimation.",
    benefit: "Quantity & cost",
    to: "/screeding-calculator",
    accent: "text-accent-cyan bg-accent-cyan/10",
  },
  {
    icon: Layers,
    title: "POP Ceiling Calculator",
    description:
      "Calculate POP cement, fibreglass mesh, material breakdown and cost estimate.",
    benefit: "Material & cost",
    to: "/pop-ceiling-calculator",
    accent: "text-brand-purple bg-primary/10",
  },
  {
    icon: Grid3x3,
    title: "Tile Calculator",
    description:
      "Calculate tile quantity, boxes, waste, adhesive, grout and cost estimate.",
    benefit: "Tiles & cost",
    to: "/tile-calculator",
    accent: "text-accent-cyan bg-accent-cyan/10",
  },
  {
    icon: Building2,
    title: "Finishing Calculator",
    description:
      "Compare painting, Tyrolene and Grafitex finishes — material quantities and costs side by side.",
    benefit: "Tyrolene · Grafitex",
    to: "/finish-estimator",
    accent: "text-accent-amber bg-accent-amber/10",
  },
  {
    icon: Building2,
    title: "Build-to-Roof Estimator",
    description:
      "Calculate materials, quantities, and costs from foundation through roof — structural concrete, blockwork, roofing, and more.",
    benefit: "Foundation to roof",
    to: "/build-to-roof-estimator",
    accent: "text-brand-purple bg-primary/10",
    featured: true,
  },
  {
    icon: Camera,
    title: "AI Photo Estimator",
    description:
      "Upload a photo of any building and get an instant AI-powered construction cost estimate. Premium feature.",
    benefit: "AI-powered · Premium",
    to: "/image-estimator",
    accent: "text-accent-green bg-accent-green/10",
    featured: true,
  },
  {
    icon: Brain,
    title: "Smart Calculator",
    description:
      "Describe any construction project in plain language and get an AI-powered cost estimate with material quantities, line items, and savings tips.",
    benefit: "AI-powered · Free",
    to: "/smart-calculator",
    accent: "text-brand-purple bg-primary/10",
    featured: true,
  },
  {
    icon: Building2,
    title: "Structural Calculator",
    description:
      "Engineer-grade beam, column, and slab sizing with full BS 8110 formula transparency.",
    benefit: "BS 8110 · Engineer-grade",
    to: "/structural-calculator",
    accent: "text-brand-purple bg-primary/10",
    featured: true,
  },
  {
    icon: Layers,
    title: "Foundation Designer",
    description:
      "Strip, pad, and raft foundation sizing based on soil bearing capacity. Nigerian soil types.",
    benefit: "Soil-aware · BS 8004",
    to: "/foundation-calculator",
    accent: "text-brand-purple bg-primary/10",
  },
  {
    icon: Calendar,
    title: "Project Timeline",
    description:
      "How long will your build take? Stage-by-stage duration with milestones and risk analysis.",
    benefit: "Schedule · Milestones",
    to: "/project-timeline",
    accent: "text-brand-purple bg-primary/10",
  },
  {
    icon: ListChecks,
    title: "Construction Sequence",
    description:
      "The correct build order from site clearing to weathertight. Quality gates, safety, common mistakes.",
    benefit: "Quality gates · Safety",
    to: "/construction-sequence",
    accent: "text-brand-purple bg-primary/10",
  },
];

export default function Calculators() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  useSeo({
    title: "All Calculators | FRELUX PROJECT CALC",
    description:
      "Browse every FRELUX calculator — paint, screeding, POP ceiling, tiles, tyrolene, finishing, and cost estimators. Free Nigerian construction material calculators.",
    canonicalPath: "/calculators",
    ogType: "website",
    keywords:
      "paint calculator, screeding calculator, POP ceiling calculator, tile calculator, cost estimator, construction calculator Nigeria, build to roof estimator, tyrolene estimator, finishing estimator",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "FRELUX Calculators",
        itemListElement: calculators.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.title,
          url: `${SITE_URL}${c.to}`,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Calculators",
            item: `${SITE_URL}/calculators`,
          },
        ],
      },
    ],
  });

  return (
    <>
      {/* Hero strip — premium */}
      <section
        aria-label="All FRELUX calculators"
        className="relative overflow-hidden bg-mesh text-primary-foreground"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-grid-dark opacity-50"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        </div>
        <Container className="relative py-16 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-primary-foreground/70 backdrop-blur-md">
            <Brain
              aria-hidden="true"
              className="h-3.5 w-3.5 text-brand-purple-light"
            />
            {calculators.length}+ Free Tools
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl text-balance">
            Every FRELUX calculator in one place
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-primary-foreground/55">
            Pick a tool below to start estimating materials and costs. Every
            calculator uses Nigerian coverage rates and admin-configured material prices.
          </p>
        </Container>
      </section>

      {/* Calculator grid */}
      <section
        aria-label="Calculator tools"
        className="bg-card py-16 dark:bg-background sm:py-20"
      >
        <Container>
          <div ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {calculators.map((tool, i) => {
              const Icon = tool.icon;
              const isFeatured = tool.featured;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className={`calc-card group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-brand-purple/20 dark:border-white/5 dark:bg-card ${
                    isFeatured ? "lg:col-span-2" : ""
                  }`}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateY(0)" : "translateY(20px)",
                    transitionProperty: "opacity, transform",
                    transitionDuration: "600ms",
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: `${i * 50}ms`,
                  }}
                >
                  <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/0 blur-3xl transition-all duration-500 group-hover:bg-primary/10" />
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

                  <h3 className="mt-5 font-display text-base font-bold text-foreground dark:text-primary-foreground">
                    {tool.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                    {tool.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                      {tool.benefit}
                    </span>
                  </div>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                    Open calculator
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}

            {/* Color & AI card */}
            <Link
              to="/colors"
              className="calc-card group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-brand-purple/20 dark:border-white/5 dark:bg-card"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(20px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "600ms",
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: `${calculators.length * 50}ms`,
              }}
            >
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/0 blur-3xl transition-all duration-500 group-hover:bg-primary/10" />
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-brand-purple bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <Palette aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-5 font-display text-base font-bold text-foreground dark:text-primary-foreground">
                Color Library & AI
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                Browse paint colors, compare combinations, and get AI-powered
                color suggestions.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                Browse colors
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </Link>
          </div>

          {/* Adsterra Native Banner slot — placement "calculators_native" */}
          {/* Ad slot — placement "calculators_mid" */}
          <AdSlot slotKey="calculators_mid" className="mt-10" />
          <AdSlot slotKey="calculators_native" className="mt-10" />
          <AdSlot slotKey="calculators_bottom" className="mt-10" />
          {/* Back to home */}
          <div className="mt-12 text-center">
            <Link
              to="/"
              className="text-sm font-medium text-brand-purple hover:text-brand-purple-dark dark:text-brand-purple-lighter"
            >
              ← Back to home
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
