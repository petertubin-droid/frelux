import { Link } from 'react-router-dom';
import { Layers, Calculator, DollarSign, Palette, ArrowRight, Ruler } from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/ui/SectionHeading';

const tools = [
  {
    step: 1,
    icon: Ruler,
    accent: 'text-neutral-700 bg-neutral-100',
    title: 'Measure Walls',
    description: 'Grab your tape measure and record the length, width, and height of each wall. Note any doors and windows to deduct later.',
    action: 'Learn how',
    to: '/screeding-calculator',
  },
  {
    step: 2,
    icon: Layers,
    accent: 'text-accent-cyan bg-accent-cyan/10',
    title: 'Wall Screeding Calculator',
    description: 'Calculate the wall surface area that needs screeding, with door and window deductions.',
    action: 'Calculate Screeding',
    to: '/screeding-calculator',
  },
  {
    step: 3,
    icon: DollarSign,
    accent: 'text-accent-orange bg-accent-orange/10',
    title: 'Wall Screeding Cost Estimator',
    description: 'Estimate the cost of screeding materials and labor based on your wall area.',
    action: 'Estimate Screeding Cost',
    to: '/screeding-cost-estimator',
  },
  {
    step: 4,
    icon: Calculator,
    accent: 'text-accent-orange bg-accent-orange/10',
    title: 'Paint Calculator',
    description: 'Estimate how much paint your project may require based on wall area, coats, and deductions.',
    action: 'Calculate Paint',
    to: '/paint-calculator',
  },
  {
    step: 5,
    icon: DollarSign,
    accent: 'text-accent-green bg-accent-green/10',
    title: 'Paint Cost Estimator',
    description: 'Get a practical estimate for paint, materials, and painting labor using real product prices.',
    action: 'Estimate Paint Cost',
    to: '/cost-estimator',
  },
  {
    step: 6,
    icon: Palette,
    accent: 'text-brand-purple bg-brand-purple/10',
    title: 'Smart Color Assistant',
    description: 'Get personalized color ideas for your room or home, then browse curated color combinations.',
    action: 'Explore Colors',
    to: '/ai-color-assistant',
  },
];

export default function ToolsSection() {
  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-28">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" aria-hidden="true" />

      <SectionHeading
        label="Main tools"
        title="Your complete project workflow"
        subtitle="Follow these steps in order — from measuring your walls to choosing the perfect colors."
        align="center"
      />
      <Container className="relative mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              to={tool.to}
              className="card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white p-7 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              {/* Subtle hover gradient */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-brand-purple/0 blur-3xl transition-all duration-500 group-hover:bg-brand-purple/4" />

              <div className="flex items-center justify-between">
                <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${tool.accent} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-50 text-sm font-bold text-neutral-300 ring-1 ring-neutral-200/60 transition-colors group-hover:text-brand-purple group-hover:ring-brand-purple/20">
                  {tool.step}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-neutral-900">{tool.title}</h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-neutral-500">{tool.description}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-all group-hover:gap-2.5">
                {tool.action}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </Container>
    </section>
  );
}
