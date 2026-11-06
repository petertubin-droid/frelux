import { siteConfig } from "@/config/site";
import { classNames } from "@/lib/utils";
import { useBranding } from "@/lib/branding";
import { useTheme } from "@/lib/theme";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
  light?: boolean; // for dark backgrounds
}

export default function Logo({
  className,
  variant = "full",
  light = false,
}: LogoProps) {
  const { branding } = useBranding();
  const { theme } = useTheme();
  const onDark = light || theme === "dark";
  const brandText = onDark ? "text-white" : "text-brand-purple";
  const subText = onDark ? "text-white/70" : "text-brand-purple/70";
  const accentBar = onDark ? "bg-brand-orange" : "bg-brand-orange";

  const logoUrl =
    theme === "dark" ? branding?.dark_logo_url : branding?.light_logo_url;
  const displayName = branding?.website_name ?? siteConfig.name;
  const shortName =
    (branding?.website_name ?? siteConfig.shortName).split(" ")[0] ?? "FRELUX";
  // The long default tagline is meant for meta/SEO; the compact header lockup
  // keeps the short "Smart Calc" so it never changes shape when branding loads.
  const rawTagline = branding?.website_tagline;
  const tagline =
    !rawTagline || rawTagline === "Every Trade. Every Cost. One Platform."
      ? "Smart Calc"
      : rawTagline;

  return (
    <span
      role="img"
      aria-label={displayName}
      className={classNames(
        "inline-flex items-center gap-2.5 sm:gap-3 select-none",
        className,
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={displayName}
          aria-hidden="true"
          width={36}
          height={36}
          className="h-9 w-auto shrink-0"
        />
      ) : (
        <LogoMark
          className="h-9 w-9 shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-[1.03]"
          variant={light || theme === "dark" ? "light" : "dark"}
        />
      )}
      {variant === "full" && (
        <span className="flex flex-col justify-center leading-none">
          <span
            className={classNames(
              "font-display text-[17px] font-extrabold tracking-[-0.01em]",
              brandText,
            )}
          >
            {shortName}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={classNames(
                "h-[2px] w-3 rounded-full shrink-0",
                accentBar,
              )}
            />
            <span
              className={classNames(
                "text-[10px] font-semibold uppercase tracking-[0.18em]",
                subText,
              )}
            >
              {tagline}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

export function LogoMark({
  className,
  variant = "auto",
  size = 36,
}: {
  className?: string;
  /** "light" is the white knock-out for dark surfaces. */
  variant?: "auto" | "light" | "dark";
  /** Rendered edge length in pixels. */
  size?: number;
}) {
  const { theme } = useTheme();
  const light = variant === "light" || (variant === "auto" && theme === "dark");
  return (
    <img
      src={light ? "/brand/frelux-mark-light.svg" : "/brand/frelux-mark.svg"}
      alt={`${siteConfig.name} logo`}
      aria-hidden="true"
      width={size}
      height={size}
      className={classNames("aspect-square object-contain", className)}
    />
  );
}
