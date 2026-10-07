/**
 * FRELUX Heat Comfort Engine (Future Engine 6)
 *
 * Compares how two finish choices affect indoor heat comfort
 * via admin-configured solar reflectance (albedo) factors.
 *
 * Deterministic math:
 *   absorbed fraction of incident solar energy = 1 − albedo
 *   daily absorbed-energy delta (kWh/day)
 *     = area × irradiance_rule × (albedo_old − albedo_new)
 *   reduction % = (albedo_new − albedo_old) / (1 − albedo_old) × 100
 *
 * Philosophy (unchanged): the engine never guesses.
 * - A finish without a configured factor is flagged, never
 *   scored with an assumed albedo.
 * - A darker proposed finish (lower albedo) absorbs MORE heat;
 *   the engine reports that honestly as a negative benefit.
 * - Zero-area, invalid albedo, or missing inputs are refused
 *   with warnings, never smoothed over.
 */

import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface HeatComfortInput {
  surface_type: "roof" | "wall";
  /** Surface area in square metres */
  area_sqm: number;
  current_category: string;
  proposed_category: string;
  /** Admin-configured albedo factors, keyed `${surface_type}:${category}` */
  factors: Record<string, { solar_reflectance: number }>;
  /** Active calc rules (calculator_type = 'heat_comfort') */
  rules: EstimationCalcRule[];
}

export interface HeatComfortResult {
  ok: boolean;
  surface_type: string | null;
  area_sqm: number | null;
  current_category: string | null;
  proposed_category: string | null;
  current_albedo: number | null;
  proposed_albedo: number | null;
  /** Fraction of incident solar energy absorbed by the current finish */
  current_absorbed_fraction: number | null;
  proposed_absorbed_fraction: number | null;
  /** kWh/day of solar energy no longer absorbed (positive = cooling benefit) */
  daily_energy_delta_kwh: number | null;
  /** Percentage reduction in absorbed solar energy (null when base is 0) */
  reduction_percent: number | null;
  /** Admin threshold: does the reduction count as a meaningful cooling benefit? */
  meaningful_benefit: boolean | null;
  /** Direction of the comfort effect */
  direction: "cooler" | "warmer" | "no_change" | null;
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function roundTo(v: number, dp: number): number {
  const m = Math.pow(10, dp);
  return Math.round(v * m) / m;
}

function ruleNumber(rules: EstimationCalcRule[], key: string): number | null {
  const r = rules.find((x) => x.rule_key === key && x.is_active !== false);
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return Number.isFinite(v) ? v : null;
}

const MAX_DP = 4;

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateHeatComfort(
  input: HeatComfortInput,
): HeatComfortResult {
  const result: HeatComfortResult = {
    ok: false,
    surface_type: null,
    area_sqm: null,
    current_category: null,
    proposed_category: null,
    current_albedo: null,
    proposed_albedo: null,
    current_absorbed_fraction: null,
    proposed_absorbed_fraction: null,
    daily_energy_delta_kwh: null,
    reduction_percent: null,
    meaningful_benefit: null,
    direction: null,
    warnings: [],
    steps: [],
  };

  const st = input.surface_type;
  if (st !== "roof" && st !== "wall") {
    result.warnings.push(
      "Surface type must be 'roof' or 'wall': the engine never scores an unknown surface.",
    );
    return result;
  }
  result.surface_type = st;

  const area = Number(input.area_sqm);
  if (!Number.isFinite(area) || area <= 0) {
    result.warnings.push(
      "Surface area must be a positive number of square metres.",
    );
    return result;
  }
  result.area_sqm = area;

  const curCat = input.current_category?.trim();
  const propCat = input.proposed_category?.trim();
  if (!curCat || !propCat) {
    result.warnings.push(
      "Both a current and a proposed finish must be selected: the engine never scores a blank choice.",
    );
    return result;
  }
  result.current_category = curCat;
  result.proposed_category = propCat;

  const decimals = Math.min(
    MAX_DP,
    Math.max(0, Math.trunc(ruleNumber(input.rules, "rounding_decimals") ?? 2)),
  );
  const irradiance = ruleNumber(
    input.rules,
    "solar_irradiance_kwh_per_sqm_day",
  );
  const threshold = ruleNumber(input.rules, "meaningful_reduction_threshold");

  if (irradiance === null || irradiance <= 0) {
    result.warnings.push(
      "No valid solar_irradiance_kwh_per_sqm_day rule is configured: the reflectance comparison cannot be converted into energy. FRELUX never invents a climate.",
    );
    return result;
  }

  // ── 1. Look up both albedos - configured factors only, never assumed ──
  const curKey = `${st}:${curCat}`;
  const propKey = `${st}:${propCat}`;
  const curFactor = input.factors?.[curKey];
  const propFactor = input.factors?.[propKey];

  if (!curFactor || !Number.isFinite(Number(curFactor.solar_reflectance))) {
    result.warnings.push(
      `No albedo is configured for the current finish '${curCat}' on a ${st}: the engine never assumes a reflectance. Configure the factor in the admin pane first.`,
    );
    return result;
  }
  if (!propFactor || !Number.isFinite(Number(propFactor.solar_reflectance))) {
    result.warnings.push(
      `No albedo is configured for the proposed finish '${propCat}' on a ${st}: the engine never assumes a reflectance. Configure the factor in the admin pane first.`,
    );
    return result;
  }

  const curAlbedo = Number(curFactor.solar_reflectance);
  const propAlbedo = Number(propFactor.solar_reflectance);
  if (curAlbedo < 0 || curAlbedo > 1 || propAlbedo < 0 || propAlbedo > 1) {
    result.warnings.push(
      "A configured albedo lies outside the physical range 0–1. Fix the factor in the admin pane: the engine never clamps data to force an answer.",
    );
    return result;
  }
  result.current_albedo = curAlbedo;
  result.proposed_albedo = propAlbedo;

  // ── 2. Absorbed fractions - the honest physics-lite ──
  const curAbsorbed = roundTo(1 - curAlbedo, decimals);
  const propAbsorbed = roundTo(1 - propAlbedo, decimals);
  result.current_absorbed_fraction = curAbsorbed;
  result.proposed_absorbed_fraction = propAbsorbed;
  result.steps.push({
    label: "Absorbed fraction",
    detail: `Current '${curCat}' absorbs ${curAbsorbed} of incident solar energy (albedo ${curAlbedo}); proposed '${propCat}' absorbs ${propAbsorbed} (albedo ${propAlbedo}). Both from configured factors, never assumed.`,
  });

  // ── 3. Daily energy delta - from the configured irradiance rule ──
  const deltaKwh = roundTo(
    area * irradiance * (propAlbedo - curAlbedo),
    decimals,
  );
  result.daily_energy_delta_kwh = deltaKwh;
  result.steps.push({
    label: "Daily energy delta",
    detail: `${area} m² × ${irradiance} kWh/m²/day (configured rule) × (${propAlbedo} − ${curAlbedo}) = ${deltaKwh} kWh/day. Positive means less solar energy absorbed: a cooling benefit.`,
  });

  // ── 4. Reduction percentage - null on a zero base, never a fake number ──
  if (curAbsorbed > 0) {
    const pct = roundTo(
      ((propAbsorbed - curAbsorbed) / curAbsorbed) * -100,
      decimals,
    );
    result.reduction_percent = pct;
  } else {
    result.warnings.push(
      "The current finish already reflects all incident solar energy (albedo 1), so no percentage reduction is computable: the delta alone is reported.",
    );
  }

  // ── 5. Direction and the admin's meaningfulness threshold ──
  if (Math.abs(propAlbedo - curAlbedo) < 0.005) {
    result.direction = "no_change";
  } else {
    result.direction = propAlbedo > curAlbedo ? "cooler" : "warmer";
  }

  if (propAlbedo < curAlbedo) {
    result.warnings.push(
      `The proposed finish '${propCat}' has a LOWER albedo than the current one: it absorbs more heat, making the space warmer, not cooler. Reported honestly, never spun as a benefit.`,
    );
  }

  if (
    threshold !== null &&
    threshold >= 0 &&
    curAbsorbed > 0 &&
    result.reduction_percent !== null
  ) {
    const frac = result.reduction_percent / 100;
    result.meaningful_benefit = frac >= threshold;
    result.steps.push({
      label: "Meaningful benefit",
      detail: `Absorbed-energy reduction ${result.reduction_percent}% vs the admin threshold of ${threshold * 100}%: ${
        result.meaningful_benefit
          ? "a meaningful cooling benefit."
          : "below the configured threshold for a meaningful benefit."
      } The threshold is the admin's reporting call, not the engine's.`,
    });
  }

  result.ok = true;
  return result;
}
