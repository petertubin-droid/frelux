import { Link } from 'react-router-dom';
import {
  Paintbrush,
  Grid3x3,
  Square,
  Layers,
  Building2,
  Hammer,
  ArrowRight,
} from 'lucide-react';
import Container from '@/components/ui/Container';

interface ProjectCard {
  icon: typeof Paintbrush;
  title: string;
  description: string;
  to: string;
  accent: string;
  iconBg: string;
}

const projectCards: ProjectCard[] = [
  {
    icon: Paintbrush,
    title: 'Painting',
    description: 'Calculate paint quantities, containers, and full cost breakdowns for any room.',
    to: '/paint-calculator',
    accent: 'text-brand-purple',
    iconBg: 'bg-brand-purple/10',
  },
  {
    icon: Grid3x3,
    title: 'Tiles',
    description: 'Estimate tile count, adhesive, grout, and layout for floors and walls.',
    to: '/tile-calculator',
    accent: 'text-accent-cyan',
    iconBg: 'bg-accent-cyan/10',
  },
  {
    icon: Square,
    title: 'Screeding',
    description: 'Calculate wall screeding area, cement, sand, and bonding agent quantities.',
    to: '/screeding-calculator',
    accent: 'text-accent-orange',
    iconBg: 'bg-accent-orange/10',
  },
  {
    icon: Layers,
    title: 'POP Ceiling',
    description: 'Estimate POP cement, fibreglass mesh, and materials for ceiling projects.',
    to: '/pop-ceiling-calculator',
    accent: 'text-brand-purple',
    iconBg: 'bg-brand-purple/10',
  },
  {
    icon: Building2,
    title: 'Tyrolene',
    description: 'Calculate Tyrolene exterior finish: cement, sand, acrylic bond, and additives.',
    to: '/tyrolene-estimator',
    accent: 'text-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-500/10',
  },
  {
    icon: Hammer,
    title: 'Finishing',
    description: 'Compare painting, Tyrolene, and Grafitex finishes side by side with costs.',
    to: '/finish-estimator',
    accent: 'text-accent-green',
    iconBg: 'bg-accent-green/10',
  },
];

export default function ChooseProject() {
  return (
    <section className="relative -mt-12 pb-16 pt-4 sm:pb-20" style={{ zIndex: 1 }}>
      <Container>
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-neutral-900 sm:text-3xl dark:text-white">
            Choose Your Project
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Select a calculator to start estimating materials and costs immediately.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:border-brand-purple/20 hover:shadow-premium dark:border-white/5 dark:bg-brand-navy-mid dark:hover:border-brand-purple/30"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/0 blur-3xl transition-all duration-500 group-hover:bg-brand-purple/10" />

                {/* Shimmer border */}
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-purple/0 to-transparent transition-all duration-500 group-hover:via-brand-purple/30" />

                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} ${card.accent} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>

                <h3 className="mt-4 font-display text-base font-bold text-neutral-900 dark:text-white">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{card.description}</p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                  Open calculator
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
