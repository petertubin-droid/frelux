/**
 * Cement package mass by market, in kilograms.
 *
 * Kept in its own module so a quantity engine can resolve a bag mass without
 * pulling the whole masonry catalogue into its bundle.
 */
import { marketCodeVariants } from "@/lib/international/market-codes";

/**
 * Portland cement retail pack mass, because 50 kg, 25 kg, 40 kg and 94 lb bags
 * all exist and every bag count on a calculator is wrong if the pack size is
 * taken from another market.
 *
 * A missing market fell back to 50 kg silently, which overstated the bag count
 * for Germany, the Netherlands, Italy, Poland, Sweden, Switzerland and Japan
 * (25 kg), Korea and Indonesia (40 kg) and France (35 kg). Every market this
 * platform serves is now named explicitly, and an unknown market still falls
 * back to 50 kg for a regionally traded pack.
 */
export const CEMENT_BAG_KG: Record<string, number> = {
  // 50 kg bags
  NG: 50,
  GH: 50,
  KE: 50,
  TZ: 50,
  ET: 50,
  CI: 50,
  EG: 50,
  ZA: 50,
  ZM: 50,
  UG: 50,
  IN: 50,
  PK: 50,
  AE: 50,
  SA: 50,
  QA: 50,
  KW: 50,
  CN: 50,
  BR: 50,
  MX: 50,
  TR: 50,
  SG: 50,
  MY: 50,
  TH: 50,
  VN: 50,
  PH: 40,
  // 25 kg bags
  UK: 25,
  IE: 25,
  DE: 25,
  AT: 25,
  CH: 25,
  NL: 25,
  BE: 25,
  PL: 25,
  SE: 25,
  DK: 25,
  NO: 25,
  FI: 25,
  IT: 25,
  ES: 25,
  PT: 25,
  JP: 25,
  // Other pack sizes
  FR: 35,
  KR: 40,
  ID: 40,
  CA: 40,
  AU: 20,
  // Atlas Concrete, the NZ supplier recorded in market-packaging-verification,
  // lists 25 kg and 40 kg bagged cement. The 20 kg row here matched neither and
  // reported every NZ estimate against a pack no supplier was recorded selling.
  NZ: 40,
  // 94 lb published by QUIKRETE as 42.6 kg. 42.64 is the exact lb conversion,
  // but the packaging evidence check matches published sizes, so the published
  // figure is the honest one to carry.
  US: 42.6,
  GB: 25,
};

/**
 * Loose bulk density of ordinary Portland cement, kg per cubic metre.
 */
export const CEMENT_DENSITY_KG_M3 = 1440;

/**
 * Volume of one cement bag, m³, from its mass and the loose bulk density.
 *
 * Engines used to carry their own literal (0.0347 or 0.03472 m³ per 50 kg bag).
 * Deriving it here keeps one figure for the same physical bag: 50 kg is
 * 0.034722 m³, and a market bag scales with its mass.
 */
export function cementBagVolumeM3(bagKg: number): number {
  return bagKg / CEMENT_DENSITY_KG_M3;
}

export interface CementBagResolution {
  /** Resolved package mass used by the physical quantity calculation. */
  bagKg: number;
  /** Market code whose explicit configured row supplied the value, or null for fallback. */
  configuredMarket: string | null;
  /** False means the value is the generic 50 kg fallback, not a market-specific row. */
  isMarketSpecific: boolean;
}

export function resolveCementBag(market: string): CementBagResolution {
  for (const code of marketCodeVariants(market || "NG")) {
    const kg = CEMENT_BAG_KG[code];
    if (typeof kg === "number") {
      return { bagKg: kg, configuredMarket: code, isMarketSpecific: true };
    }
  }
  return { bagKg: 50, configuredMarket: null, isMarketSpecific: false };
}

/** Numeric compatibility API; use resolveCementBag when the fallback status matters. */
export function cementBagKg(market: string): number {
  return resolveCementBag(market).bagKg;
}
