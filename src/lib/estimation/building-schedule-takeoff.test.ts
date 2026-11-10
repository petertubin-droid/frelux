/**
 * The building feeds must agree with the engines they call, room for room.
 *
 * Each assertion is chosen so a wrong answer is visible: mixed heights that would
 * hide inside an average, openings that would be deducted once instead of per
 * room, and a plaster area that would ignore faces.
 */
import { describe, expect, it } from "vitest";
import {
  masonryTakeoffFromSchedule,
  plasteringTakeoffFromSchedule,
} from "./building-schedule-takeoff";
import {
  calculateMasonryTakeoff,
  defaultLeafCountFor,
} from "./masonry-standalone-engine";
import { draftsToSchedule } from "@/lib/measurement/building-schedule";
import type { RoomDraft } from "@/lib/measurement/building-presets";

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

describe("masonry from a building template", () => {
  it("matches the engine exactly for a single-height building", () => {
    const schedule = draftsToSchedule([draft()], "meters");
    const viaSchedule = masonryTakeoffFromSchedule(schedule, { marketCode: "NG" });

    // The same building entered by hand: 14 m run at 2.7 m, one door, one window.
    const byHand = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 14,
      wallHeightM: 2.7,
      wallCount: 1,
      openings: [
        { id: "d", description: "Door", widthM: 0.9, heightM: 2.1, quantity: 1 },
        { id: "w", description: "Window", widthM: 1.2, heightM: 1.5, quantity: 1 },
      ],
    });

    expect(viaSchedule.singleRun).toBe(true);
    expect(viaSchedule.result.netWallAreaM2).toBeCloseTo(byHand.netWallAreaM2, 6);
    expect(viaSchedule.result.unitsRequiredGross).toBe(byHand.unitsRequiredGross);
    expect(viaSchedule.result.mortarVolumeM3Gross).toBeCloseTo(byHand.mortarVolumeM3Gross, 6);
    expect(viaSchedule.result.cementBagsRequired).toBe(byHand.cementBagsRequired);
    expect(viaSchedule.notes).toEqual([]);
  });

  it("deducts openings once per identical room", () => {
    const one = masonryTakeoffFromSchedule(
      draftsToSchedule([draft({ quantity: 1 })], "meters"),
      { marketCode: "NG" },
    );
    const three = masonryTakeoffFromSchedule(
      draftsToSchedule([draft({ quantity: 3 })], "meters"),
      { marketCode: "NG" },
    );
    expect(three.result.grossWallAreaM2).toBeCloseTo(one.result.grossWallAreaM2 * 3, 6);
    expect(three.result.openingsAreaM2).toBeCloseTo(one.result.openingsAreaM2 * 3, 6);
    expect(three.result.netWallAreaM2).toBeCloseTo(one.result.netWallAreaM2 * 3, 6);
    // Units are rounded per call, so a three-room total may sit one unit per room
    // away from three times the single-room figure. The area is the exact link.
    expect(three.result.unitsRequiredNet).toBeGreaterThanOrEqual(one.result.unitsRequiredNet * 3 - 3);
    expect(three.result.unitsRequiredNet).toBeLessThanOrEqual(one.result.unitsRequiredNet * 3 + 3);
  });

  it("measures a mixed-height building per height instead of averaging", () => {
    const schedule = draftsToSchedule(
      [
        draft({ height: 2.7, doors: 1, windows: 1 }),
        draft({ id: "d2", label: "Sitting", length: 5, width: 4, height: 3, doors: 1, windows: 2 }),
      ],
      "meters",
    );
    const combined = masonryTakeoffFromSchedule(schedule, { marketCode: "NG" });

    const low = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 14,
      wallHeightM: 2.7,
      wallCount: 1,
      openings: [
        { id: "d", description: "Door", widthM: 0.9, heightM: 2.1, quantity: 1 },
        { id: "w", description: "Window", widthM: 1.2, heightM: 1.5, quantity: 1 },
      ],
    });
    const high = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 18,
      wallHeightM: 3,
      wallCount: 1,
      openings: [
        { id: "d2", description: "Door", widthM: 0.9, heightM: 2.1, quantity: 1 },
        { id: "w2", description: "Window", widthM: 1.2, heightM: 1.5, quantity: 2 },
      ],
    });

    expect(combined.heightRuns).toBe(2);
    expect(combined.singleRun).toBe(false);
    expect(combined.result.grossWallAreaM2).toBeCloseTo(
      low.grossWallAreaM2 + high.grossWallAreaM2,
      6,
    );
    expect(combined.result.unitsRequiredNet).toBeCloseTo(
      low.unitsRequiredNet + high.unitsRequiredNet,
      6,
    );
    // Averaging the two heights would have produced a smaller gross area.
    const averaged = calculateMasonryTakeoff({
      marketCode: "NG",
      wallLengthM: 32,
      wallHeightM: 2.85,
      wallCount: 1,
    });
    expect(combined.result.grossWallAreaM2).not.toBeCloseTo(averaged.grossWallAreaM2, 2);
  });

  it("says so when a multi-height total carries per-run rounding", () => {
    const schedule = draftsToSchedule(
      [draft({ height: 2.7 }), draft({ id: "d2", height: 3 })],
      "meters",
    );
    const combined = masonryTakeoffFromSchedule(schedule, { marketCode: "NG" });
    expect(combined.notes.join(" ")).toMatch(/rounded up per run/i);
  });

  it("measures nothing, and says so, for a template with no dimensions", () => {
    const schedule = draftsToSchedule(
      [draft({ length: 0, width: 0, height: 0, doors: 0, windows: 0 })],
      "meters",
    );
    const empty = masonryTakeoffFromSchedule(schedule, { marketCode: "NG" });
    expect(empty.heightRuns).toBe(0);
    expect(empty.result.netWallAreaM2).toBe(0);
    expect(empty.result.unitsRequiredGross).toBe(0);
    expect(empty.notes.join(" ")).toMatch(/nothing was measured/i);
  });

  it("forwards the leaf count the market builds with", () => {
    const schedule = draftsToSchedule([draft()], "meters");
    const single = masonryTakeoffFromSchedule(schedule, { marketCode: "GB" });
    const cavity = masonryTakeoffFromSchedule(schedule, {
      marketCode: "GB",
      leafCount: defaultLeafCountFor("GB"),
    });
    // The engine does not guess leaf count from the market code, so the caller
    // supplies it; this feed must pass it through untouched.
    expect(defaultLeafCountFor("GB")).toBe(2);
    expect(cavity.result.leafCount).toBe(2);
    // Two leaves cover the same face twice, so the unit count roughly doubles;
    // both figures are rounded, so the comparison is on area, not on count.
    expect(cavity.result.netWallAreaM2).toBeCloseTo(single.result.netWallAreaM2, 6);
    expect(cavity.result.unitsPerM2Effective).toBeCloseTo(single.result.unitsPerM2Effective * 2, 6);
  });
});

describe("plastering from a building template", () => {
  const schedule = draftsToSchedule(
    [draft({ quantity: 2, height: 2.7, doors: 1, windows: 1 })],
    "meters",
  );

  it("hands the engine the net wall area after openings", () => {
    const plastered = plasteringTakeoffFromSchedule(
      schedule,
      { marketCode: "NG", thicknessMm: 15, coats: 1 },
      1,
    );
    // Two rooms: 2 x 14 x 2.7 gross, less two doors and two windows.
    const gross = 2 * 14 * 2.7;
    const openings = 2 * (0.9 * 2.1) + 2 * (1.2 * 1.5);
    expect(plastered.measuredAreaM2).toBeCloseTo(gross - openings, 6);
    expect(plastered.result.totalAreaM2).toBeCloseTo(plastered.measuredAreaM2, 6);
  });

  it("doubles the area for both faces", () => {
    const one = plasteringTakeoffFromSchedule(schedule, { marketCode: "NG" }, 1);
    const two = plasteringTakeoffFromSchedule(schedule, { marketCode: "NG" }, 2);
    expect(two.measuredAreaM2).toBeCloseTo(one.measuredAreaM2 * 2, 6);
    expect(two.result.totalAreaM2).toBeCloseTo(one.result.totalAreaM2 * 2, 6);
  });

  it("measures an empty template as zero rather than inventing an area", () => {
    const empty = plasteringTakeoffFromSchedule(
      draftsToSchedule([draft({ length: 0, width: 0, height: 0, doors: 0, windows: 0 })], "meters"),
      { marketCode: "NG" },
      2,
    );
    expect(empty.measuredAreaM2).toBe(0);
    expect(empty.result.totalAreaM2).toBe(0);
  });
});
