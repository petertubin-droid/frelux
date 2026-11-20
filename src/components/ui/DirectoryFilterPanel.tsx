import type { ReactNode } from "react";

interface DirectoryFilterPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Shared filter-panel treatment for non-calculator browsing pages. */
export default function DirectoryFilterPanel({
  title,
  description,
  children,
  className = "",
  bodyClassName = "",
}: DirectoryFilterPanelProps) {
  return (
    <section
      className={`rounded-2xl border border-border/70 bg-card shadow-sm ${className}`}
      aria-label={title}
    >
      <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className={`p-4 sm:p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
