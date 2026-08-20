import { Link } from 'react-router-dom';
import { Paintbrush, Layers, Grid3x3, Palette, ArrowRight, Calculator } from 'lucide-react';

const shortcuts = [
  { to: '/paint-calculator', label: 'Paint Calculator', icon: Paintbrush, description: 'Calculate paint quantities and costs' },
  { to: '/finish-estimator', label: 'Finish Estimator', icon: Calculator, description: 'Estimate Painting, Tyrolene and Grafitex finishes' },
  { to: '/pop-ceiling-calculator', label: 'POP Ceiling', icon: Layers, description: 'Estimate POP ceiling materials' },
  { to: '/tile-calculator', label: 'Tile Calculator', icon: Grid3x3, description: 'Plan tile layout and materials' },
];

export default function QuickCalculatorShortcuts() {
  return (
    <section className="border-y border-neutral-200/60 bg-neutral-50/50 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-neutral-900 sm:text-2xl">Quick Access</h2>
            <p className="mt-1 text-sm text-neutral-500">Jump straight to the most-used calculators</p>
          </div>
          <Link to="/my-projects" className="hidden items-center gap-1 text-sm font-semibold text-brand-purple transition-colors hover:text-brand-purple-dark sm:inline-flex">
            My Projects <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="card-hover group flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-5"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple/8 text-brand-purple transition-all duration-300 group-hover:bg-brand-purple group-hover:text-white group-hover:shadow-md group-hover:shadow-brand-purple/20">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{s.label}</h3>
                <p className="mt-0.5 text-xs text-neutral-500">{s.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-purple">
                Open <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
