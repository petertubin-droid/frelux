/**
 * Waterproofing Engine (Tier 2, Engine 3)
 *
 * Deterministic waterproofing MATERIAL estimation. Two quantity
 * sources only — user-measured areas/runs and admin rules:
 *
 *   USER: DPC run (m), DPM area (m²), wet-area floor area (m²),
 *         wet-area wall area (m²), wet-area perimeter (m),
 *         terrace/roof treatment area (m²).
 *   RULES: coats per surface, coating coverage per bag, membrane
 *         roll coverage, tape/DPC overlap %, coating waste %.
 *
 * Honesty contract:
 *  - Areas and runs are NEVER assumed. A missing input leaves its
 *    line unsized, the estimate is marked incomplete, and the
 *    missing input is named in plain words.
 *  - 0 means "this surface doesn't exist" (line omitted); blank
 *    means unsized.
 *  - Coats and coverage rates are visible rules, shown in the
 *    breakdown; the coverage rule must match the product the
 *    admin prices.
 *  - Prices come from the shared material database. Unpriced
 *    materials show PRICE NOT CONFIGURED; totals stay null.
 *  - This is material estimation, not waterproofing design.
 *
 * Rounding: rolls/bags/lengths round UP (whole units, coverage
 * safety), currency 2 dp at line-total/grand-total stage only.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────

export interface WaterproofingRules {
  coating_waste_pct: number;
  coats_wet_floor: number | null;
  coats_wet_wall: number | null;
  coats_terrace: number | null;
  cementitious_coverage_m2_per_bag: number | null;
  membrane_roll_coverage_m2: number | null;
  tape_overlap_pct: number;
  dpc_overlap_pct: number;
}

export const DEFAULT_WATERPROOFING_RULES: WaterproofingRules = {
  coating_waste_pct: 0,
  coats_wet_floor: null,
  coats_wet_wall: null,
  coats_terrace: null,
  cementitious_coverage_m2_per_bag: null,
  membrane_roll_coverage_m2: null,
  tape_overlap_pct: 0,
  dpc_overlap_pct: 0,
};

export function parseWaterproofingRules(
  rows: CalcRuleRow[],
): WaterproofingRules {
  const rules: WaterproofingRules = { ...DEFAULT_WATERPROOFING_RULES };
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
  const coats = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
  };

  const cw = pct(get("coating_waste_pct"));
  if (cw !== null) rules.coating_waste_pct = cw;
  const cwf = coats(get("coats_wet_floor"));
  if (cwf !== null) rules.coats_wet_floor = cwf;
  const cww = coats(get("coats_wet_wall"));
  if (cww !== null) rules.coats_wet_wall = cww;
  const ct = coats(get("coats_terrace"));
  if (ct !== null) rules.coats_terrace = ct;
  const cov = pos(get("cementitious_coverage_m2_per_bag"));
  if (cov !== null) rules.cementitious_coverage_m2_per_bag = cov;
  const mrc = pos(get("membrane_roll_coverage_m2"));
  if (mrc !== null) rules.membrane_roll_coverage_m2 = mrc;
  const to = pct(get("tape_overlap_pct"));
  if (to !== null) rules.tape_overlap_pct = to;
  const dpco = pct(get("dpc_overlap_pct"));
  if (dpco !== null) rules.dpc_overlap_pct = dpco;
  return rules;
}

// ─────────────────────────────────────────────
// Input / output
// ─────────────────────────────────────────────

export interface WaterproofingInput {
  /** Damp-proof course run at foundation/ground level, metres */
  dpc_run_m: number | null;
  /** Damp-proof membrane area, m² */
  dpm_area_m2: number | null;
  /** Wet-area (bathroom/kitchen) floor area to coat, m² */
  wet_floor_area_m2: number | null;
  /** Wet-area wall splash zone area to coat, m² */
  wet_wall_area_m2: number | null;
  /** Wet-area perimeter for corner tape, m */
  wet_perimeter_m: number | null;
  /** Terrace/roof treatment area, m² */
  terrace_area_m2: number | null;
  labour: {
    mode: "none" | "per_m2" | "lump_sum";
    per_m2_rate?: number | null;
    lump_sum?: number | null;
  };
}

export interface WaterproofingLine {
  key: string;
  label: string;
  material_slug: string;
  quantity: number | null;
  quantity_source:
    "user_derived" | "rule_derived" | "user_provided" | "missing";
  unit: string;
  detail: string;
  unit_price: number | null;
  line_total: number | null;
}

export interface WaterproofingStep {
  label: string;
  detail: string;
}

export interface WaterproofingResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: WaterproofingStep[];
  lines: WaterproofingLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
}

export type WaterproofingPriceMap = Record<string, number | null>;

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

export function calculateWaterproofing(
  input: WaterproofingInput,
  rules: WaterproofingRules,
  prices: WaterproofingPriceMap,
): WaterproofingResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: WaterproofingStep[] = [];
  const missing: string[] = [];
  const lines: WaterproofingLine[] = [];

  // ── 0. Validation ──
  const fields: [keyof WaterproofingInput, string][] = [
    ["dpc_run_m", "DPC run (m)"],
    ["dpm_area_m2", "DPM area (m²)"],
    ["wet_floor_area_m2", "Wet-area floor area (m²)"],
    ["wet_wall_area_m2", "Wet-area wall area (m²)"],
    ["wet_perimeter_m", "Wet-area perimeter (m)"],
    ["terrace_area_m2", "Terrace/roof area (m²)"],
  ];
  for (const [key, label] of fields) {
    const v = input[key] as number | null;
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      errors.push(
        `${label} must be a positive number (or 0 if none), or left blank.`,
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
      priced_subtotal: 0,
      material_subtotal: null,
      labour_total: 0,
      grand_total: null,
      incomplete: true,
      missing,
    };
  }

  // ── 1. DPC roll — user run + visible overlap ──
  if (input.dpc_run_m !== null && input.dpc_run_m > 0) {
    const factor = 1 + rules.dpc_overlap_pct / 100;
    const withOverlap = input.dpc_run_m * factor;
    const qty = ceilU(withOverlap);
    const price = prices["dpc-per-meter"] ?? null;
    steps.push({
      label: "DPC roll",
      detail: `${input.dpc_run_m} m × ${factor.toFixed(2)} (overlap ${rules.dpc_overlap_pct}%) = ${roundTo(withOverlap, 2)} m → ${qty} m (whole metres, up).`,
    });
    lines.push({
      key: "dpc",
      label: "DPC roll",
      material_slug: "dpc-per-meter",
      quantity: qty,
      quantity_source: "user_derived",
      unit: "m",
      detail: `${input.dpc_run_m} m run × ${factor.toFixed(2)} = ${qty} m (overlap +${roundTo(qty - input.dpc_run_m, 2)} m shown separately)`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  } else if (input.dpc_run_m === null) {
    const price = prices["dpc-per-meter"] ?? null;
    missing.push(
      "DPC roll: enter the damp-proof course run length — the engine will not assume it.",
    );
    lines.push({
      key: "dpc",
      label: "DPC roll",
      material_slug: "dpc-per-meter",
      quantity: null,
      quantity_source: "missing",
      unit: "m",
      detail: "Waiting for your DPC run length.",
      unit_price: price,
      line_total: null,
    });
  }

  // ── 2. DPM membrane — user area, whole m² ──
  if (input.dpm_area_m2 !== null && input.dpm_area_m2 > 0) {
    const qty = ceilU(input.dpm_area_m2);
    const price = prices["dpm-per-m2"] ?? null;
    lines.push({
      key: "dpm",
      label: "DPM membrane",
      material_slug: "dpm-per-m2",
      quantity: qty,
      quantity_source: "user_derived",
      unit: "m²",
      detail: `${input.dpm_area_m2} m² measured → ${qty} m² (whole m², up)`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  } else if (input.dpm_area_m2 === null) {
    const price = prices["dpm-per-m2"] ?? null;
    missing.push(
      "DPM membrane: enter the membrane area — the engine will not assume it.",
    );
    lines.push({
      key: "dpm",
      label: "DPM membrane",
      material_slug: "dpm-per-m2",
      quantity: null,
      quantity_source: "missing",
      unit: "m²",
      detail: "Waiting for your DPM area.",
      unit_price: price,
      line_total: null,
    });
  }

  // ── 3. Cementitious coating — coats from rules, coverage rule must exist ──
  const coated: { area: number; coats: number | null; label: string }[] = [];
  if (input.wet_floor_area_m2 !== null && input.wet_floor_area_m2 > 0)
    coated.push({
      area: input.wet_floor_area_m2,
      coats: rules.coats_wet_floor,
      label: "wet-area floor",
    });
  if (input.wet_wall_area_m2 !== null && input.wet_wall_area_m2 > 0)
    coated.push({
      area: input.wet_wall_area_m2,
      coats: rules.coats_wet_wall,
      label: "wet-area walls",
    });

  if (coated.length > 0) {
    if (rules.cementitious_coverage_m2_per_bag === null) {
      missing.push(
        "Cementitious coating: no coverage rate configured (cementitious_coverage_m2_per_bag). Set it from the product datasheet — quantities will not be guessed.",
      );
    } else {
      const wasteFactor = 1 + rules.coating_waste_pct / 100;
      let totalCoatedArea = 0;
      for (const c of coated) {
        if (c.coats === null) {
          missing.push(
            `Cementitious coating: no coat count configured for ${c.label} — configure it or count coats on site.`,
          );
          continue;
        }
        totalCoatedArea += c.area * c.coats;
        steps.push({
          label: `Coating — ${c.label}`,
          detail: `${c.area} m² × ${c.coats} coats = ${roundTo(c.area * c.coats, 2)} m² coated.`,
        });
      }
      if (totalCoatedArea > 0) {
        const withWaste = totalCoatedArea * wasteFactor;
        const bags = ceilU(withWaste / rules.cementitious_coverage_m2_per_bag);
        const price = prices["waterproofing-cementitious-coating"] ?? null;
        steps.push({
          label: "Coating bags",
          detail: `${roundTo(totalCoatedArea, 2)} m² coated × ${wasteFactor.toFixed(2)} (waste ${rules.coating_waste_pct}%) ÷ ${rules.cementitious_coverage_m2_per_bag} m²/bag = ${roundTo(withWaste / rules.cementitious_coverage_m2_per_bag, 2)} → ${bags} bags (whole bags, up).`,
        });
        lines.push({
          key: "cementitious_coating",
          label: "Cementitious waterproofing coating",
          material_slug: "waterproofing-cementitious-coating",
          quantity: bags,
          quantity_source: "rule_derived",
          unit: "bags",
          detail: `${roundTo(totalCoatedArea, 2)} m² × ${rules.cementitious_coverage_m2_per_bag} m²/bag, waste ${rules.coating_waste_pct}% → ${bags} bags (coverage rule must match the priced product)`,
          unit_price: price,
          line_total: price !== null ? money(bags * price) : null,
        });
      }
    }
  }
  if (input.wet_floor_area_m2 === null && input.wet_wall_area_m2 === null) {
    missing.push(
      "Cementitious coating: enter your wet-area floor and/or wall areas (or 0 if none) — the engine will not assume surfaces.",
    );
  }

  // ── 4. Bituminous membrane roll — terrace, coverage rule must exist ──
  if (input.terrace_area_m2 !== null && input.terrace_area_m2 > 0) {
    if (rules.membrane_roll_coverage_m2 === null) {
      missing.push(
        "Bituminous membrane: no roll coverage configured (membrane_roll_coverage_m2). Set it from the roll size — quantities will not be guessed.",
      );
    } else {
      const rolls = ceilU(
        input.terrace_area_m2 / rules.membrane_roll_coverage_m2,
      );
      const price = prices["bituminous-membrane-roll"] ?? null;
      steps.push({
        label: "Bituminous membrane rolls",
        detail: `${input.terrace_area_m2} m² ÷ ${rules.membrane_roll_coverage_m2} m²/roll = ${roundTo(input.terrace_area_m2 / rules.membrane_roll_coverage_m2, 2)} → ${rolls} rolls (whole rolls, up).`,
      });
      lines.push({
        key: "bituminous_membrane",
        label: "Bituminous membrane roll (terrace/roof)",
        material_slug: "bituminous-membrane-roll",
        quantity: rolls,
        quantity_source: "rule_derived",
        unit: "rolls",
        detail: `${input.terrace_area_m2} m² ÷ ${rules.membrane_roll_coverage_m2} m²/roll → ${rolls} rolls${rules.coats_terrace !== null && rules.coats_terrace > 1 ? ` (${rules.coats_terrace} layers: verify the treatment design with the datasheet)` : ""}`,
        unit_price: price,
        line_total: price !== null ? money(rolls * price) : null,
      });
    }
  }

  // ── 5. Corner tape — perimeter + overlap ──
  if (input.wet_perimeter_m !== null && input.wet_perimeter_m > 0) {
    const factor = 1 + rules.tape_overlap_pct / 100;
    const withOverlap = input.wet_perimeter_m * factor;
    const qty = ceilU(withOverlap);
    const price = prices["waterproofing-tape"] ?? null;
    steps.push({
      label: "Waterproofing corner tape",
      detail: `${input.wet_perimeter_m} m × ${factor.toFixed(2)} (overlap ${rules.tape_overlap_pct}%) = ${roundTo(withOverlap, 2)} m → ${qty} m (whole metres, up).`,
    });
    lines.push({
      key: "tape",
      label: "Waterproofing corner tape",
      material_slug: "waterproofing-tape",
      quantity: qty,
      quantity_source: "user_derived",
      unit: "m",
      detail: `${input.wet_perimeter_m} m perimeter × ${factor.toFixed(2)} = ${qty} m`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  }

  // ── 6. Labour — separate, never automatic ──
  let labourTotal = 0;
  const totalArea = Math.max(
    input.dpm_area_m2 ?? 0,
    (input.wet_floor_area_m2 ?? 0) +
      (input.wet_wall_area_m2 ?? 0) +
      (input.terrace_area_m2 ?? 0),
  );
  if (input.labour.mode === "per_m2") {
    const rate = input.labour.per_m2_rate ?? null;
    if (rate === null || !Number.isFinite(rate) || rate < 0) {
      errors.push(
        "Labour: a per-m² rate is required when labour mode is per-m².",
      );
    } else {
      labourTotal = money(totalArea * rate);
      steps.push({
        label: "Labour",
        detail: `${roundTo(totalArea, 2)} m² total treated area × ${rate} per m² = ${labourTotal} (user-provided rate).`,
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
      detail: "Excluded — not added to the total.",
    });
  }

  // ── 7. Totals — never fabricated ──
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
        `${l.label}: PRICE NOT CONFIGURED in the material database — quantity shown, no price invented.`,
      );
    }
  }
  warnings.push(
    "This is material ESTIMATION, not waterproofing design. Product selection, primers, substrate preparation and detailing need a professional specification.",
  );

  const incomplete =
    lines.some((l) => l.quantity === null || l.line_total === null) ||
    missing.length > 0;
  const grandTotal =
    materialSubtotal !== null && errors.length === 0
      ? money(materialSubtotal + labourTotal)
      : null;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    steps,
    lines,
    priced_subtotal: pricedSubtotal,
    material_subtotal: materialSubtotal,
    labour_total: labourTotal,
    grand_total: grandTotal,
    incomplete,
    missing,
  };
}
