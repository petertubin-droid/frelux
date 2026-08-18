/**
 * FRELUX Premium UI Primitives
 * ----------------------------
 * A collection of reusable, production-ready components for the contractor
 * experience. Built with Tailwind CSS + lucide-react, animated via CSS
 * transitions and requestAnimationFrame — no external animation libraries.
 */
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { classNames } from '@/lib/utils';

// ============================================================
// Animated count-up hook (requestAnimationFrame, no deps)
// ============================================================
function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(value);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

// ============================================================
// StatCard
// ============================================================
export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  sublabel?: string;
  accent?: 'purple' | 'orange' | 'green' | 'cyan' | 'blue';
}

const statAccentMap: Record<NonNullable<StatCardProps['accent']>, { icon: string; glow: string }> = {
  purple: { icon: 'text-brand-purple', glow: 'bg-brand-purple/10' },
  orange: { icon: 'text-accent-orange', glow: 'bg-accent-orange/10' },
  green: { icon: 'text-accent-green', glow: 'bg-accent-green/10' },
  cyan: { icon: 'text-accent-cyan', glow: 'bg-accent-cyan/10' },
  blue: { icon: 'text-blue-500', glow: 'bg-blue-500/10' },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  sublabel,
  accent = 'purple',
}: StatCardProps) {
  const animated = useCountUp(value);
  const accentClasses = statAccentMap[accent];

  const formatted = animated.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div
      className={classNames(
        'card card-hover p-5 transition-all duration-300',
        'animate-fade-in-up',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-brand-navy tabular-nums">
            {prefix}
            {formatted}
            {suffix}
          </p>
          {sublabel && (
            <p className="mt-1 text-xs text-neutral-400">{sublabel}</p>
          )}
        </div>
        <div
          className={classNames(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
            accentClasses.glow,
          )}
        >
          <Icon className={classNames('h-5 w-5', accentClasses.icon)} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Skeleton loaders
// ============================================================
export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-skeleton-pulse rounded-xl bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-skeleton-pulse rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
          <div className="h-3 w-1/2 animate-skeleton-pulse rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
        </div>
      </div>
      <div className="h-20 w-full animate-skeleton-pulse rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
      <div className="flex gap-3">
        <div className="h-5 w-16 animate-skeleton-pulse rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
        <div className="h-5 w-16 animate-skeleton-pulse rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4"
        >
          <div className="h-10 w-10 shrink-0 animate-skeleton-pulse rounded-full bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-skeleton-pulse rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
            <div className="h-3 w-1/2 animate-skeleton-pulse rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
          </div>
          <div className="h-5 w-16 animate-skeleton-pulse rounded bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// EmptyState
// ============================================================
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: 'purple' | 'orange' | 'green' | 'cyan' | 'blue';
}

const emptyAccentMap: Record<NonNullable<EmptyStateProps['accent']>, string> = {
  purple: 'text-brand-purple bg-brand-purple/10',
  orange: 'text-accent-orange bg-accent-orange/10',
  green: 'text-accent-green bg-accent-green/10',
  cyan: 'text-accent-cyan bg-accent-cyan/10',
  blue: 'text-blue-500 bg-blue-500/10',
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accent = 'purple',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in-up">
      <div
        className={classNames(
          'mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300',
          emptyAccentMap[accent],
        )}
      >
        <Icon className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-bold text-brand-navy">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary mt-6 animate-fade-in-up"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ============================================================
// SuccessScreen
// ============================================================
export interface SuccessScreenProps {
  title: string;
  message: string;
  onContinue?: () => void;
  continueLabel?: string;
}

export function SuccessScreen({
  title,
  message,
  onContinue,
  continueLabel = 'Continue',
}: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Pulsing check icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-accent-green/20" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent-green/10">
          <CheckCircle2 className="h-12 w-12 animate-success-pop text-accent-green" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-brand-navy animate-fade-in-up">
        {title}
      </h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-500 animate-fade-in-up">
        {message}
      </p>

      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="btn-primary mt-8 animate-fade-in-up"
        >
          {continueLabel}
        </button>
      )}
    </div>
  );
}

// ============================================================
// ProgressTracker
// ============================================================
export interface ProgressTrackerProps {
  percentage: number; // 0–100
  label?: string;
  showValue?: boolean;
}

export function ProgressTracker({
  percentage,
  label,
  showValue = true,
}: ProgressTrackerProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  const barColor =
    clamped >= 75
      ? 'bg-accent-green'
      : clamped >= 50
        ? 'bg-brand-purple'
        : clamped >= 25
          ? 'bg-accent-orange'
          : 'bg-red-500';

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-bold tabular-nums text-brand-navy">
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className={classNames(
            'h-full rounded-full transition-all duration-500 ease-out',
            barColor,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// StepIndicator
// ============================================================
export interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // 0-based index
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, i) => {
          const isComplete = i < currentStep;
          const isCurrent = i === currentStep;
          const isLast = i === steps.length - 1;

          return (
            <div
              key={i}
              className="flex flex-1 items-center gap-1 sm:gap-2"
            >
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={classNames(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300',
                    isComplete && 'bg-brand-purple text-white',
                    isCurrent &&
                      'bg-brand-purple text-white ring-4 ring-brand-purple/20 animate-success-pop',
                    !isComplete &&
                      !isCurrent &&
                      'bg-neutral-200 text-neutral-400',
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={classNames(
                    'hidden text-xs font-medium sm:block',
                    isCurrent
                      ? 'text-brand-purple'
                      : isComplete
                        ? 'text-neutral-700'
                        : 'text-neutral-400',
                  )}
                >
                  {step}
                </span>
              </div>
              {!isLast && (
                <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-purple transition-all duration-500 ease-out"
                    style={{ width: isComplete ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SectionCard
// ============================================================
export interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={classNames('card overflow-hidden', className)}
    >
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
              <Icon className="h-4.5 w-4.5 text-brand-purple" />
            </div>
          )}
          <h3 className="text-sm font-bold uppercase tracking-wide text-brand-navy">
            {title}
          </h3>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ============================================================
// Badge
// ============================================================
export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const badgeVariantMap: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-600',
  success: 'bg-accent-green/10 text-accent-green',
  warning: 'bg-accent-yellow/10 text-accent-yellow',
  error: 'bg-red-500/10 text-red-600',
  info: 'bg-blue-500/10 text-blue-600',
  purple: 'bg-brand-purple/10 text-brand-purple',
};

export function Badge({
  variant = 'default',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-300',
        badgeVariantMap[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ============================================================
// Toggle
// ============================================================
export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  const handleToggle: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = (
    e,
  ) => {
    e.preventDefault();
    if (!disabled) onChange(!checked);
  };

  return (
    <label
      className={classNames(
        'inline-flex items-center gap-3 select-none',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={handleToggle}
        className={classNames(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2',
          checked ? 'bg-brand-purple' : 'bg-neutral-300',
        )}
      >
        <span
          className={classNames(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-all duration-300',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-brand-navy">{label}</span>
      )}
    </label>
  );
}
