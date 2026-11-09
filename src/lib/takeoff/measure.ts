/**
 * Measurement kernel.
 *
 * One place for the arithmetic every takeoff shares: unit conversion, areas,
 * perimeter, opening deductions, waste and pack rounding. The calculators in
 * this codebase each reimplemented these rules, which is how they drifted.
 *
 * Rules encoded here, deliberately explicit:
 *   - dimensions convert to metres on the way in, so downstream maths is
 *     always SI and imperial input cannot leak a factor of 3.28 into a total
 *   - an opening is deducted once its area reaches the threshold, 0.5 m2 by
 *     default: every door and window is deducted, small penetrations such as a
 *     vent or a service hole are measured. A higher default would quietly leave
 *     the most common opening in a building in the wall it sits in.
 *   - waste applies to the net quantity and rounds up, never down
 *   - pack rounding ceil, because half a pack cannot be bought
 */

import type { LengthUnit, Opening, QuantityUnit } from "./types";

export const METRES_PER_UNIT: Record<LengthUnit, number> = {
  m: 1,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
};

/**
 * Openings at or above this area are deducted. 0.5 m2 clears a standard door
 * (0.9 x 2.1 = 1.89) and a small window while ignoring vents and service holes.
 */
export const DEFAULT_OPENING_DEDUCT_ABOVE_M2 = 0.5;

export const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const toMetres = (value: number, unit: LengthUnit = "m"): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return round(value * METRES_PER_UNIT[unit], 4);
};

export const areaM2 = (length: number, width: number): number =>
  round(Math.max(0, length) * Math.max(0, width), 4);

export const perimeterM = (length: number, width: number): number =>
  round(2 * (Math.max(0, length) + Math.max(0, width)), 4);

export const openingAreaM2 = (opening: Opening): number => {
  const width = toMetres(opening.width, opening.unit ?? "m");
  const height = toMetres(opening.height, opening.unit ?? "m");
  return areaM2(width, height);
};

export interface WallMeasure {
  length: number;
  height: number;
  grossArea: number;
  deductedArea: number;
  netArea: number;
  /** Total wall length, before skirting is interrupted by doors. */
  skirtingLength: number;
  /** Wall length left after every door and full height opening is removed. */
  netSkirtingLength: number;
  measuredOpenings: { id: string; area: number }[];
  deductedOpenings: {
    id: string;
    area: number;
    width: number;
    interruptsSkirting: boolean;
  }[];
  warning?: string;
}

/** A door is tall enough to break skirting; a window is not. */
export const SKIRTING_INTERRUPT_HEIGHT_M = 2;

export const interruptsSkirting = (opening: Opening): boolean => {
  if (opening.kind === "door" || opening.kind === "opening") return true;
  if (opening.kind === "window") return false;
  return (
    toMetres(opening.height, opening.unit ?? "m") >= SKIRTING_INTERRUPT_HEIGHT_M
  );
};

export function measureWall(
  wall: {
    length: number;
    height: number;
    unit?: LengthUnit;
    openings?: Opening[];
  },
  deductAbove: number = DEFAULT_OPENING_DEDUCT_ABOVE_M2,
): WallMeasure {
  const length = toMetres(wall.length, wall.unit ?? "m");
  const height = toMetres(wall.height, wall.unit ?? "m");
  const grossArea = areaM2(length, height);

  const measuredOpenings: { id: string; area: number }[] = [];
  const deductedOpenings: WallMeasure["deductedOpenings"] = [];
  let deducted = 0;
  let skirtingCut = 0;

  for (const opening of wall.openings ?? []) {
    const area = openingAreaM2(opening);
    if (area <= 0) continue;
    if (area >= (opening.deductAbove ?? deductAbove)) {
      const width = toMetres(opening.width, opening.unit ?? "m");
      const breaks = interruptsSkirting(opening);
      deductedOpenings.push({
        id: opening.id,
        area,
        width,
        interruptsSkirting: breaks,
      });
      deducted += area;
      if (breaks) skirtingCut += width;
    } else {
      measuredOpenings.push({ id: opening.id, area });
    }
  }

  // A deduction can never exceed the wall it sits in. This happens in real
  // schedules when a door is booked against the wrong wall.
  const capped = Math.min(deducted, grossArea);
  const netArea = round(Math.max(0, grossArea - capped), 4);

  return {
    length,
    height,
    grossArea,
    deductedArea: round(capped, 4),
    netArea,
    skirtingLength: length,
    // A wall cannot lose more skirting than it has, and a door wider than its
    // wall is a schedule error rather than a negative length.
    netSkirtingLength: round(Math.max(0, length - skirtingCut), 4),
    measuredOpenings,
    deductedOpenings,
    warning:
      deducted > grossArea + 1e-9
        ? `Openings deduct more than the wall area (${round(deducted, 2)} m2 against ${grossArea} m2); the deduction was capped.`
        : undefined,
  };
}

export const applyWaste = (netQuantity: number, wastePct: number): number => {
  const safeWaste = Number.isFinite(wastePct) && wastePct > 0 ? wastePct : 0;
  return round(Math.max(0, netQuantity) * (1 + safeWaste / 100), 4);
};

/** Rounds up to whole purchasable units: 4.03 packs of tile is 5 packs. */
export const roundUpToWhole = (quantity: number): number =>
  Math.max(0, Math.ceil(round(quantity, 4) - 1e-9));

export const packsRequired = (
  quantity: number,
  coveragePerPack: number,
): number => {
  if (!Number.isFinite(coveragePerPack) || coveragePerPack <= 0) return 0;
  return roundUpToWhole(quantity / coveragePerPack);
};

export interface QuantityTotal {
  unit: QuantityUnit;
  quantity: number;
}

export function sumByUnit(
  lines: { quantity: number; unit: QuantityUnit }[],
): QuantityTotal[] {
  const totals = new Map<QuantityUnit, number>();
  for (const line of lines) {
    totals.set(
      line.unit,
      round((totals.get(line.unit) ?? 0) + line.quantity, 4),
    );
  }
  return Array.from(totals.entries())
    .map(([unit, quantity]) => ({ unit, quantity }))
    .sort((a, b) => a.unit.localeCompare(b.unit));
}
