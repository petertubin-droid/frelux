// =========================================================
// PLAN VISION TESTS — AI quantity takeoff (§10, §11, §12, §18)
// =========================================================

import { describe, it, expect } from "vitest";
import {
  buildTakeoffTrace,
  executeRoomTakeoff,
  executeTakeoffPlan,
  planRoomTakeoff,
  ROOM_TAKEOFF_CATALOG,
  summarizeRoomTakeoff,
  TAKEOFF_ENGINE_IDS,
} from "../takeoff";
import { confirmElement, editRoom, rejectElement } from "../review";
import { explicitDimension, unknownDimension } from "../dimensions";
import type { ExtractedRoom, PlanExtraction } from "../types";

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
    provenance: {
      documentId: "doc1",
      page: 1,
      quote: "BEDROOM 1 3600×3000",
      method: "vision_model",
    },
    confidence: 0.9,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function extraction(rooms: ExtractedRoom[]): PlanExtraction {
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
    issues: [],
    nativeUnit: "meters",
    extractedAt: "2026-09-07T00:00:00Z",
  };
}

describe("takeoff catalog (§10 — WHAT each calculator needs)", () => {
  it("every takeoff kind maps to a registered engine — no other path", () => {
    const ids = Object.values(TAKEOFF_ENGINE_IDS);
    expect(ids).toContain("painting_project");
    expect(ids).toContain("screeding_system");
    expect(ids).toContain("tile_estimate");
    expect(ids).toContain("pop_ceiling");
    expect(ids).toContain("build_to_roof");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("catalog declares requirements and assumptions for each kind", () => {
    for (const req of ROOM_TAKEOFF_CATALOG) {
      expect(req.requires.length).toBeGreaterThan(0);
      expect(req.assumptions.length).toBeGreaterThan(0);
      expect(req.description).toBeTruthy();
    }
  });
});

describe("multi-room takeoff planning (§12)", () => {
  it("creates one item per verified room per requested kind", () => {
    const items = planRoomTakeoff(
      extraction([confirmElement(room()), confirmElement(room())]),
      ["painting", "screeding"],
    );
    expect(items).toHaveLength(4); // 2 rooms × 2 kinds
    expect(items.filter((i) => i.kind === "painting")).toHaveLength(2);
  });

  it("marks rooms missing verified dimensions as missing_info — never invented (§13)", () => {
    const confirmed = confirmElement(room({ height: unknownDimension() }));
    const items = planRoomTakeoff(extraction([confirmed]), ["painting"]);
    expect(items[0].status).toBe("missing_info");
    expect(items[0].missing).toContain("height");
  });

  it("a CONFIRMED room with an unknown dimension is missing_info, not unverified (§8/§13)", () => {
    const confirmed = confirmElement(room({ length: unknownDimension() }));
    const items = planRoomTakeoff(extraction([confirmed]), ["screeding"]);
    expect(items[0].status).toBe("missing_info");
    expect(items[0].missing).toContain("length");
  });

  it("marks unverified rooms explicitly and refuses to plan them", () => {
    const items = planRoomTakeoff(extraction([room()]), ["painting"]);
    expect(items[0].status).toBe("unverified_room");
    expect(items[0].missing[0]).toContain("not yet verified");
  });

  it("excludes rejected rooms entirely", () => {
    const items = planRoomTakeoff(extraction([rejectElement(room())]), [
      "painting",
    ]);
    expect(items).toHaveLength(0);
  });

  it("reports missing floor-area dims for screeding (no height needed)", () => {
    const noHeight = editRoom(room({ height: unknownDimension() }), {
      lengthM: 4,
    });
    const items = planRoomTakeoff(extraction([noHeight]), ["screeding"]);
    expect(items[0].status).toBe("ready"); // screeding needs length+width only
    const painting = planRoomTakeoff(extraction([noHeight]), ["painting"]);
    expect(painting[0].status).toBe("missing_info");
  });

  it("carries provenance into every item (§7/§18)", () => {
    const items = planRoomTakeoff(extraction([confirmElement(room())]), [
      "painting",
    ]);
    expect(items[0].provenance.documentId).toBe("doc1");
    expect(items[0].provenance.quote).toContain("BEDROOM 1");
  });
});

describe("takeoff execution — engines only (§11)", () => {
  it("refuses to execute a non-ready item", async () => {
    const missing = planRoomTakeoff(
      extraction([confirmElement(room({ height: unknownDimension() }))]),
      ["painting"],
    );
    const result = await executeRoomTakeoff(missing[0]);
    expect(result.result).toBeUndefined(); // nothing ran
    expect(result.status).toBe("missing_info");
  });

  it("runs a ready item through its engine and records the result", async () => {
    const ready = planRoomTakeoff(extraction([confirmElement(room())]), [
      "tyrolene",
    ]);
    const result = await executeRoomTakeoff(ready[0]);
    expect(result.result).toBeDefined();
    expect(result.result!.engine).toBe("tyrolene_partition_area");
    expect(result.result!.ok).toBe(true);
  });

  it("executeTakeoffPlan runs the whole batch, leaving gaps visible", async () => {
    const plan = planRoomTakeoff(
      extraction([
        confirmElement(room()),
        confirmElement(room({ length: unknownDimension() })),
      ]),
      ["painting"],
    );
    const results = await executeTakeoffPlan(plan);
    expect(results[0].result).toBeDefined();
    expect(results[1].result).toBeUndefined();
    expect(results[1].status).toBe("missing_info");
  });

  it("an engine failure is reported honestly, never faked (§22)", async () => {
    const item = {
      roomId: "rX",
      roomName: "X",
      kind: "painting" as const,
      engineId: "nonexistent_engine",
      status: "ready" as const,
      missing: [],
      input: { lengthM: 4, widthM: 3, heightM: 3 },
      provenance: {
        documentId: "doc1",
        page: 1,
        method: "vision_model" as const,
      },
    };
    const result = await executeRoomTakeoff(item);
    expect(result.result!.ok).toBe(false);
    expect(result.result!.error).toBeTruthy();
  });
});

describe("takeoff summary (§12 — Room → dimensions → openings → finishes → quantity → status)", () => {
  it("renders the full §12 table row per room", async () => {
    const plan = planRoomTakeoff(extraction([confirmElement(room())]), [
      "painting",
    ]);
    const executed = await executeTakeoffPlan(plan);
    void executed;
    const rows = summarizeRoomTakeoff(
      extraction([confirmElement(room())]),
      "painting",
    );
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.roomName).toBeTruthy();
    expect(row.dimensions).toBe("4.00 × 3.00 m");
    expect(row.openings).toBe("none confirmed");
    expect(row.finishes).toBe("Painting");
    expect(row.status).toBe("ready");
  });
});

describe("traceability chain (§18)", () => {
  it("records quantity → calculator → verified input → source → assumptions", async () => {
    const plan = planRoomTakeoff(extraction([confirmElement(room())]), [
      "tyrolene",
    ]);
    const executed = await executeRoomTakeoff(plan[0]);
    const trace = buildTakeoffTrace(executed, ROOM_TAKEOFF_CATALOG);
    expect(trace.engineId).toBe("tyrolene_partition_area");
    expect(trace.inputs.length).toBe(4);
    expect(trace.source.documentId).toBe("doc1");
    expect(trace.source.quote).toContain("BEDROOM 1");
    expect(trace.assumptions.length).toBeGreaterThan(0);
    expect(trace.quantities.length).toBeGreaterThan(0);
    expect(trace.status).toBe("calculated");
  });

  it("an unexecuted item still traces its verified inputs and gaps", () => {
    const plan = planRoomTakeoff(
      extraction([confirmElement(room({ height: unknownDimension() }))]),
      ["painting"],
    );
    const trace = buildTakeoffTrace(plan[0], ROOM_TAKEOFF_CATALOG);
    expect(trace.quantities).toHaveLength(0);
    expect(trace.status).toBe("missing_info");
    expect(trace.inputs.height).toBeNull();
  });
});
