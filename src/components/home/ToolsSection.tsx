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
    <section className="bg-neutral-50 py-16 sm:py-20">
      <SectionHeading
        label="Main tools"
        title="Your complete project workflow"
        subtitle="Follow these steps in order — from measuring your walls to choosing the perfect colors."
        align="center"
      />
      <Container className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              to={tool.to}
              className="group relative flex flex-col rounded-xl border border-neutral-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-brand-purple/30 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${tool.accent}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500">
                  {tool.step}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-brand-navy">{tool.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{tool.description}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-purple transition-transform group-hover:gap-2.5">
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
