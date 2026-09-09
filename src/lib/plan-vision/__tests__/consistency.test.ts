// =========================================================
// PLAN VISION TESTS, geometric consistency (§6)
// =========================================================

import { describe, it, expect } from "vitest";
import {
  checkAreaTotals,
  checkOpenings,
  findContradictoryFacts,
  findDuplicateRooms,
  findImpossibleRooms,
  footprintFromFacts,
  validateExtraction,
} from "../consistency";
import {
  explicitDimension,
  inferredDimension,
  unknownDimension,
} from "../dimensions";
import type { ExtractedBuildingFact, ExtractedRoom } from "../types";

// ── Fixture builders ──

let seq = 0;
function room(over: Partial<ExtractedRoom> = {}): ExtractedRoom {
  seq++;
  return {
    id: `r${seq}`,
    name: `Room ${seq}`,
    spaceType: "bedroom",
    length: explicitDimension(4, "m", 0.95),
    width: explicitDimension(3, "m", 0.95),
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

describe("impossible rooms (§6)", () => {
  it("flags a room larger than the building footprint as an error", () => {
    const issues = findImpossibleRooms(
      [room({ length: explicitDimension(30, "m", 0.9) })],
      12,
      10,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("room_exceeds_footprint");
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("larger than the building footprint");
  });

  it("flags an absurdly large single room even without a footprint", () => {
    const issues = findImpossibleRooms(
      [
        room({
          length: explicitDimension(40, "m", 0.9),
          width: explicitDimension(35, "m", 0.9),
        }),
      ],
      null,
      null,
    );
    expect(
      issues.some(
        (i) => i.code === "room_exceeds_footprint" && i.severity === "error",
      ),
    ).toBe(true);
  });

  it("flags non-positive dimensions as impossible geometry", () => {
    const issues = findImpossibleRooms(
      [room({ length: explicitDimension(0, "m", 0.9) })],
      null,
      null,
    );
    expect(issues[0].code).toBe("room_exceeds_footprint");
    expect(issues[0].severity).toBe("error");
  });

  it("flags rooms missing dimensions as missing, never infers (§4)", () => {
    const issues = findImpossibleRooms(
      [room({ width: unknownDimension() })],
      null,
      null,
    );
    expect(issues[0].code).toBe("missing_dimension");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toContain("will not infer");
  });

  it("accepts plausible rooms without issues", () => {
    expect(findImpossibleRooms([room()], 12, 10)).toHaveLength(0);
  });
});

describe("duplicate detection (§6)", () => {
  it("detects same type + floor + near-identical dimensions", () => {
    const a = room({
      name: "Bedroom A",
      length: explicitDimension(4, "m", 0.9),
      width: explicitDimension(3, "m", 0.9),
    });
    const b = room({
      name: "Bedroom B",
      length: explicitDimension(4.02, "m", 0.9),
      width: explicitDimension(3.01, "m", 0.9),
    });
    const issues = findDuplicateRooms([a, b]);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("duplicate_element");
    expect(issues[0].message).toContain("Bedroom A");
    expect(issues[0].message).toContain("Bedroom B");
  });

  it("does not flag different floors as duplicates", () => {
    const a = room({ floor: 1 });
    const b = room({ floor: 2 });
    expect(findDuplicateRooms([a, b])).toHaveLength(0);
  });

  it("does not flag different types with identical dims", () => {
    const a = room({ spaceType: "bedroom" });
    const b = room({ spaceType: "kitchen" });
    expect(findDuplicateRooms([a, b])).toHaveLength(0);
  });
});

describe("contradictory facts (§6)", () => {
  it("flags the same fact key with materially different values", () => {
    const issues = findContradictoryFacts([
      fact("building_length", 15),
      fact("building_length", 12),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("contradictory_dimensions");
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("will not silently pick one");
  });

  it("compares unit-safely (mm drawing vs m fact)", () => {
    const issues = findContradictoryFacts([
      fact("building_length", 15),
      {
        ...fact("building_length", 15000),
        dimension: explicitDimension(15000, "mm", 0.95),
      },
    ]);
    expect(issues).toHaveLength(0);
  });

  it("ignores rejected and unknown facts", () => {
    expect(
      findContradictoryFacts([
        fact("building_length", 15, { reviewStatus: "user_rejected" }),
        fact("building_length", 12),
      ]),
    ).toHaveLength(0);
    expect(
      findContradictoryFacts([
        fact("building_length", 15, { dimension: unknownDimension() }),
        fact("building_length", 12),
      ]),
    ).toHaveLength(0);
  });
});

describe("area totals (§6)", () => {
  it("flags room sums that exceed the footprint beyond tolerance", () => {
    const rooms = [
      room({
        length: explicitDimension(11, "m", 0.9),
        width: explicitDimension(9, "m", 0.9),
      }),
    ];
    const issues = checkAreaTotals(rooms, 100); // room area 99 vs footprint 100*1.15 ok, use tighter footprint
    expect(issues).toHaveLength(0);

    const tooBig = checkAreaTotals(rooms, 50); // 99 m² room on a 50 m² footprint
    expect(tooBig).toHaveLength(1);
    expect(tooBig[0].code).toBe("inconsistent_totals");
  });

  it("never claims inconsistency from a partial sum", () => {
    const rooms = [room(), room({ width: unknownDimension() })];
    expect(checkAreaTotals(rooms, 1)).toHaveLength(0);
  });

  it("counts floors before comparing", () => {
    const r1 = room({
      floor: 1,
      length: explicitDimension(11, "m", 0.9),
      width: explicitDimension(9, "m", 0.9),
    });
    const r2 = room({
      floor: 2,
      length: explicitDimension(11, "m", 0.9),
      width: explicitDimension(9, "m", 0.9),
    });
    // 99+99 = 198 m² over two floors of 100 m² footprint → allowed.
    expect(checkAreaTotals([r1, r2], 100)).toHaveLength(0);
  });
});

describe("openings (§13)", () => {
  const opening = (over: Record<string, unknown>) => ({
    id: "o1",
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
    reviewStatus: "ai_extracted" as const,
    verifiedAt: null,
    ...over,
  });

  it("flags openings with unknown dimensions as requiring confirmation", () => {
    const issues = checkOpenings([
      room({ openings: [opening({ width: unknownDimension() })] }),
    ]);
    expect(issues[0].code).toBe("missing_dimension");
    expect(issues[0].message).toContain("will not invent dimensions");
  });

  it("flags implausibly small openings", () => {
    const issues = checkOpenings([
      room({
        openings: [opening({ width: explicitDimension(0.05, "m", 0.9) })],
      }),
    ]);
    expect(issues[0].code).toBe("impossible_opening");
  });

  it("flags openings wider than the room itself", () => {
    const issues = checkOpenings([
      room({
        openings: [opening({ width: explicitDimension(4.5, "m", 0.9) })],
      }),
    ]);
    expect(issues[0].code).toBe("impossible_opening");
    expect(issues[0].message).toContain("wider");
  });

  it("flags openings taller than the wall", () => {
    const issues = checkOpenings([
      room({
        openings: [opening({ height: explicitDimension(3.5, "m", 0.9) })],
      }),
    ]);
    expect(issues[0].code).toBe("impossible_opening");
    expect(issues[0].message).toContain("taller");
  });

  it("accepts plausible openings", () => {
    expect(checkOpenings([room({ openings: [opening({})] })])).toHaveLength(0);
  });
});

describe("footprint extraction from facts", () => {
  it("derives footprint area from length × width facts", () => {
    const fp = footprintFromFacts([
      fact("building_length", 15),
      fact("building_width", 10),
    ]);
    expect(fp.lengthM).toBe(15);
    expect(fp.widthM).toBe(10);
    expect(fp.areaM2).toBe(150);
  });

  it("returns nulls when facts are missing", () => {
    const fp = footprintFromFacts([fact("building_length", 15)]);
    expect(fp.widthM).toBeNull();
    expect(fp.areaM2).toBeNull();
  });
});

describe("full validation pass (§6)", () => {
  it("aggregates all issue types and excludes rejected rooms", () => {
    const rooms = [
      room({ length: explicitDimension(30, "m", 0.9) }), // exceeds footprint
      room({
        reviewStatus: "user_rejected",
        length: explicitDimension(999, "m", 0.9),
      }), // ignored
    ];
    const facts = [fact("building_length", 15), fact("building_width", 10)];
    const issues = validateExtraction(rooms, facts);
    expect(issues.every((i) => i.elementIds.length > 0)).toBe(true);
    expect(issues.some((i) => i.code === "room_exceeds_footprint")).toBe(true);
    // The rejected 999 m room must NOT appear.
    expect(
      issues.every(
        (i) =>
          !i.elementIds.includes("r2") || i.code !== "room_exceeds_footprint",
      ),
    ).toBe(true);
  });

  it("is deterministic, same input, same issues, same order", () => {
    const rooms = [
      room(),
      room({ name: "Same", length: explicitDimension(4, "m", 0.9) }),
    ];
    const facts = [fact("building_length", 15), fact("building_width", 10)];
    const a = validateExtraction(rooms, facts);
    const b = validateExtraction(rooms, facts);
    expect(a).toEqual(b);
  });

  it("flags inferred room dimensions used against footprint too", () => {
    const rooms = [room({ length: inferredDimension(40, "m", 0.5) })];
    const issues = validateExtraction(rooms, [
      fact("building_length", 15),
      fact("building_width", 10),
    ]);
    expect(issues.some((i) => i.code === "room_exceeds_footprint")).toBe(true);
  });
});
