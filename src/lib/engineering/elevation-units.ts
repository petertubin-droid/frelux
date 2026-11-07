/**
 * Presentation units for the Mathematical Plan Elevation page.
 *
 * The engine computes in SI and always will: every level result carries an
 * `_m`, `_m2`, `_m3` or `_kg` suffix, and silently feeding feet into it would
 * break the arithmetic the page prints beside each figure. This module is the
 * only place a metre becomes a foot, so the conversion cannot drift between the
 * input fields, the summary text and the CSV export.
 *
 * Only dimension and mass units are converted here. Bearing pressure (kPa), wind
 * speed (m/s) and line load (kN/m) stay in SI in both modes, because those are
 * engineering inputs quoted in SI by the standards this page names, and a
 * converted psf or mph figure would look more authoritative than the screening
 * assumption it actually is.
 */

import type { MathematicalElevationResult } from "@/lib/engineering/mathematical-elevation-engine";

export type ElevationUnitSystem = "metric" | "imperial";

const FEET_PER_METRE = 1 / 0.3048;
const SQFT_PER_SQM = FEET_PER_METRE * FEET_PER_METRE;
const CUFT_PER_CUM = FEET_PER_METRE * FEET_PER_METRE * FEET_PER_METRE;
const LB_PER_KG = 2.2046226218487757;

/** Length: metres in, feet out. */
export function metresToFeet(m: number): number {
  return m * FEET_PER_METRE;
}

/** Length: feet in, metres out. */
export function feetToMetres(ft: number): number {
  return ft / FEET_PER_METRE;
}

/** Area: square metres in, square feet out. */
export function squareMetresToFeet(m2: number): number {
  return m2 * SQFT_PER_SQM;
}

/** Volume: cubic metres in, cubic feet out. */
export function cubicMetresToFeet(m3: number): number {
  return m3 * CUFT_PER_CUM;
}

/** Mass: kilograms in, pounds out. */
export function kilogramsToPounds(kg: number): number {
  return kg * LB_PER_KG;
}

/**
 * Values the user types are metres internally. In imperial mode a length field
 * shows and accepts feet, so both directions go through here.
 */
export function lengthForDisplay(
  metres: number,
  system: ElevationUnitSystem,
): number {
  return system === "imperial" ? metresToFeet(metres) : metres;
}

export function lengthFromDisplay(
  value: number,
  system: ElevationUnitSystem,
): number {
  return system === "imperial" ? feetToMetres(value) : value;
}

/** Unit suffix for a length input label. */
export function lengthUnitLabel(system: ElevationUnitSystem): string {
  return system === "imperial" ? "ft" : "m";
}

/** Step size for a length input, matching the label's unit. */
export function lengthStep(
  system: ElevationUnitSystem,
  metricStep: number,
): number {
  return system === "imperial"
    ? Number((metricStep * FEET_PER_METRE).toFixed(2))
    : metricStep;
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Thousands separated number with a fixed decimal count. */
export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "not entered";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export interface FormattedMeasure {
  value: number;
  unit: string;
  text: string;
}

/**
 * Format a stored SI figure in the requested system.
 *
 * `unit` accepts the suffixes the engine already uses: m, m2/m², m3/m³, kg.
 * Anything else is returned untouched, which keeps kPa, kN/m and m/s in SI
 * rather than inventing a conversion the page never explains.
 */
export function formatMeasure(
  value: number,
  unit: string,
  system: ElevationUnitSystem,
  decimals = 2,
): FormattedMeasure {
  if (!Number.isFinite(value)) {
    return { value, unit, text: "not entered" };
  }
  switch (unit) {
    case "m": {
      const v = system === "imperial" ? metresToFeet(value) : value;
      return {
        value: round(v, decimals),
        unit: system === "imperial" ? "ft" : "m",
        text: `${formatNumber(v, decimals)} ${system === "imperial" ? "ft" : "m"}`,
      };
    }
    case "m2":
    case "m²": {
      const v = system === "imperial" ? squareMetresToFeet(value) : value;
      const label = system === "imperial" ? "sq ft" : "m²";
      return {
        value: round(v, decimals),
        unit: label,
        text: `${formatNumber(v, decimals)} ${label}`,
      };
    }
    case "m3":
    case "m³": {
      const v = system === "imperial" ? cubicMetresToFeet(value) : value;
      const label = system === "imperial" ? "cu ft" : "m³";
      return {
        value: round(v, decimals),
        unit: label,
        text: `${formatNumber(v, decimals)} ${label}`,
      };
    }
    case "kg": {
      const v = system === "imperial" ? kilogramsToPounds(value) : value;
      const label = system === "imperial" ? "lb" : "kg";
      return {
        value: round(v, decimals),
        unit: label,
        text: `${formatNumber(v, decimals)} ${label}`,
      };
    }
    default:
      return {
        value,
        unit,
        text: `${formatNumber(value, decimals)}${unit ? ` ${unit}` : ""}`,
      };
  }
}

export interface ElevationCsvRow extends Record<string, unknown> {
  level: string;
  item: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
}

/**
 * One row per scheduled material, plus a totals row per costed schedule.
 *
 * Quantities are converted with the same rules as the page, so a reader who
 * exports in imperial mode gets the numbers they saw on screen rather than the
 * SI figures behind them.
 */
export function buildElevationCsvRows(
  result: MathematicalElevationResult,
  system: ElevationUnitSystem,
  unitRates: Record<string, number> = {},
  currencyCode = "",
): ElevationCsvRow[] {
  const rows: ElevationCsvRow[] = result.five_d_bim.materials.map(
    (material) => {
      const measure = formatMeasure(
        material.quantity,
        material.unit,
        system,
        2,
      );
      const rate = unitRates[material.item];
      const amount =
        typeof rate === "number" && rate > 0 ? rate * material.quantity : null;
      return {
        level: material.category,
        item: material.item,
        quantity: formatNumber(measure.value, 2),
        unit: measure.unit,
        rate: typeof rate === "number" && rate > 0 ? formatNumber(rate, 2) : "",
        amount: amount === null ? "" : formatNumber(amount, 2),
      };
    },
  );

  const costed = rows.filter((row) => row.amount !== "");
  if (costed.length > 0) {
    const total = costed.reduce(
      (sum, row) => sum + Number(row.amount.replace(/,/g, "")),
      0,
    );
    rows.push({
      level: "Total",
      item:
        costed.length === rows.length
          ? "All scheduled items"
          : `${costed.length} of ${rows.length} items costed`,
      quantity: "",
      unit: currencyCode ? currencyCode.toUpperCase() : "",
      rate: "",
      amount: formatNumber(total, 2),
    });
  }
  return rows;
}

/** Column set that matches buildElevationCsvRows. */
export const ELEVATION_CSV_COLUMNS = [
  { header: "Level", key: "level" },
  { header: "Item", key: "item" },
  { header: "Quantity", key: "quantity" },
  { header: "Unit", key: "unit" },
  { header: "Unit rate", key: "rate" },
  { header: "Amount", key: "amount" },
];

export const ELEVATION_CSV_FILENAME = "frelux-plan-elevation-takeoff";

/**
 * Plain-text summary, one line per fact, written for an email or a report body.
 *
 * Every line states the unit system it is in and which figures are assumptions,
 * because this text travels without the on-screen amber notice that usually
 * sits beside the numbers.
 */
export function buildElevationSummaryLines(
  result: MathematicalElevationResult,
  system: ElevationUnitSystem,
): string[] {
  const { input, levels, five_d_bim } = result;
  const systemLabel =
    system === "imperial"
      ? "Imperial display (dimensions and quantities converted from SI; pressure, wind speed and line load stay SI)"
      : "Metric (SI)";

  const fmt = (value: number, unit: string, decimals = 2) =>
    formatMeasure(value, unit, system, decimals).text;

  const roofType = input.roof_type === "hip" ? "hip" : "gable";

  const lines = [
    "FRELUX Mathematical Plan Elevation",
    `Project: ${input.project_name}`,
    `Units: ${systemLabel}`,
    `Footprint: ${fmt(input.building_length, "m")} x ${fmt(input.building_width, "m")}, ${input.storeys} storey(s) at ${fmt(input.floor_to_floor_height, "m")} floor to floor`,
    `Roof: ${roofType} at ${input.roof_pitch_deg} degrees, ${fmt(input.roof_overhang, "m")} overhang`,
    `Wall: ${fmt(input.wall_thickness, "m")} thick, ${fmt(input.internal_wall_length, "m")} internal run`,
    "",
    `L1 Foundation: footing ${fmt(levels.level_1_foundation.footing_width_adopted_m, "m")} wide by ${fmt(levels.level_1_foundation.footing_thickness_m, "m")} thick, ${fmt(levels.level_1_foundation.excavation_depth_m, "m")} excavation depth, ${fmt(levels.level_1_foundation.excavation_volume_m3, "m3")} excavated`,
    `L1 Bearing: ${formatNumber(levels.level_1_foundation.applied_soil_pressure_kpa, 1)} kPa applied against ${formatNumber(levels.level_1_foundation.allowable_bearing_capacity_kpa, 1)} kPa assumed (${formatNumber(levels.level_1_foundation.bearing_utilization_pct, 1)} percent of the assumption)`,
    `L2 Ground slab: ${fmt(levels.level_2_ground_slab.slab_area_m2, "m2")} at ${fmt(levels.level_2_ground_slab.slab_thickness_m, "m")} thick, ${fmt(levels.level_2_ground_slab.slab_concrete_volume_m3, "m3")} concrete`,
    `L3 Walls: ${formatNumber(levels.level_3_superstructure.total_blocks_count, 0)} blocks over ${fmt(levels.level_3_superstructure.net_masonry_area_m2, "m2")} net area`,
    `L4 Ring beam: ${fmt(levels.level_4_ring_beam.total_beam_length_m, "m")} run, ${fmt(levels.level_4_ring_beam.concrete_volume_m3, "m3")} concrete, ${fmt(levels.level_4_ring_beam.total_main_rebar_weight_kg, "kg")} main steel`,
    `L5 Roof: ${fmt(levels.level_5_roof.ridge_rise_m, "m")} rise, ${fmt(levels.level_5_roof.rafter_slope_length_m, "m")} rafter, ${fmt(levels.level_5_roof.true_3d_roof_area_m2, "m2")} true area, ${formatNumber(five_d_bim.total_roof_sheets_approx, 0)} roof sheets approximately`,
    "",
    `Totals: ${fmt(five_d_bim.total_concrete_volume_m3, "m3")} concrete, ${formatNumber(five_d_bim.total_cement_bags_50kg, 0)} cement bags, ${formatNumber(five_d_bim.total_blocks_units, 0)} blocks, ${fmt(five_d_bim.total_rebar_kg, "kg")} reinforcement`,
    `Programme: ${formatNumber(five_d_bim.total_project_days, 0)} days including curing holds`,
    "",
    `Screening flags: ${result.discrepancies.length === 0 ? "none triggered" : `${result.discrepancies.length} raised`}`,
    "Assumptions: bearing value, wind speed and exposure are planning assumptions, not site data. Rates, where shown, are the ones entered by hand.",
    "Not a design check: no structural design, code compliance determination, site investigation or uplift connection design is performed. Obtain review from a licensed local professional.",
  ];

  for (const flag of result.discrepancies) {
    lines.push(
      `Flag: ${flag.title} (${flag.severity}). ${flag.recommended_fix}`,
    );
  }
  return lines;
}

/** Single string version for the clipboard. */
export function buildElevationSummaryText(
  result: MathematicalElevationResult,
  system: ElevationUnitSystem,
): string {
  return buildElevationSummaryLines(result, system).join("\n");
}
