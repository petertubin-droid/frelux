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
import { unitToMeters } from "@/lib/utils";

export interface LengthUnit {
  /** The unit the visitor is typing in. */
  unit: Unit;
  setUnit: (unit: Unit) => void;
  /** Convert a typed value to metres for the engine. */
  toMetres: (value: string | number) => number;
  /** Convert a stated number of metres back into the visitor's unit. */
  fromMetres: (metres: number) => number;
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

  return { unit, setUnit, toMetres, fromMetres };
}
