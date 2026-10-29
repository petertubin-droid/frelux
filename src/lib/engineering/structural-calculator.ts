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
  max_steel_area: number; // mm²
  recommended_bar_diameter: number; // mm
  recommended_bar_count: number;
  link_diameter: number; // mm
  link_spacing: number; // mm
  shear_capacity: number; // kN
  shear_check_pass: boolean;
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
  unbraced_height_ratio: number; // slenderness ratio (height/thickness)
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
  capacity_check_pass: boolean;
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
  /** Jurisdictional code mode: one governing design code, nothing blended. */
  jurisdiction_code?: JurisdictionCode;
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
  recommended_bar_diameter: number; // mm
  recommended_bar_spacing: number; // mm
  link_check: string;
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

export function designBeam(input: BeamDesignInput): BeamDesignResult {
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
  const effective_span = input.span + preliminary_d_mm / 1000;
  formulas.push(
    `Effective span = clear span + d = ${input.span} + ${(preliminary_d_mm / 1000).toFixed(3)} = ${effective_span.toFixed(3)} m (BS 8110 cl. 3.4.1.1; d from ${input.existing_depth ? "the supplied depth" : "a span/12 preliminary depth"})`,
  );

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
  const assumed_width = input.existing_width ?? ms.beamWidthMm ?? 200;
  if (!input.existing_width && ms.beamWidthMm === null) {
    warnings.push(ms.beamWidthBasis);
    if (!ms.verified)
      warnings.push(
        `Member sizing defaults for ${ms.marketCode} are not yet verified for this market — treat all outputs as generic guidance and confirm with a local engineer.`,
      );
  }
  let required_depth_eff: number;
  let doubly_reinforced = false;
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

  // Span/depth ratio check (deflection)
  const span_to_depth = (effective_span * 1000) / required_depth_eff;
  const basicRatio =
    input.support_condition === "cantilever"
      ? 7
      : input.support_condition === "continuous"
        ? 26
        : 20;
  const deflection_check_pass = span_to_depth <= basicRatio;
  formulas.push(
    `Span/depth = ${(effective_span * 1000).toFixed(0)} / ${required_depth_eff.toFixed(0)} = ${span_to_depth.toFixed(1)} ≤ ${basicRatio} (limit) → ${deflection_check_pass ? "PASS" : "FAIL"}`,
  );

  // Steel area — audit fix F2: the lever arm is no longer hard-coded z = 0.87d.
  let As: number;
  let min_As: number;
  const max_As = (4 * assumed_width * required_depth_eff) / 100; // 4% max
  if (concretePreset.standard === "aci_astm") {
    const aci = designSteelACI(
      max_moment,
      concretePreset.fck ?? fcu,
      fy,
      assumed_width,
      required_depth_eff,
    );
    As = aci.As;
    min_As = minSteelACI(
      concretePreset.fck ?? fcu,
      fy,
      assumed_width,
      required_depth_eff,
    );
    formulas.push(
      `Steel area required (ACI 318-19, Whitney block, φ=0.90) = ${As.toFixed(0)} mm² (stress block a = ${aci.a.toFixed(1)} mm)`,
    );
    formulas.push(`Min steel (ACI 318-19 §9.6.1.2) = ${min_As.toFixed(0)} mm²`);
  } else {
    // Exact BS 8110 3.4.4.4 lever arm: z = d(0.5 + √(0.25 − K/0.9)) ≤ 0.95d
    const la = leverArmBS(max_moment, fcu, assumed_width, required_depth_eff);
    doubly_reinforced = la.doubly_reinforced;
    As = (max_moment * 1e6) / (0.87 * fy * la.z);
    min_As =
      concretePreset.standard === "is_456"
        ? (0.85 / fy) * assumed_width * required_depth_eff // IS 456 26.5.1.1
        : (0.13 * assumed_width * required_depth_eff) / 100; // BS 8110 3.12.5.1 0.13% min
    formulas.push(
      `Lever arm: K = ${(max_moment * 1e6).toFixed(0)}/(${fcu} × ${assumed_width} × ${required_depth_eff.toFixed(0)}²) = ${la.K.toFixed(4)}${la.doubly_reinforced ? " > 0.156 → doubly reinforced required" : ""}`,
    );
    formulas.push(
      `z = d(0.5 + √(0.25 − K/0.9)) = ${la.z.toFixed(0)} mm (≤ 0.95d)`,
    );
    formulas.push(
      `Steel area required = ${(max_moment * 1e6).toFixed(0)} / (0.87 × ${fy} × ${la.z.toFixed(0)}) = ${As.toFixed(0)} mm²`,
    );
    formulas.push(
      `Min steel = ${concretePreset.standard === "is_456" ? "0.85/fy × b × d (IS 456)" : "0.13% × b × d (BS 8110)"} = ${min_As.toFixed(0)} mm²`,
    );
    if (la.doubly_reinforced) {
      warnings.push(
        `K = ${la.K.toFixed(4)} > 0.156: the section needs compression steel (doubly reinforced) or a deeper section. This preliminary pass sizes tension steel only — a full doubly-reinforced design is required.`,
      );
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
      d: required_depth_eff,
    });
    min_As = minSteel.areaMm2;
    formulas.push(
      `Min steel (${JURISDICTION_CODES[beamJurisdiction].label}, ${minSteel.clause}) = ${minSteel.formula} × ${assumed_width} × ${required_depth_eff.toFixed(0)} = ${min_As.toFixed(0)} mm²`,
    );
  }
  if (doubly_reinforced) {
    warnings.push(
      "Section flagged as singly-reinforced-infeasible: increase depth or design compression reinforcement. Treat output as preliminary.",
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

  // Shear check
  const vc =
    0.79 *
    Math.pow(fcu / 25, 1 / 3) *
    Math.pow(
      (100 * provided_As) / (assumed_width * required_depth_eff),
      1 / 3,
    ) *
    (400 / required_depth_eff) ** 0.25;
  const shear_capacity = (vc * assumed_width * required_depth_eff) / 1000; // kN
  const shear_check_pass = shear_capacity >= max_shear;
  formulas.push(
    `Shear capacity v_c × b × d = ${vc.toFixed(2)} × ${assumed_width} × ${required_depth_eff.toFixed(0)} = ${shear_capacity.toFixed(1)} kN vs ${max_shear.toFixed(1)} kN → ${shear_check_pass ? "PASS" : "FAIL"}`,
  );

  if (!shear_check_pass) {
    warnings.push(
      `Shear capacity insufficient. Provide shear reinforcement (links) at closer spacing or increase section.`,
    );
  }

  // Recommended dimensions
  const recommended_depth = roundUpTo50(required_depth);
  const recommended_width = assumed_width;

  // Links
  const link_diameter = bestDiameter >= 20 ? 10 : 8;
  const link_spacing = Math.min(300, 0.75 * required_depth_eff);

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
  if (span_to_depth > basicRatio) {
    warnings.push(
      `Deflection check failed (span/depth = ${span_to_depth.toFixed(1)} > ${basicRatio}). Increase beam depth.`,
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
    min_steel_area: Math.ceil(min_As),
    max_steel_area: Math.ceil(max_As),
    recommended_bar_diameter: bestDiameter,
    recommended_bar_count: bestCount,
    link_diameter,
    link_spacing: Math.round(link_spacing),
    shear_capacity: Math.round(shear_capacity * 10) / 10,
    shear_check_pass,
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

// ── Column design ──

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

  // Audit fix F1: load factor follows the governing standard.
  const lfCol = loadFactors(concretePreset.standard);
  // For an axial service load the conservative single-load factor of the
  // standard's dead-load factor is retained (dead-governed assumption).
  const factored_load = lfCol.dead * input.axial_load;
  formulas.push(
    `Factored load = ${lfCol.dead} × ${input.axial_load} (${lfCol.label}, axial-governed) = ${factored_load.toFixed(1)} kN`,
  );

  // Required gross area (short column, simplified)
  // N = 0.4 × fcu × Ac + 0.67 × fy × As
  // Assume steel ratio ρ = 2% initially
  const rho_initial = 0.02;
  const required_area =
    (factored_load * 1000) / (0.4 * fcu + 0.67 * fy * rho_initial);
  formulas.push(
    `Required area = ${factored_load * 1000} / (0.4 × ${fcu} + 0.67 × ${fy} × 0.02) = ${required_area.toFixed(0)} mm²`,
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

  // Slenderness check
  const slenderness_ratio =
    (input.height * 1000) / Math.min(recommended_width, recommended_depth);
  const is_short = slenderness_ratio <= 15;
  formulas.push(
    `Slenderness ratio = ${input.height * 1000} / ${Math.min(recommended_width, recommended_depth)} = ${slenderness_ratio.toFixed(1)} → ${is_short ? "short column" : "slender column"}`,
  );

  // Audit fix F3: a column never sees pure axial load. BS 8110 §3.8.2.4
  // minimum design moment e_min = max(h/300, 20 mm), and for slender
  // columns the additional moment M_add = N·(h/2000)·(l_e/h)².
  const h_min = Math.min(recommended_width, recommended_depth);
  const e_min = Math.max(h_min / 300, 20); // mm
  const M_min = (factored_load * e_min) / 1000; // kN·m (N in kN, e in mm → /1000)
  let total_design_moment = M_min;
  let M_add = 0;
  formulas.push(
    `Minimum design moment: e_min = max(${h_min}/300, 20) = ${e_min.toFixed(1)} mm → M_min = ${factored_load.toFixed(1)} × ${e_min.toFixed(1)}/1000 = ${M_min.toFixed(1)} kN·m`,
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
    (factored_load * 1000 - 0.4 * fcu * gross_area) / (0.67 * fy);
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
    `Axial steel = (${(factored_load * 1000).toFixed(0)} − 0.4 × ${fcu} × ${gross_area}) / (0.67 × ${fy}) = ${steel_area_axial.toFixed(0)} mm²`,
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
    `Steel area = (${(factored_load * 1000).toFixed(0)} - 0.4 × ${fcu} × ${gross_area}) / (0.67 × ${fy}) = ${steel_area.toFixed(0)} mm²`,
  );
  formulas.push(
    `Steel ratio = ${final_steel.toFixed(0)} / ${gross_area} × 100 = ${steel_ratio.toFixed(2)}%`,
  );

  // Select bars
  let bestDiameter = 16;
  let bestCount = Math.max(4, Math.ceil(final_steel / barArea(16)));
  for (const d of BAR_DIAMETERS) {
    const count = Math.max(4, Math.ceil(final_steel / barArea(d)));
    if (count >= 4 && count <= 12) {
      bestDiameter = d;
      bestCount = count;
      break;
    }
  }

  // Links
  const link_diameter = bestDiameter >= 25 ? 10 : 8;
  const link_spacing = Math.min(
    recommended_width * 0.75,
    300,
    12 * bestDiameter,
  );

  // Load capacity
  const provided_steel = bestCount * barArea(bestDiameter);
  const load_capacity =
    (0.4 * fcu * gross_area + 0.67 * fy * provided_steel) / 1000; // kN
  const capacity_check_pass = load_capacity >= factored_load;

  formulas.push(
    `Capacity = (0.4 × ${fcu} × ${gross_area} + 0.67 × ${fy} × ${provided_steel}) / 1000 = ${load_capacity.toFixed(1)} kN ≥ ${factored_load.toFixed(1)} kN → ${capacity_check_pass ? "PASS" : "FAIL"}`,
  );

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
    capacity_check_pass,
    warnings,
    formula_transparency: formulas,
  };
}

// ── Slab design ──

export function designSlab(input: SlabDesignInput): SlabDesignResult {
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

  const required_thickness = Math.ceil(min_thickness);
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

  const max_moment = momentCoeff * total_load * input.span_x * input.span_x;
  const max_shear = (total_load * input.span_x) / 2;
  formulas.push(
    `Max moment = ${momentCoeff.toFixed(4)} × ${total_load.toFixed(1)} × ${input.span_x}² = ${max_moment.toFixed(2)} kN·m/m`,
  );
  formulas.push(
    `Max shear = ${total_load.toFixed(1)} × ${input.span_x} / 2 = ${max_shear.toFixed(2)} kN/m`,
  );

  // Steel area
  const z = 0.87 * eff_depth;
  const As = (max_moment * 1e6) / (0.87 * fy * z);
  let min_As = (0.13 * 1000 * eff_depth) / 100;
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
  const final_As = Math.max(As, min_As);
  formulas.push(
    `Steel area = ${(max_moment * 1e6).toFixed(0)} / (0.87 × ${fy} × ${z}) = ${As.toFixed(0)} mm²/m`,
  );
  if (!slabJurisdiction) {
    formulas.push(
      `Min steel = 0.13% × 1000 × ${eff_depth} = ${min_As.toFixed(0)} mm²/m`,
    );
  }

  // Bar selection
  let bestDiameter = 10;
  let bestSpacing = Math.round((1000 * barArea(10)) / final_As);
  for (const d of [10, 12, 16]) {
    const spacing = Math.round((1000 * barArea(d)) / final_As);
    if (spacing >= 75 && spacing <= 300) {
      bestDiameter = d;
      bestSpacing = spacing;
      break;
    }
  }
  bestSpacing = Math.min(300, Math.max(75, roundUpTo25(bestSpacing)));

  // Deflection check
  const span_to_depth = (input.span_x * 1000) / eff_depth;
  const basicRatio =
    input.support_condition === "cantilever"
      ? 7
      : input.support_condition === "continuous"
        ? 32
        : input.slab_type === "two_way"
          ? 36
          : 20;
  const deflection_check_pass = span_to_depth <= basicRatio;

  formulas.push(
    `Span/depth = ${input.span_x * 1000} / ${eff_depth} = ${span_to_depth.toFixed(1)} ≤ ${basicRatio} → ${deflection_check_pass ? "PASS" : "FAIL"}`,
  );

  // Shear check
  const vc =
    0.79 *
    Math.pow(fcu / 25, 1 / 3) *
    Math.pow((100 * final_As) / (1000 * eff_depth), 1 / 3) *
    Math.pow(400 / eff_depth, 0.25);
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
      `Deflection check failed (L/d = ${span_to_depth.toFixed(1)} > ${basicRatio}). Increase slab thickness.`,
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
    span_to_depth_ratio: Math.round(span_to_depth * 10) / 10,
    deflection_check_pass,
    warnings,
    formula_transparency: formulas,
  };
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
    vcMpa = 0.17 * lambda * Math.sqrt(fc) + (sigma_cp / 6);
    explanation = `ACI 318-19: V_c = (0.17 * sqrt(${fc.toFixed(1)} MPa) + ${(sigma_cp/6).toFixed(2)}) * ${bw} * ${d} = ${(vcMpa * bw * d / 1000).toFixed(1)} kN`;
  } else if (standard === "is_456") {
    // IS 456:2000 Table 19 approximation for tau_c
    const pt = rho_l * 100;
    vcMpa = 0.85 * Math.sqrt(0.8 * fckOrFcuMpa) * (Math.sqrt(1 + 5 * pt) - 1) / (6 * pt || 1);
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
  const minLinkSpacingMm = Math.min(300, Math.round(0.75 * d / 25) * 25);

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
      const ratio = fy <= 300 ? 0.0024 : 0.0013;
      return {
        code,
        ratio,
        percent: ratio * 100,
        clause: `BS 8110-1 ${profile.minSteelClause}`,
        formula: `As,min/bd = ${(ratio * 100).toFixed(2)}% (BS 8110 Table 3.25: 0.24% for fy 250, 0.13% for fy ≥ 460; fy = ${fy})`,
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
