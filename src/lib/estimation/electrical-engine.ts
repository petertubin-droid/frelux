/**
 * Electrical Wiring Engine (Tier 2, Engine 1)
 *
 * Deterministic electrical MATERIAL estimation. Quantities come
 * from two places only:
 *   1. Explicit user inputs - point counts, switch/DB counts,
 *      and the user's own average cable run lengths per category.
 *   2. Admin-configured planning rules (circuit grouping,
 *      conduit allowance, junction boxes, waste).
 *
 * The honesty contract:
 *  - Cable lengths are NEVER invented. Five cable categories are
 *    computed separately; each needs the user's average run
 *    length. A missing run length leaves the line unsized and
 *    marks the estimate INCOMPLETE, naming exactly what is missing.
 *  - Circuit grouping is a planning rule for counting circuits
 *    (and so breakers) - it is NOT certified electrical design.
 *    The result carries that distinction in its warnings.
 *  - Prices come from the shared material database. A material
 *    without a configured price shows PRICE NOT CONFIGURED and
 *    keeps the estimate total null - never a fabricated price.
 *  - Waste is never silent: every cable/conduit line shows base
 *    quantity, waste and final quantity in its breakdown line.
 *  - Labour is separate from materials and never auto-added.
 *
 * Rounding: cable and conduit round UP to whole metres (you buy
 * whole metres); pieces are exact integers; currency rounds to
 * 2 dp only at line-total and grand-total stage.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Rules - admin-configured planning behaviour
// ─────────────────────────────────────────────

export interface ElectricalRules {
  lighting_points_per_circuit: number;
  socket_points_per_circuit: number;
  dedicated_points_per_circuit: number;
  cable_waste_pct: number;
  conduit_waste_pct: number;
  /** Planning allowance in m per lighting point; null → not configured */
  conduit_m_per_lighting_point: number | null;
  /** Planning allowance in m per socket point; null → not configured */
  conduit_m_per_socket_point: number | null;
  junction_boxes_per_lighting_point: number | null;
}

export const DEFAULT_ELECTRICAL_RULES: ElectricalRules = {
  lighting_points_per_circuit: 10,
  socket_points_per_circuit: 8,
  dedicated_points_per_circuit: 1,
  cable_waste_pct: 0,
  conduit_waste_pct: 0,
  conduit_m_per_lighting_point: null,
  conduit_m_per_socket_point: null,
  junction_boxes_per_lighting_point: null,
};

export function parseElectricalRules(rows: CalcRuleRow[]): ElectricalRules {
  const rules: ElectricalRules = { ...DEFAULT_ELECTRICAL_RULES };
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

  const posInt = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && Number.isInteger(n) ? n : null;
  };
  const pct = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
  };
  const len = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const lpc = posInt(get("lighting_points_per_circuit"));
  if (lpc !== null) rules.lighting_points_per_circuit = lpc;
  const spc = posInt(get("socket_points_per_circuit"));
  if (spc !== null) rules.socket_points_per_circuit = spc;
  const dpc = posInt(get("dedicated_points_per_circuit"));
  if (dpc !== null) rules.dedicated_points_per_circuit = dpc;
  const cw = pct(get("cable_waste_pct"));
  if (cw !== null) rules.cable_waste_pct = cw;
  const pw = pct(get("conduit_waste_pct"));
  if (pw !== null) rules.conduit_waste_pct = pw;
  const cl = len(get("conduit_m_per_lighting_point"));
  if (cl !== null) rules.conduit_m_per_lighting_point = cl;
  const cs = len(get("conduit_m_per_socket_point"));
  if (cs !== null) rules.conduit_m_per_socket_point = cs;
  const jb = len(get("junction_boxes_per_lighting_point"));
  if (jb !== null) rules.junction_boxes_per_lighting_point = jb;

  return rules;
}

// ─────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────

export interface ElectricalLabourInput {
  mode: "none" | "per_point" | "lump_sum";
  /** Naira per point - required when mode is 'per_point' */
  per_point_rate?: number | null;
  /** Naira lump sum - required when mode is 'lump_sum' */
  lump_sum?: number | null;
}

export interface ElectricalInput {
  building_type: string;
  lighting_points: number;
  socket_points: number;
  dedicated_points: number;
  /** Wall switches (drives switch plate quantity) */
  switches: number;
  distribution_boards: number;
  /** Average cable run length per lighting point, metres. Null → line unsized. */
  avg_run_lighting_m: number | null;
  avg_run_socket_m: number | null;
  avg_run_dedicated_m: number | null;
  avg_run_earth_m: number | null;
  /** Average feeder run per distribution board, metres. Null → line unsized. */
  avg_run_feeder_m: number | null;
  labour: ElectricalLabourInput;
}

// ─────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────

export type LineSource =
  | "user_derived" // computed from user inputs
  | "rule_derived" // computed from admin planning rules
  | "user_provided" // direct count from the user
  | "missing"; // could not be sized honestly

export interface ElectricalLine {
  key: string;
  label: string;
  material_slug: string;
  /** structured quantity in `unit`; null when unsized */
  quantity: number | null;
  quantity_source: LineSource;
  unit: string;
  /** human-readable computation, e.g. "20 points × 12 m × 1.10 = 264 m" */
  detail: string;
  /** active price from the shared material database; null = PRICE NOT CONFIGURED */
  unit_price: number | null;
  /** quantity × unit_price, 2dp; null when unsized or unpriced */
  line_total: number | null;
}

export interface CircuitSummary {
  lighting_circuits: number;
  socket_circuits: number;
  dedicated_circuits: number;
  total_circuits: number;
  /** suggested distribution board ways - planning guidance only */
  db_ways_guidance: number;
}

export interface ElectricalStep {
  label: string;
  detail: string;
}

export interface ElectricalResult {
  ok: boolean;
  /** validation problems that stopped calculation */
  errors: string[];
  warnings: string[];
  steps: ElectricalStep[];
  lines: ElectricalLine[];
  circuit_summary: CircuitSummary | null;
  /** subtotal of the lines that ARE priced; never includes fabricated prices */
  priced_subtotal: number;
  /** full material subtotal; null when any line is unsized or unpriced */
  material_subtotal: number | null;
  /** labour total; 0 when labour mode is 'none' (explicitly excluded) */
  labour_total: number;
  grand_total: number | null;
  /** true when any line is unsized or unpriced - the estimate is not complete */
  incomplete: boolean;
  /** exactly what is missing, in plain words */
  missing: string[];
}

/** Prices keyed by material slug, from the shared material database.
 *  A missing key or null value means PRICE NOT CONFIGURED. */
export type ElectricalPriceMap = Record<string, number | null>;

// ─────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────

function isCount(v: number): boolean {
  return Number.isInteger(v) && v >= 0;
}

function isRun(v: number | null): boolean {
  return v !== null && Number.isFinite(v) && v > 0;
}

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function ceilM(v: number): number {
  // whole metres; scale-aware epsilon guards float dust at any magnitude
  return Math.ceil(v - Math.max(1e-9, Math.abs(v) * 1e-12));
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateElectrical(
  input: ElectricalInput,
  rules: ElectricalRules,
  prices: ElectricalPriceMap,
): ElectricalResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: ElectricalStep[] = [];
  const missing: string[] = [];

  // ── 0. Input validation - every count explicit and sane ──
  const counts: [keyof ElectricalInput, string][] = [
    ["lighting_points", "Lighting points"],
    ["socket_points", "Socket points"],
    ["dedicated_points", "Dedicated appliance points"],
    ["switches", "Switches"],
    ["distribution_boards", "Distribution boards"],
  ];
  for (const [key, label] of counts) {
    const v = input[key] as unknown;
    const n = Number(v);
    if (!Number.isFinite(n) || !isCount(n)) {
      errors.push(
        `${label} must be a whole number ≥ 0 (received ${String(v) ?? "nothing"}).`,
      );
    }
  }
  for (const [key, label] of [
    ["avg_run_lighting_m", "Average lighting cable run (m)"],
    ["avg_run_socket_m", "Average socket cable run (m)"],
    ["avg_run_dedicated_m", "Average dedicated circuit run (m)"],
    ["avg_run_earth_m", "Average earth cable run (m)"],
    ["avg_run_feeder_m", "Average feeder cable run (m)"],
  ] as [keyof ElectricalInput, string][]) {
    const v = input[key] as number | null;
    if (v !== null && (!Number.isFinite(v) || v <= 0)) {
      errors.push(`${label} must be a positive number, or left blank.`);
    }
  }
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      steps,
      lines: [],
      circuit_summary: null,
      priced_subtotal: 0,
      material_subtotal: null,
      labour_total: 0,
      grand_total: null,
      incomplete: true,
      missing,
    };
  }

  // ── 1. Circuit count - planning rules, never design ──
  const lightingCircuits =
    input.lighting_points > 0
      ? Math.ceil(input.lighting_points / rules.lighting_points_per_circuit)
      : 0;
  const socketCircuits =
    input.socket_points > 0
      ? Math.ceil(input.socket_points / rules.socket_points_per_circuit)
      : 0;
  const dedicatedCircuits =
    input.dedicated_points > 0
      ? Math.ceil(input.dedicated_points / rules.dedicated_points_per_circuit)
      : 0;
  const totalCircuits = lightingCircuits + socketCircuits + dedicatedCircuits;
  const circuitSummary: CircuitSummary = {
    lighting_circuits: lightingCircuits,
    socket_circuits: socketCircuits,
    dedicated_circuits: dedicatedCircuits,
    total_circuits: totalCircuits,
    db_ways_guidance: totalCircuits,
  };
  steps.push({
    label: "Circuits (planning rule, not design)",
    detail: `Lighting: ceil(${input.lighting_points} ÷ ${rules.lighting_points_per_circuit}) = ${lightingCircuits}. Sockets: ceil(${input.socket_points} ÷ ${rules.socket_points_per_circuit}) = ${socketCircuits}. Dedicated: ceil(${input.dedicated_points} ÷ ${rules.dedicated_points_per_circuit}) = ${dedicatedCircuits}. Total ${totalCircuits} circuits.`,
  });

  // ── 2. Cable categories - separate, never invented ──
  const wasteFactor = 1 + rules.cable_waste_pct / 100;
  const lines: ElectricalLine[] = [];

  const cableSpecs: {
    key: string;
    label: string;
    slug: string;
    runs: number;
    runLabel: string;
    avgRun: number | null;
  }[] = [
    {
      key: "cable_lighting",
      label: "Lighting circuit cable",
      slug: "elec-cable-lighting",
      runs: input.lighting_points,
      runLabel: "lighting points",
      avgRun: input.avg_run_lighting_m,
    },
    {
      key: "cable_socket",
      label: "Socket circuit cable",
      slug: "elec-cable-socket",
      runs: input.socket_points,
      runLabel: "socket points",
      avgRun: input.avg_run_socket_m,
    },
    {
      key: "cable_dedicated",
      label: "Dedicated appliance circuit cable",
      slug: "elec-cable-dedicated",
      runs: input.dedicated_points,
      runLabel: "dedicated points",
      avgRun: input.avg_run_dedicated_m,
    },
    {
      key: "cable_earth",
      label: "Earth cable",
      slug: "elec-cable-earth",
      runs: input.socket_points,
      runLabel: "socket points (earth follows socket circuits)",
      avgRun: input.avg_run_earth_m,
    },
    {
      key: "cable_feeder",
      label: "Feeder / sub-main cable",
      slug: "elec-cable-feeder",
      runs: input.distribution_boards,
      runLabel: "distribution boards",
      avgRun: input.avg_run_feeder_m,
    },
  ];

  for (const spec of cableSpecs) {
    const price = prices[spec.slug] ?? null;
    if (spec.runs === 0) continue; // no runs of this category exist: no line
    if (!isRun(spec.avgRun)) {
      missing.push(
        `${spec.label}: provide your estimated average run length per ${spec.runLabel.replace(/\s*\(.*\)$/, "")}: the engine will not invent cable length.`,
      );
      lines.push({
        key: spec.key,
        label: spec.label,
        material_slug: spec.slug,
        quantity: null,
        quantity_source: "missing",
        unit: "m",
        detail: "Waiting for your estimated average run length.",
        unit_price: price,
        line_total: null,
      });
      continue;
    }
    const base = spec.runs * (spec.avgRun ?? 0);
    const withWaste = base * wasteFactor;
    const qty = ceilM(withWaste);
    const wasteQty = qty - base;
    steps.push({
      label: spec.label,
      detail: `${spec.runs} ${spec.runLabel} × ${spec.avgRun} m = ${roundTo(base, 2)} m; waste ${rules.cable_waste_pct}% (+${roundTo(wasteQty, 2)} m) → ${qty} m (rounded up to whole metres).`,
    });
    lines.push({
      key: spec.key,
      label: spec.label,
      material_slug: spec.slug,
      quantity: qty,
      quantity_source: "user_derived",
      unit: "m",
      detail: `${spec.runs} × ${spec.avgRun} m × ${wasteFactor.toFixed(2)} = ${qty} m (waste +${roundTo(wasteQty, 2)} m shown separately)`,
      unit_price: price,
      line_total: price !== null && qty !== null ? money(qty * price) : null,
    });
  }

  // ── 3. Conduit - planning allowance, labelled as such ──
  const hasConduitRule =
    rules.conduit_m_per_lighting_point !== null ||
    rules.conduit_m_per_socket_point !== null;
  if (hasConduitRule) {
    const conduitWasteFactor = 1 + rules.conduit_waste_pct / 100;
    const base =
      input.lighting_points * (rules.conduit_m_per_lighting_point ?? 0) +
      input.socket_points * (rules.conduit_m_per_socket_point ?? 0);
    const qty = ceilM(base * conduitWasteFactor);
    if (qty <= 0) {
      // no runs exist: no conduit line, and nothing is "missing"
    } else {
      const price = prices["elec-conduit"] ?? null;
      steps.push({
        label: "Conduit (planning allowance)",
        detail: `${input.lighting_points} lighting × ${rules.conduit_m_per_lighting_point ?? 0} m + ${input.socket_points} sockets × ${rules.conduit_m_per_socket_point ?? 0} m = ${roundTo(base, 2)} m; waste ${rules.conduit_waste_pct}% → ${qty} m. This is the admin's planning allowance, not a site measurement.`,
      });
      lines.push({
        key: "conduit",
        label: "PVC conduit (planning allowance)",
        material_slug: "elec-conduit",
        quantity: qty,
        quantity_source: "rule_derived",
        unit: "m",
        detail: `Planning allowance from admin rules (${roundTo(base, 2)} m base + waste)`,
        unit_price: price,
        line_total: price !== null ? money(qty * price) : null,
      });
    }
  } else {
    missing.push(
      "Conduit: no planning allowance configured (conduit_m_per_lighting_point / conduit_m_per_socket_point). Measure your runs or configure the allowance.",
    );
  }

  // ── 4. Junction boxes - planning rule ──
  if (rules.junction_boxes_per_lighting_point !== null) {
    const qty = Math.ceil(
      input.lighting_points * rules.junction_boxes_per_lighting_point,
    );
    if (qty <= 0) {
      // zero lighting points: no junction box line
    } else {
      const price = prices["elec-junction-box"] ?? null;
      lines.push({
        key: "junction_boxes",
        label: "Junction boxes",
        material_slug: "elec-junction-box",
        quantity: qty,
        quantity_source: "rule_derived",
        unit: "pieces",
        detail: `${input.lighting_points} lighting points × ${rules.junction_boxes_per_lighting_point} per point = ${qty}`,
        unit_price: price,
        line_total: price !== null ? money(qty * price) : null,
      });
    }
  } else {
    missing.push(
      "Junction boxes: no planning rule configured (junction_boxes_per_lighting_point).",
    );
  }

  // ── 5. Breakers - one per circuit, count only ──
  const breakerQty = totalCircuits;
  if (breakerQty > 0) {
    const price = prices["elec-breaker"] ?? null;
    lines.push({
      key: "breakers",
      label: "Circuit breakers (one per circuit)",
      material_slug: "elec-breaker",
      quantity: breakerQty,
      quantity_source: "rule_derived",
      unit: "pieces",
      detail: `${totalCircuits} circuits × 1 breaker = ${breakerQty}. Rating is an electrical design decision: this engine counts circuits only.`,
      unit_price: price,
      line_total: price !== null ? money(breakerQty * price) : null,
    });
  }

  // ── 6. Accessories & boards - direct from user counts ──
  const directItems: {
    key: string;
    label: string;
    slug: string;
    qty: number;
    unit: string;
  }[] = [
    {
      key: "switch_plates",
      label: "Switch plates",
      slug: "elec-switch-plate",
      qty: input.switches,
      unit: "pieces",
    },
    {
      key: "socket_outlets",
      label: "Socket outlets",
      slug: "elec-socket-outlet",
      qty: input.socket_points,
      unit: "pieces",
    },
    {
      key: "distribution_boards",
      label: "Distribution boards",
      slug: "elec-distribution-board",
      qty: input.distribution_boards,
      unit: "pieces",
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
      unit: item.unit,
      detail: `${item.qty} × ${item.unit} (your count)`,
      unit_price: price,
      line_total: price !== null ? money(item.qty * price) : null,
    });
  }

  // ── 7. Labour - separate, never automatic ──
  let labourTotal = 0;
  const totalPoints =
    input.lighting_points + input.socket_points + input.dedicated_points;
  if (input.labour.mode === "per_point") {
    const rate = input.labour.per_point_rate ?? null;
    if (rate === null || !Number.isFinite(rate) || rate < 0) {
      errors.push(
        "Labour: a per-point rate is required when labour mode is per-point.",
      );
    } else {
      labourTotal = money(totalPoints * rate);
      steps.push({
        label: "Labour",
        detail: `${totalPoints} points × ${rate} per point = ${labourTotal} (user-provided rate).`,
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

  // ── 8. Totals - never fabricated ──
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
        `${l.label}: PRICE NOT CONFIGURED in the material database: the quantity is shown, but no price was invented.`,
      );
    }
  }
  if (input.building_type.trim()) {
    steps.push({ label: "Building type", detail: input.building_type.trim() });
  }
  warnings.push(
    "ESTIMATION ONLY: this is material planning, NOT professional electrical design. Circuit grouping, board ways and any cable sizes in the material notes are configuration defaults. Engage a licensed electrical engineer for design and certification.",
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
    circuit_summary: circuitSummary,
    priced_subtotal: pricedSubtotal,
    material_subtotal: materialSubtotal,
    labour_total: labourTotal,
    grand_total: grandTotal,
    incomplete,
    missing,
  };
}

function roundTo(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
