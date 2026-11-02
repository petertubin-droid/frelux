import { useEffect, useState } from "react";
import {
  fetchCalcRules,
  fetchEstimationMaterials,
  fetchMarketPriceBook,
} from "@/lib/estimation/queries";
import {
  summarisePriceBook,
  type PriceBookSummary,
} from "@/lib/prices/freshness";
import type { EstimationMaterial } from "@/types/estimation";
import type {
  CalcRuleLike,
  SpecialtyPriceMap,
} from "@/lib/estimation/specialty";
import { useMarket } from "@/lib/international/market-context";

export interface SpecialtyPrices {
  /** Configured price per material slug; null means no price is configured */
  priceMap: SpecialtyPriceMap;
  ruleRows: CalcRuleLike[];
  bookSummary: PriceBookSummary | null;
  loading: boolean;
}

/**
 * Loads configured material prices and admin rules for a specialty calculator.
 *
 * Prices come from the shared material database for the active market. Outside
 * Nigeria, a reference price that came from the Nigerian reference book is
 * treated as unconfigured rather than converted, so nothing is presented as a
 * local price when it is not one.
 */
export function useSpecialtyPrices(calcType: string): SpecialtyPrices {
  const { marketCode } = useMarket();
  const [priceMap, setPriceMap] = useState<SpecialtyPriceMap>({});
  const [ruleRows, setRuleRows] = useState<CalcRuleLike[]>([]);
  const [bookSummary, setBookSummary] = useState<PriceBookSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [rulesRes, matsRes, book] = await Promise.all([
        fetchCalcRules(calcType),
        fetchEstimationMaterials(true),
        fetchMarketPriceBook(marketCode),
      ]);
      if (!alive) return;
      setBookSummary(summarisePriceBook(book));
      const byRef = book.byRef;
      const map: SpecialtyPriceMap = {};
      for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
        map[m.slug] =
          marketCode !== "NG" && book.fromReference.has(m.id)
            ? null
            : (byRef.get(m.id) ?? null);
      }
      setPriceMap(map);
      setRuleRows((rulesRes.data ?? []) as unknown as CalcRuleLike[]);
      setLoading(false);
    })().catch(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [calcType, marketCode]);

  return { priceMap, ruleRows, bookSummary, loading };
}

/** Buyer-entered prices win over catalog prices, and only for that line. */
export function mergePriceOverrides(
  base: SpecialtyPriceMap,
  overrides: Record<string, string>,
): SpecialtyPriceMap {
  const merged: SpecialtyPriceMap = { ...base };
  for (const [slug, raw] of Object.entries(overrides)) {
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n) && n >= 0) merged[slug] = n;
  }
  return merged;
}
