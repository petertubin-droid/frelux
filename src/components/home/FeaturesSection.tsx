import { Link } from 'react-router-dom';
import { MapPin, Sliders, ShieldCheck, FileBarChart, ArrowRight, Share2, Save, Calculator } from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';

const trustFeatures = [
  {
    icon: MapPin,
    title: 'Nigerian market calculations',
    description: 'Coverage rates, product sizes, and prices calibrated for Nigerian brands and building practices — not generic formulas.',
  },
  {
    icon: Sliders,
    title: 'Configurable material pricing',
    description: 'Adjust paint, cement, sand, and tile prices to match your local supplier. Every estimate reflects your actual costs.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparent calculation assumptions',
    description: 'See exactly how every number is computed — coverage rates, waste factors, and mix ratios are all visible.',
  },
  {
    icon: FileBarChart,
    title: 'Professional estimates',
    description: 'Detailed cost breakdowns that contractors trust. Get quantities, unit prices, and totals for every material.',
  },
];

const secondaryCtas = [
  {
    icon: Save,
    label: 'Save Estimate',
    to: '/my-projects',
    description: 'Keep your estimates and come back anytime',
  },
  {
    icon: Share2,
    label: 'Share Estimate',
    to: '/my-projects',
    description: 'Send a shareable link to your contractor',
  },
  {
    icon: Calculator,
    label: 'Explore Calculators',
    to: '/paint-calculator',
    description: 'Browse all 14 calculators and estimators',
  },
];

export default function FeaturesSection() {
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

      {/* Trust signals */}
      <Container className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {trustFeatures.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04] hover:-translate-y-1 animate-fade-in-up shimmer-border"
              style={{ animationDelay: `${i * 0.08}s` }}
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
      </Container>

      {/* Secondary CTAs */}
      <Container className="relative mt-12">
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

      {/* Primary CTA */}
      <Container className="relative mt-12 text-center">
        <Link
          to="/paint-calculator"
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-navy shadow-lg transition-all hover:bg-neutral-100 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
        >
          Start Calculating
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Container>
    </section>
  );
}
