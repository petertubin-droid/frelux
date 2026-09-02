import { Ruler, Calculator, FileText, Share2, ArrowRight } from "lucide-react";
import Container from "@/components/ui/Container";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const steps = [
  {
    icon: Ruler,
    title: "Measure",
    description:
      "Input your room dimensions, wall height, doors, and windows. Just a tape measure, no technical knowledge needed.",
    accent: "text-brand-purple bg-primary/8",
    number: "01",
  },
  {
    icon: Calculator,
    title: "Calculate",
    description:
      "FRELUX computes exact quantities of paint, cement, sand, tiles, or POP using Nigerian coverage rates and real product sizes.",
    accent: "text-accent-cyan bg-accent-cyan/10",
    number: "02",
  },
  {
    icon: FileText,
    title: "Review",
    description:
      "See a full cost breakdown with current market prices. Every formula, coverage rate, and waste factor is visible.",
    accent: "text-accent-green bg-accent-green/10",
    number: "03",
  },
  {
    icon: Share2,
    title: "Save & Share",
    description:
      "Save your estimate, share a link with your contractor, or print it as a PDF. Reuse saved templates anytime.",
    accent: "text-amber-600 bg-amber-100 dark:bg-amber-500/10",
    number: "04",
  },
];

export default function HowItWorks() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-card py-20 sm:py-24 dark:bg-background bg-noise">
      <div
        className="pointer-events-none absolute inset-0 bg-dots opacity-30"
        aria-hidden="true"
      />

      <Container className="relative">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple">
            How it works
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground dark:text-primary-foreground sm:text-4xl">
            From measurement to estimate in 4 steps
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground dark:text-muted-foreground">
            No spreadsheets. No guesswork. Just accurate numbers you can trust.
          </p>
        </div>

        {/* Steps — 4 columns on desktop */}
        <div
          ref={ref}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5"
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative transition-all duration-600"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(20px)",
                  transitionDelay: `${i * 100}ms`,
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Connector arrow between cards on desktop */}
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute -right-2.5 top-12 z-10 hidden lg:block">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/60 dark:text-primary-foreground/10" />
                  </div>
                )}

                <div className="relative h-full rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:border-brand-purple/20 hover:shadow-premium dark:border-white/5 dark:bg-card dark:hover:border-brand-purple/30">
                  {/* Step number — large faded */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${step.accent} transition-transform duration-300 hover:scale-105`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="font-display text-4xl font-bold text-muted-foreground/40 dark:text-primary-foreground/5">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground dark:text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/paint-calculator?mode=room-estimate"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-purple/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Start Calculating
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
