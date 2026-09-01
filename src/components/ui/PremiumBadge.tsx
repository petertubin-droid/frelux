/**
 * PremiumBadge — golden crown icon used to identify premium features.
 *
 * Replaces text-based "Premium" / "PREMIUM" labels with a consistent
 * visual identifier across the app.
 *
 * Sizes: 'xs' | 'sm' | 'md' | 'lg'
 * Variants: 'icon' (crown only) | 'minimal' (crown + tiny dot)
 */
import { Crown } from "lucide-react";
import { classNames } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

interface Props {
  size?: Size;
  className?: string;
  /** Add a subtle gold glow ring around the crown */
  glow?: boolean;
  /** Show a tiny gold dot next to the crown (for inline contexts) */
  minimal?: boolean;
}

export function PremiumBadge({
  size = "sm",
  className,
  glow = false,
  minimal = false,
}: Props) {
  const sizeClass = SIZE_MAP[size];

  if (minimal) {
    return (
      <span className={classNames("inline-flex items-center gap-1", className)}>
        <Crown
          className={classNames(sizeClass, "text-amber-500")}
          strokeWidth={2}
          fill="currentColor"
        />
      </span>
    );
  }

  return (
    <span
      className={classNames(
        "inline-flex items-center justify-center",
        glow && "rounded-full bg-amber-500/10 p-1 ring-1 ring-amber-500/30",
        className,
      )}
    >
      <Crown
        className={classNames(sizeClass, "text-amber-500")}
        strokeWidth={2}
        fill="currentColor"
      />
    </span>
  );
}
