// =========================================================
// PLAN VISION TESTS, AI quantity takeoff (§10, §11, §12, §18)
// =========================================================

import { describe, it, expect, vi } from "vitest";
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

// ---------------------------------------------------------
// In-memory supabase, the screeding engine fetches its
// admin-configured system config and the POP engine fetches
// its material list; both are seeded here (the same data the
// manual calculators read in production).
// ---------------------------------------------------------
const SCREED_CONFIG_ROW = {
  id: "sc-1",
  system_type: "white_cement_paint",
  display_name: "White Cement + Screeding Paint",
  description: "Combined White Cement and Screeding Paint calculation.",
  coverage_area_m2: 20,
  coverage_unit: "m²",
  default_coats: 2,
  waste_percentage: 20,
  currency: "NGN",
  currency_symbol: "₦",
  putty_name: null,
  putty_quantity: null,
  putty_unit: null,
  putty_price_per_unit: null,
  paint_name: "Screeding Paint",
  paint_quantity: 2,
  paint_unit: "bucket",
  paint_price_per_unit: 25000,
  cement_name: "White Cement",
  cement_quantity: 1,
  cement_unit: "bag",
  cement_price_per_unit: 7500,
  extra_enabled: null,
  extra_name: null,
  extra_quantity: null,
  extra_unit: null,
  extra_price_per_unit: null,
  rounding_rule: "ceil",
  is_active: true,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const POP_MATERIAL_ROW = {
  id: "pop-1",
  workflow: "nigeria",
  category: "primary",
  name: "POP Cement",
  description: null,
  unit: "bag",
  coverage_rate: 10,
  coverage_unit: "m²",
  package_size: 1,
  package_unit: "bag",
  unit_price: 3500,
  labour_rate_per_sqm: 0,
  is_optional: false,
  currency: "NGN",
  is_active: true,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const MOCK_TABLES: Record<string, Array<Record<string, unknown>>> = {
  screeding_system_config: [SCREED_CONFIG_ROW],
  pop_materials: [POP_MATERIAL_ROW],
};

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    const rows = () => MOCK_TABLES[table] ?? [];
    const eqs: Array<[string, unknown]> = [];
    let countHead = false;
    const filtered = () =>
      rows().filter((r) => eqs.every(([k, v]) => r[k] === v));
    const c: Record<string, unknown> = {
      select: (_cols?: unknown, opts?: { head?: boolean; count?: string }) => {
        if (opts?.head && opts.count) countHead = true;
        return c;
      },
      eq: (col: string, val: unknown) => {
        eqs.push([col, val]);
        return c;
      },
      order: () => c,
      limit: () => c,
      maybeSingle: () =>
        Promise.resolve({
          data: filtered()[0] ? { ...filtered()[0] } : null,
          error: null,
        }),
      single: () =>
        Promise.resolve({
          data: filtered()[0] ? { ...filtered()[0] } : null,
          error: null,
        }),
      then: (resolve: (v: unknown) => unknown) =>
        resolve({
          data: filtered().map((r) => ({ ...r })),
          error: null,
          count: countHead ? filtered().length : null,
        }),
    };
    return c;
  }
  return { supabase: { from }, isSupabaseConfigured: true };
});

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

describe("takeoff catalog (§10, WHAT each calculator needs)", () => {
  it("every takeoff kind maps to a registered engine, no other path", () => {
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

  it("marks rooms missing verified dimensions as missing_info, never invented (§13)", () => {
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

  it("screeding needs the WALL height too (net wall area = perimeter × height − openings)", () => {
    const noHeight = editRoom(room({ height: unknownDimension() }), {
      lengthM: 4,
    });
    const items = planRoomTakeoff(extraction([noHeight]), ["screeding"]);
    expect(items[0].status).toBe("missing_info");
    expect(items[0].missing).toContain("height");
    // POP ceiling is a footprint calculation, height not required.
    const pop = planRoomTakeoff(extraction([noHeight]), ["pop_ceiling"]);
    expect(pop[0].status).toBe("ready");
  });

  it("carries provenance into every item (§7/§18)", () => {
    const items = planRoomTakeoff(extraction([confirmElement(room())]), [
      "painting",
    ]);
    expect(items[0].provenance.documentId).toBe("doc1");
    expect(items[0].provenance.quote).toContain("BEDROOM 1");
  });
});

describe("takeoff execution, engines only (§11)", () => {
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

describe("takeoff summary (§12, Room → dimensions → openings → finishes → quantity → status)", () => {
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

// =========================================================
// STAGE 15 RE-AUDIT, ENGINE CONTRACT BOUNDARIES
//
// Each takeoff kind must feed its engine the measurement the
// engine's OWN contract expects, per FRELUX's actual calculator
// semantics, inputs are mapped, never renamed or reinterpreted
// to make a test pass:
//
//   screeding_system  ← net WALL area (full-room: perimeter ×
//                      height − confirmed openings), NOT floor area
//   tile_estimate    ← floor area (L × W), blocked until the
//                      user's tile selection exists
//   pop_ceiling      ← the room footprint (ceiling plane = L × W)
// =========================================================

function opening(
  id: string,
  type: "door" | "window",
  w: number,
  h: number,
  count: number,
  reviewStatus: "user_confirmed" | "ai_extracted",
): ExtractedRoom["openings"][number] {
  return {
    id,
    type,
    width: explicitDimension(w, "m", 1),
    height: explicitDimension(h, "m", 1),
    count,
    confidence: 1,
    provenance: {
      documentId: "doc1",
      page: 1,
      quote: `${type.toUpperCase()} ${w * 1000}x${h * 1000}`,
      method: "vision_model",
    },
    reviewStatus,
  };
}

describe("engine contract boundaries (Stage 15 re-audit, FRELUX measurement semantics)", () => {
  it("SCREEDING: planner derives the NET WALL area (perimeter × height − CONFIRMED openings); the engine receives areaM2", async () => {
    const confirmed = confirmElement(
      room({
        openings: [
          opening("op-door", "door", 0.9, 2.1, 1, "user_confirmed"),
          opening("op-win", "window", 1.5, 1.5, 2, "ai_extracted"),
        ],
      }),
    );
    const items = planRoomTakeoff(extraction([confirmed]), ["screeding"]);
    expect(items[0].status).toBe("ready");

    // Independent FRELUX full-room arithmetic:
    //   gross wall area = 2 × (4 + 3) × 3 = 42 m²
    //   confirmed door  = 0.9 × 2.1 × 1 = 1.89 m² (deducted)
    //   unconfirmed windows = NEVER deducted (AI dims are not money math)
    //   net wall area = 40.11 m², wall surface, not floor area (12 m²)
    expect(items[0].input.netWallAreaM2).toBeCloseTo(40.11, 8);

    const executed = await executeTakeoffPlan(items);
    expect(executed[0].result?.ok).toBe(true);
    expect(executed[0].result!.quantities[0]).toMatchObject({
      label: "Net screeding area",
    });
    expect(executed[0].result!.quantities[0].quantity).toBeCloseTo(40.11, 6);

    // Boundary: identical output to the engine invoked DIRECTLY with
    // the documented contract input, the takeoff adds nothing.
    const { executeEngine } =
      await import("@/lib/ai-foundation/engines-registry");
    const direct = await executeEngine("screeding_system", {
      areaM2: items[0].input.netWallAreaM2,
    });
    expect(direct.ok).toBe(true);
    expect(executed[0].result!.quantities).toEqual(direct.quantities);
    expect(executed[0].result!.costs).toEqual(direct.costs);
  });

  it("SCREEDING: no confirmed openings → the full gross wall area is the net area", () => {
    const confirmed = confirmElement(room()); // 4 × 3 × 3, no openings
    const items = planRoomTakeoff(extraction([confirmed]), ["screeding"]);
    expect(items[0].status).toBe("ready");
    expect(items[0].input.netWallAreaM2).toBe(42); // 2 × (4 + 3) × 3
  });

  it("POP CEILING: engine receives the room footprint, the ceiling plane (length × width)", async () => {
    const confirmed = confirmElement(room()); // 4 × 3 × 3
    const items = planRoomTakeoff(extraction([confirmed]), ["pop_ceiling"]);
    expect(items[0].status).toBe("ready");

    const executed = await executeTakeoffPlan(items);
    expect(executed[0].result?.ok).toBe(true);
    // Independent: ceiling area = 4 × 3 = 12 m² (height plays no part).
    expect(executed[0].result!.quantities[0]).toMatchObject({
      label: "Ceiling area",
      quantity: 12,
    });

    const { executeEngine } =
      await import("@/lib/ai-foundation/engines-registry");
    const direct = await executeEngine("pop_ceiling", {
      roomLength: 4,
      roomWidth: 3,
      unit: "meters",
    });
    expect(direct.ok).toBe(true);
    expect(executed[0].result!.quantities).toEqual(direct.quantities);
  });

  it("TILING: blocked until a tile selection exists, the gap states the FLOOR-area basis; nothing is invented", async () => {
    const confirmed = confirmElement(room());
    const items = planRoomTakeoff(extraction([confirmed]), ["tiling"]);
    expect(items[0].status).toBe("missing_info");
    const gap = items[0].missing.join(" ");
    expect(gap).toMatch(/tile selection/i);
    expect(gap).toMatch(/floor area/i);

    // Blocked items are never executed, the gap stays visible.
    const executed = await executeTakeoffPlan(items);
    expect(executed[0].result).toBeUndefined();
    expect(executed[0].status).toBe("missing_info");
  });
});
