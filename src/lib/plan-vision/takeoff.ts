// =========================================================
// FRELUX PLAN VISION — AI QUANTITY TAKEOFF PLANNER (§10–12)
//
//   Verified building data → WHAT information each FRELUX
//   calculator needs → deterministic FRELUX engines → HOW MUCH
//   is required.
//
// THE AI DETERMINES WHAT. THE ENGINES DETERMINE HOW MUCH.
// This planner contains ZERO construction mathematics: it maps
// VERIFIED building data to calculator inputs and calls the
// authoritative engines through the AI Foundation registry.
// No formulas are duplicated here or in any AI prompt.
//
// §12 MULTI-ROOM: an N-room house becomes a structured room
// list; each verified room is processed through the appropriate
// engine with per-room provenance, quantity and status.
//
// §18 TRACEABILITY: every takeoff line carries the full chain:
//   quantity → calculator → verified input → source document
//   → calculation assumptions.
// =========================================================

import type { ExtractedRoom, PlanExtraction } from "./types";
import { dimensionToMeters, isUnknown } from "./dimensions";
import { isRoomVerified } from "./review";
import type { Space } from "@/lib/measurement/space-engine";
import type { EngineResult } from "@/lib/ai-foundation/types";

// =========================================================
// TAKEOFF CATALOG — WHAT each calculator requires (§10)
// =========================================================

export type TakeoffKind =
  | "painting" // FRELUX painting methodology (painting_project engine)
  | "screeding" // m² methodology (screeding_system engine)
  | "tiling" // tile_estimate engine
  | "pop_ceiling" // pop_ceiling engine
  | "tyrolene" // tyrolene_partition_area engine
  | "roofing" // roof_geometry engine
  | "building"; // build_to_roof engine (whole building);

export const TAKEOFF_KIND_LABELS: Record<TakeoffKind, string> = {
  painting: "Painting",
  screeding: "Screeding",
  tiling: "Tiling",
  pop_ceiling: "POP Ceiling",
  tyrolene: "Tyrolene",
  roofing: "Roofing",
  building: "Whole Building (Build-to-Roof)",
};

/** The registered engine each takeoff runs through — no other path. */
export const TAKEOFF_ENGINE_IDS: Record<TakeoffKind, string> = {
  painting: "painting_project",
  screeding: "screeding_system",
  tiling: "tile_estimate",
  pop_ceiling: "pop_ceiling",
  tyrolene: "tyrolene_partition_area",
  roofing: "roof_geometry",
  building: "build_to_roof",
};

/** Input fields each per-room takeoff needs from a VERIFIED room. */
export interface RoomTakeoffRequirement {
  kind: TakeoffKind;
  /** Human explanation of what this calculator computes. */
  description: string;
  /** Fields a verified room must have (missing ones are requested). */
  requires: Array<"length" | "width" | "height">;
  /** Assumptions the engine will apply (engine defaults, traceable). */
  assumptions: string[];
  /** Space types this takeoff typically applies to. */
  applicableSpaceTypes?: Space["type"][];
}

export const ROOM_TAKEOFF_CATALOG: RoomTakeoffRequirement[] = [
  {
    kind: "painting",
    description:
      "Painting materials (litres, containers) per FRELUX painting methodology.",
    requires: ["length", "width", "height"],
    assumptions: [
      "Engine default door/window sizes and deduction rules apply where the room has no confirmed openings.",
    ],
  },
  {
    kind: "screeding",
    description: "Screeding system materials per the FRELUX m² methodology.",
    requires: ["length", "width"],
    assumptions: ["Engine default screeding system configuration applies."],
  },
  {
    kind: "tiling",
    description: "Tile quantities, boxes and cost.",
    requires: ["length", "width"],
    assumptions: [
      "Tile size and price come from user selection or regional profile — never invented.",
    ],
  },
  {
    kind: "pop_ceiling",
    description: "POP ceiling materials for the ceiling area.",
    requires: ["length", "width"],
    assumptions: ["Engine default POP board configuration applies."],
  },
  {
    kind: "tyrolene",
    description: "Tyrolene partition area and materials.",
    requires: ["width", "height"],
    assumptions: ["Engine default tyrolene coverage configuration applies."],
  },
];

// =========================================================
// PER-ROOM TAKEOFF ITEMS (§12)
// =========================================================

export interface RoomTakeoffItem {
  roomId: string;
  roomName: string;
  kind: TakeoffKind;
  engineId: string;
  /** READY when all required dimensions are verified, else MISSING_INFO. */
  status: "ready" | "missing_info" | "unverified_room";
  /** What is missing — surfaced to the user, never invented (§13/§22). */
  missing: string[];
  /** Verified dimensions in metres (engine input basis). */
  input: {
    lengthM: number | null;
    widthM: number | null;
    heightM: number | null;
  };
  /** Traceability: which document/page the room came from. */
  provenance: ExtractedRoom["provenance"];
  /** Engine output (present only after the engine ran). */
  result?: EngineResult;
}

/**
 * Build the multi-room takeoff plan: one item per (verified room ×
 * requested kind). Unverified rooms are marked — they NEVER run
 * through engines silently.
 */
export function planRoomTakeoff(
  extraction: PlanExtraction,
  kinds: TakeoffKind[],
): RoomTakeoffItem[] {
  const items: RoomTakeoffItem[] = [];
  const reqs = ROOM_TAKEOFF_CATALOG.filter((r) => kinds.includes(r.kind));

  for (const room of extraction.rooms) {
    if (room.reviewStatus === "user_rejected") continue;

    const verified =
      room.reviewStatus === "user_confirmed" ||
      room.reviewStatus === "user_edited";
    if (!verified) {
      for (const req of reqs) {
        items.push({
          roomId: room.id,
          roomName: room.name,
          kind: req.kind,
          engineId: TAKEOFF_ENGINE_IDS[req.kind],
          status: "unverified_room",
          missing: ["Room not yet verified — confirm or edit it first."],
          input: { lengthM: null, widthM: null, heightM: null },
          provenance: room.provenance,
        });
      }
      continue;
    }

    const lengthM = dimensionToMeters(room.length);
    const widthM = dimensionToMeters(room.width);
    const heightM = dimensionToMeters(room.height);

    for (const req of reqs) {
      const missing: string[] = [];
      if (
        req.requires.includes("length") &&
        (lengthM === null || isUnknown(room.length))
      ) {
        missing.push("length");
      }
      if (
        req.requires.includes("width") &&
        (widthM === null || isUnknown(room.width))
      ) {
        missing.push("width");
      }
      if (
        req.requires.includes("height") &&
        (heightM === null || isUnknown(room.height))
      ) {
        missing.push("height");
      }

      items.push({
        roomId: room.id,
        roomName: room.name,
        kind: req.kind,
        engineId: TAKEOFF_ENGINE_IDS[req.kind],
        status: missing.length === 0 ? "ready" : "missing_info",
        missing,
        input: { lengthM, widthM, heightM },
        provenance: room.provenance,
      });
    }
  }

  return items;
}

// =========================================================
// TAKEOFF SUMMARY (§12 — Room → dimensions → openings → finishes
// → calculated quantity → confidence/status)
// =========================================================

export interface RoomTakeoffSummaryRow {
  roomName: string;
  dimensions: string;
  openings: string;
  finishes: string;
  calculated: boolean;
  quantityLabel: string;
  status: RoomTakeoffItem["status"];
}

/** Render the §12 summary table for one takeoff kind. */
export function summarizeRoomTakeoff(
  extraction: PlanExtraction,
  kind: TakeoffKind,
): RoomTakeoffSummaryRow[] {
  return planRoomTakeoff(extraction, [kind]).map((item) => {
    const room = extraction.rooms.find((r) => r.id === item.roomId)!;
    const dims =
      item.input.lengthM !== null && item.input.widthM !== null
        ? `${item.input.lengthM.toFixed(2)} × ${item.input.widthM.toFixed(2)} m`
        : "dimensions pending";
    const openings =
      room.openings
        .filter(
          (o) =>
            o.reviewStatus === "user_confirmed" ||
            o.reviewStatus === "user_edited",
        )
        .map((o) => `${o.count}× ${o.type}`)
        .join(", ") || "none confirmed";
    const qty = item.result?.quantities?.[0];
    return {
      roomName: room.name,
      dimensions: dims,
      openings,
      finishes: TAKEOFF_KIND_LABELS[kind],
      calculated: Boolean(item.result?.ok),
      quantityLabel: qty
        ? `${qty.quantity.toFixed(2)} ${qty.unit}`
        : "not calculated",
      status: item.status,
    };
  });
}

// =========================================================
// EXECUTION — engines only, through the registry (§11)
// =========================================================

/**
 * Run one READY takeoff item through its authoritative engine.
 * The engine receives verified metres and its own defaults — the
 * planner adds no math of its own. Returns the engine result with
 * full traceability (§18).
 */
export async function executeRoomTakeoff(
  item: RoomTakeoffItem,
): Promise<RoomTakeoffItem> {
  if (item.status !== "ready") return item; // never run a blocked item

  const { executeEngine } =
    await import("@/lib/ai-foundation/engines-registry");

  // Per-kind input shape — each engine's OWN documented contract.
  // The planner adds no math, no unit conversion and no defaults;
  // omitted optional fields fall back to the engine's own defaults.
  const input =
    item.kind === "painting"
      ? {
          length: item.input.lengthM,
          width: item.input.widthM,
          wallHeight: item.input.heightM, // painting engine contract
          unit: "meters" as const,
        }
      : item.kind === "tyrolene"
        ? {
            width: item.input.widthM,
            height: item.input.heightM, // tyrolene partition contract
          }
        : {
            length: item.input.lengthM,
            width: item.input.widthM,
            height: item.input.heightM,
          };

  let result: EngineResult;
  try {
    result = await executeEngine(item.engineId, input);
  } catch (error) {
    // The engine failing is reported honestly — never faked (§22).
    result = {
      ok: false,
      engine: item.engineId,
      calculatedAt: new Date().toISOString(),
      quantities: [],
      costs: null,
      raw: null,
      error:
        error instanceof Error ? error.message : "Engine execution failed.",
    };
  }

  return { ...item, result };
}

/**
 * Execute all READY items of a takeoff plan (§12 multi-room).
 * Items with missing info / unverified rooms are returned
 * untouched — the gaps stay visible.
 */
export async function executeTakeoffPlan(
  items: RoomTakeoffItem[],
): Promise<RoomTakeoffItem[]> {
  const out: RoomTakeoffItem[] = [];
  for (const item of items) {
    out.push(await executeRoomTakeoff(item));
  }
  return out;
}

// =========================================================
// TRACEABILITY (§18)
// =========================================================

export interface TakeoffTrace {
  roomName: string;
  kind: TakeoffKind;
  engineId: string;
  /** The verified inputs the engine received (metres). */
  inputs: Record<string, number | null>;
  /** Source document + page the room came from. */
  source: { documentId: string; page: number; quote?: string; method: string };
  /** Assumptions the engine applied (engine defaults, labelled). */
  assumptions: string[];
  /** Quantities the engine produced. */
  quantities: Array<{ label: string; quantity: number; unit: string }>;
  /** Cost summary when verified pricing exists, else null. */
  costs: {
    total: number;
    currency: string;
    regionalDataAvailable: boolean;
  } | null;
  status: string;
}

/** Build the §18 traceability chain for one executed item. */
export function buildTakeoffTrace(
  item: RoomTakeoffItem,
  catalog: RoomTakeoffRequirement[],
): TakeoffTrace {
  const req = catalog.find((r) => r.kind === item.kind);
  return {
    roomName: item.roomName,
    kind: item.kind,
    engineId: item.engineId,
    inputs: {
      length: item.input.lengthM,
      width: item.input.widthM,
      height: item.input.heightM,
    },
    source: {
      documentId: item.provenance.documentId,
      page: item.provenance.page,
      quote: item.provenance.quote,
      method: item.provenance.method,
    },
    assumptions: req?.assumptions ?? [],
    quantities: (item.result?.quantities ?? []).map((q) => ({
      label: q.label,
      quantity: q.quantity,
      unit: q.unit,
    })),
    costs: item.result?.costs
      ? {
          total: item.result.costs.total,
          currency: item.result.costs.currency,
          regionalDataAvailable: item.result.costs.regionalDataAvailable,
        }
      : null,
    status: item.result?.ok ? "calculated" : item.status,
  };
}
