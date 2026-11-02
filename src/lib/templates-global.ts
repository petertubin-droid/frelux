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
  const storedUnit = input.unit === "feet" ? "feet" : "meters";
  if (storedUnit === toUnit) return { ...input };

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
    case "pop": {
      if (Number(d.roomLength) > 0 && Number(d.roomWidth) > 0)
        parts.push(`${fmt(d.roomLength)} × ${fmt(d.roomWidth)} ${u} room`);
      if (d.includeDecorative) parts.push("decorative included");
      if (d.wasteMargin) parts.push(`${d.wasteMargin}% waste`);
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
  const fmt = (v: unknown) =>
    typeof v === "number" ? String(roundForDisplay(v, unit)) : String(v);
  const parts: TemplateSummaryItem[] = [];

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
