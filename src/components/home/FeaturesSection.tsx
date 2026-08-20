import { Link } from 'react-router-dom';
import { MapPin, Sliders, ShieldCheck, FileBarChart, ArrowRight, Smartphone, Database } from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const trustFeatures = [
  {
    icon: MapPin,
    title: 'Nigerian market calculations',
    description: 'Coverage rates, product sizes, and prices calibrated for Nigerian brands and building practices, not generic formulas.',
  },
  {
    icon: Sliders,
    title: 'Configurable material pricing',
    description: 'Adjust paint, cement, sand, and tile prices to match your local supplier. Every estimate reflects your actual costs.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparent assumptions',
    description: 'See exactly how every number is computed, coverage rates, waste factors, and mix ratios are all visible.',
  },
  {
    icon: FileBarChart,
    title: 'Professional estimates',
    description: 'Detailed cost breakdowns that contractors trust. Get quantities, unit prices, and totals for every material.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first accessibility',
    description: 'Every calculator works perfectly on small screens. Access your estimates from any phone, anywhere on site.',
  },
  {
    icon: Database,
    title: 'Accurate units & quantities',
    description: 'Metric and imperial support. Real product pack sizes. Practical purchase quantities, not just theoretical numbers.',
  },
];

const secondaryCtas = [
  {
    icon: FileBarChart,
    label: 'Save Estimate',
    to: '/my-projects',
    description: 'Keep your estimates and come back anytime',
  },
  {
    icon: ArrowRight,
    label: 'Share Estimate',
    to: '/my-projects',
    description: 'Send a shareable link to your contractor',
  },
  {
    icon: Sliders,
    label: 'Explore Calculators',
    to: '/paint-calculator',
    description: 'Browse all calculators and estimators',
  },
];

export default function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section data-tour="cost" className="relative overflow-hidden bg-brand-navy py-20 text-white sm:py-24 bg-noise">
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" aria-hidden="true" />
      {/* Ambient glow — animated */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brand-purple/12 blur-[140px] animate-gradient-pulse" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-brand-purple-deep/10 blur-[120px]" aria-hidden="true" />

      <SectionHeading
        label="Why trust FRELUX"
        title="Built for Nigerian construction, not copied from abroad"
        subtitle="Every formula, price, and product size is calibrated for how things actually work here."
        align="center"
        className="[&_.section-label]:text-brand-purple-light [&_.section-title]:text-white [&_.section-subtitle]:text-white/45"
      />

      {/* Trust signals — 3 column grid */}
      <Container className="relative mt-14">
        <div ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trustFeatures.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04] hover:-translate-y-1"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${i * 70}ms`,
                  transitionDuration: '600ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-brand-purple/0 blur-3xl transition-all duration-500 group-hover:bg-brand-purple/10" />
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/8 group-hover:ring-white/20 group-hover:scale-105">
                  <Icon className="h-5 w-5 text-brand-purple-light transition-transform duration-300 group-hover:scale-110" />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45 transition-colors duration-300 group-hover:text-white/55">{f.description}</p>
              </div>
            );
          })}
        </div>
      </Container>

      {/* Secondary CTAs */}
      <Container className="relative mt-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {secondaryCtas.map((cta) => {
            const Icon = cta.icon;
            return (
              <Link
                key={cta.label}
                to={cta.to}
                className="group flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-5 backdrop-blur-sm transition-all hover:border-white/15 hover:bg-white/[0.05] hover:-translate-y-0.5"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-all group-hover:bg-brand-purple/15 group-hover:ring-brand-purple/20">
                  <Icon className="h-5 w-5 text-brand-purple-light" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{cta.label}</p>
                  <p className="text-xs text-white/40">{cta.description}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/40" />
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
