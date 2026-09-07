// =========================================================
// PLAN VISION TESTS — canonical building model (§9) + §13/§14
// =========================================================

import { describe, it, expect } from "vitest";
import {
  extractionToSpaces,
  toCanonicalBuildingModel,
  verifiedFactsToEnginePatch,
  verifiedRoomToSpace,
} from "../building-model";
import { confirmElement, editRoom, rejectElement } from "../review";
import {
  explicitDimension,
  inferredDimension,
  unknownDimension,
} from "../dimensions";
import type {
  ExtractedBuildingFact,
  ExtractedRoof,
  ExtractedRoom,
  PlanExtraction,
} from "../types";
import { calculateSpace } from "@/lib/measurement/space-engine";

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
    extractedAt: "2026-09-07T00:00:00Z",
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
    confidence: 0.9,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function roof(over: Partial<ExtractedRoof> = {}): ExtractedRoof {
  return {
    id: "roof1",
    roofType: "gable",
    pitchDegrees: explicitDimension(25, "m", 0.9),
    overhang: explicitDimension(0.6, "m", 0.9),
    ridgeLength: null,
    planeCount: 2,
    hipsCount: 0,
    valleysCount: 0,
    geometrySufficient: true,
    provenance: { documentId: "doc1", page: 2, method: "vision_model" },
    confidence: 0.85,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
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
    nativeUnit: "meters",
    extractedAt: "2026-09-07T00:00:00Z",
    ...over,
  };
}

describe("verified room → canonical Space (§9)", () => {
  it("converts a confirmed room into the canonical Space model", () => {
    const confirmed = confirmElement(room({ name: "Master Bedroom" }));
    const space = verifiedRoomToSpace(confirmed);
    expect(space.name).toBe("Master Bedroom");
    expect(space.type).toBe("bedroom");
    expect(space.unit).toBe("meters");
    expect(space.length).toBe(4);
    expect(space.width).toBe(3);
    expect(space.height).toBe(3);
  });

  it("throws for an unverified room — AI observations never pass the door", () => {
    expect(() => verifiedRoomToSpace(room())).toThrow(/not user-verified/);
    expect(() => verifiedRoomToSpace(startReviewed(room()))).toThrow();
  });

  it("throws for a room with unknown dimensions", () => {
    const bad = confirmElement(room({ width: unknownDimension() }));
    expect(() => verifiedRoomToSpace(bad)).toThrow(/lacks reliable dimensions/);
  });

  it("carries only verified openings into the Space (§13)", () => {
    const opening = (
      status: ExtractedRoom["openings"][number]["reviewStatus"],
    ) => ({
      id: `o${status}`,
      type: "door" as const,
      width: explicitDimension(0.9, "m", 0.9),
      height: explicitDimension(2.1, "m", 0.9),
      count: 1,
      confidence: 0.9,
      provenance: {
        documentId: "doc1",
        page: 1,
        method: "vision_model" as const,
      },
      reviewStatus: status,
      verifiedAt: null,
    });
    const confirmed = confirmElement(
      room({
        openings: [
          opening("user_confirmed"),
          opening("ai_extracted"),
          opening("user_rejected"),
        ],
      }),
    );
    const space = verifiedRoomToSpace(confirmed);
    expect(space.openings).toHaveLength(1);
    expect(space.openings[0].count).toBe(1);
  });

  it("the Space Engine itself computes the area (no duplicate math)", () => {
    const confirmed = confirmElement(room());
    const space = verifiedRoomToSpace(confirmed);
    const result = calculateSpace(space);
    // Default surface is wall: perimeter × height = 2 × (4 + 3) × 3 = 42 m².
    // The number is produced by the SPACE ENGINE, not by plan-vision.
    expect(result.areaM2).toBe(42);
    expect(result.steps.length).toBeGreaterThan(0); // transparent steps preserved
  });
});

function startReviewed(r: ExtractedRoom) {
  return { ...r, reviewStatus: "in_review" as const };
}

describe("extraction → spaces (§9, §12)", () => {
  it("converts only verified rooms, silently skipping rejected/unverified", () => {
    const ex = extraction({
      rooms: [
        confirmElement(room()),
        rejectElement(room()),
        room(), // ai_extracted
        editRoom(room({ length: unknownDimension() }), { lengthM: 5 }),
      ],
    });
    const spaces = extractionToSpaces(ex);
    expect(spaces).toHaveLength(2);
  });
});

describe("verified facts → Build-to-Roof patch", () => {
  it("applies only user-verified facts", () => {
    const { patch, applied, skipped } = verifiedFactsToEnginePatch(
      [
        confirmElement(fact("building_length", 15)),
        fact("building_width", 10), // unverified
      ],
      null,
    );
    expect(patch.building_length).toBe(15);
    expect(applied).toContain("building_length");
    const widthSkip = skipped.find((s) => s.key === "building_width");
    expect(widthSkip?.reason).toBe("not user-verified yet");
    expect((patch as Record<string, unknown>).building_width).toBeUndefined();
  });

  it("rounds whole-number facts and floors can never be fractional", () => {
    const edited = confirmElement(fact("number_of_floors", 2.7));
    const { patch } = verifiedFactsToEnginePatch([edited], null);
    expect(patch.number_of_floors).toBe(3);
  });

  it("rounds dimensions to millimetre precision like the Phase 2 patch", () => {
    const { patch } = verifiedFactsToEnginePatch(
      [confirmElement(fact("building_length", 15.123456))],
      null,
    );
    expect(patch.building_length).toBe(15.123);
  });

  it("skips unknown dimensions with an explicit reason (§22)", () => {
    const { skipped } = verifiedFactsToEnginePatch(
      [
        confirmElement(
          fact("building_width", 0, { dimension: unknownDimension() }),
        ),
      ],
      null,
    );
    expect(skipped.some((s) => s.reason === "value unknown")).toBe(true);
  });

  it("applies roof_type only from a verified, geometry-sufficient roof (§14)", () => {
    const sufficient = confirmElement(roof());
    const insufficient = confirmElement(
      roof({ geometrySufficient: false, roofType: "unknown" }),
    );

    const ok = verifiedFactsToEnginePatch([], sufficient);
    expect((ok.patch as Record<string, unknown>).roof_type).toBe("gable");

    const blocked = verifiedFactsToEnginePatch([], insufficient);
    expect(
      (blocked.patch as Record<string, unknown>).roof_type,
    ).toBeUndefined();
    expect(
      blocked.skipped.some((s) => s.reason.includes("geometry insufficient")),
    ).toBe(true);

    const unverified = verifiedFactsToEnginePatch([], roof());
    expect(
      unverified.skipped.some((s) => s.reason.includes("not user-verified")),
    ).toBe(true);
  });

  it("applies verified pitch and overhang facts", () => {
    const { patch } = verifiedFactsToEnginePatch(
      [
        confirmElement(fact("roof_pitch_degrees", 25)),
        confirmElement(fact("roof_overhang", 0.6)),
      ],
      null,
    );
    expect(patch.roof_pitch_degrees).toBe(25);
    expect(patch.roof_overhang).toBe(0.6);
  });
});

function editBuildingFactOf(f: ExtractedBuildingFact): ExtractedBuildingFact {
  // Confirms via user edit (kind becomes explicit, user-verified).
  return editRoomFactConfirmed(f);
}

function editRoomFactConfirmed(
  f: ExtractedBuildingFact,
): ExtractedBuildingFact {
  return confirmElement(f);
}

describe("full canonical model (§9)", () => {
  it("assembles spaces + patch + roof from one extraction", () => {
    const ex = extraction({
      rooms: [confirmElement(room())],
      buildingFacts: [
        confirmElement(fact("building_length", 15)),
        confirmElement(fact("building_width", 10)),
      ],
      roof: confirmElement(roof()),
    });
    const model = toCanonicalBuildingModel(ex);
    expect(model.spaces).toHaveLength(1);
    expect(model.buildToRoofPatch.patch.building_length).toBe(15);
    expect(model.roof?.roofType).toBe("gable");
    expect(model.unverifiedCount).toBe(0);
  });

  it("counts unverified elements and reports missing information honestly", () => {
    const ex = extraction({
      rooms: [confirmElement(room()), room(), room()],
      buildingFacts: [fact("building_length", 15), fact("building_width", 10)],
    });
    const model = toCanonicalBuildingModel(ex);
    expect(model.spaces).toHaveLength(1);
    expect(model.unverifiedCount).toBe(4); // 2 rooms + 2 facts
    expect(model.buildToRoofPatch.patch.building_length).toBeUndefined();
  });

  it("inferred dimensions never enter the patch until verified (§4)", () => {
    const ex = extraction({
      buildingFacts: [
        confirmElement(
          fact("building_length", 15, {
            dimension: inferredDimension(15, "m", 0.6),
          }),
        ),
      ],
    });
    const model = toCanonicalBuildingModel(ex);
    // User confirmed it → usable, but let's ensure unconfirmed inferred is blocked:
    const ex2 = extraction({
      buildingFacts: [
        fact("building_length", 15, {
          dimension: inferredDimension(15, "m", 0.6),
        }),
      ],
    });
    const model2 = toCanonicalBuildingModel(ex2);
    expect(model2.buildToRoofPatch.patch.building_length).toBeUndefined();
    expect(model2.buildToRoofPatch.skipped[0].reason).toBe(
      "not user-verified yet",
    );
  });
});
