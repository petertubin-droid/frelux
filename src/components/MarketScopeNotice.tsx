import { useMarket } from "@/lib/international/market-context";

/**
 * Shown on estimators that model Nigerian construction practice
 * (sandcrete blockwork, local mixes, NGN price book) when the
 * visitor's market is not Nigeria. The finish calculators adapt to
 * the visitor's market automatically; these structural estimators
 * currently do not, so we say so instead of guessing.
 */
export default function MarketScopeNotice() {
  const { marketCode } = useMarket();
  if (marketCode === "NG") return null;
  return (
    <div
      className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm"
      data-testid="market-scope-notice"
    >
      <p className="font-semibold">
        Nigerian construction practice (market: {marketCode})
      </p>
      <p className="mt-1 text-muted-foreground">
        This estimator models Nigerian building methods - sandcrete blocks
        and local mix ratios - while prices now resolve from your market's
        verified price book where available (see the price provenance panel:
        cement is pack-size converted; unpriced items are reported, never
        guessed). The finishing calculators (painting, tiling, POP or drywall
        ceilings, screeding) adapt fully to your market with local materials
        and labour rates.
      </p>
    </div>
  );
}
