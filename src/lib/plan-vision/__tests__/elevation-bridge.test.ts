// =========================================================
// PLAN → ELEVATION BRIDGE TESTS
//
// The contract under test: only user-verified values reach the
// engine, missing values are reported (never guessed), derived
// figures carry their formula, and the handoff state matches what
// each target estimator already reads.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  CIRCULATION_FACTOR,
  deriveFootprint,
  extractionToElevationImport,
  planExits,
  planQuantitiesFromResult,
  readPlanHandoff,
  storePlanHandoff,
  clearPlanHandoff,
} from "../elevation-bridge";
import { confirmElement } from "../review";
import { explicitDimension } from "../dimensions";
import type {
  ExtractedBuildingFact,
  ExtractedRoom,
  PlanExtraction,
} from "../types";
import {
  DEFAULT_PLAN_INPUT,
  calculateMathematicalElevation,
} from "@/lib/engineering/mathematical-elevation-engine";

let seq = 0;

function room(over: Partial<ExtractedRoom> = {}): ExtractedRoom {
  seq++;
  return {
    id: `r${seq}`,
    name: `Room ${seq}`,
    spaceType: "bedroom",
    length: explicitDimension(4, "m", 0.9),
    width: explicitDimension(3, "m", 0.9),
    height: explicitDimension(3, "m", 0.9),
    openings: [],
    floor: 1,
    provenance: { documentId: "doc1", page: 1, method: "vision_model" },
    confidence: 0.9,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-11-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function fact(
  key: string,
  valueM: number,
  over: Partial<ExtractedBuildingFact> = {},
): ExtractedBuildingFact {
  seq++;
  return {
    id: `f${seq}`,
    key,
    label: key.replace(/_/g, " "),
    dimension: explicitDimension(valueM, "m", 0.95),
    provenance: { documentId: "doc1", page: 1, method: "vision_model" },
    confidence: 0.92,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-11-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function extraction(over: Partial<PlanExtraction> = {}): PlanExtraction {
  return {
    id: "ext1",
    documentId: "doc1",
    version: 1,
    scale: null,
    rooms: [],
    roof: null,
    buildingFacts: [],
    notes: [],
    warnings: [],
    issues: [],
    nativeUnit: "meters" as const,
    extractedAt: "2026-11-07T00:00:00Z",
    ...over,
  };
}

describe("extractionToElevationImport", () => {
  it("applies nothing while every fact is still unverified", () => {
    const result = extractionToElevationImport(
      extraction({
        buildingFacts: [
          fact("building_length", 15),
          fact("building_width", 10),
        ],
      }),
    );

    expect(result.patch.building_length).toBeUndefined();
    expect(result.patch.building_width).toBeUndefined();
    expect(result.applied).toHaveLength(0);
    expect(result.hasUsableValues).toBe(false);
    expect(result.missing.map((m) => m.key)).toContain("building_length");
  });

  it("passes verified and edited facts through with their labels", () => {
    const length = fact("building_length", 15);
    const width = fact("building_width", 10);
    const floors = fact("number_of_floors", 2);
    const result = extractionToElevationImport(
      extraction({
        buildingFacts: [
          confirmElement(length),
          confirmElement(width),
          confirmElement(floors),
        ],
      }),
    );

    expect(result.patch.building_length).toBe(15);
    expect(result.patch.building_width).toBe(10);
    // number_of_floors lands on the engine's `storeys` field.
    expect(result.patch.storeys).toBe(2);
    expect(result.applied.map((f) => f.label)).toEqual(
      expect.arrayContaining(["Overall length", "Overall width", "Storeys"]),
    );
    expect(result.applied.every((f) => f.source === "plan")).toBe(true);
    expect(result.hasUsableValues).toBe(true);
  });

  it("reports a dimension the drawing never stated instead of inventing it", () => {
    const result = extractionToElevationImport(
      extraction({
        buildingFacts: [confirmElement(fact("building_length", 12))],
      }),
    );

    expect(result.patch.building_length).toBe(12);
    expect(result.patch.building_width).toBeUndefined();
    const missingWidth = result.missing.find((m) => m.key === "building_width");
    expect(missingWidth).toBeDefined();
    expect(missingWidth?.hint).toMatch(/not stated|type it in/i);
  });

  it("carries the roof form only when geometry is sufficient", () => {
    const insufficient = extractionToElevationImport(
      extraction({
        roof: {
          id: "roof1",
          roofType: "hip",
          pitchDegrees: null,
          overhang: null,
          ridgeLength: null,
          planeCount: null,
          hipsCount: 0,
          valleysCount: 0,
          geometrySufficient: false,
          provenance: { documentId: "doc1", page: 2, method: "vision_model" },
          confidence: 0.5,
          reviewStatus: "ai_extracted",
          corrections: [],
          extractedAt: "2026-11-07T00:00:00Z",
          verifiedAt: null,
        },
      }),
    );

    expect(insufficient.patch.roof_type).toBeUndefined();
  });
});

describe("deriveFootprint", () => {
  it("derives a footprint only from verified rooms and shows its formula", () => {
    const verified = [
      confirmElement(room()),
      confirmElement(room({ width: explicitDimension(4, "m", 0.9) })),
    ];
    const unverified = [room(), room(), room()];

    expect(deriveFootprint(unverified)).toBeNull();

    const derived = deriveFootprint(verified);
    expect(derived).not.toBeNull();
    expect(derived!.roomCount).toBe(2);
    // 4x3 + 4x4 = 28 m², scaled by the circulation factor.
    const expectedArea = 28 * CIRCULATION_FACTOR;
    expect(derived!.areaM2).toBeCloseTo(expectedArea, 1);
    expect(derived!.lengthM * derived!.widthM).toBeCloseTo(expectedArea, 0);
    expect(derived!.method).toContain("circulation factor");
  });

  it("ignores rooms whose dimensions were never read", () => {
    const half = room({ width: null });
    expect(deriveFootprint([confirmElement(half)])).toBeNull();
  });
});

describe("planQuantitiesFromResult + planExits", () => {
  const params = {
    ...DEFAULT_PLAN_INPUT,
    building_length: 15,
    building_width: 10,
    storeys: 2,
  };
  const result = calculateMathematicalElevation(params);

  it("reads the areas the engine actually computed", () => {
    const quantities = planQuantitiesFromResult(result);
    expect(quantities.floorAreaM2).toBeCloseTo(
      result.levels.level_2_ground_slab.slab_area_m2,
      2,
    );
    expect(quantities.ceilingAreaM2).toBe(quantities.floorAreaM2);
    expect(quantities.roofAreaM2).toBeNull();
    expect(quantities.paintAreaM2).toBeNull();
    expect(quantities.perimeterM).toBe(50);
  });

  it("builds the exact state each target estimator reads", () => {
    const quantities = planQuantitiesFromResult(result);
    const exits = planExits(quantities, params);
    const byId = Object.fromEntries(exits.map((e) => [e.id, e]));

    expect(byId["build-to-roof"].state).toMatchObject({
      mathematicalElevationPatch: expect.objectContaining({
        building_length: 15,
        building_width: 10,
        number_of_floors: 2,
      }),
    });
    expect(byId.paint.state).toEqual({ coats: 2 });
    expect(byId.paint.carries).toContain("measure paintable surfaces");
    expect(byId.screeding.state).toMatchObject({
      netScreedingArea: quantities.floorAreaM2,
    });
    expect(byId.tile.state).toMatchObject({
      surfaceArea: quantities.floorAreaM2,
    });
    expect(byId.pop.state).toMatchObject({
      ceilingArea: quantities.ceilingAreaM2,
    });
  });

  it("never sends an undefined value that would wipe target state", () => {
    const quantities = planQuantitiesFromResult(result);
    const exits = planExits(quantities, {});
    const patch = exits[0].state.mathematicalElevationPatch as Record<
      string,
      unknown
    >;
    expect(Object.values(patch).every((v) => v !== undefined)).toBe(true);
  });
});

describe("session handoff", () => {
  it("round-trips and clears", () => {
    const params = { ...DEFAULT_PLAN_INPUT, building_length: 12 };
    const quantities = planQuantitiesFromResult(
      calculateMathematicalElevation(params),
    );
    storePlanHandoff({
      quantities,
      elevationPatch: params,
      source: "plan_import",
      createdAt: "2026-11-07T00:00:00Z",
    });
    expect(readPlanHandoff()?.quantities.floorAreaM2).toBeCloseTo(
      quantities.floorAreaM2,
      2,
    );
    clearPlanHandoff();
    expect(readPlanHandoff()).toBeNull();
  });
});
