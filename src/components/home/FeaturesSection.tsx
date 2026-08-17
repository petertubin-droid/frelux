import { Link } from 'react-router-dom';
import { ShieldCheck, Ruler, Palette, TrendingUp } from 'lucide-react';
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
    <section className="bg-brand-navy py-16 text-white sm:py-20">
      <SectionHeading
        label="Why FRELUX"
        title="Tools that respect your time and budget"
        subtitle="Everything you need to plan a paint project with confidence, in one focused place."
        align="center"
        className="[&_.section-label]:text-accent-yellow [&_.section-title]:text-white [&_.section-subtitle]:text-white/60"
      />
      <Container className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                <Icon className="h-5 w-5 text-accent-cyan" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{f.description}</p>
            </div>
          );
        })}
      </Container>

      <Container className="mt-12 text-center">
        <Link to="/paint-calculator" className="btn-primary bg-white text-brand-purple hover:bg-neutral-100">
          Start planning
        </Link>
      </Container>
    </section>
  );
}
