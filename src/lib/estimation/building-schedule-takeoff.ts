/**
 * Building template feeds for the masonry and plastering engines.
 *
 * Both engines already measure correctly; what they lacked was a building to
 * measure. This module converts a template schedule into their inputs without
 * re-deriving any of their arithmetic.
 *
 * Two rules decide the shape:
 *
 * 1. Masonry is a length multiplied by one height, so a building whose rooms
 *    differ in height is measured once per height and the results added. Averaging
 *    the heights into a single run would be faster and wrong.
 * 2. Plastering takes an area, so it is handed the net wall area of the whole
 *    building, with the openings already deducted by the schedule, times the
 *    number of faces being plastered.
 */

import {
  calculateMasonryTakeoff,
  type MasonryCalculationInput,
  type MasonryCalculationResult,
} from "./masonry-standalone-engine";
import {
  calculatePlasteringTakeoff,
  type PlasteringCalculationInput,
  type PlasteringCalculationResult,
} from "./plastering-standalone-engine";
import { groupWallsByHeight, scheduleTotals } from "@/lib/measurement/building-schedule";
import type { ScheduleInput } from "@/lib/takeoff/types";

/** Everything the caller chooses about the masonry itself. */
export type MasonryBuildingConfig = Omit<
  MasonryCalculationInput,
  "wallLengthM" | "wallHeightM" | "wallCount" | "openings"
>;

export interface MasonryBuildingResult {
  result: MasonryCalculationResult;
  /** How many height runs were measured. More than one means separate rounding. */
  heightRuns: number;
  /** True when the building was measured in one run, so rounding is single. */
  singleRun: boolean;
  notes: string[];
}

const SUM_FIELDS = [
  "grossWallAreaM2",
  "openingsAreaM2",
  "netWallAreaM2",
  "unitsRequiredNet",
  "unitsRequiredGross",
  "mortarVolumeM3Net",
  "mortarVolumeM3Gross",
  "cementBagsRequired",
  "sandVolumeM3",
  "sandWeightTonnes",
  "waterLiters",
] as const;

/**
 * Aggregate openings for one height group, keeping their real sizes. The engine
 * multiplies width by height by quantity, so identical openings collapse into one
 * row with a count instead of being listed one by one.
 */
function openingsForGroup(
  schedule: ScheduleInput,
  heightM: number,
): NonNullable<MasonryCalculationInput["openings"]> {
  const counts = new Map<
    string,
    { id: string; description: string; widthM: number; heightM: number; quantity: number }
  >();

  for (const room of schedule.rooms) {
    for (const wall of room.walls ?? []) {
      if (Math.abs((Number(wall.height) || 0) - heightM) > 1e-9) continue;
      for (const opening of wall.openings ?? []) {
        const widthM = Number(opening.width) || 0;
        const openingHeightM = Number(opening.height) || 0;
        if (widthM <= 0 || openingHeightM <= 0) continue;
        const key = `${widthM}x${openingHeightM}`;
        const row =
          counts.get(key) ?? {
            id: `opening-${key}`,
            description: opening.label ?? "Opening",
            widthM,
            heightM: openingHeightM,
            quantity: 0,
          };
        row.quantity += 1;
        counts.set(key, row);
      }
    }
  }

  return [...counts.values()];
}

export function masonryTakeoffFromSchedule(
  schedule: ScheduleInput,
  config: MasonryBuildingConfig,
): MasonryBuildingResult {
  const groups = groupWallsByHeight(schedule);

  if (groups.length === 0) {
    const empty = calculateMasonryTakeoff({
      ...config,
      wallLengthM: 0,
      wallHeightM: 0,
      wallCount: 1,
    });
    return {
      result: empty,
      heightRuns: 0,
      singleRun: false,
      notes: ["No wall with both a length and a height was found, so nothing was measured."],
    };
  }

  const results = groups.map((group) =>
    calculateMasonryTakeoff({
      ...config,
      wallLengthM: group.wallRunM,
      wallHeightM: group.heightM,
      wallCount: 1,
      openings: openingsForGroup(schedule, group.heightM),
    }),
  );

  const totals = results.reduce(
    (acc, result) => {
      for (const field of SUM_FIELDS) acc[field] += Number(result[field]) || 0;
      acc.estimatedLaborHours.masonHours += result.estimatedLaborHours.masonHours;
      acc.estimatedLaborHours.helperHours += result.estimatedLaborHours.helperHours;
      return acc;
    },
    {
      grossWallAreaM2: 0,
      openingsAreaM2: 0,
      netWallAreaM2: 0,
      unitsRequiredNet: 0,
      unitsRequiredGross: 0,
      mortarVolumeM3Net: 0,
      mortarVolumeM3Gross: 0,
      cementBagsRequired: 0,
      sandVolumeM3: 0,
      sandWeightTonnes: 0,
      waterLiters: 0,
      estimatedLaborHours: { masonHours: 0, helperHours: 0 },
    },
  );

  const first = results[0];
  const notes: string[] = [];
  if (groups.length > 1) {
    notes.push(
      `Measured as ${groups.length} height runs (${groups
        .map((group) => `${group.heightM} m`)
        .join(", ")}). Units and bags are rounded up per run, so a single-run total may be one unit per run lower.`,
    );
  }

  return {
    result: {
      ...first,
      ...totals,
    },
    heightRuns: groups.length,
    singleRun: groups.length === 1,
    notes,
  };
}

export interface PlasteringBuildingResult {
  result: PlasteringCalculationResult;
  /** Net wall area handed to the engine, after openings and faces. */
  measuredAreaM2: number;
  faces: 1 | 2;
}

/**
 * @param faces 1 for an external render, 2 for both faces of an internal wall.
 */
export function plasteringTakeoffFromSchedule(
  schedule: ScheduleInput,
  config: Omit<PlasteringCalculationInput, "surfaceAreaM2" | "wallLengthM" | "wallHeightM" | "wallCount">,
  faces: 1 | 2 = 2,
): PlasteringBuildingResult {
  const totals = scheduleTotals(schedule);
  const measuredAreaM2 = totals.netWallAreaM2 * faces;

  const result = calculatePlasteringTakeoff({
    ...config,
    surfaceAreaM2: measuredAreaM2,
  });

  return { result, measuredAreaM2, faces };
}
