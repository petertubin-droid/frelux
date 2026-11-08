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
 *    configured rules - not invented measurements.
 *  - Prices come from the shared material database. Unpriced
 *    materials show PRICE NOT CONFIGURED; totals stay null.
 *  - This is material estimation, not professional plumbing design.
 *
 * Rounding: pipes round UP to whole metres; pieces are integers;
 * currency 2 dp at line-total/grand-total stage only.
 */

import type { CalcRuleRow } from "./count-vision-engine";
import { ceilM } from "./shared/purchase-rounding";

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

export interface PlumbingEngineeringMetrics {
  total_wsfu: number;
  peak_flow_lpm: number;
  peak_flow_lps: number;
  recommended_header_bore_mm: number;
  recommended_header_pipe_label: string;
  water_storage_litres_24h: number;
}

/**
 * IPC Table E103.3(3) demand for supply systems predominantly for flush tanks,
 * which is what Nigerian homes have. Kept as the printed table rather than a
 * curve fit: the previous power-law fit (0.25 WSFU^0.75 / 0.4 WSFU^0.55) ran
 * 1.5x to 2.1x above the table (22.3 gpm against 14.6 gpm at 10 WSFU, 130 gpm
 * against 61 gpm at 180 WSFU) and over-sized every header it recommended.
 */
const DEMAND_TABLE: ReadonlyArray<readonly [number, number]> = [
  [1, 3.0],
  [2, 5.0],
  [3, 6.5],
  [4, 8.0],
  [5, 9.4],
  [6, 10.7],
  [7, 11.8],
  [8, 12.8],
  [9, 13.7],
  [10, 14.6],
  [11, 15.4],
  [12, 16.0],
  [13, 16.5],
  [14, 17.0],
  [15, 17.5],
  [16, 18.0],
  [17, 18.4],
  [18, 18.8],
  [19, 19.2],
  [20, 19.6],
  [25, 21.5],
  [30, 23.3],
  [35, 24.9],
  [40, 26.3],
  [45, 27.7],
  [50, 29.1],
  [60, 32.0],
  [70, 35.0],
  [80, 38.0],
  [90, 41.0],
  [100, 43.5],
  [120, 48.0],
  [140, 52.5],
  [160, 57.0],
  [180, 61.0],
  [200, 65.0],
  [225, 70.0],
  [250, 75.0],
];

/** Litres per second in one US gallon per minute. */
const L_PER_S_PER_GPM = 0.06309;

/**
 * Interpolates the printed flush-tank demand table. Below 1 WSFU the table
 * starts at 3 gpm, so the load is taken from zero; above 250 WSFU the last
 * tabulated segment slope continues (0.2 gpm per WSFU), which keeps large
 * installations monotonic instead of falling off a cliff.
 */
export function demandGpmForWsfu(wsfu: number): number {
  if (!Number.isFinite(wsfu) || wsfu <= 0) return 0;
  const last = DEMAND_TABLE[DEMAND_TABLE.length - 1];
  if (wsfu > last[0]) {
    const prev = DEMAND_TABLE[DEMAND_TABLE.length - 2];
    const slope = (last[1] - prev[1]) / (last[0] - prev[0]);
    return last[1] + (wsfu - last[0]) * slope;
  }
  for (let i = 0; i < DEMAND_TABLE.length; i += 1) {
    const [load, gpm] = DEMAND_TABLE[i];
    if (wsfu === load) return gpm;
    if (wsfu < load) {
      const prev = DEMAND_TABLE[Math.max(0, i - 1)];
      const span = load - prev[0];
      if (span === 0) return gpm;
      return prev[1] + ((wsfu - prev[0]) / span) * (gpm - prev[1]);
    }
  }
  return last[1];
}
export function calculatePlumbingEngineeringMetrics(
  input: Pick<
    PlumbingInput,
    "taps" | "wcs" | "showers" | "sinks" | "floor_drains"
  >,
): PlumbingEngineeringMetrics {
  // Standard WSFU ratings (IPC Table E103.3(2) / BS EN 806-3):
  // Basin/tap: 1.0 WSFU, Sink: 1.5 WSFU, Shower: 2.0 WSFU, WC: 2.5 WSFU, Floor Drain: 0 WSFU
  const wsfu =
    (input.taps || 0) * 1.0 +
    (input.sinks || 0) * 1.5 +
    (input.showers || 0) * 2.0 +
    (input.wcs || 0) * 2.5;

  const peakLps = demandGpmForWsfu(wsfu) * L_PER_S_PER_GPM;
  const peakLpm = peakLps * 60;

  // Header sizing based on max permissible velocity 1.8 m/s (BS EN 806-3 / CIBSE Guide G)
  let boreMm = 13.2;
  let pipeLabel = '20 mm PPR (1/2" nominal)';
  if (peakLps > 0) {
    const areaM2 = peakLps / 1000 / 1.8;
    const reqBoreMm = Math.sqrt((4 * areaM2) / Math.PI) * 1000;
    boreMm = Math.round(reqBoreMm * 10) / 10;
    if (reqBoreMm <= 13.2) {
      pipeLabel = '20 mm PPR (13.2 mm bore, 1/2" nominal)';
    } else if (reqBoreMm <= 16.6) {
      pipeLabel = '25 mm PPR (16.6 mm bore, 3/4" nominal)';
    } else if (reqBoreMm <= 21.2) {
      pipeLabel = '32 mm PPR (21.2 mm bore, 1" nominal)';
    } else if (reqBoreMm <= 26.6) {
      pipeLabel = '40 mm PPR (26.6 mm bore, 1-1/4" nominal)';
    } else if (reqBoreMm <= 33.2) {
      pipeLabel = '50 mm PPR (33.2 mm bore, 1-1/2" nominal)';
    } else {
      pipeLabel = '63 mm PPR (42.0 mm bore, 2" nominal)';
    }
  }

  // 24-hour storage at 150 L per person (BS 6700 domestic allowance). Occupancy
  // is taken from the WC count at two people per WC, the usual occupancy proxy,
  // with a two-person floor. The earlier ((WCs + showers) x 2.5) put an
  // arbitrary 10 people in a two-WC flat and tripled the tank it recommended.
  const occupiedPersons = Math.max(2, Math.round((input.wcs || 0) * 2));
  const storageLitres = occupiedPersons * 150;

  return {
    total_wsfu: Math.round(wsfu * 10) / 10,
    peak_flow_lpm: Math.round(peakLpm * 10) / 10,
    peak_flow_lps: Math.round(peakLps * 100) / 100,
    recommended_header_bore_mm: boreMm,
    recommended_header_pipe_label: pipeLabel,
    water_storage_litres_24h: storageLitres,
  };
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
  engineering_metrics?: PlumbingEngineeringMetrics;
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
      detail: `${totalFixtures} fixture connections × ${f.perFixture} per fixture = ${qty} (visible planning allowance)`,
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

  const engineeringMetrics = calculatePlumbingEngineeringMetrics(input);
  if (engineeringMetrics.total_wsfu > 0) {
    steps.push({
      label: "Hydraulic design demand (IPC E103.3(3) flush tank / BS EN 806)",
      detail: `Total ${engineeringMetrics.total_wsfu} WSFU → peak demand ${engineeringMetrics.peak_flow_lpm} L/min (${engineeringMetrics.peak_flow_lps} L/s) from the printed IPC E103.3(3) flush-tank table. Header bore: ${engineeringMetrics.recommended_header_bore_mm} mm (${engineeringMetrics.recommended_header_pipe_label}) at ≤1.8 m/s velocity. Suggested 24h domestic storage: ${engineeringMetrics.water_storage_litres_24h} L at 150 L per person.`,
    });
  }

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
    engineering_metrics: engineeringMetrics,
  };
}
