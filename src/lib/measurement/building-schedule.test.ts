import { describe, expect, it } from "vitest";
import {
  STANDARD_OPENING_M,
  draftsToSchedule,
  groupWallsByHeight,
  scheduleTotals,
} from "./building-schedule";
import type { RoomDraft } from "./building-presets";
import { runTakeoff } from "@/lib/takeoff/engine";

const draft = (over: Partial<RoomDraft> = {}): RoomDraft => ({
  id: "d1",
  spaceType: "bedroom",
  label: "Bedroom",
  length: 4,
  width: 3,
  height: 2.7,
  quantity: 1,
  doors: 1,
  windows: 1,
  ...over,
});

describe("a template room becomes a measured schedule", () => {
  it("gives each room four walls, two of length and two of width", () => {
    const schedule = draftsToSchedule([draft()], "meters");
    const room = schedule.rooms[0];
    expect(room.walls?.map((wall) => wall.length)).toEqual([4, 4, 3, 3]);
    expect(room.walls?.every((wall) => wall.height === 2.7)).toBe(true);
    expect(room.floor).toMatchObject({ length: 4, width: 3 });
  });

  it("expands identical rooms into separate rooms rather than multiplying one", () => {
    const schedule = draftsToSchedule([draft({ quantity: 3 })], "meters");
    expect(schedule.rooms).toHaveLength(3);
    expect(schedule.rooms.map((room) => room.label)).toEqual([
      "Bedroom 1",
      "Bedroom 2",
      "Bedroom 3",
    ]);
    expect(new Set(schedule.rooms.map((room) => room.id)).size).toBe(3);
  });

  it("puts the openings on one wall of each room, once per copy", () => {
    const schedule = draftsToSchedule([draft({ quantity: 2, doors: 2, windows: 1 })], "meters");
    const first = schedule.rooms[0].walls?.[0].openings ?? [];
    expect(first).toHaveLength(3);
    expect(first.filter((opening) => opening.kind === "door")).toHaveLength(2);
    expect(first.filter((opening) => opening.kind === "window")).toHaveLength(1);
    // Every copy carries its own openings, not a shared set.
    expect(schedule.rooms[1].walls?.[0].openings).toHaveLength(3);
  });

  it("uses the standard door and window sizes the engine documents", () => {
    const schedule = draftsToSchedule([draft()], "meters");
    const openings = schedule.rooms[0].walls?.[0].openings ?? [];
    expect(openings[0]).toMatchObject({ width: STANDARD_OPENING_M.door.width, height: STANDARD_OPENING_M.door.height });
    expect(openings[1]).toMatchObject({ width: STANDARD_OPENING_M.window.width, height: STANDARD_OPENING_M.window.height });
  });

  it("converts feet to metres on the way in", () => {
    const schedule = draftsToSchedule([draft({ length: 10, width: 10, height: 9 })], "feet");
    const room = schedule.rooms[0];
    expect(room.walls?.[0].length).toBeCloseTo(3.048, 3);
    expect(room.walls?.[0].height).toBeCloseTo(2.7432, 3);
    expect(room.floor?.length).toBeCloseTo(3.048, 3);
  });

  it("refuses a measurement it cannot measure instead of emitting zeros", () => {
    const schedule = draftsToSchedule(
      [draft({ length: 0, width: 0, height: 0, doors: 0, windows: 0 })],
      "meters",
    );
    const room = schedule.rooms[0];
    expect(room.walls?.every((wall) => wall.length === 0)).toBe(true);
    const result = runTakeoff(schedule, { scopes: ["blockwork"] });
    expect(result.lines).toHaveLength(0);
  });

  it("treats a fractional identical count as at least one room", () => {
    expect(draftsToSchedule([draft({ quantity: 0 })], "meters").rooms).toHaveLength(1);
    expect(draftsToSchedule([draft({ quantity: 2.4 })], "meters").rooms).toHaveLength(2);
  });
});

describe("opening placement", () => {
  const room = (overrides: Partial<RoomDraft> = {}): RoomDraft => ({
    id: "r1",
    spaceType: "bedroom",
    label: "Bedroom",
    length: 4,
    width: 3.5,
    height: 2.7,
    quantity: 1,
    doors: 0,
    windows: 0,
    ...overrides,
  });

  it("deducts every opening it places, even when one wall is crowded", () => {
    const schedule = draftsToSchedule([room({ doors: 3, windows: 3 })], "meters");
    const totals = scheduleTotals(schedule);
    // 2 x (4 + 3.5) x 2.7 = 40.5 m2 of wall; 3 doors at 1.89 and 3 windows at
    // 1.8 give 11.07 m2 of openings. Wall 1 holds only 10.8 m2, so a
    // first-wall-only placement would quietly lose 0.27 m2 of deduction.
    expect(totals.grossWallAreaM2).toBeCloseTo(40.5, 6);
    expect(totals.openingsAreaM2).toBeCloseTo(11.07, 6);
    expect(totals.netWallAreaM2).toBeCloseTo(29.43, 6);
    expect(totals.unplacedOpeningCount).toBe(0);
  });

  it("never deducts more than a wall's own face", () => {
    const schedule = draftsToSchedule([room({ doors: 3, windows: 3 })], "meters");
    for (const placedRoom of schedule.rooms) {
      for (const wall of placedRoom.walls ?? []) {
        const face = Number(wall.length) * Number(wall.height);
        const deducted = (wall.openings ?? []).reduce(
          (total, opening) => total + opening.width * opening.height,
          0,
        );
        expect(deducted).toBeLessThanOrEqual(face + 1e-9);
      }
    }
  });

  it("reports an opening too wide for any wall instead of dropping it", () => {
    // A 0.8 by 0.5 m store cannot hold a 1.2 m window on any of its walls.
    const schedule = draftsToSchedule(
      [room({ length: 0.8, width: 0.5, doors: 0, windows: 1 })],
      "meters",
    );
    const totals = scheduleTotals(schedule);
    expect(totals.grossWallAreaM2).toBeCloseTo(2 * (0.8 + 0.5) * 2.7, 6);
    expect(totals.unplacedOpeningCount).toBe(1);
    expect(totals.openingsAreaM2).toBe(0);
    expect(totals.netWallAreaM2).toBeCloseTo(totals.grossWallAreaM2, 6);
  });

  it("counts openings once per copy of an identical room", () => {
    const schedule = draftsToSchedule(
      [room({ doors: 1, windows: 1, quantity: 3 })],
      "meters",
    );
    const totals = scheduleTotals(schedule);
    expect(totals.roomCount).toBe(3);
    expect(totals.openingsAreaM2).toBeCloseTo(3 * (1.89 + 1.8), 6);
    expect(totals.assumedOpeningCount).toBe(6);
  });
});

describe("totals the area calculators consume", () => {
  const schedule = draftsToSchedule(
    [
      draft({ label: "Bedroom", length: 4, width: 3, height: 2.7, quantity: 2, doors: 1, windows: 1 }),
      draft({ id: "d2", label: "Sitting", length: 5, width: 4, height: 3.0, doors: 1, windows: 2 }),
    ],
    "meters",
  );
  const totals = scheduleTotals(schedule);

  it("counts the wall run of every room copy", () => {
    // Two bedrooms at 2 x (4 + 3) and one sitting room at 2 x (5 + 4).
    expect(totals.wallRunM).toBeCloseTo(2 * 14 + 18, 3);
    expect(totals.roomCount).toBe(3);
  });

  it("measures gross wall area from each room's own height", () => {
    // Bedrooms 14 x 2.7 each, sitting 18 x 3.0.
    expect(totals.grossWallAreaM2).toBeCloseTo(2 * 14 * 2.7 + 18 * 3, 3);
  });

  it("deducts the openings of every copy", () => {
    const perBedroom =
      STANDARD_OPENING_M.door.width * STANDARD_OPENING_M.door.height +
      STANDARD_OPENING_M.window.width * STANDARD_OPENING_M.window.height;
    const sitting =
      STANDARD_OPENING_M.door.width * STANDARD_OPENING_M.door.height +
      2 * STANDARD_OPENING_M.window.width * STANDARD_OPENING_M.window.height;
    expect(totals.openingsAreaM2).toBeCloseTo(2 * perBedroom + sitting, 3);
    expect(totals.netWallAreaM2).toBeCloseTo(totals.grossWallAreaM2 - totals.openingsAreaM2, 3);
  });

  it("measures floor area and perimeter for foundation work", () => {
    expect(totals.floorAreaM2).toBeCloseTo(2 * 12 + 20, 3);
    expect(totals.perimeterM).toBeCloseTo(2 * 14 + 18, 3);
  });

  it("reports which heights are present so a masonry run can be measured exactly", () => {
    expect(totals.wallHeights).toEqual([2.7, 3]);
    expect(totals.assumedOpeningCount).toBe(7);
  });

  it("never deducts more opening area than the wall contains", () => {
    const tiny = draftsToSchedule(
      [draft({ length: 0.5, width: 0.5, height: 2.7, doors: 4, windows: 4 })],
      "meters",
    );
    const t = scheduleTotals(tiny);
    expect(t.openingsAreaM2).toBeLessThanOrEqual(t.grossWallAreaM2);
    expect(t.netWallAreaM2).toBeGreaterThanOrEqual(0);
  });
});

describe("height grouping", () => {
  it("splits one building into one run per wall height", () => {
    const schedule = draftsToSchedule(
      [
        draft({ length: 4, width: 3, height: 2.7, quantity: 2 }),
        draft({ id: "d2", length: 5, width: 4, height: 3.0 }),
      ],
      "meters",
    );
    const groups = groupWallsByHeight(schedule);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ heightM: 2.7, wallRunM: 28 });
    expect(groups[1]).toMatchObject({ heightM: 3, wallRunM: 18 });
    // The groups must add back up to the whole building.
    const totals = scheduleTotals(schedule);
    expect(groups.reduce((sum, g) => sum + g.grossWallAreaM2, 0)).toBeCloseTo(
      totals.grossWallAreaM2,
      6,
    );
  });

  it("returns nothing for a schedule with no walls", () => {
    expect(groupWallsByHeight({ id: "x", rooms: [{ id: "r" }] })).toEqual([]);
  });
});
