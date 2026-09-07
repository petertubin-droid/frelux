// =========================================================
// PLAN VISION TESTS — multi-document reconciliation (§15, §16)
// =========================================================

import { describe, it, expect } from "vitest";
import {
  allConflictsResolved,
  detectDocumentConflicts,
  mergeBuildingFacts,
  mergeRooms,
  resolveConflict,
  suggestConflictCandidate,
} from "../reconciliation";
import {
  explicitDimension,
  inferredDimension,
  unknownDimension,
} from "../dimensions";
import type {
  ExtractedBuildingFact,
  ExtractedRoom,
  PlanExtraction,
} from "../types";

let seq = 0;
function fact(
  key: string,
  valueM: number,
  docId = "doc1",
  over: Partial<ExtractedBuildingFact> = {},
): ExtractedBuildingFact {
  seq++;
  return {
    id: `f${seq}`,
    key,
    label: key.replace(/_/g, " "),
    dimension: explicitDimension(valueM, "m", 0.9),
    provenance: { documentId: docId, page: 1, method: "vision_model" },
    confidence: 0.9,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function room(
  name: string,
  docId = "doc1",
  over: Partial<ExtractedRoom> = {},
): ExtractedRoom {
  seq++;
  return {
    id: `r${seq}`,
    name,
    spaceType: "bedroom",
    length: explicitDimension(4, "m", 0.9),
    width: explicitDimension(3, "m", 0.9),
    height: null,
    openings: [],
    floor: 1,
    provenance: { documentId: docId, page: 1, method: "vision_model" },
    confidence: 0.9,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function extraction(
  docId: string,
  over: Partial<PlanExtraction> = {},
): PlanExtraction {
  return {
    id: `ext_${docId}`,
    documentId: docId,
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

describe("conflict detection (§15)", () => {
  it("detects disagreeing numeric facts across documents", () => {
    const conflicts = detectDocumentConflicts([
      extraction("doc1", {
        buildingFacts: [fact("building_length", 15, "doc1")],
      }),
      extraction("doc2", {
        buildingFacts: [fact("building_length", 12, "doc2")],
      }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe("building_length");
    expect(conflicts[0].resolution).toBe("unresolved");
    expect(conflicts[0].candidates).toHaveLength(2);
  });

  it("does not flag agreeing documents (unit-safe)", () => {
    const conflicts = detectDocumentConflicts([
      extraction("doc1", {
        buildingFacts: [fact("building_length", 15, "doc1")],
      }),
      extraction("doc2", {
        buildingFacts: [
          {
            ...fact("building_length", 15000, "doc2"),
            dimension: explicitDimension(15000, "mm", 0.9),
          },
        ],
      }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("never treats unknown values as disagreements", () => {
    const conflicts = detectDocumentConflicts([
      extraction("doc1", {
        buildingFacts: [fact("building_length", 15, "doc1")],
      }),
      extraction("doc2", {
        buildingFacts: [
          fact("building_length", 0, "doc2", { dimension: unknownDimension() }),
        ],
      }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("ignores rejected facts", () => {
    const conflicts = detectDocumentConflicts([
      extraction("doc1", {
        buildingFacts: [
          fact("building_length", 15, "doc1", {
            reviewStatus: "user_rejected",
          }),
        ],
      }),
      extraction("doc2", {
        buildingFacts: [fact("building_length", 12, "doc2")],
      }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("requires at least two documents", () => {
    expect(detectDocumentConflicts([extraction("doc1")])).toHaveLength(0);
  });
});

describe("room merging (§15)", () => {
  it("merges the same room from two documents into one row", () => {
    const { rooms, conflicts } = mergeRooms([
      extraction("doc1", { rooms: [room("BEDROOM 1", "doc1")] }),
      extraction("doc2", { rooms: [room("bedroom 1", "doc2")] }), // same name, case-insensitive
    ]);
    expect(rooms).toHaveLength(1);
    expect(conflicts).toHaveLength(0);
  });

  it("surfaces a conflict when the same room has contradictory dimensions", () => {
    const { rooms, conflicts } = mergeRooms([
      extraction("doc1", {
        rooms: [
          room("BEDROOM 1", "doc1", { length: explicitDimension(4, "m", 0.9) }),
        ],
      }),
      extraction("doc2", {
        rooms: [
          room("BEDROOM 1", "doc2", { length: explicitDimension(6, "m", 0.9) }),
        ],
      }),
    ]);
    expect(rooms).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].label).toContain("BEDROOM 1");
  });

  it("keeps rooms from different floors separate", () => {
    const { rooms } = mergeRooms([
      extraction("doc1", { rooms: [room("BEDROOM 1", "doc1", { floor: 1 })] }),
      extraction("doc2", { rooms: [room("BEDROOM 1", "doc2", { floor: 2 })] }),
    ]);
    expect(rooms).toHaveLength(2);
  });

  it("skips rejected rooms", () => {
    const { rooms } = mergeRooms([
      extraction("doc1", {
        rooms: [room("GHOST", "doc1", { reviewStatus: "user_rejected" })],
      }),
    ]);
    expect(rooms).toHaveLength(0);
  });
});

describe("building fact merging (§15)", () => {
  it("merges agreeing facts without conflicts", () => {
    const { facts, conflicts } = mergeBuildingFacts([
      extraction("doc1", {
        buildingFacts: [fact("building_length", 15, "doc1")],
      }),
      extraction("doc2", {
        buildingFacts: [fact("building_width", 10, "doc2")],
      }),
    ]);
    expect(facts.map((f) => f.key).sort()).toEqual([
      "building_length",
      "building_width",
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("keeps one candidate row for a conflicting fact and carries the conflict", () => {
    const { facts, conflicts } = mergeBuildingFacts([
      extraction("doc1", {
        buildingFacts: [fact("building_length", 15, "doc1")],
      }),
      extraction("doc2", {
        buildingFacts: [fact("building_length", 12, "doc2")],
      }),
    ]);
    expect(facts.filter((f) => f.key === "building_length")).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
  });
});

describe("conflict resolution — the user decides (§15)", () => {
  const conflicting = () =>
    detectDocumentConflicts([
      extraction("doc1", {
        buildingFacts: [fact("building_length", 15, "doc1")],
      }),
      extraction("doc2", {
        buildingFacts: [fact("building_length", 12, "doc2")],
      }),
    ])[0];

  it("resolution requires an explicit user choice", () => {
    const resolved = resolveConflict(
      [conflicting()],
      "building_length",
      "keep_first",
      -1,
    );
    expect(resolved[0].resolution).toBe("keep_first");
    expect((resolved[0].resolvedValue as { value: number }).value).toBe(15);
    expect(allConflictsResolved(resolved)).toBe(true);
  });

  it("keep_second stores the chosen candidate value", () => {
    const resolved = resolveConflict(
      [conflicting()],
      "building_length",
      "keep_second",
      1,
    );
    expect((resolved[0].resolvedValue as { value: number }).value).toBe(12);
  });

  it("unresolved conflicts block takeoff", () => {
    expect(allConflictsResolved([conflicting()])).toBe(false);
  });
});

describe("suggestion ranking — dimensioned drawings outrank photos (§16)", () => {
  it("suggests the dimension-grade document over the photo", () => {
    const conflicts = detectDocumentConflicts([
      extraction("doc1", {
        buildingFacts: [fact("building_length", 15, "doc1")],
      }),
      extraction("doc2", {
        buildingFacts: [
          fact("building_length", 12, "doc2", {
            dimension: inferredDimension(12, "m", 0.95),
          }),
        ],
      }),
    ]);
    expect(conflicts).toHaveLength(1);
    const suggested = suggestConflictCandidate(conflicts[0], {
      doc1: "dimensioned_drawing",
      doc2: "visual_only",
    });
    expect(conflicts[0].candidates[suggested].documentId).toBe("doc1");
  });

  it("falls back to confidence when reliabilities are equal", () => {
    const conflicts = detectDocumentConflicts([
      extraction("doc1", {
        buildingFacts: [
          fact("building_length", 15, "doc1", { confidence: 0.95 }),
        ],
      }),
      extraction("doc2", {
        buildingFacts: [
          fact("building_length", 12, "doc2", { confidence: 0.6 }),
        ],
      }),
    ]);
    const suggested = suggestConflictCandidate(conflicts[0], {
      doc1: "dimensioned_drawing",
      doc2: "dimensioned_drawing",
    });
    expect(conflicts[0].candidates[suggested].documentId).toBe("doc1");
  });
});
