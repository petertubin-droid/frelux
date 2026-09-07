// =========================================================
// PLAN VISION TESTS — extraction sanitizer (§3, §4, §7, §16, §22)
// The response MUST never become a fabricated result.
// =========================================================

import { describe, it, expect } from "vitest";
import { sanitizeExtractionResponse, shouldReextract } from "../extraction";
import { explicitDimension } from "../dimensions";
import { confirmElement } from "../review";
import type { PlanExtraction } from "../types";

const OPTS = {
  documentId: "doc1",
  documentKind: "floor_plan" as const,
  extractionId: "ext1",
  now: "2026-09-07T00:00:00Z",
};

function rawRoom(over: Record<string, unknown> = {}) {
  return {
    id: "r1",
    name: "BEDROOM 1",
    spaceType: "bedroom",
    page: 1,
    length: {
      value: 3600,
      unit: "mm",
      source: "dimension_annotation",
      confidence: 0.95,
    },
    width: {
      value: 3000,
      unit: "mm",
      source: "dimension_annotation",
      confidence: 0.95,
    },
    openings: [
      {
        id: "o1",
        type: "door",
        count: 1,
        width: {
          value: 900,
          unit: "mm",
          source: "dimension_annotation",
          confidence: 0.9,
        },
        height: {
          value: 2100,
          unit: "mm",
          source: "dimension_annotation",
          confidence: 0.9,
        },
      },
    ],
    evidence: "Dimension '3600' + label 'BEDROOM 1'",
    confidence: 0.9,
    ...over,
  };
}

describe("sanitization of a well-formed response (§3)", () => {
  const sanitized = sanitizeExtractionResponse(
    {
      scale: { source: "written_scale", text: "1:100", confidence: 0.95 },
      nativeUnit: "m",
      rooms: [rawRoom()],
      roof: {
        roofType: "gable",
        page: 2,
        pitchDegrees: {
          value: 25,
          unit: "m",
          source: "dimension_annotation",
          confidence: 0.9,
        },
        planeCount: 2,
        evidence: "Two slopes",
        confidence: 0.85,
      },
      buildingFacts: [
        {
          id: "f1",
          key: "building_length",
          label: "Building length",
          dimension: {
            value: 15000,
            unit: "mm",
            source: "dimension_annotation",
            confidence: 0.95,
          },
          evidence: "Overall dimension line",
          confidence: 0.95,
        },
      ],
      notes: ["Drawing no. A-101"],
      warnings: [],
    },
    OPTS,
  );

  it("normalizes rooms with explicit classification and provenance (§4, §7)", () => {
    expect(sanitized.rooms).toHaveLength(1);
    const room = sanitized.rooms[0];
    expect(room.name).toBe("BEDROOM 1");
    expect(room.length!.kind).toBe("explicit");
    expect(room.length!.value).toBe(3600);
    expect(room.provenance.documentId).toBe("doc1");
    expect(room.provenance.quote).toContain("3600");
    expect(room.reviewStatus).toBe("ai_extracted");
  });

  it("normalizes openings with their dimensions (§13)", () => {
    const opening = sanitized.rooms[0].openings[0];
    expect(opening.type).toBe("door");
    expect(opening.width!.value).toBe(900);
    expect(opening.reviewStatus).toBe("ai_extracted");
  });

  it("normalizes the roof and determines geometry sufficiency deterministically (§14)", () => {
    expect(sanitized.roof!.roofType).toBe("gable");
    expect(sanitized.roof!.geometrySufficient).toBe(true);
  });

  it("runs the §6 consistency pass as part of sanitization", () => {
    expect(Array.isArray(sanitized.issues)).toBe(true);
  });

  it("keeps the usable scale record (§5)", () => {
    expect(sanitized.scale!.usable).toBe(true);
    expect(sanitized.scale!.text).toBe("1:100");
  });
});

describe("dimension classification cannot be self-certified by the model (§4)", () => {
  it("demotes dimension_annotation claims from a PHOTOGRAPH to inferred (§16)", () => {
    const result = sanitizeExtractionResponse(
      { rooms: [rawRoom()] },
      { ...OPTS, documentKind: "photograph" },
    );
    expect(result.rooms[0].length!.kind).toBe("inferred");
    expect(result.rooms[0].length!.value).toBe(3600);
  });

  it("demotes visual_estimate sources to inferred even for drawings", () => {
    const result = sanitizeExtractionResponse(
      {
        rooms: [
          rawRoom({
            length: {
              value: 4,
              unit: "m",
              source: "visual_estimate",
              confidence: 0.7,
            },
          }),
        ],
      },
      OPTS,
    );
    expect(result.rooms[0].length!.kind).toBe("inferred");
  });

  it("honors scale_derived as derived", () => {
    const result = sanitizeExtractionResponse(
      {
        rooms: [
          rawRoom({
            length: {
              value: 4,
              unit: "m",
              source: "scale_derived",
              confidence: 0.8,
            },
          }),
        ],
      },
      OPTS,
    );
    expect(result.rooms[0].length!.kind).toBe("derived");
  });
});

describe("graceful handling of missing/unusable data (§22)", () => {
  it("drops malformed rooms instead of crashing", () => {
    const result = sanitizeExtractionResponse(
      {
        rooms: [
          rawRoom(),
          { garbage: true },
          null,
          { name: "", spaceType: "x" },
        ],
      },
      OPTS,
    );
    expect(result.rooms).toHaveLength(1);
  });

  it("keeps rooms with null dimensions — null stays null, never filled", () => {
    const result = sanitizeExtractionResponse(
      { rooms: [rawRoom({ width: null, height: null })] },
      OPTS,
    );
    expect(result.rooms[0].width).toBeNull();
    expect(result.rooms[0].height).toBeNull();
  });

  it("an unreadable response yields an empty extraction with a warning — not a fake one", () => {
    const result = sanitizeExtractionResponse("not an object", OPTS);
    expect(result.rooms).toHaveLength(0);
    expect(result.warnings[0]).toContain("could not be read");
  });

  it("drops out-of-range dimensions rather than clamping them into plausibility", () => {
    const result = sanitizeExtractionResponse(
      {
        rooms: [
          rawRoom({
            length: {
              value: 99999,
              unit: "m",
              source: "dimension_annotation",
              confidence: 0.9,
            },
          }),
        ],
      },
      OPTS,
    );
    expect(result.rooms[0].length).toBeNull();
  });

  it("drops openings with implausible sizes (dims become unknown)", () => {
    const result = sanitizeExtractionResponse(
      {
        rooms: [
          rawRoom({
            openings: [
              {
                id: "o1",
                type: "window",
                count: 1,
                width: {
                  value: 50,
                  unit: "m",
                  source: "dimension_annotation",
                  confidence: 0.9,
                },
                height: {
                  value: 2,
                  unit: "m",
                  source: "dimension_annotation",
                  confidence: 0.9,
                },
              },
            ],
          }),
        ],
      },
      OPTS,
    );
    expect(result.rooms[0].openings[0].width).toBeNull();
  });

  it("clamps confidence to 0..1 and floors to whole numbers", () => {
    const result = sanitizeExtractionResponse(
      {
        rooms: [rawRoom({ floor: 2.9, confidence: 7 })],
        buildingFacts: [
          {
            id: "f1",
            key: "number_of_floors",
            dimension: {
              value: 2.9,
              unit: "m",
              source: "dimension_annotation",
              confidence: 3,
            },
          },
        ],
      },
      OPTS,
    );
    expect(result.rooms[0].confidence).toBe(1);
    expect(result.rooms[0].floor).toBe(3);
    expect(result.buildingFacts[0].dimension!.confidence).toBe(1);
  });
});

describe("scale sanitization (§5)", () => {
  it("an unusable scale record stays visible with its reason", () => {
    const result = sanitizeExtractionResponse(
      { scale: { source: "written_scale", text: "1:100", confidence: 0.3 } },
      OPTS,
    );
    expect(result.scale!.usable).toBe(false);
    expect(result.scale!.reason).toContain("below the");
  });

  it("a missing scale becomes the honest missing-scale record", () => {
    const result = sanitizeExtractionResponse({}, OPTS);
    expect(result.scale!.source).toBe("unknown");
    expect(result.scale!.reason).toContain("will not guess");
  });
});

describe("performance: never reprocess verified work (§24)", () => {
  const base: PlanExtraction = {
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
  };

  it("no existing extraction → extract", () => {
    expect(shouldReextract(null)).toBe(true);
  });

  it("an extraction with verified rooms → do NOT reprocess", () => {
    const verified: PlanExtraction = {
      ...base,
      rooms: [
        {
          id: "r1",
          name: "Room",
          spaceType: "bedroom" as const,
          length: explicitDimension(4, "m", 1),
          width: explicitDimension(3, "m", 1),
          height: null,
          openings: [],
          floor: 1,
          provenance: {
            documentId: "doc1",
            page: 1,
            method: "vision_model" as const,
          },
          confidence: 0.9,
          reviewStatus: "user_confirmed",
          corrections: [],
          extractedAt: "2026-09-07T00:00:00Z",
          verifiedAt: null,
        },
      ],
    };
    expect(shouldReextract(verified)).toBe(false);
  });

  it("force re-extraction is always allowed (user explicitly asks)", () => {
    const withVerifiedRoom: PlanExtraction = {
      ...base,
      rooms: [
        {
          id: "r1",
          name: "Room",
          spaceType: "bedroom",
          length: explicitDimension(4, "m", 1),
          width: explicitDimension(3, "m", 1),
          height: null,
          openings: [],
          floor: 1,
          provenance: { documentId: "doc1", page: 1, method: "vision_model" },
          confidence: 0.9,
          reviewStatus: "user_confirmed",
          corrections: [],
          extractedAt: "2026-09-07T00:00:00Z",
          verifiedAt: "2026-09-07T00:00:00Z",
        },
      ],
    };
    expect(shouldReextract(withVerifiedRoom, true)).toBe(true); // explicit force wins
    expect(shouldReextract(base, true)).toBe(true);
    expect(shouldReextract(null, false)).toBe(true);
  });

  it("an unreviewed extraction → reprocess", () => {
    expect(shouldReextract(base)).toBe(true);
  });
});
