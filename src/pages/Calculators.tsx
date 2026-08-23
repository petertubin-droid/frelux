import { Link } from 'react-router-dom';
import {
  Paintbrush,
  Calculator,
  DollarSign,
  Grid3x3,
  Square,
  Layers,
  Building2,
  Hammer,
  Palette,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import Container from '@/components/ui/Container';
import { useSeo } from '@/lib/seo';
import { useScrollReveal } from '@/hooks/useScrollReveal';

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
    title: 'Painting Estimator',
    description: 'Room-by-room estimation with the FRELUX methodology — walls, ceiling, openings, and material costs.',
    benefit: 'Bucket-level accuracy',
    to: '/painting-estimator',
    accent: 'text-brand-purple bg-brand-purple/10',
    featured: true,
  },
  {
    icon: Calculator,
    title: 'Paint Calculator',
    description: 'Estimate how many litres of paint you need based on wall area, coats, doors, and windows.',
    benefit: 'Litres & containers',
    to: '/paint-calculator',
    accent: 'text-accent-orange bg-accent-orange/10',
  },
  {
    icon: Square,
    title: 'Screeding Calculator',
    description: 'Calculate the wall surface area that needs screeding, with door and window deductions.',
    benefit: 'Surface area & materials',
    to: '/screeding-calculator',
    accent: 'text-accent-cyan bg-accent-cyan/10',
  },
  {
    icon: Layers,
    title: 'POP Ceiling Calculator',
    description: 'Calculate POP cement, fibreglass mesh, and materials needed for your ceiling project.',
    benefit: 'Cement & mesh quantities',
    to: '/pop-ceiling-calculator',
    accent: 'text-brand-purple bg-brand-purple/10',
  },
  {
    icon: Grid3x3,
    title: 'Tile Calculator',
    description: 'Calculate how many tiles you need, plus adhesive and grout, for floors and walls.',
    benefit: 'Tiles, adhesive & grout',
    to: '/tile-calculator',
    accent: 'text-accent-cyan bg-accent-cyan/10',
  },
  {
    icon: Building2,
    title: 'Tyrolene Estimator',
    description: 'Partition-based exterior finish estimator. Calculate cement, sand, acrylic bond, and additives.',
    benefit: 'Exterior finishing',
    to: '/tyrolene-estimator',
    accent: 'text-amber-600 bg-amber-100 dark:bg-amber-500/10',
  },
  {
    icon: DollarSign,
    title: 'Paint Cost Estimator',
    description: 'Get a full cost breakdown for paint, primer, putty, and materials using real product prices.',
    benefit: 'Full cost breakdown',
    to: '/cost-estimator',
    accent: 'text-accent-green bg-accent-green/10',
  },
  {
    icon: DollarSign,
    title: 'Screeding Cost Estimator',
    description: 'Cost breakdown for screeding materials — cement, sand, and bonding agents at market prices.',
    benefit: 'Cost per room',
    to: '/screeding-cost-estimator',
    accent: 'text-accent-cyan bg-accent-cyan/10',
  },
  {
    icon: DollarSign,
    title: 'POP Ceiling Cost Estimator',
    description: 'Full cost estimate for POP ceiling materials including cement, mesh, and tools.',
    benefit: 'Material cost breakdown',
    to: '/pop-ceiling-cost-estimator',
    accent: 'text-brand-purple bg-brand-purple/10',
  },
  {
    icon: DollarSign,
    title: 'Tile Cost Estimator',
    description: 'Complete cost analysis for tiles, adhesive, grout, and accessories with current market prices.',
    benefit: 'Full cost analysis',
    to: '/tile-cost-estimator',
    accent: 'text-accent-cyan bg-accent-cyan/10',
  },
  {
    icon: Building2,
    title: 'Finish Estimator',
    description: 'Compare painting, Tyrolene, and Grafitex finishes — material quantities and costs side by side.',
    benefit: 'Side-by-side comparison',
    to: '/finish-estimator',
    accent: 'text-amber-600 bg-amber-100 dark:bg-amber-500/10',
  },
  {
    icon: Building2,
    title: 'Build-to-Roof Estimator',
    description: 'Calculate materials, quantities, and costs from foundation through roof — structural concrete, blockwork, roofing, and more.',
    benefit: 'Foundation to roof',
    to: '/build-to-roof-estimator',
    accent: 'text-brand-purple bg-brand-purple/10',
    featured: true,
  },
];

export default function Calculators() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  useSeo({
    title: 'All Calculators | FRELUX PAINT CALC',
    description:
      'Browse every FRELUX calculator — paint, screeding, POP ceiling, tiles, tyrolene, finishing, and cost estimators. Free Nigerian construction material calculators.',
    canonicalPath: '/calculators',
    ogType: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'FRELUX Calculators',
      itemListElement: calculators.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.title,
        url: `https://freluxtools.netlify.app${c.to}`,
      })),
    },
  });

  return (
    <>
      {/* Hero strip */}
      <section className="relative overflow-hidden bg-mesh text-white">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-50" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[140px]" />
        </div>
        <Container className="relative py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md">
            <Calculator className="h-3 w-3 text-brand-purple-light" />
            All Calculators
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl text-balance">
            Every FRELUX calculator in one place
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/55">
            Pick a tool below to start estimating materials and costs. Every calculator uses Nigerian coverage rates and real product prices.
          </p>
        </Container>
      </section>

      {/* Calculator grid */}
      <section className="bg-white py-16 dark:bg-brand-navy sm:py-20">
        <Container>
          <div ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {calculators.map((tool, i) => {
              const Icon = tool.icon;
              const isFeatured = tool.featured;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className={`card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 transition-all duration-500 dark:border-white/5 dark:bg-brand-navy-mid ${
                    isFeatured ? 'lg:col-span-2' : ''
                  }`}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                    transitionProperty: 'opacity, transform',
                    transitionDuration: '600ms',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    transitionDelay: `${i * 50}ms`,
                  }}
                >
                  <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/0 blur-3xl transition-all duration-500 group-hover:bg-brand-purple/10" />
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-purple/0 to-transparent transition-all duration-500 group-hover:via-brand-purple/30" />

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tool.accent} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    {isFeatured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-purple dark:bg-brand-purple/15 dark:text-brand-purple-lighter">
                        Recommended
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 font-display text-base font-bold text-neutral-900 dark:text-white">{tool.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{tool.description}</p>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
                      {tool.benefit}
                    </span>
                  </div>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                    Open calculator
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}

            {/* Color & AI card */}
            <Link
              to="/colors"
              className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 transition-all duration-500 dark:border-white/5 dark:bg-brand-navy-mid"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transitionProperty: 'opacity, transform',
                transitionDuration: '600ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: `${calculators.length * 50}ms`,
              }}
            >
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/0 blur-3xl transition-all duration-500 group-hover:bg-brand-purple/10" />
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-brand-purple bg-brand-purple/10 transition-transform duration-300 group-hover:scale-110">
                  <Palette className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-neutral-900 dark:text-white">Color Library & AI</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                Browse paint colors, compare combinations, and get AI-powered color suggestions.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                Browse colors
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          {/* Back to home */}
          <div className="mt-12 text-center">
            <Link to="/" className="text-sm font-medium text-brand-purple hover:text-brand-purple-dark dark:text-brand-purple-lighter">
              ← Back to home
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
