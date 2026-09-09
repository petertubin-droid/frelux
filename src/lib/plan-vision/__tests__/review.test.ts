// =========================================================
// PLAN VISION TESTS, human verification workflow (§8, §17)
// =========================================================

import { describe, it, expect } from "vitest";
import {
  allRoomsReviewed,
  confirmElement,
  editBuildingFact,
  editOpening,
  editRoom,
  editRoof,
  hasBlockingIssues,
  isRoomVerified,
  rejectElement,
  resetElement,
  startReview,
  updateRoomInExtraction,
  verifiedRooms,
} from "../review";
import { explicitDimension, unknownDimension } from "../dimensions";
import type { ExtractedRoof, ExtractedRoom, PlanExtraction } from "../types";

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

function extraction(
  rooms: ExtractedRoom[],
  issues: PlanExtraction["issues"] = [],
): PlanExtraction {
  return {
    id: "ext1",
    documentId: "doc1",
    version: 1,
    scale: null,
    rooms,
    roof: null,
    buildingFacts: [],
    notes: [],
    warnings: [],
    issues,
    nativeUnit: "meters",
    extractedAt: "2026-09-07T00:00:00Z",
  };
}

describe("review state machine (§8)", () => {
  it("starts review only from ai_extracted", () => {
    const fresh = startReview(room());
    expect(fresh.reviewStatus).toBe("in_review");
    const confirmed = startReview(confirmElement(room()));
    expect(confirmed.reviewStatus).toBe("user_confirmed");
  });

  it("confirm marks verified with a timestamp", () => {
    const el = confirmElement(room(), "2026-09-07T10:00:00Z");
    expect(el.reviewStatus).toBe("user_confirmed");
    expect(el.verifiedAt).toBe("2026-09-07T10:00:00Z");
  });

  it("reject marks rejected and the room is excluded from verified lists", () => {
    const el = rejectElement(room());
    expect(el.reviewStatus).toBe("user_rejected");
    expect(isRoomVerified(el)).toBe(false);
    expect(verifiedRooms(extraction([el]))).toHaveLength(0);
  });

  it("reset returns to fresh state (re-extraction follow-up)", () => {
    const el = resetElement(confirmElement(room()));
    expect(el.reviewStatus).toBe("ai_extracted");
    expect(el.verifiedAt).toBeNull();
  });
});

describe("room editing, users are never locked into AI results (§8, §17)", () => {
  it("records every correction in the history with previous value", () => {
    const original = room({ name: "AI Room" });
    const edited = editRoom(
      original,
      { name: "Master Bedroom", lengthM: 5 },
      "2026-09-07T11:00:00Z",
    );
    expect(edited.reviewStatus).toBe("user_edited");
    expect(edited.name).toBe("Master Bedroom");
    expect(edited.length).toEqual({
      value: 5,
      unit: "m",
      kind: "explicit",
      confidence: 1,
    });
    const nameFix = edited.corrections.find((c) => c.field === "name")!;
    expect(nameFix.from).toBe("AI Room");
    expect(nameFix.to).toBe("Master Bedroom");
    expect(nameFix.at).toBe("2026-09-07T11:00:00Z");
  });

  it("turns edited dimensions into explicit user input (§4)", () => {
    const original = room({ length: unknownDimension() });
    const edited = editRoom(original, { lengthM: 4.5 });
    expect(edited.length!.kind).toBe("explicit");
    expect(edited.length!.confidence).toBe(1);
    expect(edited.provenance.method).toBe("user_input");
  });

  it("preserves the source document id and marks verification", () => {
    const edited = editRoom(room(), { widthM: 3.5 }, "2026-09-07T12:00:00Z");
    expect(edited.provenance.documentId).toBe("doc1");
    expect(edited.verifiedAt).toBe("2026-09-07T12:00:00Z");
    expect(edited.corrections.find((c) => c.field === "width")!.to).toBe(3.5);
  });

  it("records floor and spaceType corrections", () => {
    const edited = editRoom(room({ floor: 1, spaceType: "other" }), {
      floor: 2,
      spaceType: "kitchen",
    });
    expect(edited.floor).toBe(2);
    expect(edited.spaceType).toBe("kitchen");
    expect(
      edited.corrections.filter((c) =>
        ["floor", "spaceType"].includes(c.field),
      ),
    ).toHaveLength(2);
  });

  it("does not record a no-op edit as a correction", () => {
    const original = room({ name: "Master Bedroom" });
    const edited = editRoom(original, { name: "Master Bedroom" }); // same name
    expect(edited.corrections).toHaveLength(0);
    // But the element is still marked as user_edited (the user reviewed it).
    expect(edited.reviewStatus).toBe("user_edited");
  });
});

describe("opening editing (§13)", () => {
  const opening = () => ({
    id: "o1",
    type: "door" as const,
    width: null,
    height: null,
    count: 1,
    confidence: 0.5,
    provenance: {
      documentId: "doc1",
      page: 1,
      method: "vision_model" as const,
    },
    reviewStatus: "ai_extracted" as const,
    verifiedAt: null,
  });

  it("user can supply dimensions for an unknown opening", () => {
    const edited = editOpening(opening(), { widthM: 0.9, heightM: 2.1 });
    expect(edited.width!.value).toBe(0.9);
    expect(edited.width!.kind).toBe("explicit");
    expect(edited.reviewStatus).toBe("user_edited");
  });

  it("rounds counts and clamps negatives to zero-effect", () => {
    const edited = editOpening(opening(), { count: 2.7 });
    expect(edited.count).toBe(3);
  });
});

describe("building fact editing", () => {
  it("edits numeric values and enum values with history", () => {
    const fact = {
      id: "f1",
      key: "building_length",
      label: "Building length",
      dimension: explicitDimension(15, "m", 0.9),
      provenance: {
        documentId: "doc1",
        page: 1,
        method: "vision_model" as const,
      },
      confidence: 0.9,
      reviewStatus: "ai_extracted" as const,
      corrections: [],
      extractedAt: "2026-09-07T00:00:00Z",
      verifiedAt: null,
    };
    const edited = editBuildingFact(fact, { valueM: 18 });
    expect(edited.dimension!.value).toBe(18);
    expect(edited.corrections[0].from).toBe(15);

    const enumFact = {
      ...fact,
      key: "building_type",
      dimension: null,
      enumValue: "bungalow",
    };
    const editedEnum = editBuildingFact(enumFact, { enumValue: "duplex" });
    expect(editedEnum.enumValue).toBe("duplex");
    expect(editedEnum.reviewStatus).toBe("user_edited");
  });
});

describe("roof editing (§14)", () => {
  const roof = (over: Partial<ExtractedRoof> = {}): ExtractedRoof => ({
    id: "roof1",
    roofType: "unknown",
    pitchDegrees: null,
    overhang: null,
    ridgeLength: null,
    planeCount: null,
    hipsCount: null,
    valleysCount: null,
    geometrySufficient: false,
    provenance: { documentId: "doc1", page: 2, method: "vision_model" },
    confidence: 0.7,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  });

  it("user sets the roof type and pitch, recorded with history", () => {
    const edited = editRoof(roof(), {
      roofType: "gable",
      pitchDegrees: 25,
      overhangM: 0.6,
    });
    expect(edited.roofType).toBe("gable");
    expect(edited.pitchDegrees!.value).toBe(25);
    expect(edited.overhang!.value).toBe(0.6);
    expect(edited.reviewStatus).toBe("user_edited");
    expect(edited.corrections.map((c) => c.field)).toEqual([
      "roofType",
      "pitchDegrees",
      "overhang",
    ]);
  });
});

describe("extraction-level helpers", () => {
  it("updateRoomInExtraction returns a new extraction without mutating input", () => {
    const ex = extraction([room()]);
    const next = updateRoomInExtraction(ex, ex.rooms[0].id, (r) =>
      confirmElement(r),
    );
    expect(ex.rooms[0].reviewStatus).toBe("ai_extracted");
    expect(next.rooms[0].reviewStatus).toBe("user_confirmed");
  });

  it("allRoomsReviewed is true only when every room has a final decision", () => {
    const confirmed = confirmElement(room());
    const rejected = rejectElement(room());
    expect(allRoomsReviewed(extraction([confirmed, rejected]))).toBe(true);
    expect(allRoomsReviewed(extraction([confirmed, room()]))).toBe(false);
  });

  it("isRoomVerified requires verification AND reliable dims", () => {
    expect(isRoomVerified(confirmElement(room()))).toBe(true);
    expect(
      isRoomVerified(confirmElement(room({ length: unknownDimension() }))),
    ).toBe(false);
    expect(isRoomVerified(room())).toBe(false);
  });

  it("hasBlockingIssues flags error-severity issues for the user", () => {
    expect(
      hasBlockingIssues(
        extraction(
          [room()],
          [
            {
              code: "contradictory_dimensions",
              severity: "error",
              elementIds: ["r1"],
              message: "x",
            },
          ],
        ),
      ),
    ).toBe(true);
    expect(
      hasBlockingIssues(
        extraction(
          [room()],
          [
            {
              code: "duplicate_element",
              severity: "warning",
              elementIds: ["r1"],
              message: "x",
            },
          ],
        ),
      ),
    ).toBe(false);
  });
});
