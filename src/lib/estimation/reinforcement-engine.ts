/**
 * Reinforcement / Steel Engine (Tier 2, Engine 5)
 *
 * Deterministic reinforcement MATERIAL estimation from the
 * user's bar schedule.
 *
 *   USER: total cutting length per diameter (8/10/12/16/20/25/32 mm) -
 *         from a bar bending schedule or an explicit estimate.
 *         Supports 8mm/10mm links/stirrups and 32mm heavy foundation bars.
 *   RULES: lap/cut/waste % per diameter, binding wire kg per
 *         tonne. Unit weights are standard BS 4449 / ISO 6935 / ASTM values
 *         (physics constants, shown in the breakdown).
 *
 * Honesty contract:
 *  - Lengths are NEVER assumed. A blank diameter is simply not
 *    used; if every diameter is blank, the engine says the bar
 *    schedule is missing rather than inventing steel.
 *  - Purchase quantity is whole stock lengths (default 12 m, or user stock length),
 *    rounded UP, with the lap/waste allowance visible and separate.
 *  - Tonnage is computed for delivery planning and shown in the
 *    breakdown; pricing is per stock length from the shared
 *    material database (the same records the Price Tracker manages).
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
  /** Total 8 mm cutting length (stirrups/links), m */
  len_8mm_m?: number | null;
  /** Total 10 mm cutting length (stirrups/links), m */
  len_10mm_m?: number | null;
  /** Total 12 mm cutting length, m */
  len_12mm_m: number | null;
  /** Total 16 mm cutting length, m */
  len_16mm_m: number | null;
  /** Total 20 mm cutting length, m */
  len_20mm_m: number | null;
  /** Total 25 mm cutting length, m */
  len_25mm_m: number | null;
  /** Total 32 mm cutting length (heavy foundation/columns), m */
  len_32mm_m?: number | null;
  /** Optional custom stock length in metres (default 12 m; e.g. 6m or 18.288m / 60ft) */
  stock_length_m?: number;
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
// Standard constants (BS 4449 / ISO 6935 nominal mass per metre)
// ─────────────────────────────────────────────

const DEFAULT_STOCK_LENGTH_M = 12;

const REBAR_SPECS: {
  key: string;
  label: string;
  slug: string;
  /** BS 4449 / ISO 6935 nominal mass, kg per metre */
  kg_per_m: number;
}[] = [
  {
    key: "rebar_8mm",
    label: "8 mm rebar (stirrups/links)",
    slug: "rebar-8mm-per-length",
    kg_per_m: 0.395,
  },
  {
    key: "rebar_10mm",
    label: "10 mm rebar (stirrups/links)",
    slug: "rebar-10mm-per-length",
    kg_per_m: 0.617,
  },
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
  {
    key: "rebar_32mm",
    label: "32 mm rebar (heavy columns/footings)",
    slug: "rebar-32mm-per-length",
    kg_per_m: 6.313,
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

  const stockLengthM =
    input.stock_length_m && input.stock_length_m > 0
      ? input.stock_length_m
      : DEFAULT_STOCK_LENGTH_M;

  // ── 0. Validation ──
  const lengths: [string, string][] = [
    ["len_8mm_m", "8 mm cutting length"],
    ["len_10mm_m", "10 mm cutting length"],
    ["len_12mm_m", "12 mm cutting length"],
    ["len_16mm_m", "16 mm cutting length"],
    ["len_20mm_m", "20 mm cutting length"],
    ["len_25mm_m", "25 mm cutting length"],
    ["len_32mm_m", "32 mm cutting length"],
  ];

  for (const [key, label] of lengths) {
    const v = (input as unknown as Record<string, number | null | undefined>)[key];
    if (v !== undefined && v !== null && (!Number.isFinite(v) || v < 0)) {
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

  const userLengths: Record<string, number | null | undefined> = {
    rebar_8mm: input.len_8mm_m,
    rebar_10mm: input.len_10mm_m,
    rebar_12mm: input.len_12mm_m,
    rebar_16mm: input.len_16mm_m,
    rebar_20mm: input.len_20mm_m,
    rebar_25mm: input.len_25mm_m,
    rebar_32mm: input.len_32mm_m,
  };

  for (const spec of REBAR_SPECS) {
    const len = userLengths[spec.key];
    if (len === null || len === undefined || len === 0) continue; // not used
    anyLength = true;

    const withAllowance = len * lapFactor;
    const pieces = ceilU(withAllowance / stockLengthM);
    const massKg = len * spec.kg_per_m; // tonnage uses true cutting length, not purchase length
    totalMassKg += massKg;

    const price = prices[spec.slug] ?? null;

    steps.push({
      label: spec.label,
      detail: `${len} m cutting × ${lapFactor.toFixed(2)} (lap/waste ${rules.rebar_lap_waste_pct}%) = ${roundTo(withAllowance, 2)} m ÷ ${stockLengthM} m = ${roundTo(withAllowance / stockLengthM, 2)} → ${pieces} lengths (whole, up). Mass ≈ ${len} × ${spec.kg_per_m} = ${roundTo(massKg, 1)} kg.`,
    });

    lines.push({
      key: spec.key,
      label: spec.label,
      material_slug: spec.slug,
      quantity: pieces,
      quantity_source: "user_derived",
      unit: "lengths",
      detail: `${len} m schedule × ${lapFactor.toFixed(2)} ÷ ${stockLengthM} m → ${pieces} × ${stockLengthM} m lengths (lap/waste +${roundTo(withAllowance - len, 2)} m shown separately; ${spec.kg_per_m} kg/m)`,
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
      detail: `≈ ${roundTo(totalMassKg, 1)} kg (${roundTo(totalMassKg / 1000, 3)} tonnes) computed from true cutting lengths using standard nominal mass per metre. For delivery planning.`,
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


// ============================================================
// PHASE 1: AUTOMATED BAR BENDING SCHEDULE (BBS) & BVBS MACHINE EXPORT
// BS 8666:2020 / ACI SP-66 / ISO 3766 Standard
// ============================================================

export type BS8666ShapeCode = "00" | "11" | "21" | "33" | "41" | "51";

export interface BBSDimensions {
  A: number; // mm
  B?: number; // mm
  C?: number; // mm
  D?: number; // mm
  r?: number; // internal bend radius in mm
}

export interface BarScheduleItemInput {
  barMark: string;
  memberType: "beam" | "column" | "slab" | "footing" | "wall" | "stair";
  diameterMm: 8 | 10 | 12 | 16 | 20 | 25 | 32;
  shapeCode: BS8666ShapeCode;
  dimensions: BBSDimensions;
  numberOfMembers: number;
  barsPerMember: number;
}

export interface BarScheduleItemResult extends BarScheduleItemInput {
  totalBars: number;
  cutLengthM: number;
  totalLengthM: number;
  unitWeightKgPerM: number;
  totalMassKg: number;
}

export interface BarBendingScheduleResult {
  items: BarScheduleItemResult[];
  totalTonnageKg: number;
  summaryByDiameter: Record<
    number,
    { totalLengthM: number; totalPiecesStock: number; totalMassKg: number }
  >;
  bvbsData: string;
}

const NOMINAL_MASS_MAP: Record<number, number> = {
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.578,
  20: 2.466,
  25: 3.854,
  32: 6.313,
};

/**
 * Calculates cut length (in metres) per BS 8666:2020 bend deductions.
 */
export function calculateBarCutLength(
  shapeCode: BS8666ShapeCode,
  dims: BBSDimensions,
  diameterMm: number,
): number {
  const d = diameterMm;
  const A = Math.max(0, dims.A);
  const B = Math.max(0, dims.B ?? 0);
  const C = Math.max(0, dims.C ?? 0);
  const r = dims.r ?? 2 * d; // standard mandrel radius

  let cutLengthMm = A;

  switch (shapeCode) {
    case "00": // Straight bar
      cutLengthMm = A;
      break;
    case "11": // Single bend
      cutLengthMm = A + B - 0.5 * r - d;
      break;
    case "21": // Standard L-bar / 90° bend
      cutLengthMm = A + B;
      break;
    case "33": // U-bar
      cutLengthMm = A + 2 * B - C;
      break;
    case "41": // Column / beam link (stirrup) with standard anchorage hooks
      // Per BS 8666: 2A + 2B + 20d hook allowance
      cutLengthMm = 2 * A + 2 * B + 20 * d;
      break;
    case "51": // Double-crank / offset bar
      cutLengthMm = A + B + C;
      break;
    default:
      cutLengthMm = A + B + C;
  }

  return Math.round((cutLengthMm / 1000) * 1000) / 1000;
}

/**
 * Calculates structural development / lap length (in mm) per Eurocode 2 or ACI 318.
 */
export function calculateDevelopmentLength(
  barDiameterMm: number,
  fckOrFcPsi: number,
  fyMpa: number = 500,
  isTension: boolean = true,
  code: "eurocode" | "aci" | "bs8110" = "eurocode",
): number {
  const d = barDiameterMm;
  if (code === "aci") {
    // ACI 318-19: Simplified tension development length ld = (fy / (20 * sqrt(fc_psi))) * d
    const fcPsi = fckOrFcPsi > 100 ? fckOrFcPsi : fckOrFcPsi * 145.038;
    const factor = isTension ? (fyMpa * 145.038) / (20 * Math.sqrt(fcPsi)) : (fyMpa * 145.038) / (25 * Math.sqrt(fcPsi));
    return Math.ceil(Math.max(300, factor * d));
  } else if (code === "bs8110") {
    // BS 8110: Tension lap = 40d (deformed type 2), compression = 32d
    return Math.ceil(isTension ? 40 * d : 32 * d);
  } else {
    // Eurocode 2 (EN 1992-1-1): fctd = 0.21 * fck^(2/3) / 1.5; fbd = 2.25 * fctd; lbrqd = (d/4) * (fy / 1.15 / fbd)
    const fck = fckOrFcPsi > 100 ? fckOrFcPsi / 145.038 : fckOrFcPsi;
    const fctd = (0.21 * Math.pow(fck, 2 / 3)) / 1.5;
    const fbd = 2.25 * fctd;
    const lbrqd = (d / 4) * (fyMpa / 1.15 / fbd);
    const alpha = isTension ? 1.0 : 0.7; // compression factor
    return Math.ceil(Math.max(15 * d, alpha * lbrqd));
  }
}

/**
 * Generates an automated, fully audited Bar Bending Schedule (BBS) with total tonnage and stock cuts.
 */
export function generateBarBendingSchedule(
  inputs: BarScheduleItemInput[],
  stockLengthM: number = 12,
): BarBendingScheduleResult {
  const items: BarScheduleItemResult[] = [];
  let totalTonnageKg = 0;
  const summaryByDiameter: Record<
    number,
    { totalLengthM: number; totalPiecesStock: number; totalMassKg: number }
  > = {};

  for (const item of inputs) {
    const totalBars = item.numberOfMembers * item.barsPerMember;
    const cutLengthM = calculateBarCutLength(item.shapeCode, item.dimensions, item.diameterMm);
    const totalLengthM = Math.round(totalBars * cutLengthM * 100) / 100;
    const unitWeight = NOMINAL_MASS_MAP[item.diameterMm] ?? (item.diameterMm * item.diameterMm) / 162;
    const totalMassKg = Math.round(totalLengthM * unitWeight * 10) / 10;

    totalTonnageKg += totalMassKg;

    if (!summaryByDiameter[item.diameterMm]) {
      summaryByDiameter[item.diameterMm] = { totalLengthM: 0, totalPiecesStock: 0, totalMassKg: 0 };
    }
    summaryByDiameter[item.diameterMm].totalLengthM += totalLengthM;
    summaryByDiameter[item.diameterMm].totalMassKg += totalMassKg;

    items.push({
      ...item,
      totalBars,
      cutLengthM,
      totalLengthM,
      unitWeightKgPerM: unitWeight,
      totalMassKg,
    });
  }

  // Stock length pieces calculation per diameter
  for (const d of Object.keys(summaryByDiameter)) {
    const diam = Number(d);
    summaryByDiameter[diam].totalPiecesStock = Math.ceil(
      summaryByDiameter[diam].totalLengthM / stockLengthM,
    );
  }

  const bvbsData = generateBVBSString(items);

  return {
    items,
    totalTonnageKg: Math.round(totalTonnageKg * 10) / 10,
    summaryByDiameter,
    bvbsData,
  };
}

/**
 * Standard BVBS format generator for CNC rebar bending machinery.
 */
export function generateBVBSString(items: BarScheduleItemResult[]): string {
  const lines: string[] = ["BF2D@"];
  for (const item of items) {
    lines.push(
      `H B${item.barMark} n${item.totalBars} e${item.diameterMm} l${Math.round(item.cutLengthM * 1000)} g${item.shapeCode} vA${item.dimensions.A} vB${item.dimensions.B ?? 0}`,
    );
  }
  lines.push("C@");
  return lines.join("\n");
}
