import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Paintbrush, Layers, Grid3x3, Palette, FolderOpen, X } from 'lucide-react';
import { classNames } from '@/lib/utils';

const actions = [
  { to: '/paint-calculator', label: 'Paint Calculator', icon: Paintbrush },
  { to: '/pop-ceiling-calculator', label: 'POP Ceiling Calculator', icon: Layers },
  { to: '/tile-calculator', label: 'Tile Calculator', icon: Grid3x3 },
  { to: '/ai-color-assistant', label: 'Smart Color Assistant', icon: Palette },
  { to: '/my-projects', label: 'My Projects', icon: FolderOpen },
];

export default function FloatingActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:bottom-20 sm:right-6">
      {open && (
        <div className="absolute bottom-14 right-0 flex flex-col gap-2 sm:bottom-16">
          {actions.map((action, i) => (
            <Link
              key={action.to}
              to={action.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 shadow-lg animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                <action.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-neutral-700 whitespace-nowrap">{action.label}</span>
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={classNames(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 press-scale',
          open ? 'bg-neutral-700 text-white rotate-45' : 'bg-brand-purple text-white hover:bg-brand-purple/90',
        )}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
