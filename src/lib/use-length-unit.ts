/**
 * One length unit per calculator page, feet first.
 *
 * The owner rule is that a customer reads and types feet unless they ask for
 * metric, so a page keeps the visitor's chosen unit in state and converts to
 * metres only at the point the engine is called. The factor comes from
 * UNIT_TO_M, which is the single SI table, so no page writes 0.3048 by hand.
 */
import { useCallback, useState } from "react";
import type { Unit } from "@/types";
import { SQFT_PER_SQM, unitShortLabel, unitToMeters } from "@/lib/utils";
import { useMarket } from "@/lib/international/market-context";

export interface LengthUnit {
  /** The unit the visitor is typing in. */
  unit: Unit;
  setUnit: (unit: Unit) => void;
  /** Convert a typed value to metres for the engine. */
  toMetres: (value: string | number) => number;
  /** Convert a stated number of metres back into the visitor's unit. */
  fromMetres: (metres: number) => number;
  /** Short suffix for an input label: ft, m, in, cm, mm. */
  label: string;
}

export function useLengthUnit(defaultUnit: Unit = "feet"): LengthUnit {
  const [unit, setUnit] = useState<Unit>(defaultUnit);

  const toMetres = useCallback(
    (value: string | number) => {
      if (value === "" || value === null || value === undefined) return 0;
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numeric)) return 0;
      return unitToMeters(numeric, unit);
    },
    [unit],
  );

  const fromMetres = useCallback(
    (metres: number) => {
      if (!Number.isFinite(metres)) return 0;
      const perUnit = unitToMeters(1, unit);
      return perUnit > 0 ? metres / perUnit : 0;
    },
    [unit],
  );

  return { unit, setUnit, toMetres, fromMetres, label: unitShortLabel(unit) };
}

// ─────────────────────────────────────────────────────────
// Area: the companion to the length unit, for floor and wall areas
// ─────────────────────────────────────────────────────────

/** Area entry unit: square feet or square metres. */
export type AreaInputUnit = "sqft" | "sqm";

/** Convert a typed area to square metres (canonical). */
export function areaToSquareMetres(value: number, unit: AreaInputUnit): number {
  if (!Number.isFinite(value)) return 0;
  return unit === "sqft" ? value / SQFT_PER_SQM : value;
}

/** Convert square metres back into the visitor's area unit. */
export function squareMetresToArea(sqm: number, unit: AreaInputUnit): number {
  if (!Number.isFinite(sqm)) return 0;
  return unit === "sqft" ? sqm * SQFT_PER_SQM : sqm;
}

/** Suffix for an area field or result: sq ft or m². */
export function areaUnitLabel(unit: AreaInputUnit): string {
  return unit === "sqft" ? "sq ft" : "m²";
}

export interface AreaUnit {
  /** The area unit the visitor is typing and reading in. */
  unit: AreaInputUnit;
  setUnit: (unit: AreaInputUnit) => void;
  /** Convert a typed area to square metres for the engine. */
  toSqm: (value: string | number) => number;
  /** Convert a stated number of square metres into the visitor's unit. */
  fromSqm: (sqm: number) => number;
  /** Short suffix for an input or result: sq ft, m². */
  label: string;
}

/**
 * One area unit per calculator page, square feet first, matching the length
 * hook so a page never mixes a feet dimension with a square metre area.
 */
export function useAreaUnit(defaultUnit: AreaInputUnit = "sqft"): AreaUnit {
  const [unit, setUnit] = useState<AreaInputUnit>(defaultUnit);

  const toSqm = useCallback(
    (value: string | number) => {
      if (value === "" || value === null || value === undefined) return 0;
      const numeric = typeof value === "number" ? value : Number(value);
      return areaToSquareMetres(numeric, unit);
    },
    [unit],
  );

  const fromSqm = useCallback(
    (sqm: number) => squareMetresToArea(sqm, unit),
    [unit],
  );

  return { unit, setUnit, toSqm, fromSqm, label: areaUnitLabel(unit) };
}

/**
 * The area unit the active market reads in, so a page shows square feet to a
 * US or UK visitor and square metres everywhere else without asking.
 */
export function useMarketAreaUnit(): AreaInputUnit {
  const { preferredAreaUnit } = useMarket();
  return preferredAreaUnit === "sqft" ? "sqft" : "sqm";
}
