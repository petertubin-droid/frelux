import { Link } from 'react-router-dom';
import {
  Calculator,
  DollarSign,
  Save,
  FileStack,
  MapPin,
  ArrowRight,
  Ruler,
  ClipboardList,
} from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const capabilities = [
  {
    icon: Ruler,
    title: 'Calculate Required Materials',
    description: 'Get exact quantities of paint, cement, sand, tiles, and POP based on your actual room dimensions. Every calculation accounts for doors, windows, coats, and waste factors.',
    to: '/paint-calculator',
    linkText: 'Start calculating',
  },
  {
    icon: DollarSign,
    title: 'Estimate Project Costs',
    description: 'Convert material quantities into real cost estimates using current Nigerian market prices. Adjust prices to match your local supplier.',
    to: '/paint-calculator?mode=cost',
    linkText: 'Estimate costs',
  },
  {
    icon: Save,
    title: 'Save Estimates',
    description: 'Save your calculations and come back to them anytime. Share a link with your contractor or print a PDF for your records.',
    to: '/my-projects',
    linkText: 'View saved estimates',
  },
  {
    icon: FileStack,
    title: 'Use Calculator Templates',
    description: 'Start from pre-configured templates for common Nigerian construction projects. Adjust the dimensions to match your actual measurements.',
    to: '/templates',
    linkText: 'Browse templates',
  },
  {
    icon: MapPin,
    title: 'Nigerian-Market Calculations',
    description: 'Coverage rates, product sizes, and prices calibrated for Nigerian brands and building practices. Not generic formulas copied from abroad.',
    to: '/paint-calculator?mode=cost',
    linkText: 'See how it works',
  },
  {
    icon: ClipboardList,
    title: 'Explore Materials & Finishing',
    description: 'Compare painting, Tyrolene, and Grafitex finishes side by side. Understand material requirements for each finishing approach.',
    to: '/finish-estimator',
    linkText: 'Compare finishes',
  },
];

export default function CommercialReadiness() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24 dark:bg-brand-navy bg-noise">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-30" aria-hidden="true" />

      <SectionHeading
        label="More than calculators"
        title="A complete construction planning toolkit"
        subtitle="FRELUX handles the entire flow from measurement to final estimate, so you can plan with confidence."
        align="center"
      />

      <Container className="relative mt-14">
        <div ref={ref} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="group relative flex flex-col rounded-2xl border border-neutral-200/60 bg-white p-7 transition-all duration-300 hover:border-brand-purple/20 hover:shadow-premium dark:border-white/5 dark:bg-brand-navy-mid dark:hover:border-brand-purple/30"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transitionProperty: 'opacity, transform',
                  transitionDuration: '600ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  transitionDelay: `${i * 60}ms`,
                }}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple transition-transform duration-300 group-hover:scale-110 dark:text-brand-purple-lighter">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-neutral-900 dark:text-white">{cap.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-500">{cap.description}</p>
                <Link
                  to={cap.to}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all hover:gap-2.5 dark:text-brand-purple-lighter"
                >
                  {cap.linkText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </Container>

      {/* CTA bar */}
      <Container className="relative mt-12">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-purple/15 bg-brand-purple/5 p-8 sm:flex-row">
          <div>
            <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
              Ready to plan your next project?
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              All calculators are free. No sign-up required to start calculating.
            </p>
          </div>
          <Link
            to="/paint-calculator?mode=room-estimate"
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 transition-all hover:bg-brand-purple-dark hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Calculator className="h-4 w-4" />
            Start Calculating
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
