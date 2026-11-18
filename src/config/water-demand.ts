/**
 * Domestic water demand per person, market by market.
 *
 * A demand figure is a living standard, not physics: a US household uses
 * several times what a rural borehole serves, and a design that assumes one
 * number everywhere either oversizes every pump abroad or undersizes every
 * tank at home. These are published planning figures in litres per person per
 * day, grouped where the national guidance gives a band.
 *
 * The tier the user picks always wins; the market only supplies the default
 * for that tier, and a market with no row reports `isMarketSpecific: false`.
 */
export interface WaterDemandResolution {
  litresPerPersonPerDay: number;
  isMarketSpecific: boolean;
  configuredMarket: string | null;
}

const DEMAND_BY_MARKET: Record<
  string,
  { base: number; high: number; rural: number }
> = {
  // High-consumption temperate markets
  US: { base: 300, high: 400, rural: 150 },
  CA: { base: 250, high: 330, rural: 130 },
  AU: { base: 200, high: 260, rural: 120 },
  NZ: { base: 190, high: 250, rural: 120 },
  GB: { base: 150, high: 190, rural: 110 },
  IE: { base: 150, high: 190, rural: 110 },
  DE: { base: 130, high: 170, rural: 100 },
  FR: { base: 150, high: 190, rural: 110 },
  IT: { base: 150, high: 190, rural: 110 },
  ES: { base: 140, high: 180, rural: 105 },
  NL: { base: 130, high: 170, rural: 100 },
  // Middle-income markets
  ZA: { base: 120, high: 180, rural: 60 },
  BR: { base: 150, high: 200, rural: 90 },
  MX: { base: 140, high: 190, rural: 85 },
  TR: { base: 140, high: 180, rural: 90 },
  CN: { base: 130, high: 180, rural: 70 },
  // Markets where the borehole is often the primary supply
  // NG keeps the surveyed baseline the engine has always published.
  NG: { base: 150, high: 250, rural: 80 },
  GH: { base: 120, high: 190, rural: 65 },
  KE: { base: 100, high: 150, rural: 50 },
  IN: { base: 130, high: 190, rural: 70 },
  ID: { base: 110, high: 160, rural: 60 },
  AE: { base: 250, high: 320, rural: 120 },
  SA: { base: 240, high: 300, rural: 120 },
};

const FALLBACK = { base: 150, high: 250, rural: 80 };

export type WaterDemandTier = "rural_basic" | "urban_high" | "base";

export function resolveWaterDemand(
  market: string,
  tier: WaterDemandTier,
): WaterDemandResolution {
  const code = (market || "").trim().toUpperCase();
  const row = DEMAND_BY_MARKET[code];
  const fallbackValue =
    tier === "rural_basic"
      ? FALLBACK.rural
      : tier === "urban_high"
        ? FALLBACK.high
        : FALLBACK.base;
  if (!row) {
    return {
      litresPerPersonPerDay: fallbackValue,
      isMarketSpecific: false,
      configuredMarket: null,
    };
  }
  const value =
    tier === "rural_basic"
      ? row.rural
      : tier === "urban_high"
        ? row.high
        : row.base;
  return {
    litresPerPersonPerDay: value,
    isMarketSpecific: true,
    configuredMarket: code,
  };
}
