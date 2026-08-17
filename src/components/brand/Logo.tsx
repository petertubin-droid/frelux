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
        <LogoMark className="h-9 w-auto shrink-0" />
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
    <img
      src="/logo-mark.png"
      alt={`${siteConfig.name} logo`}
      className={className}
    />
  );
}
