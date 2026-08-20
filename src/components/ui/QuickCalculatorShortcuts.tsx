import { Link } from 'react-router-dom';
import { Paintbrush, Layers, Grid3x3, DollarSign, ArrowRight, Building2, Square, Calculator } from 'lucide-react';

const shortcuts = [
  { to: '/paint-calculator', label: 'Paint Calculator', icon: Paintbrush, description: 'How much paint you need' },
  { to: '/screeding-calculator', label: 'Screeding Calculator', icon: Square, description: 'Wall screeding area & materials' },
  { to: '/pop-ceiling-calculator', label: 'POP Ceiling', icon: Layers, description: 'POP cement & mesh quantities' },
  { to: '/tile-calculator', label: 'Tile Calculator', icon: Grid3x3, description: 'Tile count, adhesive & grout' },
  { to: '/cost-estimator', label: 'Cost Estimator', icon: DollarSign, description: 'Full project cost breakdown' },
  { to: '/finish-estimator', label: 'Finish Estimator', icon: Building2, description: 'Painting, Tyrolene & Grafitex' },
  { to: '/painting-estimator', label: 'Painting Estimator', icon: Calculator, description: 'Room-based estimation' },
  { to: '/colors', label: 'Color Library', icon: Grid3x3, description: 'Browse paint colours & codes' },
];

export default function QuickCalculatorShortcuts() {
  return (
    <section className="border-y border-neutral-200/60 bg-neutral-50/50 py-8 sm:py-10 dark:border-white/5 dark:bg-brand-navy-mid">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 sm:text-xl dark:text-white">Start with a calculator</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">All calculators are free — no sign-up needed</p>
          </div>
          <Link to="/paint-calculator" className="hidden items-center gap-1 text-sm font-semibold text-brand-purple transition-colors hover:text-brand-purple-dark sm:inline-flex dark:text-brand-purple-lighter dark:hover:text-brand-purple">
            Start Calculating <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="card-hover group flex flex-col gap-2.5 rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/8 text-brand-purple transition-all duration-300 group-hover:bg-brand-purple group-hover:text-white group-hover:shadow-md group-hover:shadow-brand-purple/20">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{s.label}</h3>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{s.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-purple dark:text-brand-purple-lighter">
                Open <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
