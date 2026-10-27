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

// ─────────────────────────────────────────────
// BS 8666 bar bending schedule (BBS)
// ─────────────────────────────────────────────
//
// Cutting lengths are derived from neutral-axis geometry, not from a
// memorised table: every straight leg loses (r + d) at a bend because the
// schedule dimension is measured to the outside face, and every bend adds
// an arc of θ·(r + d/2) along the bar centreline. The bend radius r is the
// BS 8666:2019 mandrel radius (4d for d ≤ 16 mm, 7d above), so a cut length
// is always explainable from the dimensions a steel fixer sees on site.
//
// Shapes implemented (the four the schedule needs): 00 straight, 11 L-bar
// (one 90° bend), 21 U-bar (two 90° bends), 51 closed link/stirrup
// (four 90° bends plus BS 8666 135° hooks). Anything else is refused rather
// than approximated.

export type Bs8666ShapeCode = "00" | "11" | "21" | "51";

export interface Bs8666DimensionSet {
  /** Primary leg, mm */
  a: number;
  /** Second leg / width, mm */
  b?: number;
  /** Third leg (U-bar), mm */
  c?: number;
  /** Reserved for shapes that need a fourth dimension, mm */
  d?: number;
}

export interface Bs8666ShapeSpec {
  code: Bs8666ShapeCode;
  name: string;
  /** Dimension letters the shape needs, in schedule order. */
  requiredDims: ("a" | "b" | "c")[];
  /** Human-readable cut length rule. */
  rule: string;
  bends: number;
  hasHooks: boolean;
}

export const BS8666_SHAPES: Record<Bs8666ShapeCode, Bs8666ShapeSpec> = {
  "00": {
    code: "00",
    name: "Straight",
    requiredDims: ["a"],
    rule: "A",
    bends: 0,
    hasHooks: false,
  },
  "11": {
    code: "11",
    name: "L-bar (single 90° bend)",
    requiredDims: ["a", "b"],
    rule: "A + B − 2(r + d) + (π/2)(r + d/2)",
    bends: 1,
    hasHooks: false,
  },
  "21": {
    code: "21",
    name: "U-bar (two 90° bends)",
    requiredDims: ["a", "b", "c"],
    rule: "A + B + C − 4(r + d) + 2(π/2)(r + d/2)",
    bends: 2,
    hasHooks: false,
  },
  "51": {
    code: "51",
    name: "Closed link / stirrup (four 90° bends + 135° hooks)",
    requiredDims: ["a", "b"],
    rule: "2(A + B) − 8(r + d) + 4(π/2)(r + d/2) + 2·hook, hook = max(10d, 75 mm)",
    bends: 4,
    hasHooks: true,
  },
};

/** BS 8666:2019 minimum mandrel diameter for a bar diameter, mm. */
export function bs8666MandrelDiameterMm(diameterMm: number): number {
  return diameterMm <= 16 ? 4 * diameterMm : 7 * diameterMm;
}

/** Link hook tail length: EC2 §8.5 / BS 8666 135° link hook, mm. */
export function bs8666LinkHookMm(diameterMm: number): number {
  return Math.max(10 * diameterMm, 75);
}

export interface Bs8666CutLength {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Straight-line cut length along the bar centreline, mm */
  cutLengthMm: number | null;
  mandrelDiameterMm: number;
  bendRadiusMm: number;
  /** Total material consumed by bends and hooks, mm */
  bendAllowanceMm: number;
  hookAllowanceMm: number;
  /** Substituted formula with the caller's values, for the schedule notes. */
  formula: string;
}

/**
 * Cutting length for a BS 8666 shape. Refuses (ok: false) when a required
 * dimension is missing or smaller than the bend geometry allows — a silently
 * short cut length is a scrap bar on site.
 */
export function bs8666CutLength(params: {
  shapeCode: Bs8666ShapeCode;
  diameterMm: number;
  dims: Bs8666DimensionSet;
}): Bs8666CutLength {
  const { shapeCode, diameterMm, dims } = params;
  const spec = BS8666_SHAPES[shapeCode];
  const errors: string[] = [];
  const warnings: string[] = [];
  const mandrel = bs8666MandrelDiameterMm(diameterMm);
  const r = mandrel / 2;
  const d = diameterMm;

  const base: Bs8666CutLength = {
    ok: false,
    errors,
    warnings,
    cutLengthMm: null,
    mandrelDiameterMm: mandrel,
    bendRadiusMm: r,
    bendAllowanceMm: 0,
    hookAllowanceMm: 0,
    formula: "",
  };

  if (!Number.isFinite(diameterMm) || diameterMm <= 0) {
    errors.push("Bar diameter must be a positive number.");
    return base;
  }
  if (!spec) {
    errors.push(
      `Shape code ${String(shapeCode)} is not supported by this schedule.`,
    );
    return base;
  }
  for (const key of spec.requiredDims) {
    const v = dims[key];
    if (v === null || v === undefined || !Number.isFinite(v)) {
      errors.push(`Shape ${spec.code} needs dimension ${key.toUpperCase()}.`);
    }
  }
  if (errors.length > 0) return base;

  const quarterArc = (Math.PI / 2) * (r + d / 2);
  const hook = spec.hasHooks ? bs8666LinkHookMm(d) : 0;
  let cut = 0;
  let formula = "";
  let bends = 0;

  switch (shapeCode) {
    case "00": {
      cut = dims.a;
      formula = `L = A = ${roundTo(dims.a, 1)} mm`;
      break;
    }
    case "11": {
      const legs = dims.a + (dims.b ?? 0);
      cut = legs - 2 * (r + d) + quarterArc;
      bends = 1;
      formula =
        `L = ${roundTo(dims.a, 1)} + ${roundTo(dims.b ?? 0, 1)} − 2(${roundTo(r, 1)} + ${d}) ` +
        `+ (π/2)(${roundTo(r, 1)} + ${d / 2}) = ${roundTo(cut, 1)} mm`;
      break;
    }
    case "21": {
      const legs = dims.a + (dims.b ?? 0) + (dims.c ?? 0);
      cut = legs - 4 * (r + d) + 2 * quarterArc;
      bends = 2;
      formula =
        `L = ${roundTo(dims.a, 1)} + ${roundTo(dims.b ?? 0, 1)} + ${roundTo(dims.c ?? 0, 1)} ` +
        `− 4(${roundTo(r, 1)} + ${d}) + 2(π/2)(${roundTo(r, 1)} + ${d / 2}) = ${roundTo(cut, 1)} mm`;
      break;
    }
    case "51": {
      const perimeter = 2 * (dims.a + (dims.b ?? 0));
      cut = perimeter - 8 * (r + d) + 4 * quarterArc + 2 * hook;
      bends = 4;
      formula =
        `L = 2(${roundTo(dims.a, 1)} + ${roundTo(dims.b ?? 0, 1)}) − 8(${roundTo(r, 1)} + ${d}) ` +
        `+ 4(π/2)(${roundTo(r, 1)} + ${d / 2}) + 2 × ${roundTo(hook, 1)} = ${roundTo(cut, 1)} mm`;
      break;
    }
  }

  // A leg shorter than the bend radius plus the bar diameter cannot be formed.
  const minLeg = r + d;
  for (const key of spec.requiredDims) {
    const v = dims[key] as number;
    if (key !== "b" && v < minLeg) {
      warnings.push(
        `Dimension ${key.toUpperCase()} (${roundTo(v, 1)} mm) is below the minimum formable leg ${roundTo(minLeg, 1)} mm for a ${d} mm bar.`,
      );
    }
  }
  if (cut <= 0) {
    errors.push("Computed cut length is not positive; check the dimensions.");
    return {
      ...base,
      bendAllowanceMm: roundTo(bends * quarterArc, 2),
      hookAllowanceMm: roundTo(2 * hook, 2),
      formula,
    };
  }

  return {
    ok: true,
    errors,
    warnings,
    cutLengthMm: roundTo(cut, 1),
    mandrelDiameterMm: mandrel,
    bendRadiusMm: r,
    bendAllowanceMm: roundTo(bends * quarterArc, 2),
    hookAllowanceMm: roundTo(2 * hook, 2),
    formula,
  };
}

/** BS 4449 nominal mass per metre, kg/m (0.006165 d²). */
export function rebarKgPerMetre(diameterMm: number): number {
  return roundTo(0.006165 * diameterMm * diameterMm, 4);
}

export interface BbsBarInput {
  /** Bar mark as it appears on the schedule, e.g. "B1" */
  barMark: string;
  /** Steel designation, e.g. "B500B (T)" */
  typeGrade: string;
  diameterMm: number;
  /** How many identical members carry this bar */
  members: number;
  /** How many of this bar are in each member */
  barsPerMember: number;
  shapeCode: Bs8666ShapeCode;
  dims: Bs8666DimensionSet;
}

export interface BbsRow {
  barMark: string;
  typeGrade: string;
  sizeMm: number;
  members: number;
  barsPerMember: number;
  totalBars: number;
  /** Cut length of one bar, mm */
  lengthEachMm: number | null;
  /** Total length of all bars for this mark, m */
  totalLengthM: number | null;
  shapeCode: Bs8666ShapeCode;
  shapeName: string;
  dims: Bs8666DimensionSet;
  /** Total mass for this mark, kg */
  weightKg: number | null;
  formula: string;
  mandrelDiameterMm: number;
  warnings: string[];
}

export interface BarBendingSchedule {
  rows: BbsRow[];
  totals: {
    barMarks: number;
    totalBars: number;
    totalLengthM: number;
    totalWeightKg: number;
  };
  errors: string[];
  warnings: string[];
  /** Shapes and allowances this schedule assumed, for the drawing notes. */
  notes: string[];
}

/**
 * Builds the bar bending schedule. Every row is either fully computed or
 * flagged: a row whose shape or dimensions are incomplete keeps its inputs
 * but carries no length or weight, and reports why.
 */
export function buildBarBendingSchedule(
  bars: readonly BbsBarInput[],
): BarBendingSchedule {
  const rows: BbsRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenMarks = new Set<string>();

  for (const bar of bars) {
    const mark = (bar.barMark ?? "").trim();
    if (!mark) {
      errors.push("A schedule row has no bar mark.");
      continue;
    }
    if (seenMarks.has(mark)) {
      errors.push(`Duplicate bar mark "${mark}" — marks must be unique.`);
      continue;
    }
    seenMarks.add(mark);

    const members = Number.isFinite(bar.members)
      ? Math.max(0, Math.floor(bar.members))
      : 0;
    const perMember = Number.isFinite(bar.barsPerMember)
      ? Math.max(0, Math.floor(bar.barsPerMember))
      : 0;
    if (members <= 0 || perMember <= 0) {
      errors.push(
        `Bar mark "${mark}": members and bars per member must both be at least 1.`,
      );
    }

    const cut = bs8666CutLength({
      shapeCode: bar.shapeCode,
      diameterMm: bar.diameterMm,
      dims: bar.dims,
    });
    const totalBars = members * perMember;
    const totalLengthM =
      cut.ok && cut.cutLengthMm !== null
        ? roundTo((cut.cutLengthMm * totalBars) / 1000, 3)
        : null;
    const weightKg =
      totalLengthM !== null
        ? roundTo(totalLengthM * rebarKgPerMetre(bar.diameterMm), 2)
        : null;

    for (const w of cut.warnings) warnings.push(`Bar ${mark}: ${w}`);
    for (const e of cut.errors) errors.push(`Bar ${mark}: ${e}`);

    rows.push({
      barMark: mark,
      typeGrade: bar.typeGrade,
      sizeMm: bar.diameterMm,
      members,
      barsPerMember: perMember,
      totalBars,
      lengthEachMm: cut.ok ? cut.cutLengthMm : null,
      totalLengthM,
      shapeCode: bar.shapeCode,
      shapeName: BS8666_SHAPES[bar.shapeCode]?.name ?? "Unsupported shape",
      dims: bar.dims,
      weightKg,
      formula: cut.formula,
      mandrelDiameterMm: cut.mandrelDiameterMm,
      warnings: cut.warnings,
    });
  }

  const totalBars = rows.reduce((s, r) => s + r.totalBars, 0);
  const totalLengthM = roundTo(
    rows.reduce((s, r) => s + (r.totalLengthM ?? 0), 0),
    3,
  );
  const totalWeightKg = roundTo(
    rows.reduce((s, r) => s + (r.weightKg ?? 0), 0),
    2,
  );

  const notes = [
    "Cutting lengths are neutral-axis lengths: BS 8666:2019 shape codes with mandrel diameters 4d (d ≤ 16 mm) and 7d (d > 16 mm).",
    "Schedule dimensions are measured to the outside face of the bar; each bend deducts (r + d) per leg end.",
    "Link hooks are 135° with a tail of max(10d, 75 mm) per EC2 §8.5.",
    "Masses use the BS 4449 nominal mass 0.006165 d² kg/m.",
    "Laps are not included: add lap lengths to the total length before ordering.",
  ];

  return {
    rows,
    totals: { barMarks: rows.length, totalBars, totalLengthM, totalWeightKg },
    errors,
    warnings,
    notes,
  };
}

/** CSV export of the schedule, one row per bar mark. */
export function bbsToCsv(schedule: BarBendingSchedule): string {
  const header = [
    "Bar mark",
    "Type/grade",
    "Size (mm)",
    "No. of members",
    "No. of bars in each",
    "Total no. of bars",
    "Length of each bar (mm)",
    "Total length (m)",
    "Shape code",
    "A (mm)",
    "B (mm)",
    "C (mm)",
    "D (mm)",
    "Weight (kg)",
  ];
  const esc = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined || v === "") return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of schedule.rows) {
    lines.push(
      [
        esc(r.barMark),
        esc(r.typeGrade),
        esc(r.sizeMm),
        esc(r.members),
        esc(r.barsPerMember),
        esc(r.totalBars),
        esc(r.lengthEachMm),
        esc(r.totalLengthM),
        esc(r.shapeCode),
        esc(r.dims.a),
        esc(r.dims.b ?? null),
        esc(r.dims.c ?? null),
        esc(r.dims.d ?? null),
        esc(r.weightKg),
      ].join(","),
    );
  }
  return lines.join("\n");
}
