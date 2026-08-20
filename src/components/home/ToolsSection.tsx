import { Link } from 'react-router-dom';
import {
  Calculator,
  DollarSign,
  ArrowRight,
  Paintbrush,
  Layers,
  Grid3x3,
  Building2,
  Palette,
  Square,
  Hammer,
  type LucideIcon,
} from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';

interface Tool {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  accent: string;
  glow: string;
}

interface Category {
  label: string;
  icon: LucideIcon;
  tools: Tool[];
}

const categories: Category[] = [
  {
    label: 'Painting',
    icon: Paintbrush,
    tools: [
      {
        icon: Calculator,
        title: 'Paint Calculator',
        description: 'Estimate how many litres of paint you need based on wall area, coats, doors, and windows.',
        to: '/paint-calculator',
        accent: 'text-accent-orange bg-accent-orange/10',
        glow: 'group-hover:bg-accent-orange/10',
      },
      {
        icon: DollarSign,
        title: 'Paint Cost Estimator',
        description: 'Get a full cost breakdown for paint, primer, putty, and materials using real product prices.',
        to: '/cost-estimator',
        accent: 'text-accent-green bg-accent-green/10',
        glow: 'group-hover:bg-accent-green/10',
      },
      {
        icon: Paintbrush,
        title: 'Painting Estimator',
        description: 'Room-by-room estimation with the FRELUX methodology — quantity, ceiling, walls, and material cost.',
        to: '/painting-estimator',
        accent: 'text-brand-purple bg-brand-purple/10',
        glow: 'group-hover:bg-brand-purple/10',
      },
    ],
  },
  {
    label: 'Screeding',
    icon: Square,
    tools: [
      {
        icon: Square,
        title: 'Wall Screeding Calculator',
        description: 'Calculate the wall surface area that needs screeding, with door and window deductions.',
        to: '/screeding-calculator',
        accent: 'text-accent-cyan bg-accent-cyan/10',
        glow: 'group-hover:bg-accent-cyan/10',
      },
      {
        icon: DollarSign,
        title: 'Screeding Cost Estimator',
        description: 'Estimate the cost of screeding materials — cement, sand, and bonding agents.',
        to: '/screeding-cost-estimator',
        accent: 'text-accent-green bg-accent-green/10',
        glow: 'group-hover:bg-accent-green/10',
      },
    ],
  },
  {
    label: 'POP Ceiling',
    icon: Layers,
    tools: [
      {
        icon: Layers,
        title: 'POP Ceiling Calculator',
        description: 'Calculate POP cement, fibreglass mesh, and materials needed for your ceiling project.',
        to: '/pop-ceiling-calculator',
        accent: 'text-brand-purple bg-brand-purple/10',
        glow: 'group-hover:bg-brand-purple/10',
      },
      {
        icon: DollarSign,
        title: 'POP Ceiling Cost Estimator',
        description: 'Estimate the total cost of your POP ceiling project with current material prices.',
        to: '/pop-ceiling-cost-estimator',
        accent: 'text-accent-green bg-accent-green/10',
        glow: 'group-hover:bg-accent-green/10',
      },
    ],
  },
  {
    label: 'Tiles',
    icon: Grid3x3,
    tools: [
      {
        icon: Grid3x3,
        title: 'Tile Calculator',
        description: 'Calculate how many tiles you need, plus adhesive and grout, for floors and walls.',
        to: '/tile-calculator',
        accent: 'text-accent-cyan bg-accent-cyan/10',
        glow: 'group-hover:bg-accent-cyan/10',
      },
      {
        icon: DollarSign,
        title: 'Tile Cost Estimator',
        description: 'Estimate the total cost of your tiling project — tiles, adhesive, grout, and labour.',
        to: '/tile-cost-estimator',
        accent: 'text-accent-green bg-accent-green/10',
        glow: 'group-hover:bg-accent-green/10',
      },
    ],
  },
  {
    label: 'Finishing',
    icon: Hammer,
    tools: [
      {
        icon: Building2,
        title: 'Finish Estimator',
        description: 'Compare painting, Tyrolene, and Grafitex finishes — material quantities and costs side by side.',
        to: '/finish-estimator',
        accent: 'text-amber-600 bg-amber-100',
        glow: 'group-hover:bg-amber-400/10',
      },
      {
        icon: Building2,
        title: 'Tyrolene Estimator',
        description: 'Partition-based exterior finish estimator. Calculate cement, sand, acrylic bond, and additives.',
        to: '/tyrolene-estimator',
        accent: 'text-amber-600 bg-amber-100',
        glow: 'group-hover:bg-amber-400/10',
      },
    ],
  },
  {
    label: 'Colors & Design',
    icon: Palette,
    tools: [
      {
        icon: Palette,
        title: 'Smart Color Assistant',
        description: 'Get AI-powered colour recommendations based on your room type, lighting, and mood.',
        to: '/ai-color-assistant',
        accent: 'text-brand-purple bg-brand-purple/10',
        glow: 'group-hover:bg-brand-purple/10',
      },
      {
        icon: Grid3x3,
        title: 'Color Library',
        description: 'Browse hundreds of paint colours with names and codes. Compare side by side.',
        to: '/colors',
        accent: 'text-brand-purple bg-brand-purple/10',
        glow: 'group-hover:bg-brand-purple/10',
      },
    ],
  },
];

export default function ToolsSection() {
  return (
    <section data-tour="calculators" className="relative overflow-hidden bg-white py-20 sm:py-24 dark:bg-brand-navy bg-noise">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" aria-hidden="true" />

      <SectionHeading
        label="All calculators"
        title="Everything you need, organized by trade"
        subtitle="Pick a category and start calculating. Every tool uses Nigerian coverage rates and real product prices."
        align="center"
      />

      <Container className="relative mt-14 space-y-12">
        {categories.map((category, ci) => {
          const CatIcon = category.icon;
          return (
            <div key={category.label} className="animate-fade-in-up" style={{ animationDelay: `${ci * 0.05}s` }}>
              {/* Category header */}
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/8 text-brand-purple dark:text-brand-purple-lighter">
                  <CatIcon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-xl font-bold text-neutral-900 dark:text-white">{category.label}</h3>
                <span className="text-sm text-neutral-400 dark:text-neutral-500">({category.tools.length} tools)</span>
              </div>

              {/* Tool cards */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {category.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.to}
                      to={tool.to}
                      className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-6 dark:border-white/5 dark:bg-brand-navy-mid"
                    >
                      {/* Subtle hover gradient */}
                      <div className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/0 blur-3xl transition-all duration-500 ${tool.glow}`} />

                      {/* Shimmer border on top */}
                      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-purple/0 to-transparent transition-all duration-500 group-hover:via-brand-purple/30" />

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tool.accent} transition-transform duration-300 group-hover:scale-110`}>
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                      <h4 className="mt-4 font-display text-base font-bold text-neutral-900 dark:text-white">{tool.title}</h4>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{tool.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5 dark:text-brand-purple-lighter">
                        Open calculator
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Container>

      {/* Explore all CTA */}
      <Container className="relative mt-12 text-center">
        <Link
          to="/templates"
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:border-brand-purple/20 hover:text-brand-purple hover:shadow-md dark:border-white/10 dark:bg-brand-navy-mid dark:text-white/80"
        >
          Explore Calculator Templates
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Container>
    </section>
  );
}
