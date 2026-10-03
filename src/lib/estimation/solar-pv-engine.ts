/**
 * Solar/PV Roofing Estimator (Future Engine 16 — PRIMARY engine)
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
 * rules. Costs are only attached where a price is configured — an
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
 *  - The total only ever sums priced lines — unpriced lines are
 *    listed with their quantities and flagged, never silently
 *    dropped or silently zero-costed.
 */

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
  battery_storage_kwh?: number | null;
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

function getRuleValue(rules: SolarPvRule[], key: string): number | null {
  for (const r of rules) {
    if (r.rule_key !== key) continue;
    const v = r.rule_value?.value;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
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
      "No solar panel model is configured. The estimator refuses to guess panel wattage or dimensions — an admin must configure a model from a manufacturer datasheet.",
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
      "The configured panel model has invalid specs (wattage and dimensions must be positive). The estimator refuses to compute from an invalid model — fix it in the admin config.",
    ]);
  }

  // ── Validation: cable run ─────────────────────────────
  const run = input.cable_run_m;
  if (!Number.isFinite(run) || run <= 0) {
    return refuse([
      "Enter the cable run from the array to the inverter/distribution point in metres — it must be a positive number. The estimator does not invent wiring lengths.",
    ]);
  }

  // ── Validation: mode inputs ────────────────────────────
  if (mode === "roof_area") {
    const area = input.usable_roof_area_m2!;
    if (!Number.isFinite(area) || area <= 0) {
      return refuse([
        "Enter the usable roof area in square metres — it must be a positive number.",
      ]);
    }
  } else {
    const target = input.daily_energy_target_kwh!;
    if (!Number.isFinite(target) || target <= 0) {
      return refuse([
        "Enter your target daily energy in kWh — it must be a positive number.",
      ]);
    }
  }

  // ── Validation: rules present and sane (never defaulted) ──
  const rv: Record<string, number> = {};
  for (const key of REQUIRED_RULES) {
    const v = getRuleValue(rules, key);
    if (v === null) {
      return refuse([
        `No '${key}' rule is configured for this calculator. The estimator refuses to invent it — configure the rule in the admin config.`,
      ]);
    }
    if (v < 0) {
      return refuse([
        `The configured '${key}' rule (${v}) is negative. The estimator refuses to compute from an invalid rule — fix it in the admin config.`,
      ]);
    }
    rv[key] = v;
  }
  if (rv.peak_sun_hours_day === 0) {
    return refuse([
      "The configured 'peak_sun_hours_day' rule is zero — no energy can be estimated. Fix the rule in the admin config.",
    ]);
  }
  if (rv.system_loss_factor >= 1) {
    return refuse([
      "The configured 'system_loss_factor' rule must be below 1 — a 100% loss system produces nothing. Fix the rule in the admin config.",
    ]);
  }
  if (rv.inverter_dc_ac_ratio === 0) {
    return refuse([
      "The configured 'inverter_dc_ac_ratio' rule is zero — division by zero. Fix the rule in the admin config.",
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
        `The configured price for '${key}' (${p.price_naira}) is invalid. The estimator refuses to compute from an invalid price — fix it in the admin config.`,
      ]);
    }
  }

  // ── Deterministic chain: panel count ──────────────────
  const panelArea = length_m * width_m;
  const panelKwp = watt_peak / 1000;
  let panelCount: number;

  if (mode === "roof_area") {
    panelCount = Math.floor(input.usable_roof_area_m2! / panelArea);
    steps.push({
      label: "Panels that fit the roof",
      detail: `floor(${r(input.usable_roof_area_m2!)} m² ÷ ${r(panelArea)} m² per panel) = ${panelCount} panels.`,
    });
    if (panelCount < 1) {
      return refuse([
        `The usable roof area (${r(input.usable_roof_area_m2!)} m²) is smaller than one panel (${r(panelArea)} m²). There is nothing to estimate — no invented numbers.`,
      ]);
    }
  } else {
    const target = input.daily_energy_target_kwh!;
    const derate = 1 - rv.system_loss_factor;
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
      Number.isFinite(input.usable_roof_area_m2) &&
      input.usable_roof_area_m2! > 0 &&
      neededArea > input.usable_roof_area_m2!
    ) {
      return refuse([
        `This target needs ${r(neededArea)} m² of roof but only ${r(input.usable_roof_area_m2!)} m² is available. The estimator refuses to produce a plan that physically cannot fit.`,
      ]);
    }
  }

  // ── Array, energy, inverter, strings ───────────────────
  const arrayKwp = panelCount * panelKwp;
  const dailyEnergy =
    arrayKwp * rv.peak_sun_hours_day * (1 - rv.system_loss_factor);
  const inverterKw = arrayKwp / rv.inverter_dc_ac_ratio;
  const strings = Math.ceil(panelCount / rv.string_size_max);

  steps.push({
    label: "Array size",
    detail: `${panelCount} × ${panelKwp} kWp = ${r(arrayKwp)} kWp.`,
  });
  steps.push({
    label: "Estimated daily energy",
    detail: `${r(arrayKwp)} kWp × ${rv.peak_sun_hours_day} sun hours × ${r(1 - rv.system_loss_factor)} derate = ${r(dailyEnergy)} kWh/day.`,
  });
  steps.push({
    label: "Inverter size",
    detail: `${r(arrayKwp)} kWp ÷ ${rv.inverter_dc_ac_ratio} (configured DC/AC ratio) = ${r(inverterKw)} kW AC.`,
  });
  steps.push({
    label: "Strings",
    detail: `ceil(${panelCount} ÷ ${rv.string_size_max} max per string) = ${strings} strings — one DC breaker each.`,
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
        "No valid 'battery_unit_capacity_kwh' rule is configured. The estimator refuses to invent a battery size — configure the rule in the admin config.",
      ]);
    }
    batteryCount = Math.ceil(storage / unitCap);
    steps.push({
      label: "Battery bank",
      detail: `ceil(${r(storage)} kWh ÷ ${unitCap} kWh per unit) = ${batteryCount} battery units.`,
    });
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
    detail: `${panelCount} panels × ₦${rv.labor_cost_per_panel_naira.toLocaleString("en-NG")} per panel = ₦${labor.toLocaleString("en-NG")}.`,
  });

  if (unpriced.length > 0) {
    warnings.push(
      `No price is configured for: ${unpriced.join(", ")}. Their quantities are reported, but the total cannot be complete — the estimator does not invent prices. Configure prices in the admin config.`,
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
