import { siteConfig } from "@/config/site";
import { classNames } from "@/lib/utils";
import { useBranding } from "@/lib/branding";
import { useTheme } from "@/lib/theme";

/**
 * Brand lockup.
 *
 * The artwork is fixed: the rounded tile, the gradient and the monogram are the
 * logo files in /public/brand, and nothing here redraws them. What this file
 * owns is the presentation, and the presentation follows the rules a large
 * product lockup follows rather than a marketing badge:
 *
 * 1. The mark and the wordmark share one optical centre. The tile is a square,
 *    an all-caps wordmark is not, so each size pairs an explicit mark edge with
 *    an explicit cap height instead of leaving both at `text-xl` and hoping.
 * 2. One accent. The tile already carries the orange rule inside the artwork,
 *    so a second accent rule beside the wordmark was drawing the same signal
 *    twice within ten pixels. It is gone.
 * 3. The mark does not move. A logo that scales on hover reads as a button, so
 *    the hover state belongs to the link around it, not to the artwork.
 * 4. Type is legible at its actual size. The descriptor sat at 10px in a 70%
 *    tint, which is below the size where small caps stay readable and below the
 *    contrast a small label needs. It is 11px in the muted token now.
 * 5. One accessible name. The image is decorative because the text beside it
 *    already says the name, and the link that wraps the lockup supplies the
 *    label, so `decorative` drops the role rather than repeating the name twice.
 */

type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
  /** Set for dark surfaces; otherwise the theme decides. */
  light?: boolean;
  /** Pairing of mark edge and type scale. Defaults to the header size. */
  size?: LogoSize;
  /**
   * Drop the accessible name entirely. Use where a wrapping link already
   * carries the label, so the name is not announced twice.
   */
  decorative?: boolean;
}

/**
 * Mark edge in pixels against the type that sits beside it.
 *
 * The wordmark cap height lands at roughly 0.72 of its font size, and a tile
 * reads correctly a little larger than that cap, so a 32px tile pairs with an
 * 18px wordmark and a 28px tile with 16px.
 */
const SIZE_TOKENS: Record<
  LogoSize,
  { edge: number; gap: string; name: string; descriptor: string; rule: string }
> = {
  sm: {
    edge: 28,
    gap: "gap-2",
    name: "text-[15px] leading-[15px]",
    descriptor: "text-[11px] leading-[11px] tracking-[0.1em]",
    rule: "mt-[3px]",
  },
  md: {
    edge: 32,
    gap: "gap-2.5",
    name: "text-[17px] leading-[17px] sm:text-[18px] sm:leading-[18px]",
    descriptor: "text-[11px] leading-[11px] tracking-[0.13em]",
    rule: "mt-[4px]",
  },
  lg: {
    edge: 40,
    gap: "gap-3",
    name: "text-[21px] leading-[21px]",
    descriptor: "text-[11px] leading-[11px] tracking-[0.14em]",
    rule: "mt-[5px]",
  },
};

export default function Logo({
  className,
  variant = "full",
  light = false,
  size = "md",
  decorative = false,
}: LogoProps) {
  const { branding } = useBranding();
  const { theme } = useTheme();
  const onDark = light || theme === "dark";
  const token = SIZE_TOKENS[size];

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
      {...(decorative
        ? { "aria-hidden": true as const }
        : { role: "img", "aria-label": displayName })}
      className={classNames(
        "inline-flex select-none items-center",
        token.gap,
        className,
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          width={token.edge}
          height={token.edge}
          decoding="async"
          className="shrink-0 object-contain"
          style={{ height: token.edge, width: "auto" }}
        />
      ) : (
        <LogoMark
          size={token.edge}
          className="shrink-0"
          variant={onDark ? "light" : "dark"}
        />
      )}
      {variant === "full" && (
        <span className="flex min-w-0 flex-col justify-center">
          <span
            className={classNames(
              "font-display font-bold tracking-[-0.02em]",
              onDark ? "text-white" : "text-brand-purple",
              token.name,
            )}
          >
            {shortName}
          </span>
          <span
            className={classNames(
              "font-medium uppercase",
              onDark ? "text-white/65" : "text-muted-foreground",
              token.descriptor,
              token.rule,
            )}
          >
            {tagline}
          </span>
        </span>
      )}
    </span>
  );
}

export function LogoMark({
  className,
  variant = "auto",
  size = 32,
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
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      className={classNames("aspect-square object-contain", className)}
    />
  );
}
