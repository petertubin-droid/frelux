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
    <section className="relative overflow-hidden bg-brand-navy py-20 text-white sm:py-24">
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-grid-dark" aria-hidden="true" />
      {/* Subtle glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-purple/15 blur-[100px]" aria-hidden="true" />

      <SectionHeading
        label="Why FRELUX"
        title="Tools that respect your time and budget"
        subtitle="Everything you need to plan a paint project with confidence, in one focused place."
        align="center"
        className="[&_.section-label]:text-brand-purple-light [&_.section-title]:text-white [&_.section-subtitle]:text-white/50"
      />
      <Container className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="group">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/20">
                <Icon className="h-5 w-5 text-brand-purple-light" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{f.description}</p>
            </div>
          );
        })}
      </Container>

      <Container className="relative mt-14 text-center">
        <Link
          to="/paint-calculator"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-navy shadow-lg transition-all hover:bg-neutral-100 hover:shadow-xl active:scale-[0.98]"
        >
          Start planning
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Container>
    </section>
  );
}
