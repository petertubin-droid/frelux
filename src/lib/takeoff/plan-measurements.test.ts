import { describe, expect, it } from "vitest";
import type {
  ConstructionExtractionResult,
  ExtractedRoom,
  ExtractionField,
  ExtractionSource,
} from "@/lib/construction-extraction";
import {
  buildingFromMeasurements,
  measurementsFromExtraction,
  roomReconciliation,
  roomsFromExtraction,
} from "./plan-measurements";

const field = (
  key: string,
  value: number | string,
  unit: string,
  over: Partial<ExtractionField> = {},
): ExtractionField => ({
  key,
  label: key,
  value,
  unit,
  confidence: 0.95,
  verification: "ai_detected",
  source: "dimension_annotation" as ExtractionSource,
  ...over,
});

const result = (
  fields: ExtractionField[],
  documentKind: ConstructionExtractionResult["documentKind"] = "architectural_plan",
): ConstructionExtractionResult => ({
  documentKind,
  fields,
  notes: [],
  warnings: [],
  processedAt: "2026-11-10T06:00:00.000Z",
});

const plan = (over: Partial<Record<string, ExtractionField>> = {}, skip: string[] = []) => {
  const base: Record<string, ExtractionField> = {
    building_length: field("building_length", 18, "m"),
    building_width: field("building_width", 12, "m"),
    floor_to_floor_height: field("floor_to_floor_height", 3, "m"),
    number_of_floors: field("number_of_floors", 1, "floors"),
    doors_count: field("doors_count", 6, "count"),
    windows_count: field("windows_count", 8, "count"),
    door_width: field("door_width", 0.9, "m"),
    door_height: field("door_height", 2.1, "m"),
    window_width: field("window_width", 1.2, "m"),
    window_height: field("window_height", 1.5, "m"),
    ...over,
  };
  return result(Object.entries(base).filter(([k]) => !skip.includes(k)).map(([, f]) => f as ExtractionField));
};

describe("measurements from an extracted plan", () => {
  it("reads a metric plan and keeps every length in metres", () => {
    const outcome = measurementsFromExtraction(plan());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.measurements.length.value).toBeCloseTo(18, 6);
    expect(outcome.measurements.width.value).toBeCloseTo(12, 6);
    expect(outcome.measurements.storeyHeight.value).toBeCloseTo(3, 6);
    expect(outcome.measurements.doors.count).toBe(6);
    expect(outcome.measurements.windows.count).toBe(8);
    expect(outcome.measurements.needsConfirmation).toEqual([]);
  });

  it("converts a millimetre drawing by its own unit, not by assumption", () => {
    const outcome = measurementsFromExtraction(
      plan({
        building_length: field("building_length", 18000, "mm"),
        building_width: field("building_width", 12000, "mm"),
        floor_to_floor_height: field("floor_to_floor_height", 3000, "mm"),
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.measurements.length.value).toBeCloseTo(18, 6);
    expect(outcome.measurements.width.value).toBeCloseTo(12, 6);
    expect(outcome.measurements.storeyHeight.value).toBeCloseTo(3, 6);
    // The document's own unit is preserved for the evidence line.
    expect(outcome.measurements.length.unit).toBe("mm");
    expect(outcome.measurements.length.rawValue).toBe(18000);
  });

  it("refuses a photograph, because a photo cannot give dimensions", () => {
    const outcome = measurementsFromExtraction(
      result([field("building_length", 18, "m")], "building_photo"),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toMatch(/photograph cannot give dimensions/i);
  });

  it("refuses when the storey height is not on the document", () => {
    const outcome = measurementsFromExtraction(plan({}, ["floor_to_floor_height"]));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toMatch(/storey height/i);
  });

  it("refuses a length the reader only guessed by eye", () => {
    const outcome = measurementsFromExtraction(
      plan({ building_length: field("building_length", 18, "m", { source: "visual_estimate", confidence: 0.8 }) }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toMatch(/estimated by eye/i);
  });

  it("refuses a length that cannot be a building", () => {
    const outcome = measurementsFromExtraction(plan({ building_length: field("building_length", 0.2, "m") }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toMatch(/outside what a building can be/i);
  });

  it("names an opening size it had to assume instead of hiding it", () => {
    const outcome = measurementsFromExtraction(plan({}, ["door_width", "door_height"]));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.measurements.doors.assumedSize).toBe(true);
    expect(outcome.measurements.doors.widthM).toBeCloseTo(0.9, 6);
    expect(outcome.measurements.doors.heightM).toBeCloseTo(2.1, 6);
    expect(outcome.measurements.needsConfirmation.join(" ")).toMatch(/0\.9 m by 2\.1 m/);
  });

  it("says when the floor count was not stated, and assumes one", () => {
    const outcome = measurementsFromExtraction(plan({}, ["number_of_floors"]));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.measurements.storeys).toEqual({ value: 1, assumed: true });
    expect(outcome.measurements.needsConfirmation.join(" ")).toMatch(/one floor is assumed/i);
  });
});

describe("the measured building handed to the store", () => {
  it("models one envelope per storey and measures the walls from it", () => {
    const outcome = measurementsFromExtraction(plan({ number_of_floors: field("number_of_floors", 2, "floors") }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const building = buildingFromMeasurements(outcome.measurements);
    // Two identical floors, so two rooms in the schedule.
    expect(building.schedule.rooms).toHaveLength(2);
    expect(building.drafts[0].quantity).toBe(2);

    // Per floor: 18 x 12, walls 2(18+12) x 3 = 180 gross, less 6 doors of
    // 0.9 x 2.1 and 8 windows of 1.2 x 1.5, so 180 - 11.34 - 14.4 = 154.26.
    const perFloorNet = 180 - 6 * 0.9 * 2.1 - 8 * 1.2 * 1.5;
    expect(building.totals.netWallAreaM2).toBeCloseTo(perFloorNet * 2, 6);
    expect(building.totals.floorAreaM2).toBeCloseTo(18 * 12 * 2, 6);
  });

  it("produces geometry only, never a quantity of material or a cost", () => {
    const outcome = measurementsFromExtraction(plan());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const building = buildingFromMeasurements(outcome.measurements);
    const keys: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          keys.push(k);
          walk(v);
        }
      }
    };
    walk(building);
    expect(keys.filter((k) => /cost|price|amount|rate|subtotal|total_cost/i.test(k))).toEqual([]);
  });
});

describe("rooms read from the drawing", () => {
  const room = (over: Partial<ExtractedRoom> = {}): ExtractedRoom => ({
    label: "Bedroom 1",
    lengthM: 4,
    widthM: 3.5,
    heightM: null,
    doors: 1,
    windows: 1,
    source: "dimension_annotation",
    confidence: 0.92,
    ...over,
  });

  const withRooms = (rooms: ExtractedRoom[]) => ({ ...plan(), rooms });

  it("keeps each room's own sides and takes the storey height when a room gives none", () => {
    const extraction = withRooms([
      room({ label: "Kitchen", lengthM: 3.6, widthM: 2.8, heightM: null }),
      room({ label: "Bedroom 1", lengthM: 4, widthM: 3.5, heightM: 3.15 }),
    ]);
    const measurements = measurementsFromExtraction(extraction);
    expect(measurements.ok).toBe(true);
    if (!measurements.ok) return;

    const reading = roomsFromExtraction(extraction, measurements.measurements.storeyHeight.value);
    expect(reading.refused).toEqual([]);
    expect(reading.rooms).toHaveLength(2);
    expect(reading.rooms[0]).toMatchObject({ label: "Kitchen", lengthM: 3.6, widthM: 2.8, heightM: 3, heightAssumed: true });
    expect(reading.rooms[1]).toMatchObject({ label: "Bedroom 1", heightM: 3.15, heightAssumed: false });
  });

  it("refuses a room the reader only guessed by eye and names it", () => {
    const extraction = withRooms([
      room(),
      room({ label: "Store", source: "visual_estimate", confidence: 0.7 }),
    ]);
    const measurements = measurementsFromExtraction(extraction);
    if (!measurements.ok) throw new Error("plan should read");
    const reading = roomsFromExtraction(extraction, 3);

    expect(reading.rooms.map((r) => r.label)).toEqual(["Bedroom 1"]);
    expect(reading.refused).toHaveLength(1);
    expect(reading.refused[0].label).toBe("Store");
    expect(reading.refused[0].reason).toMatch(/estimated by eye/i);
  });

  it("builds the schedule from the rooms, never from an average of them", () => {
    const extraction = withRooms([
      room({ label: "Kitchen", lengthM: 3.6, widthM: 2.8 }),
      room({ label: "Bedroom 1", lengthM: 4, widthM: 3.5 }),
    ]);
    const measurements = measurementsFromExtraction(extraction);
    if (!measurements.ok) throw new Error("plan should read");
    const reading = roomsFromExtraction(extraction, measurements.measurements.storeyHeight.value);

    const building = buildingFromMeasurements(measurements.measurements, reading.rooms);
    expect(building.label).toBe("Measured rooms");
    expect(building.schedule.rooms).toHaveLength(2);
    expect(building.drafts.map((d) => d.length)).toEqual([3.6, 4]);
    expect(building.drafts[0].spaceType).toBe("kitchen");
    expect(building.drafts[1].spaceType).toBe("bedroom");

    // Room 1: 2(3.6+2.8) x 3 = 38.4 gross, less a 0.9x2.1 door and a 1.2x1.5
    // window = 38.4 - 1.89 - 1.8 = 34.71. Room 2: 2(4+3.5) x 3 = 45 - 3.69 = 41.31.
    expect(building.totals.netWallAreaM2).toBeCloseTo(34.71 + 41.31, 6);
    expect(building.totals.floorAreaM2).toBeCloseTo(3.6 * 2.8 + 4 * 3.5, 6);
  });

  it("reports the space the rooms do not account for instead of adjusting a room", () => {
    const extraction = withRooms([room({ lengthM: 4, widthM: 3.5 })]);
    const measurements = measurementsFromExtraction(extraction);
    if (!measurements.ok) throw new Error("plan should read");
    const reading = roomsFromExtraction(extraction, 3);

    const reconciliation = roomReconciliation(measurements.measurements, reading.rooms);
    expect(reconciliation.footprintM2).toBeCloseTo(216, 6);
    expect(reconciliation.roomAreaM2).toBeCloseTo(14, 6);
    expect(reconciliation.unlabelledM2).toBeCloseTo(202, 6);
    expect(reconciliation.overMeasured).toBe(false);
    expect(reconciliation.note).toMatch(/remaining 202\.00 m²/);
  });

  it("says plainly when the rooms add up to more than the footprint", () => {
    const extraction = withRooms([
      room({ label: "Hall", lengthM: 18, widthM: 12 }),
      room({ label: "Store", lengthM: 5, widthM: 4 }),
    ]);
    const measurements = measurementsFromExtraction(extraction);
    if (!measurements.ok) throw new Error("plan should read");
    const reading = roomsFromExtraction(extraction, 3);

    const reconciliation = roomReconciliation(measurements.measurements, reading.rooms);
    expect(reconciliation.overMeasured).toBe(true);
    expect(reconciliation.note).toMatch(/One of the readings is wrong/);
  });
});
