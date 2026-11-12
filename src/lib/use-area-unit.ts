/**
 * Area and volume units for the calculators that price by surface or by bulk.
 *
 * Same rule as the length hook: the visitor reads and types in the unit they
 * asked for, and the engine always receives SI. Factors come from
 * AREA_TO_M2 and VOLUME_TO_L, so square feet and cubic feet are defined once.
 */
import { useCallback, useState } from "react";
import { AREA_TO_M2, VOLUME_TO_L } from "@/lib/convert/units";
import type { AreaUnit, VolumeUnit } from "@/lib/convert/units";

export type AreaChoice = Extract<AreaUnit, "m2" | "ft2">;
export type VolumeChoice = Extract<VolumeUnit, "m3" | "ft3">;

export interface AreaUnitController {
  unit: AreaChoice;
  setUnit: (unit: AreaChoice) => void;
  /** Convert a typed value to square metres. */
  toSqm: (value: string | number) => number;
  /** Convert square metres back into the visitor's unit, for display. */
  fromSqm: (sqm: number) => number;
  /** Short label for an input suffix: sq ft or m². */
  label: string;
}

export interface VolumeUnitController {
  unit: VolumeChoice;
  setUnit: (unit: VolumeChoice) => void;
  toM3: (value: string | number) => number;
  fromM3: (m3: number) => number;
  label: string;
}

function numeric(value: string | number): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function useAreaUnit(
  defaultUnit: AreaChoice = "ft2",
): AreaUnitController {
  const [unit, setUnit] = useState<AreaChoice>(defaultUnit);

  const toSqm = useCallback(
    (value: string | number) => {
      const n = numeric(value);
      return n === null ? 0 : n * AREA_TO_M2[unit];
    },
    [unit],
  );

  const fromSqm = useCallback(
    (sqm: number) => {
      if (!Number.isFinite(sqm)) return 0;
      return sqm / AREA_TO_M2[unit];
    },
    [unit],
  );

  return {
    unit,
    setUnit,
    toSqm,
    fromSqm,
    label: unit === "ft2" ? "sq ft" : "m²",
  };
}

export function useVolumeUnit(
  defaultUnit: VolumeChoice = "ft3",
): VolumeUnitController {
  const [unit, setUnit] = useState<VolumeChoice>(defaultUnit);

  const toM3 = useCallback(
    (value: string | number) => {
      const n = numeric(value);
      return n === null ? 0 : (n * VOLUME_TO_L[unit]) / 1000;
    },
    [unit],
  );

  const fromM3 = useCallback(
    (m3: number) => {
      if (!Number.isFinite(m3)) return 0;
      return (m3 * 1000) / VOLUME_TO_L[unit];
    },
    [unit],
  );

  return {
    unit,
    setUnit,
    toM3,
    fromM3,
    label: unit === "ft3" ? "cu ft" : "m³",
  };
}
