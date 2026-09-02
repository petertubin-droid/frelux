import type { ReactNode } from 'react';
import { Save, FileDown, Share2, MessageCircle, RotateCcw, Gem } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface ResultStat {
  label: string;
  value: string;
  icon?: ReactNode;
  highlight?: boolean;
}

export default function ResultCard({
  title,
  subtitle,
  stats,
  grandTotal,
  currencySymbol,
  onSave,
  onExport,
  onShare,
  onAskAi,
  onRecalculate,
  children,
}: {
  title: string;
  subtitle?: string;
  stats: ResultStat[];
  grandTotal: number;
  currencySymbol: string;
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onAskAi?: () => void;
  onRecalculate?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="calc-card card overflow-hidden animate-fade-in-up dark:border-white/5">
      {/* Premium gradient header with shimmer */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background to-primary px-6 py-5 text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="calc-orb absolute -right-10 -top-1/2 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-20" aria-hidden="true" />
        </div>
        <div className="relative flex items-center gap-2">
          <Gem className="h-4 w-4 text-brand-purple-light" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {subtitle && <p className="relative mt-1 text-sm text-primary-foreground/70">{subtitle}</p>}
      </div>

      <div className="p-6 dark:bg-card">
        {/* Stats grid with stagger entrance */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={classNames(
                'animate-stagger-in rounded-xl border p-4 transition-all duration-300',
                stat.highlight
                  ? 'stat-card-highlight'
                  : 'stat-card',
              )}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                {stat.icon}
                {stat.label}
              </div>
              <p className={classNames('mt-1.5 text-lg font-bold tabular-nums', stat.highlight ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-foreground dark:text-primary-foreground')}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Grand total with premium glow */}
        <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-accent-orange/10 p-6 text-center dark:from-primary/15 dark:to-accent-orange/5">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="calc-orb absolute -top-1/2 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          </div>
          <p className="relative text-sm font-medium text-muted-foreground dark:text-muted-foreground">Grand Total</p>
          <p className="relative mt-1 text-3xl font-extrabold text-foreground sm:text-4xl dark:text-primary-foreground grand-total-glow">
            {currencySymbol}
            <span className="tabular-nums">{grandTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </p>
        </div>

        {children}

        {/* Action buttons with glow on primary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {onSave && (
            <button type="button" onClick={onSave} className="btn-primary press-scale btn-glow">
              <Save className="h-4 w-4" />
              Save
            </button>
          )}
          {onExport && (
            <button type="button" onClick={onExport} className="btn-secondary press-scale">
              <FileDown className="h-4 w-4" />
              Export PDF
            </button>
          )}
          {onShare && (
            <button type="button" onClick={onShare} className="btn-secondary press-scale">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          )}
          {onAskAi && (
            <button type="button" onClick={onAskAi} className="btn-secondary press-scale">
              <MessageCircle className="h-4 w-4" />
              Ask AI
            </button>
          )}
          {onRecalculate && (
            <button type="button" onClick={onRecalculate} className="btn-secondary press-scale">
              <RotateCcw className="h-4 w-4" />
              Recalculate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
