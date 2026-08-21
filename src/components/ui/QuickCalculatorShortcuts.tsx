import { Link } from 'react-router-dom';
import { Paintbrush, Layers, Grid3x3, Palette, ArrowRight, Calculator, Sparkles } from 'lucide-react';

const shortcuts = [
  { to: '/paint-calculator', label: 'Paint Calculator', icon: Paintbrush, description: 'Calculate paint quantities and costs', badge: 'Popular' },
  { to: '/finish-estimator', label: 'Finish Estimator', icon: Calculator, description: 'Estimate Painting, Tyrolene and Grafitex finishes' },
  { to: '/pop-ceiling-calculator', label: 'POP Ceiling', icon: Layers, description: 'Estimate POP ceiling materials' },
  { to: '/tile-calculator', label: 'Tile Calculator', icon: Grid3x3, description: 'Plan tile layout and materials' },
];

export default function QuickCalculatorShortcuts() {
  return (
    <section className="border-y border-neutral-200/60 bg-neutral-50/50 py-10 sm:py-12 dark:border-white/5 dark:bg-brand-navy-mid">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">Quick Access</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Jump straight to the most-used calculators</p>
          </div>
          <Link to="/my-projects" className="group hidden items-center gap-1 text-sm font-semibold text-brand-purple transition-colors hover:text-brand-purple-dark sm:inline-flex dark:text-brand-purple-lighter dark:hover:text-brand-purple">
            My Projects <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((s, i) => (
            <Link
              key={s.to}
              to={s.to}
              className="card-hover group relative flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-5 dark:border-white/5 dark:bg-brand-navy-mid animate-fade-in-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-start justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple/8 text-brand-purple transition-all duration-300 group-hover:bg-brand-purple group-hover:text-white group-hover:shadow-md group-hover:shadow-brand-purple/20">
                  <s.icon className="h-5 w-5" />
                </span>
                {s.badge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-orange">
                    <Sparkles className="h-2.5 w-2.5" />
                    {s.badge}
                  </span>
                )}
              </div>
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
