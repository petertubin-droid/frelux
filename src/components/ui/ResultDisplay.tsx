import type {} from 'react';
import { CheckCircle2, RotateCcw, ArrowRight, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { classNames } from '@/lib/utils';

export default function ResultDisplay({
  badge,
  badgeIcon: BadgeIcon = CheckCircle2,
  badgeColor = 'text-accent-green',
  subtitle,
  primaryValue,
  primaryUnit,
  primaryLabel,
  stats,
  footerNote,
  onAgain,
  onStartOver,
  continueTo,
  continueLabel = 'Continue to Cost Estimate',
  continueState,
}: {
  badge: string;
  badgeIcon?: typeof CheckCircle2;
  badgeColor?: string;
  subtitle: string;
  primaryValue: string;
  primaryUnit?: string;
  primaryLabel: string;
  stats: { label: string; value: string; highlight?: boolean }[];
  footerNote: string;
  onAgain: () => void;
  onStartOver: () => void;
  continueTo?: string;
  continueLabel?: string;
  continueState?: Record<string, unknown>;
}) {
  return (
    <div className="mt-8 calc-card card overflow-hidden animate-fade-in-up dark:border-white/5">
      {/* Premium gradient header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-purple p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="calc-orb absolute -right-10 -top-1/2 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-20" aria-hidden="true" />
        </div>
        <div className={classNames('relative flex items-center gap-2', badgeColor)}>
          <BadgeIcon className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">{badge}</span>
        </div>
        <p className="relative mt-3 text-sm text-white/60">{subtitle}</p>
        <p className="relative mt-1 text-4xl font-bold sm:text-5xl grand-total-glow">
          {primaryValue}{primaryUnit && <span className="text-2xl ml-1">{primaryUnit}</span>}
        </p>
        <p className="relative mt-1 text-sm text-white/60">{primaryLabel}</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 dark:bg-brand-navy-mid">
        {stats.map((s, i) => (
          <div
            key={i}
            className={classNames(
              'animate-stagger-in rounded-xl border p-4',
              s.highlight
                ? 'stat-card-highlight'
                : 'stat-card',
            )}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{s.label}</p>
            <p className={classNames('mt-1.5 text-xl font-bold tabular-nums', s.highlight ? 'text-brand-purple dark:text-brand-purple-lighter' : 'text-brand-navy dark:text-white')}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      {footerNote && (
        <div className="flex items-start gap-2 border-t border-neutral-100 bg-neutral-50 px-6 py-4 text-xs text-neutral-500 sm:px-8 dark:border-white/5 dark:bg-white/5 dark:text-neutral-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />
          <p>{footerNote}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <button type="button" onClick={onAgain} className="btn-secondary press-scale">
          <RotateCcw className="h-4 w-4" />
          Calculate Again
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onStartOver} className="btn-secondary press-scale">
            Start Over
          </button>
          {continueTo && (
            <Link to={continueTo} state={continueState} className="btn-primary press-scale group btn-glow">
              {continueLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
