import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

/**
 * The site-wide maintenance ticker: a thin orange strip pinned directly under
 * the fixed header, carrying whatever sentence the administrator has published
 * from the admin panel.
 *
 * Deliberate choices:
 * - It occupies real height (sticky, not fixed), so it never covers content and
 *   never causes a layout shift when it appears.
 * - It renders nothing when there is no message, so a blank setting is silent
 *   rather than an empty orange bar.
 * - Assistive tech reads the sentence once, in full, through a live region; the
 *   duplicated marquee copy is aria-hidden because it exists only to loop.
 * - Reduced-motion visitors get the same sentence statically instead of a
 *   moving line they cannot stop.
 */
export default function MaintenanceTicker({
  message,
  inline = false,
}: {
  message: string;
  /** Inside the admin preview the strip must sit still in the card, not pin. */
  inline?: boolean;
}) {
  const { t } = useLanguage();
  const text = message.replace(/\s+/g, " ").trim();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  if (!text) return null;

  // Reading speed stays constant as the sentence grows, so a long announcement
  // is not a blur and a short one is not a crawl.
  const duration = Math.min(60, Math.max(14, text.length * 0.14));

  return (
    <div
      data-testid="maintenance-ticker"
      className={`maintenance-ticker flex h-8 w-full items-stretch overflow-hidden border-y border-orange-800/40 bg-orange-700 text-white dark:border-orange-950/50 dark:bg-orange-600 ${
        inline
          ? ""
          : "sticky top-14 z-30 shadow-[0_12px_28px_-22px_rgba(124,45,18,0.9)] lg:top-16"
      }`}
    >
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {t("Maintenance")}: {text}
      </span>

      <span
        aria-hidden="true"
        className="flex shrink-0 items-center gap-1.5 border-r border-white/15 bg-orange-800/45 px-2.5 text-xs font-bold uppercase tracking-[0.12em] text-orange-50 sm:px-3 dark:bg-orange-950/30"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span className="hidden sm:inline">{t("Maintenance")}</span>
      </span>

      <div aria-hidden="true" className="relative flex-1 overflow-hidden">
        {reducedMotion ? (
          <p className="h-8 truncate px-3 text-xs font-semibold leading-8">
            {text}
          </p>
        ) : (
          <div
            className="maintenance-ticker-track flex h-8 w-max items-center will-change-transform"
            style={{ animationDuration: `${duration}s` }}
          >
            {/* Two identical copies: the track translates exactly one copy's
                width, so the loop has no gap and no jump. */}
            <span className="whitespace-nowrap pr-24 text-xs font-semibold">
              {text}
            </span>
            <span className="whitespace-nowrap pr-24 text-xs font-semibold">
              {text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
