/**
 * Plumbing Engine (Tier 2, Engine 2)
 *
 * Deterministic plumbing MATERIAL estimation. Two quantity sources
 * only - explicit user inputs and admin-configured planning rules:
 *
 *   USER: fixture counts (taps, WCs, showers, sinks, floor drains,
 *         storage tanks, pumps) and the TOTAL pipe run length per
 *         category (cold, hot, waste, drainage).
 *   RULES: pipe waste %, fitting planning allowances per fixture
 *         connection, valves per tap.
 *
 * Honesty contract:
 *  - Pipe run lengths are NEVER assumed. A missing run length
 *    leaves that pipe line unsized, the estimate is marked
 *    incomplete, and the missing input is named in plain words.
 *  - Hot water is a separate category, included only when the
 *    user provides a hot water run length.
 *  - Fitting counts are labelled PLANNING ALLOWANCES derived from
 *    admin rules - not invented measurements.
 *  - Prices come from the shared material database. Unpriced
 *    materials show PRICE NOT CONFIGURED; totals stay null.
 *  - This is material estimation, not professional plumbing design.
 *
 * Rounding: pipes round UP to whole metres; pieces are integers;
 * currency 2 dp at line-total/grand-total stage only.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────

export interface PlumbingRules {
  pipe_waste_pct: number;
  elbow_per_fixture: number | null;
  tee_per_fixture: number | null;
  reducer_per_fixture: number | null;
  union_per_fixture: number | null;
  valve_per_tap: number | null;
}

export const DEFAULT_PLUMBING_RULES: PlumbingRules = {
  pipe_waste_pct: 0,
  elbow_per_fixture: null,
  tee_per_fixture: null,
  reducer_per_fixture: null,
  union_per_fixture: null,
  valve_per_tap: null,
};

export function parsePlumbingRules(rows: CalcRuleRow[]): PlumbingRules {
  const rules: PlumbingRules = { ...DEFAULT_PLUMBING_RULES };
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
  const per = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const pw = pct(get("pipe_waste_pct"));
  if (pw !== null) rules.pipe_waste_pct = pw;
  const e = per(get("elbow_per_fixture"));
  if (e !== null) rules.elbow_per_fixture = e;
  const t = per(get("tee_per_fixture"));
  if (t !== null) rules.tee_per_fixture = t;
  const rd = per(get("reducer_per_fixture"));
  if (rd !== null) rules.reducer_per_fixture = rd;
  const u = per(get("union_per_fixture"));
  if (u !== null) rules.union_per_fixture = u;
  const v = per(get("valve_per_tap"));
  if (v !== null) rules.valve_per_tap = v;
  return rules;
}

// ─────────────────────────────────────────────
// Input / output
// ─────────────────────────────────────────────

export interface PlumbingInput {
  taps: number;
  wcs: number;
  showers: number;
  sinks: number;
  floor_drains: number;
  water_storage_tanks: number;
  pumps: number;
  /** Total cold water run, metres. Null → unsized. */
  cold_run_m: number | null;
  /** Total hot water run, metres. Null → not sized (no hot water system given). */
  hot_run_m: number | null;
  /** Total waste run, metres. Null → unsized. */
  waste_run_m: number | null;
  /** Total drainage run, metres. Null → unsized. */
  drainage_run_m: number | null;
  labour: {
    mode: "none" | "per_fixture" | "lump_sum";
    per_fixture_rate?: number | null;
    lump_sum?: number | null;
  };
}

export type LineSource =
  "user_derived" | "rule_derived" | "user_provided" | "missing";

export interface PlumbingLine {
  key: string;
  label: string;
  material_slug: string;
  quantity: number | null;
  quantity_source: LineSource;
  unit: string;
  detail: string;
  unit_price: number | null;
  line_total: number | null;
}

export interface PlumbingStep {
  label: string;
  detail: string;
}

export interface PlumbingResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: PlumbingStep[];
  lines: PlumbingLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
}

export type PlumbingPriceMap = Record<string, number | null>;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isCount(v: number): boolean {
  return Number.isInteger(v) && v >= 0;
}

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function ceilM(v: number): number {
  return Math.ceil(v - Math.max(1e-9, Math.abs(v) * 1e-12));
}

function roundTo(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculatePlumbing(
  input: PlumbingInput,
  rules: PlumbingRules,
  prices: PlumbingPriceMap,
): PlumbingResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: PlumbingStep[] = [];
  const missing: string[] = [];
  const lines: PlumbingLine[] = [];

  // ── 0. Validation ──
  const counts: [keyof PlumbingInput, string][] = [
    ["taps", "Taps"],
    ["wcs", "WCs"],
    ["showers", "Showers"],
    ["sinks", "Sinks"],
    ["floor_drains", "Floor drains"],
    ["water_storage_tanks", "Water storage tanks"],
    ["pumps", "Pumps"],
  ];
  for (const [key, label] of counts) {
    const n = Number(input[key]);
    if (!Number.isFinite(n) || !isCount(n)) {
      errors.push(
        `${label} must be a whole number ≥ 0 (received ${String(input[key])}).`,
      );
    }
  }
  const runs: [keyof PlumbingInput, string][] = [
    ["cold_run_m", "Cold water pipe run (m)"],
    ["hot_run_m", "Hot water pipe run (m)"],
    ["waste_run_m", "Waste pipe run (m)"],
    ["drainage_run_m", "Drainage pipe run (m)"],
  ];
  for (const [key, label] of runs) {
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

  const totalFixtures =
    input.taps + input.wcs + input.showers + input.sinks + input.floor_drains;

  // ── 1. Pipe categories - separate, user-measured ──
  const wasteFactor = 1 + rules.pipe_waste_pct / 100;
  const pipeSpecs: {
    key: string;
    label: string;
    slug: string;
    run: number | null;
    note?: string;
  }[] = [
    {
      key: "pipe_cold",
      label: "Cold water pipe",
      slug: "plumb-pipe-cold",
      run: input.cold_run_m,
    },
    {
      key: "pipe_hot",
      label: "Hot water pipe",
      slug: "plumb-pipe-hot",
      run: input.hot_run_m,
      note: "included only when you provide a hot water run",
    },
    {
      key: "pipe_waste",
      label: "Waste pipe",
      slug: "plumb-pipe-waste",
      run: input.waste_run_m,
    },
    {
      key: "pipe_drainage",
      label: "Drainage pipe",
      slug: "plumb-pipe-drainage",
      run: input.drainage_run_m,
    },
  ];

  for (const spec of pipeSpecs) {
    const price = prices[spec.slug] ?? null;
    if (spec.run === 0) continue; // explicitly none
    if (spec.run === null) {
      missing.push(
        `${spec.label}: enter your measured or estimated total run length${spec.note ? ` (${spec.note})` : ""}: the engine will not assume hidden pipe lengths.`,
      );
      lines.push({
        key: spec.key,
        label: spec.label,
        material_slug: spec.slug,
        quantity: null,
        quantity_source: "missing",
        unit: "m",
        detail: "Waiting for your measured run length.",
        unit_price: price,
        line_total: null,
      });
      continue;
    }
    const withWaste = spec.run * wasteFactor;
    const qty = ceilM(withWaste);
    steps.push({
      label: spec.label,
      detail: `${spec.run} m × ${wasteFactor.toFixed(2)} (waste ${rules.pipe_waste_pct}%) = ${roundTo(withWaste, 2)} m → ${qty} m (whole metres, up).`,
    });
    lines.push({
      key: spec.key,
      label: spec.label,
      material_slug: spec.slug,
      quantity: qty,
      quantity_source: "user_derived",
      unit: "m",
      detail: `${spec.run} m × ${wasteFactor.toFixed(2)} = ${qty} m (waste +${roundTo(qty - spec.run, 2)} m shown separately)`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  }

  // ── 2. Fittings - labelled planning allowances ──
  const fittingRules: {
    key: string;
    label: string;
    slug: string;
    perFixture: number | null;
  }[] = [
    {
      key: "elbows",
      label: "Pipe elbows",
      slug: "plumb-elbow",
      perFixture: rules.elbow_per_fixture,
    },
    {
      key: "tees",
      label: "Pipe tees",
      slug: "plumb-tee",
      perFixture: rules.tee_per_fixture,
    },
    {
      key: "reducers",
      label: "Pipe reducers",
      slug: "plumb-reducer",
      perFixture: rules.reducer_per_fixture,
    },
    {
      key: "unions",
      label: "Pipe unions",
      slug: "plumb-union",
      perFixture: rules.union_per_fixture,
    },
  ];
  for (const f of fittingRules) {
    const price = prices[f.slug] ?? null;
    if (f.perFixture === null) {
      missing.push(
        `${f.label}: no planning allowance configured (${f.key}_per_fixture). Count them on site or configure the allowance.`,
      );
      continue;
    }
    const qty = Math.ceil(totalFixtures * f.perFixture);
    if (qty <= 0) continue;
    lines.push({
      key: f.key,
      label: `${f.label} (planning allowance)`,
      material_slug: f.slug,
      quantity: qty,
      quantity_source: "rule_derived",
      unit: "pieces",
      detail: `${totalFixtures} fixture connections × ${f.perFixture} per fixture = ${qty} (admin's visible planning allowance)`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  }

  // ── 3. Valves per tap ──
  if (rules.valve_per_tap !== null && input.taps > 0) {
    const qty = Math.ceil(input.taps * rules.valve_per_tap);
    const price = prices["plumb-valve"] ?? null;
    lines.push({
      key: "valves",
      label: "Valves",
      material_slug: "plumb-valve",
      quantity: qty,
      quantity_source: "rule_derived",
      unit: "pieces",
      detail: `${input.taps} taps × ${rules.valve_per_tap} = ${qty} (planning rule)`,
      unit_price: price,
      line_total: price !== null ? money(qty * price) : null,
    });
  }

  // ── 4. Fixtures and connection kits - direct user counts ──
  const directItems: {
    key: string;
    label: string;
    slug: string;
    qty: number;
  }[] = [
    { key: "taps", label: "Taps", slug: "plumb-tap", qty: input.taps },
    {
      key: "wc_connections",
      label: "WC connection kits",
      slug: "plumb-wc-connection",
      qty: input.wcs,
    },
    {
      key: "shower_connections",
      label: "Shower connection kits",
      slug: "plumb-shower-connection",
      qty: input.showers,
    },
    {
      key: "sink_connections",
      label: "Sink connection kits",
      slug: "plumb-sink-connection",
      qty: input.sinks,
    },
    {
      key: "floor_drains",
      label: "Floor drains",
      slug: "plumb-floor-drain",
      qty: input.floor_drains,
    },
    {
      key: "storage_connections",
      label: "Water storage connection kits",
      slug: "plumb-storage-connection",
      qty: input.water_storage_tanks,
    },
    {
      key: "pump_connections",
      label: "Pump connection kits",
      slug: "plumb-pump-connection",
      qty: input.pumps,
    },
  ];
  for (const item of directItems) {
    if (item.qty === 0) continue;
    const price = prices[item.slug] ?? null;
    lines.push({
      key: item.key,
      label: item.label,
      material_slug: item.slug,
      quantity: item.qty,
      quantity_source: "user_provided",
      unit: "pieces",
      detail: `${item.qty} × pieces (your count)`,
      unit_price: price,
      line_total: price !== null ? money(item.qty * price) : null,
    });
  }

  // ── 5. Labour - separate, never automatic ──
  let labourTotal = 0;
  if (input.labour.mode === "per_fixture") {
    const rate = input.labour.per_fixture_rate ?? null;
    if (rate === null || !Number.isFinite(rate) || rate < 0) {
      errors.push(
        "Labour: a per-fixture rate is required when labour mode is per-fixture.",
      );
    } else {
      labourTotal = money(
        (totalFixtures + input.water_storage_tanks + input.pumps) * rate,
      );
      steps.push({
        label: "Labour",
        detail: `${totalFixtures + input.water_storage_tanks + input.pumps} fixture/connection points × ${rate} per point = ${labourTotal} (user-provided rate).`,
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
    "This is material ESTIMATION, not professional plumbing design. Pipe diameters, slopes and drainage design need a qualified plumber or engineer.",
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
