import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRecentTools, type RecentTool } from '@/lib/smart-defaults';
import { Clock, ArrowRight, Calculator, Palette, Layers, Grid3x3, DollarSign, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Calculator,
  Palette,
  Layers,
  Grid3x3,
  DollarSign,
  Bot,
};

export function RecentlyUsed() {
  const [tools, setTools] = useState<RecentTool[]>([]);

  useEffect(() => {
    setTools(getRecentTools());
  }, []);

  if (tools.length === 0) return null;

  return (
    <section className="animate-fade-in-up">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-brand-purple" />
        <h2 className="text-sm font-bold text-brand-navy dark:text-white">Recently Used</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tools.map(tool => {
          const Icon = ICON_MAP[tool.icon] ?? Clock;
          return (
            <Link
              key={tool.path}
              to={tool.path}
              className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-all hover:border-brand-purple/30 hover:shadow-md dark:border-white/5 dark:bg-brand-navy-mid"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple dark:bg-brand-purple/15">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-navy group-hover:text-brand-purple dark:text-white dark:group-hover:text-brand-purple-lighter">{tool.label}</p>
                <p className="text-[11px] text-neutral-400">
                  {new Date(tool.visitedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-neutral-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
