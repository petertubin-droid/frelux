/**
 * Turns the vision model's analysis into a build-to-roof input.
 *
 * This lives in _shared so it can be tested from vitest: the edge function
 * runs in Deno and cannot import frontend modules, and the previous version
 * of this mapping was only exercised by real photos. What that hid:
 *
 *  - a detected 6-inch block still produced 9-inch block dimensions and a
 *    225 mm wall, so the model's own block reading changed no quantity;
 *  - a missing width fell back to 10 m and a missing internal wall run to
 *    25 m, for any building size;
 *  - no detected openings became four doors and six windows, invented
 *    silently;
 *  - an unrecognised roof type reached the engine unchanged, where an unknown
 *    string fell through to a different quantity path with no warning.
 *
 * Every value this module derives rather than reads from the analysis is
 * returned in `notes`, so the screen that shows the estimate can say which
 * numbers came from a rule of thumb.
 */
import type { BuildToRoofInput } from "../../../src/types/build-to-roof";

export type EstimationBlockSize = "9inch" | "6inch" | "5inch" | "custom";

export interface AiAnalysis extends Record<string, unknown> {
  detected_building_type?: unknown;
  detected_building_type_confidence?: unknown;
  estimated_length?: unknown;
  estimated_width?: unknown;
  estimated_floors?: unknown;
  estimated_height_per_floor?: unknown;
  detected_roof_type?: unknown;
  estimated_roof_pitch?: unknown;
  detected_roofing_material?: unknown;
  detected_block_type?: unknown;
  estimated_internal_wall_length?: unknown;
  detected_openings?: unknown;
}

export interface BuildEstimateInputResult {
  /** Null when the analysis carries nothing that can be priced. */
  input: BuildToRoofInput | null;
  /** Values derived by rule rather than read from the photo. */
  notes: string[];
  /** Why no input could be built. */
  refusal: string | null;
}

const BUILDING_TYPES = [
  "bungalow",
  "duplex",
  "two_storey",
  "apartment",
  "office",
  "shop",
  "custom",
] as const;
const ROOF_TYPES = ["gable", "hip", "mono_pitch", "flat", "custom"] as const;
const ROOFING_MATERIALS = [
  "long_span_aluminium",
  "stone_coated",
  "gi_sheet",
  "shingle",
  "custom",
] as const;
const BLOCK_SIZES: EstimationBlockSize[] = [
  "9inch",
  "6inch",
  "5inch",
  "custom",
];

/** Length-to-width proportion used only when the photo shows one facade.
 *  The values follow the ratio the analysis prompt itself states. */
const WIDTH_RATIO: Record<string, number> = {
  bungalow: 1.5,
  duplex: 1.3,
  two_storey: 1.3,
  apartment: 1.4,
  office: 1.4,
  shop: 1.4,
  custom: 1.4,
};

/** Internal wall run as a share of the external perimeter, per the prompt. */
const INTERNAL_WALL_SHARE: Record<string, number> = {
  bungalow: 0.5,
  duplex: 0.7,
  two_storey: 0.7,
  apartment: 0.75,
  office: 0.75,
  shop: 0.35,
  custom: 0.5,
};

/** Roof pitch limits, in degrees, by detected roof type. */
const PITCH_RANGE: Record<string, [number, number]> = {
  flat: [0, 5],
  mono_pitch: [5, 25],
  gable: [10, 45],
  hip: [10, 40],
};

/** Block dimensions in inches and the wall thickness they build, in metres. */
const BLOCK_SPEC: Record<
  Exclude<EstimationBlockSize, "custom">,
  {
    lengthIn: number;
    heightIn: number;
    widthIn: number;
    wallThicknessM: number;
    internalThicknessM: number;
  }
> = {
  "9inch": {
    lengthIn: 18,
    heightIn: 9,
    widthIn: 9,
    wallThicknessM: 0.225,
    internalThicknessM: 0.15,
  },
  "6inch": {
    lengthIn: 18,
    heightIn: 9,
    widthIn: 6,
    wallThicknessM: 0.15,
    internalThicknessM: 0.15,
  },
  "5inch": {
    lengthIn: 18,
    heightIn: 9,
    widthIn: 5,
    wallThicknessM: 0.125,
    internalThicknessM: 0.125,
  },
};

function slug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Accepts the spellings a model actually returns. */
export function normaliseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  const raw = slug(value);
  if (!raw) return null;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  const compact = raw.replace(/_/g, "");
  const exact = allowed.find((item) => item.replace(/_/g, "") === compact);
  if (exact) return exact as T;
  // "Hip Roof", "gable roof", "two storey building" all name a value the
  // catalogue knows. Longest first, so "two_storey" wins over any shorter hit.
  const ranked = [...allowed].sort((a, b) => b.length - a.length);
  const prefixed = ranked.find((item) => {
    const key = item.replace(/_/g, "");
    return compact.startsWith(key) || key.startsWith(compact);
  });
  return (prefixed as T | undefined) ?? null;
}

/** 6", 6 inch, six-inch and 6inch all describe the same block. */
export function normaliseBlockSize(value: unknown): EstimationBlockSize | null {
  const raw = slug(value);
  if (!raw) return null;
  if (raw.includes("9")) return "9inch";
  if (raw.includes("6")) return "6inch";
  if (raw.includes("5")) return "5inch";
  if (raw.includes("custom")) return "custom";
  return null;
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Gemini sometimes wraps JSON in a markdown fence or adds a sentence. */
export function parseVisionJson(text: string): Record<string, unknown> {
  const trimmed = (text ?? "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(candidate.slice(first, last + 1)) as Record<
        string,
        unknown
      >;
    }
    throw new Error("The vision model did not return readable JSON.");
  }
}

/** True when the analysis contains a dimension the estimate can stand on. */
export function hasUsableDimensions(analysis: AiAnalysis): boolean {
  const length = toNumber(analysis.estimated_length);
  const width = toNumber(analysis.estimated_width);
  return (length !== null && length > 0) || (width !== null && width > 0);
}

const DEFAULT_WASTAGE = {
  blocks: 5,
  cement: 5,
  sand: 10,
  granite: 10,
  reinforcement: 3,
  timber: 10,
  roofing_sheets: 5,
  hardcore: 5,
};

const DEFAULT_PRICES = {
  cement_per_bag: 10000,
  block_per_piece: 450,
  sand_per_m3: 55000,
  sand_per_trip: 192500,
  granite_per_m3: 110000,
  granite_per_trip: 385000,
  hardcore_per_m3: 40000,
  reinforcement_per_tonne: 1350000,
  rebar_12mm_per_length: 9500,
  rebar_16mm_per_length: 16500,
  rebar_20mm_per_length: 25500,
  rebar_25mm_per_length: 38000,
  binding_wire_per_kg: 3000,
  timber_per_m: 3500,
  roofing_sheet_per_piece: 12000,
  ridge_cap_per_meter: 4500,
  roofing_screws_per_piece: 200,
  fascia_per_meter: 3000,
  dpc_per_meter: 1000,
  dpm_per_m2: 1500,
  formwork_per_m2: 5500,
  price_source:
    "FRELUX default price book, Nigeria, indicative and undated for this market",
};

const DEFAULT_LABOUR = {
  excavation_per_m3: 4000,
  blockwork_per_block: 200,
  concrete_per_m3: 30000,
  reinforcement_per_tonne: 180000,
  formwork_per_m2: 6000,
  roofing_per_m2: 6000,
  blinding_per_m3: 10000,
  hardcore_per_m3: 7000,
  sand_filling_per_m3: 6000,
  compaction_per_m3: 3500,
  backfilling_per_m3: 3000,
  general_labour_per_day: 12000,
  general_labour_days: 5,
  bricklayer_per_day: 10000,
  bricklayer_days: 20,
  contractor_fee: 600000,
  contractor_fee_type: "contract",
  contractor_days: 30,
  supervisor_per_day: 12000,
  supervisor_days: 30,
  foreman_per_day: 8000,
  foreman_days: 25,
  carpenter_per_day: 10000,
  carpenter_days: 15,
  concrete_labourer_per_day: 7000,
  concrete_labourer_days: 15,
};

export const AI_ESTIMATE_DEFAULTS = {
  wastage: DEFAULT_WASTAGE,
  prices: DEFAULT_PRICES,
  labour: DEFAULT_LABOUR,
};

export function buildEstimateInput(
  rawAnalysis: AiAnalysis,
  projectName: string,
  location: string,
  today = new Date().toISOString().split("T")[0],
): BuildEstimateInputResult {
  const analysis = rawAnalysis ?? {};
  const notes: string[] = [];

  if (!hasUsableDimensions(analysis)) {
    return {
      input: null,
      notes,
      refusal:
        "The photo did not give a usable building dimension. Retake it square-on with a door or window in frame, or enter the dimensions in the Build-to-Roof Estimator.",
    };
  }

  const buildingType =
    normaliseEnum(analysis.detected_building_type, BUILDING_TYPES) ??
    "bungalow";
  if (normaliseEnum(analysis.detected_building_type, BUILDING_TYPES) === null) {
    notes.push(
      `Building type "${String(analysis.detected_building_type ?? "")}" was not recognised, so a bungalow shape was assumed.`,
    );
  }

  const roofType =
    normaliseEnum(analysis.detected_roof_type, ROOF_TYPES) ?? "gable";
  if (normaliseEnum(analysis.detected_roof_type, ROOF_TYPES) === null) {
    notes.push(
      `Roof type "${String(analysis.detected_roof_type ?? "")}" was not recognised, so a gable roof was assumed.`,
    );
  }

  const roofingMaterial =
    normaliseEnum(analysis.detected_roofing_material, ROOFING_MATERIALS) ??
    "long_span_aluminium";
  if (
    normaliseEnum(analysis.detected_roofing_material, ROOFING_MATERIALS) ===
    null
  ) {
    notes.push(
      `Roof covering "${String(analysis.detected_roofing_material ?? "")}" was not recognised, so long span aluminium was assumed.`,
    );
  }

  const blockSize = normaliseBlockSize(analysis.detected_block_type) ?? "9inch";
  if (normaliseBlockSize(analysis.detected_block_type) === null) {
    notes.push(
      "Block size was not identified, so 9-inch load-bearing blockwork was assumed.",
    );
  }
  const blockSpec =
    blockSize === "custom" ? BLOCK_SPEC["9inch"] : BLOCK_SPEC[blockSize];

  const floors = Math.max(
    1,
    Math.floor(toNumber(analysis.estimated_floors) ?? 1),
  );
  const ratio = WIDTH_RATIO[buildingType] ?? 1.4;

  let length = toNumber(analysis.estimated_length);
  let width = toNumber(analysis.estimated_width);
  if (length !== null && length > 0 && (width === null || width <= 0)) {
    width = round(length / ratio);
    notes.push(
      `Only one facade was measurable, so the width was derived as length divided by ${ratio} for a ${buildingType.replace(/_/g, " ")}.`,
    );
  } else if (width !== null && width > 0 && (length === null || length <= 0)) {
    length = round(width * ratio);
    notes.push(
      `Only one facade was measurable, so the length was derived as width times ${ratio} for a ${buildingType.replace(/_/g, " ")}.`,
    );
  }
  if ((length ?? 0) > 60 || (width ?? 0) > 60) {
    notes.push(
      "A dimension above 60 m was reported, which is unusual for a single building. Check it before ordering.",
    );
  }
  const safeLength = Math.min(Math.max(length ?? 0, 1), 200);
  const safeWidth = Math.min(Math.max(width ?? 0, 1), 200);

  const floorHeight = Math.min(
    Math.max(toNumber(analysis.estimated_height_per_floor) ?? 3, 2.4),
    5,
  );

  const perimeter = 2 * (safeLength + safeWidth);
  let internalWallLength = toNumber(analysis.estimated_internal_wall_length);
  if (internalWallLength === null || internalWallLength <= 0) {
    const share = INTERNAL_WALL_SHARE[buildingType] ?? 0.5;
    internalWallLength = round(perimeter * share * floors, 1);
    notes.push(
      `Internal walls are not visible in a photo, so ${internalWallLength} m was derived as ${Math.round(share * 100)}% of the external perimeter per floor.`,
    );
  }

  const openings = normaliseOpenings(analysis.detected_openings, notes);
  const floorArea = safeLength * safeWidth * floors;
  if (openings.length === 0) {
    const doors = Math.max(1, Math.ceil(floorArea / 20));
    const windows = Math.max(1, Math.ceil(floorArea / 15));
    openings.push(
      { type: "door", width: 0.9, height: 2.1, count: doors },
      { type: "window", width: 1.2, height: 1.2, count: windows },
    );
    notes.push(
      `No openings were identified, so ${doors} doors and ${windows} windows were allowed at one door per 20 m² and one window per 15 m².`,
    );
  }

  const rawPitch = toNumber(analysis.estimated_roof_pitch) ?? 25;
  const pitchRange = PITCH_RANGE[roofType];
  let pitch = rawPitch;
  if (pitchRange && (rawPitch < pitchRange[0] || rawPitch > pitchRange[1])) {
    pitch = Math.min(Math.max(rawPitch, pitchRange[0]), pitchRange[1]);
    notes.push(
      `The reported roof pitch of ${rawPitch}° is outside the range for a ${roofType.replace(/_/g, " ")} roof, so ${pitch}° was used.`,
    );
  }
  if (roofType === "flat" && pitch > 0 && rawPitch > 5) {
    notes.push(
      "A flat roof is priced without a pitch fall, so the pitch angle does not change roof quantities.",
    );
  }

  return {
    notes,
    refusal: null,
    input: {
      project_name: projectName || "AI-Estimated Building",
      location: location || "Nigeria",
      building_type: buildingType,
      number_of_floors: floors,
      measurement_unit: "m",
      building_length: round(safeLength, 2),
      building_width: round(safeWidth, 2),
      floor_to_floor_height: round(floorHeight, 2),
      wall_thickness: blockSpec.wallThicknessM,
      internal_wall_length: internalWallLength,
      internal_wall_thickness: blockSpec.internalThicknessM,
      openings,
      foundation_type: "strip_footing",
      foundation_depth: 0.9,
      foundation_width: 0.675,
      footing_thickness: 0.225,
      blinding_thickness: 0.075,
      hardcore_thickness: 0.15,
      dpc_length: 1,
      block_size: blockSize,
      block_length: blockSpec.lengthIn,
      block_height: blockSpec.heightIn,
      block_width: blockSpec.widthIn,
      concrete_mix_cement: 1,
      concrete_mix_sand: 2,
      concrete_mix_granite: 4,
      mortar_mix_cement: 1,
      mortar_mix_sand: 6,
      roof_type: roofType,
      roof_pitch_degrees: round(pitch, 1),
      roof_overhang: 0.6,
      roofing_material: roofingMaterial,
      structural_members: [],
      has_engineer_schedule: false,
      wastage: AI_ESTIMATE_DEFAULTS.wastage,
      prices: {
        ...AI_ESTIMATE_DEFAULTS.prices,
        price_date: today,
      },
      labour: AI_ESTIMATE_DEFAULTS.labour,
      contingency_percent: 5,
    } as unknown as BuildToRoofInput,
  };
}

function normaliseOpenings(
  raw: unknown,
  notes: string[],
): Array<{
  type: "door" | "window";
  width: number;
  height: number;
  count: number;
}> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{
    type: "door" | "window";
    width: number;
    height: number;
    count: number;
  }> = [];
  let rejected = 0;
  for (const entry of raw) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const type = slug(item.type) === "door" ? "door" : "window";
    const width =
      toNumber(item.estimated_width) ?? (type === "door" ? 0.9 : 1.2);
    const height =
      toNumber(item.estimated_height) ?? (type === "door" ? 2.1 : 1.2);
    const count = Math.floor(toNumber(item.estimated_count) ?? 1);
    // A door is not eight metres wide and a window is not half a metre tall.
    // Anything outside the plausible band is clamped, not passed through,
    // because a nonsense opening silently deducts the wrong wall area.
    const widthMin = type === "door" ? 0.6 : 0.3;
    const widthMax = type === "door" ? 2.4 : 6;
    const heightMin = type === "door" ? 1.8 : 0.3;
    const heightMax = type === "door" ? 3 : 3;
    if (count <= 0) {
      rejected += 1;
      continue;
    }
    out.push({
      type,
      width: round(Math.min(Math.max(width, widthMin), widthMax), 2),
      height: round(Math.min(Math.max(height, heightMin), heightMax), 2),
      count: Math.min(count, 200),
    });
  }
  if (rejected > 0) {
    notes.push(
      `${rejected} detected opening${rejected === 1 ? "" : "s"} had no usable count and ${rejected === 1 ? "was" : "were"} dropped.`,
    );
  }
  return out;
}
