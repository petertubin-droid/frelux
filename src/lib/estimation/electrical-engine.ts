/**
 * Electrical Wiring Engine (Tier 2, Engine 1)
 *
 * Deterministic electrical MATERIAL estimation. Quantities come
 * from two places only:
 *   1. Explicit user inputs - point counts, switch/DB counts,
 *      and the user's own average cable run lengths per category.
 *   2. Verified planning rules (circuit grouping,
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
import { ceilM } from "./shared/purchase-rounding";

// ─────────────────────────────────────────────
// Rules - admin-configured planning behaviour
// ─────────────────────────────────────────────

export interface ElectricalRules {
  lighting_points_per_circuit: number;
  socket_points_per_circuit: number;
  dedicated_points_per_circuit: number;
  /** Connected load assumed per lighting point, VA (market rule). */
  lighting_va_per_point: number;
  /** Connected load assumed per twin socket point, VA (market rule). */
  socket_va_per_point: number;
  /** Connected load assumed per dedicated appliance point, VA (market rule). */
  dedicated_va_per_point: number;
  /**
   * Assumed power factor for the maximum-demand current. A planning figure, not
   * a measured one: 0.9 is fine for mixed domestic load, lower for motor-heavy
   * installations. Configurable because it moves the incomer size directly.
   */
  power_factor: number;
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
  lighting_va_per_point: 100,
  socket_va_per_point: 250,
  dedicated_va_per_point: 2500,
  power_factor: 0.9,
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
  const va = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const pfUnit = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= 1 ? n : null;
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
  // Connected-load basis (audit 2026-11-08): these three were literals while
  // every other rate in the engine came from a rule. 250 VA per twin socket is
  // a planning figure, roughly a third of a 13 A outlet's 2.99 kVA, so a market
  // that sizes socket-dominated supplies sets it here rather than editing code.
  const lva = va(get("lighting_va_per_point"));
  if (lva !== null) rules.lighting_va_per_point = lva;
  const sva = va(get("socket_va_per_point"));
  if (sva !== null) rules.socket_va_per_point = sva;
  const dva = va(get("dedicated_va_per_point"));
  if (dva !== null) rules.dedicated_va_per_point = dva;
  const pfRule = pfUnit(get("power_factor"));
  if (pfRule !== null) rules.power_factor = pfRule;
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

// ─────────────────────────────────────────────
// Voltage drop (audit fix F7) - pure advisory check
// ─────────────────────────────────────────────

/** IET/NEC-style voltage-drop limits as a percentage of nominal voltage. */
export const VOLTAGE_DROP_LIMITS = { lighting: 3, power: 5 } as const;

/** Resistivity of annealed copper at 20 degC, ohm·mm2/m. */
/**
 * Design resistivity of copper at conductor operating temperature, ohm.mm2/m.
 *
 * 0.0172 is copper at 20 C, which is the wrong basis for sizing a cable: a
 * conductor under load sits near 70 C, where resistance is roughly a third
 * higher. BS 7671 Appendix 4 tabulated voltage drops are derived at operating
 * temperature, and a check against the cold value understates the drop by
 * about 24 percent, in the direction that passes cables that will exceed their
 * limit in service. 0.0225 is the conventional 70 C design figure.
 */
export const COPPER_RESISTIVITY = 0.0225;

export interface VoltageDropCheck {
  /** one-way cable run length in metres */
  run_m: number;
  /** real connected load on the run, in watts */
  load_watts: number;
  /** nominal system voltage (e.g. 230 for NG single-phase, 120 US) */
  voltage: number;
  /** copper conductor cross-section in mm2 */
  cross_section_mm2: number;
  /** true when the run mainly serves lighting (3% limit instead of 5%) */
  lighting_dominant?: boolean;
  /**
   * Supply arrangement. A balanced three-phase feeder carries the same total
   * power at 1/sqrt(3) of the single-phase current, so its drop is half the
   * two-wire figure for the same load. Treating every 400 V feeder as a
   * two-wire circuit overstated the drop of three-phase runs by about 15
   * percent and flagged healthy installations as failures.
   */
  system?: SupplySystem;
  /**
   * Power factor of the load. Unity is only right for resistive loads; a motor
   * at 0.8 draws 25 percent more current and drops 25 percent more volts.
   */
  power_factor?: number;
}

export type SupplySystem = "single" | "three";

/** Sensible ceiling for a power factor entered by hand. */
function normPowerFactor(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return 1;
  return Math.min(1, Math.max(0.1, value));
}

export interface VoltageDropVerdict {
  drop_percent: number;
  limit_percent: number;
  passes: boolean;
  detail: string;
}

/**
 * Single-phase two-core copper voltage drop:
 *   Vd = 2 * L * I * rho / A,  I = P / V (unity power factor, conservative)
 * Reported as a percentage of the nominal voltage against the 3%/5% limit.
 * This is an advisory check, NOT a cable-sizing design.
 */
export function voltageDropPercent(
  check: VoltageDropCheck,
): VoltageDropVerdict {
  const { run_m, load_watts, voltage, cross_section_mm2 } = check;
  const limit =
    check.lighting_dominant === true
      ? VOLTAGE_DROP_LIMITS.lighting
      : VOLTAGE_DROP_LIMITS.power;
  if (run_m <= 0 || load_watts <= 0 || voltage <= 0 || cross_section_mm2 <= 0) {
    return {
      drop_percent: 0,
      limit_percent: limit,
      passes: false,
      detail:
        "Voltage drop not checked: run length, load, voltage and cable cross-section must all be provided.",
    };
  }
  const system: SupplySystem = check.system === "three" ? "three" : "single";
  const pf = normPowerFactor(check.power_factor);
  const current =
    system === "three"
      ? load_watts / (Math.sqrt(3) * voltage * pf)
      : load_watts / (voltage * pf);
  // Two loaded conductors give 2 L I rho / A; a balanced three-phase line
  // gives sqrt(3) L I_L rho / A, which collapses to half the two-wire result
  // because I_L is itself 1/sqrt(3) of the single-phase current.
  const loopFactor = system === "three" ? Math.sqrt(3) : 2;
  const dropV =
    (loopFactor * run_m * current * COPPER_RESISTIVITY) / cross_section_mm2;
  const drop_percent = (dropV / voltage) * 100;
  const passes = drop_percent <= limit;
  const phaseLabel = system === "three" ? "three-phase" : "single-phase";
  return {
    drop_percent: Math.round(drop_percent * 100) / 100,
    limit_percent: limit,
    passes,
    detail: `Feeder voltage drop (${phaseLabel}) = ${loopFactor === 2 ? "2" : "√3"} × ${run_m} m × ${Math.round(current * 100) / 100} A × ${COPPER_RESISTIVITY} / ${cross_section_mm2} mm² = ${Math.round(dropV * 100) / 100} V (${Math.round(drop_percent * 100) / 100}% of ${voltage} V; limit ${limit}%, power factor ${pf}).`,
  };
}

/**
 * Current-carrying capacity of copper conductors, in amperes, for the
 * commonest domestic and light-commercial installation method: non-armoured
 * multicore cable clipped direct, or in a conduit on a wall (BS 7671 Table 4D5,
 * 70 C thermoplastic, two loaded conductors).
 *
 * These are tabulated values, not a calculation. Grouping, ambient temperature,
 * thermal insulation and protective-device type each derate them, so a cable
 * picked here is a floor, not a design.
 */
export const COPPER_AMPACITY_A: ReadonlyArray<readonly [number, number]> = [
  [1.5, 19.5],
  [2.5, 27],
  [4, 36],
  [6, 46],
  [10, 63],
  [16, 85],
  [25, 112],
  [35, 138],
  [50, 168],
  [70, 213],
  [95, 258],
];

export interface CableSizingRequest {
  load_watts: number;
  voltage: number;
  run_m: number;
  system?: SupplySystem;
  power_factor?: number;
  lighting_dominant?: boolean;
  /** Design current already known, e.g. from a diversity calculation. */
  design_current_a?: number;
}

export interface CableSizingVerdict {
  feasible: boolean;
  cross_section_mm2: number | null;
  design_current_a: number;
  ampacity_a: number | null;
  drop_percent: number | null;
  limit_percent: number;
  /** Why the chosen size was needed, or what blocked every size. */
  reason: string;
  attempt: Array<{
    cross_section_mm2: number;
    ampacity_a: number;
    drop_percent: number;
    passes_ampacity: boolean;
    passes_drop: boolean;
  }>;
}

/**
 * Smallest standard copper conductor that satisfies both the tabulated
 * ampacity and the 3%/5% voltage-drop limit for the supplied run.
 *
 * Both checks are applied to every candidate size and reported, so a user can
 * see which one forced the answer instead of taking a number on trust. When no
 * tabulated size passes, the result says so rather than rounding up silently:
 * a long run at high load needs a design, not a bigger guess.
 */
export function minimumCableSize(
  request: CableSizingRequest,
): CableSizingVerdict {
  const limit =
    request.lighting_dominant === true
      ? VOLTAGE_DROP_LIMITS.lighting
      : VOLTAGE_DROP_LIMITS.power;
  const system: SupplySystem = request.system === "three" ? "three" : "single";
  const pf = normPowerFactor(request.power_factor);

  const stated = request.design_current_a;
  const design =
    stated !== undefined && Number.isFinite(stated) && stated > 0
      ? stated
      : request.voltage > 0
        ? system === "three"
          ? request.load_watts / (Math.sqrt(3) * request.voltage * pf)
          : request.load_watts / (request.voltage * pf)
        : 0;

  const attempt = COPPER_AMPACITY_A.map(([csa, ampacity]) => {
    const drop = voltageDropPercent({
      run_m: request.run_m,
      load_watts: request.load_watts,
      voltage: request.voltage,
      cross_section_mm2: csa,
      lighting_dominant: request.lighting_dominant,
      system,
      power_factor: pf,
    });
    return {
      cross_section_mm2: csa,
      ampacity_a: ampacity,
      drop_percent: drop.drop_percent,
      passes_ampacity: design > 0 && ampacity >= design,
      passes_drop: drop.passes,
    };
  });

  if (!(design > 0) || !(request.run_m > 0) || !(request.voltage > 0)) {
    return {
      feasible: false,
      cross_section_mm2: null,
      design_current_a: Math.round(design * 100) / 100,
      ampacity_a: null,
      drop_percent: null,
      limit_percent: limit,
      reason:
        "Cable size not determined: load, run length and system voltage must all be provided.",
      attempt,
    };
  }

  const chosen = attempt.find((a) => a.passes_ampacity && a.passes_drop);
  if (!chosen) {
    const largest = attempt[attempt.length - 1];
    return {
      feasible: false,
      cross_section_mm2: null,
      design_current_a: Math.round(design * 100) / 100,
      ampacity_a: largest.ampacity_a,
      drop_percent: largest.drop_percent,
      limit_percent: limit,
      reason: `No tabulated size up to ${largest.cross_section_mm2} mm² satisfies both ampacity and the ${limit}% drop limit for ${Math.round(design * 100) / 100} A over ${request.run_m} m. Move the distribution point closer, split the load, or have the run designed.`,
      attempt,
    };
  }

  const forced = chosen.passes_ampacity
    ? `voltage drop over ${request.run_m} m`
    : "current-carrying capacity";
  return {
    feasible: true,
    cross_section_mm2: chosen.cross_section_mm2,
    design_current_a: Math.round(design * 100) / 100,
    ampacity_a: chosen.ampacity_a,
    drop_percent: chosen.drop_percent,
    limit_percent: limit,
    reason: `${chosen.cross_section_mm2} mm² carries ${chosen.ampacity_a} A (design ${Math.round(design * 100) / 100} A) and drops ${chosen.drop_percent}% against a ${limit}% limit; ${forced} set the size.`,
    attempt,
  };
}

/** Standard miniature circuit breaker ratings, amperes. */
export const STANDARD_MCB_RATINGS_A: ReadonlyArray<number> = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100,
];

export interface BreakerRequest {
  design_current_a: number;
  /** Tabulated capacity of the cable the breaker protects, if known. */
  cable_ampacity_a?: number | null;
  ratings?: ReadonlyArray<number>;
}

export interface BreakerVerdict {
  rating_a: number | null;
  design_current_a: number;
  cable_ampacity_a: number | null;
  complies: boolean;
  reason: string;
}

/**
 * Protective device rating for a circuit, against the rule that the device
 * rating sits at or above the design current and at or below the cable's
 * capacity (Ib <= In <= Iz).
 *
 * Without the second half of that rule people pick the breaker that stops the
 * tripping, which is exactly how a cable ends up protected only by luck.
 */
export function selectBreaker(request: BreakerRequest): BreakerVerdict {
  const ratings = request.ratings ?? STANDARD_MCB_RATINGS_A;
  const ib = Number(request.design_current_a);
  const iz =
    request.cable_ampacity_a === undefined || request.cable_ampacity_a === null
      ? null
      : Number(request.cable_ampacity_a);

  if (!(ib > 0)) {
    return {
      rating_a: null,
      design_current_a: 0,
      cable_ampacity_a: iz,
      complies: false,
      reason: "Breaker not selected: a design current above zero is required.",
    };
  }

  const candidates = ratings.filter((r) => r >= ib && (iz === null || r <= iz));
  if (candidates.length === 0) {
    const overIz = ratings.some((r) => r >= ib);
    return {
      rating_a: null,
      design_current_a: Math.round(ib * 100) / 100,
      cable_ampacity_a: iz,
      complies: false,
      reason: overIz
        ? `No standard rating up to ${iz} A cable capacity covers a ${Math.round(ib * 100) / 100} A design current: the cable has to be larger before any breaker protects it properly.`
        : `The design current of ${Math.round(ib * 100) / 100} A exceeds every standard rating listed; this circuit needs a different distribution design.`,
    };
  }

  const rating = candidates[0];
  return {
    rating_a: rating,
    design_current_a: Math.round(ib * 100) / 100,
    cable_ampacity_a: iz,
    complies: true,
    reason:
      iz === null
        ? `${rating} A covers the ${Math.round(ib * 100) / 100} A design current. Cable capacity was not supplied, so the upper half of the rule was not checked.`
        : `${rating} A sits above the ${Math.round(ib * 100) / 100} A design current and at or below the ${iz} A cable capacity.`,
  };
}

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
  /**
   * Audit fix F7 (2026-10-26): optional feeder voltage-drop check.
   * When the owner supplies the real feeder load, cable cross-section and
   * system voltage, the engine reports the voltage drop over the measured
   * feeder run against the 5% power limit (3% for lighting-dominant feeders)
   * instead of silently ignoring long runs to outbuildings/gate houses.
   * Null → not checked (never invented).
   */
  feeder_check?: {
    load_watts: number;
    cross_section_mm2: number;
    voltage: number;
    lighting_dominant?: boolean;
  } | null;
  /**
   * Supply arrangement of the installation. A balanced three-phase supply
   * carries the same power at 1/sqrt(3) of the single-phase current, so an
   * incomer sized as a two-wire circuit at 400 V overstated the design current
   * by 73 percent and quoted one breaker size up.
   */
  supply_system?: SupplySystem;
  /** line-to-line voltage for a three-phase supply, line-to-neutral otherwise */
  supply_voltage?: number | null;
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
  total_connected_load_va?: number;
  diversified_demand_va?: number;
  main_incomer_current_a?: number;
  recommended_main_breaker_a?: number;
  recommended_service_cable_mm2?: number;
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

/** Every material slug the electrical engine prices, in book order. */
export const ELECTRICAL_MATERIAL_SLUGS = [
  "elec-cable-lighting",
  "elec-cable-socket",
  "elec-cable-dedicated",
  "elec-cable-earth",
  "elec-cable-feeder",
  "elec-conduit",
  "elec-junction-box",
  "elec-breaker",
  "elec-switch-plate",
  "elec-socket-outlet",
  "elec-distribution-board",
] as const;

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
        `${label} must be a whole number ≥ 0 (received ${v === null || v === undefined ? "nothing" : String(v)}).`,
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

  // ── Connected load & standard diversity (BS 7671 Appendix A / NEC 220) ──
  const supplySystem: SupplySystem =
    input.supply_system === "three" ? "three" : "single";
  const statedVoltage =
    input.supply_voltage && input.supply_voltage > 0
      ? input.supply_voltage
      : input.feeder_check?.voltage && input.feeder_check.voltage > 0
        ? input.feeder_check.voltage
        : supplySystem === "three"
          ? 400
          : 230;
  const systemVoltage = statedVoltage;
  /** balanced three-phase carries the load at sqrt(3) x line voltage */
  const supplyFactor = supplySystem === "three" ? Math.sqrt(3) : 1;
  const connectedLightingVA =
    input.lighting_points * rules.lighting_va_per_point;
  const connectedSocketsVA = input.socket_points * rules.socket_va_per_point;
  const connectedDedicatedVA =
    input.dedicated_points * rules.dedicated_va_per_point;
  const totalConnectedVA =
    connectedLightingVA + connectedSocketsVA + connectedDedicatedVA;

  // Diversity factors: Lighting 66%, Sockets 100% first 1000VA + 40% rest, Dedicated 100% 1st + 50% rest
  const divLighting = connectedLightingVA * 0.66;
  const divSockets =
    connectedSocketsVA > 0
      ? Math.min(connectedSocketsVA, 1000) +
        Math.max(0, connectedSocketsVA - 1000) * 0.4
      : 0;
  const divDedicated =
    connectedDedicatedVA > 0
      ? 2500 + Math.max(0, connectedDedicatedVA - 2500) * 0.5
      : 0;
  const diversifiedDemandVA = divLighting + divSockets + divDedicated;

  const incomerCurrentA =
    systemVoltage > 0
      ? diversifiedDemandVA /
        (supplyFactor * systemVoltage * rules.power_factor)
      : 0;
  const standardBreakers = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  const recBreaker =
    standardBreakers.find((b) => b >= incomerCurrentA) ??
    (incomerCurrentA > 125 ? 160 : 32);

  // Cable tails: 10mm² (up to 63A), 16mm² (up to 85A), 25mm² (up to 112A), 35mm² (up to 138A)
  let recCable = 10;
  if (recBreaker > 112) recCable = 35;
  else if (recBreaker > 85) recCable = 25;
  else if (recBreaker > 63) recCable = 16;

  const circuitSummary: CircuitSummary = {
    lighting_circuits: lightingCircuits,
    socket_circuits: socketCircuits,
    dedicated_circuits: dedicatedCircuits,
    total_circuits: totalCircuits,
    db_ways_guidance: totalCircuits,
    total_connected_load_va: Math.round(totalConnectedVA),
    diversified_demand_va: Math.round(diversifiedDemandVA),
    main_incomer_current_a: Math.round(incomerCurrentA * 10) / 10,
    recommended_main_breaker_a: recBreaker,
    recommended_service_cable_mm2: recCable,
  };
  steps.push({
    label: "Circuits (planning rule, not design)",
    detail: `Lighting: ceil(${input.lighting_points} ÷ ${rules.lighting_points_per_circuit}) = ${lightingCircuits}. Sockets: ceil(${input.socket_points} ÷ ${rules.socket_points_per_circuit}) = ${socketCircuits}. Dedicated: ceil(${input.dedicated_points} ÷ ${rules.dedicated_points_per_circuit}) = ${dedicatedCircuits}. Total ${totalCircuits} circuits.`,
  });
  if (totalConnectedVA > 0) {
    steps.push({
      label: "Connected load & maximum demand (BS 7671 / NEC 220)",
      detail: `Total connected load: ${(totalConnectedVA / 1000).toFixed(1)} kVA. Diversified maximum demand: ${(diversifiedDemandVA / 1000).toFixed(1)} kVA (design current ${incomerCurrentA.toFixed(1)} A at ${systemVoltage} V ${supplySystem === "three" ? "three-phase (per-line)" : "single-phase"}, ${rules.power_factor} pf). Recommended Main Incomer Breaker: ${recBreaker} A with ≥${recCable} mm² copper service tails. Basis: ${rules.lighting_va_per_point} VA per lighting point, ${rules.socket_va_per_point} VA per twin socket point, ${rules.dedicated_va_per_point} VA per appliance point — planning figures configured per market, not guaranteed connected load.`,
    });
  }

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

    // Finding 7: Voltage drop verification on long runs (BS 7671 / NEC)
    if (spec.avgRun && spec.avgRun > 0) {
      const csa =
        spec.key === "cable_lighting"
          ? 1.5
          : spec.key === "cable_socket"
            ? 2.5
            : 4.0;
      const currentA =
        spec.key === "cable_lighting"
          ? 6
          : spec.key === "cable_socket"
            ? 13
            : 20;
      // One resistivity constant and the caller's nominal voltage. This path
      // previously hardcoded 0.0175 and 230 V, so in a 120 V market it
      // overstated voltage drop by roughly 92 percent and raised warnings the
      // installation did not deserve. International engine, international volts.
      const vDrop = (2 * spec.avgRun * currentA * COPPER_RESISTIVITY) / csa;
      // System voltage comes from the caller's feeder check when they stated
      // one; 230 V is the single-phase default only when nothing was supplied.
      // Final circuits are single-phase, so a three-phase supply is checked at
      // its line-to-neutral voltage (400 / sqrt(3) = 231 V), not at 400 V.
      const statedVoltage = input.feeder_check?.voltage;
      const circuitVoltage =
        supplySystem === "three"
          ? systemVoltage / Math.sqrt(3)
          : statedVoltage && statedVoltage > 0
            ? statedVoltage
            : 230;
      const vDropPct = (vDrop / circuitVoltage) * 100;
      const limitPct = spec.key === "cable_lighting" ? 3 : 5;
      if (vDropPct > limitPct) {
        warnings.push(
          `Voltage drop check: ${spec.label} (${spec.avgRun}m average run) has an estimated voltage drop of ${vDropPct.toFixed(1)}% (exceeds ${limitPct}% standard limit). Consider upsizing cable.`,
        );
      }
    }

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
        detail: `${input.lighting_points} lighting × ${rules.conduit_m_per_lighting_point ?? 0} m + ${input.socket_points} sockets × ${rules.conduit_m_per_socket_point ?? 0} m = ${roundTo(base, 2)} m; waste ${rules.conduit_waste_pct}% → ${qty} m. This is the planning allowance, not a site measurement.`,
      });
      lines.push({
        key: "conduit",
        label: "PVC conduit (planning allowance)",
        material_slug: "elec-conduit",
        quantity: qty,
        quantity_source: "rule_derived",
        unit: "m",
        detail: `Planning allowance from configured rules (${roundTo(base, 2)} m base + waste)`,
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
  if (input.building_type?.trim()) {
    steps.push({ label: "Building type", detail: input.building_type.trim() });
  }
  if (input.feeder_check && input.avg_run_feeder_m !== null) {
    const verdict = voltageDropPercent({
      run_m: input.avg_run_feeder_m,
      load_watts: input.feeder_check.load_watts,
      voltage: input.feeder_check.voltage,
      cross_section_mm2: input.feeder_check.cross_section_mm2,
      lighting_dominant: input.feeder_check.lighting_dominant,
    });
    steps.push({
      label: "Feeder voltage-drop check",
      detail: verdict.detail,
    });
    if (!verdict.passes) {
      warnings.push(
        `FEEDER VOLTAGE DROP ${verdict.drop_percent}% exceeds the ${verdict.limit_percent}% limit over the ${input.avg_run_feeder_m} m run. Increase the cable cross-section (currently ${input.feeder_check.cross_section_mm2} mm2) or shorten the run; undersized long runs cause equipment failure and motor stalling.`,
      );
    }
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
