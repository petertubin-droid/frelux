import type { ReactNode } from 'react';
import { classNames } from '@/lib/utils';
import { Switch } from '@/components/ui/shadcn/switch';

export function AdminCard({ children, className, compact }: { children: ReactNode; className?: string; compact?: boolean }) {
  return <div className={classNames('card', compact ? 'p-3' : 'p-5 sm:p-6', className)}>{children}</div>;
}

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-brand-navy dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminButton({
  children, onClick, variant = 'primary', type = 'button', disabled, className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50';
  const variants = {
    primary: 'bg-brand-purple text-white hover:bg-brand-purple-dark',
    secondary: 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 dark:bg-brand-navy-mid dark:text-neutral-200 dark:border-white/5 dark:hover:bg-white/5',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 dark:bg-brand-navy-mid dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/10',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classNames(base, variants[variant], className)}>
      {children}
    </button>
  );
}

export function StateMessage({ type, title, message, action }: { type: 'loading' | 'error' | 'empty'; title: string; message: string; action?: ReactNode }) {
  const styles = {
    loading: 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-white/5 dark:bg-white/5 dark:text-neutral-400',
    error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400',
    empty: 'border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400',
  };
  return (
    <div className={classNames('rounded-lg border p-8 text-center', styles[type])}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

export function AdminField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-neutral-400 dark:text-neutral-500">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

// =========================================================
// CollapsibleGroup — used to break long flat admin lists
// (colors, materials, products, …) into organized, collapsible
// sections grouped by category/family instead of one endless scroll.
// =========================================================

export function CollapsibleGroup({
  title, count, isOpen, onToggle, children, preview,
}: {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  preview?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:bg-brand-navy-mid dark:hover:bg-white/5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <svg className={classNames('h-4 w-4 shrink-0 text-neutral-400 transition-transform', isOpen && 'rotate-90')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          <span className="truncate text-sm font-bold text-brand-navy dark:text-white">{title}</span>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:bg-white/10 dark:text-neutral-400">{count}</span>
        </div>
        {preview && <div className="hidden shrink-0 items-center gap-1 sm:flex">{preview}</div>}
      </button>
      {isOpen && (
        <div className="border-t border-neutral-200 bg-neutral-50/60 p-3 dark:border-white/5 dark:bg-white/[0.02]">
          {children}
        </div>
      )}
    </div>
  );
}

export function GroupControls({ onExpandAll, onCollapseAll, groupLabel = 'groups' }: { onExpandAll: () => void; onCollapseAll: () => void; groupLabel?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
      <span>Organized into {groupLabel}</span>
      <button type="button" onClick={onExpandAll} className="text-brand-purple hover:underline dark:text-brand-purple-lighter">Expand all</button>
      <span className="text-neutral-300 dark:text-neutral-600">·</span>
      <button type="button" onClick={onCollapseAll} className="text-brand-purple hover:underline dark:text-brand-purple-lighter">Collapse all</button>
    </div>
  );
}

// =========================================================
// AdminInput / AdminTextarea — shadcn-based form controls
// with FRELUX dark-mode styling baked in. Drop-in replacement
// for the old `input-field` CSS class pattern.
// =========================================================

import { Input as ShadcnInput } from '@/components/ui/shadcn/input';
import { Textarea as ShadcnTextarea } from '@/components/ui/shadcn/textarea';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function AdminInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <ShadcnInput
      className={classNames(
        'rounded-lg px-3.5 py-2.5 dark:bg-brand-navy-mid dark:border-white/10',
        className,
      )}
      {...props}
    />
  );
}

export function AdminTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <ShadcnTextarea
      className={classNames(
        'rounded-lg px-3.5 py-2.5 dark:bg-brand-navy-mid dark:border-white/10',
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// AdminSelect — native <select> with FRELUX dark-mode styling.
// shadcn-compatible border/ring tokens. Drop-in replacement
// for the old input-field CSS class on <select> elements.
// =========================================================

import type { SelectHTMLAttributes } from 'react';

export function AdminSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        'dark:bg-brand-navy-mid dark:border-white/10',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
