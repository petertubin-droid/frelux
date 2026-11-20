/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Template globalization layer.
 *
 * The 40 curated public templates are stored in canonical metric form
 * (input_data.unit === "meters"). This module adapts every template to
 * the visitor's market for display and calculator prefill:
 *
 *   - room dimensions are converted to the market's default room unit
 *     (feet for imperial markets, meters for metric markets) with
 *     sensible rounding, so a US visitor sees "13 × 16.5 ft" instead
 *     of "4 × 5 m";
 *   - descriptions keep their canonical prose but drop the
 *     "Nigerian" qualifier for non-NG markets, and gain a generated
 *     dimension sentence in the visitor's units;
 *   - the input summary (TemplateDetail) is rendered in the visitor's
 *     units, reusing each market's terminology.
 *
 * Conversion is display-only and honest: the stored room stays the
 * same physical room — no per-market sizes are invented.
 */

import type { DbCalculatorTemplate } from "@/types/database";
import type { ResolvedMarketContext } from "@/types/international";
import {
  resolveMarketRoomUnit,
  type RoomUnit,
} from "@/lib/international/room-unit-defaults";
import { toMeters, fromMeters } from "@/lib/measurement/units";

/** Counts of an opening schedule stored as openingGroups, by category. */
function openingCounts(d: Record<string, unknown>) {
  const groups = Array.isArray(d.openingGroups)
    ? (d.openingGroups as {
        category?: string;
        count?: number;
      }[])
    : [];
  const tally = { window: 0, internal_door: 0, entrance_door: 0 };
  for (const g of groups) {
    const c = g.category;
    const n = Number(g.count) || 0;
    if (c === "window" || c === "internal_door" || c === "entrance_door") {
      tally[c] += n;
    }
  }
  return tally;
}

/** Per-calculator dimension fields stored in input_data (canonical meters). */
const DIM_FIELDS: Record<string, string[]> = {
  paint: ["length", "width", "wallHeight"],
  tile: ["length", "width"],
  screeding: ["roomLength", "roomWidth", "wallHeight", "wallWidth"],
  pop: ["roomLength", "roomWidth"],
};

/**
 * The room unit a template should display/load in for a market.
 * Templates are stored metric; NG keeps that legacy default.
 */
export function resolveTemplateRoomUnit(
  market: Partial<
    Pick<
      ResolvedMarketContext,
      "marketCode" | "measurementSystem" | "defaultLengthUnit"
    >
  >,
): RoomUnit {
  return resolveMarketRoomUnit(market, "meters");
}

function roundForDisplay(value: number, unit: RoomUnit): number {
  if (unit === "feet") return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

/**
 * Convert a template's canonical metric input_data into the target
 * room unit. Returns a NEW object; the stored template is never
 * mutated. Non-dimension fields (coats, doors, tile size mm, waste
 * margin, workflow flags) pass through untouched.
 */
export function convertTemplateInputForUnit(
  input: Record<string, unknown>,
  toUnit: RoomUnit,
): Record<string, unknown> {
  // ICF and EIFS store dimensions in metres under self-describing field
  // names (wallLengthM, wallHeightM). Relabelling those as feet would put a
  // metre value under a feet label, so they keep their own unit and are never
  // rewritten.
  if ("wallLengthM" in input || "wallHeightM" in input) {
    return { ...input, unit: "meters" };
  }
  const storedUnit = input.unit === "feet" ? "feet" : "meters";
  if (storedUnit === toUnit) return { ...input, unit: toUnit };

  const fields = DIM_FIELDS.paint
    .concat(DIM_FIELDS.tile, DIM_FIELDS.screeding, DIM_FIELDS.pop)
    .filter((f, i, arr) => arr.indexOf(f) === i);

  const out: Record<string, unknown> = { ...input };
  for (const field of fields) {
    const raw = out[field];
    if (typeof raw === "number" && Number.isFinite(raw) && raw !== 0) {
      const meters = toMeters(raw, storedUnit);
      out[field] = roundForDisplay(fromMeters(meters, toUnit), toUnit);
    }
  }
  out.unit = toUnit;
  return out;
}

/** Market-adapted input_data for calculator prefill. */
export function convertTemplateInputForMarket(
  template: DbCalculatorTemplate,
  market: Partial<
    Pick<
      ResolvedMarketContext,
      "marketCode" | "measurementSystem" | "defaultLengthUnit"
    >
  >,
): Record<string, unknown> {
  return convertTemplateInputForUnit(
    template.input_data as Record<string, unknown>,
    resolveTemplateRoomUnit(market),
  );
}

function unitShort(unit: RoomUnit): string {
  return unit === "feet" ? "ft" : "m";
}

/**
 * Canonical prose for a market: identical to the stored description,
 * minus the "Nigerian" qualifier for visitors outside Nigeria.
 */
export function templateProseForMarket(
  template: DbCalculatorTemplate,
  marketCode: string,
): string {
  const prose = template.description ?? "";
  if (marketCode === "NG") return prose;
  return prose
    .replace(/\bNigerian\s+/g, "")
    .replace(/\bNigeria'?s?\b/g, "your market's");
}

/**
 * Short dimension sentence in the given room unit, e.g.
 * "4 × 5 m · 3 m ceiling · 2 coats · 1 door · 2 windows" (paint)
 * "4 × 5 m · 600×600mm tiles · 10% waste" (tile)
 */
export function templateDimsSentence(
  template: DbCalculatorTemplate,
  unit: RoomUnit,
): string {
  const d = convertTemplateInputForUnit(
    template.input_data as Record<string, unknown>,
    unit,
  ) as Record<string, number | string | boolean | undefined>;
  const u = unitShort(unit);
  const parts: string[] = [];

  const fmt = (v: unknown) =>
    typeof v === "number" ? String(roundForDisplay(v, unit)) : String(v);

  switch (template.calculator_type) {
    case "paint": {
      const dims =
        Number(d.width) > 0
          ? `${fmt(d.length)} × ${fmt(d.width)} ${u}`
          : `${fmt(d.length)} ${u}`;
      parts.push(dims);
      if (Number(d.wallHeight) > 0)
        parts.push(`${fmt(d.wallHeight)} ${u} ceiling`);
      if (d.coats) parts.push(`${d.coats} coats`);
      if (d.includeCeiling) parts.push("ceiling included");
      if (d.doors)
        parts.push(`${d.doors} door${Number(d.doors) === 1 ? "" : "s"}`);
      if (d.windows)
        parts.push(`${d.windows} window${Number(d.windows) === 1 ? "" : "s"}`);
      if (d.wasteMargin) parts.push(`${d.wasteMargin}% waste`);
      break;
    }
    case "tile": {
      const dims =
        Number(d.width) > 0
          ? `${fmt(d.length)} × ${fmt(d.width)} ${u}`
          : `${fmt(d.length)} ${u}`;
      parts.push(dims);
      if (d.tileWidthMm && d.tileHeightMm)
        parts.push(`${d.tileWidthMm}×${d.tileHeightMm}mm tiles`);
      if (d.method) parts.push(String(d.method));
      if (d.wasteMargin) parts.push(`${d.wasteMargin}% waste`);
      break;
    }
    case "screeding": {
      if (Number(d.roomLength) > 0 && Number(d.roomWidth) > 0)
        parts.push(`${fmt(d.roomLength)} × ${fmt(d.roomWidth)} ${u} room`);
      if (Number(d.wallHeight) > 0)
        parts.push(`${fmt(d.wallHeight)} ${u} height`);
      if (d.doors)
        parts.push(`${d.doors} door${Number(d.doors) === 1 ? "" : "s"}`);
      if (d.windows)
        parts.push(`${d.windows} window${Number(d.windows) === 1 ? "" : "s"}`);
      if (d.wasteMargin) parts.push(`${d.wasteMargin}% waste`);
      break;
    }
    case "build_to_roof": {
      // A footprint plus how many openings of each kind, because the schedule
      // is the part of a build-to-roof template a visitor actually recognises.
      if (Number(d.building_length) > 0 && Number(d.building_width) > 0)
        parts.push(
          `${fmt(d.building_length)} × ${fmt(d.building_width)} ${u} footprint`,
        );
      if (Number(d.number_of_floors) > 0)
        parts.push(
          `${d.number_of_floors} floor${Number(d.number_of_floors) === 1 ? "" : "s"}`,
        );
      const counts = openingCounts(d);
      const windows = counts.window;
      const internal = counts.internal_door;
      const entrance = counts.entrance_door;
      if (windows > 0)
        parts.push(`${windows} window${windows === 1 ? "" : "s"}`);
      if (internal > 0)
        parts.push(`${internal} internal door${internal === 1 ? "" : "s"}`);
      if (entrance > 0)
        parts.push(`${entrance} entrance door${entrance === 1 ? "" : "s"}`);
      break;
    }
    case "pop": {
      if (Number(d.roomLength) > 0 && Number(d.roomWidth) > 0)
        parts.push(`${fmt(d.roomLength)} × ${fmt(d.roomWidth)} ${u} room`);
      if (d.includeDecorative) parts.push("decorative included");
      if (d.wasteMargin) parts.push(`${d.wasteMargin}% waste`);
      break;
    }
    case "icf": {
      // ICF and EIFS store wall dimensions in metres under explicit field
      // names, so they are not converted by DIM_FIELDS. The sentence is
      // rendered from the stored value and labelled with the unit the
      // template actually holds, never silently rewritten.
      if (Number(d.wallLengthM) > 0 && Number(d.wallHeightM) > 0)
        parts.push(`${fmt(d.wallLengthM)} × ${fmt(d.wallHeightM)} m wall`);
      if (d.coreThicknessMm) parts.push(`${d.coreThicknessMm} mm core`);
      if (d.blockFaceLengthMm && d.blockFaceHeightMm)
        parts.push(`${d.blockFaceLengthMm}×${d.blockFaceHeightMm} mm blocks`);
      if (d.isBasement) parts.push("below grade");
      if (d.wasteFactorPercent) parts.push(`${d.wasteFactorPercent}% waste`);
      break;
    }
    case "eifs": {
      if (Number(d.wallLengthM) > 0 && Number(d.wallHeightM) > 0)
        parts.push(`${fmt(d.wallLengthM)} × ${fmt(d.wallHeightM)} m facade`);
      if (d.insulationThicknessMm)
        parts.push(`${d.insulationThicknessMm} mm insulation`);
      if (d.systemType) parts.push(String(d.systemType).replace(/_/g, " "));
      if (d.finishTexture)
        parts.push(String(d.finishTexture).replace(/_/g, " "));
      if (d.wasteFactorPercent) parts.push(`${d.wasteFactorPercent}% waste`);
      break;
    }
  }
  return parts.join(" · ");
}

/**
 * Market-facing description: prose + generated dimension sentence in
 * the visitor's units. This is what template cards and the listing
 * page render.
 */
export function describeTemplateForMarket(
  template: DbCalculatorTemplate,
  market: Partial<
    Pick<
      ResolvedMarketContext,
      "marketCode" | "measurementSystem" | "defaultLengthUnit"
    >
  > & { marketCode: string },
): string {
  const unit = resolveTemplateRoomUnit(market);
  const prose = templateProseForMarket(template, market.marketCode);
  const dims = templateDimsSentence(template, unit);
  if (!prose) return dims;
  if (!dims) return prose;
  return `${prose.replace(/\s*[.:]\s*$/, "")}. ${dims}.`;
}

export interface TemplateSummaryItem {
  label: string;
  value: string;
}

/**
 * Market-aware version of the template input summary. Same fields as
 * the classic buildInputSummary, but dimensions are converted to the
 * visitor's room unit and labelled accordingly.
 */
export function templateSummaryForMarket(
  template: DbCalculatorTemplate,
  market: Partial<
    Pick<
      ResolvedMarketContext,
      "marketCode" | "measurementSystem" | "defaultLengthUnit"
    >
  > & { marketCode: string },
): TemplateSummaryItem[] {
  const unit = resolveTemplateRoomUnit(market);
  const d = convertTemplateInputForUnit(
    template.input_data as Record<string, unknown>,
    unit,
  ) as Record<string, number | string | boolean | undefined>;
  const u = unitShort(unit);
  const system = typeof d.system === "string" ? d.system : "";
  const fmt = (v: unknown) =>
    typeof v === "number" ? String(roundForDisplay(v, unit)) : String(v);
  const parts: TemplateSummaryItem[] = [];

  if (template.calculator_type === "build_to_roof") {
    const counts = openingCounts(d);
    if (Number(d.building_length) > 0)
      parts.push({ label: "Length", value: `${fmt(d.building_length)} ${u}` });
    if (Number(d.building_width) > 0)
      parts.push({ label: "Width", value: `${fmt(d.building_width)} ${u}` });
    if (Number(d.number_of_floors) > 0)
      parts.push({ label: "Floors", value: String(d.number_of_floors) });
    if (counts.window > 0)
      parts.push({ label: "Windows", value: String(counts.window) });
    if (counts.internal_door > 0)
      parts.push({
        label: "Internal doors",
        value: String(counts.internal_door),
      });
    if (counts.entrance_door > 0)
      parts.push({
        label: "Entrance doors",
        value: String(counts.entrance_door),
      });
    if (d.block_size)
      parts.push({ label: "Blocks", value: String(d.block_size) });
    if (d.roofing_material)
      parts.push({ label: "Roofing", value: String(d.roofing_material) });
  }

  if (template.calculator_type === "paint") {
    if (d.length)
      parts.push({ label: "Length", value: `${fmt(d.length)} ${u}` });
    if (d.width) parts.push({ label: "Width", value: `${fmt(d.width)} ${u}` });
    if (d.wallHeight)
      parts.push({ label: "Wall Height", value: `${fmt(d.wallHeight)} ${u}` });
    if (d.coats) parts.push({ label: "Coats", value: String(d.coats) });
    if (d.projectType)
      parts.push({ label: "Project Type", value: String(d.projectType) });
    if (d.includeCeiling) parts.push({ label: "Ceiling", value: "Included" });
    if (d.doors) parts.push({ label: "Doors", value: String(d.doors) });
    if (d.windows) parts.push({ label: "Windows", value: String(d.windows) });
    if (d.wasteMargin)
      parts.push({ label: "Waste Margin", value: `${d.wasteMargin}%` });
  } else if (template.calculator_type === "tile") {
    if (d.length)
      parts.push({ label: "Length", value: `${fmt(d.length)} ${u}` });
    if (d.width) parts.push({ label: "Width", value: `${fmt(d.width)} ${u}` });
    if (d.tileWidthMm)
      parts.push({
        label: "Tile Size",
        value: `${d.tileWidthMm}x${d.tileHeightMm}mm`,
      });
    if (d.method) parts.push({ label: "Method", value: String(d.method) });
    if (d.surfaceType)
      parts.push({ label: "Surface", value: String(d.surfaceType) });
    if (d.wasteMargin)
      parts.push({ label: "Waste Margin", value: `${d.wasteMargin}%` });
  } else if (template.calculator_type === "screeding") {
    if (d.roomLength)
      parts.push({ label: "Room Length", value: `${fmt(d.roomLength)} ${u}` });
    if (d.roomWidth)
      parts.push({ label: "Room Width", value: `${fmt(d.roomWidth)} ${u}` });
    if (d.wallHeight)
      parts.push({ label: "Wall Height", value: `${fmt(d.wallHeight)} ${u}` });
    if (d.doors) parts.push({ label: "Doors", value: String(d.doors) });
    if (d.windows) parts.push({ label: "Windows", value: String(d.windows) });
    if (d.wasteMargin)
      parts.push({ label: "Waste Margin", value: `${d.wasteMargin}%` });
  } else if (template.calculator_type === "icf") {
    if (d.wallLengthM)
      parts.push({ label: "Wall Length", value: `${fmt(d.wallLengthM)} m` });
    if (d.wallHeightM)
      parts.push({ label: "Wall Height", value: `${fmt(d.wallHeightM)} m` });
    if (d.coreThicknessMm)
      parts.push({ label: "Core", value: `${d.coreThicknessMm} mm` });
    if (d.blockFaceLengthMm && d.blockFaceHeightMm)
      parts.push({
        label: "Block Face",
        value: `${d.blockFaceLengthMm}×${d.blockFaceHeightMm} mm`,
      });
    if (d.verticalRebarSpacingMm)
      parts.push({
        label: "Vertical Bars",
        value: `${d.verticalRebarSpacingMm} mm centres`,
      });
    if (d.isBasement) parts.push({ label: "Below Grade", value: "Yes" });
    if (d.wasteFactorPercent)
      parts.push({ label: "Waste", value: `${d.wasteFactorPercent}%` });
  } else if (template.calculator_type === "eifs") {
    if (d.wallLengthM)
      parts.push({ label: "Facade Length", value: `${fmt(d.wallLengthM)} m` });
    if (d.wallHeightM)
      parts.push({ label: "Facade Height", value: `${fmt(d.wallHeightM)} m` });
    if (d.insulationThicknessMm)
      parts.push({
        label: "Insulation",
        value: `${d.insulationThicknessMm} mm`,
      });
    if (d.systemType)
      parts.push({
        label: "System",
        value: String(d.systemType).replace(/_/g, " "),
      });
    if (d.substrateType)
      parts.push({
        label: "Substrate",
        value: String(d.substrateType).replace(/_/g, " "),
      });
    if (d.finishTexture)
      parts.push({
        label: "Finish",
        value: String(d.finishTexture).replace(/_/g, " "),
      });
    if (d.wasteFactorPercent)
      parts.push({ label: "Waste", value: `${d.wasteFactorPercent}%` });
  } else if (system === "polystyrene") {
    // Board ceilings are configured by board, thickness, method and design;
    // the plaster fields do not exist on that form. Mirrors
    // scripts/lib/template-input-summary.mjs, which the parity test compares.
    const length = Number(d.length) || Number(d.roomLength) || 0;
    const width = Number(d.width) || Number(d.roomWidth) || 0;
    if (length)
      parts.push({ label: "Room Length", value: `${fmt(length)} ${u}` });
    if (width) parts.push({ label: "Room Width", value: `${fmt(width)} ${u}` });
    if (d.boardSize)
      parts.push({
        label: "Board Size",
        value: String(d.boardSize).replace("x", " x "),
      });
    if (d.thickness)
      parts.push({ label: "Board Thickness", value: `${d.thickness} mm` });
    if (d.installation)
      parts.push({ label: "Installation", value: String(d.installation) });
    if (d.design) parts.push({ label: "Design", value: String(d.design) });
    if (d.includeDrops)
      parts.push({
        label: "Tray drops",
        value: `Included at ${fmt(Number(d.dropHeight) || 0)} ${u}`,
      });
    if (d.includeCornice) parts.push({ label: "Cornice", value: "Included" });
    if (d.includePaint)
      parts.push({ label: "Paint", value: "Two coats included" });
  } else if (template.calculator_type === "pop") {
    if (d.roomLength)
      parts.push({ label: "Room Length", value: `${fmt(d.roomLength)} ${u}` });
    if (d.roomWidth)
      parts.push({ label: "Room Width", value: `${fmt(d.roomWidth)} ${u}` });
    if (d.includeDecorative)
      parts.push({ label: "Decorative", value: "Included" });
    if (d.includeOptional)
      parts.push({ label: "Optional Items", value: "Included" });
    if (d.wasteMargin)
      parts.push({ label: "Waste Margin", value: `${d.wasteMargin}%` });
  }
  return parts;
}
