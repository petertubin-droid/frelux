// =========================================================
// FRELUX Structural Engineering Calculator
// Engine, Phase 32
//
// Calculates structural member sizing for Nigerian construction:
// - Beam depth/width based on span and load
// - Column cross-section based on axial load
// - Slab thickness based on span and support conditions
// - Shear and moment capacity checks
//
// Based on BS 8110 / Eurocode 2 simplified methods, adapted
// for Nigerian construction practice (concrete grade 20-30 MPa,
// reinforcement yield 410-500 MPa).
//
// DISCLAIMER: These are preliminary sizing tools. A qualified
// structural engineer must verify and approve all designs.
// =========================================================

// ── Types ──

export type ConcreteGrade =
  | "C20"
  | "C25"
  | "C30"
  | "C35"
  | "C20/25"
  | "C25/30"
  | "C30/37"
  | "C35/45"
  | "2500_psi"
  | "3000_psi"
  | "4000_psi"
  | "5000_psi"
  | "M20"
  | "M25"
  | "M30"
  | "M35"
  | (string & {});

export type ConcreteStandardCode = "eurocode_bs" | "aci_astm" | "is_456";

export interface ConcreteGradePreset {
  id: string;
  label: string;
  standard: ConcreteStandardCode;
  fck: number; // characteristic cylinder strength (or characteristic cube strength for IS/BS) in MPa
  fcu: number; // equivalent 150mm cube strength in MPa (used in BS 8110 equations)
  Ec: number; // modulus of elasticity in GPa
  nominalMix?: string; // e.g. "1:1.5:3" for IS 456 M20
  psi?: number; // for ACI e.g. 3000
  description: string;
}

export interface ConcreteStandardProfile {
  code: ConcreteStandardCode;
  name: string;
  governingCodes: string[];
  description: string;
  defaultGrade: string;
  grades: ConcreteGradePreset[];
}
export type SteelGrade = "Fe410" | "Fe500";
export type SupportCondition =
  "simply_supported" | "fixed" | "continuous" | "cantilever";
export type BeamType =
  "ground_beam" | "suspended_beam" | "ring_beam" | "lintel";
export type SlabType = "one_way" | "two_way" | "cantilever_slab";

import { resolveMemberSizing, type MemberSizingProfile } from "./member-sizing";

export interface BeamDesignInput {
  span: number; // meters (clear span)
  beam_type: BeamType;
  support_condition: SupportCondition;
  live_load: number; // kN/m² (imposed load)
  dead_load: number; // kN/m² (self-weight + finishes)
  tributary_width: number; // meters (load width perpendicular to beam)
  concrete_grade: ConcreteGrade;
  steel_grade: SteelGrade;
  cover_mm: number; // concrete cover
  existing_width?: number; // optional: if width is predetermined
  existing_depth?: number; // optional: if depth is predetermined
  /**
   * Distance from the support to the nearest concentrated load, mm. Supplying it
   * enables the Cl 3.4.5.8 shear enhancement for loads close to a support. A
   * uniformly distributed load gets no enhancement, so omitting it is correct
   * rather than a gap.
   */
  load_av_mm?: number;
  market_code?: string; // market-scoped member sizing defaults (NG default)
  /** Jurisdictional code mode: one governing design code, nothing blended. */
  jurisdiction_code?: JurisdictionCode;
}

export interface BeamDesignResult {
  span: number;
  effective_span: number;
  design_load: number; // kN/m (factored UDL)
  factored_load: number; // kN/m (with load factor 1.4 dead + 1.6 live)
  max_moment: number; // kN·m
  max_shear: number; // kN
  required_depth: number; // mm
  required_width: number; // mm
  recommended_depth: number; // mm
  recommended_width: number; // mm
  area_steel_required: number; // mm² (tension reinforcement)
  min_steel_area: number; // mm²
  compression_steel_area?: number; // mm², A′s for a doubly reinforced section
  /** False when d′/x > 0.43, so the compression steel does not reach 0.87 f_y. */
  compression_steel_yields?: boolean;
  max_steel_area: number; // mm²
  recommended_bar_diameter: number; // mm
  recommended_bar_count: number;
  link_diameter: number; // mm
  link_spacing: number; // mm
  shear_capacity: number; // kN
  shear_check_pass: boolean;
  /** True when links, not the concrete, carry part of the shear. */
  shear_links_required?: boolean;
  deflection_check_pass: boolean;
  span_to_depth_ratio: number;
  /** Jurisdictional code mode only: the governing code actually used. */
  jurisdiction_code?: JurisdictionCode;
  /** Jurisdictional code mode only: min steel ratio the code required, %. */
  min_steel_ratio_percent?: number;
  warnings: string[];
  formula_transparency: string[];
}

export interface ColumnDesignInput {
  axial_load: number; // kN (service load)
  height: number; // meters (floor-to-floor)
  concrete_grade: ConcreteGrade;
  steel_grade: SteelGrade;
  cover_mm: number;
  existing_width?: number; // mm (if rectangular)
  existing_depth?: number; // mm (if rectangular)
  is_rectangular: boolean;
  /** Legacy field: height / thickness. Not used for slenderness (the engine
   *  derives it from the section it sizes) and cross-checked against it. */
  unbraced_height_ratio: number;
  /**
   * Effective-length factor applied to the height for slenderness, BS 8110-1
   * Table 3.19 style: 0.75 braced and restrained, 1.0 braced, 1.5-2.2 unbraced
   * or cantilever. Defaults to 1.0, which is the braced assumption the engine
   * already made.
   */
  effective_length_factor?: number;
  market_code?: string; // market-scoped member sizing defaults (NG default)
}

export interface ColumnDesignResult {
  axial_load: number; // kN (service)
  factored_load: number; // kN (1.4 × service)
  required_area: number; // mm² (gross concrete area)
  recommended_width: number; // mm
  recommended_depth: number; // mm
  recommended_bar_diameter: number; // mm
  recommended_bar_count: number;
  link_diameter: number; // mm
  link_spacing: number; // mm
  steel_ratio: number; // percentage
  min_steel_ratio: number; // %
  max_steel_ratio: number; // %
  slenderness_check: boolean;
  short_or_slender: "short" | "slender";
  load_capacity: number; // kN
  /** Design moment the section was checked against, kN·m. */
  design_moment_knm: number;
  /** Moment the section can carry at that axial load, kN·m. */
  moment_capacity_knm: number;
  /** Axial squash check on its own. */
  axial_check_pass: boolean;
  /** Moment-axial interaction (BS 8110-1 Cl 3.4.4.4 stress block). */
  moment_check_pass: boolean;
  /**
   * True only when the axial AND moment checks both pass. Retained so existing
   * callers keep reading one verdict, but it can no longer be true on axial
   * capacity alone.
   */
  capacity_check_pass: boolean;
  /** What the result is, so a preliminary sizing is not read as a design. */
  assessment: "PRELIMINARY" | "INSUFFICIENT_INPUT";
  warnings: string[];
  formula_transparency: string[];
}

export interface SlabDesignInput {
  span_x: number; // meters (short span)
  span_y: number; // meters (long span, for two-way)
  slab_type: SlabType;
  support_condition: SupportCondition;
  live_load: number; // kN/m²
  dead_load: number; // kN/m² (finishes + finishes)
  concrete_grade: ConcreteGrade;
  steel_grade: SteelGrade;
  cover_mm: number;
  existing_thickness?: number; // mm
  market_code?: string; // market-scoped engineering defaults
  /**
   * Column reaction on this panel, kN. Supplying it enables the punching shear
   * check at the column (BS 8110-1 Cl 3.7.7). Without it the check is reported
   * as NOT CHECKED, never as passed.
   */
  column_load_kN?: number;
  /** Column plan size in the x direction, mm. Default 300. */
  column_width_mm?: number;
  /** Column plan size in the y direction, mm. Defaults to column_width_mm. */
  column_depth_mm?: number;
  /** Jurisdictional code mode: one governing design code, nothing blended. */
  jurisdiction_code?: JurisdictionCode;
}

/** Punching shear at a column, BS 8110-1 Cl 3.7.7. */
export interface PunchShearResult {
  status: "PASS" | "FAIL" | "NOT CHECKED";
  column_load_kN?: number;
  /** Perimeter at the column face, mm. */
  face_perimeter_mm?: number;
  /** Perimeter at 1.5d from the column face, mm. */
  critical_perimeter_mm?: number;
  /** Shear stress at the critical perimeter, N/mm². */
  v_ed?: number;
  /** Concrete shear resistance at the critical perimeter, N/mm². */
  v_c?: number;
  /** Shear stress at the column face, N/mm². */
  v_face?: number;
  /** Cl 3.7.7.4 limit at the column face, N/mm² (0.8√f_cu, capped at 5). */
  v_max?: number;
  missing_input?: string;
  notes: string[];
}

export interface SlabDesignResult {
  span_x: number;
  span_y: number;
  slab_type: SlabType;
  required_thickness: number; // mm
  recommended_thickness: number; // mm
  self_weight: number; // kN/m²
  total_load: number; // kN/m² (factored)
  max_moment: number; // kN·m/m
  max_shear: number; // kN/m
  steel_area_required: number; // mm²/m
  /** Short-span moment actually designed for, kN·m/m. */
  moment_short_span?: number;
  /** Long-span moment for two-way panels, kN·m/m. */
  moment_long_span?: number;
  /** Steel required in the long direction of a two-way panel, mm²/m. */
  steel_area_secondary?: number;
  /** Hogging moment designed for at a continuous or fixed support, kN·m/m. */
  support_moment?: number;
  /** Top (hogging) steel over the support, mm²/m. */
  support_steel_area?: number;
  recommended_bar_diameter: number; // mm
  recommended_bar_spacing: number; // mm
  /** Long-direction bar spacing for two-way panels, mm. */
  recommended_bar_spacing_secondary?: number;
  link_check: string;
  punch_shear?: PunchShearResult;
  span_to_depth_ratio: number;
  deflection_check_pass: boolean;
  jurisdiction_code?: JurisdictionCode;
  min_steel_ratio_percent?: number;
  warnings: string[];
  formula_transparency: string[];
}

// ── Material properties & Regional Standards ──

export const CONCRETE_STANDARDS: Record<
  ConcreteStandardCode,
  ConcreteStandardProfile
> = {
  eurocode_bs: {
    code: "eurocode_bs",
    name: "Eurocode 2 / BS EN 1992-1-1 / BS 8110",
    governingCodes: ["BS EN 1992-1-1", "BS 8110", "Eurocode 2"],
    description:
      "Cylinder/cube designation (fck/fcu in MPa), standard in Europe, UK, Nigeria, Ghana, Kenya, South Africa, Australia",
    defaultGrade: "C25/30",
    grades: [
      {
        id: "C20/25",
        label: "C20/25 (fck=20 / fcu=25 MPa)",
        standard: "eurocode_bs",
        fck: 20,
        fcu: 25,
        Ec: 25,
        description:
          "Eurocode 2 C20/25 (20 MPa cylinder / 25 MPa cube characteristic strength)",
      },
      {
        id: "C25/30",
        label: "C25/30 (fck=25 / fcu=30 MPa)",
        standard: "eurocode_bs",
        fck: 25,
        fcu: 30,
        Ec: 28,
        description:
          "Eurocode 2 C25/30 (25 MPa cylinder / 30 MPa cube characteristic strength)",
      },
      {
        id: "C30/37",
        label: "C30/37 (fck=30 / fcu=37 MPa)",
        standard: "eurocode_bs",
        fck: 30,
        fcu: 37,
        Ec: 30,
        description:
          "Eurocode 2 C30/37 (30 MPa cylinder / 37 MPa cube characteristic strength)",
      },
      {
        id: "C35/45",
        label: "C35/45 (fck=35 / fcu=45 MPa)",
        standard: "eurocode_bs",
        fck: 35,
        fcu: 45,
        Ec: 32,
        description:
          "Eurocode 2 C35/45 (35 MPa cylinder / 45 MPa cube characteristic strength)",
      },
    ],
  },
  aci_astm: {
    code: "aci_astm",
    name: "ACI 318 / ASTM",
    governingCodes: ["ACI 318-19", "ASTM C39", "ASTM C94"],
    description:
      "Standard 28-day cylinder compressive strength (psi / MPa), standard in US, Canada, Latin America, Saudi Arabia, UAE commercial",
    defaultGrade: "3000_psi",
    grades: [
      {
        id: "2500_psi",
        label: "2,500 psi (17.2 MPa / f'c)",
        standard: "aci_astm",
        psi: 2500,
        fck: 17.2,
        fcu: 21.5,
        Ec: 19.5,
        description:
          "ACI 318 2,500 psi (17.2 MPa cylinder / approx 21.5 MPa cube equivalent)",
      },
      {
        id: "3000_psi",
        label: "3,000 psi (20.7 MPa / f'c)",
        standard: "aci_astm",
        psi: 3000,
        fck: 20.7,
        fcu: 25.9,
        Ec: 21.4,
        description:
          "ACI 318 3,000 psi (20.7 MPa cylinder / approx 25.9 MPa cube equivalent)",
      },
      {
        id: "4000_psi",
        label: "4,000 psi (27.6 MPa / f'c)",
        standard: "aci_astm",
        psi: 4000,
        fck: 27.6,
        fcu: 34.5,
        Ec: 24.7,
        description:
          "ACI 318 4,000 psi (27.6 MPa cylinder / approx 34.5 MPa cube equivalent)",
      },
      {
        id: "5000_psi",
        label: "5,000 psi (34.5 MPa / f'c)",
        standard: "aci_astm",
        psi: 5000,
        fck: 34.5,
        fcu: 43.1,
        Ec: 27.6,
        description:
          "ACI 318 5,000 psi (34.5 MPa cylinder / approx 43.1 MPa cube equivalent)",
      },
    ],
  },
  is_456: {
    code: "is_456",
    name: "IS 456:2000",
    governingCodes: ["IS 456:2000", "SP 16", "IS 10262:2019"],
    description:
      "150mm cube characteristic compressive strength at 28 days (M20-M35 in MPa), standard in India and South Asia",
    defaultGrade: "M25",
    grades: [
      {
        id: "M20",
        label: "M20 (20 MPa, 1:1.5:3 nominal)",
        standard: "is_456",
        nominalMix: "1:1.5:3",
        fck: 20,
        fcu: 20,
        Ec: 22.4,
        description:
          "IS 456 M20 nominal mix (1:1.5:3 cement:sand:aggregate, 20 MPa 28-day cube strength)",
      },
      {
        id: "M25",
        label: "M25 (25 MPa, 1:1:2 nominal)",
        standard: "is_456",
        nominalMix: "1:1:2",
        fck: 25,
        fcu: 25,
        Ec: 25.0,
        description:
          "IS 456 M25 nominal mix (1:1:2 cement:sand:aggregate, 25 MPa 28-day cube strength)",
      },
      {
        id: "M30",
        label: "M30 (30 MPa, design mix)",
        standard: "is_456",
        nominalMix: "Design mix",
        fck: 30,
        fcu: 30,
        Ec: 27.4,
        description:
          "IS 456 M30 standard design mix (30 MPa 28-day cube strength)",
      },
      {
        id: "M35",
        label: "M35 (35 MPa, design mix)",
        standard: "is_456",
        nominalMix: "Design mix",
        fck: 35,
        fcu: 35,
        Ec: 29.6,
        description:
          "IS 456 M35 standard design mix (35 MPa 28-day cube strength)",
      },
    ],
  },
};

const LEGACY_BS_GRADES: Record<string, ConcreteGradePreset> = {
  C20: {
    id: "C20",
    label: "C20 (20 MPa)",
    standard: "eurocode_bs",
    fck: 16,
    fcu: 20,
    Ec: 25,
    description: "BS 8110 C20 (fcu = 20 MPa cube strength)",
  },
  C25: {
    id: "C25",
    label: "C25 (25 MPa)",
    standard: "eurocode_bs",
    fck: 20,
    fcu: 25,
    Ec: 28,
    description: "BS 8110 C25 (fcu = 25 MPa cube strength)",
  },
  C30: {
    id: "C30",
    label: "C30 (30 MPa)",
    standard: "eurocode_bs",
    fck: 25,
    fcu: 30,
    Ec: 30,
    description: "BS 8110 C30 (fcu = 30 MPa cube strength)",
  },
  C35: {
    id: "C35",
    label: "C35 (35 MPa)",
    standard: "eurocode_bs",
    fck: 28,
    fcu: 35,
    Ec: 32,
    description: "BS 8110 C35 (fcu = 35 MPa cube strength)",
  },
};

// Audit fix (F6, 2026-11-08): E_c was three hand-entered literals (28/30/32 GPa)
// that matched neither standard they were attributed to — EC2 gives
// 31.6/32.8/34.0 and BS 8110 gives 26.0/27.4/29.0 for the same grades. It is
// derived from the grade and its governing standard so it cannot drift again.
function concreteModulusGPa(grade: ConcreteGradePreset): number {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  switch (grade.standard) {
    case "eurocode_bs":
      // BS EN 1992-1-1 Table 3.1: E_cm = 22 × ((f_ck + 8)/10)^0.3 GPa
      return round1(22 * Math.pow((grade.fck + 8) / 10, 0.3));
    case "aci_astm":
      // ACI 318-19 19.2.2.1: E_c = 4,700 × √f′c MPa
      return round1(4.7 * Math.sqrt(grade.fck));
    case "is_456":
      // IS 456 Cl 6.2.3.1: E_c = 5,000 × √f_ck MPa
      return round1(5 * Math.sqrt(grade.fck));
    default:
      // BS 8110-1 Cl 2.4.2.3: E_c = 20 + 0.2 f_cu kN/mm²
      return round1(20 + 0.2 * grade.fcu);
  }
}
for (const profile of Object.values(CONCRETE_STANDARDS)) {
  for (const grade of profile.grades) grade.Ec = concreteModulusGPa(grade);
}

export function getConcreteStandardForMarket(
  marketCode: string = "NG",
): ConcreteStandardProfile {
  const code = (marketCode || "NG").trim().toUpperCase();
  if (code === "IN") return CONCRETE_STANDARDS.is_456;
  if (["US", "CA", "MX", "BR", "SA", "AE"].includes(code))
    return CONCRETE_STANDARDS.aci_astm;
  return CONCRETE_STANDARDS.eurocode_bs;
}

export function resolveConcreteGrade(
  grade?: string,
  marketCode?: string,
): ConcreteGradePreset {
  const standard = getConcreteStandardForMarket(marketCode);
  if (!grade) {
    const def = standard.grades.find((g) => g.id === standard.defaultGrade);
    return def ?? standard.grades[0];
  }
  const normalized = grade.trim();
  if (LEGACY_BS_GRADES[normalized]) return LEGACY_BS_GRADES[normalized];

  const activeMatch = standard.grades.find(
    (g) => g.id.toLowerCase() === normalized.toLowerCase(),
  );
  if (activeMatch) return activeMatch;

  for (const std of Object.values(CONCRETE_STANDARDS)) {
    const match = std.grades.find(
      (g) => g.id.toLowerCase() === normalized.toLowerCase(),
    );
    if (match) return match;
  }

  const cleanId = normalized.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  for (const std of Object.values(CONCRETE_STANDARDS)) {
    const match = std.grades.find(
      (g) => g.id.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() === cleanId,
    );
    if (match) return match;
  }

  const fallback = standard.grades.find((g) => g.id === standard.defaultGrade);
  return fallback ?? standard.grades[0];
}

export function getConcreteGradeOptions(
  marketCode: string = "NG",
): Array<{ v: string; l: string }> {
  const standard = getConcreteStandardForMarket(marketCode);
  const options: Array<{ v: string; l: string }> = [];
  for (const g of standard.grades) {
    options.push({ v: g.id, l: g.label });
  }
  for (const [code, std] of Object.entries(CONCRETE_STANDARDS)) {
    if (code !== standard.code) {
      for (const g of std.grades) {
        options.push({ v: g.id, l: `${g.label} [${std.name}]` });
      }
    }
  }
  return options;
}

const CONCRETE_PROPS: Record<string, { fcu: number; Ec: number }> = {
  C20: { fcu: 20, Ec: 25 },
  C25: { fcu: 25, Ec: 28 },
  C30: { fcu: 30, Ec: 30 },
  C35: { fcu: 35, Ec: 32 },
  "C20/25": { fcu: 25, Ec: 25 },
  "C25/30": { fcu: 30, Ec: 28 },
  "C30/37": { fcu: 37, Ec: 30 },
  "C35/45": { fcu: 45, Ec: 32 },
  "2500_psi": { fcu: 21.5, Ec: 19.5 },
  "3000_psi": { fcu: 25.9, Ec: 21.4 },
  "4000_psi": { fcu: 34.5, Ec: 24.7 },
  "5000_psi": { fcu: 43.1, Ec: 27.6 },
  "2500psi": { fcu: 21.5, Ec: 19.5 },
  "3000psi": { fcu: 25.9, Ec: 21.4 },
  "4000psi": { fcu: 34.5, Ec: 24.7 },
  "5000psi": { fcu: 43.1, Ec: 27.6 },
  M20: { fcu: 20, Ec: 22.4 },
  M25: { fcu: 25, Ec: 25.0 },
  M30: { fcu: 30, Ec: 27.4 },
  M35: { fcu: 35, Ec: 29.6 },
};

export const STEEL_PROPS: Record<SteelGrade, { fy: number }> = {
  Fe410: { fy: 410 },
  Fe500: { fy: 500 },
};

// Standard bar diameters (mm)
const BAR_DIAMETERS = [10, 12, 16, 20, 25, 32];

function barArea(diameter: number): number {
  return (Math.PI * diameter * diameter) / 4;
}

function roundUpTo50(n: number): number {
  return Math.ceil(n / 50) * 50;
}

function roundUpTo25(n: number): number {
  return Math.ceil(n / 25) * 25;
}

// ── Beam design ──

// ── Standard-aware load factors (audit fix F1, 2026-10-26) ──
// BS 8110: 1.4Gk + 1.6Qk · ACI 318-19 LRFD: 1.2D + 1.6L · IS 456:2000: 1.5(D+L)
export interface LoadFactors {
  dead: number;
  live: number;
  label: string;
}
export function loadFactors(standard: ConcreteStandardCode): LoadFactors {
  switch (standard) {
    case "aci_astm":
      return { dead: 1.2, live: 1.6, label: "ACI 318-19 LRFD: 1.2D + 1.6L" };
    case "is_456":
      return { dead: 1.5, live: 1.5, label: "IS 456:2000: 1.5(D + L)" };
    default:
      return { dead: 1.4, live: 1.6, label: "BS 8110: 1.4Gk + 1.6Qk" };
  }
}

/** Exact BS 8110 lever arm (audit fix F2): z = d(0.5 + √(0.25 − K/0.9)) ≤ 0.95d. */
function leverArmBS(
  moment_kNm: number,
  fcu: number,
  b: number,
  d: number,
): { z: number; K: number; doubly_reinforced: boolean } {
  const K = (moment_kNm * 1e6) / (fcu * b * d * d);
  const doubly = K > 0.156;
  const radicand = 0.25 - K / 0.9;
  const z =
    radicand >= 0
      ? Math.min(d * (0.5 + Math.sqrt(radicand)), 0.95 * d)
      : 0.95 * d;
  return { z, K, doubly_reinforced: doubly };
}

/**
 * Basic span / effective depth ratios, BS 8110-1 Table 3.9 for rectangular
 * sections spanning up to 10 m: cantilever 7, simply supported 20, continuous
 * 26. Two-way panels are not a separate row in that table; they use the same
 * ratios against the short span, and the modification factor for tension
 * reinforcement (Cl 3.4.6.5) is what relaxes them.
 *
 * The beam and slab paths each carried their own copy of these numbers and they
 * had drifted: the slab used 32 for a continuous panel and 26 for any two-way
 * panel regardless of how it was supported, neither of which is in Table 3.9.
 */
export function basicSpanDepthRatio(
  supportCondition: SupportCondition,
): number {
  switch (supportCondition) {
    case "cantilever":
      return 7;
    case "continuous":
    case "fixed":
      return 26;
    case "simply_supported":
    default:
      return 20;
  }
}

/** ACI 319-19 tension-controlled design: Whitney stress block, φ = 0.90. */
function designSteelACI(
  moment_kNm: number,
  fc_psi_grade_fck: number,
  fy: number,
  b: number,
  d: number,
): { As: number; a: number; phi: number } {
  const phi = 0.9;
  const Mu = moment_kNm * 1e6; // N·mm
  // First pass: lever arm ≈ 0.9d
  let As = Mu / (phi * fy * 0.9 * d);
  for (let i = 0; i < 4; i++) {
    const a = (As * fy) / (0.85 * fc_psi_grade_fck * b);
    const z = Math.max(d - a / 2, 0.1 * d);
    const AsNext = Mu / (phi * fy * z);
    if (Math.abs(AsNext - As) < 1) {
      As = AsNext;
      break;
    }
    As = AsNext;
  }
  const a = (As * fy) / (0.85 * fc_psi_grade_fck * b);
  return { As, a, phi };
}

/** ACI 318-19 9.6.1.2 minimum flexural reinforcement (SI): max(0.25√f'c/fy, 1.4/fy)·b·d */
function minSteelACI(fck: number, fy: number, b: number, d: number): number {
  return Math.max((0.25 * Math.sqrt(fck)) / fy, 1.4 / fy) * b * d;
}

/**
 * One pass of the beam design at a stated effective span.
 *
 * Effective span is clear span + d (BS 8110-1 cl. 3.4.1.1), and d is not known
 * until the section is sized, so a single pass has to guess. `designBeam` runs
 * this twice: once from the preliminary depth, once at the span implied by the
 * section it ended up recommending.
 */
function designBeamAtSpan(
  input: BeamDesignInput,

  effectiveSpanOverride?: number,
): BeamDesignResult {
  const warnings: string[] = [];
  const formulas: string[] = [];

  const concretePreset = resolveConcreteGrade(
    input.concrete_grade,
    input.market_code,
  );
  const fcu = concretePreset.fcu;
  const fy = STEEL_PROPS[input.steel_grade].fy;

  formulas.push(
    `Concrete standard: ${CONCRETE_STANDARDS[concretePreset.standard].name} (${concretePreset.label}) — f_cu = ${concretePreset.fcu} MPa, E_c = ${concretePreset.Ec} GPa`,
  );

  // Effective span (BS 8110 cl. 3.4.1.1: clear span + effective depth, or the
  // centre-to-centre distance if that is smaller). The depth is not known until
  // the section is sized, so take the supplied depth when there is one and
  // otherwise a span/12 preliminary estimate. The old fixed +0.1 m ignored the
  // member's depth and understated moments by roughly 10% on a 6 m beam.
  const preliminary_depth_mm = input.existing_depth ?? input.span * 83.33;
  const preliminary_d_mm = Math.max(150, preliminary_depth_mm - input.cover_mm);
  const effective_span =
    effectiveSpanOverride ?? input.span + preliminary_d_mm / 1000;
  if (effectiveSpanOverride !== undefined) {
    formulas.push(
      `Effective span = clear span + d = ${input.span} + ${(effective_span - input.span).toFixed(3)} = ${effective_span.toFixed(3)} m (BS 8110-1 cl. 3.4.1.1, with d taken from the section finally recommended)`,
    );
  } else {
    formulas.push(
      `Effective span = clear span + d = ${input.span} + ${(preliminary_d_mm / 1000).toFixed(3)} = ${effective_span.toFixed(3)} m (BS 8110 cl. 3.4.1.1; d from ${input.existing_depth ? "the supplied depth" : "a span/12 preliminary depth"})`,
    );
  }

  // Loads
  const total_dead = input.dead_load * input.tributary_width;
  const total_live = input.live_load * input.tributary_width;
  const service_load = total_dead + total_live;
  // Audit fix F1: load factors follow the governing standard of the
  // selected concrete grade's jurisdiction, not BS 8110 blindly.
  const lf = loadFactors(
    input.jurisdiction_code
      ? jurisdictionStandard(input.jurisdiction_code)
      : concretePreset.standard,
  );
  const factored_load = lf.dead * total_dead + lf.live * total_live;
  formulas.push(
    `Factored load (${lf.label}) = ${lf.dead} × ${total_dead.toFixed(2)} + ${lf.live} × ${total_live.toFixed(2)} = ${factored_load.toFixed(2)} kN/m`,
  );

  // Moments and shears based on support condition
  let momentCoeff = 1 / 8; // simply supported
  let shearCoeff = 0.5;
  switch (input.support_condition) {
    case "simply_supported":
      momentCoeff = 1 / 8;
      shearCoeff = 0.5;
      break;
    case "fixed":
      momentCoeff = 1 / 12; // sagging
      shearCoeff = 0.5;
      break;
    case "continuous":
      momentCoeff = 1 / 10; // approximate for span
      shearCoeff = 0.6;
      break;
    case "cantilever":
      momentCoeff = 1 / 2;
      shearCoeff = 1.0;
      break;
  }

  const max_moment =
    momentCoeff * factored_load * effective_span * effective_span;
  const max_shear = shearCoeff * factored_load * effective_span;
  formulas.push(
    `Max moment = ${momentCoeff.toFixed(4)} × ${factored_load.toFixed(2)} × ${effective_span.toFixed(2)}² = ${max_moment.toFixed(2)} kN·m`,
  );
  formulas.push(
    `Max shear = ${shearCoeff} × ${factored_load.toFixed(2)} × ${effective_span.toFixed(2)} = ${max_shear.toFixed(2)} kN`,
  );

  // Required effective depth (singly reinforced, approximate)
  // d = sqrt(M / (0.87 × fcu × b × 0.167)), simplified
  // Market-scoped width default: matches the market's standard wall unit width
  const ms: MemberSizingProfile = resolveMemberSizing(
    input.market_code ?? "NG",
  );
  // A reinforced concrete beam has to be wide enough for two bars, two links
  // and the cover. Wall-unit widths below that (the GB profile carried 100 mm,
  // BR 90 mm) produced a 1,100 mm deep beam with a failing shear capacity, so
  // the practical floor is applied and the reason is stated.
  const MIN_PRACTICAL_BEAM_WIDTH_MM = 200;
  const marketBeamWidth =
    ms.beamWidthMm !== null && ms.beamWidthMm >= MIN_PRACTICAL_BEAM_WIDTH_MM
      ? ms.beamWidthMm
      : MIN_PRACTICAL_BEAM_WIDTH_MM;
  if (
    !input.existing_width &&
    ms.beamWidthMm !== null &&
    ms.beamWidthMm < MIN_PRACTICAL_BEAM_WIDTH_MM
  ) {
    warnings.push(
      `The ${ms.marketCode} wall width (${ms.beamWidthMm} mm) is a masonry dimension, not a beam width. A ${MIN_PRACTICAL_BEAM_WIDTH_MM} mm beam is assumed so two bars, links and cover fit. Enter your own width to override.`,
    );
  }
  const assumed_width = input.existing_width ?? marketBeamWidth;
  if (!input.existing_width && ms.beamWidthMm === null) {
    warnings.push(ms.beamWidthBasis);
    if (!ms.verified)
      warnings.push(
        `Member sizing defaults for ${ms.marketCode} are not yet verified for this market — treat all outputs as generic guidance and confirm with a local engineer.`,
      );
  }
  let required_depth_eff: number;
  let doubly_reinforced = false;
  let compression_As = 0;
  let compression_steel_yields = true;
  if (concretePreset.standard === "aci_astm") {
    // ACI 318-19 (audit fix F1): Whitney stress block, tension-controlled,
    // practical steel ratio ρ = 0.18·f'c/fy, φ = 0.90.
    const fck = concretePreset.fck ?? fcu;
    const rho = (0.18 * fck) / fy;
    const Rn = rho * fy * (1 - (0.59 * rho * fy) / fck); // N/mm²
    required_depth_eff = Math.sqrt(
      (max_moment * 1e6) / (0.9 * Rn * assumed_width),
    );
    formulas.push(
      `Required effective depth (ACI 318-19, Whitney block, φ=0.90, ρ=${(rho * 100).toFixed(2)}%) = √(${(max_moment * 1e6).toFixed(0)} / (0.9 × ${Rn.toFixed(1)} × ${assumed_width})) = ${required_depth_eff.toFixed(0)} mm`,
    );
  } else {
    // BS 8110 / IS 456: K = M/(fcu·b·d²) ≤ 0.156 for singly reinforced
    required_depth_eff = Math.sqrt(
      (max_moment * 1e6) / (0.156 * fcu * assumed_width),
    );
    formulas.push(
      `Required effective depth = √(${(max_moment * 1e6).toFixed(0)} / (0.156 × ${fcu} × ${assumed_width})) = ${required_depth_eff.toFixed(0)} mm`,
    );
  }
  const required_depth = required_depth_eff + input.cover_mm + 25; // add cover + half bar
  formulas.push(
    `Required overall depth = ${required_depth_eff.toFixed(0)} + ${input.cover_mm} (cover) + 25 (bar/2) = ${required_depth.toFixed(0)} mm`,
  );

  // The depth the steel is designed against. A supplied depth is the section the
  // user is asking about, so steel, minimum steel and shear capacity are taken on
  // its effective depth; otherwise the strength depth is used, which is never
  // deeper than the section eventually recommended, so it errs the safe way.
  const steelDepth = input.existing_depth
    ? Math.max(120, input.existing_depth - input.cover_mm - 25)
    : required_depth_eff;
  if (input.existing_depth) {
    formulas.push(
      `Steel and shear capacity taken on the supplied section's effective depth of ${steelDepth.toFixed(0)} mm, not the ${required_depth_eff.toFixed(0)} mm bending minimum`,
    );
  }

  // Span/depth is checked further down, on the section that is actually
  // recommended. It used to be checked here against required_depth_eff, which is
  // the depth that just satisfies bending at K = 0.156: for a lightly loaded beam
  // that is a very shallow number, so a perfectly sensible beam came out with a
  // failing L/d, and a heavily loaded one passed on a depth nobody was going to
  // build.
  const basicRatio = basicSpanDepthRatio(input.support_condition);
  formulas.push(
    `Basic span/depth ratio (BS 8110-1 Table 3.9) for a ${input.support_condition.replace("_", " ")} member = ${basicRatio}`,
  );

  // Steel area — audit fix F2: the lever arm is no longer hard-coded z = 0.87d.
  let As: number;
  let min_As: number;
  const max_As = (4 * assumed_width * steelDepth) / 100; // 4% max
  if (concretePreset.standard === "aci_astm") {
    const aci = designSteelACI(
      max_moment,
      concretePreset.fck ?? fcu,
      fy,
      assumed_width,
      steelDepth,
    );
    As = aci.As;
    min_As = minSteelACI(
      concretePreset.fck ?? fcu,
      fy,
      assumed_width,
      steelDepth,
    );
    formulas.push(
      `Steel area required (ACI 318-19, Whitney block, φ=0.90) = ${As.toFixed(0)} mm² (stress block a = ${aci.a.toFixed(1)} mm)`,
    );
    formulas.push(`Min steel (ACI 318-19 §9.6.1.2) = ${min_As.toFixed(0)} mm²`);
  } else {
    // Exact BS 8110 3.4.4.4 lever arm: z = d(0.5 + √(0.25 − K/0.9)) ≤ 0.95d
    const la = leverArmBS(max_moment, fcu, assumed_width, steelDepth);
    doubly_reinforced = la.doubly_reinforced;
    As = (max_moment * 1e6) / (0.87 * fy * la.z);
    min_As =
      concretePreset.standard === "is_456"
        ? (0.85 / fy) * assumed_width * steelDepth // IS 456 26.5.1.1
        : (fy <= 300 ? 0.0024 : 0.0013) * assumed_width * steelDepth; // BS 8110 Table 3.25: 0.24% mild, 0.13% high-yield
    formulas.push(
      `Lever arm: K = ${(max_moment * 1e6).toFixed(0)}/(${fcu} × ${assumed_width} × ${steelDepth.toFixed(0)}²) = ${la.K.toFixed(4)}${la.doubly_reinforced ? " > 0.156 → doubly reinforced required" : ""}`,
    );
    formulas.push(
      `z = d(0.5 + √(0.25 − K/0.9)) = ${la.z.toFixed(0)} mm (≤ 0.95d)`,
    );
    formulas.push(
      `Steel area required = ${(max_moment * 1e6).toFixed(0)} / (0.87 × ${fy} × ${la.z.toFixed(0)}) = ${As.toFixed(0)} mm²`,
    );
    formulas.push(
      `Min steel = ${concretePreset.standard === "is_456" ? "0.85/fy × b × d (IS 456 26.5.1.1)" : `${fy <= 300 ? "0.24" : "0.13"}% × b × d (BS 8110-1 Table 3.25, fy = ${fy})`} = ${min_As.toFixed(0)} mm²`,
    );
    if (la.doubly_reinforced) {
      // BS 8110-1 Cl 3.4.4.4: above K' = 0.156 the concrete alone cannot carry
      // the moment. The excess is carried by a compression/tension steel couple:
      //   M_excess = M − K' f_cu b d²
      //   A'_s = M_excess / (0.87 f_y (d − d'))
      //   A_s  = K' f_cu b d² / (0.87 f_y z) + A'_s     (z = 0.775d at K')
      // The previous output only warned that compression steel was "required"
      // and sized the tension steel as though compression steel contributed
      // nothing, which overstated the tension area needed and gave no A'_s at all.
      const kPrime = 0.156;
      const zPrime = 0.775 * steelDepth;
      const momentSingle =
        (kPrime * fcu * assumed_width * steelDepth ** 2) / 1e6; // kN·m
      const momentExcess = max_moment - momentSingle;
      // d' to the compression steel: cover, link, half a bar.
      const dPrime = Math.min(input.cover_mm + 25, 0.5 * steelDepth);
      const leverCompression = Math.max(steelDepth - dPrime, 0.5 * steelDepth);
      const asPrime = (momentExcess * 1e6) / (0.87 * fy * leverCompression);
      const asSingle = (momentSingle * 1e6) / (0.87 * fy * zPrime);
      compression_As = asPrime;
      As = asSingle + asPrime;
      formulas.push(
        `Doubly reinforced (BS 8110-1 Cl 3.4.4.4): the section carries ${momentSingle.toFixed(1)} kN·m at K′ = 0.156, leaving ${momentExcess.toFixed(1)} kN·m for the steel couple`,
      );
      formulas.push(
        `Compression steel A′_s = ${(momentExcess * 1e6).toFixed(0)} / (0.87 × ${fy} × (${steelDepth.toFixed(0)} − ${dPrime.toFixed(0)})) = ${asPrime.toFixed(0)} mm²`,
      );
      formulas.push(
        `Tension steel = ${asSingle.toFixed(0)} mm² for the singly reinforced part + ${asPrime.toFixed(0)} mm² to balance the compression steel = ${As.toFixed(0)} mm²`,
      );
      warnings.push(
        `K = ${la.K.toFixed(4)} > 0.156, so the section is doubly reinforced: ${Math.ceil(asPrime)} mm² of compression steel is required in addition to the tension steel. Check the compression steel is held by links and that d′ (${dPrime.toFixed(0)} mm) is achievable.`,
      );

      // The A′_s formula assumes the compression steel has yielded at 0.87 f_y,
      // which holds only while d′/x is small enough for the strain there to reach
      // yield. Solve the concrete part for x: 0.6 f_cu b x (d − 0.45x) = M_single.
      const a2 = 0.27 * fcu * assumed_width;
      const b2 = -0.6 * fcu * assumed_width * steelDepth;
      const c2 = momentSingle * 1e6;
      const disc = b2 * b2 - 4 * a2 * c2;
      if (disc >= 0) {
        const xDepth = (-b2 - Math.sqrt(disc)) / (2 * a2);
        const dPrimeOverX = dPrime / xDepth;
        formulas.push(
          `Compression-zone depth from the concrete part: x = ${xDepth.toFixed(0)} mm, d′/x = ${dPrimeOverX.toFixed(2)}`,
        );
        // The compression steel reaches its design strength only while
        //   0.0035 (1 − d′/x) ≥ 0.87 f_y / E_s
        // with ε_cu = 0.0035 and E_s = 200 kN/mm² (BS 8110-1 Cl 3.4.4.1 and
        // 3.4.4.4). For f_y = 460 this is the familiar d′/x ≤ 0.43; for f_y = 500
        // it is stricter, at 0.38. Using a single remembered 0.43 for every grade
        // would credit 500 MPa steel with a stress it cannot reach.
        const yieldStrain = (0.87 * fy) / 200000;
        const dPrimeOverXLimit = 1 - yieldStrain / 0.0035;
        formulas.push(
          `Compression steel yields while d′/x ≤ ${dPrimeOverXLimit.toFixed(3)} (ε_cu = 0.0035, ε_yd = 0.87f_y/E_s = ${yieldStrain.toFixed(5)})`,
        );
        if (dPrimeOverX > dPrimeOverXLimit) {
          compression_steel_yields = false;
          warnings.push(
            `d′/x = ${dPrimeOverX.toFixed(2)} exceeds the ${dPrimeOverXLimit.toFixed(2)} at which the compression steel reaches 0.87 f_y, so A′_s of ${Math.ceil(asPrime)} mm² is NOT sufficient: deepen the section or move the compression steel closer to the face.`,
          );
        }
      }
    }
  }
  // Jurisdictional code mode: one code governs, nothing blended.
  let beamJurisdiction: JurisdictionCode | undefined;
  if (input.jurisdiction_code) {
    beamJurisdiction = input.jurisdiction_code;
    const minSteel = minReinforcementArea({
      code: beamJurisdiction,
      fck: concretePreset.fck ?? fcu,
      fy,
      b: assumed_width,
      d: steelDepth,
    });
    min_As = minSteel.areaMm2;
    formulas.push(
      `Min steel (${JURISDICTION_CODES[beamJurisdiction].label}, ${minSteel.clause}) = ${minSteel.formula} × ${assumed_width} × ${steelDepth.toFixed(0)} = ${min_As.toFixed(0)} mm²`,
    );
  }

  // Select bars
  let bestDiameter = 16;
  let bestCount = Math.ceil(As / barArea(16));
  for (const d of BAR_DIAMETERS) {
    const count = Math.ceil(As / barArea(d));
    if (count >= 2 && count <= 6) {
      bestDiameter = d;
      bestCount = count;
      break;
    }
  }

  const provided_As = bestCount * barArea(bestDiameter);
  if (provided_As < min_As) {
    warnings.push(
      `Provided steel (${provided_As.toFixed(0)} mm²) is below minimum (${min_As.toFixed(0)} mm²). Increase bar count.`,
    );
  }

  // Shear check. BS 8110-1 Table 3.8: vc carries gamma_m = 1.25, the steel
  // term is capped at 2 percent, and (400/d)^0.25 is capped at 1.0 above
  // 400 mm. Leaving out the gamma_m divisor overstated capacity by 25 percent,
  // which is the unsafe direction: a beam that needs links reported PASS.
  const vcSteelPct = Math.min(
    (100 * provided_As) / (assumed_width * steelDepth),
    2,
  );
  const vcDepthCap = Math.min(steelDepth, 400);
  // Table 3.8 also caps fcu at 40 MPa and vc at min(0.8√fcu, 5) MPa.
  const vcConcreteCap = Math.min(fcu, 40);
  const vcRaw =
    (0.79 / 1.25) *
    Math.pow(vcConcreteCap / 25, 1 / 3) *
    Math.pow(vcSteelPct, 1 / 3) *
    Math.pow(400 / vcDepthCap, 0.25);
  const vcCeiling = Math.min(0.8 * Math.sqrt(vcConcreteCap), 5);
  const vcBase = Math.min(vcRaw, vcCeiling);
  // BS 8110-1 Cl 3.4.5.8: where a concentrated load acts within 2d of the
  // support, v_c may be multiplied by 2d/a_v, capped at 2. It applies to a load
  // at a known distance, not to a uniformly distributed load, so it is used only
  // when a_v is supplied.
  let shearEnhancement = 1;
  if (
    input.load_av_mm !== undefined &&
    input.load_av_mm > 0 &&
    input.load_av_mm < 2 * steelDepth
  ) {
    shearEnhancement = Math.min(2, (2 * steelDepth) / input.load_av_mm);
  }
  const vc = Math.min(vcBase * shearEnhancement, vcCeiling * 2);
  if (vcRaw > vcCeiling) {
    formulas.push(
      `v_c = ${vcRaw.toFixed(2)} MPa capped to ${vcCeiling.toFixed(2)} MPa (BS 8110-1 Table 3.8: min(0.8√f_cu, 5))`,
    );
  }
  // Capacity taken on the strength depth, which is never deeper than the section
  // recommended below, so this is the conservative figure.
  const shear_capacity = (vc * assumed_width * steelDepth) / 1000; // kN
  if (shearEnhancement > 1) {
    formulas.push(
      `Shear enhancement (BS 8110-1 Cl 3.4.5.8): a_v = ${input.load_av_mm!.toFixed(0)} mm < 2d, so v_c is multiplied by 2d/a_v = ${shearEnhancement.toFixed(2)} → ${vc.toFixed(2)} N/mm²`,
    );
  }
  const shear_check_pass = shear_capacity >= max_shear;
  formulas.push(
    `Shear capacity v_c × b × d = ${vc.toFixed(2)} × ${assumed_width} × ${steelDepth.toFixed(0)} = ${shear_capacity.toFixed(1)} kN vs ${max_shear.toFixed(1)} kN → ${shear_check_pass ? "PASS" : "FAIL"}`,
  );

  if (!shear_check_pass) {
    warnings.push(
      `Shear capacity insufficient. Provide shear reinforcement (links) at closer spacing or increase section.`,
    );
  }

  // Recommended dimensions. The depth has to satisfy deflection as well as
  // bending: a depth that only satisfies K = 0.156 can still be far too shallow
  // to control deflection, and that check used to be run on the strength depth
  // rather than on the section being recommended.
  const depthForDeflection =
    (effective_span * 1000) / basicRatio + input.cover_mm + 25;
  const requiredDepthGoverning = Math.max(required_depth, depthForDeflection);
  // A supplied depth is the section being checked. It was ignored here, so a
  // user entering a 300 mm beam was handed back a 1,000 mm recommendation and no
  // verdict on the member they actually have.
  let recommended_depth =
    input.existing_depth ?? roundUpTo50(requiredDepthGoverning);
  if (input.existing_depth) {
    formulas.push(
      `Section taken as supplied: ${input.existing_width ?? assumed_width} × ${input.existing_depth} mm, with steel, its minimum and shear capacity designed on that section.`,
    );
    if (input.existing_depth < required_depth - 1) {
      warnings.push(
        `The supplied depth (${input.existing_depth} mm) is less than the ${required_depth.toFixed(0)} mm needed for bending. Treat the steel figures as indicative and deepen the section.`,
      );
    }
  }
  const recommended_width = assumed_width;

  // The depth has to satisfy the modification factor, not the bare basic ratio,
  // or the beam is pronounced a failure by its own recommendation. Deepen in
  // 50 mm steps until the check it is reported against passes.
  const providedFlowSteel = bestCount * barArea(bestDiameter);
  const mfBasic = Math.max(As, min_As);
  const beffFs =
    (2 / 3) *
    fy *
    (Math.min(mfBasic, providedFlowSteel) / Math.max(providedFlowSteel, 1));
  let providedDepthEff = recommended_depth - input.cover_mm - 25;
  let span_to_depth = (effective_span * 1000) / providedDepthEff;
  let beffStress =
    (max_moment * 1e6) / (assumed_width * providedDepthEff * providedDepthEff);
  let beamModFactor = Math.min(
    2.0,
    Math.max(0.55, 0.55 + (477 - beffFs) / (120 * (0.9 + beffStress))),
  );
  let beamAllowableRatio = basicRatio * beamModFactor;
  let depthSteps = 0;
  while (
    span_to_depth > beamAllowableRatio &&
    depthSteps < 24 &&
    !input.existing_depth
  ) {
    recommended_depth += 50;
    depthSteps += 1;
    providedDepthEff = recommended_depth - input.cover_mm - 25;
    span_to_depth = (effective_span * 1000) / providedDepthEff;
    beffStress =
      (max_moment * 1e6) /
      (assumed_width * providedDepthEff * providedDepthEff);
    beamModFactor = Math.min(
      2.0,
      Math.max(0.55, 0.55 + (477 - beffFs) / (120 * (0.9 + beffStress))),
    );
    beamAllowableRatio = basicRatio * beamModFactor;
  }
  if (depthSteps > 0 && span_to_depth <= beamAllowableRatio) {
    formulas.push(
      `Depth increased by ${depthSteps} × 50 mm to ${recommended_depth} mm so the deflection check passes on the modification factor, not just the basic ratio.`,
    );
  }
  const deflection_check_pass = span_to_depth <= beamAllowableRatio;
  // Audit fix (F5, 2026-11-08): when no depth is supplied the tension steel is
  // sized on the bending-minimum effective depth, which is shallower than the
  // section eventually recommended. That is conservative, but it was invisible:
  // a 4.5 m beam needing 568 mm2 on its 300 mm effective depth was detailed
  // with 778 mm2. The output now states which depth the steel belongs to.
  if (!input.existing_depth && recommended_depth > required_depth + 1) {
    formulas.push(
      `Tension steel is sized on the ${steelDepth.toFixed(0)} mm bending-minimum effective depth, not the ${Math.max(120, recommended_depth - input.cover_mm - 25).toFixed(0)} mm effective depth of the recommended ${recommended_depth} mm section: the steel is therefore conservative by design and is not reduced for the deeper section.`,
    );
  }
  if (requiredDepthGoverning > required_depth + 1) {
    formulas.push(
      `Depth set by deflection, not bending: ${depthForDeflection.toFixed(0)} mm required for L/d ≤ ${basicRatio}, against ${required_depth.toFixed(0)} mm for bending.`,
    );
  }
  formulas.push(
    `Span/depth on the recommended section = ${(effective_span * 1000).toFixed(0)} / ${providedDepthEff.toFixed(0)} = ${span_to_depth.toFixed(1)}; allowable = ${basicRatio} × ${beamModFactor.toFixed(2)} (BS 8110-1 Cl 3.4.6.5, f_s = ${beffFs.toFixed(0)} N/mm²) = ${beamAllowableRatio.toFixed(1)} → ${deflection_check_pass ? "PASS" : "FAIL"}`,
  );

  // Links
  // BS 8110-1 Cl 3.4.5.3: where the applied shear exceeds the concrete
  // capacity, links carry the difference, Asv/sv >= (V - Vc) / (0.95 fy d).
  // The old output named a maximum spacing and left the reader to work out
  // whether links were even needed.
  const link_diameter = bestDiameter >= 20 ? 10 : 8;
  const maxLinkSpacing = Math.min(300, 0.75 * required_depth_eff);
  const shearExcessKN = max_shear - shear_capacity;
  const shearLinksRequired = shearExcessKN > 0;
  let designedLinkSpacing = maxLinkSpacing;
  if (shearLinksRequired) {
    // Two legs per link.
    const asv = 2 * barArea(link_diameter);
    const requiredAsvPerSv =
      (shearExcessKN * 1000) / (0.95 * fy * required_depth_eff);
    designedLinkSpacing = Math.min(maxLinkSpacing, asv / requiredAsvPerSv);
    formulas.push(
      `Shear links: Asv/sv = ${(shearExcessKN * 1000).toFixed(0)} / (0.95 × ${fy} × ${required_depth_eff.toFixed(0)}) = ${requiredAsvPerSv.toFixed(3)} mm²/mm; Y${link_diameter} two-leg links (Asv = ${asv.toFixed(0)} mm²) at ${Math.floor(designedLinkSpacing / 25) * 25} mm c/c`,
    );
  } else {
    formulas.push(
      `Shear links: concrete alone carries ${shear_capacity.toFixed(1)} kN ≥ ${max_shear.toFixed(1)} kN, so nominal Y${link_diameter} links at ${Math.floor(maxLinkSpacing / 25) * 25} mm c/c (0.75d, BS 8110-1 Cl 3.4.5.1)`,
    );
  }
  const link_spacing = Math.max(75, Math.floor(designedLinkSpacing / 25) * 25);
  // Maximum shear stress the section can take at all: min(0.8 sqrt(fcu), 5) MPa.
  const maxShearStress = Math.min(0.8 * Math.sqrt(fcu), 5);
  const appliedShearStress =
    (max_shear * 1000) / (assumed_width * required_depth_eff);
  if (appliedShearStress > maxShearStress) {
    warnings.push(
      `Applied shear stress ${appliedShearStress.toFixed(2)} N/mm² exceeds the ${maxShearStress.toFixed(2)} N/mm² section limit (BS 8110-1 Cl 3.4.5.2). Increase the section; links alone cannot fix this.`,
    );
  }

  // Beam-type specific warnings
  if (input.beam_type === "ground_beam") {
    if (ms.marketCode === "NG") {
      if (recommended_depth < 450) warnings.push(ms.groundBeamNote);
    } else {
      warnings.push(ms.groundBeamNote);
    }
  }
  if (input.beam_type === "lintel" && recommended_depth > 450) {
    warnings.push(ms.lintelNote);
  }
  if (As > max_As) {
    // 4 % of b d is the practical ceiling: above it the bars cannot be placed,
    // lapped or compacted. The design is then not a design, it is a message that
    // the section is too small.
    warnings.push(
      `Required steel ${Math.ceil(As)} mm² exceeds the 4 % practical maximum for this section (${Math.ceil(max_As)} mm²). No bar arrangement will fit: deepen the beam or widen it rather than adding steel.`,
    );
  }
  if (!deflection_check_pass) {
    warnings.push(
      `Deflection check failed (span/depth = ${span_to_depth.toFixed(1)} > allowable ${beamAllowableRatio.toFixed(1)} after the modification factor). Increase beam depth.`,
    );
  }

  return {
    span: input.span,
    effective_span,
    design_load: factored_load,
    factored_load,
    max_moment,
    max_shear,
    required_depth: Math.ceil(required_depth),
    required_width: assumed_width,
    recommended_depth,
    recommended_width,
    area_steel_required: Math.ceil(As),
    compression_steel_area: Math.ceil(compression_As),
    compression_steel_yields,
    min_steel_area: Math.ceil(min_As),
    max_steel_area: Math.ceil(max_As),
    recommended_bar_diameter: bestDiameter,
    recommended_bar_count: bestCount,
    link_diameter,
    link_spacing: Math.round(link_spacing),
    shear_capacity: Math.round(shear_capacity * 10) / 10,
    shear_check_pass,
    shear_links_required: shearLinksRequired,
    deflection_check_pass,
    span_to_depth_ratio: Math.round(span_to_depth * 10) / 10,
    ...(beamJurisdiction
      ? {
          jurisdiction_code: beamJurisdiction,
          min_steel_ratio_percent:
            Math.round(
              ((min_As / (assumed_width * required_depth_eff)) * 100 +
                Number.EPSILON) *
                1000,
            ) / 1000,
        }
      : {}),
    warnings,
    formula_transparency: formulas,
  };
}
/**
 * Beam design with the effective span taken from the section actually
 * recommended.
 *
 * BS 8110-1 cl. 3.4.1.1 makes the effective span depend on d, and d depends on
 * the moment, which depends on the span. One pass has to guess d, and the guess
 * was span/12: a 4 m beam judged as 400 mm deep before any steel is chosen, or
 * a shallow lightweight beam whose real depth is half that, so the moment and
 * the L/d verdict were computed on the wrong span. Two passes settle it, because
 * deepening the section only lengthens the span, which only deepens it further,
 * and the second pass starts from the depth already found.
 */
export function designBeam(input: BeamDesignInput): BeamDesignResult {
  let result = designBeamAtSpan(input);
  // Repeat until the span it was designed at is the span implied by the section
  // it recommends. Deepening the section lengthens the span, which only deepens
  // it further, so this settles in a pass or two and is capped regardless.
  for (let pass = 0; pass < 4; pass++) {
    const finalD = Math.max(
      150,
      result.recommended_depth - input.cover_mm - 25,
    );
    const impliedSpan = input.span + finalD / 1000;
    if (Math.abs(impliedSpan - result.effective_span) < 0.001) break;
    result = designBeamAtSpan(input, impliedSpan);
  }
  return result;
}

// ── Column moment-axial interaction ──

/**
 * Moment capacity of a symmetrically reinforced rectangular section at a given
 * axial load, by strain compatibility on the BS 8110-1 Cl 3.4.4.4 rectangular
 * stress block:
 *
 *   stress block   0.67 f_cu / 1.5 = 0.447 f_cu over 0.9x, capped at the face
 *   concrete       0.0035 at the compression face
 *   steel          E_s 200 GPa, stress capped at 0.87 f_y in both directions
 *
 * The section is sampled over neutral-axis depths and the two samples that
 * straddle the design axial load are interpolated. This replaces the previous
 * practice of sizing steel from the moment and then checking capacity on the
 * axial term alone, which passed columns carrying large moments.
 */
export function columnMomentCapacityAtAxial(params: {
  b: number;
  h: number;
  coverToBarCentre: number;
  fcu: number;
  fy: number;
  totalSteelArea: number;
  axialKn: number;
}): { momentCapacityKnm: number; axialAtSample: number } {
  const { b, h, fcu, fy, totalSteelArea, axialKn } = params;
  const dPrime = Math.max(params.coverToBarCentre, 20);
  const halfSteel = totalSteelArea / 2;
  const dTension = Math.max(h - dPrime, dPrime + 1);
  const fcd = (0.67 * fcu) / 1.5; // N/mm²
  const epsCu = 0.0035;
  const Es = 200000;
  const fsMax = 0.87 * fy;

  const sectionResponse = (x: number) => {
    const a = Math.min(0.9 * x, h);
    const cc = fcd * b * a; // N
    const strainTop = (epsCu * (x - dPrime)) / x;
    const strainBot = (epsCu * (x - dTension)) / x;
    // positive is compression
    const fsTop = Math.max(-fsMax, Math.min(fsMax, Es * strainTop));
    const fsBot = Math.max(-fsMax, Math.min(fsMax, Es * strainBot));
    const fTop = fsTop * halfSteel;
    const fBot = fsBot * halfSteel;
    const axialN = cc + fTop + fBot;
    const centroid = h / 2;
    const momentNmm =
      cc * (centroid - a / 2) +
      fTop * (centroid - dPrime) +
      fBot * (centroid - dTension);
    return { axialN, momentKnm: Math.abs(momentNmm) / 1e6 };
  };

  // Sample the interaction curve and interpolate at the design axial load. The
  // curve rises then falls; the capacity is the larger of the two crossings, so
  // every bracket is examined.
  const samples: { n: number; m: number }[] = [];
  for (let i = 1; i <= 200; i++) {
    const x = (i / 200) * 4 * h;
    const r = sectionResponse(x);
    samples.push({ n: r.axialN / 1000, m: r.momentKnm }); // kN, kN·m
  }
  let capacity = 0;
  let axialAtSample = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const c = samples[i];
    const spans = (a.n - axialKn) * (c.n - axialKn) <= 0;
    if (!spans || a.n === c.n) continue;
    const f = (axialKn - a.n) / (c.n - a.n);
    const m = a.m + f * (c.m - a.m);
    if (m > capacity) {
      capacity = m;
      axialAtSample = axialKn;
    }
  }
  return { momentCapacityKnm: capacity, axialAtSample };
}

// ── Column design ──

/**
 * Axial steel stress factor for the column capacity equation.
 *
 * Audit fix (F2, 2026-11-08): the engine applied IS 456's 0.67 f_y on every
 * standard, including the BS 8110 path it names in its own output. The factor
 * belongs to the governing code: BS 8110-1 Cl 3.8.4.3 equation 38 uses
 * 0.8 f_y, IS 456 Cl 39.3 uses 0.67 f_y. ACI 318 has no equivalent single
 * expression (it uses a strain-compatibility interaction diagram), so the
 * BS 8110 form is applied to the ACI grades and the output says so rather
 * than presenting an ACI number that does not exist.
 */
function columnSteelFactor(standard: ConcreteStandardCode): {
  factor: number;
  clause: string;
} {
  if (standard === "is_456") {
    return { factor: 0.67, clause: "IS 456 Cl 39.3 (0.67 f_y)" };
  }
  return {
    factor: 0.8,
    clause:
      standard === "aci_astm"
        ? "BS 8110-1 Cl 3.8.4.3 eq. 38 (0.8 f_y), applied to the ACI grade because ACI 318 uses a full interaction diagram instead of a single axial expression"
        : "BS 8110-1 Cl 3.8.4.3 eq. 38 (0.8 f_y)",
  };
}

export function designColumn(input: ColumnDesignInput): ColumnDesignResult {
  const warnings: string[] = [];
  const formulas: string[] = [];

  const concretePreset = resolveConcreteGrade(
    input.concrete_grade,
    input.market_code,
  );
  const fcu = concretePreset.fcu;
  const fy = STEEL_PROPS[input.steel_grade].fy;

  formulas.push(
    `Concrete standard: ${CONCRETE_STANDARDS[concretePreset.standard].name} (${concretePreset.label}) — f_cu = ${concretePreset.fcu} MPa, E_c = ${concretePreset.Ec} GPa`,
  );

  const steelFactor = columnSteelFactor(concretePreset.standard);
  // Audit fix F1: load factor follows the governing standard.
  const lfCol = loadFactors(concretePreset.standard);
  // For an axial service load the conservative single-load factor of the
  // standard's dead-load factor is retained (dead-governed assumption).
  const factored_load = lfCol.dead * input.axial_load;
  formulas.push(
    `Factored load = ${lfCol.dead} × ${input.axial_load} (${lfCol.label}, axial-governed) = ${factored_load.toFixed(1)} kN`,
  );

  // Required gross area (short column, simplified)
  // N = 0.4 × fcu × Ac + k × fy × As, with k from the governing standard
  // Assume steel ratio ρ = 2% initially
  const rho_initial = 0.02;
  const required_area =
    (factored_load * 1000) /
    (0.4 * fcu + steelFactor.factor * fy * rho_initial);
  formulas.push(
    `Required area = ${factored_load * 1000} / (0.4 × ${fcu} + ${steelFactor.factor} × ${fy} × 0.02) = ${required_area.toFixed(0)} mm² (${steelFactor.clause})`,
  );

  // Determine dimensions
  let recommended_width: number;
  let recommended_depth: number;

  if (input.is_rectangular) {
    if (input.existing_width && input.existing_depth) {
      recommended_width = input.existing_width;
      recommended_depth = input.existing_depth;
    } else {
      const side = Math.sqrt(required_area);
      recommended_width = roundUpTo50(side);
      recommended_depth = roundUpTo50(side);
    }
  } else {
    const diameter = Math.sqrt((4 * required_area) / Math.PI);
    recommended_width = roundUpTo50(diameter);
    recommended_depth = recommended_width;
  }

  const gross_area = recommended_width * recommended_depth;
  formulas.push(
    `Section: ${recommended_width} × ${recommended_depth} = ${gross_area} mm²`,
  );

  // Slenderness check. The height was used as the effective length with no way
  // to say otherwise, so a cantilever column and a braced one came out
  // identical.
  const leFactor =
    Number.isFinite(input.effective_length_factor) &&
    (input.effective_length_factor as number) > 0
      ? (input.effective_length_factor as number)
      : 1.0;
  if (leFactor < 0.5 || leFactor > 3) {
    warnings.push(
      `Effective-length factor ${leFactor} is outside 0.5 to 3.0. Check the restraint conditions: BS 8110-1 Table 3.19 gives 0.75 for a braced, restrained column, 1.0 braced, 1.5 to 2.2 unbraced or cantilever.`,
    );
  }
  const effectiveLengthMm = input.height * 1000 * leFactor;
  const slenderness_ratio =
    effectiveLengthMm / Math.min(recommended_width, recommended_depth);
  const is_short = slenderness_ratio <= 15;
  formulas.push(
    `Effective length = ${input.height} m × ${leFactor} = ${(effectiveLengthMm / 1000).toFixed(2)} m; slenderness = ${effectiveLengthMm.toFixed(0)} / ${Math.min(recommended_width, recommended_depth)} = ${slenderness_ratio.toFixed(1)} → ${is_short ? "short column" : "slender column"}`,
  );
  if (
    Number.isFinite(input.unbraced_height_ratio) &&
    input.unbraced_height_ratio > 0 &&
    Math.abs(input.unbraced_height_ratio - slenderness_ratio) /
      slenderness_ratio >
      0.25
  ) {
    warnings.push(
      `The supplied height/thickness ratio (${input.unbraced_height_ratio}) differs from the slenderness of the section sized here (${slenderness_ratio.toFixed(1)}). The section drives this check; the supplied value is ignored rather than silently mixed in.`,
    );
  }

  // Audit fix F3: a column never sees pure axial load. BS 8110 §3.8.2.4
  // minimum design moment e_min = max(h/300, 20 mm), and for slender
  // columns the additional moment M_add = N·(h/2000)·(l_e/h)².
  const h_min = Math.min(recommended_width, recommended_depth);
  // Audit fix (F1, 2026-11-08): BS 8110-1 Cl 3.8.2.4 requires
  // e_min = 0.05h, not less than 20 mm. This was h/300 (0.003h), so the 20 mm
  // floor was the only term that ever applied and the minimum moment was the
  // same 20 x N for a 400, a 600 and an 800 mm column.
  const e_min = Math.max(0.05 * h_min, 20); // mm
  const M_min = (factored_load * e_min) / 1000; // kN·m (N in kN, e in mm → /1000)
  let total_design_moment = M_min;
  let M_add = 0;
  formulas.push(
    `Minimum design moment: e_min = max(0.05 × ${h_min}, 20) = ${e_min.toFixed(1)} mm (BS 8110-1 Cl 3.8.2.4) → M_min = ${factored_load.toFixed(1)} × ${e_min.toFixed(1)}/1000 = ${M_min.toFixed(1)} kN·m`,
  );
  if (!is_short) {
    M_add =
      (factored_load * (h_min / 2000) * Math.pow(slenderness_ratio, 2)) / 1000; // kN·m
    total_design_moment = M_min + M_add;
    warnings.push(
      `Column is slender (ratio ${slenderness_ratio.toFixed(1)} > 15). Additional moment M_add = N·(h/2000)·(l_e/h)² = ${M_add.toFixed(1)} kN·m included; a full second-order analysis by a structural engineer is still required.`,
    );
  }
  formulas.push(
    `Total design moment = M_min ${M_min.toFixed(1)} kN·m${M_add ? ` + M_add ${M_add.toFixed(1)} kN·m` : ""} = ${total_design_moment.toFixed(1)} kN·m`,
  );

  // Steel area — axial demand plus bending demand from the combined moment.
  const steel_area_axial =
    (factored_load * 1000 - 0.4 * fcu * gross_area) / (steelFactor.factor * fy);
  // Bending steel: approximate interaction — rectangular section bent about
  // the stronger axis, effective depth ≈ h − 50 (cover + link + bar/2).
  const h_bend = Math.max(recommended_width, recommended_depth);
  const b_bend = h_min;
  const d_col = Math.max(h_bend - 50, 50);
  const la_col = leverArmBS(total_design_moment, fcu, b_bend, d_col);
  const steel_area_bending =
    (total_design_moment * 1e6) / (0.87 * fy * la_col.z);
  const steel_area = steel_area_axial + steel_area_bending;
  formulas.push(
    `Axial steel = (${(factored_load * 1000).toFixed(0)} − 0.4 × ${fcu} × ${gross_area}) / (${steelFactor.factor} × ${fy}) = ${steel_area_axial.toFixed(0)} mm²`,
  );
  formulas.push(
    `Bending steel (M=${total_design_moment.toFixed(1)} kN·m, z=${la_col.z.toFixed(0)} mm) = ${(total_design_moment * 1e6).toFixed(0)} / (0.87 × ${fy} × ${la_col.z.toFixed(0)}) = ${steel_area_bending.toFixed(0)} mm²`,
  );
  formulas.push(
    `Total steel = ${steel_area_axial.toFixed(0)} + ${steel_area_bending.toFixed(0)} = ${steel_area.toFixed(0)} mm² (approximate interaction — preliminary design only)`,
  );
  const min_steel = 0.004 * gross_area; // 0.4% min (BS 8110)
  const _max_steel = 0.06 * gross_area; // 6% max
  const final_steel = Math.max(steel_area, min_steel);
  const steel_ratio = (final_steel / gross_area) * 100;

  formulas.push(
    `Steel area = (${(factored_load * 1000).toFixed(0)} - 0.4 × ${fcu} × ${gross_area}) / (${steelFactor.factor} × ${fy}) = ${steel_area.toFixed(0)} mm²`,
  );
  formulas.push(
    `Steel ratio = ${final_steel.toFixed(0)} / ${gross_area} × 100 = ${steel_ratio.toFixed(2)}%`,
  );

  // Select bars.
  // Practical column rules: a main bar is never thinner than 12 mm (BS 8110
  // cl. 3.12.5, and anything smaller buckles in a cage), and bars are arranged
  // symmetrically, so the count is one of 4, 6, 8, 10 or 12. The old loop
  // started at 10 mm and accepted any count, which produced schemes like nine
  // 10 mm bars that no detailer would draw.
  const COLUMN_BAR_DIAMETERS = [12, 16, 20, 25, 32];
  const COLUMN_BAR_COUNTS = [4, 6, 8, 10, 12];
  let bestDiameter = COLUMN_BAR_DIAMETERS[0];
  let bestCount = 4;
  let foundScheme = false;
  for (const d of COLUMN_BAR_DIAMETERS) {
    const needed = Math.ceil(final_steel / barArea(d));
    const count = COLUMN_BAR_COUNTS.find((c) => c >= Math.max(4, needed));
    if (count !== undefined) {
      bestDiameter = d;
      bestCount = count;
      foundScheme = true;
      break;
    }
  }
  if (!foundScheme) {
    bestDiameter = COLUMN_BAR_DIAMETERS[COLUMN_BAR_DIAMETERS.length - 1];
    bestCount = 12;
    warnings.push(
      `Required steel (${final_steel.toFixed(0)} mm²) exceeds twelve 32 mm bars. Increase the column section rather than crowding the cage.`,
    );
  }

  // Links
  const link_diameter = bestDiameter >= 25 ? 10 : 8;
  // BS 8110-1 Cl 3.12.7.1: the least of 12 bar diameters, 0.75 x the lesser
  // section dimension, and 300 mm. The width alone was used before, which is
  // the wrong dimension on a rectangular column.
  const lesserDimension = h_min;
  const link_spacing = Math.min(lesserDimension * 0.75, 300, 12 * bestDiameter);

  // Load capacity: the axial squash term, BS 8110-1 Cl 3.8.3. The 0.67
  // coefficient on the steel term is retained rather than the code's 0.75,
  // which is conservative on steel and is stated as such in the result.
  const provided_steel = bestCount * barArea(bestDiameter);
  const load_capacity =
    (0.4 * fcu * gross_area + steelFactor.factor * fy * provided_steel) / 1000; // kN
  const axial_check_pass = load_capacity >= factored_load;
  formulas.push(
    `Axial capacity = (0.4 × ${fcu} × ${gross_area} + 0.67 × ${fy} × ${provided_steel}) / 1000 = ${load_capacity.toFixed(1)} kN ≥ ${factored_load.toFixed(1)} kN → ${axial_check_pass ? "PASS" : "FAIL"} (0.67 on the steel term is conservative: BS 8110-1 Cl 3.8.3 gives 0.75)`,
  );

  // Moment-axial interaction. A column sized from the axial load and then given
  // steel for the moment still has to carry both at once, so the capacity is
  // checked on the interaction curve at the design axial load.
  const nominalCoverMm =
    Number.isFinite(input.cover_mm) && input.cover_mm >= 15
      ? input.cover_mm
      : 25;
  if (nominalCoverMm !== input.cover_mm) {
    warnings.push(
      `Cover of ${input.cover_mm} mm is below 15 mm or missing; 25 mm was used. Confirm the exposure condition.`,
    );
  }
  const coverToBarCentre = nominalCoverMm + link_diameter + bestDiameter / 2;
  const interaction = columnMomentCapacityAtAxial({
    b: b_bend,
    h: h_bend,
    coverToBarCentre,
    fcu,
    fy,
    totalSteelArea: provided_steel,
    axialKn: factored_load,
  });
  const moment_capacity_knm =
    Math.round(interaction.momentCapacityKnm * 10) / 10;
  const design_moment_knm = Math.round(total_design_moment * 10) / 10;
  const moment_check_pass = moment_capacity_knm >= design_moment_knm;
  formulas.push(
    `Moment capacity at N = ${factored_load.toFixed(1)} kN: M_Rd = ${moment_capacity_knm.toFixed(1)} kN·m vs M_Ed = ${design_moment_knm.toFixed(1)} kN·m → ${moment_check_pass ? "PASS" : "FAIL"} (strain compatibility on the BS 8110-1 Cl 3.4.4.4 stress block)`,
  );
  if (!moment_check_pass) {
    warnings.push(
      `The section carries the axial load but not the moment: M_Rd ${moment_capacity_knm.toFixed(1)} kN·m against M_Ed ${design_moment_knm.toFixed(1)} kN·m. Add steel on the tension face, increase the section, or reduce the eccentricity; do not read the axial PASS as a column that works.`,
    );
  }
  if (steel_ratio > 6) {
    warnings.push(
      `Steel ratio ${steel_ratio.toFixed(2)}% is above the 6% maximum (BS 8110-1 Cl 3.12.6.2). Congested cages cannot be concreted.`,
    );
  } else if (steel_ratio > 4) {
    warnings.push(
      `Steel ratio ${steel_ratio.toFixed(2)}% is above 4%: laps and compaction become difficult in a column this congested.`,
    );
  }

  const capacity_check_pass = axial_check_pass && moment_check_pass;

  const cms: MemberSizingProfile = resolveMemberSizing(
    input.market_code ?? "NG",
  );
  if (
    cms.minColumnWidthMm !== null &&
    recommended_width < cms.minColumnWidthMm
  ) {
    warnings.push(
      `Column width ${recommended_width}mm is below the ${cms.minColumnWidthMm}mm typical minimum for this market's walls. ${cms.marketCode === "NG" ? "Consider 225mm (9-inch) minimum." : "Consider matching the standard wall unit width."}`,
    );
  }
  if (cms.minColumnWidthMm === null) {
    warnings.push(cms.minColumnBasis);
    if (!cms.verified)
      warnings.push(
        `Member sizing defaults for ${cms.marketCode} are not yet verified for this market — confirm with a local engineer.`,
      );
  }

  return {
    axial_load: input.axial_load,
    factored_load,
    required_area: Math.ceil(required_area),
    recommended_width,
    recommended_depth,
    recommended_bar_diameter: bestDiameter,
    recommended_bar_count: bestCount,
    link_diameter,
    link_spacing: Math.round(link_spacing),
    steel_ratio: Math.round(steel_ratio * 100) / 100,
    min_steel_ratio: 0.4,
    max_steel_ratio: 6.0,
    slenderness_check: is_short,
    short_or_slender: is_short ? "short" : "slender",
    load_capacity: Math.round(load_capacity * 10) / 10,
    design_moment_knm,
    moment_capacity_knm,
    axial_check_pass,
    moment_check_pass,
    capacity_check_pass,
    assessment: "PRELIMINARY",
    warnings,
    formula_transparency: formulas,
  };
}

// ── Slab design ──

function designSlabCore(input: SlabDesignInput): SlabDesignResult {
  const warnings: string[] = [];
  const formulas: string[] = [];

  const concretePreset = resolveConcreteGrade(
    input.concrete_grade,
    input.market_code,
  );
  const fcu = concretePreset.fcu;
  const fy = STEEL_PROPS[input.steel_grade].fy;

  formulas.push(
    `Concrete standard: ${CONCRETE_STANDARDS[concretePreset.standard].name} (${concretePreset.label}) — f_cu = ${concretePreset.fcu} MPa, E_c = ${concretePreset.Ec} GPa`,
  );

  // Determine if one-way or two-way
  const ratio = input.span_y / input.span_x;
  const is_two_way = ratio < 2 && input.slab_type === "two_way";

  // Minimum thickness (BS 8110)
  let min_thickness = 100; // general minimum
  if (input.slab_type === "cantilever_slab") {
    min_thickness = Math.max(125, (input.span_x * 1000) / 7); // L/7
    formulas.push(
      `Cantilever min thickness = span/7 = ${input.span_x * 1000} / 7 = ${min_thickness.toFixed(0)} mm`,
    );
  } else if (is_two_way) {
    min_thickness = Math.max(125, (input.span_x * 1000) / 28);
    formulas.push(
      `Two-way slab min thickness = span/28 = ${input.span_x * 1000} / 28 = ${min_thickness.toFixed(0)} mm`,
    );
  } else {
    min_thickness = Math.max(100, (input.span_x * 1000) / 20); // one-way simply supported
    formulas.push(
      `One-way slab min thickness = span/20 = ${input.span_x * 1000} / 20 = ${min_thickness.toFixed(0)} mm`,
    );
  }

  // The thickness has to satisfy the span/depth limit as well as the minimum
  // thickness rule. Those two disagreed: a 4 m two-way panel was sized to
  // span/28 and then immediately failed the L/d check the same panel is
  // reported against. Size to whichever is deeper so the answer is consistent.
  // Sizing ratio from the same Table 3.9 helper the beam path uses. This was a
  // private copy with 32 for continuous and 26 for any two-way panel; 32 is not
  // a Table 3.9 value, and a simply supported two-way panel is a simply
  // supported member, so it takes 20 like any other.
  const basicRatioForSizing = basicSpanDepthRatio(input.support_condition);
  formulas.push(
    `Basic span/depth ratio (BS 8110-1 Table 3.9) for a ${input.support_condition.replace("_", " ")} ${is_two_way ? "two-way" : "one-way"} panel = ${basicRatioForSizing}`,
  );
  const shortSpanForSizing = Math.min(input.span_x, input.span_y);
  const deflectionDepth =
    (shortSpanForSizing * 1000) / basicRatioForSizing + input.cover_mm + 10;
  const required_thickness = Math.ceil(
    Math.max(min_thickness, deflectionDepth),
  );
  const recommended_thickness =
    input.existing_thickness ?? roundUpTo25(required_thickness);

  // Self weight
  const self_weight = (recommended_thickness / 1000) * 24; // 24 kN/m³ for RC
  const total_dead = self_weight + input.dead_load;
  const lfSlab = loadFactors(
    input.jurisdiction_code
      ? jurisdictionStandard(input.jurisdiction_code)
      : concretePreset.standard,
  );
  const total_load = lfSlab.dead * total_dead + lfSlab.live * input.live_load;
  formulas.push(
    `Self weight = ${recommended_thickness}/1000 × 24 = ${self_weight.toFixed(1)} kN/m²`,
  );
  formulas.push(
    `Factored load (${lfSlab.label}) = ${lfSlab.dead} × ${total_dead.toFixed(1)} + ${lfSlab.live} × ${input.live_load} = ${total_load.toFixed(1)} kN/m²`,
  );

  // Effective depth
  const eff_depth = recommended_thickness - input.cover_mm - 10; // assume 20mm bar
  formulas.push(
    `Effective depth = ${recommended_thickness} - ${input.cover_mm} - 10 = ${eff_depth} mm`,
  );

  // Moments
  let momentCoeff = 1 / 8;
  switch (input.support_condition) {
    case "simply_supported":
      momentCoeff = 1 / 8;
      break;
    case "fixed":
      momentCoeff = 1 / 12;
      break;
    case "continuous":
      momentCoeff = 1 / 10;
      break;
    case "cantilever":
      momentCoeff = 1 / 2;
      break;
  }

  // Two-way panels carry load in both directions, so dividing wL² by 8 (a
  // one-way coefficient) over-designed the steel by up to a factor of two and
  // never produced long-direction steel at all. BS 8110-1 Table 3.14 gives
  // moment coefficients against ly/lx; they are interpolated here.
  const twoWayCoefficients: Array<[number, number, number]> = [
    [1.0, 0.062, 0.062],
    [1.1, 0.074, 0.061],
    [1.2, 0.084, 0.059],
    [1.3, 0.093, 0.055],
    [1.4, 0.099, 0.051],
    [1.5, 0.104, 0.046],
    [1.75, 0.113, 0.037],
    [2.0, 0.118, 0.029],
  ];
  const shortSpan = Math.min(input.span_x, input.span_y);
  const longSpan = Math.max(input.span_x, input.span_y);
  const panelRatio = longSpan / shortSpan;
  let alphaShort = momentCoeff;
  let alphaLong = 0;
  if (is_two_way) {
    const clamped = Math.min(2, Math.max(1, panelRatio));
    let lower = twoWayCoefficients[0];
    let upper = twoWayCoefficients[twoWayCoefficients.length - 1];
    for (let i = 0; i < twoWayCoefficients.length - 1; i += 1) {
      if (
        clamped >= twoWayCoefficients[i][0] &&
        clamped <= twoWayCoefficients[i + 1][0]
      ) {
        lower = twoWayCoefficients[i];
        upper = twoWayCoefficients[i + 1];
        break;
      }
    }
    const span = upper[0] - lower[0];
    const t = span === 0 ? 0 : (clamped - lower[0]) / span;
    alphaShort = lower[1] + t * (upper[1] - lower[1]);
    alphaLong = lower[2] + t * (upper[2] - lower[2]);
    formulas.push(
      `Two-way panel, ly/lx = ${panelRatio.toFixed(2)}: αsx = ${alphaShort.toFixed(3)}, αsy = ${alphaLong.toFixed(3)} (BS 8110-1 Table 3.14, simply supported panel, interpolated)`,
    );
    if (
      input.support_condition === "fixed" ||
      input.support_condition === "continuous"
    ) {
      warnings.push(
        `Two-way moments use the simply supported coefficients from BS 8110-1 Table 3.14, so continuity is not credited and the span steel is conservative. Support steel is given on the same conservative basis (see below), not from Table 3.15.`,
      );
    }
  }

  const max_moment = alphaShort * total_load * shortSpan * shortSpan;
  const longSpanMoment = is_two_way
    ? alphaLong * total_load * shortSpan * shortSpan
    : 0;
  const max_shear = (total_load * shortSpan) / 2;
  formulas.push(
    `Max moment = ${alphaShort.toFixed(4)} × ${total_load.toFixed(1)} × ${shortSpan}² = ${max_moment.toFixed(2)} kN·m/m (short span)`,
  );
  if (is_two_way) {
    formulas.push(
      `Long-span moment = ${alphaLong.toFixed(4)} × ${total_load.toFixed(1)} × ${shortSpan}² = ${longSpanMoment.toFixed(2)} kN·m/m`,
    );
  }
  formulas.push(
    `Max shear = ${total_load.toFixed(1)} × ${input.span_x} / 2 = ${max_shear.toFixed(2)} kN/m`,
  );

  // Steel area.
  // The lever arm was pinned at 0.87d whatever the moment. That is conservative
  // on a lightly loaded slab and unsafe on a heavily loaded one, where the real
  // arm falls well below it: at K = 0.15 on a 100 mm slab the true arm is
  // 0.79d, so steel was understated by about 10 %. The beam path already used
  // the BS 8110 Cl 3.4.4.4 lever arm; the slab path now uses the same one.
  const slabLever = leverArmBS(max_moment, fcu, 1000, eff_depth);
  const z = slabLever.z;
  formulas.push(
    `Lever arm: K = ${(max_moment * 1e6).toFixed(0)} / (${fcu} × 1000 × ${eff_depth}²) = ${slabLever.K.toFixed(4)} → z = ${z.toFixed(1)} mm = ${(z / eff_depth).toFixed(2)}d${slabLever.doubly_reinforced ? " (K > 0.156: compression steel required)" : ""}`,
  );
  if (slabLever.doubly_reinforced) {
    warnings.push(
      `K = ${slabLever.K.toFixed(3)} exceeds the 0.156 singly reinforced limit (BS 8110-1 Cl 3.4.4.4). Thicken the slab; a singly reinforced section cannot carry this moment.`,
    );
  }
  const As = (max_moment * 1e6) / (0.87 * fy * z);
  // BS 8110-1 Table 3.25: 0.13 % of the GROSS section for high-yield steel, not
  // of the effective depth. Using d understated the minimum by about 15 %.
  let min_As = (0.13 * 1000 * recommended_thickness) / 100;
  let slabJurisdiction: JurisdictionCode | undefined;
  if (input.jurisdiction_code) {
    slabJurisdiction = input.jurisdiction_code;
    const minSteel = minReinforcementArea({
      code: slabJurisdiction,
      fck: concretePreset.fck ?? fcu,
      fy,
      b: 1000,
      d: eff_depth,
    });
    min_As = minSteel.areaMm2;
    formulas.push(
      `Min steel (${JURISDICTION_CODES[slabJurisdiction].label}, ${minSteel.clause}) = ${minSteel.formula} × 1000 × ${eff_depth.toFixed(0)} = ${min_As.toFixed(0)} mm²/m`,
    );
  }
  const longLever = is_two_way
    ? leverArmBS(longSpanMoment, fcu, 1000, eff_depth)
    : null;
  const longDirectionAs = is_two_way
    ? Math.max(
        (longSpanMoment * 1e6) / (0.87 * fy * (longLever as { z: number }).z),
        min_As,
      )
    : 0;
  const final_As = Math.max(As, min_As);
  formulas.push(
    `Steel area = ${(max_moment * 1e6).toFixed(0)} / (0.87 × ${fy} × ${z}) = ${As.toFixed(0)} mm²/m`,
  );
  if (!slabJurisdiction) {
    formulas.push(
      `Min steel = 0.13% × 1000 × ${recommended_thickness} (gross, BS 8110-1 Table 3.25) = ${min_As.toFixed(0)} mm²/m`,
    );
  }

  // Bar selection.
  // The old loop rounded the spacing to the nearest 25 mm and could round it UP,
  // which put in less steel than the design asked for: a slab needing 1,187
  // mm²/m was detailed with Y12 at 100 (1,131 mm²/m). The ladder below takes the
  // widest standard spacing that actually provides the required area.
  const SPACING_LADDER = [300, 275, 250, 225, 200, 175, 150, 125, 100, 75];
  let bestDiameter = 10;
  let bestSpacing = 75;
  let barSchemeFound = false;
  for (const d of [10, 12, 16, 20]) {
    const spacing = SPACING_LADDER.find(
      (sp) => (1000 * barArea(d)) / sp >= final_As,
    );
    if (spacing !== undefined) {
      bestDiameter = d;
      bestSpacing = spacing;
      barSchemeFound = true;
      break;
    }
  }
  if (!barSchemeFound) {
    bestDiameter = 20;
    bestSpacing = 75;
    warnings.push(
      `Required steel ${final_As.toFixed(0)} mm²/m exceeds Y20 at 75 mm (4,189 mm²/m). Thicken the slab; a cage this dense cannot be placed.`,
    );
  }

  // Long-direction steel uses the same bar size at the spacing it needs.
  const secondarySpacing = is_two_way
    ? (SPACING_LADDER.find(
        (sp) => (1000 * barArea(bestDiameter)) / sp >= longDirectionAs,
      ) ?? 75)
    : 0;

  // Deflection check.
  // The old check compared span/depth against the same ratio the thickness had
  // just been sized from, so it could not fail: the answer was built into the
  // question. BS 8110-1 Cl 3.4.6.5 allows the basic ratio to be multiplied by a
  // modification factor for the steel actually provided, and that factor is
  // applied here. The check can now fail.
  const span_to_depth = (shortSpan * 1000) / eff_depth;
  const basicRatio = basicRatioForSizing;
  const providedSteel = (1000 * barArea(bestDiameter)) / bestSpacing;
  const fsService = (2 / 3) * fy * (final_As / Math.max(providedSteel, 1));
  // M/(bd²) in N/mm²: the moment is kN·m per metre, so the 1e6 restores N·mm.
  const stressRatio = (max_moment * 1e6) / (1000 * eff_depth * eff_depth);
  const mfRaw = 0.55 + (477 - fsService) / (120 * (0.9 + stressRatio));
  const modificationFactor = Math.min(2.0, Math.max(0.55, mfRaw));
  const allowableRatio = basicRatio * modificationFactor;
  const deflection_check_pass = span_to_depth <= allowableRatio;

  formulas.push(
    `Service stress f_s = 2/3 × ${fy} × (${final_As.toFixed(0)} / ${providedSteel.toFixed(0)} provided) = ${fsService.toFixed(0)} N/mm²`,
  );
  formulas.push(
    `Modification factor (BS 8110-1 Cl 3.4.6.5) = 0.55 + (477 − ${fsService.toFixed(0)}) / (120(0.9 + ${stressRatio.toFixed(3)})) = ${modificationFactor.toFixed(2)} → allowable L/d = ${basicRatio} × ${modificationFactor.toFixed(2)} = ${allowableRatio.toFixed(1)}`,
  );
  formulas.push(
    `Span/depth = ${shortSpan * 1000} / ${eff_depth} = ${span_to_depth.toFixed(1)} ≤ ${allowableRatio.toFixed(1)} → ${deflection_check_pass ? "PASS" : "FAIL"}`,
  );

  // Shear check
  // BS 8110-1 Table 3.8, with gamma_m = 1.25, the 2 percent steel cap and the
  // 400 mm depth cap. The uncorrected version overstated shear capacity.
  const slabSteelPct = Math.min((100 * final_As) / (1000 * eff_depth), 2);
  const slabDepthCap = Math.min(eff_depth, 400);
  const vc =
    (0.79 / 1.25) *
    Math.pow(fcu / 25, 1 / 3) *
    Math.pow(slabSteelPct, 1 / 3) *
    Math.pow(400 / slabDepthCap, 0.25);
  const shear_capacity = (vc * 1000 * eff_depth) / 1000;
  const shear_link_note =
    shear_capacity >= max_shear
      ? "No shear reinforcement required (solid slab)"
      : "Shear reinforcement required, consider thickening slab or adding links";

  if (shear_capacity < max_shear) {
    warnings.push(shear_link_note);
  }

  if (!deflection_check_pass) {
    warnings.push(
      `Deflection check failed (L/d = ${span_to_depth.toFixed(1)} > allowable ${allowableRatio.toFixed(1)} after the modification factor). Thicken the slab or reduce the span.`,
    );
  }
  // Punching shear at a column (BS 8110-1 Cl 3.7.7).
  // A slab panel loaded by a column can fail by punching through it, and no
  // amount of flexural steel in the span addresses that. The check runs only when
  // the column reaction is supplied; without it the result says NOT CHECKED, which
  // is the honest answer and the one that must never render as a pass.
  let punch_shear: PunchShearResult | undefined;
  {
    const notes: string[] = [];
    if (input.column_load_kN === undefined || input.column_load_kN === null) {
      punch_shear = {
        status: "NOT CHECKED",
        missing_input: "column_load_kN",
        notes: [
          "Punching shear at the column is NOT CHECKED: no column reaction was supplied. A solid slab can still punch through at a column even when the span reinforcement is adequate.",
        ],
      };
    } else if (!(input.column_load_kN > 0)) {
      punch_shear = {
        status: "NOT CHECKED",
        missing_input: "column_load_kN (> 0)",
        notes: [
          "Punching shear is NOT CHECKED: the column reaction must be a positive load.",
        ],
      };
    } else {
      const cx = input.column_width_mm ?? 300;
      const cy = input.column_depth_mm ?? cx;
      const N = input.column_load_kN;
      const facePerimeter = 2 * (cx + cy);
      const criticalPerimeter = facePerimeter + 3 * Math.PI * eff_depth;
      const vFace = (N * 1000) / (facePerimeter * eff_depth);
      const vEd = (N * 1000) / (criticalPerimeter * eff_depth);
      const vMax = Math.min(0.8 * Math.sqrt(fcu), 5);
      const passCritical = vEd <= vc;
      const passFace = vFace <= vMax;
      notes.push(
        `Critical perimeter at 1.5d: u = 2(${cx} + ${cy}) + 3π × ${eff_depth.toFixed(0)} = ${criticalPerimeter.toFixed(0)} mm`,
      );
      notes.push(
        `v = ${N} kN × 1000 / (${criticalPerimeter.toFixed(0)} × ${eff_depth.toFixed(0)}) = ${vEd.toFixed(2)} N/mm² against v_c = ${vc.toFixed(2)} N/mm²`,
      );
      notes.push(
        `At the column face v = ${vFace.toFixed(2)} N/mm² against the Cl 3.7.7.4 limit of ${vMax.toFixed(2)} N/mm² (0.8√f_cu, capped at 5)`,
      );
      if (!passFace) {
        notes.push(
          "The column face itself is overstressed: enlarge the column or thicken the slab locally. Perimeter enhancement cannot fix this.",
        );
      }
      if (!passCritical) {
        notes.push(
          "Punching shear exceeds the concrete resistance. Punching reinforcement (links or studs) or a thicker slab is required; flexural steel does not help.",
        );
      }
      punch_shear = {
        status: passCritical && passFace ? "PASS" : "FAIL",
        column_load_kN: N,
        face_perimeter_mm: facePerimeter,
        critical_perimeter_mm: Math.round(criticalPerimeter),
        v_ed: Math.round(vEd * 100) / 100,
        v_c: Math.round(vc * 100) / 100,
        v_face: Math.round(vFace * 100) / 100,
        v_max: Math.round(vMax * 100) / 100,
        notes,
      };
      if (punch_shear.status === "FAIL") {
        warnings.push(
          `Punching shear FAILS at the column: ${vEd.toFixed(2)} N/mm² against v_c ${vc.toFixed(2)} N/mm² (v_face ${vFace.toFixed(2)} against ${vMax.toFixed(2)}).`,
        );
      }
    }
    for (const n of notes) formulas.push(n);
  }

  // Support (hogging) moments for continuous and fixed panels.
  //
  // A panel continuous over its supports carries hogging over the support that
  // the simply supported analysis never sees, and until now no support steel was
  // designed at all: the slab was detailed top-steel-free at exactly the location
  // where a real continuous slab cracks first.
  //
  // The coefficient sets that give the reduced span and support moments (BS
  // 8110-1 Tables 3.12 and 3.15) differ by panel type, edge continuity and ly/lx,
  // and this calculator does not ask for edge continuity. Rather than invent
  // coefficients, the support is designed for the same moment as the span: the
  // simply supported moment applied at both locations. That is an envelope, it
  // over-designs rather than under-designs, and it is stated as such.
  const is_restrained =
    input.support_condition === "continuous" ||
    input.support_condition === "fixed";
  const support_moment = is_restrained ? max_moment : 0;
  const support_steel_area = is_restrained
    ? Math.ceil(Math.max(final_As, min_As))
    : 0;
  if (is_restrained) {
    formulas.push(
      `Support (hogging) design moment = ${support_moment.toFixed(2)} kN·m/m: the span moment applied at the support. A conservative envelope, not a Table 3.15 coefficient.`,
    );
    formulas.push(
      `Support steel (top) = ${support_steel_area} mm²/m, at least the minimum; extend over the support region on both sides.`,
    );
    warnings.push(
      `Support (hogging) steel of ${support_steel_area} mm²/m is designed on a conservative envelope: the support is given the same moment as the span. A continuous panel analysed with Table 3.15 continuity coefficients would need less. Do not reduce this steel without a proper continuous analysis.`,
    );
  }

  if (recommended_thickness < 150 && input.span_x > 3) {
    warnings.push(
      `Slab thickness ${recommended_thickness}mm may be thin for ${input.span_x}m span. Consider 150mm minimum.`,
    );
  }

  return {
    span_x: input.span_x,
    span_y: input.span_y,
    slab_type: input.slab_type,
    required_thickness,
    recommended_thickness,
    self_weight: Math.round(self_weight * 10) / 10,
    total_load: Math.round(total_load * 10) / 10,
    max_moment: Math.round(max_moment * 100) / 100,
    max_shear: Math.round(max_shear * 100) / 100,
    steel_area_required: Math.ceil(final_As),
    ...(is_restrained
      ? {
          support_moment: Math.round(support_moment * 100) / 100,
          support_steel_area,
        }
      : {}),
    moment_short_span: Math.round(max_moment * 100) / 100,
    ...(is_two_way
      ? {
          moment_long_span: Math.round(longSpanMoment * 100) / 100,
          steel_area_secondary: Math.ceil(longDirectionAs),
          recommended_bar_spacing_secondary: secondarySpacing,
        }
      : {}),
    ...(slabJurisdiction
      ? {
          jurisdiction_code: slabJurisdiction,
          min_steel_ratio_percent:
            Math.round(
              ((min_As / (1000 * eff_depth)) * 100 + Number.EPSILON) * 1000,
            ) / 1000,
        }
      : {}),
    recommended_bar_diameter: bestDiameter,
    recommended_bar_spacing: bestSpacing,
    link_check: shear_link_note,
    punch_shear,
    span_to_depth_ratio: Math.round(span_to_depth * 10) / 10,
    deflection_check_pass,
    warnings,
    formula_transparency: formulas,
  };
}

/**
 * Slab design with the thinnest compliant section.
 *
 * Audit fix (F4, 2026-11-08): the thickness was sized from the BARE Table 3.9
 * span/depth ratio, while the deflection check against the same panel applied
 * the Cl 3.4.6.5 modification factor. Because the check was always laxer than
 * the sizing rule, it could not fail and the panel was over-thick: a
 * 4.0 x 5.0 m simply supported two-way panel came out at 250 mm where
 * 150-175 mm is normal (6.0 kN/m2 of self-weight against 4.2).
 *
 * The section is now found by stepping DOWN from the geometric first answer in
 * 25 mm increments, re-running the whole design at each candidate, and keeping
 * the thinnest section that actually passes: deflection with its modification
 * factor, a singly reinforced section, concrete shear, and punching shear when
 * a column reaction was supplied. It stops at the first failure, so the result
 * is the minimum compliant thickness under the engine's own checks rather than
 * an assumption about how much continuity relaxes the span/depth ratio.
 *
 * A supplied existing_thickness is a question about that section and is never
 * optimised: it is designed and reported exactly as asked.
 */
export function designSlab(input: SlabDesignInput): SlabDesignResult {
  const first = designSlabCore(input);
  if (input.existing_thickness !== undefined) return first;
  if (!first.deflection_check_pass) return first;

  // The floor is the same minimum-thickness rule the core applies, restated so
  // stepping down can never undercut it: a cantilever keeps span/7 and a
  // two-way panel span/28, both with the 100/125 mm practical minimums.
  const shortSpanMm = Math.min(input.span_x, input.span_y) * 1000;
  const minAllowed =
    input.slab_type === "cantilever_slab"
      ? Math.max(125, (input.span_x * 1000) / 7)
      : input.slab_type === "two_way"
        ? Math.max(125, shortSpanMm / 28)
        : Math.max(100, (input.span_x * 1000) / 20);
  let best = first;
  for (let step = 0; step < 24; step += 1) {
    const candidate = best.recommended_thickness - 25;
    if (candidate < minAllowed) break;
    const next = designSlabCore({ ...input, existing_thickness: candidate });
    if (!next.deflection_check_pass) break;
    if (next.warnings.some((w) => w.includes("singly reinforced"))) break;
    if (!next.link_check.startsWith("No shear reinforcement")) break;
    if (next.punch_shear?.status === "FAIL") break;
    best = next;
  }
  if (best !== first) {
    // required_thickness keeps its own meaning — what the bare span/depth rule
    // demanded — so the two figures stay comparable and the reduction is
    // visible rather than hidden inside a single number.
    best.required_thickness = first.required_thickness;
    best.formula_transparency = [
      ...best.formula_transparency,
      `Thickness ${best.recommended_thickness} mm is the thinnest section that passes every check (deflection with the Cl 3.4.6.5 modification factor, singly reinforced at K <= 0.156, concrete shear${best.punch_shear ? ", punching shear" : ""}), found by stepping down in 25 mm increments from the ${first.recommended_thickness} mm span/depth answer.`,
      ...first.formula_transparency.filter((f) =>
        f.startsWith("Basic span/depth ratio"),
      ),
    ];
  }
  return best;
}

// ============================================================
// PHASE 1: MULTI-CODE SHEAR CAPACITY & STRENGTH ENGINE
// Supports: Eurocode 2 (EN 1992-1-1), ACI 318-19, BS 8110, IS 456
// ============================================================

export interface DesignShearCapacityInput {
  standard: ConcreteStandardCode;
  bwMm: number; // beam width mm
  dMm: number; // effective depth mm
  fckOrFcuMpa: number; // concrete characteristic strength MPa
  asMm2: number; // tensile reinforcement area mm2
  fyMpa?: number; // rebar yield strength MPa
  axialForceKn?: number; // axial force in kN (positive = compression)
}

export interface DesignShearCapacityResult {
  standard: ConcreteStandardCode;
  vcMpa: number; // concrete design shear stress in MPa (N/mm2)
  vcCapacityKn: number; // concrete design shear force in kN
  minimumShearLinksRequired: boolean;
  minLinkSpacingMm: number;
  explanation: string;
}

export function computeDesignShearCapacity(
  input: DesignShearCapacityInput,
): DesignShearCapacityResult {
  const { standard, bwMm, dMm, fckOrFcuMpa, asMm2 } = input;
  const bw = Math.max(100, bwMm);
  const d = Math.max(100, dMm);
  const rho_l = Math.min(0.02, asMm2 / (bw * d)); // tension reinforcement ratio capped at 2%
  const axialKn = input.axialForceKn ?? 0;
  const sigma_cp = axialKn > 0 ? (axialKn * 1000) / (bw * d * 1.5) : 0; // axial stress in MPa

  let vcMpa = 0.45;
  let explanation = "";

  if (standard === "aci_astm") {
    // ACI 318-19: Simplified Vc = (0.17 * lambda * sqrt(f_c) + Nu / (6 * Ag)) * bw * d
    // With f_c in MPa: 0.17 * sqrt(fck)
    const lambda = 1.0; // normal weight concrete
    const fc = fckOrFcuMpa;
    vcMpa = 0.17 * lambda * Math.sqrt(fc) + sigma_cp / 6;
    explanation = `ACI 318-19: V_c = (0.17 * sqrt(${fc.toFixed(1)} MPa) + ${(sigma_cp / 6).toFixed(2)}) * ${bw} * ${d} = ${((vcMpa * bw * d) / 1000).toFixed(1)} kN`;
  } else if (standard === "is_456") {
    // IS 456:2000 Table 19 approximation for tau_c
    const pt = rho_l * 100;
    vcMpa =
      (0.85 * Math.sqrt(0.8 * fckOrFcuMpa) * (Math.sqrt(1 + 5 * pt) - 1)) /
      (6 * pt || 1);
    vcMpa = Math.max(0.28, Math.min(1.2, vcMpa));
    explanation = `IS 456:2000 Table 19: tau_c = ${vcMpa.toFixed(2)} N/mm² (Pt = ${pt.toFixed(2)}%)`;
  } else {
    // Eurocode 2 / BS 8110:
    // EC2: VRd,c = [CRd,c * k * (100 * rho_l * fck)^(1/3) + k1 * sigma_cp] * bw * d
    const k = Math.min(2.0, 1 + Math.sqrt(200 / d));
    const CRd_c = 0.18 / 1.5; // 0.12
    const v_min = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fckOrFcuMpa);
    const basicVc = CRd_c * k * Math.cbrt(100 * rho_l * fckOrFcuMpa);
    vcMpa = Math.max(v_min, basicVc) + 0.15 * sigma_cp;
    explanation = `Eurocode 2 (EN 1992-1-1): v_Rd,c = max(${v_min.toFixed(2)}, ${basicVc.toFixed(2)}) = ${vcMpa.toFixed(2)} MPa`;
  }

  const vcCapacityKn = Math.round(((vcMpa * bw * d) / 1000) * 10) / 10;
  // Maximum link spacing per code: 0.75d (BS/ACI/EC2) up to 300mm
  const minLinkSpacingMm = Math.min(300, Math.round((0.75 * d) / 25) * 25);

  return {
    standard,
    vcMpa: Math.round(vcMpa * 100) / 100,
    vcCapacityKn,
    minimumShearLinksRequired: true,
    minLinkSpacingMm,
    explanation,
  };
}

// ─────────────────────────────────────────────
// JURISDICTION SELECTOR COMPATIBILITY
// ─────────────────────────────────────────────
//
// The Phase-1 refactor consolidated concrete families into
// CONCRETE_STANDARDS but the Structural Calculator page still drives its
// design-code selector through the richer jurisdiction profile (five
// governing codes with labels and clause references). Restored verbatim
// from the pre-refactor engine so the page keeps working; the profile is
// also the reference for which concrete family each code designs with.

export type JurisdictionCode =
  "ACI_318" | "EUROCODE_2" | "BS_8110" | "IS_456" | "AS_3600";

export interface JurisdictionProfile {
  code: JurisdictionCode;
  /** Short display label for the selector. */
  label: string;
  /** Legacy concrete family whose grades/load factors this code uses. */
  standard: ConcreteStandardCode;
  governingCode: string;
  /** Minimum tension reinforcement clause. */
  minSteelClause: string;
  note: string;
}

export const JURISDICTION_CODES: Record<JurisdictionCode, JurisdictionProfile> =
  {
    ACI_318: {
      code: "ACI_318",
      label: "ACI 318-19 (US)",
      standard: "aci_astm",
      governingCode: "ACI 318-19",
      minSteelClause: "§9.6.1.2",
      note: "SI form of 3√f'c/fy with the 200/fy (psi) floor carried as 1.4/fy in MPa.",
    },
    EUROCODE_2: {
      code: "EUROCODE_2",
      label: "Eurocode 2 / BS EN 1992-1-1",
      standard: "eurocode_bs",
      governingCode: "BS EN 1992-1-1",
      minSteelClause: "§9.2.1.1(1)",
      note: "Tensile-strength driven: 0.26 fctm/fyk with a 0.0013 floor.",
    },
    BS_8110: {
      code: "BS_8110",
      label: "BS 8110 (legacy Commonwealth)",
      standard: "eurocode_bs",
      governingCode: "BS 8110-1:1997",
      minSteelClause: "Table 3.25 / §3.12.5.1",
      note: "Tabulated minimum percentages (0.24% for fy 250, 0.13% for high yield).",
    },
    IS_456: {
      code: "IS_456",
      label: "IS 456:2000 (India)",
      standard: "is_456",
      governingCode: "IS 456:2000",
      minSteelClause: "§26.5.1.1",
      note: "Ast = 0.85 b d / fy, independent of concrete grade.",
    },
    AS_3600: {
      code: "AS_3600",
      label: "AS 3600:2018 (Australia / NZ)",
      standard: "aci_astm",
      governingCode: "AS 3600:2018",
      minSteelClause: "Cl 9.1.1(b)",
      note: "phi.Muo >= 1.2.Mcr with Mcr = 0.6.sqrt(fc).b.D^2/6; capacity reduction phi = 0.8 flexure, 0.7 shear (Table 2.2.2).",
    },
  };

/** Markets whose default design code differs from their concrete family. */
const EUROCODE_MARKETS = new Set([
  "GB",
  "IE",
  "ES",
  "PT",
  "FR",
  "DE",
  "IT",
  "NL",
  "BE",
  "PL",
  "SE",
  "DK",
  "NO",
  "FI",
  "CH",
  "AT",
  "CZ",
  "RO",
  "GR",
  "TR",
  "AE",
  "SA",
]);
const ACI_MARKETS = new Set(["US", "CA", "PR", "MX", "BR", "PH"]);

/**
 * Default jurisdiction for a market. Where the current market data has no
 * explicit distinction the concrete family decides, with the well-known
 * Eurocode and ACI markets overridden explicitly.
 */
export function defaultJurisdictionForMarket(
  marketCode?: string,
): JurisdictionCode {
  const code = (marketCode ?? "NG").trim().toUpperCase();
  if (code === "AU" || code === "NZ") return "AS_3600";
  if (code === "IN") return "IS_456";
  if (ACI_MARKETS.has(code)) return "ACI_318";
  if (EUROCODE_MARKETS.has(code)) return "EUROCODE_2";
  return "BS_8110";
}

/** Concrete family a jurisdiction designs with (grades, load factors). */
export function jurisdictionStandard(
  code: JurisdictionCode,
): ConcreteStandardCode {
  return JURISDICTION_CODES[code]?.standard ?? "eurocode_bs";
}

/** Mean tensile strength per EC2 Table 3.1, MPa. */
export function ec2MeanTensileStrength(fck: number): number {
  if (fck <= 50) return 0.3 * Math.pow(fck, 2 / 3);
  const fcm = fck + 8;
  return 2.12 * Math.log(1 + fcm / 10);
}

export interface MinReinforcementRatio {
  code: JurisdictionCode;
  /** Minimum ratio as a decimal (0.0013 = 0.13%). */
  ratio: number;
  percent: number;
  clause: string;
  /** Substituted rule, for the design report. */
  formula: string;
  /** EC2 only: the fctm used, MPa. */
  fctm?: number;
}

/**
 * Minimum tension reinforcement ratio for the selected code.
 * fck / fy in MPa. Nothing is blended between codes.
 */
export function minReinforcementRatio(params: {
  code: JurisdictionCode;
  /** Characteristic concrete strength, MPa (cylinder for ACI/EC2/IS, cube for BS). */
  fck: number;
  /** Characteristic steel yield strength, MPa. */
  fy: number;
}): MinReinforcementRatio {
  const { code, fy } = params;
  const fck = params.fck > 0 ? params.fck : 25;
  if (!(fy > 0)) {
    throw new Error(
      "Steel yield strength fy must be positive to size minimum reinforcement.",
    );
  }
  const profile = JURISDICTION_CODES[code];

  switch (code) {
    case "ACI_318": {
      const sqrtTerm = (0.25 * Math.sqrt(fck)) / fy;
      const floorTerm = 1.4 / fy;
      const ratio = Math.max(sqrtTerm, floorTerm);
      return {
        code,
        ratio,
        percent: ratio * 100,
        clause: `ACI 318-19 ${profile.minSteelClause}`,
        formula:
          floorTerm >= sqrtTerm
            ? `As,min/bd = 1.4/fy = 1.4/${fy} = ${(ratio * 100).toFixed(3)}% (floor governs; 0.25√f'c/fy = ${(sqrtTerm * 100).toFixed(3)}%)`
            : `As,min/bd = 0.25√f'c/fy = 0.25√${fck}/${fy} = ${(ratio * 100).toFixed(3)}% (strength term governs; 1.4/fy = ${(floorTerm * 100).toFixed(3)}%)`,
      };
    }
    case "EUROCODE_2": {
      const fctm = ec2MeanTensileStrength(fck);
      const tensile = (0.26 * fctm) / fy;
      const ratio = Math.max(tensile, 0.0013);
      return {
        code,
        ratio,
        percent: ratio * 100,
        clause: `BS EN 1992-1-1 ${profile.minSteelClause}`,
        formula:
          ratio === 0.0013
            ? `As,min/bd = max(0.26 fctm/fyk, 0.0013) = max(${(tensile * 100).toFixed(3)}%, 0.13%) = 0.13% (floor governs, fctm = ${fctm.toFixed(2)} MPa)`
            : `As,min/bd = 0.26 fctm/fyk = 0.26 × ${fctm.toFixed(2)}/${fy} = ${(ratio * 100).toFixed(3)}% (fctm = 0.30 fck^(2/3) = ${fctm.toFixed(2)} MPa)`,
        fctm,
      };
    }
    case "BS_8110": {
      // BS 8110-1 Table 3.25: 0.24 % for fy 250 and 0.13 % for fy 460 and
      // above. The weaker steel needs the larger area to develop the same
      // minimum moment of resistance, so the percentage falls as fy rises.
      const mildSteel = fy <= 300;
      const ratio = mildSteel ? 0.0024 : 0.0013;
      return {
        code,
        ratio,
        percent: ratio * 100,
        clause: `BS 8110-1 ${profile.minSteelClause}`,
        formula: `As,min/bd = ${(ratio * 100).toFixed(2)}% (BS 8110 Table 3.25: 0.24% for fy 250, 0.13% for fy 460 and above; fy = ${fy})`,
      };
    }
    case "AS_3600": {
      // AS 3600:2018 Cl 9.1.1(b): As,min such that phi.Muo >= 1.2.Mcr with
      // Mcr = fct.f.Z, fct.f = 0.6.sqrt(fc), Z = b.D^2/6. The ratio form
      // assumes D = 1.1d (typical rectangular beam cover) and z = 0.9d,
      // both stated in the formula string; the exact section check with
      // the real D runs in design-code-concrete.ts.
      const ratio =
        (1.2 * 0.6 * Math.pow(1.1, 2) * Math.sqrt(fck)) / (6 * 0.9 * fy);
      return {
        code,
        ratio,
        percent: ratio * 100,
        clause: `AS 3600:2018 ${profile.minSteelClause}`,
        formula: `As,min from phi.Muo >= 1.2.Mcr = 1.2 x (0.6.sqrt(fc).b.D^2/6)/(fsy.0.9d) with D = 1.1d assumed: ${(ratio * 100).toFixed(3)}% (fc = ${fck} MPa, fsy = ${fy} MPa). Verify the exact section against Cl 9.1.1(b).`,
      };
    }
    case "IS_456":
    default: {
      const ratio = 0.85 / fy;
      return {
        code: "IS_456",
        ratio,
        percent: ratio * 100,
        clause: "IS 456:2000 §26.5.1.1",
        formula: `As,min = 0.85 b d / fy = 0.85/${fy} = ${(ratio * 100).toFixed(3)}% b d`,
      };
    }
  }
}

export interface MinReinforcementArea extends MinReinforcementRatio {
  /** Section width, mm */
  b: number;
  /** Effective depth, mm */
  d: number;
  /** Minimum steel area, mm² */
  areaMm2: number;
}

/** Minimum steel area for a section under the selected code. */
export function minReinforcementArea(params: {
  code: JurisdictionCode;
  fck: number;
  fy: number;
  b: number;
  d: number;
}): MinReinforcementArea {
  const ratio = minReinforcementRatio(params);
  return {
    ...ratio,
    b: params.b,
    d: params.d,
    areaMm2: ratio.ratio * params.b * params.d,
  };
}
