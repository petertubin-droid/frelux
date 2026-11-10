import { describe, expect, it } from "vitest";
import type { ConstructionExtractionResult, ExtractionField } from "@/lib/construction-extraction";
import { roofFromExtraction } from "./plan-measurements";
import {
  PLAN_ROOF_STORAGE_KEY,
  clearPlanRoof,
  parseStoredRoof,
  readPlanRoof,
  savePlanRoof,
} from "@/lib/measurement/plan-roof-store";
import type { PlanRoof } from "./plan-measurements";

const field = (key: string, value: number | string, unit: string, over: Partial<ExtractionField> = {}): ExtractionField => ({
  key,
  label: key,
  value,
  unit,
  confidence: 0.95,
  verification: "ai_detected",
  source: "dimension_annotation",
  ...over,
});

const roofPlan = (over: Partial<Record<string, ExtractionField>> = {}, skip: string[] = []): ConstructionExtractionResult => {
  const base: Record<string, ExtractionField> = {
    building_length: field("building_length", 18, "m"),
    building_width: field("building_width", 12, "m"),
    roof_type: field("roof_type", "gable", ""),
    roof_pitch_degrees: field("roof_pitch_degrees", 30, "deg"),
    roof_overhang: field("roof_overhang", 0.45, "m"),
    ridge_length: field("ridge_length", 18, "m"),
    valleys_count: field("valleys_count", 0, "pcs"),
    hips_count: field("hips_count", 0, "pcs"),
    ...over,
  };
  return {
    documentKind: "roof_plan",
    fields: Object.entries(base).filter(([k]) => !skip.includes(k)).map(([, f]) => f),
    notes: [],
    warnings: [],
    processedAt: "2026-11-10T06:30:00.000Z",
  };
};

const roofOf = (result: ConstructionExtractionResult): PlanRoof => {
  const outcome = roofFromExtraction(result);
  if (!outcome.ok) throw new Error(outcome.reason);
  return outcome.roof;
};

describe("roof readings", () => {
  it("reads the roof and states the pitch as a rise per 12", () => {
    const roof = roofOf(roofPlan());
    expect(roof.lengthM).toBeCloseTo(18, 6);
    expect(roof.widthM).toBeCloseTo(12, 6);
    expect(roof.pitchDegrees).toBeCloseTo(30, 6);
    // tan(30) x 12 = 6.9282, rounded to 6.93.
    expect(roof.risePer12).toBeCloseTo(6.93, 2);
    expect(roof.overhangM).toBeCloseTo(0.45, 6);
    expect(roof.ridgeLengthM).toBeCloseTo(18, 6);
    expect(roof.shape).toBe("gable");
    expect(roof.needsConfirmation).toEqual([]);
  });

  it("accepts eaves below the room-side minimum, because 300 mm is normal", () => {
    const roof = roofOf(roofPlan({ roof_overhang: field("roof_overhang", 0.3, "m") }));
    expect(roof.overhangM).toBeCloseTo(0.3, 6);
  });

  it("refuses a pitch stated as a ratio, because 1:2 is not 2 degrees", () => {
    const outcome = roofFromExtraction(
      roofPlan({ roof_pitch_degrees: field("roof_pitch_degrees", 2, "rise per 12") }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toMatch(/not degrees/i);
  });

  it("refuses a pitch that was only guessed by eye", () => {
    const outcome = roofFromExtraction(
      roofPlan({ roof_pitch_degrees: field("roof_pitch_degrees", 30, "deg", { source: "visual_estimate" }) }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toMatch(/estimated by eye/i);
  });

  it("refuses a photograph of a roof", () => {
    const outcome = roofFromExtraction({ ...roofPlan(), documentKind: "building_photo" });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toMatch(/photograph cannot give roof dimensions/i);
  });

  it("says when pitch and overhang were absent instead of hiding the zeroes", () => {
    const roof = roofOf(roofPlan({}, ["roof_pitch_degrees", "roof_overhang", "ridge_length"]));
    expect(roof.pitchDegrees).toBe(0);
    expect(roof.risePer12).toBe(0);
    expect(roof.overhangM).toBe(0);
    expect(roof.ridgeLengthM).toBeNull();
    expect(roof.needsConfirmation.join(" ")).toMatch(/flat roof \(0 degrees\)/);
    expect(roof.needsConfirmation.join(" ")).toMatch(/flush with the walls/);
  });

  it("maps a mono-pitch drawing to its own shape and names an unstated one", () => {
    expect(roofOf(roofPlan({ roof_type: field("roof_type", "mono_pitch", "") })).shape).toBe("mono_pitch");
    const unstated = roofOf(roofPlan({}, ["roof_type"]));
    expect(unstated.shape).toBeNull();
    expect(unstated.needsConfirmation.join(" ")).toMatch(/shape was not stated/i);
  });
});

describe("the stored roof", () => {
  const roof: PlanRoof = {
    lengthM: 18,
    widthM: 12,
    pitchDegrees: 30,
    risePer12: 6.93,
    overhangM: 0.45,
    ridgeLengthM: 18,
    shape: "gable",
    valleys: 0,
    hips: 0,
    documentKind: "roof_plan",
    needsConfirmation: [],
  };

  it("round-trips through storage", () => {
    savePlanRoof(roof);
    expect(readPlanRoof()).toEqual(roof);
    expect(window.localStorage.getItem(PLAN_ROOF_STORAGE_KEY)).toBeTruthy();
    clearPlanRoof();
    expect(readPlanRoof()).toBeNull();
  });

  it("discards a roof that cannot be a roof", () => {
    expect(parseStoredRoof(null)).toBeNull();
    expect(parseStoredRoof("not json")).toBeNull();
    expect(parseStoredRoof(JSON.stringify({ ...roof, widthM: 0 }))).toBeNull();
    expect(parseStoredRoof(JSON.stringify({ ...roof, pitchDegrees: -4 }))).toBeNull();
    expect(parseStoredRoof(JSON.stringify({ ...roof, shape: "dome" }))).toBeNull();
  });

  it("keeps a null ridge and an unstated shape as null", () => {
    const parsed = parseStoredRoof(JSON.stringify({ ...roof, ridgeLengthM: null, shape: null }));
    expect(parsed?.ridgeLengthM).toBeNull();
    expect(parsed?.shape).toBeNull();
  });
});
