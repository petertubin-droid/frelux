/**
 * FRELUX International Electrical Engineering Profiles
 *
 * Distinct regional electrical system profiles for all 32 markets.
 * Replaces the universal conduit / metric assumption with modular market-specific rules.
 *
 * Since the Phase 2 one-file-market refactor (2026-10-27) this record is
 * COMPOSED from the per-market bundles in src/lib/international/markets/ -
 * authoring happens there, not here.
 *
 * Non-negotiable honesty rules:
 * - Quantities are material takeoffs, NOT certified electrical engineering designs.
 * - Missing prices remain unpriced; no silent price or method substitutions.
 */
import type { ElectricalMarketProfile } from "./engine-profile-types";
import { MARKET_BUNDLES } from "@/lib/international/markets";

export type { ElectricalMarketProfile };

export const ELECTRICAL_PROFILES: Record<string, ElectricalMarketProfile> =
  Object.fromEntries(
    Object.entries(MARKET_BUNDLES).map(([code, bundle]) => [
      code,
      bundle.electrical,
    ]),
  );

export function getElectricalProfile(
  marketCode: string,
): ElectricalMarketProfile {
  const upper = marketCode.toUpperCase();
  if (ELECTRICAL_PROFILES[upper]) {
    return ELECTRICAL_PROFILES[upper];
  }
  // Standard IEC fallback for markets outside the 32-market registry
  return {
    marketCode: upper,
    name: `${upper} Local Electrical Practice`,
    standardsRef: "Applicable National Electrical Code & IEC 60364",
    nominalVoltage: "230V 50Hz (IEC standard)",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Insulated copper conductors in concealed conduit / cable tray",
    lightingConductorSize: "1.5 mm² Cu",
    socketConductorSize: "2.5 mm² Cu",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush-mount wall boxes",
    protectionDevices: "RCD (30mA) + MCB protection",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary quantity estimation only. Consult a licensed local electrical professional for circuit design.",
  };
}
