/**
 * Building template to measured schedule.
 *
 * The finish calculators have taken a building template for a while, but only as
 * a single area, which is all paint, screed or tile need. Masonry, plastering,
 * foundation and structural work cannot be answered from one area: they need the
 * wall runs, the wall heights, the openings deducted and the floor of each room,
 * because quantities scale with those separately.
 *
 * So this module converts the same template rooms into a schedule the takeoff
 * engine already measures, and exposes the totals those calculators consume. It
 * performs no pricing and invents no dimension: every number is either entered by
 * the user, published by the template, or a stated standard opening size carried
 * as an assumption.
 */

import type { RoomUnitChoice, RoomDraft } from "./building-presets";
import { LENGTH_TO_M } from "@/lib/convert/units";
import type {
  LengthUnit,
  Opening,
  RoomInput,
  ScheduleInput,
} from "@/lib/takeoff/types";

/**
 * Standard opening sizes used when a template only says how many doors and
 * windows a room has. Both are the sizes the takeoff engine's own opening reader
 * assumes, so a hand-typed schedule and a template schedule agree.
 */
export const STANDARD_OPENING_M = {
  door: { width: 0.9, height: 2.1 },
  window: { width: 1.2, height: 1.5 },
} as const;

export interface ScheduleTotals {
  /** Sum of wall runs, before openings. */
  wallRunM: number;
  grossWallAreaM2: number;
  openingsAreaM2: number;
  netWallAreaM2: number;
  floorAreaM2: number;
  /** Sum of room perimeters, the usual basis for footings and wall plates. */
  perimeterM: number;
  roomCount: number;
  /** Distinct wall heights present, which decides whether one masonry run is exact. */
  wallHeights: number[];
  assumedOpeningCount: number;
  /**
   * Standard openings wider than any wall in their room, so they could not be
   * placed. They are counted, never deducted, and must be surfaced to the user.
   */
  unplacedOpeningCount: number;
}

const toMetres = (value: number, unit: RoomUnitChoice): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "feet" ? value * LENGTH_TO_M.ft : value;
};

const clean = (value: number, fallback = 1): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * One draft becomes as many rooms as its identical count, because a schedule is
 * per room: sharing one room across a count would quietly dilute the openings
 * that each copy actually has.
 */
export function draftsToSchedule(
  drafts: RoomDraft[],
  unit: RoomUnitChoice,
  options: { id?: string; label?: string } = {},
): ScheduleInput {
  const rooms: RoomInput[] = [];
  const unplaced: Opening[] = [];

  drafts.forEach((draft, draftIndex) => {
    const length = toMetres(draft.length, unit);
    const width = toMetres(draft.width, unit);
    const height = toMetres(draft.height, unit);
    const quantity = Math.max(1, Math.round(clean(draft.quantity)));
    const doors = Math.max(0, Math.round(Number(draft.doors) || 0));
    const windows = Math.max(0, Math.round(Number(draft.windows) || 0));

    for (let copy = 0; copy < quantity; copy += 1) {
      const id = `room-${draftIndex}-${copy}`;
      const suffix = quantity > 1 ? ` ${copy + 1}` : "";

      const openings: Opening[] = [];
      for (let door = 0; door < doors; door += 1) {
        openings.push({
          id: `${id}-door-${door}`,
          label: "Door",
          kind: "door",
          width: STANDARD_OPENING_M.door.width,
          height: STANDARD_OPENING_M.door.height,
          unit: "m",
        });
      }
      for (let window = 0; window < windows; window += 1) {
        openings.push({
          id: `${id}-window-${window}`,
          label: "Window",
          kind: "window",
          width: STANDARD_OPENING_M.window.width,
          height: STANDARD_OPENING_M.window.height,
          unit: "m",
        });
      }

      // Openings go on the first wall that can actually hold them. Putting every
      // door and window on wall 1 would let a wall's area cap swallow the rest,
      // and the deduction would then be smaller than the openings the user
      // entered.
      const wallSides: Array<{ side: string; length: number }> = [
        { side: "w1", length },
        { side: "w2", length },
        { side: "w3", length: width },
        { side: "w4", length: width },
      ];
      const placed: Record<string, Opening[]> = {
        w1: [],
        w2: [],
        w3: [],
        w4: [],
      };
      // Each wall can only give up its own face area, so placement tracks what is
      // left on a wall rather than dropping an opening a later wall could hold.
      // A room whose height has not been entered has no face area to compare
      // against yet, so placement falls back to the wall width alone. Otherwise
      // every opening would be reported as too large for its wall when the real
      // gap is the missing height.
      const spare = new Map(
        wallSides.map((side) => [
          side.side,
          height > 0 ? side.length * height : Number.POSITIVE_INFINITY,
        ]),
      );
      for (const opening of openings) {
        const area = opening.width * opening.height;
        const host = wallSides.find(
          (side) =>
            side.length + 1e-9 >= opening.width &&
            (spare.get(side.side) ?? 0) + 1e-9 >= area,
        );
        if (!host) {
          unplaced.push(opening);
          continue;
        }
        placed[host.side].push(opening);
        spare.set(host.side, (spare.get(host.side) ?? 0) - area);
      }
      rooms.push({
        id,
        label: `${draft.label}${suffix}`,
        // A room is four walls: two of its length, two of its width.
        walls: [
          {
            id: `${id}-w1`,
            label: "Wall 1",
            length,
            height,
            unit: "m" as LengthUnit,
            openings: placed.w1,
          },
          {
            id: `${id}-w2`,
            label: "Wall 2",
            length,
            height,
            unit: "m" as LengthUnit,
            openings: placed.w2,
          },
          {
            id: `${id}-w3`,
            label: "Wall 3",
            length: width,
            height,
            unit: "m" as LengthUnit,
            openings: placed.w3,
          },
          {
            id: `${id}-w4`,
            label: "Wall 4",
            length: width,
            height,
            unit: "m" as LengthUnit,
            openings: placed.w4,
          },
        ],
        floor: {
          id: `${id}-floor`,
          length,
          width,
          unit: "m" as LengthUnit,
        },
      });
    }
  });

  return {
    id: options.id ?? "building-template",
    label: options.label ?? "Building template",
    rooms,
    // Kept on the schedule so the totals can count what could not be placed
    // instead of the silence that used to follow a dropped opening.
    unplacedOpenings: unplaced,
  };
}

/**
 * Totals for the calculators that take an area or a run. Openings are counted
 * once per room copy, which is what makes an identical-room template exact
 * rather than approximate.
 */
export function scheduleTotals(schedule: ScheduleInput): ScheduleTotals {
  let wallRunM = 0;
  let grossWallAreaM2 = 0;
  let openingsAreaM2 = 0;
  let floorAreaM2 = 0;
  let perimeterM = 0;
  let assumedOpeningCount = 0;
  const unplacedOpeningCount = schedule.unplacedOpenings?.length ?? 0;
  const heights = new Set<number>();

  for (const room of schedule.rooms) {
    for (const wall of room.walls ?? []) {
      const length = Number(wall.length) || 0;
      const height = Number(wall.height) || 0;
      if (length <= 0) continue;
      wallRunM += length;
      grossWallAreaM2 += length * height;
      if (height > 0) heights.add(Number(height.toFixed(3)));

      const deduction = (wall.openings ?? []).reduce((total, opening) => {
        // Every opening this module creates is a standard size, not a measured
        // one, so it is reported as an assumption to the caller.
        assumedOpeningCount += 1;
        return total + (Number(opening.width) || 0) * (Number(opening.height) || 0);
      }, 0);
      // Never deduct more than the wall it sits in.
      openingsAreaM2 += Math.min(deduction, length * height);
    }

    if (room.floor) {
      const length = Number(room.floor.length) || 0;
      const width = Number(room.floor.width) || 0;
      floorAreaM2 += length * width;
      perimeterM += 2 * (length + width);
    }
  }

  return {
    wallRunM,
    grossWallAreaM2,
    openingsAreaM2,
    netWallAreaM2: Math.max(0, grossWallAreaM2 - openingsAreaM2),
    floorAreaM2,
    perimeterM,
    roomCount: schedule.rooms.length,
    wallHeights: [...heights].sort((a, b) => a - b),
    assumedOpeningCount,
    unplacedOpeningCount,
  };
}

/**
 * Walls grouped by height. A masonry run is a length times one height, so a
 * building whose rooms differ in height has to be measured per height rather than
 * averaged into a single run.
 */
export interface HeightGroup {
  heightM: number;
  wallRunM: number;
  openingsAreaM2: number;
  grossWallAreaM2: number;
}

export function groupWallsByHeight(schedule: ScheduleInput): HeightGroup[] {
  const groups = new Map<number, HeightGroup>();

  for (const room of schedule.rooms) {
    for (const wall of room.walls ?? []) {
      const length = Number(wall.length) || 0;
      const height = Number(wall.height) || 0;
      if (length <= 0 || height <= 0) continue;
      const key = Number(height.toFixed(3));
      const group =
        groups.get(key) ?? { heightM: key, wallRunM: 0, openingsAreaM2: 0, grossWallAreaM2: 0 };
      group.wallRunM += length;
      group.grossWallAreaM2 += length * height;
      const deduction = (wall.openings ?? []).reduce(
        (total, opening) =>
          total + (Number(opening.width) || 0) * (Number(opening.height) || 0),
        0,
      );
      group.openingsAreaM2 += Math.min(deduction, length * height);
      groups.set(key, group);
    }
  }

  return [...groups.values()].sort((a, b) => a.heightM - b.heightM);
}

/**
 * A building the user has sized, ready for any tool to measure.
 *
 * The drafts travel with it so the editor can reopen on the same rooms instead
 * of starting over, which is what makes one shared building usable across tools.
 */
export interface AppliedBuilding {
  schedule: ScheduleInput;
  totals: ScheduleTotals;
  label: string;
  unit: RoomUnitChoice;
  drafts: RoomDraft[];
}

/** The measured area a finish tool needs, from the shared building. */
export function buildingAreaM2(
  building: AppliedBuilding | null,
  surface: "wall" | "floor",
): number {
  if (!building) return 0;
  return surface === "wall" ? building.totals.netWallAreaM2 : building.totals.floorAreaM2;
}

/**
 * The footprint of a building whose schedule is a single room.
 *
 * Only a one-room schedule has an unambiguous length and width: a building of
 * several rooms shares walls, and the room schedule records no positions, so any
 * overall length or width derived from it would be a guess. Returns the reason
 * when it cannot answer, so a caller can say why instead of filling a blank.
 */
export function singleRoomFootprint(
  building: AppliedBuilding | null,
): { lengthM: number; widthM: number } | { reason: string } {
  if (!building) {
    return {
      reason:
        "No measured building saved yet. Size a building in the building panel first.",
    };
  }
  if (building.drafts.length !== 1) {
    return {
      reason: `The measured building has ${building.drafts.length} rooms. A multi-room schedule records no room positions, so an overall footprint cannot be read from it without guessing. Enter the overall length and width.`,
    };
  }
  const room = building.drafts[0];
  const perUnit = building.unit === "feet" ? 0.3048 : 1;
  if (room.length <= 0 || room.width <= 0) {
    return {
      reason:
        "The measured room has no length or width. Complete the room dimensions before reading a footprint.",
    };
  }
  return {
    lengthM: room.length * perUnit,
    widthM: room.width * perUnit,
  };
}
