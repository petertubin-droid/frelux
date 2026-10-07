/**
 * Reinforcement / Steel Engine (Tier 2, Engine 5)
 *
 * Deterministic reinforcement MATERIAL estimation from the
 * user's bar schedule.
 *
 *   USER: total cutting length per diameter (12/16/20/25 mm) -
 *         from a bar bending schedule or an explicit estimate.
 *   RULES: lap/cut/waste % per diameter, binding wire kg per
 *         tonne. Unit weights are the standard BS 4449 values
 *         (physics constants, shown in the breakdown).
 *
 * Honesty contract:
 *  - Lengths are NEVER assumed. A blank diameter is simply not
 *    used; if every diameter is blank, the engine says the bar
 *    schedule is missing rather than inventing steel.
 *  - Purchase quantity is whole 12 m stock lengths, rounded UP,
 *    with the lap/waste allowance visible and separate.
 *  - Tonnage is computed for delivery planning and shown in the
 *    breakdown; pricing is per 12 m length from the shared
 *    material database (the same records the Price Tracker
 *    manages).
 *  - Unpriced materials show PRICE NOT CONFIGURED; totals stay
 *    null. This does NOT design reinforcement.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────

export interface ReinforcementRules {
  rebar_lap_waste_pct: number;
  binding_wire_kg_per_tonne: number | null;
}

export const DEFAULT_REINFORCEMENT_RULES: ReinforcementRules = {
  rebar_lap_waste_pct: 0,
  binding_wire_kg_per_tonne: null,
};

export function parseReinforcementRules(
  rows: CalcRuleRow[],
): ReinforcementRules {
  const rules: ReinforcementRules = { ...DEFAULT_REINFORCEMENT_RULES };
  const get = (key: string): unknown | undefined => {
    const row = rows.find(
      (r) =>
        r.rule_key === key &&
        (r.is_active === undefined ||
          r.is_active === true ||
          r.is_active === null),
    );
    return row?.rule_value?.value;
  };
  const pct = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
  };
  const pos = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const lw = pct(get("rebar_lap_waste_pct"));
  if (lw !== null) rules.rebar_lap_waste_pct = lw;
  const bw = pos(get("binding_wire_kg_per_tonne"));
  if (bw !== null) rules.binding_wire_kg_per_tonne = bw;
  return rules;
}

// ─────────────────────────────────────────────
// Input / output
// ─────────────────────────────────────────────

export interface ReinforcementInput {
  /** Total 12 mm cutting length, m */
  len_12mm_m: number | null;
  /** Total 16 mm cutting length, m */
  len_16mm_m: number | null;
  /** Total 20 mm cutting length, m */
  len_20mm_m: number | null;
  /** Total 25 mm cutting length, m */
  len_25mm_m: number | null;
  labour: {
    mode: "none" | "per_tonne" | "lump_sum";
    per_tonne_rate?: number | null;
    lump_sum?: number | null;
  };
}

export interface ReinforcementLine {
  key: string;
  label: string;
  material_slug: string;
  quantity: number | null;
  quantity_source: "user_derived" | "rule_derived" | "missing";
  unit: string;
  detail: string;
  unit_price: number | null;
  line_total: number | null;
}

export interface ReinforcementStep {
  label: string;
  detail: string;
}

export interface ReinforcementResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: ReinforcementStep[];
  lines: ReinforcementLine[];
  /** total steel mass for delivery planning, kg */
  total_tonnage_kg: number | null;
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
}

export type ReinforcementPriceMap = Record<string, number | null>;

// ─────────────────────────────────────────────
// Standard constants (BS 4449 nominal mass per metre)
// ─────────────────────────────────────────────

const STOCK_LENGTH_M = 12;

const REBAR_SPECS: {
  key: string;
  label: string;
  slug: string;
  /** BS 4449 nominal mass, kg per metre */
  kg_per_m: number;
}[] = [
  {
    key: "rebar_12mm",
    label: "12 mm rebar (12 m lengths)",
    slug: "rebar-12mm-per-length",
    kg_per_m: 0.888,
  },
  {
    key: "rebar_16mm",
    label: "16 mm rebar (12 m lengths)",
    slug: "rebar-16mm-per-length",
    kg_per_m: 1.578,
  },
  {
    key: "rebar_20mm",
    label: "20 mm rebar (12 m lengths)",
    slug: "rebar-20mm-per-length",
    kg_per_m: 2.466,
  },
  {
    key: "rebar_25mm",
    label: "25 mm rebar (12 m lengths)",
    slug: "rebar-25mm-per-length",
    kg_per_m: 3.854,
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function ceilU(v: number): number {
  return Math.ceil(v - Math.max(1e-9, Math.abs(v) * 1e-12));
}

function roundTo(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateReinforcement(
  input: ReinforcementInput,
  rules: ReinforcementRules,
  prices: ReinforcementPriceMap,
): ReinforcementResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: ReinforcementStep[] = [];
  const missing: string[] = [];
  const lines: ReinforcementLine[] = [];

  // ── 0. Validation ──
  const lengths: [keyof ReinforcementInput, string][] = [
    ["len_12mm_m", "12 mm cutting length"],
    ["len_16mm_m", "16 mm cutting length"],
    ["len_20mm_m", "20 mm cutting length"],
    ["len_25mm_m", "25 mm cutting length"],
  ];
  for (const [key, label] of lengths) {
    const v = input[key] as number | null;
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      errors.push(
        `${label} must be a positive number (or 0 if unused), or left blank.`,
      );
    }
  }
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      steps,
      lines,
      total_tonnage_kg: null,
      priced_subtotal: 0,
      material_subtotal: null,
      labour_total: 0,
      grand_total: null,
      incomplete: true,
      missing,
    };
  }

  // ── 1. Stock lengths per diameter ──
  const lapFactor = 1 + rules.rebar_lap_waste_pct / 100;
  let totalMassKg = 0;
  let anyLength = false;

  const userLengths: Record<string, number | null> = {
    rebar_12mm: input.len_12mm_m,
    rebar_16mm: input.len_16mm_m,
    rebar_20mm: input.len_20mm_m,
    rebar_25mm: input.len_25mm_m,
  };

  for (const spec of REBAR_SPECS) {
    const len = userLengths[spec.key];
    if (len === null || len === 0) continue; // not used
    anyLength = true;
    const withAllowance = len * lapFactor;
    const pieces = ceilU(withAllowance / STOCK_LENGTH_M);
    const massKg = len * spec.kg_per_m; // tonnage uses true cutting length, not purchase length
    totalMassKg += massKg;
    const price = prices[spec.slug] ?? null;
    steps.push({
      label: spec.label,
      detail: `${len} m cutting × ${lapFactor.toFixed(2)} (lap/waste ${rules.rebar_lap_waste_pct}%) = ${roundTo(withAllowance, 2)} m ÷ ${STOCK_LENGTH_M} m = ${roundTo(withAllowance / STOCK_LENGTH_M, 2)} → ${pieces} lengths (whole, up). Mass ≈ ${len} × ${spec.kg_per_m} = ${roundTo(massKg, 1)} kg.`,
    });
    lines.push({
      key: spec.key,
      label: spec.label,
      material_slug: spec.slug,
      quantity: pieces,
      quantity_source: "user_derived",
      unit: "lengths",
      detail: `${len} m schedule × ${lapFactor.toFixed(2)} ÷ 12 m → ${pieces} × 12 m lengths (lap/waste +${roundTo(withAllowance - len, 2)} m shown separately; ${spec.kg_per_m} kg/m)`,
      unit_price: price,
      line_total: price !== null ? money(pieces * price) : null,
    });
  }

  if (!anyLength) {
    missing.push(
      "Bar schedule: enter the total cutting length for at least one diameter: the engine will not invent steel. Bar sizes and lengths are structural engineering decisions.",
    );
  } else {
    steps.push({
      label: "Total steel mass",
      detail: `≈ ${roundTo(totalMassKg, 1)} kg (${roundTo(totalMassKg / 1000, 3)} tonnes) computed from true cutting lengths using BS 4449 nominal mass per metre. For delivery planning.`,
    });
  }

  // ── 2. Binding wire - visible planning rule per tonne ──
  if (totalMassKg > 0) {
    if (rules.binding_wire_kg_per_tonne === null) {
      missing.push(
        "Binding wire: no planning rule configured (binding_wire_kg_per_tonne). Count it on site or configure the rule.",
      );
    } else {
      const kg = ceilU((totalMassKg / 1000) * rules.binding_wire_kg_per_tonne);
      const price = prices["binding-wire-per-kg"] ?? null;
      steps.push({
        label: "Binding wire",
        detail: `${roundTo(totalMassKg / 1000, 3)} t × ${rules.binding_wire_kg_per_tonne} kg/t = ${roundTo((totalMassKg / 1000) * rules.binding_wire_kg_per_tonne, 2)} → ${kg} kg (whole kg, up).`,
      });
      lines.push({
        key: "binding_wire",
        label: "Binding wire",
        material_slug: "binding-wire-per-kg",
        quantity: kg,
        quantity_source: "rule_derived",
        unit: "kg",
        detail: `${roundTo(totalMassKg / 1000, 3)} t × ${rules.binding_wire_kg_per_tonne} kg/t → ${kg} kg (admin's visible planning allowance)`,
        unit_price: price,
        line_total: price !== null ? money(kg * price) : null,
      });
    }
  }

  // ── 3. Labour - separate, never automatic ──
  let labourTotal = 0;
  if (input.labour.mode === "per_tonne") {
    const rate = input.labour.per_tonne_rate ?? null;
    if (rate === null || !Number.isFinite(rate) || rate < 0) {
      errors.push(
        "Labour: a per-tonne rate is required when labour mode is per-tonne.",
      );
    } else {
      labourTotal = money((totalMassKg / 1000) * rate);
      steps.push({
        label: "Labour",
        detail: `${roundTo(totalMassKg / 1000, 3)} t × ${rate} per tonne = ${labourTotal} (user-provided rate).`,
      });
    }
  } else if (input.labour.mode === "lump_sum") {
    const sum = input.labour.lump_sum ?? null;
    if (sum === null || !Number.isFinite(sum) || sum < 0) {
      errors.push(
        "Labour: a lump sum is required when labour mode is lump-sum.",
      );
    } else {
      labourTotal = money(sum);
      steps.push({
        label: "Labour",
        detail: `Lump sum ${sum} (user-provided).`,
      });
    }
  } else {
    steps.push({
      label: "Labour",
      detail: "Excluded: not added to the total.",
    });
  }

  // ── 4. Totals - never fabricated ──
  const pricedLines = lines.filter((l) => l.line_total !== null);
  const pricedSubtotal = money(
    pricedLines.reduce((s, l) => s + (l.line_total ?? 0), 0),
  );
  const allSizedAndPriced = lines.every(
    (l) => l.quantity !== null && l.line_total !== null,
  );
  const materialSubtotal = allSizedAndPriced
    ? money(lines.reduce((s, l) => s + (l.line_total ?? 0), 0))
    : null;

  for (const l of lines) {
    if (l.quantity !== null && l.unit_price === null) {
      warnings.push(
        `${l.label}: PRICE NOT CONFIGURED in the material database: quantity shown, no price invented.`,
      );
    }
  }
  warnings.push(
    "This is material ESTIMATION from your bar schedule: it does NOT design reinforcement. Bar sizes, spacing and laps are structural engineering decisions that must come from your engineer.",
  );

  const incomplete =
    lines.some((l) => l.quantity === null || l.line_total === null) ||
    missing.length > 0;
  const grandTotal =
    materialSubtotal !== null && errors.length === 0 && missing.length === 0
      ? money(materialSubtotal + labourTotal)
      : null;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    steps,
    lines,
    total_tonnage_kg: anyLength ? roundTo(totalMassKg, 1) : null,
    priced_subtotal: pricedSubtotal,
    material_subtotal: materialSubtotal,
    labour_total: labourTotal,
    grand_total: grandTotal,
    incomplete,
    missing,
  };
}
