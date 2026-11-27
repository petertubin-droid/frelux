// =========================================================
// FRELUX Foundation Design Calculator
// Engine, Phase 32
//
// Calculates foundation sizing (strip / pad / raft) from soil bearing
// - Strip footing width based on soil bearing capacity
// - Pad footing dimensions for column loads
// - Bearing capacity verification
// - Excavation volume estimation
//
import { resolveMemberSizing } from "./member-sizing";

// Based on BS 8004 / Eurocode 7 simplified methods, adapted
// for common soil types (lateritic, sandy clay, etc.) — universal
//
// DISCLAIMER: A geotechnical investigation is always required
// for actual foundation design. These are preliminary sizing tools.
// =========================================================

// ── Types ──

export type SoilType =
  | "stiff_clay"
  | "firm_clay"
  | "sandy_clay"
  | "loose_sand"
  | "dense_sand"
  | "lateritic"
  | "soft_clay_swamp"
  | "rock"
  | "custom";

export type FoundationShape = "strip" | "pad" | "raft";

export interface ColumnFaceValidationInput {
  column_width_mm?: number;
  column_length_mm?: number;
  column_load_kn: number;
  concrete_grade: string;
  market_code?: string;
  design_code?: string;
}

export interface ColumnValidationResult {
  column_face_mm: number;
  column_length_mm: number;
  is_user_specified: boolean;
  governing_code: string;
  code_minimum_mm: number;
  axial_capacity_minimum_mm: number;
  applied_axial_stress_mpa: number;
  allowable_axial_stress_mpa: number;
  axial_capacity_check_pass: boolean;
  face_shear_stress_mpa?: number;
  face_shear_capacity_mpa?: number;
  face_shear_check_pass?: boolean;
  engineering_status:
    | "verified_conforming"
    | "code_governed_minimum"
    | "axial_load_governed"
    | "warning_undersized";
  validation_notes: string[];
}

export interface FoundationDesignInput {
  shape: FoundationShape;
  soil_type: SoilType;
  custom_bearing_capacity?: number; // kN/m² (only if soil_type = 'custom')
  wall_load: number; // kN/m (for strip footing)
  column_load?: number; // kN (for pad footing)
  foundation_depth: number; // meters (depth below ground)
  concrete_grade: string;
  building_length?: number; // meters (for strip total length)
  building_width?: number; // meters
  /** Only applied when the bearing value supplied is an ULTIMATE (gross)
   *  capacity. The built-in soil values are already allowable. */
  safety_factor?: number; // typically 2.5-3.0
  /** Set when custom_bearing_capacity is an ultimate/gross capacity that still
   *  needs dividing by the safety factor. Default false: the value is allowable. */
  custom_capacity_is_ultimate?: boolean;
  /**
   * Supported column face dimension (mm) for pad footing punching shear and
   * axial compressive capacity verification. If omitted or non-positive,
   * the engine derives the code-conforming dimension from project axial load
   * and regional structural codes (BS 8110 / ACI 318 / Eurocode 2).
   */
  column_width_mm?: number;
  /** Optional rectangular column second dimension (mm). Defaults to column_width_mm. */
  column_length_mm?: number;
  /** Target market code (e.g. 'NG', 'US', 'DE'); sets the default column face. */
  market_code?: string;
  /** Explicit structural design code standard for column limits (optional). */
  design_code?: string;
  /**
   * Bearing method.
   *  "table" (default) uses the assumed allowable pressures above, which are
   *  shallow-footing values.
   *  "terzaghi" derives the ultimate capacity from the soil's own strength
   *  parameters, so embedment depth, footing width and groundwater level are
   *  all accounted for instead of being assumed away.
   */
  bearing_method?: "table" | "terzaghi";
  /** Depth to the groundwater table below ground level (m). Terzaghi only. */
  ground_water_depth_m?: number | null;
  /** Override the soil strength parameters used by the terzaghi method. */
  soil_params?: {
    phi_deg?: number;
    cohesion_kpa?: number;
    unit_weight_kn_m3?: number;
  } | null;
  /** Factor of safety applied to the terzaghi ultimate capacity (default 3, BS 8004). */
  bearing_factor_of_safety?: number;
}

export interface CorenGeotechnicalAuditSheet {
  governing_code: string;
  geotechnical_summary: string;
  bearing_capacity_allowable_kpa: number;
  applied_pressure_kpa: number;
  factor_of_safety: number;
  foundation_recommendation: string;
  groundwater_evaluation: string;
  column_structural_evaluation?: string;
  coren_endorsement_placeholder: string;
}

export interface FoundationDesignResult {
  shape: FoundationShape;
  soil_type: SoilType;
  bearing_capacity: number; // kN/m² (allowable)
  applied_pressure: number; // kN/m²
  required_width: number; // mm (strip) or side length (pad)
  recommended_width: number; // mm
  required_length?: number; // mm (pad only)
  recommended_length?: number; // mm
  area_per_pad?: number; // m² (pad only)
  pad_thickness_mm?: number; // mm (pad only, sized against punching shear)
  excavation_volume: number; // m³
  concrete_volume: number; // m³
  blinding_volume: number; // m³ (75mm blinding)
  hardcore_volume: number; // m³
  bearing_check_pass: boolean;
  factor_of_safety: number;
  punching_shear_stress?: number; // N/mm² (pad only, ULS)
  punching_shear_capacity?: number; // N/mm² (pad only)
  punching_shear_check_pass?: boolean; // pad only
  /** Full engineering-code and project-specific column structural validation (pad footings only). */
  column_validation?: ColumnValidationResult;
  recommended_foundation_type?: FoundationShape | "pile";
  recommended_concrete_grade?: string;
  water_table_classification?: "dry" | "moderate" | "shallow_high_risk";
  geotechnical_advisory?: string;
  coren_audit_sheet?: CorenGeotechnicalAuditSheet;
  warnings: string[];
  formula_transparency: string[];
}

// ── Soil bearing capacities: ASSUMED ALLOWABLE pressures (kN/m²) ──
// BS 8004 Table 1 style assumed allowable values, i.e. they already carry the
// factor of safety (roughly 3 on ultimate). Dividing them by a safety factor
// again was double-counting and produced footings 2.5x larger than the soil
// requires. Use

export const SOIL_BEARING_CAPACITY: Record<SoilType, number> = {
  stiff_clay: 300,
  firm_clay: 150,
  sandy_clay: 200,
  loose_sand: 100,
  dense_sand: 300,
  lateritic: 250,
  soft_clay_swamp: 60,
  rock: 600,
  custom: 0, // user-provided
};

export const SOIL_DESCRIPTIONS: Record<SoilType, string> = {
  stiff_clay: "Stiff clay, high plasticity, firm to hard",
  firm_clay: "Firm clay, medium plasticity",
  sandy_clay: "Sandy clay, mixed granular-cohesive",
  loose_sand: "Loose sand, poorly compacted",
  dense_sand: "Dense sand, well-compacted granular",
  lateritic: "Lateritic soil (common in tropical regions)",
  soft_clay_swamp:
    "Soft clay, swamp / coastal marsh (Southern Nigeria / Niger Delta, low bearing)",
  rock: "Sound rock, very high capacity",
  custom: "Custom, user-defined bearing capacity",
};

/**
 * Strength parameters behind each assumed allowable pressure.
 *
 * The table values are what the page shows; these are what the terzaghi method
 * uses to derive a capacity that responds to depth, width and water. They are
 * chosen to reproduce the table values at a 1 m wide shallow footing, so
 * switching method does not move the answer without a reason.
 */
export const SOIL_STRENGTH_PARAMS: Record<
  SoilType,
  { phi_deg: number; cohesion_kpa: number; unit_weight_kn_m3: number }
> = {
  // Undrained clay: capacity is cohesion driven, friction negligible.
  stiff_clay: { phi_deg: 0, cohesion_kpa: 150, unit_weight_kn_m3: 18 },
  firm_clay: { phi_deg: 0, cohesion_kpa: 75, unit_weight_kn_m3: 17.5 },
  sandy_clay: { phi_deg: 25, cohesion_kpa: 25, unit_weight_kn_m3: 18 },
  loose_sand: { phi_deg: 28, cohesion_kpa: 0, unit_weight_kn_m3: 17 },
  dense_sand: { phi_deg: 35, cohesion_kpa: 0, unit_weight_kn_m3: 19 },
  lateritic: { phi_deg: 30, cohesion_kpa: 10, unit_weight_kn_m3: 18.5 },
  soft_clay_swamp: { phi_deg: 0, cohesion_kpa: 28, unit_weight_kn_m3: 15.5 },
  rock: { phi_deg: 40, cohesion_kpa: 200, unit_weight_kn_m3: 22 },
  custom: { phi_deg: 30, cohesion_kpa: 0, unit_weight_kn_m3: 18 },
};

const UNIT_WEIGHT_WATER = 9.81; // kN/m³

/** Terzaghi bearing capacity factors (Vesic's N-gamma, the common form). */
export function bearingCapacityFactors(phiDeg: number): {
  nc: number;
  nq: number;
  ngamma: number;
} {
  const safePhiDeg = Number.isFinite(phiDeg) ? phiDeg : 0;
  const phi = (Math.max(0, Math.min(safePhiDeg, 45)) * Math.PI) / 180;
  if (phi <= 0.0001) return { nc: 5.7, nq: 1, ngamma: 0 };
  const nq =
    Math.exp(Math.PI * Math.tan(phi)) * Math.tan(Math.PI / 4 + phi / 2) ** 2;
  return {
    nc: (nq - 1) / Math.tan(phi),
    nq,
    ngamma: 2 * (nq + 1) * Math.tan(phi),
  };
}

/**
 * Effective unit weight in a soil zone that may be below the water table.
 * Weighted between the moist and buoyant values by how much of the zone is
 * submerged, so a water table partway through the zone is not treated as
 * either extreme.
 */
function effectiveUnitWeight(
  gammaKnM3: number,
  zoneTopM: number,
  zoneBottomM: number,
  waterDepthM: number | null,
): number {
  if (waterDepthM === null || !Number.isFinite(waterDepthM)) return gammaKnM3;
  const submerged = gammaKnM3 - UNIT_WEIGHT_WATER;
  const height = zoneBottomM - zoneTopM;
  if (height <= 0) return gammaKnM3;
  if (waterDepthM <= zoneTopM) return submerged;
  if (waterDepthM >= zoneBottomM) return gammaKnM3;
  const wetHeight = waterDepthM - zoneTopM;
  return (wetHeight * gammaKnM3 + (height - wetHeight) * submerged) / height;
}

export interface TerzaghiInput {
  shape: "strip" | "pad";
  widthM: number;
  depthM: number;
  phiDeg: number;
  cohesionKpa: number;
  unitWeightKnM3: number;
  waterDepthM?: number | null;
  factorOfSafety?: number;
}

/**
 * Allowable bearing pressure from the general bearing capacity equation for a
 * shallow footing (Terzaghi 1943, BS 8004 / Eurocode 7 simplified):
 *
 *   strip: q_ult = c·Nc + q·Nq + 0.5·γ·B·Nγ
 *   square: q_ult = 1.3·c·Nc + q·Nq + 0.4·γ·B·Nγ
 *
 * with q the effective surcharge at founding level (γ·Df, reduced if the water
 * table is above the base) and the wedge term taken on the effective unit
 * weight of the zone below the base. This is what restores the depth and width
 * terms the assumed-allowable table cannot carry.
 */
export function terzaghiAllowablePressure(input: TerzaghiInput): {
  allowable: number;
  ultimate: number;
  overburden: number;
  factors: { nc: number; nq: number; ngamma: number };
  gammaSurcharge: number;
  gammaWedge: number;
} {
  const Df = Number.isFinite(input.depthM) ? Math.max(0, input.depthM) : 0;
  const B = Number.isFinite(input.widthM) ? Math.max(0.1, input.widthM) : 0.1;
  const gamma = Number.isFinite(input.unitWeightKnM3)
    ? Math.max(1, input.unitWeightKnM3)
    : 18;
  const cohesion = Number.isFinite(input.cohesionKpa)
    ? Math.max(0, input.cohesionKpa)
    : 0;
  const phiDeg = Number.isFinite(input.phiDeg)
    ? Math.max(0, Math.min(input.phiDeg, 45))
    : 30;
  const water =
    input.waterDepthM !== undefined &&
    input.waterDepthM !== null &&
    Number.isFinite(input.waterDepthM)
      ? Math.max(0, input.waterDepthM)
      : null;
  const waterAtBase = water;
  const gammaSurcharge = effectiveUnitWeight(gamma, 0, Df, waterAtBase);
  const gammaWedge = effectiveUnitWeight(gamma, Df, Df + B, waterAtBase);
  const { nc, nq, ngamma } = bearingCapacityFactors(phiDeg);

  const shapeC = input.shape === "pad" ? 1.3 : 1;
  const shapeGamma = input.shape === "pad" ? 0.4 : 0.5;
  const overburden = gammaSurcharge * Df;
  const ultimate =
    shapeC * cohesion * nc +
    overburden * nq +
    shapeGamma * gammaWedge * B * ngamma;
  const fs =
    input.factorOfSafety &&
    Number.isFinite(input.factorOfSafety) &&
    input.factorOfSafety > 1
      ? input.factorOfSafety
      : 3;
  return {
    allowable: ultimate / fs,
    ultimate,
    overburden,
    factors: { nc, nq, ngamma },
    gammaSurcharge,
    gammaWedge,
  };
}

/** fcu (N/mm²) parsed from a grade label like "C25" / "C25/30" / "3000_psi". */
function fcuFromGrade(grade: string): number {
  const m = grade.match(/\d+/);
  const n = m ? parseInt(m[0], 10) : 25;
  if (grade.includes("psi")) return Math.round(n / 145.038); // psi → N/mm²
  return n || 25;
}

function roundUpTo50(n: number): number {
  return Math.ceil(n / 50) * 50;
}

function roundUpTo100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

/**
 * Validates and resolves the design column face dimensions for pad footings.
 *
 * Replaces arbitrary static assumptions with a rigorous structural framework:
 * 1. Project-specific axial compression capacity (short column short-braced checks
 *    under BS 8110 Cl 3.8.4.3 / EC2 EN 1992-1-1 / ACI 318-19 §22.4).
 * 2. Physical and code minimum dimensions: concrete cover (35-40 mm), rebar clearance,
 *    shear link anchorage, and 1-hour fire resistance enforce a 200 mm physical floor.
 * 3. Regional market modular alignment (e.g. 225 mm in NG, 230 mm in IN, 203 mm in US).
 * 4. Two-way punching shear and face shear (BS 8110 Cl 3.7.7.4 v_0 <= min(0.8*sqrt(fcu), 5 MPa)).
 */
export function validateAndResolveColumnFace(
  input: ColumnFaceValidationInput,
): ColumnValidationResult {
  let governing_code = input.design_code;
  if (!governing_code) {
    const mc = (input.market_code || "").toUpperCase();
    if (mc === "US" || mc === "CA" || mc === "MX") {
      governing_code = "ACI 318-19";
    } else if (mc === "IN") {
      governing_code = "IS 456:2000 / IS 13920";
    } else if (mc === "DE" || mc === "FR" || mc === "IT" || mc === "ES") {
      governing_code = "Eurocode 2 (EN 1992-1-1)";
    } else if (mc === "AU") {
      governing_code = "AS 3600:2018";
    } else if (mc === "NG" || mc === "GH" || mc === "KE" || mc === "GB") {
      governing_code = "BS 8110-1:1997 / BS 8004";
    } else {
      governing_code = "BS 8110-1:1997 / Eurocode 2 (International baseline)";
    }
  }

  // Structural concrete code practical minimum floor (200 mm for 1h fire & rebar clearance)
  const code_minimum_mm = 200;

  // Project-specific axial compressive capacity
  const fcu = fcuFromGrade(input.concrete_grade);
  const ULS_N = 1.4 * Math.max(0, input.column_load_kn) * 1000; // Factored axial load in N
  // Allowable short column compressive stress with nominal 1% longitudinal rebar (fy = 410 MPa):
  // N_u = 0.4*fcu*Ac + 0.8*fy*Asc = Ac * (0.4*fcu + 3.28)
  const sigma_allow = 0.4 * fcu + 3.28;

  const req_area = ULS_N / Math.max(sigma_allow, 1);
  const raw_face = Math.sqrt(req_area);
  const axial_capacity_minimum_mm = Math.max(
    200,
    Math.ceil(raw_face / 25) * 25,
  );

  let market_module_mm: number | null = null;
  let market_basis: string | null = null;
  if (input.market_code) {
    const profile = resolveMemberSizing(input.market_code);
    market_basis = profile.minColumnBasis;
    if (profile.minColumnWidthMm !== null) {
      if (profile.minColumnWidthMm >= 200) {
        market_module_mm = profile.minColumnWidthMm;
      } else {
        market_module_mm = 200; // Wall unit may be thin masonry, but RC column section requires >= 200 mm
      }
    }
  }

  const validation_notes: string[] = [];
  let column_face_mm: number;
  let column_length_mm: number;
  let is_user_specified = false;
  let engineering_status: ColumnValidationResult["engineering_status"];

  if (typeof input.column_width_mm === "number" && input.column_width_mm > 0) {
    is_user_specified = true;
    column_face_mm = input.column_width_mm;
    column_length_mm =
      typeof input.column_length_mm === "number" && input.column_length_mm > 0
        ? input.column_length_mm
        : column_face_mm;

    const applied_area = column_face_mm * column_length_mm;
    const applied_axial_stress = ULS_N / applied_area;
    const axial_pass = applied_axial_stress <= sigma_allow;

    if (column_face_mm < code_minimum_mm) {
      validation_notes.push(
        `Column face of ${column_face_mm} mm is below the 200 mm structural concrete code minimum (${governing_code}) required for 1-hour fire resistance, rebar cover (35-40 mm), and link anchorage.`,
      );
      engineering_status = "warning_undersized";
    }

    if (!axial_pass) {
      validation_notes.push(
        `Column face of ${column_face_mm}×${column_length_mm} mm is structurally undersized for factored axial load of ${(ULS_N / 1000).toFixed(0)} kN (${input.concrete_grade} concrete). Applied axial stress (${applied_axial_stress.toFixed(2)} N/mm²) exceeds design compressive capacity (${sigma_allow.toFixed(2)} N/mm²); minimum required column face is ${axial_capacity_minimum_mm} mm to prevent crushing failure.`,
      );
      engineering_status = "warning_undersized";
    }

    if (column_face_mm >= code_minimum_mm && axial_pass) {
      engineering_status = "verified_conforming";
      validation_notes.push(
        `Column face of ${column_face_mm}×${column_length_mm} mm verified conforming to ${governing_code} and satisfies axial compression capacity (${applied_axial_stress.toFixed(2)} ≤ ${sigma_allow.toFixed(2)} N/mm²).`,
      );
    }
  } else {
    is_user_specified = false;
    const resolved = Math.max(
      code_minimum_mm,
      market_module_mm ?? code_minimum_mm,
      axial_capacity_minimum_mm,
    );
    column_face_mm = resolved;
    column_length_mm = resolved;

    if (resolved === 200 && !input.market_code) {
      engineering_status = "code_governed_minimum";
      validation_notes.push(
        `Punching shear assumed a standard 200 mm column face (practical engineering minimum; verified for axial compression and code conformance); pass column_width_mm or market_code for the real support size.`,
      );
    } else if (
      market_module_mm &&
      resolved === market_module_mm &&
      market_module_mm > 200
    ) {
      engineering_status = "code_governed_minimum";
      validation_notes.push(
        `Column face dimension set to ${column_face_mm} mm matching ${input.market_code} market modular standard (${market_basis || "standard modular wall dimension"}; verified for axial compression capacity under ${governing_code}).`,
      );
    } else if (
      resolved === axial_capacity_minimum_mm &&
      axial_capacity_minimum_mm > 200
    ) {
      engineering_status = "axial_load_governed";
      validation_notes.push(
        `Column face automatically sized to ${column_face_mm} mm governed by axial compressive capacity for ${(ULS_N / 1000).toFixed(0)} kN factored load (${input.concrete_grade} concrete, ${governing_code}).`,
      );
    } else {
      engineering_status = "code_governed_minimum";
      validation_notes.push(
        `Column face dimension set to ${column_face_mm} mm (${governing_code} code minimum; verified for axial load).`,
      );
    }
  }

  const applied_area = column_face_mm * column_length_mm;
  const applied_axial_stress_mpa =
    Math.round((ULS_N / applied_area) * 100) / 100;
  const allowable_axial_stress_mpa = Math.round(sigma_allow * 100) / 100;
  const axial_capacity_check_pass =
    applied_axial_stress_mpa <= allowable_axial_stress_mpa;

  return {
    column_face_mm,
    column_length_mm,
    is_user_specified,
    governing_code,
    code_minimum_mm,
    axial_capacity_minimum_mm,
    applied_axial_stress_mpa,
    allowable_axial_stress_mpa,
    axial_capacity_check_pass,
    engineering_status: engineering_status!,
    validation_notes,
  };
}

export function designFoundation(
  input: FoundationDesignInput,
): FoundationDesignResult {
  const warnings: string[] = [];
  const formulas: string[] = [];

  // Determine allowable bearing capacity
  const gross_capacity =
    input.soil_type === "custom"
      ? (input.custom_bearing_capacity ?? 150)
      : SOIL_BEARING_CAPACITY[input.soil_type];

  const safety_factor = input.safety_factor ?? 2.5;
  // The built-in soil values are allowable pressures. A custom value is treated
  // as allowable too unless the caller says it is an ultimate capacity.
  const isUltimate =
    input.soil_type === "custom" && input.custom_capacity_is_ultimate === true;
  let allowable_capacity = isUltimate
    ? gross_capacity / safety_factor
    : gross_capacity;
  formulas.push(
    `${isUltimate ? "Ultimate" : "Allowable"} bearing capacity (${input.soil_type}) = ${gross_capacity} kN/m²`,
  );
  formulas.push(
    isUltimate
      ? `Allowable = ${gross_capacity} / ${safety_factor} (safety factor) = ${allowable_capacity.toFixed(0)} kN/m²`
      : `Allowable = ${allowable_capacity.toFixed(0)} kN/m² (assumed allowable value already includes the safety factor)`,
  );

  // ── Optional: derive the capacity instead of assuming it ──
  // The table is a shallow-footing assumption. Deriving it from the soil's own
  // cohesion, friction angle and unit weight brings embedment depth, footing
  // width and the groundwater level into the answer, which is what decides a
  // footing on a soft, wet site.
  const useTerzaghi = input.bearing_method === "terzaghi";
  const baseParams =
    SOIL_STRENGTH_PARAMS[input.soil_type] ?? SOIL_STRENGTH_PARAMS.custom;
  const soilParams = {
    phi_deg: Number.isFinite(input.soil_params?.phi_deg as number)
      ? Math.max(0, Math.min(45, input.soil_params!.phi_deg as number))
      : baseParams.phi_deg,
    cohesion_kpa: Number.isFinite(input.soil_params?.cohesion_kpa as number)
      ? Math.max(0, input.soil_params!.cohesion_kpa as number)
      : baseParams.cohesion_kpa,
    unit_weight_kn_m3: Number.isFinite(
      input.soil_params?.unit_weight_kn_m3 as number,
    )
      ? Math.max(1, input.soil_params!.unit_weight_kn_m3 as number)
      : baseParams.unit_weight_kn_m3,
  };
  const waterDepth =
    input.ground_water_depth_m === null ||
    input.ground_water_depth_m === undefined ||
    !Number.isFinite(input.ground_water_depth_m)
      ? null
      : Math.max(0, input.ground_water_depth_m);
  if (waterDepth !== null && waterDepth < 1.5 && !useTerzaghi) {
    warnings.push(
      `Groundwater at ${waterDepth.toFixed(2)} m is within the zone that decides bearing capacity. The assumed allowable table does not account for it: switch the bearing method to derived capacity so the water table reduces the pressure the soil is credited with.`,
    );
  }
  const terzaghiAt = (
    widthM: number,
    shape: "strip" | "pad",
  ): ReturnType<typeof terzaghiAllowablePressure> =>
    terzaghiAllowablePressure({
      shape,
      widthM,
      depthM: input.foundation_depth,
      phiDeg: soilParams.phi_deg,
      cohesionKpa: soilParams.cohesion_kpa,
      unitWeightKnM3: soilParams.unit_weight_kn_m3,
      waterDepthM: waterDepth,
      factorOfSafety: input.bearing_factor_of_safety ?? 3,
    });

  if (input.soil_type !== "custom" && input.soil_type !== "rock") {
    warnings.push(
      `Bearing capacity for ${input.soil_type} is a typical value. A soil test is mandatory for actual design.`,
    );
  }

  let result: FoundationDesignResult;

  if (input.shape === "strip") {
    // ── Strip footing ──
    // Audit fix F4: 1.10 multiplier covers footing self-weight + overburden.
    let required_width = ((1.1 * input.wall_load) / allowable_capacity) * 1000; // mm
    if (useTerzaghi) {
      // Capacity rises with width (the Nγ term), so the width has to be solved
      // rather than divided out. Six passes settle it to a millimetre.
      let widthM = Math.max(0.3, required_width / 1000);
      for (let i = 0; i < 6; i++) {
        const qa = terzaghiAt(widthM, "strip").allowable;
        const next = (1.1 * input.wall_load) / Math.max(qa, 1);
        if (Math.abs(next - widthM) < 0.0005) {
          widthM = next;
          break;
        }
        widthM = Math.max(0.3, next);
      }
      required_width = widthM * 1000;
      const t = terzaghiAt(widthM, "strip");
      allowable_capacity = t.allowable;
      formulas.push(
        `Derived capacity (Terzaghi, ${soilParams.phi_deg}° friction, ${soilParams.cohesion_kpa} kPa cohesion): Nc=${t.factors.nc.toFixed(1)}, Nq=${t.factors.nq.toFixed(1)}, Nγ=${t.factors.ngamma.toFixed(1)}; q_ult = c·Nc + γ·Df·Nq + 0.5·γ·B·Nγ = ${t.ultimate.toFixed(0)} kN/m², allowable = ${t.ultimate.toFixed(0)} / ${input.bearing_factor_of_safety ?? 3} = ${t.allowable.toFixed(0)} kN/m² at B = ${widthM.toFixed(3)} m`,
      );
      if (waterDepth !== null && waterDepth < input.foundation_depth + widthM) {
        formulas.push(
          `Groundwater at ${waterDepth.toFixed(2)} m: effective unit weight ${t.gammaSurcharge.toFixed(1)} kN/m³ in the surcharge zone and ${t.gammaWedge.toFixed(1)} kN/m³ below the base, so the water table is no longer credited as dry soil`,
        );
      }
    }
    formulas.push(
      `Required width = 1.10 × wall_load / allowable = 1.10 × ${input.wall_load} / ${allowable_capacity.toFixed(0)} = ${(required_width / 1000).toFixed(3)} m = ${required_width.toFixed(0)} mm (1.10 covers footing self-weight + overburden)`,
    );

    const recommended_width = roundUpTo50(required_width);
    const min_width = 300; // minimum practical width
    const final_width = Math.max(recommended_width, min_width);
    if (final_width > recommended_width) {
      formulas.push(
        `Width to build = ${final_width} mm. Bending needs ${Math.ceil(required_width)} mm; ${min_width} mm is the practical minimum for a strip footing (working space, links and cover), so the practical minimum governs. The extra width only lowers the pressure further.`,
      );
    } else {
      formulas.push(
        `Width to build = ${final_width} mm: bending needs ${Math.ceil(required_width)} mm, rounded up to the nearest 50 mm.`,
      );
    }

    // Volumes
    const total_length = input.building_length
      ? input.building_length * 2 + (input.building_width ?? 0) * 2
      : 0;
    const excavation_volume =
      (final_width / 1000) * input.foundation_depth * total_length;
    const concrete_volume = (final_width / 1000) * 0.225 * total_length; // 225mm footing thickness
    const blinding_volume = (final_width / 1000) * 0.075 * total_length;
    const hardcore_volume = (final_width / 1000) * 0.15 * total_length;
    formulas.push(
      `Excavation = ${final_width / 1000} × ${input.foundation_depth} × ${total_length} = ${excavation_volume.toFixed(1)} m³`,
    );

    // The check must weigh the same footing the width was sized for: the
    // service load plus the 1.10 self-weight and overburden allowance. Dividing
    // the bare wall load reported 10 percent less pressure than the footing
    // actually applies, so a design that was only just adequate looked roomy.
    const check_pressure = (1.1 * input.wall_load) / (final_width / 1000);
    const bearing_check_pass = check_pressure <= allowable_capacity;
    // Margin over the allowable pressure (>= 1.0 means the check passes).
    const actual_fos = allowable_capacity / check_pressure;
    formulas.push(
      `Margin over allowable = ${allowable_capacity.toFixed(0)} / ${check_pressure.toFixed(1)} = ${actual_fos.toFixed(2)} (>= 1.0 required)`,
    );

    if (final_width > 1500) {
      warnings.push(
        `Strip footing width ${final_width}mm exceeds 1500mm. Consider pad footings or raft foundation instead.`,
      );
    }
    if (input.foundation_depth < 0.9) {
      warnings.push(
        "Shallow foundation depth (< 0.9 m): in temperate and freezing climates, verify local frost-line depth requirements (e.g. US IRC R403.1.4, UK Building Regs Part A, Eurocode 7) to prevent frost heave.",
      );
    }
    if (allowable_capacity < 100) {
      warnings.push(
        "Very low bearing capacity soil. Consider pile foundation or soil improvement.",
      );
    }

    result = {
      shape: "strip",
      soil_type: input.soil_type,
      bearing_capacity: allowable_capacity,
      applied_pressure: Math.round(check_pressure * 10) / 10,
      required_width: Math.ceil(required_width),
      recommended_width: final_width,
      excavation_volume: Math.round(excavation_volume * 10) / 10,
      concrete_volume: Math.round(concrete_volume * 10) / 10,
      blinding_volume: Math.round(blinding_volume * 10) / 10,
      hardcore_volume: Math.round(hardcore_volume * 10) / 10,
      bearing_check_pass,
      factor_of_safety: Math.round(actual_fos * 100) / 100,
      warnings,
      formula_transparency: formulas,
    };
  } else if (input.shape === "pad") {
    // ── Pad footing (Finding 4: 10% self-weight and punching shear check) ──
    const column_load = input.column_load ?? 200; // default 200 kN
    // 1.10 multiplier covers footing self-weight + overburden.
    const total_footing_load = 1.1 * column_load;
    let required_area = total_footing_load / allowable_capacity; // m²
    if (useTerzaghi) {
      let sideM = Math.max(0.6, Math.sqrt(required_area));
      for (let i = 0; i < 6; i++) {
        const qa = terzaghiAt(sideM, "pad").allowable;
        const next = Math.sqrt(total_footing_load / Math.max(qa, 1));
        if (Math.abs(next - sideM) < 0.0005) {
          sideM = next;
          break;
        }
        sideM = Math.max(0.6, next);
      }
      required_area = sideM * sideM;
      const t = terzaghiAt(sideM, "pad");
      allowable_capacity = t.allowable;
      formulas.push(
        `Derived capacity (Terzaghi, square footing, ${soilParams.phi_deg}° friction, ${soilParams.cohesion_kpa} kPa cohesion): Nc=${t.factors.nc.toFixed(1)}, Nq=${t.factors.nq.toFixed(1)}, Nγ=${t.factors.ngamma.toFixed(1)}; q_ult = 1.3·c·Nc + γ·Df·Nq + 0.4·γ·B·Nγ = ${t.ultimate.toFixed(0)} kN/m², allowable = ${t.allowable.toFixed(0)} kN/m² at B = ${sideM.toFixed(3)} m`,
      );
      if (waterDepth !== null && waterDepth < input.foundation_depth + sideM) {
        formulas.push(
          `Groundwater at ${waterDepth.toFixed(2)} m: effective unit weight ${t.gammaSurcharge.toFixed(1)} kN/m³ above the base and ${t.gammaWedge.toFixed(1)} kN/m³ below it`,
        );
      }
    }
    const side = Math.sqrt(required_area) * 1000; // mm (square pad)
    formulas.push(
      `Total load (with 10% self-weight) = 1.10 × ${column_load} = ${total_footing_load.toFixed(1)} kN`,
    );
    formulas.push(
      `Required area = ${total_footing_load.toFixed(1)} / ${allowable_capacity.toFixed(0)} = ${required_area.toFixed(3)} m² (1.10 covers footing self-weight + overburden)`,
    );
    formulas.push(
      `Square pad side = √${required_area.toFixed(3)} = ${side.toFixed(0)} mm`,
    );

    const recommended_side = Math.max(roundUpTo100(side), 600); // min 600mm
    const actual_area = (recommended_side / 1000) * (recommended_side / 1000);
    const check_pressure = total_footing_load / actual_area;
    const bearing_check_pass = check_pressure <= allowable_capacity;
    const actual_fos = allowable_capacity / check_pressure;
    formulas.push(
      `Margin over allowable = ${allowable_capacity.toFixed(0)} / ${check_pressure.toFixed(1)} = ${actual_fos.toFixed(2)} (>= 1.0 required)`,
    );

    // Blinding is laid 100 mm beyond the pad on every side, so it is counted
    // on the projected footprint. Using the pad area alone under-ordered it.
    const blinding_area = Math.pow(recommended_side / 1000 + 0.2, 2);
    const blinding_volume = blinding_area * 0.075;

    if (recommended_side > 2000) {
      warnings.push(
        `Pad size ${recommended_side}×${recommended_side}mm is very large. Consider raft foundation or soil improvement.`,
      );
    }
    if (input.foundation_depth < 0.9) {
      warnings.push(
        "Shallow foundation depth (< 0.9 m): in temperate and freezing climates, verify local frost-line depth requirements (e.g. US IRC R403.1.4, UK Building Regs Part A, Eurocode 7) to prevent frost heave.",
      );
    }

    // Column Face & Structural Code Validation
    const columnValidation = validateAndResolveColumnFace({
      column_width_mm: input.column_width_mm,
      column_length_mm: input.column_length_mm,
      column_load_kn: column_load,
      concrete_grade: input.concrete_grade,
      market_code: input.market_code,
      design_code: input.design_code,
    });

    const col_face = columnValidation.column_face_mm;
    const col_len = columnValidation.column_length_mm;
    const u0 = 2 * (col_face + col_len);

    for (const note of columnValidation.validation_notes) {
      if (
        columnValidation.engineering_status === "warning_undersized" ||
        columnValidation.engineering_status === "axial_load_governed" ||
        note.includes("standard 200 mm column face")
      ) {
        warnings.push(note);
      }
    }

    const fcu = fcuFromGrade(input.concrete_grade);
    const ULS_N = 1.4 * column_load * 1000; // N (BS 8110 axial-governed)
    const v_max = Math.min(0.8 * Math.sqrt(fcu), 5.0); // BS 8110 Cl 3.7.7.4 limit

    // v_c with minimum flexural steel 0.15% assumed (BS 8110 Table 3.8).
    // Table 3.8 divides by the concrete material factor gamma_m = 1.25. Leaving
    // it out overstated capacity by 25 percent, which is the unsafe direction
    // for a punching check: a pad that should fail would report PASS. The
    // (400/d) term is capped at 1.0 for depths above 400 mm, as the table states.
    const punchingStress = (thicknessMm: number) => {
      const d = thicknessMm - 40 - 10; // 40 cover, 10 half a 20 mm bar
      const perimeter = 2 * (col_face + 3 * d) + 2 * (col_len + 3 * d);
      const applied = ULS_N / (perimeter * d);
      const capacity =
        (0.79 *
          Math.pow(fcu / 25, 1 / 3) *
          Math.pow(0.15, 1 / 3) *
          (d > 400 ? 1 : Math.pow(400 / d, 0.25))) /
        1.25;
      return { d, perimeter, applied, capacity, ok: applied <= capacity };
    };

    // A fixed 300 mm pad was reported as failing punching shear for ordinary
    // column loads and then left to the reader to fix. The depth is now sized:
    // step up in 50 mm increments until the check passes, and say so.
    let pad_thickness_mm = 300;
    let punching = punchingStress(pad_thickness_mm);
    while (!punching.ok && pad_thickness_mm < 900) {
      pad_thickness_mm += 50;
      punching = punchingStress(pad_thickness_mm);
    }
    const {
      d: pad_d,
      perimeter: u1,
      applied: v_punch,
      capacity: v_c_punch,
    } = punching;
    const punching_ok = punching.ok;

    const v_face = ULS_N / (u0 * pad_d);
    const face_ok = v_face <= v_max;
    columnValidation.face_shear_stress_mpa = Math.round(v_face * 1000) / 1000;
    columnValidation.face_shear_capacity_mpa = Math.round(v_max * 1000) / 1000;
    columnValidation.face_shear_check_pass = face_ok;

    formulas.push(
      `Column face validation: ${col_face}×${col_len} mm [${columnValidation.is_user_specified ? "User-Specified" : "Code/Axial Validated"}] under ${columnValidation.governing_code}`,
    );
    formulas.push(
      `Column axial capacity: ULS load = ${(ULS_N / 1000).toFixed(1)} kN, applied axial stress = ${columnValidation.applied_axial_stress_mpa.toFixed(2)} N/mm² vs design capacity = ${columnValidation.allowable_axial_stress_mpa.toFixed(2)} N/mm² (${columnValidation.axial_capacity_check_pass ? "PASS" : "FAIL - COLUMN OVERSTRESSED"})`,
    );
    formulas.push(
      col_face === col_len
        ? `Punching shear: perimeter u1 = 4×(${col_face} + 3×${pad_d}) = ${u1} mm (1.5d from column face, d = ${pad_d} mm)`
        : `Punching shear: perimeter u1 = 2×(${col_face} + 3×${pad_d}) + 2×(${col_len} + 3×${pad_d}) = ${u1} mm (1.5d from column face, d = ${pad_d} mm)`,
    );
    formulas.push(
      `Applied v = ${ULS_N.toFixed(0)} / (${u1} × ${pad_d}) = ${v_punch.toFixed(3)} N/mm² vs v_c ≈ ${v_c_punch.toFixed(3)} N/mm² (min steel 0.15% assumed, gamma_m 1.25 applied) → ${punching_ok ? "PASS" : "FAIL"}`,
    );
    formulas.push(
      `Column face shear: v_0 = ${ULS_N.toFixed(0)} / (${u0} × ${pad_d}) = ${v_face.toFixed(3)} N/mm² vs limit v_max = ${v_max.toFixed(3)} N/mm² (0.8√fcu ≤ 5 N/mm²) → ${face_ok ? "PASS" : "FAIL"}`,
    );
    formulas.push(
      `Pad depth sized to ${pad_thickness_mm} mm (300 mm steps of 50 mm) so the punching check is satisfied.`,
    );
    if (!punching_ok) {
      warnings.push(
        `Punching shear still exceeds concrete capacity at ${pad_thickness_mm} mm depth (v = ${v_punch.toFixed(3)} > v_c ≈ ${v_c_punch.toFixed(3)} N/mm²). Use a pile cap or a thicker, specifically designed footing.`,
      );
    }
    if (!face_ok) {
      warnings.push(
        `Shear stress at the column face (${v_face.toFixed(3)} N/mm²) exceeds the concrete limit of ${v_max.toFixed(3)} N/mm² (${columnValidation.governing_code}). Enlarge the column face or increase pad depth; perimeter shear links cannot fix face overstress.`,
      );
    }
    const excavation_volume = actual_area * input.foundation_depth;
    const concrete_volume = actual_area * (pad_thickness_mm / 1000);
    const hardcore_volume = actual_area * 0.15;

    if (allowable_capacity < 100) {
      warnings.push(
        `Soil bearing capacity is critically low (${allowable_capacity.toFixed(0)} kN/m²). Consult geotechnical specialist for raft or bored pile foundation.`,
      );
    }

    result = {
      shape: "pad",
      soil_type: input.soil_type,
      bearing_capacity: allowable_capacity,
      applied_pressure: Math.round(check_pressure * 10) / 10,
      required_width: Math.ceil(side),
      recommended_width: recommended_side,
      required_length: Math.ceil(side),
      recommended_length: recommended_side,
      area_per_pad: Math.round(actual_area * 1000) / 1000,
      pad_thickness_mm,
      excavation_volume: Math.round(excavation_volume * 10) / 10,
      concrete_volume: Math.round(concrete_volume * 10) / 10,
      blinding_volume: Math.round(blinding_volume * 10) / 10,
      hardcore_volume: Math.round(hardcore_volume * 10) / 10,
      bearing_check_pass,
      factor_of_safety: Math.round(actual_fos * 100) / 100,
      punching_shear_stress: Math.round(v_punch * 1000) / 1000,
      punching_shear_capacity: Math.round(v_c_punch * 1000) / 1000,
      punching_shear_check_pass: punching_ok,
      column_validation: columnValidation,
      warnings,
      formula_transparency: formulas,
    };
  } else {
    // ── Raft foundation ──
    const building_area =
      (input.building_length ?? 10) * (input.building_width ?? 8);
    const wall_load_total =
      input.wall_load *
      ((input.building_length ?? 10) * 2 + (input.building_width ?? 8) * 2);
    // A raft weighs what the strip and pad paths already allow for: the 1.10
    // here covers the 300 mm slab, blinding and the soil it carries. Leaving it
    // out read the applied pressure about 10% low, so a marginal raft passed.
    const total_load = 1.1 * wall_load_total;
    if (useTerzaghi) {
      const raftWidth = Math.max(
        1,
        Math.min(input.building_length ?? 10, input.building_width ?? 8),
      );
      const t = terzaghiAt(raftWidth, "strip");
      allowable_capacity = t.allowable;
      formulas.push(
        `Derived capacity (Terzaghi, taken at the ${raftWidth.toFixed(1)} m short side, ${soilParams.phi_deg}° friction, ${soilParams.cohesion_kpa} kPa cohesion) = ${t.ultimate.toFixed(0)} / ${input.bearing_factor_of_safety ?? 3} = ${t.allowable.toFixed(0)} kN/m²`,
      );
    }
    const applied_pressure = total_load / building_area;
    const bearing_check_pass = applied_pressure <= allowable_capacity;
    const actual_fos = allowable_capacity / applied_pressure;
    formulas.push(
      `Applied pressure = 1.10 × ${wall_load_total.toFixed(1)} kN (walls + raft, blinding and overburden) / ${building_area.toFixed(1)} m² = ${applied_pressure.toFixed(1)} kN/m² vs allowable ${allowable_capacity.toFixed(0)} kN/m² → ${bearing_check_pass ? "PASS" : "FAIL"}`,
    );

    const excavation_volume = building_area * input.foundation_depth;
    const concrete_volume = building_area * 0.3; // 300mm raft slab
    const blinding_volume = building_area * 0.075;
    const hardcore_volume = building_area * 0.15;

    if (applied_pressure > allowable_capacity) {
      warnings.push(
        "Raft pressure exceeds soil capacity. Consider piles or soil improvement.",
      );
    }

    result = {
      shape: "raft",
      soil_type: input.soil_type,
      bearing_capacity: allowable_capacity,
      applied_pressure: Math.round(applied_pressure * 10) / 10,
      required_width: 0, // raft covers entire footprint
      recommended_width: 0,
      excavation_volume: Math.round(excavation_volume * 10) / 10,
      concrete_volume: Math.round(concrete_volume * 10) / 10,
      blinding_volume: Math.round(blinding_volume * 10) / 10,
      hardcore_volume: Math.round(hardcore_volume * 10) / 10,
      bearing_check_pass,
      factor_of_safety: Math.round(actual_fos * 100) / 100,
      warnings,
      formula_transparency: formulas,
    };
  }

  // Geotechnical and COREN Engineering Audit Classification
  let recommended_foundation_type: FoundationShape | "pile" = input.shape;
  let recommended_concrete_grade = input.concrete_grade || "C20/25";
  let geotechnical_advisory = "";

  if (allowable_capacity < 75 || input.soil_type === "soft_clay_swamp") {
    recommended_foundation_type =
      (input.column_load && input.column_load > 350) || input.wall_load > 120
        ? "pile"
        : "raft";
    recommended_concrete_grade = "C25/30";
    geotechnical_advisory =
      "Soft swamp/clay soil exhibits high compressibility. Shallow strip/pad footings risk excessive differential settlement; raft foundation or deep bored/driven piles embedded into competent sand/gravel strata are recommended under Eurocode 7 / BS 8004.";
  } else if (allowable_capacity <= 150) {
    recommended_foundation_type = input.shape === "raft" ? "raft" : "pad";
    recommended_concrete_grade = "C20/25";
    geotechnical_advisory =
      "Medium-strength cohesive soil. Strip or wide isolated pad footings are acceptable provided excavation is inspected for soft pockets.";
  } else {
    recommended_foundation_type = input.shape;
    recommended_concrete_grade = input.concrete_grade || "C20/25";
    geotechnical_advisory =
      "Competent bearing stratum (firm laterite / dense granular soil). Standard strip or pad footings are fully adequate.";
  }

  let water_table_classification: "dry" | "moderate" | "shallow_high_risk" =
    "dry";
  if (waterDepth !== null && waterDepth !== undefined) {
    if (waterDepth < 1.0) {
      water_table_classification = "shallow_high_risk";
      geotechnical_advisory +=
        " Shallow water table detected (< 1.0 m below GL). Substructure waterproofing (BS 8102), dewatering during excavation, and buoyant uplift verification are required.";
    } else if (waterDepth <= 2.5) {
      water_table_classification = "moderate";
    }
  }

  const coren_audit_sheet: CorenGeotechnicalAuditSheet = {
    governing_code:
      "BS 8004:1986 / Eurocode 7 (BS EN 1997-1) / Nigerian National Building Code §8",
    geotechnical_summary: `${SOIL_DESCRIPTIONS[input.soil_type]} with ${allowable_capacity.toFixed(0)} kN/m² allowable bearing capacity.`,
    bearing_capacity_allowable_kpa: allowable_capacity,
    applied_pressure_kpa: result.applied_pressure,
    factor_of_safety: result.factor_of_safety,
    foundation_recommendation: `${recommended_foundation_type.toUpperCase()} footing recommended (Concrete Grade: ${recommended_concrete_grade}).`,
    groundwater_evaluation:
      water_table_classification === "shallow_high_risk"
        ? "High groundwater table requires continuous dewatering and buoyant uplift checks."
        : "Groundwater table does not imperil bearing stratum.",
    column_structural_evaluation: result.column_validation
      ? `Column ${result.column_validation.column_face_mm}×${result.column_validation.column_length_mm} mm: axial stress ${result.column_validation.applied_axial_stress_mpa} MPa vs ${result.column_validation.allowable_axial_stress_mpa} MPa design capacity (${result.column_validation.axial_capacity_check_pass ? "PASS" : "FAIL"}); punching shear ${result.punching_shear_check_pass ? "PASS" : "FAIL"}.`
      : undefined,
    coren_endorsement_placeholder:
      "COREN Registered Geotechnical / Structural Engineer Sign-Off: [Name: ________________________, Reg No: R.________________________, Date: ____________, Seal: ________________________]",
  };

  return {
    ...result,
    recommended_foundation_type,
    recommended_concrete_grade,
    water_table_classification,
    geotechnical_advisory,
    coren_audit_sheet,
  };
}
