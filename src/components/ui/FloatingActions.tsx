import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Paintbrush, Layers, Grid3x3, Palette, FolderOpen, X, Calculator } from "lucide-react";
import { classNames } from '@/lib/utils';

const actions = [
  { to: '/paint-calculator', label: 'Paint Calculator', icon: Paintbrush },
  { to: '/pop-ceiling-calculator', label: 'POP Ceiling Calculator', icon: Layers },
  { to: '/tile-calculator', label: 'Tile Calculator', icon: Grid3x3 },
  { to: '/finish-estimator', label: 'Finish Estimator', icon: Calculator },
  { to: '/ai-color-assistant', label: 'Smart Color Assistant', icon: Palette },
  { to: '/my-projects', label: 'My Projects', icon: FolderOpen },
];

export default function FloatingActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-36 right-4 z-40 sm:bottom-20 sm:right-6">
      {open && (
        <div className="absolute bottom-14 right-0 flex flex-col gap-2 sm:bottom-16">
          {actions.map((action, i) => (
            <Link
              key={action.to}
              to={action.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 shadow-lg animate-fade-in-up dark:border-white/10 dark:bg-brand-navy-mid"
              style={{ animationDelay: `${i * 40}ms` }}
              aria-label={action.label}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/20 dark:text-brand-purple-lighter">
                <action.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-neutral-700 whitespace-nowrap dark:text-neutral-200">{action.label}</span>
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={classNames(
          'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 press-scale sm:h-14 sm:w-14',
          open ? 'bg-neutral-700 text-white rotate-45 dark:bg-neutral-600' : 'bg-brand-purple text-white hover:bg-brand-purple/90',
        )}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Plus className="h-5 w-5 sm:h-6 sm:w-6" />}
      </button>
    </div>
  );
}
