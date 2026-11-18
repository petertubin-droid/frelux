/**
 * Steel stock lengths, market by market.
 *
 * A reinforcement takeoff that divides total bar length by 12 m is only right
 * where 12 m is what the merchant sells. US and Canadian mills ship 20 ft
 * (6.10 m) lengths, Australia sells 6 m, and a Lagos merchant sells 12 m. The
 * bar count feeds the price, the cutting list and the waste, so the stock
 * length belongs to the market, not to the engine.
 *
 * A market with no entry here returns the 12 m fallback with
 * `isMarketSpecific: false`, so a caller can say so rather than imply the
 * lengths are local.
 */
export interface RebarStockResolution {
  lengthM: number;
  configuredMarket: string | null;
  isMarketSpecific: boolean;
}

const REBAR_STOCK_M: Record<string, number> = {
  NG: 12,
  GH: 12,
  KE: 12,
  ZA: 12,
  AE: 12,
  SA: 12,
  GB: 12,
  IE: 12,
  FR: 12,
  DE: 12,
  IT: 12,
  ES: 12,
  NL: 12,
  PT: 12,
  PL: 12,
  TR: 12,
  IN: 12,
  BR: 12,
  MX: 12,
  CN: 12,
  ID: 12,
  US: 6.1,
  CA: 6.1,
  AU: 6,
  NZ: 6,
};

const FALLBACK_STOCK_M = 12;

export function resolveRebarStockLength(market: string): RebarStockResolution {
  const code = (market || "").trim().toUpperCase();
  const length = REBAR_STOCK_M[code];
  if (typeof length === "number") {
    return { lengthM: length, configuredMarket: code, isMarketSpecific: true };
  }
  return {
    lengthM: FALLBACK_STOCK_M,
    configuredMarket: null,
    isMarketSpecific: false,
  };
}
