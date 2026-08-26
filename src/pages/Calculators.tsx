import { Link } from 'react-router-dom';
import AdSlot from '@/components/ui/AdSlot';
import {
  Paintbrush,
  Calculator,
  Grid3x3,
  Square,
  Layers,
  Building2,
  Camera,
  Calendar,
  ListChecks,
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
    title: 'Painting Calculator',
    description: 'Calculate paint quantities, painting requirements and estimated cost — all in one tool.',
    benefit: 'Quantity · Cost · Estimate',
    to: '/paint-calculator',
    accent: 'text-brand-purple bg-brand-purple/10',
    featured: true,
  },
  {
    icon: Square,
    title: 'Screeding Calculator',
    description: 'Calculate wall screeding quantity, material requirements and cost estimation.',
    benefit: 'Quantity & cost',
    to: '/screeding-calculator',
    accent: 'text-accent-cyan bg-accent-cyan/10',
  },
  {
    icon: Layers,
    title: 'POP Ceiling Calculator',
    description: 'Calculate POP cement, fibreglass mesh, material breakdown and cost estimate.',
    benefit: 'Material & cost',
    to: '/pop-ceiling-calculator',
    accent: 'text-brand-purple bg-brand-purple/10',
  },
  {
    icon: Grid3x3,
    title: 'Tile Calculator',
    description: 'Calculate tile quantity, boxes, waste, adhesive, grout and cost estimate.',
    benefit: 'Tiles & cost',
    to: '/tile-calculator',
    accent: 'text-accent-cyan bg-accent-cyan/10',
  },
  {
    icon: Building2,
    title: 'Finishing Calculator',
    description: 'Compare painting, Tyrolene and Grafitex finishes — material quantities and costs side by side.',
    benefit: 'Tyrolene · Grafitex',
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
  {
    icon: Camera,
    title: 'AI Photo Estimator',
    description: 'Upload a photo of any building and get an instant AI-powered construction cost estimate. Premium feature.',
    benefit: 'AI-powered · Premium',
    to: '/image-estimator',
    accent: 'text-accent-green bg-accent-green/10',
    featured: true,
  },
  {
    icon: Building2,
    title: 'Structural Calculator',
    description: 'Engineer-grade beam, column, and slab sizing with full BS 8110 formula transparency.',
    benefit: 'BS 8110 · Engineer-grade',
    to: '/structural-calculator',
    accent: 'text-brand-purple bg-brand-purple/10',
    featured: true,
  },
  {
    icon: Layers,
    title: 'Foundation Designer',
    description: 'Strip, pad, and raft foundation sizing based on soil bearing capacity. Nigerian soil types.',
    benefit: 'Soil-aware · BS 8004',
    to: '/foundation-calculator',
    accent: 'text-brand-purple bg-brand-purple/10',
  },
  {
    icon: Calendar,
    title: 'Project Timeline',
    description: 'How long will your build take? Stage-by-stage duration with milestones and risk analysis.',
    benefit: 'Schedule · Milestones',
    to: '/project-timeline',
    accent: 'text-brand-purple bg-brand-purple/10',
  },
  {
    icon: ListChecks,
    title: 'Construction Sequence',
    description: 'The correct build order from site clearing to weathertight. Quality gates, safety, common mistakes.',
    benefit: 'Quality gates · Safety',
    to: '/construction-sequence',
    accent: 'text-brand-purple bg-brand-purple/10',
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
    keywords: 'paint calculator, screeding calculator, POP ceiling calculator, tile calculator, cost estimator, construction calculator Nigeria, build to roof estimator, tyrolene estimator, finishing estimator',
    structuredDataArray: [
      {
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
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://freluxtools.netlify.app' },
          { '@type': 'ListItem', 'position': 2, 'name': 'Calculators', 'item': 'https://freluxtools.netlify.app/calculators' }
        ]
      }
    ],
  });

  return (
    <>
      {/* Hero strip */}
      <section aria-label="All FRELUX calculators" className="relative overflow-hidden bg-mesh text-white">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-50" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[140px]" />
        </div>
        <Container className="relative py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md">
            <Calculator aria-hidden="true" className="h-3 w-3 text-brand-purple-light" />
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
      <section aria-label="Calculator tools" className="bg-white py-16 dark:bg-brand-navy sm:py-20">
        <Container>
          <div ref={ref} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {calculators.map((tool, i) => {
              const Icon = tool.icon;
              const isFeatured = tool.featured;
              return (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className={`calc-card group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid ${
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
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}

            {/* Color & AI card */}
            <Link
              to="/colors"
              className="calc-card group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid"
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
                  <Palette aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-neutral-900 dark:text-white">Color Library & AI</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                Browse paint colors, compare combinations, and get AI-powered color suggestions.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                Browse colors
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </Link>
          </div>

          <AdSlot slotKey="calculators_bottom" className="mt-10" />
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
