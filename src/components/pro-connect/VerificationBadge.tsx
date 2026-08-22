import { useState, useRef, useEffect } from 'react';
import { Check, ShieldCheck, Award, Info } from 'lucide-react';
import type { DbProProfile } from '@/types/pro-connect';
import { getVerificationTier, verificationTierInfo } from '@/types/pro-connect';
import { classNames } from '@/lib/utils';

interface VerificationBadgeProps {
  profile: DbProProfile;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const iconMap = {
  check: Check,
  shield: ShieldCheck,
  award: Award,
};

const colorMap = {
  0: { text: 'text-neutral-400 dark:text-neutral-500', bg: 'bg-neutral-100 dark:bg-white/5', border: 'border-neutral-200 dark:border-white/5' },
  1: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
  2: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
  3: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
};

export function VerificationBadge({ profile, size = 'sm', showLabel = true, className = '' }: VerificationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tier = getVerificationTier(profile);
  const info = verificationTierInfo[tier];
  const Icon = iconMap[info.icon];
  const colors = colorMap[tier];

  const sizeClasses = {
    sm: { badge: 'text-xs px-2 py-0.5 gap-1', icon: 'h-3.5 w-3.5' },
    md: { badge: 'text-sm px-2.5 py-1 gap-1.5', icon: 'h-4 w-4' },
    lg: { badge: 'text-base px-3 py-1.5 gap-2', icon: 'h-5 w-5' },
  };

  useEffect(() => {
    if (!showTooltip) return;
    function handler(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTooltip]);

  if (tier === 0) return null;

  return (
    <div className={classNames('relative inline-block', className)} ref={tooltipRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowTooltip(!showTooltip); }}
        className={classNames(
          'inline-flex items-center rounded-full font-medium border transition-colors',
          colors.text,
          colors.bg,
          colors.border,
          sizeClasses[size].badge,
        )}
      >
        <Icon className={sizeClasses[size].icon} />
        {showLabel && <span>{info.shortLabel}</span>}
        <Info className={classNames('opacity-50', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      </button>

      {showTooltip && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-brand-navy-mid">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={classNames(sizeClasses[size].icon, colors.text)} />
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">{info.label}</span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {tier === 1 && 'This professional has verified their email address and phone number with FRELUX.'}
            {tier === 2 && 'FRELUX has reviewed the professional\u2019s identity and professional profile information according to FRELUX\u2019s verification requirements.'}
            {tier === 3 && 'This professional has demonstrated sustained excellence on FRELUX through verified credentials, legitimate reviews, and portfolio history.'}
          </p>
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
              Verification does not constitute a guarantee of workmanship, pricing, or project outcome.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function VerificationBadgeInline({ profile, className = '' }: { profile: DbProProfile; className?: string }) {
  const tier = getVerificationTier(profile);
  if (tier === 0) return null;
  const info = verificationTierInfo[tier];
  const Icon = iconMap[info.icon];
  const colors = colorMap[tier];

  return (
    <span className={classNames('inline-flex items-center gap-1 text-xs font-medium', colors.text, className)}>
      <Icon className="h-3.5 w-3.5" />
      {info.shortLabel}
    </span>
  );
}
