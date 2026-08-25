import { Link } from 'react-router-dom';
import { ShieldCheck, Ruler, Palette, TrendingUp, ArrowRight } from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';

const features = [
  {
    icon: Ruler,
    title: 'Practical calculations',
    description: 'Enter your measurements and get realistic paint quantity estimates. No guesswork.',
  },
  {
    icon: TrendingUp,
    title: 'Transparent cost estimates',
    description: 'Break down materials and labor so you know what goes into a project budget.',
  },
  {
    icon: Palette,
    title: 'Curated color palettes',
    description: 'Explore room ready combinations with color codes you can take to any paint shop.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for real use',
    description: 'Made for homeowners, decorators, and contractors who plan work that gets done.',
  },
];

export default function FeaturesSection() {
  return (
    <section data-tour="ai" className="relative overflow-hidden bg-brand-navy py-24 text-white sm:py-28">
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" aria-hidden="true" />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brand-purple/12 blur-[140px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-brand-purple-deep/10 blur-[120px]" aria-hidden="true" />

      <SectionHeading
        label="Why FRELUX"
        title="Tools that respect your time and budget"
        subtitle="Everything you need to plan a paint project with confidence, in one focused place."
        align="center"
        className="[&_.section-label]:text-brand-purple-light [&_.section-title]:text-white [&_.section-subtitle]:text-white/45"
      />
      <Container className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.04] hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-brand-purple/0 blur-3xl transition-all duration-500 group-hover:bg-brand-purple/8" />
              <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/8 group-hover:ring-white/20 group-hover:scale-105">
                <Icon className="h-6 w-6 text-brand-purple-light" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/45">{f.description}</p>
            </div>
          );
        })}
      </Container>

      <Container className="relative mt-16 text-center">
        <Link
          to="/paint-calculator"
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-brand-navy-mid px-6 py-3.5 text-sm font-semibold text-brand-navy dark:text-white shadow-lg transition-all hover:bg-neutral-100 hover:shadow-xl active:scale-[0.98]"
        >
          Start planning
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Container>
    </section>
  );
}
