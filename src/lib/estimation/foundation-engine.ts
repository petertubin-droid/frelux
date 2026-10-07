/**
 * Foundation Engine (Tier 2, Engine 6)
 *
 * Deterministic foundation MATERIAL estimation.
 *
 *   USER: measured foundation concrete volume (m³),
 *         blockwork-to-DPC wall area (m²), hardcore fill
 *         volume (m³), formwork area (m²).
 *   RULES: concrete mix ratio (cement:sand:granite parts, default
 *         1:2:4), concrete waste %, blocks per m². The dry-volume
 *         factor (1.54) and bag volume (0.0347 m³ per 50 kg bag)
 *         are standard mix-math constants, shown in the breakdown.
 *
 * Honesty contract:
 *  - Volumes and areas are NEVER assumed. A missing one leaves
 *    its lines unsized and the estimate marked incomplete.
 *  - 0 means "none" (lines omitted); blank means unsized or, for
 *    formwork, a decision the user must make.
 *  - The blocks-per-m² rule must match the block the admin prices.
 *  - Prices come from the shared material database. Unpriced
 *    materials show PRICE NOT CONFIGURED; totals stay null.
 *  - This does NOT design foundations. Sizes, depth and
 *    reinforcement are structural engineering decisions.
 *
 * Rounding: bags/whole units round UP; sand/granite/hardcore in
 * whole m³ with the excess shown; currency 2 dp at totals only.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Standard mix-math constants (shown in the breakdown)
// ─────────────────────────────────────────────

const DRY_VOLUME_FACTOR = 1.54;
const CEMENT_BAG_VOLUME_M3 = 0.0347; // 50 kg bag, bulk density 1440 kg/m³

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────

export interface MixRatio {
  cement: number;
  sand: number;
  granite: number;
}

export interface FoundationRules {
  mix_ratio: MixRatio | null;
  concrete_waste_pct: number;
  blocks_per_m2: number | null;
}

export const DEFAULT_FOUNDATION_RULES: FoundationRules = {
  mix_ratio: null,
  concrete_waste_pct: 0,
  blocks_per_m2: null,
};

export function parseFoundationRules(rows: CalcRuleRow[]): FoundationRules {
  const rules: FoundationRules = { ...DEFAULT_FOUNDATION_RULES };
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

  const cw = pct(get("concrete_waste_pct"));
  if (cw !== null) rules.concrete_waste_pct = cw;
  const bpm = pos(get("blocks_per_m2"));
  if (bpm !== null) rules.blocks_per_m2 = bpm;

  // The mix ratio is an object under rule_value.value - read it raw.
  const ratioRow = rows.find(
    (r) =>
      r.rule_key === "concrete_mix_ratio" &&
      (r.is_active === undefined ||
        r.is_active === true ||
        r.is_active === null),
  );
  const holder = ratioRow?.rule_value?.value as
    { cement?: unknown; sand?: unknown; granite?: unknown } | undefined;
  if (holder && typeof holder === "object") {
    const c = Number(holder.cement);
    const s = Number(holder.sand);
    const g = Number(holder.granite);
    if (
      Number.isFinite(c) &&
      c > 0 &&
      Number.isFinite(s) &&
      s > 0 &&
      Number.isFinite(g) &&
      g > 0
    ) {
      rules.mix_ratio = { cement: c, sand: s, granite: g };
    }
  }
  return rules;
}

// ─────────────────────────────────────────────
// Input / output
// ─────────────────────────────────────────────

export interface FoundationInput {
  /** Foundation concrete volume, m³ */
  concrete_volume_m3: number | null;
  /** Blockwork-to-DPC wall area, m² */
  block_wall_area_m2: number | null;
  /** Hardcore fill volume, m³ */
  hardcore_volume_m3: number | null;
  /** Formwork contact area, m². Null = decision pending. */
  formwork_area_m2: number | null;
  labour: {
    mode: "none" | "per_m3" | "lump_sum";
    per_m3_rate?: number | null;
    lump_sum?: number | null;
  };
}

export interface FoundationLine {
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

export interface FoundationStep {
  label: string;
  detail: string;
}

export interface FoundationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: FoundationStep[];
  lines: FoundationLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
}

export type FoundationPriceMap = Record<string, number | null>;

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

export function calculateFoundation(
  input: FoundationInput,
  rules: FoundationRules,
  prices: FoundationPriceMap,
): FoundationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: FoundationStep[] = [];
  const missing: string[] = [];
  const lines: FoundationLine[] = [];

  // ── 0. Validation ──
  const fields: [keyof FoundationInput, string][] = [
    ["concrete_volume_m3", "Concrete volume (m³)"],
    ["block_wall_area_m2", "Blockwork wall area (m²)"],
    ["hardcore_volume_m3", "Hardcore fill volume (m³)"],
    ["formwork_area_m2", "Formwork area (m²)"],
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

  // ── 1. Concrete mix materials ──
  if (input.concrete_volume_m3 !== null && input.concrete_volume_m3 > 0) {
    if (rules.mix_ratio === null) {
      missing.push(
        "Concrete: no mix ratio configured (concrete_mix_ratio). Set it (e.g. 1:2:4): quantities will not be guessed.",
      );
    } else {
      const { cement, sand, granite } = rules.mix_ratio;
      const parts = cement + sand + granite;
      const wasteFactor = 1 + rules.concrete_waste_pct / 100;
      const wet = input.concrete_volume_m3;
      const dry = wet * wasteFactor * DRY_VOLUME_FACTOR;

      const cementBags = ceilU(((cement / parts) * dry) / CEMENT_BAG_VOLUME_M3);
      const sandM3 = ceilU((sand / parts) * dry);
      const graniteM3 = ceilU((granite / parts) * dry);

      steps.push({
        label: "Concrete mix math",
        detail: `${wet} m³ wet × ${wasteFactor.toFixed(2)} (waste ${rules.concrete_waste_pct}%) × ${DRY_VOLUME_FACTOR} dry factor = ${roundTo(dry, 3)} m³ dry. Split ${cement}:${sand}:${granite} → cement ${roundTo((cement / parts) * dry, 3)} m³, sand ${roundTo((sand / parts) * dry, 3)} m³, granite ${roundTo((granite / parts) * dry, 3)} m³.`,
      });
      steps.push({
        label: "Cement bags",
        detail: `${roundTo((cement / parts) * dry, 3)} m³ ÷ ${CEMENT_BAG_VOLUME_M3} m³/bag (50 kg) = ${roundTo(((cement / parts) * dry) / CEMENT_BAG_VOLUME_M3, 2)} → ${cementBags} bags (whole, up).`,
      });

      const bagPrice = prices["cement-per-bag"] ?? null;
      lines.push({
        key: "cement",
        label: "Cement (50 kg bags)",
        material_slug: "cement-per-bag",
        quantity: cementBags,
        quantity_source: "rule_derived",
        unit: "bags",
        detail: `${wet} m³ concrete, mix ${cement}:${sand}:${granite}, dry factor ${DRY_VOLUME_FACTOR} → ${cementBags} bags`,
        unit_price: bagPrice,
        line_total: bagPrice !== null ? money(cementBags * bagPrice) : null,
      });
      const sandPrice = prices["sand-per-m3"] ?? null;
      lines.push({
        key: "sand",
        label: "Sharp sand",
        material_slug: "sand-per-m3",
        quantity: sandM3,
        quantity_source: "rule_derived",
        unit: "m³",
        detail: `${wet} m³ concrete, mix ${cement}:${sand}:${granite} → ${sandM3} m³ (whole m³, up)`,
        unit_price: sandPrice,
        line_total: sandPrice !== null ? money(sandM3 * sandPrice) : null,
      });
      const granitePrice = prices["granite-per-m3"] ?? null;
      lines.push({
        key: "granite",
        label: "Granite chippings",
        material_slug: "granite-per-m3",
        quantity: graniteM3,
        quantity_source: "rule_derived",
        unit: "m³",
        detail: `${wet} m³ concrete, mix ${cement}:${sand}:${granite} → ${graniteM3} m³ (whole m³, up)`,
        unit_price: granitePrice,
        line_total:
          granitePrice !== null ? money(graniteM3 * granitePrice) : null,
      });
    }
  } else if (input.concrete_volume_m3 === null) {
    missing.push(
      "Concrete volume: enter the foundation concrete volume: the engine will not assume it.",
    );
  }

  // ── 2. Hardcore fill ──
  if (input.hardcore_volume_m3 !== null && input.hardcore_volume_m3 > 0) {
    const qty = ceilU(input.hardcore_volume_m3);
    const price = prices["hardcore-per-m3"] ?? null;
    lines.push({
      key: "hardcore",
      label: "Hardcore fill",
      material_slug: "hardcore-per-m3",
      quantity: qty,
      quantity_source: "user_provided",
      unit: "m³",
      detail: `${input.hardcore_volume_m3} m³ measured → ${qty} m³ (whole m³, up)`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  }

  // ── 3. Blockwork to DPC ──
  if (input.block_wall_area_m2 !== null && input.block_wall_area_m2 > 0) {
    if (rules.blocks_per_m2 === null) {
      missing.push(
        "Blocks: no blocks-per-m² rule configured (blocks_per_m2). Set it for the block you price: quantities will not be guessed.",
      );
    } else {
      const blocks = ceilU(input.block_wall_area_m2 * rules.blocks_per_m2);
      const price = prices["block-per-piece"] ?? null;
      steps.push({
        label: "Blocks to DPC",
        detail: `${input.block_wall_area_m2} m² × ${rules.blocks_per_m2} blocks/m² = ${roundTo(input.block_wall_area_m2 * rules.blocks_per_m2, 2)} → ${blocks} blocks (whole, up). Rule must match the priced block size.`,
      });
      lines.push({
        key: "blocks",
        label: "Blocks (to DPC)",
        material_slug: "block-per-piece",
        quantity: blocks,
        quantity_source: "rule_derived",
        unit: "pieces",
        detail: `${input.block_wall_area_m2} m² × ${rules.blocks_per_m2}/m² → ${blocks} blocks`,
        unit_price: price,
        line_total: price !== null ? money(blocks * price) : null,
      });
    }
  } else if (input.block_wall_area_m2 === null) {
    missing.push(
      "Blockwork: enter the wall area to DPC: or 0 if there is no blockwork.",
    );
  }

  // ── 4. Formwork ──
  if (input.formwork_area_m2 !== null && input.formwork_area_m2 > 0) {
    const qty = ceilU(input.formwork_area_m2);
    const price = prices["formwork-per-m2"] ?? null;
    lines.push({
      key: "formwork",
      label: "Formwork",
      material_slug: "formwork-per-m2",
      quantity: qty,
      quantity_source: "user_provided",
      unit: "m²",
      detail: `${input.formwork_area_m2} m² contact area → ${qty} m² (whole m², up)`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  } else if (input.formwork_area_m2 === null) {
    missing.push(
      "Formwork: enter the formwork contact area: or 0 if you are pouring directly against the soil.",
    );
  }

  // ── 5. Labour - separate, never automatic ──
  let labourTotal = 0;
  const concreteM3 = input.concrete_volume_m3 ?? 0;
  if (input.labour.mode === "per_m3") {
    const rate = input.labour.per_m3_rate ?? null;
    if (rate === null || !Number.isFinite(rate) || rate < 0) {
      errors.push(
        "Labour: a per-m³ rate is required when labour mode is per-m³.",
      );
    } else {
      labourTotal = money(concreteM3 * rate);
      steps.push({
        label: "Labour",
        detail: `${roundTo(concreteM3, 2)} m³ concrete × ${rate} per m³ = ${labourTotal} (user-provided rate).`,
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
    "This is material ESTIMATION, not foundation design. Footing sizes, depth and reinforcement are structural engineering decisions: use the Reinforcement estimator for the bar schedule.",
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
