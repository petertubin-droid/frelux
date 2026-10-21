import { ChevronDown, ExternalLink, ShieldCheck } from "lucide-react";
import { getStructuralJurisdictionScope } from "@/lib/engineering/structural-jurisdiction-scope";
import { useMarket } from "@/lib/international/market-context";

export type EngineerReviewDiscipline = "structural" | "foundation";

const REVIEW_ITEMS: Record<EngineerReviewDiscipline, string[]> = {
  structural: [
    "Verify project loads, combinations, boundary conditions and site assumptions.",
    "Check material properties, member dimensions, reinforcement and detailing.",
    "Confirm applicable local code editions, amendments and authority requirements.",
  ],
  foundation: [
    "Review the site geotechnical report, groundwater and settlement criteria.",
    "Verify loads, bearing assumptions, code editions and local amendments.",
    "Check foundation type, dimensions, reinforcement, detailing and constructability.",
  ],
};

/** Compact, country-aware human-review reminder; code references provide regulatory context and never imply automatic compliance. */
export default function EngineerReviewBadge({
  discipline = "structural",
}: {
  discipline?: EngineerReviewDiscipline;
}) {
  const { marketCode, market } = useMarket();
  const scope = getStructuralJurisdictionScope(marketCode, market?.countryName);

  return (
    <details
      className="group relative z-10 shrink-0"
      data-testid="engineer-review-badge"
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-50 to-white px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm shadow-amber-900/5 transition hover:border-amber-500/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:from-amber-950/40 dark:to-card dark:text-amber-100 [&::-webkit-details-marker]:hidden">
        <ShieldCheck
          aria-hidden="true"
          className="h-4 w-4 text-amber-600 dark:text-amber-400"
        />
        <span>Engineer Review</span>
        <span className="hidden rounded-full bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-800 sm:inline dark:text-amber-200">
          {marketCode}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
        />
      </summary>
      <div
        className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-amber-500/25 bg-card p-4 text-left text-foreground shadow-xl shadow-black/10 dark:border-amber-400/20"
        role="region"
        aria-label="Engineer review details"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck
            aria-hidden="true"
            className="h-4 w-4 text-amber-600 dark:text-amber-400"
          />
          Licensed engineer approval required
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          This preliminary {discipline} calculation must be independently
          reviewed and approved by a locally licensed engineer before it is used
          as a design or for construction. This reminder applies to every FRELUX
          market; choosing a country does not certify code compliance.
        </p>
        <p className="mt-3 text-xs font-semibold">
          Review for {market?.countryName || scope?.country || marketCode} (
          {marketCode})
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
          {REVIEW_ITEMS[discipline].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {scope ? (
          <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2.5">
            <div>
              <p className="text-[11px] font-semibold text-foreground/90">
                Governing Code Reference:
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {scope.framework}
              </p>
            </div>
            <div>
              <a
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
                href={scope.verifiedSource}
                target="_blank"
                rel="noreferrer"
              >
                {scope.sourceLabel} (reference only){" "}
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </div>
            {scope.localScope && (
              <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                {scope.localScope}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-muted/70 p-2 text-xs leading-relaxed text-muted-foreground">
            No structural code reference is maintained here for this market.
            Confirm the governing standards and amendments with the local
            authority and reviewing engineer.
          </p>
        )}
      </div>
    </details>
  );
}
