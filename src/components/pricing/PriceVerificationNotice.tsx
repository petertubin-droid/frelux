/**
 * Shown above calculator content when the selected market's prices are not
 * verified. Deliberately quiet: one line, no alarm styling, no blocking.
 */
import { AlertTriangle } from "lucide-react";
import { useMarket } from "@/lib/international/market-context";
import {
  PRICE_VERIFICATION_SCANNED_AT,
  getMarketPriceVerification,
} from "@/lib/international/price-verification";
import { isSnapshotStale, snapshotAgeDays } from "@/lib/pricing/price-honesty";

export default function PriceVerificationNotice() {
  const { marketCode, market } = useMarket();
  const verification = getMarketPriceVerification(marketCode);
  // A "verified" market is only verified as of the snapshot. Once the snapshot
  // itself is old, saying nothing would be the dishonest choice.
  const staleSnapshot = isSnapshotStale();
  if (!verification || (verification.verified && !staleSnapshot)) return null;
  if (verification.verified && staleSnapshot) {
    return (
      <div
        role="status"
        className="mb-5 flex items-start gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
      >
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        <p>
          <span className="font-medium text-foreground">
            Price coverage data is {snapshotAgeDays()} days old.
          </span>{" "}
          {market?.countryName || marketCode} prices were last checked{" "}
          {PRICE_VERIFICATION_SCANNED_AT.slice(0, 10)}. Treat totals as
          indicative until a supplier confirms them.
        </p>
      </div>
    );
  }

  const label = market?.countryName || marketCode;
  const parts: string[] = [];
  if (verification.fx_reference > 0) {
    parts.push(
      `${verification.fx_reference} of ${verification.total} prices are FX reference rates`,
    );
  }
  if (verification.stale > 0) {
    parts.push(`${verification.stale} are older than the freshness window`);
  }
  const detail = parts.join(" and ");

  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
    >
      <AlertTriangle
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
      />
      <p>
        <span className="font-medium text-foreground">
          {label} prices are not verified yet.
        </span>{" "}
        {detail ? `${detail}. ` : ""}
        Treat the total as indicative until local retailer prices are confirmed.
        <span className="ml-1 opacity-70">
          Scan: {PRICE_VERIFICATION_SCANNED_AT.slice(0, 10)}.
        </span>
      </p>
    </div>
  );
}
