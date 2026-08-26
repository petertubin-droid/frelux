import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { classNames } from '@/lib/utils';

type EmptyIllustration = 'projects' | 'favorites' | 'templates' | 'learn' | 'search' | 'generic';

const illustrationPaths: Record<EmptyIllustration, ReactNode> = {
  projects: (
    <>
      <rect x="6" y="8" width="36" height="28" rx="3" fill="currentColor" opacity="0.1" />
      <rect x="10" y="12" width="28" height="4" rx="1" fill="currentColor" opacity="0.25" />
      <rect x="10" y="19" width="20" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="10" y="25" width="24" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="10" y="31" width="16" height="3" rx="1" fill="currentColor" opacity="0.15" />
    </>
  ),
  favorites: (
    <>
      <path d="M24 14c-2-4-6-6-10-4s-4 7-2 11l12 14 12-14c2-4 2-9-2-11s-8 0-10 4z" fill="currentColor" opacity="0.12" />
      <path d="M24 18c-1-3-4-4-6-3s-3 4-2 6l8 9 8-9c1-2 1-5-2-6s-5 0-6 3z" fill="currentColor" opacity="0.25" />
    </>
  ),
  templates: (
    <>
      <rect x="8" y="6" width="32" height="32" rx="4" fill="currentColor" opacity="0.08" />
      <rect x="12" y="10" width="24" height="3" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="12" y="16" width="20" height="2" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="12" y="21" width="22" height="2" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="12" y="26" width="18" height="2" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="12" y="31" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
    </>
  ),
  learn: (
    <>
      <path d="M24 8l16 6-16 6-16-6 16-6z" fill="currentColor" opacity="0.1" />
      <path d="M14 20v10c0 2 5 4 10 4s10-2 10-4V20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <line x1="40" y1="14" x2="40" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="22" cy="22" r="12" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <line x1="31" y1="31" x2="40" y2="40" stroke="currentColor" strokeWidth="3" opacity="0.2" strokeLinecap="round" />
    </>
  ),
  generic: (
    <>
      <circle cx="24" cy="24" r="16" fill="currentColor" opacity="0.08" />
      <rect x="16" y="18" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
      <rect x="16" y="24" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
      <rect x="16" y="30" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.15" />
    </>
  ),
};

const colorByType: Record<EmptyIllustration, string> = {
  projects: 'text-brand-purple',
  favorites: 'text-rose-400',
  templates: 'text-blue-400',
  learn: 'text-accent-orange',
  search: 'text-neutral-500',
  generic: 'text-brand-purple',
};

export default function EmptyState({
  illustration = 'generic',
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  secondaryLabel,
  secondaryTo,
  className,
}: {
  illustration?: EmptyIllustration;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryTo?: string;
  className?: string;
}) {
  return (
    <div className={classNames('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className={classNames('mb-6 relative', colorByType[illustration])}>
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-current opacity-[0.03] blur-2xl" aria-hidden="true" />
        <svg width="120" height="120" viewBox="0 0 48 48" fill="none" className="animate-fade-in-up">
          {illustrationPaths[illustration]}
        </svg>
      </div>
      <h3 className="text-xl font-bold text-brand-navy dark:text-white animate-fade-in-up" style={{ animationDelay: '0.05s' }}>{title}</h3>
      <p className="mt-2 max-w-md text-sm text-neutral-500 leading-relaxed dark:text-neutral-500 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {actionLabel && actionTo && (
            <Link to={actionTo} className="btn-primary">
              {actionLabel}
            </Link>
          )}
          {actionLabel && !actionTo && onAction && (
            <button type="button" onClick={onAction} className="btn-primary">
              {actionLabel}
            </button>
          )}
          {secondaryLabel && secondaryTo && (
            <Link to={secondaryTo} className="btn-secondary">
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
