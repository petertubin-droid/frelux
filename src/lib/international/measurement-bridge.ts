/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Measurement Bridge
 *
 * Bridges the existing measurement system (src/lib/measurement/units.ts)
 * with the market context. Provides unit preferences from the market
 * without modifying the existing measurement system.
 *
 * This is an ADAPTER — it wraps existing functionality, does not replace it.
 */

import type { ResolvedMarketContext, PreferredLengthUnit, PreferredAreaUnit } from '@/types/international';
import { toMeters, toSqMeters, fromMeters, fromSqMeters } from '@/lib/measurement/units';

// Re-export existing measurement utilities (no modifications)
export {
  toMeters,
  fromMeters,
  toSqMeters,
  fromSqMeters,
  sqftToSqm,
  sqmToSqft,
  getAllowedUnits,
  isInchesAllowed,
  lengthUnitLabel,
  lengthUnitShort,
  areaUnitLabel,
  tileDimensionToMeters,
  tileAreaM2,
} from '@/lib/measurement/units';

// ============================================================
// MARKET-AWARE MEASUREMENT HELPERS
// ============================================================

/**
 * Get the default units for a market context.
 * Returns { length, area } defaults.
 */
export function getMarketDefaults(market: ResolvedMarketContext): {
  length: PreferredLengthUnit;
  area: PreferredAreaUnit;
} {
  return {
    length: market.defaultLengthUnit,
    area: market.defaultAreaUnit,
  };
}

/**
 * Check if a length unit is supported by the market.
 */
export function isLengthUnitSupported(
  market: ResolvedMarketContext,
  unit: PreferredLengthUnit,
): boolean {
  return market.supportedLengthUnits.includes(unit);
}

/**
 * Check if an area unit is supported by the market.
 */
export function isAreaUnitSupported(
  market: ResolvedMarketContext,
  unit: PreferredAreaUnit,
): boolean {
  return market.supportedAreaUnits.includes(unit);
}

/**
 * Get a safe length unit for the market — falls back to default if unsupported.
 */
export function getSafeLengthUnit(
  market: ResolvedMarketContext,
  preferred: PreferredLengthUnit,
): PreferredLengthUnit {
  if (isLengthUnitSupported(market, preferred)) return preferred;
  return market.defaultLengthUnit;
}

/**
 * Get a safe area unit for the market — falls back to default if unsupported.
 */
export function getSafeAreaUnit(
  market: ResolvedMarketContext,
  preferred: PreferredAreaUnit,
): PreferredAreaUnit {
  if (isAreaUnitSupported(market, preferred)) return preferred;
  return market.defaultAreaUnit;
}

/**
 * Normalize a measurement value from the user's input unit to the
 * internal calculation unit (metres / square metres).
 * This wraps the existing toMeters / toSqMeters functions.
 */
export function normalizeLength(
  value: number,
  fromUnit: PreferredLengthUnit,
): number {
  // Re-use existing measurement system
  return toMeters(value, fromUnit);
}

export function normalizeArea(
  value: number,
  fromUnit: PreferredAreaUnit,
): number {
  return toSqMeters(value, fromUnit);
}

/**
 * Convert from the internal calculation unit back to the user's display unit.
 */
export function denormalizeLength(
  valueM: number,
  toUnit: PreferredLengthUnit,
): number {
  return fromMeters(valueM, toUnit);
}

export function denormalizeArea(
  valueSqm: number,
  toUnit: PreferredAreaUnit,
): number {
  return fromSqMeters(valueSqm, toUnit);
}
