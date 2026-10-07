/**
 * Flooring Engine (Tier 2, Engine 4)
 *
 * Deterministic plank/sheet flooring MATERIAL estimation
 * (laminate, vinyl, parquet - the tile and screeding engines
 * already exist separately).
 *
 *   USER: floor area (m²), skirting perimeter (m), the flooring
 *         type, and whether underlay and adhesive are needed.
 *   RULES: waste %, pack/roll/bag coverage rates (must match the
 *         products the admin prices), skirting waste.
 *
 * Honesty contract:
 *  - Area and perimeter are NEVER assumed. A missing value leaves
 *    its line unsized and the estimate marked incomplete.
 *  - Coverage rules must exist for pack/roll/bag materials; a
 *    missing rule is reported, never guessed.
 *  - Prices come from the shared material database. Unpriced
 *    materials show PRICE NOT CONFIGURED; totals stay null.
 *  - This is material estimation, not flooring specification.
 *
 * Rounding: packs/rolls/bags/linear m round UP (whole units);
 * currency 2 dp at line-total/grand-total stage only.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────

export interface FlooringRules {
  floor_waste_pct: number;
  laminate_pack_coverage_m2: number | null;
  underlay_roll_coverage_m2: number | null;
  adhesive_coverage_m2_per_bag: number | null;
  skirting_waste_pct: number;
}

export const DEFAULT_FLOORING_RULES: FlooringRules = {
  floor_waste_pct: 0,
  laminate_pack_coverage_m2: null,
  underlay_roll_coverage_m2: null,
  adhesive_coverage_m2_per_bag: null,
  skirting_waste_pct: 0,
};

export function parseFlooringRules(rows: CalcRuleRow[]): FlooringRules {
  const rules: FlooringRules = { ...DEFAULT_FLOORING_RULES };
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

  const fw = pct(get("floor_waste_pct"));
  if (fw !== null) rules.floor_waste_pct = fw;
  const lp = pos(get("laminate_pack_coverage_m2"));
  if (lp !== null) rules.laminate_pack_coverage_m2 = lp;
  const ur = pos(get("underlay_roll_coverage_m2"));
  if (ur !== null) rules.underlay_roll_coverage_m2 = ur;
  const ad = pos(get("adhesive_coverage_m2_per_bag"));
  if (ad !== null) rules.adhesive_coverage_m2_per_bag = ad;
  const sw = pct(get("skirting_waste_pct"));
  if (sw !== null) rules.skirting_waste_pct = sw;
  return rules;
}

// ─────────────────────────────────────────────
// Input / output
// ─────────────────────────────────────────────

export type FlooringType = "laminate" | "vinyl" | "parquet";

export interface FlooringInput {
  flooring_type: FlooringType;
  /** Floor area to cover, m² */
  floor_area_m2: number | null;
  /** Skirting run (room perimeter, doorways excluded), m */
  skirting_run_m: number | null;
  include_underlay: boolean;
  include_adhesive: boolean;
  labour: {
    mode: "none" | "per_m2" | "lump_sum";
    per_m2_rate?: number | null;
    lump_sum?: number | null;
  };
}

export interface FlooringLine {
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

export interface FlooringStep {
  label: string;
  detail: string;
}

export interface FlooringResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: FlooringStep[];
  lines: FlooringLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
}

export type FlooringPriceMap = Record<string, number | null>;

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

const FLOOR_SLUGS: Record<FlooringType, string> = {
  laminate: "flooring-laminate-pack",
  vinyl: "flooring-vinyl-m2",
  parquet: "flooring-parquet-m2",
};

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateFlooring(
  input: FlooringInput,
  rules: FlooringRules,
  prices: FlooringPriceMap,
): FlooringResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: FlooringStep[] = [];
  const missing: string[] = [];
  const lines: FlooringLine[] = [];

  // ── 0. Validation ──
  if (
    input.floor_area_m2 !== null &&
    (!Number.isFinite(input.floor_area_m2) || input.floor_area_m2 < 0)
  ) {
    errors.push(
      "Floor area (m²) must be a positive number (or 0), or left blank.",
    );
  }
  if (
    input.skirting_run_m !== null &&
    (!Number.isFinite(input.skirting_run_m) || input.skirting_run_m < 0)
  ) {
    errors.push(
      "Skirting run (m) must be a positive number (or 0), or left blank.",
    );
  }
  if (!["laminate", "vinyl", "parquet"].includes(input.flooring_type)) {
    errors.push("Flooring type must be laminate, vinyl or parquet.");
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

  const slug = FLOOR_SLUGS[input.flooring_type];
  const price = prices[slug] ?? null;
  const wasteFactor = 1 + rules.floor_waste_pct / 100;

  // ── 1. Floor covering ──
  if (input.floor_area_m2 !== null && input.floor_area_m2 > 0) {
    const withWaste = input.floor_area_m2 * wasteFactor;
    steps.push({
      label: "Floor area with waste",
      detail: `${input.floor_area_m2} m² × ${wasteFactor.toFixed(2)} (waste ${rules.floor_waste_pct}%) = ${roundTo(withWaste, 2)} m² to buy.`,
    });

    if (input.flooring_type === "laminate") {
      if (rules.laminate_pack_coverage_m2 === null) {
        missing.push(
          "Laminate packs: no pack coverage configured (laminate_pack_coverage_m2). Set it from the pack the admin prices: quantities will not be guessed.",
        );
      } else {
        const packs = ceilU(withWaste / rules.laminate_pack_coverage_m2);
        steps.push({
          label: "Laminate packs",
          detail: `${roundTo(withWaste, 2)} m² ÷ ${rules.laminate_pack_coverage_m2} m²/pack = ${roundTo(withWaste / rules.laminate_pack_coverage_m2, 2)} → ${packs} packs (whole packs, up).`,
        });
        lines.push({
          key: "floor_covering",
          label: "Laminate flooring (packs)",
          material_slug: slug,
          quantity: packs,
          quantity_source: "rule_derived",
          unit: "packs",
          detail: `${input.floor_area_m2} m² + waste ${rules.floor_waste_pct}% ÷ ${rules.laminate_pack_coverage_m2} m²/pack → ${packs} packs (pack size must match the priced product)`,
          unit_price: price,
          line_total: price !== null ? money(packs * price) : null,
        });
      }
    } else {
      // vinyl and parquet price per m²
      const qty = ceilU(withWaste);
      const label =
        input.flooring_type === "vinyl"
          ? "Vinyl / PVC flooring"
          : "Parquet flooring";
      steps.push({
        label,
        detail: `${roundTo(withWaste, 2)} m² → ${qty} m² (whole m², up).`,
      });
      lines.push({
        key: "floor_covering",
        label,
        material_slug: slug,
        quantity: qty,
        quantity_source: "user_derived",
        unit: "m²",
        detail: `${input.floor_area_m2} m² × ${wasteFactor.toFixed(2)} = ${qty} m² (waste +${roundTo(qty - input.floor_area_m2, 2)} m² shown separately)`,
        unit_price: price,
        line_total: price !== null ? money(qty * price) : null,
      });
    }
  } else if (input.floor_area_m2 === null) {
    missing.push(
      "Floor area: enter the area to cover: the engine will not assume it.",
    );
    lines.push({
      key: "floor_covering",
      label: "Floor covering",
      material_slug: slug,
      quantity: null,
      quantity_source: "missing",
      unit: "N/A",
      detail: "Waiting for your floor area.",
      unit_price: price,
      line_total: null,
    });
  }

  // ── 2. Underlay ──
  if (input.include_underlay) {
    if (input.floor_area_m2 === null) {
      missing.push("Underlay: floor area needed to size it.");
    } else if (input.floor_area_m2 > 0) {
      if (rules.underlay_roll_coverage_m2 === null) {
        missing.push(
          "Underlay: no roll coverage configured (underlay_roll_coverage_m2). Set it from the roll the admin prices.",
        );
      } else {
        const rolls = ceilU(
          input.floor_area_m2 / rules.underlay_roll_coverage_m2,
        );
        const uPrice = prices["flooring-underlay-roll"] ?? null;
        steps.push({
          label: "Underlay rolls",
          detail: `${input.floor_area_m2} m² ÷ ${rules.underlay_roll_coverage_m2} m²/roll = ${roundTo(input.floor_area_m2 / rules.underlay_roll_coverage_m2, 2)} → ${rolls} rolls (whole rolls, up).`,
        });
        lines.push({
          key: "underlay",
          label: "Flooring underlay (rolls)",
          material_slug: "flooring-underlay-roll",
          quantity: rolls,
          quantity_source: "rule_derived",
          unit: "rolls",
          detail: `${input.floor_area_m2} m² ÷ ${rules.underlay_roll_coverage_m2} m²/roll → ${rolls} rolls`,
          unit_price: uPrice,
          line_total: uPrice !== null ? money(rolls * uPrice) : null,
        });
      }
    }
  }

  // ── 3. Adhesive ──
  if (input.include_adhesive) {
    if (input.floor_area_m2 === null) {
      missing.push("Adhesive: floor area needed to size it.");
    } else if (input.floor_area_m2 > 0) {
      if (rules.adhesive_coverage_m2_per_bag === null) {
        missing.push(
          "Adhesive: no coverage rate configured (adhesive_coverage_m2_per_bag). Set it from the product datasheet.",
        );
      } else {
        const bags = ceilU(
          input.floor_area_m2 / rules.adhesive_coverage_m2_per_bag,
        );
        const aPrice = prices["flooring-adhesive-bag"] ?? null;
        steps.push({
          label: "Adhesive bags",
          detail: `${input.floor_area_m2} m² ÷ ${rules.adhesive_coverage_m2_per_bag} m²/bag = ${roundTo(input.floor_area_m2 / rules.adhesive_coverage_m2_per_bag, 2)} → ${bags} bags (whole bags, up).`,
        });
        lines.push({
          key: "adhesive",
          label: "Flooring adhesive (bags)",
          material_slug: "flooring-adhesive-bag",
          quantity: bags,
          quantity_source: "rule_derived",
          unit: "bags",
          detail: `${input.floor_area_m2} m² ÷ ${rules.adhesive_coverage_m2_per_bag} m²/bag → ${bags} bags`,
          unit_price: aPrice,
          line_total: aPrice !== null ? money(bags * aPrice) : null,
        });
      }
    }
  }

  // ── 4. Skirting ──
  if (input.skirting_run_m !== null && input.skirting_run_m > 0) {
    const sFactor = 1 + rules.skirting_waste_pct / 100;
    const withWaste = input.skirting_run_m * sFactor;
    const qty = ceilU(withWaste);
    const sPrice = prices["flooring-skirting-m"] ?? null;
    steps.push({
      label: "Skirting",
      detail: `${input.skirting_run_m} m × ${sFactor.toFixed(2)} (waste ${rules.skirting_waste_pct}%) = ${roundTo(withWaste, 2)} m → ${qty} m (whole metres, up).`,
    });
    lines.push({
      key: "skirting",
      label: "Skirting board",
      material_slug: "flooring-skirting-m",
      quantity: qty,
      quantity_source: "user_derived",
      unit: "m",
      detail: `${input.skirting_run_m} m run × ${sFactor.toFixed(2)} = ${qty} m`,
      unit_price: sPrice,
      line_total: sPrice !== null ? money(qty * sPrice) : null,
    });
  } else if (input.skirting_run_m === null) {
    const sPrice = prices["flooring-skirting-m"] ?? null;
    missing.push(
      "Skirting: enter the skirting run (room perimeter): or 0 if you don't need it.",
    );
    lines.push({
      key: "skirting",
      label: "Skirting board",
      material_slug: "flooring-skirting-m",
      quantity: null,
      quantity_source: "missing",
      unit: "m",
      detail: "Waiting for your skirting run.",
      unit_price: sPrice,
      line_total: null,
    });
  }

  // ── 5. Labour - separate, never automatic ──
  let labourTotal = 0;
  const area = input.floor_area_m2 ?? 0;
  if (input.labour.mode === "per_m2") {
    const rate = input.labour.per_m2_rate ?? null;
    if (rate === null || !Number.isFinite(rate) || rate < 0) {
      errors.push(
        "Labour: a per-m² rate is required when labour mode is per-m².",
      );
    } else {
      labourTotal = money(area * rate);
      steps.push({
        label: "Labour",
        detail: `${roundTo(area, 2)} m² × ${rate} per m² = ${labourTotal} (user-provided rate).`,
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
    "This is material ESTIMATION, not a flooring specification. Substrate condition, acclimatisation and installation details need a professional specification.",
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
