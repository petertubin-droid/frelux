import type { ReactNode } from 'react';
import { classNames } from '@/lib/utils';

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classNames('card p-5 sm:p-6', className)}>{children}</div>;
}

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
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
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50';
  const variants = {
    primary: 'bg-brand-purple text-white hover:bg-brand-purple-dark',
    secondary: 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classNames(base, variants[variant], className)}>
      {children}
    </button>
  );
}

export function StateMessage({ type, title, message, action }: { type: 'loading' | 'error' | 'empty'; title: string; message: string; action?: ReactNode }) {
  const styles = {
    loading: 'border-neutral-200 bg-neutral-50 text-neutral-500',
    error: 'border-red-200 bg-red-50 text-red-700',
    empty: 'border-dashed border-neutral-300 bg-neutral-50 text-neutral-500',
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
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2" aria-pressed={checked}>
      <span className={classNames('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-accent-green' : 'bg-neutral-300')}>
        <span className={classNames('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </span>
      {label && <span className="text-sm text-neutral-600">{label}</span>}
    </button>
  );
}

export function AdminField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-neutral-700">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-neutral-400">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
