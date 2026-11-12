/**
 * Load and pressure units for the structural and foundation calculators.
 *
 * Lengths and areas have been convertible for a long time, but the loads that
 * decide a footing were centimetre-only: a US or UK engineer with plf and ksf
 * had to convert by hand before the page would take the number. These factors
 * are exact (the pound and the foot are defined in SI terms), so a converted
 * load is the same load.
 *
 *   1 lb      = 4.448 221 615 260 5 N   (exact, international avoirdupois)
 *   1 kip     = 4 448.221 615 260 5 N   = 4.448 221 615 260 5 kN
 *   1 lb/ft   = 14.593 902 937 206 36 N/m  = 0.014 593 902 937 206 36 kN/m
 *   1 psf     = 47.880 258 977 5 Pa    = 0.047 880 258 977 5 kPa
 */

const N_PER_LB = 4.4482216152605;
const M_PER_FT = 0.3048;

/** lb/ft → kN/m */
export const KN_PER_M_PER_LB_PER_FT = N_PER_LB / M_PER_FT / 1000;
/** kip → kN (one kip is 1000 lb) */
export const KN_PER_KIP = (N_PER_LB * 1000) / 1000;
/** psf → kPa */
export const KPA_PER_PSF = N_PER_LB / (M_PER_FT * M_PER_FT) / 1000;

export type LoadUnitSystem = "metric" | "imperial";

export function lineLoadToKnPerM(value: number, system: LoadUnitSystem): number {
  return system === "imperial" ? value * KN_PER_M_PER_LB_PER_FT : value;
}

export function pointLoadToKn(value: number, system: LoadUnitSystem): number {
  return system === "imperial" ? value * KN_PER_KIP : value;
}

export function pressureToKpa(value: number, system: LoadUnitSystem): number {
  return system === "imperial" ? value * KPA_PER_PSF : value;
}

/** kPa → psf, for showing a result in the unit the input was given in. */
export function kpaToPsf(value: number): number {
  return value / KPA_PER_PSF;
}

export const LINE_LOAD_UNIT: Record<LoadUnitSystem, string> = {
  metric: "kN/m",
  imperial: "lb/ft",
};

export const POINT_LOAD_UNIT: Record<LoadUnitSystem, string> = {
  metric: "kN",
  imperial: "kip",
};

export const PRESSURE_UNIT: Record<LoadUnitSystem, string> = {
  metric: "kN/m²",
  imperial: "psf",
};

/** Format a pressure for display in the chosen system. */
export function formatPressure(kpa: number, system: LoadUnitSystem): string {
  return system === "imperial"
    ? `${Math.round(kpaToPsf(kpa))} psf`
    : `${Math.round(kpa * 10) / 10} kN/m²`;
}
