/**
 * Solar/PV Roofing Estimator (Future Engine 16 - PRIMARY engine)
 *
 * Full material takeoff for a solar installation, entirely from
 * admin-configured panel models, component prices and rules.
 * Deterministic, pure, no I/O.
 *
 * Two modes:
 *  - roof_area: panels = floor(usable_roof_area / panel_area)
 *  - energy_target: required kWp = target / (sun_hours × (1 − loss));
 *                  panels = ceil(required kWp / panel kWp)
 *
 * Quantities are ALWAYS computed from configured panel specs and
 * rules. Costs are only attached where a price is configured - an
 * unpriced component is reported as unpriced, never invented.
 *
 * House rules, identical to every other Frelux engine:
 *  - No configured panel model → REFUSED. Panel specs are never
 *    guessed.
 *  - A roof too small for a single panel → REFUSED.
 *  - Missing or invalid rules → REFUSED, one by name. Never
 *    defaulted, never invented.
 *  - A negative configured price → REFUSED (invalid data, not a
 *    zero price). A missing price → honest "unpriced" warning.
 *  - The total only ever sums priced lines - unpriced lines are
 *    listed with their quantities and flagged, never silently
 *    dropped or silently zero-costed.
 */

// Display formatting only (no engine logic): honours the visitor
// display currency; NGN renders exactly as before.
import { formatNGNForDisplay } from "@/lib/international/fx-display";
import { ruleNumber as getRuleValue } from "./shared/rule-value";

// Engine-narrative formatting: honours the visitor display currency and
// keeps trailing decimals (up to 2) so exact math values stay visible.
const fmtAuto = (n: number) => formatNGNForDisplay(n, { decimals: "auto" });

export interface PanelModelInput {
  watt_peak: number;
  length_m: number;
  width_m: number;
  unit_price_naira: number | null;
}

export interface SolarPriceInput {
  price_naira: number | null;
}

export interface SolarPvRule {
  rule_key: string;
  rule_value: Record<string, unknown>;
}

export interface SolarPvInput {
  mode: "roof_area" | "energy_target";
  panel: PanelModelInput | null;
  usable_roof_area_m2?: number;
  daily_energy_target_kwh?: number;
  cable_run_m: number;
  /** Cable run in feet (converted 1:0.3048 when the metric value is absent). */
  cable_run_ft?: number;
  /** Usable roof area in ft² (converted 1:0.092903 when m² is absent). */
  usable_roof_area_sqft?: number;
  battery_storage_kwh?: number | null;
  /**
   * Audit fix F8 (2026-10-26): hot-climate panel temperature derating.
   * When the real average ambient temperature is provided, cell
   * temperature is estimated as ambient + 30 degC at peak sun and the
   * Pmax temperature coefficient (0.004/degC typical, admin-overridable
   * via the optional 'pv_temp_coefficient_per_c' rule) is applied.
   * Null → not applied (behaviour unchanged).
   */
  avg_ambient_temp_c?: number | null;
  /**
   * Audit fix F8: battery chemistry for depth-of-discharge sizing.
   * lead_acid → 50% usable, lifepo4 → 85% usable (chemistry-standard
   * values, disclosed in the steps). Null → usable-capacity sizing is
   * skipped (behaviour unchanged) with a warning recommending chemistry.
   */
  battery_chemistry?: "lead_acid" | "lifepo4" | null;
  // ---- String voltage design (IEC 62548-1 / IEC 60364-7-712) ----
  //
  // Without these, string length is only an admin constant and nothing checks
  // that the array's open-circuit voltage on the coldest morning stays under
  // the inverter's DC limit. A string one panel too long destroys the inverter
  // input on a cold, bright morning, which is exactly when Voc peaks.
  /** Module open-circuit voltage at STC, volts. */
  module_voc_v?: number | null;
  /** Module voltage at maximum power at STC, volts. */
  module_vmp_v?: number | null;
  /** Voc temperature coefficient as a fraction per degC (e.g. -0.0029). */
  module_voc_temp_coeff_per_c?: number | null;
  /** Vmp temperature coefficient as a fraction per degC (e.g. -0.0035). */
  module_vmp_temp_coeff_per_c?: number | null;
  /** Inverter maximum DC input voltage, volts. */
  inverter_max_dc_voltage_v?: number | null;
  /** Inverter MPPT lower tracking limit, volts. */
  inverter_mppt_min_v?: number | null;
  /** Lowest expected cell temperature at the site, degC. */
  design_min_cell_temp_c?: number | null;
  /** Highest expected cell temperature at the site, degC. */
  design_max_cell_temp_c?: number | null;
  prices: Record<string, SolarPriceInput>;
  rules: SolarPvRule[];
}

export interface SolarMaterialLine {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  unit_price_naira: number | null;
  line_cost_naira: number | null; // null = unpriced
}

export interface SolarPvStep {
  label: string;
  detail: string;
}

export interface SolarPvResult {
  ok: boolean;
  warnings: string[];
  steps: SolarPvStep[];
  panel_count: number | null;
  array_kwp: number | null;
  daily_energy_kwh: number | null;
  inverter_size_kw: number | null;
  string_count: number | null;
  needed_roof_area_m2: number | null;
  battery_count: number;
  materials: SolarMaterialLine[];
  labor_cost_naira: number | null;
  total_cost_naira: number | null; // null = some lines unpriced
  total_of_priced_lines_naira: number;
}

/** Typical crystalline-silicon Pmax temperature coefficient, %/degC above 25. */
const DEFAULT_PV_TEMP_COEFFICIENT = 0.004;

/** Cell temperature offset above ambient at peak sun, degC. */
const CELL_TEMP_OFFSET_C = 30;

/**
 * Whether the configured system_loss_factor already contains the temperature
 * loss, which is how the seeded rule describes it: "Fraction of array output
 * lost to temperature, soiling, wiring and conversion".
 *
 * Audit fix: the temperature model was multiplied on top of that factor, so the
 * same temperature loss was counted twice and an array in a hot climate was
 * sized about 14 per cent large. Defaulting to true reproduces the loss
 * breakdown the rule states; an admin who wants the explicit temperature model
 * to own that loss sets pv_temp_coefficient_per_c alongside a lower
 * system_loss_factor and switches this to false.
 */
function lossIncludesTemperature(rules: SolarPvRule[]): boolean {
  const v = getRuleValue(rules, "system_loss_includes_temperature");
  return v === null ? true : v >= 0.5;
}

/**
 * Audit fix F8: PV temperature derating. Returns 1 (no derate) when the
 * ambient temperature is not supplied; otherwise 1 - coeff x (cell - 25),
 * floored at 0.6 so an extreme input cannot invert the result.
 */
function pvTemperatureFactor(
  input: SolarPvInput,
  rules: SolarPvRule[],
  steps: { label: string; detail: string }[] | null,
): number {
  const ambient = input.avg_ambient_temp_c ?? null;
  if (ambient === null || !Number.isFinite(ambient)) return 1;
  const coeffRule = getRuleValue(rules, "pv_temp_coefficient_per_c");
  const coeff =
    coeffRule !== null && coeffRule > 0 && coeffRule < 0.02
      ? coeffRule
      : DEFAULT_PV_TEMP_COEFFICIENT;
  const cellTemp = ambient + CELL_TEMP_OFFSET_C;
  const factor = Math.max(0.6, 1 - coeff * (cellTemp - 25));
  if (steps) {
    steps.push({
      label: "Panel temperature derating",
      detail: `Cell temp ≈ ${ambient} °C ambient + ${CELL_TEMP_OFFSET_C} °C = ${cellTemp} °C; Pmax coefficient ${coeff}/°C → × ${Math.round(factor * 1000) / 1000} on output. A 12-16% real loss in hot climates the nameplate rating hides.`,
    });
  }
  return factor;
}

/** Chemistry-standard usable depth of discharge (disclosed, not invented). */
const BATTERY_USABLE_DOD: Record<"lead_acid" | "lifepo4", number> = {
  lead_acid: 0.5,
  lifepo4: 0.85,
};

const REQUIRED_RULES = [
  "peak_sun_hours_day",
  "system_loss_factor",
  "inverter_dc_ac_ratio",
  "rails_per_panel",
  "mid_clamps_per_panel",
  "end_clamps_per_panel",
  "mc4_pairs_per_panel",
  "dc_cable_per_panel_m",
  "string_size_max",
  "labor_cost_per_panel_naira",
  "rounding_decimals",
] as const;

const COMPONENT_LABELS: Record<string, { label: string; unit: string }> = {
  panel: { label: "Solar panels", unit: "panel" },
  mounting_rail_per_m: { label: "Mounting rails", unit: "m" },
  mid_clamp: { label: "Mid clamps", unit: "unit" },
  end_clamp: { label: "End clamps", unit: "unit" },
  mc4_connector_pair: { label: "MC4 connector pairs", unit: "pair" },
  dc_cable_per_m: { label: "DC string cable", unit: "m" },
  ac_cable_per_m: { label: "AC cable to distribution", unit: "m" },
  dc_breaker: { label: "DC breakers (one per string)", unit: "unit" },
  ac_breaker: { label: "AC breaker", unit: "unit" },
  surge_protector: { label: "Surge protectors (DC + AC)", unit: "unit" },
  earthing_kit: { label: "Earthing kit", unit: "unit" },
  inverter_price_per_kw: { label: "Inverter", unit: "kW" },
  battery_unit: { label: "Battery units", unit: "unit" },
};

/**
 * Series modules a string may hold, from the module's own voltage data.
 *
 * Upper bound: Voc corrected to the coldest expected cell temperature must stay
 * at or below the inverter's maximum DC input voltage (IEC 62548-1; NEC 690.7
 * for the temperature correction). Lower bound: Vmp corrected to the hottest
 * expected cell temperature must still reach the MPPT window, otherwise the
 * array stops producing in the afternoon heat.
 *
 * Returns null when the data needed is absent, so a caller must disclose that
 * the string length is an assumption rather than a check.
 */
export function stringSeriesLimits(params: {
  module_voc_v?: number | null;
  module_vmp_v?: number | null;
  module_voc_temp_coeff_per_c?: number | null;
  module_vmp_temp_coeff_per_c?: number | null;
  inverter_max_dc_voltage_v?: number | null;
  inverter_mppt_min_v?: number | null;
  design_min_cell_temp_c?: number | null;
  design_max_cell_temp_c?: number | null;
}): {
  max_series: number | null;
  min_series: number | null;
  voc_cold_v: number | null;
  vmp_hot_v: number | null;
} {
  const num = (v: unknown): number | null => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : null;
  };
  const voc = num(params.module_voc_v);
  const vmp = num(params.module_vmp_v);
  const vdcMax = num(params.inverter_max_dc_voltage_v);
  const mpptMin = num(params.inverter_mppt_min_v);
  const tMin = Number(params.design_min_cell_temp_c);
  const tMax = Number(params.design_max_cell_temp_c);
  let bVoc = Number(params.module_voc_temp_coeff_per_c);
  if (Number.isFinite(bVoc)) {
    // If entered as percentage (e.g. -0.28 %/degC), convert to fraction per degC (-0.0028)
    if (Math.abs(bVoc) > 0.05) bVoc /= 100;
    // Standard silicon PV cells always have a negative Voc temperature coefficient
    if (bVoc > 0) bVoc = -bVoc;
  }
  let bVmp = Number(params.module_vmp_temp_coeff_per_c);
  if (Number.isFinite(bVmp)) {
    if (Math.abs(bVmp) > 0.05) bVmp /= 100;
    if (bVmp > 0) bVmp = -bVmp;
  }

  const vocCold =
    voc !== null && Number.isFinite(tMin) && Number.isFinite(bVoc)
      ? voc * (1 + bVoc * (tMin - 25))
      : null;
  const vmpHot =
    vmp !== null && Number.isFinite(tMax) && Number.isFinite(bVmp)
      ? vmp * (1 + bVmp * (tMax - 25))
      : null;

  const maxSeries =
    vocCold !== null && vdcMax !== null && vocCold > 0
      ? Math.floor(vdcMax / vocCold)
      : null;
  const minSeries =
    vmpHot !== null && mpptMin !== null && vmpHot > 0
      ? Math.ceil(mpptMin / vmpHot)
      : null;

  return {
    max_series: maxSeries !== null && maxSeries > 0 ? maxSeries : null,
    min_series: minSeries,
    voc_cold_v: vocCold === null ? null : Math.round(vocCold * 100) / 100,
    vmp_hot_v: vmpHot === null ? null : Math.round(vmpHot * 100) / 100,
  };
}

export function calculateSolarPv(input: SolarPvInput): SolarPvResult {
  const warnings: string[] = [];
  const steps: SolarPvStep[] = [];

  const refuse = (msgs: string[]): SolarPvResult => ({
    ok: false,
    warnings: msgs,
    steps: [],
    panel_count: null,
    array_kwp: null,
    daily_energy_kwh: null,
    inverter_size_kw: null,
    string_count: null,
    needed_roof_area_m2: null,
    battery_count: 0,
    materials: [],
    labor_cost_naira: null,
    total_cost_naira: null,
    total_of_priced_lines_naira: 0,
  });

  const { mode, panel, prices, rules } = input;

  // ── Validation: panel model configured (never guessed) ──
  if (!panel) {
    return refuse([
      "No solar panel model is configured. The estimator refuses to guess panel wattage or dimensions: FRELUX must configure a model from a manufacturer datasheet.",
    ]);
  }
  const { watt_peak, length_m, width_m, unit_price_naira } = panel;
  if (
    !Number.isFinite(watt_peak) ||
    watt_peak <= 0 ||
    !Number.isFinite(length_m) ||
    length_m <= 0 ||
    !Number.isFinite(width_m) ||
    width_m <= 0
  ) {
    return refuse([
      "The configured panel model has invalid specs (wattage and dimensions must be positive). The estimator refuses to compute from an invalid model: fix it in the FRELUX configuration.",
    ]);
  }

  // ── Validation: cable run ─────────────────────────────
  const runFt = input.cable_run_ft ?? NaN;
  const run =
    Number.isFinite(input.cable_run_m) && input.cable_run_m > 0
      ? input.cable_run_m
      : Number.isFinite(runFt) && runFt > 0
        ? runFt * 0.3048
        : 0;
  if (!Number.isFinite(run) || run <= 0) {
    return refuse([
      "Enter the cable run from the array to the inverter/distribution point in metres: it must be a positive number. The estimator does not invent wiring lengths.",
    ]);
  }

  // ── Validation: mode inputs ────────────────────────────
  const SQFT_TO_M2 = 0.09290304;
  let effectiveRoofAreaM2: number | null = null;
  if (Number.isFinite(input.usable_roof_area_m2) && (input.usable_roof_area_m2 as number) > 0) {
    effectiveRoofAreaM2 = input.usable_roof_area_m2 as number;
  } else if (Number.isFinite(input.usable_roof_area_sqft) && (input.usable_roof_area_sqft as number) > 0) {
    effectiveRoofAreaM2 = (input.usable_roof_area_sqft as number) * SQFT_TO_M2;
  }

  if (mode === "roof_area") {
    if (effectiveRoofAreaM2 === null || effectiveRoofAreaM2 <= 0) {
      return refuse([
        "Enter the usable roof area in square metres or square feet: it must be a positive number.",
      ]);
    }
  } else {
    const target = input.daily_energy_target_kwh!;
    if (!Number.isFinite(target) || target <= 0) {
      return refuse([
        "Enter your target daily energy in kWh: it must be a positive number.",
      ]);
    }
  }

  // ── Validation: rules present and sane (never defaulted) ──
  const rv: Record<string, number> = {};
  for (const key of REQUIRED_RULES) {
    let v = getRuleValue(rules, key);
    if (key === "labor_cost_per_panel_naira" && v === null) {
      v = getRuleValue(rules, "labor_cost_per_panel");
    }
    if (v === null) {
      return refuse([
        `No '${key}' rule is configured for this calculator. The estimator refuses to invent it: configure the rule in the FRELUX configuration.`,
      ]);
    }
    if (v < 0) {
      return refuse([
        `The configured '${key}' rule (${v}) is negative. The estimator refuses to compute from an invalid rule: fix it in the FRELUX configuration.`,
      ]);
    }
    rv[key] = v;
  }
  if (rv.peak_sun_hours_day === 0) {
    return refuse([
      "The configured 'peak_sun_hours_day' rule is zero: no energy can be estimated. Fix the rule in the FRELUX configuration.",
    ]);
  }
  if (rv.system_loss_factor >= 1) {
    return refuse([
      "The configured 'system_loss_factor' rule must be below 1: a 100% loss system produces nothing. Fix the rule in the FRELUX configuration.",
    ]);
  }
  if (rv.inverter_dc_ac_ratio === 0) {
    return refuse([
      "The configured 'inverter_dc_ac_ratio' rule is zero: division by zero. Fix the rule in the FRELUX configuration.",
    ]);
  }
  if (!Number.isInteger(rv.string_size_max) || rv.string_size_max < 1) {
    return refuse([
      "The configured 'string_size_max' rule must be a whole number of at least 1.",
    ]);
  }
  if (!Number.isInteger(rv.rails_per_panel) || rv.rails_per_panel < 1) {
    return refuse([
      "The configured 'rails_per_panel' rule must be a whole number of at least 1.",
    ]);
  }
  const round = rv.rounding_decimals;
  if (!Number.isInteger(round) || round < 0 || round > 6) {
    return refuse([
      "The configured 'rounding_decimals' rule must be a whole number between 0 and 6.",
    ]);
  }
  const r = (n: number) => Number(n.toFixed(round));

  // ── Validation: prices sane (negative → invalid data) ──
  for (const [key, p] of Object.entries(prices)) {
    if (
      p &&
      p.price_naira !== null &&
      (!Number.isFinite(p.price_naira) || p.price_naira < 0)
    ) {
      return refuse([
        `The configured price for '${key}' (${p.price_naira}) is invalid. The estimator refuses to compute from an invalid price: fix it in the FRELUX configuration.`,
      ]);
    }
  }

  // ── Deterministic chain: panel count ──────────────────
  const panelArea = length_m * width_m;
  const panelKwp = watt_peak / 1000;
  let panelCount: number;

  if (mode === "roof_area") {
    panelCount = Math.floor(effectiveRoofAreaM2! / panelArea);
    steps.push({
      label: "Panels that fit the roof",
      detail: `floor(${r(effectiveRoofAreaM2!)} m² ÷ ${r(panelArea)} m² per panel) = ${panelCount} panels.`,
    });
    if (panelCount < 1) {
      return refuse([
        `The usable roof area (${r(effectiveRoofAreaM2!)} m²) is smaller than one panel (${r(panelArea)} m²). There is nothing to estimate: no invented numbers.`,
      ]);
    }
  } else {
    const target = input.daily_energy_target_kwh!;
    const tempFactor = pvTemperatureFactor(input, rules, steps);
    const tempCounted = lossIncludesTemperature(rules) ? 1 : tempFactor;
    const derate = (1 - rv.system_loss_factor) * tempCounted;
    const requiredKwp = target / (rv.peak_sun_hours_day * derate);
    panelCount = Math.ceil(requiredKwp / panelKwp);
    steps.push({
      label: "Array size for the energy target",
      detail: `${r(target)} kWh/day ÷ (${rv.peak_sun_hours_day} sun hours × ${r(derate)} derate) = ${r(requiredKwp)} kWp required.`,
    });
    steps.push({
      label: "Panels for that array",
      detail: `ceil(${r(requiredKwp)} kWp ÷ ${panelKwp} kWp per panel) = ${panelCount} panels.`,
    });
    const neededArea = panelCount * panelArea;
    steps.push({
      label: "Roof area required",
      detail: `${panelCount} × ${r(panelArea)} m² = ${r(neededArea)} m² of roof needed.`,
    });
    if (
      effectiveRoofAreaM2 !== null &&
      neededArea > effectiveRoofAreaM2
    ) {
      return refuse([
        `This target needs ${r(neededArea)} m² of roof but only ${r(effectiveRoofAreaM2)} m² is available. The estimator refuses to produce a plan that physically cannot fit.`,
      ]);
    }
  }

  // ── Array, energy, inverter, strings ───────────────────
  const arrayKwp = panelCount * panelKwp;
  const arrayTempFactorRaw = pvTemperatureFactor(input, rules, null);
  const arrayTempFactor = lossIncludesTemperature(rules)
    ? 1
    : arrayTempFactorRaw;
  const dailyEnergy =
    arrayKwp *
    rv.peak_sun_hours_day *
    (1 - rv.system_loss_factor) *
    arrayTempFactor;
  const inverterKw = arrayKwp / rv.inverter_dc_ac_ratio;
  // ── String length: computed from the module's voltage data where supplied ──
  const seriesLimits = stringSeriesLimits(input);
  let seriesMax = rv.string_size_max;
  const vocCold = seriesLimits.voc_cold_v;
  if (seriesLimits.max_series !== null && vocCold !== null) {
    if (rv.string_size_max > seriesLimits.max_series) {
      warnings.push(
        `The configured maximum string of ${rv.string_size_max} panels exceeds the ${seriesLimits.max_series} the module voltage allows. At ${seriesLimits.voc_cold_v} V per panel on the coldest design morning, ${rv.string_size_max} in series reaches ${Math.round(vocCold * rv.string_size_max)} V against a ${input.inverter_max_dc_voltage_v} V inverter limit. Strings are sized to ${seriesLimits.max_series} instead.`,
      );
      seriesMax = seriesLimits.max_series;
    }
    steps.push({
      label: "String voltage limit",
      detail: `Voc corrected to ${input.design_min_cell_temp_c} degC is ${vocCold} V per panel, so at most ${seriesLimits.max_series} panels in series stay under the ${input.inverter_max_dc_voltage_v} V DC limit.`,
    });
    if (
      seriesLimits.min_series !== null &&
      seriesLimits.min_series > seriesMax
    ) {
      warnings.push(
        `No string length satisfies both limits: the MPPT needs at least ${seriesLimits.min_series} panels at ${seriesLimits.vmp_hot_v} V in the heat, but the DC limit allows at most ${seriesMax}. The inverter is mismatched to this module; check its MPPT window.`,
      );
    }
  } else {
    warnings.push(
      "String length is the configured assumption of " +
        `${rv.string_size_max} panels, not a voltage check. Supply the module Voc, its temperature coefficient and the inverter's maximum DC voltage to have the series limit computed instead.`,
    );
  }
  const strings = Math.ceil(panelCount / seriesMax);

  steps.push({
    label: "Array size",
    detail: `${panelCount} × ${panelKwp} kWp = ${r(arrayKwp)} kWp.`,
  });
  steps.push({
    label: "Estimated daily energy",
    detail:
      arrayTempFactor === 1
        ? `${r(arrayKwp)} kWp × ${rv.peak_sun_hours_day} sun hours × ${r(1 - rv.system_loss_factor)} derate = ${r(dailyEnergy)} kWh/day. The configured derate already carries the temperature loss, so it is not applied a second time${arrayTempFactorRaw < 1 ? `; the panel temperature model would have taken a further × ${r(arrayTempFactorRaw)}` : ""}.`
        : `${r(arrayKwp)} kWp × ${rv.peak_sun_hours_day} sun hours × ${r(1 - rv.system_loss_factor)} system derate × ${r(arrayTempFactor)} temperature derate = ${r(dailyEnergy)} kWh/day.`,
  });
  steps.push({
    label: "Inverter size",
    detail: `${r(arrayKwp)} kWp ÷ ${rv.inverter_dc_ac_ratio} (configured DC/AC ratio) = ${r(inverterKw)} kW AC.`,
  });
  steps.push({
    label: "Strings",
    detail: `ceil(${panelCount} ÷ ${seriesMax} max per string) = ${strings} strings: one DC breaker each.`,
  });

  // ── Battery bank (only when storage is requested) ─────
  let batteryCount = 0;
  const storage = input.battery_storage_kwh ?? null;
  if (storage !== null && Number.isFinite(storage)) {
    if (storage <= 0) {
      return refuse([
        "Requested battery storage must be a positive number of kWh (or left blank for no batteries).",
      ]);
    }
    const unitCap = getRuleValue(rules, "battery_unit_capacity_kwh");
    if (unitCap === null || unitCap <= 0) {
      return refuse([
        "No valid 'battery_unit_capacity_kwh' rule is configured. The estimator refuses to invent a battery size: configure the rule in the FRELUX configuration.",
      ]);
    }
    const chemistry = input.battery_chemistry ?? null;
    if (chemistry === null) {
      batteryCount = Math.ceil(storage / unitCap);
      steps.push({
        label: "Battery bank",
        detail: `ceil(${r(storage)} kWh ÷ ${unitCap} kWh per unit) = ${batteryCount} battery units.`,
      });
      warnings.push(
        "Battery chemistry not selected: usable depth of discharge was NOT applied. A lead-acid bank sized this way delivers ~50% of nameplate before recharge limits; select a chemistry for honest usable-capacity sizing.",
      );
    } else {
      const dod = BATTERY_USABLE_DOD[chemistry];
      const usablePerUnit = unitCap * dod;
      batteryCount = Math.ceil(storage / usablePerUnit);
      steps.push({
        label: "Battery bank",
        detail: `ceil(${r(storage)} kWh ÷ (${unitCap} kWh × ${dod * 100}% usable ${chemistry === "lead_acid" ? "lead-acid" : "LiFePO4"} DoD) = ${batteryCount} battery units.`,
      });
      if (chemistry === "lead_acid") {
        warnings.push(
          "Lead-acid: discharging below 50% regularly destroys the bank within months. The unit count reflects that usable limit.",
        );
      }
    }
  }

  // ── Material takeoff (always computed) ─────────────────
  const railM = panelCount * rv.rails_per_panel * length_m;
  const dcCableM = panelCount * rv.dc_cable_per_panel_m + 2 * run; // pos + neg
  const acCableM = run;

  const quantities: Array<[string, number, string]> = [
    ["panel", panelCount, "panel"],
    ["mounting_rail_per_m", r(railM), "m"],
    ["mid_clamp", panelCount * rv.mid_clamps_per_panel, "unit"],
    ["end_clamp", panelCount * rv.end_clamps_per_panel, "unit"],
    ["mc4_connector_pair", panelCount * rv.mc4_pairs_per_panel, "pair"],
    ["dc_cable_per_m", r(dcCableM), "m"],
    ["ac_cable_per_m", r(acCableM), "m"],
    ["dc_breaker", strings, "unit"],
    ["ac_breaker", 1, "unit"],
    ["surge_protector", 2, "unit"], // one DC-side + one AC-side
    ["earthing_kit", 1, "unit"],
    ["inverter_price_per_kw", r(inverterKw), "kW"],
  ];
  if (batteryCount > 0) {
    quantities.push(["battery_unit", batteryCount, "unit"]);
  }

  const materials: SolarMaterialLine[] = [];
  const unpriced: string[] = [];
  let totalPriced = 0;

  for (const [key, qty, unit] of quantities) {
    const meta = COMPONENT_LABELS[key] ?? { label: key, unit };
    let price: number | null = null;
    if (key === "panel") price = unit_price_naira;
    else price = prices[key]?.price_naira ?? null;

    if (price === null) {
      unpriced.push(meta.label);
      materials.push({
        key,
        label: meta.label,
        quantity: qty,
        unit,
        unit_price_naira: null,
        line_cost_naira: null,
      });
    } else {
      const line = Number((qty * price).toFixed(round));
      totalPriced += line;
      materials.push({
        key,
        label: meta.label,
        quantity: qty,
        unit,
        unit_price_naira: price,
        line_cost_naira: line,
      });
    }
  }

  // ── Labour ─────────────────────────────────────────────
  const labor = Number(
    (panelCount * rv.labor_cost_per_panel_naira).toFixed(round),
  );
  steps.push({
    label: "Installation labour",
    detail: `${panelCount} panels × ${fmtAuto(rv.labor_cost_per_panel_naira)} per panel = ${fmtAuto(labor)}.`,
  });

  if (unpriced.length > 0) {
    warnings.push(
      `No price is configured for: ${unpriced.join(", ")}. Their quantities are reported, but the total cannot be complete: the estimator does not invent prices. Configure prices in the FRELUX configuration.`,
    );
  }

  const grandTotal = totalPriced + labor;
  const complete = unpriced.length === 0;

  return {
    ok: true,
    warnings,
    steps,
    panel_count: panelCount,
    array_kwp: r(arrayKwp),
    daily_energy_kwh: r(dailyEnergy),
    inverter_size_kw: r(inverterKw),
    string_count: strings,
    needed_roof_area_m2: r(panelCount * panelArea),
    battery_count: batteryCount,
    materials,
    labor_cost_naira: labor,
    total_cost_naira: complete ? Number(grandTotal.toFixed(round)) : null,
    total_of_priced_lines_naira: Number(grandTotal.toFixed(round)),
  };
}
