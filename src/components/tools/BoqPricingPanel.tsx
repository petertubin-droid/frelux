/**
 * BOQ pricing panel (shared by the ICF and EIFS estimators).
 *
 * Renders the priced bill of quantities with the market's own unit
 * prices. The honesty rules are visible, not buried:
 *  - a line with no price says "unpriced" and why;
 *  - indicative prices are labelled as indicative;
 *  - an inherited price names the market it came from;
 *  - the subtotal covers priced lines only and never pretends to be a
 *    complete cost.
 */

import type { MarketPriceResolution } from "@/lib/estimation/icf-eifs-market";
import { priceBoq } from "@/lib/estimation/boq-pricing";
import { formatByCode } from "@/lib/international/currency-format";
import type { PriceableBoqLine } from "@/lib/estimation/boq-pricing";

export function BoqPricingPanel({
  boq,
  resolution,
  currencyCode,
  loading,
}: {
  boq: PriceableBoqLine[];
  resolution: MarketPriceResolution | null;
  currencyCode: string;
  loading?: boolean;
}) {
  const priced = priceBoq(boq, resolution?.prices ?? null);
  const market = resolution?.provenance[0]?.bookMarket ?? null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Material cost (market book)</h3>
        {loading ? (
          <span className="text-xs text-muted-foreground">Loading prices…</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {priced.priced_lines_count} priced · {priced.unpriced_lines_count}{" "}
            unpriced
            {market ? ` · book: ${market}` : ""}
          </span>
        )}
      </div>

      {!resolution ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No price book loaded for this market yet, so no cost is shown. Enter
          your supplier quotes to price it.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Item</th>
                  <th className="py-1 pr-2 font-medium">Qty</th>
                  <th className="py-1 pr-2 font-medium">Unit price</th>
                  <th className="py-1 font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {priced.lines.map((line) => (
                  <tr key={line.code} className="border-t border-border/60">
                    <td className="py-1.5 pr-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {line.code}
                      </span>
                      <div className="text-[11px]">{line.description}</div>
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {line.unit_price === null ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          unpriced
                        </span>
                      ) : (
                        formatByCode(line.unit_price, currencyCode)
                      )}
                    </td>
                    <td className="py-1.5 whitespace-nowrap">
                      {line.line_total === null
                        ? "—"
                        : formatByCode(line.line_total, currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">
              Priced subtotal (materials only, labour excluded)
            </span>
            <span className="text-sm font-semibold">
              {formatByCode(priced.priced_subtotal, currencyCode)}
            </span>
          </div>

          {!priced.complete && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {priced.unpriced.length} line
              {priced.unpriced.length === 1 ? "" : "s"} carry no price in this
              market's book ({priced.unpriced.join(", ")}). They are excluded
              from the subtotal rather than estimated.
            </p>
          )}

          {resolution.provenance.some((p) => p.evidence === "indicative") && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Some prices are indicative bands from the market book, not
              verified supplier listings. Verify before quoting.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default BoqPricingPanel;
