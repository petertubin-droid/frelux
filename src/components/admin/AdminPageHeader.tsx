import { type ReactNode } from "react";
import HeroTitle from "@/components/ui/HeroTitle";

/**
 * AdminPageHeader
 *
 * The single heading block for admin screens. AdminLayout already supplies the
 * content container and the breadcrumb trail, so this component deliberately
 * carries no page-level backdrop photo, mesh or ambient orbs: internal tooling
 * reads as data, not as a marketing page.
 *
 * It exists because thirty-plus admin screens each opened on a hand-rolled
 * heading with slightly different size, weight and spacing, and around sixty
 * more rendered no page title at all. Titles now share one typographic scale
 * (the same Clash Display face the public header uses) and one divider, so an
 * admin screen announces itself the same way wherever you land. Stats and meta
 * ride under the title as a definition-style row rather than as loose text.
 */
export default function AdminPageHeader({
  title,
  description,
  eyebrow,
  meta,
  actions,
  className = "",
}: {
  /** Screen name. Rendered as the page's level-one heading. */
  title: string;
  /** One or two sentences on what the screen governs. */
  description?: ReactNode;
  /** Short module label, e.g. "Construction engines". */
  eyebrow?: string;
  /** Compact facts shown beside the title, e.g. record counts or a last sync. */
  meta?: { label: string; value: ReactNode }[];
  /** Primary and secondary controls for the screen. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`mb-6 rounded-b-3xl border-b border-border pb-4 dark:border-white/10 ${className}`}
    >
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <HeroTitle
            title={title}
            className="text-xl text-foreground sm:text-2xl dark:text-primary-foreground"
          />
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {meta && meta.length > 0 && (
        <dl className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-xs">
          {meta.map((item) => (
            <div key={item.label} className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-semibold text-foreground dark:text-primary-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
