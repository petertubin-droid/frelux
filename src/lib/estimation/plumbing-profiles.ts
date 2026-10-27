/**
 * FRELUX International Plumbing Engineering Profiles
 *
 * Distinct regional plumbing system profiles for all 32 markets.
 * Replaces universal assumptions with modular market-specific rules.
 *
 * Since the Phase 2 one-file-market refactor (2026-10-27) this record is
 * COMPOSED from the per-market bundles in src/lib/international/markets/ -
 * authoring happens there, not here.
 *
 * Non-negotiable honesty rules:
 * - Material quantity takeoff, NOT certified hydraulic/sanitary engineering designs.
 * - Missing prices remain unpriced; no silent price or method substitutions.
 */
import type { PlumbingMarketProfile } from "./engine-profile-types";
import { MARKET_BUNDLES } from "@/lib/international/markets";

export type { PlumbingMarketProfile };

export const PLUMBING_PROFILES: Record<string, PlumbingMarketProfile> =
  Object.fromEntries(
    Object.entries(MARKET_BUNDLES).map(([code, bundle]) => [
      code,
      bundle.plumbing,
    ]),
  );

export function getPlumbingProfile(marketCode: string): PlumbingMarketProfile {
  const upper = marketCode.toUpperCase();
  if (PLUMBING_PROFILES[upper]) {
    return PLUMBING_PROFILES[upper];
  }
  return {
    marketCode: upper,
    name: `${upper} Local Plumbing Practice`,
    standardsRef:
      "Applicable National Plumbing Standard & ISO 15874 / EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial: "PPR or Multi-layer PEX-Al-PEX pipe",
    drainageDwvMaterial: "uPVC or Polypropylene drainage pipe",
    typicalColdSupplyPipeSize: "20 mm / 25 mm OD pipe",
    typicalHotSupplyPipeSize: "20 mm / 25 mm OD insulated pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm OD waste pipe",
    typicalSoilDrainPipeSize: "110 mm OD soil pipe",
    drainageSlopeRule: "1:50 (2%) standard drainage slope",
    standardPipePurchasingLength: "3 m or 4 m lengths",
    notes:
      "Preliminary material takeoff only. Always verify local sanitary drainage codes and fixture unit loadings.",
  };
}
