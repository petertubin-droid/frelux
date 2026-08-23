import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { type ReactNode } from 'react';

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel,
  actions,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
  breadcrumbs?: { label: string; path?: string }[];
}) {
  return (
    <div className="relative border-b border-neutral-200/80 bg-white dark:border-white/5 dark:bg-brand-navy-mid">
      {/* Subtle gradient accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/15 to-transparent" aria-hidden="true" />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {backTo && (
          <Link
            to={backTo}
            className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-brand-purple dark:text-neutral-400 dark:hover:text-brand-purple-lighter"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {backLabel ?? 'Back'}
          </Link>
        )}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-neutral-300 dark:text-neutral-600">/</span>}
                {crumb.path ? (
                  <Link to={crumb.path} className="transition-colors hover:text-brand-purple dark:hover:text-brand-purple-lighter">{crumb.label}</Link>
                ) : (
                  <span className="text-neutral-700 dark:text-neutral-300">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className="section-label mb-3 animate-fade-in-up">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-in-up">
            <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl text-balance dark:text-white">
              {title}
            </h1>
            {subtitle && <p className="mt-3 max-w-2xl text-base text-neutral-500 text-balance dark:text-neutral-400">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>{actions}</div>}
        </div>
      </div>
    </div>
  );
}
