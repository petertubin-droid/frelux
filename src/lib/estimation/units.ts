/**
 * FRELUX Centralized Unit Conversion Layer
 *
 * EXACT conversion factors only - never approximations.
 * Every engine converts user input through this module; calculators must
 * not duplicate conversion constants.
 *
 * Area:  1 ft² = 0.09290304 m² (exact, by definition of the international foot)
 *        1 m² = 1 / 0.09290304 ft² = 10.763910416709722... ft²
 * Length: 1 ft = 0.3048 m (exact); 1 in = 0.0254 m (exact)
 */

export const M_PER_FT = 0.3048;
export const M_PER_IN = 0.0254;
export const M2_PER_FT2 = 0.09290304; // exact
export const FT2_PER_M2 = 1 / 0.09290304; // exact

export type AreaUnit = "m2" | "ft2";
export type LengthUnit = "m" | "ft" | "in" | "cm" | "mm";

export const AREA_UNITS: AreaUnit[] = ["m2", "ft2"];

export function isAreaUnit(u: string): u is AreaUnit {
  return u === "m2" || u === "ft2";
}

/** Convert an area between supported units. Returns null for incompatible units. */
export function convertArea(
  value: number,
  from: AreaUnit,
  to: AreaUnit,
): number | null {
  if (!Number.isFinite(value)) return null;
  if (from === to) return value;
  if (from === "ft2" && to === "m2") return value * M2_PER_FT2;
  if (from === "m2" && to === "ft2") return value * FT2_PER_M2;
  return null; // incompatible or unverified unit pair
}

/** Convert an area to m² (the engine's canonical unit). Null for invalid unit. */
export function areaToM2(value: number, from: string): number | null {
  if (!isAreaUnit(from)) return null;
  return convertArea(value, from, "m2");
}

/** Convert a length to metres. Null for invalid unit. */
export function lengthToM(value: number, from: LengthUnit): number | null {
  if (!Number.isFinite(value)) return null;
  switch (from) {
    case "m":
      return value;
    case "ft":
      return value * M_PER_FT;
    case "in":
      return value * M_PER_IN;
    case "cm":
      return value / 100;
    case "mm":
      return value / 1000;
    default:
      return null;
  }
}

// =========================================================
// Volume (added Wave 2.1 — imperial completeness sweep)
//
// 1 ft = 0.3048 m (exact), so 1 ft³ = 0.3048³ m³ = 0.028316846592 m³
// (exact). No approximation: the same constant is used everywhere.
// =========================================================

export type VolumeUnit = "m3" | "ft3" | "litres";

/** Exact: 1 ft³ = 0.028316846592 m³ (from 0.3048³). */
export const M3_PER_FT3 = 0.028316846592;
/** Exact: 1 m³ = 1000 L. */
export const L_PER_M3 = 1000;

export const VOLUME_UNITS: VolumeUnit[] = ["m3", "ft3", "litres"];

export function isVolumeUnit(u: string): u is VolumeUnit {
  return u === "m3" || u === "ft3" || u === "litres";
}

/** Convert a volume between supported units. Returns null for incompatible units. */
export function convertVolume(
  value: number,
  from: VolumeUnit,
  to: VolumeUnit,
): number | null {
  if (!Number.isFinite(value)) return null;
  if (from === to) return value;
  const valueM3 =
    from === "m3"
      ? value
      : from === "ft3"
        ? value * M3_PER_FT3
        : value / L_PER_M3;
  if (to === "m3") return valueM3;
  if (to === "ft3") return valueM3 / M3_PER_FT3;
  return valueM3 * L_PER_M3;
}

/** Convert a volume to m³ (the engine's canonical unit). Null for invalid unit. */
export function volumeToM3(value: number, from: string): number | null {
  if (!isVolumeUnit(from)) return null;
  return convertVolume(value, from, "m3");
}
