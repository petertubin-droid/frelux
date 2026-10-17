import { useMemo } from "react";
import { useMarket } from "@/lib/international/market-context";

/**
 * Learn Hub market scoping.
 *
 * Articles are tagged `market = 'NG' | '<ISO alpha-2>' | 'GLOBAL'`
 * (migration 20261024090000_learn_hub_market_scoping). Hub, library,
 * category and search listings only show articles tagged with the
 * visitor's market or GLOBAL, so a US visitor never sees the Nigerian
 * library once market-specific corpora exist.
 *
 * Individual article pages stay reachable by slug (SEO + shared
 * links); only LISTINGS are scoped.
 */
export const GLOBAL_ARTICLE_MARKET = "GLOBAL";

export interface LearnMarketScope {
  /** Visitor's current market code (e.g. "NG", "US"). */
  marketCode: string;
  /** Display name for the visitor's market (e.g. "United States"). */
  countryName: string;
  /** `.in("market", ...)` filter values for article listings. */
  visibleMarkets: string[];
  /** True when the visitor is in the reference (Nigerian) corpus. */
  isReferenceMarket: boolean;
}

export function useLearnMarketScope(): LearnMarketScope {
  const { market, marketCode } = useMarket();
  const visibleMarkets = useMemo(
    () => [marketCode, GLOBAL_ARTICLE_MARKET],
    [marketCode],
  );
  return {
    marketCode,
    countryName: market.countryName ?? marketCode,
    visibleMarkets,
    isReferenceMarket: marketCode === "NG",
  };
}
