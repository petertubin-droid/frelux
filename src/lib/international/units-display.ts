// =========================================================
// FRELUX International Unit Display
//
// Canonical storage stays METRIC everywhere (database, engines,
// stored estimates). This module is a DISPLAY layer only:
// it converts metric values to imperial for on-page text.
//
// Per-user preference lives in localStorage (per site policy),
// defaulting to metric. Dual formatting always shows both units,
// with the preferred system first - so numbers can never mislead.
// =========================================================

export type UnitSystem = "metric" | "imperial";

const STORAGE_KEY = "frelux_unit_system";

export const CONVERSIONS = {
  M2_TO_FT2: 10.7639104167097,
  M_TO_FT: 3.28083989501312,
  MM_TO_IN: 0.0393700787401575,
  KG_TO_LB: 2.20462262185,
  L_TO_GAL: 0.264172052358148,
} as const;

export function getStoredUnitSystem(): UnitSystem {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function setStoredUnitSystem(system: UnitSystem): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, system);
  } catch {
    // localStorage unavailable - preference simply isn't persisted
  }
}

function nf(value: number, maxDigits = 2): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: maxDigits,
  });
}

/** Format an area given in square metres for the given system. */
export function formatArea(sqMetres: number, system: UnitSystem): string {
  return system === "metric"
    ? `${nf(sqMetres)} m²`
    : `${nf(sqMetres * CONVERSIONS.M2_TO_FT2)} ft²`;
}

/** Format a length given in metres. */
export function formatLength(metres: number, system: UnitSystem): string {
  return system === "metric"
    ? `${nf(metres)} m`
    : `${nf(metres * CONVERSIONS.M_TO_FT)} ft`;
}

/** Format a short length given in millimetres. */
export function formatShortLength(mm: number, system: UnitSystem): string {
  return system === "metric"
    ? `${nf(mm)} mm`
    : `${nf(mm * CONVERSIONS.MM_TO_IN)} in`;
}

/** Format a weight given in kilograms. */
export function formatWeight(kg: number, system: UnitSystem): string {
  return system === "metric"
    ? `${nf(kg)} kg`
    : `${nf(kg * CONVERSIONS.KG_TO_LB)} lb`;
}

/** Format a volume given in litres. */
export function formatVolume(litres: number, system: UnitSystem): string {
  return system === "metric"
    ? `${nf(litres)} L`
    : `${nf(litres * CONVERSIONS.L_TO_GAL)} gal`;
}

/**
 * Dual display for result screens: preferred system first,
 * the other in parentheses. Independent of the toggle, both
 * numbers are always visible.
 */
export function formatAreaDual(sqMetres: number): string {
  const preferred = getStoredUnitSystem();
  const other: UnitSystem = preferred === "metric" ? "imperial" : "metric";
  return `${formatArea(sqMetres, preferred)} (${formatArea(sqMetres, other)})`;
}

export function formatLengthDual(metres: number): string {
  const preferred = getStoredUnitSystem();
  const other: UnitSystem = preferred === "metric" ? "imperial" : "metric";
  return `${formatLength(metres, preferred)} (${formatLength(metres, other)})`;
}
