/**
 * Input units for calculators.
 *
 * Every engine works in metres and square metres. Visitors in the US, UK,
 * Canada, India and much of the Caribbean measure rooms in feet and inches,
 * so the entry layer converts once, at the edge, and never asks an engineer
 * to re-derive a metric figure. These helpers are the only place that
 * conversion happens for form input; engines stay canonical.
 */
import { UNIT_TO_M, SQFT_PER_SQM } from "@/lib/utils";
import type { Unit } from "@/types";

/** Units a length field can offer, most common first for the market. */
export function lengthUnitOptions(
  measurementSystem: "metric" | "imperial" | "mixed" | string = "metric",
): Unit[] {
  if (measurementSystem === "imperial") return ["feet", "inches", "meters"];
  if (measurementSystem === "mixed") return ["meters", "feet", "inches"];
  return ["meters", "centimeters", "millimeters", "feet"];
}

/** Default entry unit for a market, used when the visitor has not chosen. */
export function defaultLengthUnit(
  measurementSystem: "metric" | "imperial" | "mixed" | string = "metric",
): Unit {
  return measurementSystem === "imperial" ? "feet" : "meters";
}

/**
 * Convert a typed length to metres. Non-finite input answers 0 rather than
 * NaN, matching unitToMeters, so a half-typed field cannot poison a total.
 */
export function lengthToMetres(value: number, unit: Unit): number {
  const factor = UNIT_TO_M[unit];
  if (!Number.isFinite(value) || typeof factor !== "number") return 0;
  return value * factor;
}

/** Convert metres back into the unit the visitor is typing in. */
export function metresToLength(metres: number, unit: Unit): number {
  const factor = UNIT_TO_M[unit];
  if (!Number.isFinite(metres) || typeof factor !== "number" || factor === 0)
    return 0;
  return metres / factor;
}

/** Area entry unit: square feet or square metres. */
export type AreaInputUnit = "sqft" | "sqm";

/** Area units offered for a market, default first. */
export function areaUnitOptions(
  measurementSystem: "metric" | "imperial" | "mixed" | string = "metric",
): AreaInputUnit[] {
  return measurementSystem === "imperial" ? ["sqft", "sqm"] : ["sqm", "sqft"];
}

/** Default area entry unit for a market. */
export function defaultAreaUnit(
  measurementSystem: "metric" | "imperial" | "mixed" | string = "metric",
): AreaInputUnit {
  return measurementSystem === "imperial" ? "sqft" : "sqm";
}

/** Convert a typed area to square metres. */
export function areaToSquareMetres(value: number, unit: AreaInputUnit): number {
  if (!Number.isFinite(value)) return 0;
  return unit === "sqft" ? value / SQFT_PER_SQM : value;
}

/** Convert square metres back into the unit the visitor is typing in. */
export function squareMetresToArea(sqm: number, unit: AreaInputUnit): number {
  if (!Number.isFinite(sqm)) return 0;
  return unit === "sqft" ? sqm * SQFT_PER_SQM : sqm;
}

/** Short label for an input suffix: m, ft, in, m², sq ft. */
export function areaUnitLabel(unit: AreaInputUnit): string {
  return unit === "sqft" ? "sq ft" : "m²";
}
