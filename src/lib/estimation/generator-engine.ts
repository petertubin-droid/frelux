/**
 * Generator / Backup Power Engine (Tier 2, Engine 8)
 *
 * Deterministic backup power MATERIAL estimation.
 *
 *   USER: generator size bracket (10/20/30/50 kVA - chosen from
 *         THEIR OWN load assessment), whether an ATS is included,
 *         and the measured generator-to-panel cable run (m).
 *   RULES: cable waste/route allowance %.
 *
 * Honesty contract:
 *  - The engine NEVER calculates a generator size. Sizing must
 *    come from a proper load list; the result says so.
 *  - Cable quantity is never assumed: a blank run is reported
 *    missing; 0 means the run is still to be measured or the
 *    set is mounted at the panel (the engine reports it as a
 *    decision, not as zero cable silently).
 *  - The battery is one per generator, labelled as an
 *    assumption; ATS is a labelled user decision.
 *  - Prices come from the shared material database. Unpriced
 *    materials show PRICE NOT CONFIGURED; totals stay null.
 *  - This is not a load calculation or an installation design.
 *
 * Rounding: cable rounds UP to whole metres; currency 2 dp at
 * line-total/grand-total stage only.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────

export interface GeneratorRules {
  gen_cable_waste_pct: number;
}

export const DEFAULT_GENERATOR_RULES: GeneratorRules = {
  gen_cable_waste_pct: 0,
};

export function parseGeneratorRules(rows: CalcRuleRow[]): GeneratorRules {
  const rules: GeneratorRules = { ...DEFAULT_GENERATOR_RULES };
  const row = rows.find(
    (r) =>
      r.rule_key === "gen_cable_waste_pct" &&
      (r.is_active === undefined ||
        r.is_active === true ||
        r.is_active === null),
  );
  const n = Number(row?.rule_value?.value);
  if (Number.isFinite(n) && n >= 0 && n <= 100) rules.gen_cable_waste_pct = n;
  return rules;
}

// ─────────────────────────────────────────────
// Input / output
// ─────────────────────────────────────────────

export type GeneratorSize = "10kva" | "20kva" | "30kva" | "50kva";

export const GENERATOR_SIZE_SLUGS: Record<GeneratorSize, string> = {
  "10kva": "gen-unit-10kva",
  "20kva": "gen-unit-20kva",
  "30kva": "gen-unit-30kva",
  "50kva": "gen-unit-50kva",
};

export interface GeneratorInput {
  /** Chosen size bracket - from the user's own load assessment */
  size: GeneratorSize;
  /** Number of units */
  units: number;
  include_ats: boolean;
  /** Measured generator-to-panel cable run, m. Null = not measured. */
  cable_run_m: number | null;
  include_battery: boolean;
  labour: {
    mode: "none" | "lump_sum";
    lump_sum?: number | null;
  };
}

export interface GeneratorLine {
  key: string;
  label: string;
  material_slug: string;
  quantity: number | null;
  quantity_source:
    "user_provided" | "rule_derived" | "user_derived" | "missing";
  unit: string;
  detail: string;
  unit_price: number | null;
  line_total: number | null;
}

export interface GeneratorStep {
  label: string;
  detail: string;
}

export interface GeneratorResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: GeneratorStep[];
  lines: GeneratorLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
}

export type GeneratorPriceMap = Record<string, number | null>;

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

export function calculateGenerator(
  input: GeneratorInput,
  rules: GeneratorRules,
  prices: GeneratorPriceMap,
): GeneratorResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: GeneratorStep[] = [];
  const missing: string[] = [];
  const lines: GeneratorLine[] = [];

  // ── 0. Validation ──
  if (!Number.isInteger(input.units) || input.units < 1 || input.units > 20) {
    errors.push("Units must be a whole number from 1 to 20.");
  }
  if (!Object.keys(GENERATOR_SIZE_SLUGS).includes(input.size)) {
    errors.push("Generator size must be one of: 10kva, 20kva, 30kva, 50kva.");
  }
  if (
    input.cable_run_m !== null &&
    (!Number.isFinite(input.cable_run_m) || input.cable_run_m < 0)
  ) {
    errors.push(
      "Cable run (m) must be a positive number (or 0), or left blank.",
    );
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

  // ── 1. Generator units (user's chosen bracket) ──
  const slug = GENERATOR_SIZE_SLUGS[input.size];
  const price = prices[slug] ?? null;
  steps.push({
    label: "Generator unit",
    detail: `${input.units} × ${input.size} unit(s): the size bracket is YOUR choice from your load assessment; this engine did not calculate a size.`,
  });
  lines.push({
    key: "generator",
    label: `Generator ${input.size} (units)`,
    material_slug: slug,
    quantity: input.units,
    quantity_source: "user_provided",
    unit: "units",
    detail: `${input.units} × ${input.size} (your chosen bracket: sizing must come from your load list)`,
    unit_price: price,
    line_total: price !== null ? money(input.units * price) : null,
  });

  // ── 2. ATS (labelled user decision) ──
  if (input.include_ats) {
    const atsPrice = prices["gen-ats"] ?? null;
    steps.push({
      label: "Automatic transfer switch",
      detail: `${input.units} × ATS: your decision, one per generator set (labelled assumption).`,
    });
    lines.push({
      key: "ats",
      label: "Automatic transfer switch (ATS)",
      material_slug: "gen-ats",
      quantity: input.units,
      quantity_source: "rule_derived",
      unit: "units",
      detail: `${input.units} set(s): one per generator (labelled assumption)`,
      unit_price: atsPrice,
      line_total: atsPrice !== null ? money(input.units * atsPrice) : null,
    });
  }

  // ── 3. Cable run (user-measured, visible waste) ──
  if (input.cable_run_m === null) {
    missing.push(
      "Generator-to-panel cable: measure the run from the generator position to the changeover panel: the engine will not assume a length. (Leave 0 only if the run is truly zero.)",
    );
    lines.push({
      key: "cable",
      label: "Generator-to-panel cable",
      material_slug: "gen-cable-per-m",
      quantity: null,
      quantity_source: "missing",
      unit: "m",
      detail: "Waiting for your measured run.",
      unit_price: prices["gen-cable-per-m"] ?? null,
      line_total: null,
    });
  } else if (input.cable_run_m > 0) {
    const factor = 1 + rules.gen_cable_waste_pct / 100;
    const withWaste = input.cable_run_m * factor;
    const qty = ceilU(withWaste);
    const cPrice = prices["gen-cable-per-m"] ?? null;
    steps.push({
      label: "Generator-to-panel cable",
      detail: `${input.cable_run_m} m × ${factor.toFixed(2)} (waste/route ${rules.gen_cable_waste_pct}%) = ${roundTo(withWaste, 2)} m → ${qty} m (whole metres, up).`,
    });
    lines.push({
      key: "cable",
      label: "Generator-to-panel cable",
      material_slug: "gen-cable-per-m",
      quantity: qty,
      quantity_source: "user_derived",
      unit: "m",
      detail: `${input.cable_run_m} m run × ${factor.toFixed(2)} = ${qty} m (cable size/cross-section must match the priced product)`,
      unit_price: cPrice,
      line_total: cPrice !== null ? money(qty * cPrice) : null,
    });
  } else {
    steps.push({
      label: "Generator-to-panel cable",
      detail:
        "0 m recorded: confirm the set truly mounts at the panel; no cable line added.",
    });
  }

  // ── 4. Battery (labelled assumption, one per set) ──
  if (input.include_battery) {
    const bPrice = prices["gen-battery"] ?? null;
    steps.push({
      label: "Battery",
      detail: `${input.units} × starting battery: one per set (labelled assumption; electric-start sets need it).`,
    });
    lines.push({
      key: "battery",
      label: "Generator battery",
      material_slug: "gen-battery",
      quantity: input.units,
      quantity_source: "rule_derived",
      unit: "units",
      detail: `${input.units} unit(s): one per generator (labelled assumption)`,
      unit_price: bPrice,
      line_total: bPrice !== null ? money(input.units * bPrice) : null,
    });
  }

  // ── 5. Labour - separate, never automatic ──
  let labourTotal = 0;
  if (input.labour.mode === "lump_sum") {
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

  // ── 6. Totals - never fabricated ──
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
    "This engine did NOT size the generator. Size selection must come from a proper load assessment (add up your loads, allow for starting current). Installation, earthing and changeover wiring must follow a qualified electrician's design and local codes.",
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
    priced_subtotal: pricedSubtotal,
    material_subtotal: materialSubtotal,
    labour_total: labourTotal,
    grand_total: grandTotal,
    incomplete,
    missing,
  };
}
