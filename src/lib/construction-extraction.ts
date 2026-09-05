// =========================================================
// FRELUX AI Construction Document & Image Extraction Layer
// — client library
//
// Pipeline position:
//   User Input → AI Extraction (edge function) → Structured Data
//   → Confidence & Validation → User Confirmation
//   → EXISTING Build-to-Roof Calculation Engine → Estimate
//
// This layer NEVER calculates quantities, materials or costs —
// it only produces validated, user-confirmed input values for the
// deterministic engine. It is schema-driven so the same
// infrastructure can later serve painting, screeding, tiles, POP
// ceiling, doors/windows, electrical, plumbing and whole-building
// estimation.
// =========================================================

import { supabase } from "@/lib/supabase";
import { captureAiError } from "@/lib/errorMonitor";
import type { BuildToRoofInput, DrawingAnalysis } from "@/types/build-to-roof";

// ── Types ──

export type DocumentKind =
  "architectural_plan" | "roof_plan" | "building_photo" | "text_description";

export type ExtractionSource =
  | "dimension_annotation"
  | "scale_derived"
  | "visual_estimate"
  | "text_description"
  | "inferred";

export type VerificationStatus =
  | "ai_detected"
  | "requires_confirmation"
  | "user_confirmed"
  | "user_edited"
  | "rejected";

export interface ExtractionField {
  key: string;
  label: string;
  value: number | string;
  unit: string;
  confidence: number; // 0-1
  verification: VerificationStatus;
  source: ExtractionSource;
  evidence?: string;
}

export interface ConstructionExtractionResult {
  documentKind: DocumentKind;
  fields: ExtractionField[];
  notes: string[];
  warnings: string[];
  processedAt: string;
}

export class ConstructionExtractionError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "ConstructionExtractionError";
  }
}

// ── Request ──

interface ExtractionParams {
  documentKind: DocumentKind;
  documentDataUrl?: string;
  textDescription?: string;
}

export async function requestConstructionExtraction(
  params: ExtractionParams,
): Promise<ConstructionExtractionResult> {
  try {
    const { data, error } = await supabase.functions.invoke<
      ConstructionExtractionResult | { error: string; code?: string }
    >("ai-construction-extraction", {
      body: {
        documentKind: params.documentKind,
        documentDataUrl: params.documentDataUrl,
        textDescription: params.textDescription,
      },
    });

    if (error) {
      throw new ConstructionExtractionError(
        "The extraction service could not be reached. You can still enter your dimensions manually below.",
        "FUNCTION_UNAVAILABLE",
      );
    }
    if (!data) {
      throw new ConstructionExtractionError(
        "No response from the extraction service. You can still enter your dimensions manually below.",
        "EMPTY_RESPONSE",
      );
    }
    if ("error" in data && data.error) {
      const code = data.code ?? "PROVIDER_ERROR";
      throw new ConstructionExtractionError(
        code === "AI_DISABLED"
          ? "AI extraction is currently disabled. You can still enter your dimensions manually below."
          : code === "NO_API_KEY"
            ? "The AI service is not configured yet. Please check back later, or enter your dimensions manually below."
            : code === "RATE_LIMITED"
              ? "You have reached the request limit. Please try again in a little while, or enter your dimensions manually below."
              : "The AI could not analyse this document. Please try again, or enter your dimensions manually below.",
        code,
      );
    }
    if (!Array.isArray((data as ConstructionExtractionResult).fields)) {
      throw new ConstructionExtractionError(
        "The AI response was incomplete. Please try again, or enter your dimensions manually below.",
        "INVALID_RESPONSE",
      );
    }
    return data as ConstructionExtractionResult;
  } catch (e) {
    if (e instanceof ConstructionExtractionError) throw e;
    captureAiError(e, {
      feature: "Construction Document Extraction",
      provider: "google-ai",
    });
    throw new ConstructionExtractionError(
      "The extraction service could not be reached. You can still enter your dimensions manually below.",
      "FUNCTION_UNAVAILABLE",
    );
  }
}

// ── Field keys the Build-to-Roof engine consumes ──
// Informational-only keys (perimeter, floor_area, room_count, ridge_length,
// valleys_count, hips_count) are shown to the user for verification and
// cross-checking but are NOT patched into the engine input — the engine
// derives them authoritatively from its own geometry math.

const ENGINE_FIELD_KEYS = new Set([
  "building_type",
  "building_length",
  "building_width",
  "number_of_floors",
  "floor_to_floor_height",
  "wall_thickness",
  "internal_wall_length",
  "block_size",
  "foundation_type",
  "roof_type",
  "roof_pitch_degrees",
  "roof_overhang",
  "roofing_material",
]);

export const INFORMATIONAL_FIELD_KEYS = new Set([
  "perimeter",
  "floor_area",
  "room_count",
  "ridge_length",
  "valleys_count",
  "hips_count",
]);

/** Important fields the estimator needs; drives the "missing values" list. */
export const REQUIRED_FIELD_KEYS = [
  "building_length",
  "building_width",
  "number_of_floors",
  "roof_type",
];

// ── Confirmation decisions ──

export type FieldDecision = "accepted" | "edited" | "rejected" | "pending";

export interface FieldDecisions {
  /** key → decision. Fields without an entry default to "pending". */
  [key: string]: FieldDecision;
}

export interface EditedValues {
  [key: string]: number | string;
}

/** Fields default to accepted only when the AI marked them `ai_detected`.
 *  Everything else starts as "pending" — the user must explicitly confirm. */
export function initialDecisions(fields: ExtractionField[]): FieldDecisions {
  const decisions: FieldDecisions = {};
  for (const f of fields) {
    decisions[f.key] =
      f.verification === "ai_detected" ? "accepted" : "pending";
  }
  return decisions;
}

// ── Validation (client-side mirror of the server clamps) ──

const ENGINE_RANGES: Record<string, { min: number; max: number }> = {
  building_length: { min: 1, max: 300 },
  building_width: { min: 1, max: 300 },
  number_of_floors: { min: 1, max: 100 },
  floor_to_floor_height: { min: 2, max: 8 },
  wall_thickness: { min: 0.05, max: 0.6 },
  internal_wall_length: { min: 0, max: 2000 },
  roof_pitch_degrees: { min: 0, max: 60 },
  roof_overhang: { min: 0, max: 2 },
};

const ENGINE_ENUMS: Record<string, string[]> = {
  building_type: [
    "bungalow",
    "duplex",
    "two_storey",
    "apartment",
    "office",
    "shop",
    "custom",
  ],
  block_size: ["9inch", "6inch", "5inch", "custom"],
  foundation_type: ["strip_footing", "pad_footing", "raft", "pile", "custom"],
  roof_type: ["gable", "hip", "mono_pitch", "flat", "custom"],
  roofing_material: [
    "long_span_aluminium",
    "stone_coated",
    "gi_sheet",
    "shingle",
    "custom",
  ],
};

function validEngineValue(key: string, value: number | string): boolean {
  const range = ENGINE_RANGES[key];
  if (range) {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= range.min &&
      value <= range.max
    );
  }
  const enums = ENGINE_ENUMS[key];
  if (enums) return typeof value === "string" && enums.includes(value);
  return false;
}

// ── Apply confirmed extraction to the engine input ──

export interface ApplyResult {
  patch: Partial<BuildToRoofInput>;
  drawingAnalysis: DrawingAnalysis;
  appliedFields: string[];
  skippedFields: { key: string; reason: string }[];
}

/**
 * Builds a patch for the existing BuildToRoofInput from the fields the user
 * accepted or edited. ONLY user-confirmed values are applied — never raw AI
 * output. The deterministic engine remains authoritative for all quantities.
 */
export function buildEnginePatch(
  fields: ExtractionField[],
  decisions: FieldDecisions,
  editedValues: EditedValues,
  fileName: string | undefined,
  currentOpenings: BuildToRoofInput["openings"],
): ApplyResult {
  const patch: Partial<BuildToRoofInput> = {};
  const appliedFields: string[] = [];
  const skippedFields: { key: string; reason: string }[] = [];

  for (const field of fields) {
    const decision = decisions[field.key] ?? "pending";
    if (decision === "rejected" || decision === "pending") continue;
    if (!ENGINE_FIELD_KEYS.has(field.key)) continue;

    const value = decision === "edited" ? editedValues[field.key] : field.value;
    if (value === undefined || value === null || value === "") continue;
    if (!validEngineValue(field.key, value)) {
      skippedFields.push({
        key: field.key,
        reason: "value out of range — left unchanged",
      });
      continue;
    }
    const applied =
      typeof value === "number"
        ? Math.round(value * 1000) / 1000 // millimetre precision, mirrors server
        : value;
    (patch as Record<string, unknown>)[field.key] = applied;
    appliedFields.push(field.key);
  }

  // Openings: the engine takes a list of OpeningInput. Map confirmed door /
  // window counts + typical sizes into the existing openings structure.
  const getNumber = (key: string): number | null => {
    const f = fields.find((x) => x.key === key);
    if (!f) return null;
    const decision = decisions[key] ?? "pending";
    if (decision === "rejected" || decision === "pending") return null;
    const v = decision === "edited" ? editedValues[key] : f.value;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const doors = getNumber("doors_count");
  const windows = getNumber("windows_count");
  const doorW = getNumber("door_width") ?? 0.9;
  const doorH = getNumber("door_height") ?? 2.1;
  const winW = getNumber("window_width") ?? 1.2;
  const winH = getNumber("window_height") ?? 1.2;

  const openings: BuildToRoofInput["openings"] = [];
  if (doors !== null) {
    openings.push({
      type: "door",
      width: doorW,
      height: doorH,
      count: Math.round(doors),
    });
  } else if (currentOpenings.some((o) => o.type === "door")) {
    openings.push(...currentOpenings.filter((o) => o.type === "door"));
  }
  if (windows !== null) {
    openings.push({
      type: "window",
      width: winW,
      height: winH,
      count: Math.round(windows),
    });
  } else if (currentOpenings.some((o) => o.type === "window")) {
    openings.push(...currentOpenings.filter((o) => o.type === "window"));
  }
  if (openings.length > 0 && (doors !== null || windows !== null)) {
    patch.openings = openings;
    if (doors !== null) appliedFields.push("doors_count");
    if (windows !== null) appliedFields.push("windows_count");
  }

  // drawing_analysis meta: feeds the engine's existing confidence assessment
  // (a confirmed building_length from a drawing upgrades the estimate).
  const confirmedLength =
    patch.building_length !== undefined ? Number(patch.building_length) : null;
  const confirmedWidth =
    patch.building_width !== undefined ? Number(patch.building_width) : null;
  const floorsField = fields.find((f) => f.key === "number_of_floors");
  const floorsDecision = decisions["number_of_floors"] ?? "pending";
  const confirmedFloors =
    patch.number_of_floors !== undefined
      ? Number(patch.number_of_floors)
      : floorsField &&
          (floorsDecision === "accepted" || floorsDecision === "edited")
        ? Number(floorsField.value)
        : null;

  const drawingAnalysis: DrawingAnalysis = {
    file_name: fileName ?? "AI extraction",
    detected: {
      building_length: fields.find((f) => f.key === "building_length")
        ?.value as number | undefined,
      building_width: fields.find((f) => f.key === "building_width")?.value as
        number | undefined,
      number_of_floors: fields.find((f) => f.key === "number_of_floors")
        ?.value as number | undefined,
      roof_type: fields.find((f) => f.key === "roof_type")?.value as
        string | undefined,
      roof_pitch: fields.find((f) => f.key === "roof_pitch_degrees")?.value as
        number | undefined,
    },
    confirmed: {
      building_length: confirmedLength,
      building_width: confirmedWidth,
      wall_thickness:
        patch.wall_thickness !== undefined
          ? Number(patch.wall_thickness)
          : null,
      floor_height:
        patch.floor_to_floor_height !== undefined
          ? Number(patch.floor_to_floor_height)
          : null,
      number_of_floors: confirmedFloors,
      internal_wall_length:
        patch.internal_wall_length !== undefined
          ? Number(patch.internal_wall_length)
          : null,
      openings_confirmed: doors !== null || windows !== null,
      roof_confirmed: patch.roof_type !== undefined,
      structural_confirmed: false, // structural members are never AI-extracted
      user_corrections: Object.entries(decisions)
        .filter(([, d]) => d === "edited" || d === "rejected")
        .map(([k]) => k),
    },
    processed_at: new Date().toISOString(),
    notes: [
      `AI extraction (${fields.length} fields) reviewed by user; ${appliedFields.length} applied.`,
      ...(appliedFields.length === 0
        ? ["No extraction values were applied."]
        : []),
    ],
  };

  return { patch, drawingAnalysis, appliedFields, skippedFields };
}

// ── Presentation helpers ──

export function confidencePercent(confidence: number): number {
  return Math.round(confidence * 100);
}

export function confidenceBand(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

export const SOURCE_LABELS: Record<ExtractionSource, string> = {
  dimension_annotation: "Dimension annotation",
  scale_derived: "Scale derived",
  visual_estimate: "Visual estimate",
  text_description: "Your description",
  inferred: "Inferred",
};

/** Missing engine-critical fields — surfaced as "enter manually" in the UI. */
export function missingRequiredFields(
  fields: ExtractionField[],
  decisions: FieldDecisions,
): string[] {
  const present = new Set(
    fields
      .filter((f) => (decisions[f.key] ?? "pending") !== "rejected")
      .map((f) => f.key),
  );
  return REQUIRED_FIELD_KEYS.filter((k) => !present.has(k));
}

// ── Persistence (best-effort, signed-in users only) ──

/**
 * Stores the user-reviewed extraction for signed-in users. Silent by
 * design: persistence must never block the estimation workflow. Only the
 * structured data is stored — the original document stays on the user's
 * device.
 */
export async function saveExtractionRecord(params: {
  documentKind: DocumentKind;
  fileName?: string;
  fields: ExtractionField[];
  decisions: FieldDecisions;
  appliedFields: string[];
}): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return; // anonymous: keep the workflow moving

    await supabase.from("construction_extractions").insert({
      created_by: session.user.id,
      document_kind: params.documentKind,
      file_name: params.fileName ?? null,
      extraction: params.fields,
      applied_fields: params.appliedFields,
      applied_at: new Date().toISOString(),
    });
  } catch {
    // Persistence is opportunistic — ignore errors (e.g. migration not yet
    // applied) and let the estimation continue.
  }
}
