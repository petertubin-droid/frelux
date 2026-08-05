import { siteConfig } from '@/config/site';
import { classNames } from '@/lib/utils';
import { useBranding } from '@/lib/branding';
import { useTheme } from '@/lib/theme';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'mark';
  light?: boolean; // for dark backgrounds
}

export default function Logo({ className, variant = 'full', light = false }: LogoProps) {
  const { branding } = useBranding();
  const { theme } = useTheme();
  const brandText = light || theme === 'dark' ? 'text-white dark:text-white' : 'text-brand-navy';
  const subText = light || theme === 'dark' ? 'text-white/70 dark:text-white/70' : 'text-neutral-500 dark:text-neutral-400';

  const logoUrl = theme === 'dark' ? branding?.dark_logo_url : branding?.light_logo_url;
  const displayName = branding?.website_name ?? siteConfig.name;
  const shortName = (branding?.website_name ?? siteConfig.shortName).split(' ')[0] ?? 'FRELUX';
  const tagline = branding?.website_tagline ?? 'Paint Calc';

  return (
    <span className={classNames('inline-flex items-center gap-2.5', className)}>
      {logoUrl ? (
        <img src={logoUrl} alt={displayName} className="h-9 w-auto shrink-0" />
      ) : (
        <LogoMark className="h-9 w-9 shrink-0" />
      )}
      {variant === 'full' && (
        <span className="flex flex-col leading-none">
          <span className={classNames('text-base font-bold tracking-tight', brandText)}>
            {shortName}
          </span>
          <span className={classNames('text-[10px] font-semibold uppercase tracking-[0.18em]', subText)}>
            {tagline}
          </span>
        </span>
      )}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={`${siteConfig.name} logo`}
    >
      <rect width="64" height="64" rx="14" fill="#4C1D95" />
      <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#6B21A8" strokeWidth="1" />
      <path
        d="M16 46V20h18M16 32h14"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="46" cy="22" r="4.5" fill="#F97316" />
      <circle cx="46" cy="34" r="4.5" fill="#EAB308" />
      <circle cx="46" cy="46" r="4.5" fill="#22C55E" />
      <path d="M40 22h-2M40 34h-2M40 46h-2" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
