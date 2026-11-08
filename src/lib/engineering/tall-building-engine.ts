import {
  calculateArchitecturalMath,
  OCCUPANCY_PROFILES,
  type ArchitecturalResult,
  type TallOccupancy,
} from "@/lib/engineering/architectural-planning";
// =========================================================
// FRELUX TALL BUILDING STRUCTURE & FOUNDATION ENGINE
// Deterministic high-rise screening mathematics
//
// What this engine does, and what it does not:
// - Gravity, wind and seismic demand are computed from the entered geometry
//   using published closed-form relationships (ASCE 7-22 chapter 26 and 12.8,
//   ACI 318-19 stiffness and live-load reduction rules).
// - Core and raft stiffness, drift, P-delta, pile capacity and settlement are
//   single-degree approximations for early sizing. They are NOT a structural
//   design, a wind tunnel study, a geotechnical report, or a code submission.
// - Every constant below is labelled with where it comes from. No constant is
//   presented as a site value: soil and seismic inputs must be supplied.
// =========================================================

export type TallStructuralSystemKey =
  "rigid_frame" | "shear_core" | "outrigger" | "tube_in_tube" | "mega_frame";

export type TallSoilKey =
  | "soft_clay"
  | "firm_clay"
  | "sandy_clay"
  | "dense_sand"
  | "gravel"
  | "weathered_rock";

export type TallExposureKey = "B" | "C" | "D";

export type TallFoundationKey = "raft" | "thick_raft" | "piled_raft";

export interface TallBuildingInput {
  project_name: string;
  /** Number of storeys above ground, including the ground floor. */
  floors: number;
  /** Typical storey-to-storey height in metres. */
  floor_height: number;
  /** Ground floor height in metres, usually taller than typical floors. */
  ground_floor_height: number;
  /** Plan dimensions in metres. */
  plan_length: number;
  plan_width: number;
  /** Structural system, or "auto" to select by height. */
  system: TallStructuralSystemKey | "auto";
  /** Concrete cylinder strength fck in MPa (C30 to C70). */
  concrete_grade_mpa: number;
  /** Superimposed dead load, excluding self weight, in kPa. */
  dead_load_kpa: number;
  /** Live load per floor in kPa. */
  live_load_kpa: number;
  /** Partitions and services allowance in kPa. */
  partition_kpa: number;
  /** Cladding and facade weight in kPa of facade area. */
  cladding_kpa: number;
  /** Basic wind speed V in m/s at 10 m, 3 second gust. */
  basic_wind_speed_ms: number;
  terrain_exposure: TallExposureKey;
  /** Wind directionality factor Kd, ASCE 7-22 table 26.6-1. */
  wind_directionality_kd: number;
  /** Force coefficient Cf for the tower, ASCE 7-22 figure 29.3-1 range. */
  force_coefficient_cf: number;
  /** Design spectral acceleration SDS, from the site hazard map. */
  seismic_sds: number;
  /** Design spectral acceleration SD1 (1 second). */
  seismic_sd1: number;
  /** Mapped short period spectral acceleration S1, used for the long period floor. */
  seismic_s1: number;
  /** Response modification factor R for the selected system. */
  seismic_r: number;
  /** Occupancy importance factor Ie. */
  seismic_importance: number;
  /** Soil type for bearing and pile capacity. */
  soil_type: TallSoilKey;
  /** Standard penetration test blow count, used for pile capacity. */
  spt_n: number;
  /** Ground water table depth below ground in metres. */
  water_table_m: number;
  /** Pile diameter in metres. */
  pile_diameter_m: number;
  /** Pile length below the raft soffit in metres. */
  pile_length_m: number;
  /** Pile construction: bored tends to mobilise less shaft friction. */
  pile_construction: "bored" | "driven";
  /** Occupancy used for architectural planning: lift traffic and egress. */
  occupancy: TallOccupancy;
  /** Days per floor for the structural cycle. */
  cycle_days_per_floor: number;
}

export interface TallGeometry {
  total_height_m: number;
  floor_plate_m2: number;
  gross_floor_area_m2: number;
  facade_area_m2: number;
  slenderness_ratio: number;
  core_plan_area_m2: number;
  core_length_m: number;
  core_width_m: number;
  core_wall_thickness_m: number;
  column_grid_x: number;
  column_grid_y: number;
  column_count: number;
  typical_slab_thickness_m: number;
}

export interface TallSystemAssessment {
  selected: TallStructuralSystemKey;
  selected_label: string;
  recommended: TallStructuralSystemKey;
  recommended_label: string;
  within_practical_range: boolean;
  note: string;
}

export interface TallGravityResult {
  /** Entered dead plus partitions, before structure self weight. */
  superimposed_dead_kpa: number;
  /** Entered dead, partitions, slab and beam allowance. */
  total_dead_kpa: number;
  live_load_reduction_factor: number;
  reduced_live_kpa: number;
  total_gravity_load_mn: number;
  base_axial_per_column_mn: number;
  column_size_mm: number;
  core_axial_share_mn: number;
  note: string;
}

export interface TallWindResult {
  kz_top: number;
  velocity_pressure_top_kpa: number;
  gust_factor: number;
  rigid_building: boolean;
  natural_frequency_hz: number;
  natural_period_s: number;
  /** Model period divided by the code approximation; large values signal a soft model. */
  period_vs_approximate_ratio: number;
  base_shear_mn: number;
  overturning_moment_mnm: number;
  governing_face: "short" | "long";
  drift_top_mm: number;
  /** Drift range for a plus or minus 50 percent stiffness band, mm. */
  drift_band_mm: [number, number];
  effective_stiffness_note: string;
  flexural_drift_mm: number;
  shear_drift_mm: number;
  storey_drift_max_mm: number;
  storey_drift_limit_mm: number;
  storey_drift_ratio: number;
  storey_drift_ok: boolean;
  theta_level: number;
  drift_limit_h_over_500_mm: number;
  drift_limit_h_over_400_mm: number;
  drift_ratio: number;
  passes_h_over_500: boolean;
  passes_h_over_400: boolean;
  stability_coefficient: number;
  wind_tunnel_advised: boolean;
  proof: string[];
}

export interface TallSeismicResult {
  approximate_period_s: number;
  spectral_response_acceleration: number;
  /** ASCE 7-22 12.8.3 distribution exponent. */
  k_exponent: number;
  /** Height of the seismic resultant above the base, m. */
  resultant_height_m: number;
  /** Governing minimum coefficient from 12.8.1.1. */
  cs_floor: number;
  base_shear_mn: number;
  overturning_moment_mnm: number;
  seismic_weight_mn: number;
  governs_over_wind: boolean;
  proof: string[];
}

export interface TallFoundationResult {
  foundation_type: TallFoundationKey;
  foundation_label: string;
  raft_thickness_m: number;
  raft_area_m2: number;
  service_load_mn: number;
  bearing_pressure_max_kpa: number;
  allowable_bearing_kpa: number;
  bearing_utilisation_pct: number;
  /** True when the adopted foundation scheme can carry the load. */
  bearing_ok: boolean;
  /** True only when the raft on its own is within the allowable bearing. */
  raft_alone_ok: boolean;
  piles_required: number;
  /** Largest pile load with the overturning moment as a couple. */
  pile_max_load_kn: number;
  pile_load_ok: boolean;
  /** Tension on the far face of the pile group, kN per pile. */
  pile_tension_kn: number;
  piles_in_tension: number;
  /** Converse-Labarre group efficiency. */
  group_efficiency: number;
  group_allowable_kn: number;
  /** Moment divided by axial load, in metres. */
  eccentricity_m: number;
  pile_capacity_ultimate_kn: number;
  pile_capacity_allowable_kn: number;
  pile_shaft_kn: number;
  pile_base_kn: number;
  pile_spacing_m: number;
  pile_spacing_ok: boolean;
  estimated_settlement_mm: number;
  settlement_band_mm: [number, number];
  differential_settlement_mm: number;
  /** Plan width divided by the differential settlement, as 1 in N. */
  angular_distortion: number;
  settlement_ok: boolean;
  /** Core to raft punching shear, EN 1992-1-1 6.4.4. */
  punching_stress_mpa: number;
  punching_resistance_mpa: number;
  punching_ratio: number;
  punching_ok: boolean;
  proof: string[];
}

export interface TallQuantities {
  core_concrete_m3: number;
  column_concrete_m3: number;
  slab_concrete_m3: number;
  raft_concrete_m3: number;
  total_concrete_m3: number;
  total_rebar_tonnes: number;
  formwork_m2: number;
  facade_area_m2: number;
  piles_count: number;
  pile_concrete_m3: number;
  proof: string[];
}

export interface TallSchedule {
  substructure_days: number;
  structure_days: number;
  facade_and_fitout_days: number;
  total_days: number;
  total_months: number;
  floor_cycle_days: number;
}

export type TallCheckSeverity = "critical" | "warning" | "advisory";

export interface TallCheck {
  id: string;
  severity: TallCheckSeverity;
  title: string;
  observed: string;
  threshold: string;
  basis: string;
  action: string;
}

export interface TallBuildingResult {
  input: TallBuildingInput;
  architecture: ArchitecturalResult;
  geometry: TallGeometry;
  system: TallSystemAssessment;
  gravity: TallGravityResult;
  wind: TallWindResult;
  seismic: TallSeismicResult;
  foundation: TallFoundationResult;
  quantities: TallQuantities;
  schedule: TallSchedule;
  checks: TallCheck[];
  /**
   * What this result is and is not. Travels with the object so any surface that
   * renders the numbers can render the boundary in the same breath.
   */
  screening_notice: string;
  timestamp: string;
}

// ── Reference data ──

/**
 * ASCE 7-22 table 26.11-1 terrain parameters. Kz = 2.01 (z/zg)^(2/alpha).
 * Checked against the published 10 m values: B 0.70, C 0.98, D 1.20.
 */
const TERRAIN: Record<
  TallExposureKey,
  {
    alpha: number;
    zg: number;
    /** Turbulence intensity coefficient c, ASCE 7-22 table 26.11-1. */
    c: number;
    /** Turbulence length scale at 10 m, metres. */
    lz: number;
    /** Length scale exponent. */
    epsBar: number;
    /** Mean wind profile coefficient. */
    bBar: number;
    label: string;
  }
> = {
  B: {
    alpha: 7.0,
    zg: 365.76,
    c: 0.3,
    lz: 97.54,
    epsBar: 1 / 3,
    bBar: 0.45,
    label: "Urban and suburban, category B",
  },
  C: {
    alpha: 9.5,
    zg: 274.32,
    c: 0.2,
    lz: 152.4,
    epsBar: 1 / 5,
    bBar: 0.65,
    label: "Open country, category C",
  },
  D: {
    alpha: 11.5,
    zg: 213.36,
    c: 0.15,
    lz: 198.12,
    epsBar: 1 / 8,
    bBar: 0.8,
    label: "Flat coastal water, category D",
  },
};

export const TALL_SYSTEM_LABELS: Record<TallStructuralSystemKey, string> = {
  rigid_frame: "Rigid concrete frame",
  shear_core: "Shear wall core with frame",
  outrigger: "Core with outriggers and belt trusses",
  tube_in_tube: "Tube in tube, closely spaced perimeter columns",
  mega_frame: "Mega frame with damped outriggers",
};

/**
 * Practical storey ranges for each system. These are planning ranges used in
 * tall building practice, not limits from a code. Above the upper bound the
 * lateral system is normally considered inadequate for wind drift alone.
 */
export const TALL_SYSTEM_RANGES: Record<
  TallStructuralSystemKey,
  { min: number; max: number }
> = {
  rigid_frame: { min: 1, max: 15 },
  shear_core: { min: 8, max: 35 },
  outrigger: { min: 25, max: 70 },
  tube_in_tube: { min: 45, max: 90 },
  mega_frame: { min: 60, max: 140 },
};

export interface TallSoilProperty {
  label: string;
  allowable_bearing_kpa: number;
  cohesion_kpa: number;
  friction_deg: number;
  elastic_modulus_mpa: number;
  unit_weight_kn_m3: number;
}

export const TALL_SOILS: Record<TallSoilKey, TallSoilProperty> = {
  soft_clay: {
    label: "Soft to firm clay",
    allowable_bearing_kpa: 75,
    cohesion_kpa: 40,
    friction_deg: 0,
    elastic_modulus_mpa: 8,
    unit_weight_kn_m3: 17,
  },
  firm_clay: {
    label: "Stiff clay",
    allowable_bearing_kpa: 150,
    cohesion_kpa: 90,
    friction_deg: 0,
    elastic_modulus_mpa: 25,
    unit_weight_kn_m3: 18,
  },
  sandy_clay: {
    label: "Sandy clay",
    allowable_bearing_kpa: 200,
    cohesion_kpa: 50,
    friction_deg: 24,
    elastic_modulus_mpa: 40,
    unit_weight_kn_m3: 19,
  },
  dense_sand: {
    label: "Medium dense to dense sand",
    allowable_bearing_kpa: 300,
    cohesion_kpa: 0,
    friction_deg: 34,
    elastic_modulus_mpa: 70,
    unit_weight_kn_m3: 19,
  },
  gravel: {
    label: "Dense gravel",
    allowable_bearing_kpa: 400,
    cohesion_kpa: 0,
    friction_deg: 38,
    elastic_modulus_mpa: 120,
    unit_weight_kn_m3: 20,
  },
  weathered_rock: {
    label: "Weathered rock",
    allowable_bearing_kpa: 800,
    cohesion_kpa: 200,
    friction_deg: 35,
    elastic_modulus_mpa: 400,
    unit_weight_kn_m3: 22,
  },
};

export const DEFAULT_TALL_INPUT: TallBuildingInput = {
  project_name: "High rise structure and foundation screen",
  floors: 40,
  floor_height: 3.6,
  ground_floor_height: 5.0,
  plan_length: 42,
  plan_width: 32,
  system: "auto",
  concrete_grade_mpa: 45,
  dead_load_kpa: 4.5,
  live_load_kpa: 3.0,
  partition_kpa: 1.5,
  cladding_kpa: 1.2,
  basic_wind_speed_ms: 34,
  terrain_exposure: "B",
  wind_directionality_kd: 0.85,
  force_coefficient_cf: 1.3,
  seismic_sds: 0.35,
  seismic_sd1: 0.15,
  seismic_s1: 0,
  seismic_r: 5.0,
  seismic_importance: 1.0,
  soil_type: "dense_sand",
  spt_n: 30,
  water_table_m: 6,
  pile_diameter_m: 1.5,
  pile_length_m: 55,
  pile_construction: "bored",
  occupancy: "office",
  cycle_days_per_floor: 5,
};

// ── Helpers ──

const round = (value: number, places = 2) => {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** ASCE 7-22 velocity pressure exposure coefficient. */
export function velocityPressureCoefficient(
  z: number,
  exposure: TallExposureKey,
): number {
  const terrain = TERRAIN[exposure];
  const height = Math.max(4.6, z);
  return 2.01 * Math.pow(height / terrain.zg, 2 / terrain.alpha);
}

export interface GustEffectInput {
  height: number;
  /** Width normal to the wind, metres. */
  width: number;
  /** Length parallel to the wind, metres. */
  lengthAlongWind: number;
  frequencyHz: number;
  windSpeedMs: number;
  exposure: TallExposureKey;
  dampingRatio: number;
}

export interface GustEffectResult {
  gustFactor: number;
  turbulenceIntensity: number;
  backgroundFactor: number;
  resonantFactor: number;
  rigid: boolean;
  proof: string[];
}

/**
 * ASCE 7-22 26.11.5 gust effect factor.
 *
 * A building is rigid when its first frequency is at least 1 Hz; below that the
 * resonant response of the structure adds to the background turbulence and the
 * full expression is used. Both branches share the same turbulence intensity and
 * background factor, so the only difference is the resonant term.
 */
export function gustEffectFactor(input: GustEffectInput): GustEffectResult {
  const terrain = TERRAIN[input.exposure];
  const zBar = 0.6 * input.height;
  const iz = terrain.c * Math.pow(10 / Math.max(zBar, 1), 1 / 6);
  const lz = terrain.lz * Math.pow(Math.max(zBar, 1) / 10, terrain.epsBar);
  const q = Math.sqrt(
    1 /
      (1 +
        0.63 *
          Math.pow(
            (Math.min(input.width, input.lengthAlongWind) + input.height) /
              Math.max(lz, 1),
            0.63,
          )),
  );
  const gQ = 3.4;
  // Mean wind speed at the reference height, ASCE 7-22 26.11.5: Vbar = b (z/10)^(1/alpha) V.
  const vBar =
    terrain.bBar *
    Math.pow(Math.max(zBar, 1) / 10, 1 / terrain.alpha) *
    input.windSpeedMs;
  const n1 = Math.max(input.frequencyHz, 0.01);
  const rigid = n1 >= 1;

  const denominator = 1 + 1.7 * gQ * iz;
  if (rigid) {
    const g = (0.925 * (1 + 1.7 * gQ * iz * Math.sqrt(q))) / denominator;
    return {
      gustFactor: clamp(g, 0.8, 1.1),
      turbulenceIntensity: iz,
      backgroundFactor: q,
      resonantFactor: 0,
      rigid: true,
      proof: [
        `Rigid building (f1 = ${round(n1, 3)} Hz): G = 0.925 (1 + 1.7 gQ Iz sqrt(Q)) / (1 + 1.7 gQ Iz)`,
        `Iz = c (10/zbar)^(1/6) = ${round(terrain.c, 2)} (10/${round(zBar, 1)})^(1/6) = ${round(iz, 3)}, Lz = ${round(lz, 1)} m, Q = ${round(q, 3)}`,
      ],
    };
  }

  const n1Lz = (n1 * lz) / Math.max(vBar, 1);
  const rn = (7.47 * n1Lz) / Math.pow(1 + 10.3 * n1Lz, 5 / 3);
  const roughness = (eta: number) =>
    1 / eta - (1 - Math.exp(-2 * eta)) / (2 * eta * eta);
  const rh = roughness((4.6 * n1 * input.height) / Math.max(vBar, 1));
  const rb = roughness((4.6 * n1 * input.width) / Math.max(vBar, 1));
  const rl = roughness((15.4 * n1 * input.lengthAlongWind) / Math.max(vBar, 1));
  const r = Math.sqrt(
    (1 / Math.max(input.dampingRatio, 0.005)) *
      rn *
      rh *
      rb *
      (0.53 + 0.47 * rl),
  );
  const ln = Math.log(3600 * n1);
  const gR =
    Math.sqrt(2 * Math.max(ln, 0.1)) + 0.577 / Math.sqrt(2 * Math.max(ln, 0.1));
  // ASCE 7-22 26.11.5 requires the flexible gust factor to be at least 0.85.
  const gf =
    (0.925 *
      (1 + 1.7 * iz * Math.sqrt(Math.pow(gQ * q, 2) + Math.pow(gR * r, 2)))) /
    denominator;

  return {
    gustFactor: clamp(Math.max(gf, 0.85), 0.85, 1.6),
    turbulenceIntensity: iz,
    backgroundFactor: q,
    resonantFactor: r,
    rigid: false,
    proof: [
      `Flexible building (f1 = ${round(n1, 3)} Hz < 1 Hz): Gf = 0.925 (1 + 1.7 Iz sqrt((gQ Q)² + (gR R)²)) / (1 + 1.7 gQ Iz)`,
      `Iz = ${round(iz, 3)}, Lz = ${round(lz, 1)} m, Q = ${round(q, 3)}, Vbar = ${round(vBar, 1)} m/s, beta = ${input.dampingRatio}`,
      `Rn = ${round(rn, 4)}, Rh = ${round(rh, 4)}, RB = ${round(rb, 4)}, RL = ${round(rl, 4)}, R = ${round(r, 4)}, gR = ${round(gR, 2)}`,
    ],
  };
}

/** ACI 318-19 19.2.2.1a modulus of elasticity for normal weight concrete. */
export function concreteModulusMpa(fckMpa: number): number {
  return 4700 * Math.sqrt(fckMpa);
}

/** Hollow rectangular section second moment of area about the x axis. */
function hollowSectionI(b: number, h: number, t: number): number {
  const innerB = Math.max(0.01, b - 2 * t);
  const innerH = Math.max(0.01, h - 2 * t);
  return (b * Math.pow(h, 3) - innerB * Math.pow(innerH, 3)) / 12;
}

function requiredSystemFor(floors: number): TallStructuralSystemKey {
  if (floors <= 15) return "rigid_frame";
  if (floors <= 35) return "shear_core";
  if (floors <= 70) return "outrigger";
  if (floors <= 90) return "tube_in_tube";
  return "mega_frame";
}

/**
 * ASCE 7-22 4.7.2 live load reduction:
 * L = Lo (0.25 + 4.57 / sqrt(KLL * AT)), not less than 0.50 Lo for members
 * supporting one floor and 0.40 Lo for two or more floors.
 * KLL 4 is used for interior columns.
 */
export function liveLoadReduction(
  tributaryAreaM2: number,
  floors: number,
): number {
  const influence = 4 * Math.max(1, tributaryAreaM2);
  const factor = 0.25 + 4.57 / Math.sqrt(influence);
  const floorLimit = floors >= 2 ? 0.4 : 0.5;
  return clamp(factor, floorLimit, 1);
}

// ── Main calculation ──

export function calculateTallBuilding(
  rawInput: Partial<TallBuildingInput>,
): TallBuildingResult {
  const num = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const D = DEFAULT_TALL_INPUT;

  const input: TallBuildingInput = {
    ...D,
    ...rawInput,
    floors: clamp(Math.round(num(rawInput.floors, D.floors)), 3, 140),
    floor_height: clamp(num(rawInput.floor_height, D.floor_height), 2.4, 6.0),
    ground_floor_height: clamp(
      num(rawInput.ground_floor_height, D.ground_floor_height),
      2.6,
      12.0,
    ),
    plan_length: clamp(num(rawInput.plan_length, D.plan_length), 10, 140),
    plan_width: clamp(num(rawInput.plan_width, D.plan_width), 10, 140),
    concrete_grade_mpa: clamp(
      num(rawInput.concrete_grade_mpa, D.concrete_grade_mpa),
      25,
      80,
    ),
    dead_load_kpa: clamp(num(rawInput.dead_load_kpa, D.dead_load_kpa), 1.5, 15),
    live_load_kpa: clamp(num(rawInput.live_load_kpa, D.live_load_kpa), 1.0, 12),
    partition_kpa: clamp(num(rawInput.partition_kpa, D.partition_kpa), 0, 6),
    cladding_kpa: clamp(num(rawInput.cladding_kpa, D.cladding_kpa), 0.2, 5),
    basic_wind_speed_ms: clamp(
      num(rawInput.basic_wind_speed_ms, D.basic_wind_speed_ms),
      15,
      80,
    ),
    wind_directionality_kd: clamp(
      num(rawInput.wind_directionality_kd, D.wind_directionality_kd),
      0.7,
      1.0,
    ),
    force_coefficient_cf: clamp(
      num(rawInput.force_coefficient_cf, D.force_coefficient_cf),
      0.8,
      2.5,
    ),
    seismic_sds: clamp(num(rawInput.seismic_sds, D.seismic_sds), 0, 2.5),
    seismic_sd1: clamp(num(rawInput.seismic_sd1, D.seismic_sd1), 0, 1.5),
    seismic_s1: clamp(num(rawInput.seismic_s1, D.seismic_s1), 0, 2),
    seismic_r: clamp(num(rawInput.seismic_r, D.seismic_r), 1.5, 8),
    seismic_importance: clamp(
      num(rawInput.seismic_importance, D.seismic_importance),
      1,
      1.5,
    ),
    spt_n: clamp(Math.round(num(rawInput.spt_n, D.spt_n)), 1, 100),
    water_table_m: clamp(num(rawInput.water_table_m, D.water_table_m), 0, 60),
    pile_diameter_m: clamp(
      num(rawInput.pile_diameter_m, D.pile_diameter_m),
      0.4,
      2.5,
    ),
    pile_length_m: clamp(num(rawInput.pile_length_m, D.pile_length_m), 5, 90),
    cycle_days_per_floor: clamp(
      num(rawInput.cycle_days_per_floor, D.cycle_days_per_floor),
      2,
      15,
    ),
    occupancy: (rawInput.occupancy ?? D.occupancy) as TallOccupancy,
  };

  const floors = input.floors;
  const L = input.plan_length;
  const W = input.plan_width;
  const plate = L * W;
  const height = input.ground_floor_height + (floors - 1) * input.floor_height;
  const perimeter = 2 * (L + W);
  const facadeArea = perimeter * height;
  const grossFloorArea = plate * floors;

  // ── Geometry ──
  // Core plan area of 12% of the floor plate is typical for a residential or
  // office tower with lifts, stairs and risers. Exposed as part of geometry.
  const coreAreaRatio = 0.12;
  const coreScale = Math.sqrt(coreAreaRatio);
  const coreLength = L * coreScale;
  const coreWidth = W * coreScale;
  const coreArea = coreLength * coreWidth;
  const coreThickness = clamp(0.3 + 0.004 * floors, 0.3, 0.9);

  // Column grid at roughly 8.5 m spans, which is the economic band for
  // reinforced concrete office floors.
  const gridSpacing = clamp(Math.sqrt(plate) / 4.5, 6, 10);
  const gridX = Math.max(2, Math.round(L / gridSpacing) + 1);
  const gridY = Math.max(2, Math.round(W / gridSpacing) + 1);
  const columnCount = gridX * gridY;

  // Slab depth from the span/depth rule for continuous slabs (L/36 to L/32).
  const typicalSpan = clamp(Math.max(L, W) / Math.max(2, gridX - 1), 4, 12);
  const slabThickness = clamp(round(typicalSpan / 34, 2), 0.15, 0.4);

  const geometry: TallGeometry = {
    total_height_m: round(height),
    floor_plate_m2: round(plate, 1),
    gross_floor_area_m2: round(grossFloorArea, 1),
    facade_area_m2: round(facadeArea, 1),
    slenderness_ratio: round(height / Math.min(L, W)),
    core_plan_area_m2: round(coreArea, 1),
    core_length_m: round(coreLength, 2),
    core_width_m: round(coreWidth, 2),
    core_wall_thickness_m: round(coreThickness, 2),
    column_grid_x: gridX,
    column_grid_y: gridY,
    column_count: columnCount,
    typical_slab_thickness_m: slabThickness,
  };

  // ── System selection ──
  const requiredSystem = requiredSystemFor(floors);
  const selectedSystem: TallStructuralSystemKey =
    input.system === "auto" ? requiredSystem : input.system;
  const range = TALL_SYSTEM_RANGES[selectedSystem];
  const withinRange = floors >= range.min && floors <= range.max;

  const system: TallSystemAssessment = {
    selected: selectedSystem,
    selected_label: TALL_SYSTEM_LABELS[selectedSystem],
    recommended: requiredSystem,
    recommended_label: TALL_SYSTEM_LABELS[requiredSystem],
    within_practical_range: withinRange,
    note:
      input.system === "auto"
        ? `Selected automatically from the storey count. ${TALL_SYSTEM_LABELS[requiredSystem]} is the usual system between ${range.min} and ${range.max} storeys.`
        : withinRange
          ? `${TALL_SYSTEM_LABELS[selectedSystem]} is within its usual ${range.min} to ${range.max} storey range for this height.`
          : `${TALL_SYSTEM_LABELS[selectedSystem]} is normally used between ${range.min} and ${range.max} storeys, so ${TALL_SYSTEM_LABELS[requiredSystem]} is the expected system at ${floors} storeys.`,
  };

  // ── Gravity ──
  const tributaryArea = plate / columnCount;
  const reduction = liveLoadReduction(tributaryArea, floors);
  const reducedLive = input.live_load_kpa * reduction;
  const deadPerFloor = input.dead_load_kpa + input.partition_kpa;

  // Structural self weight is computed here rather than buried in the entered
  // dead load, so every tonne at the base can be traced.
  const coreConcreteVolume = perimeterCoreConcrete(
    coreLength,
    coreWidth,
    coreThickness,
    height,
  );
  const coreSelfWeightMn = (coreConcreteVolume * 24) / 1000; // MN
  const facadeWeightMn = (facadeArea * input.cladding_kpa) / 1000;
  const slabVolumeForLoad = plate * slabThickness * floors;
  const slabSelfWeightKpa = slabThickness * 24;
  const beamAllowanceKpa = 0.02 * 24; // 0.02 m³ of beams per m² of floor
  const totalDeadPerFloorKpa =
    deadPerFloor + slabSelfWeightKpa + beamAllowanceKpa;

  // Column axial from its tributary area over all floors above. The column's own
  // self weight is added after sizing, so the sizing step has no circularity.
  const baseAxialPerColumn =
    (tributaryArea * (totalDeadPerFloorKpa + reducedLive) * floors) / 1000;
  // Service axial stress for a stocky reinforced column is about 0.30 fck when
  // the reinforcement ratio is 1 to 2 percent. Used for sizing only.
  const allowedAxialStressMpa = 0.3 * input.concrete_grade_mpa;
  const requiredColumnAreaM2 =
    (baseAxialPerColumn * 1000) / (allowedAxialStressMpa * 1000);
  const columnSizeM = clamp(
    Math.ceil(Math.sqrt(requiredColumnAreaM2) * 20) / 20,
    0.4,
    2.0,
  );
  const columnSizeMm = Math.round(columnSizeM * 1000);

  const columnVolumeForLoad =
    columnCount * Math.pow(columnSizeM, 2) * height * 0.7;
  const columnSelfWeightMn = (columnVolumeForLoad * 24) / 1000;
  const totalGravityMn =
    (floors * plate * (totalDeadPerFloorKpa + reducedLive)) / 1000 +
    coreSelfWeightMn +
    facadeWeightMn +
    columnSelfWeightMn;

  // The core carries the floor load within its own zone plus half a bay around
  // it, which is 1.8 times the core plan area. Core gravity is a different
  // quantity from the core share of the lateral shear.
  const coreGravityMn =
    (coreArea * (totalDeadPerFloorKpa + reducedLive) * 1.8 * floors) / 1000 +
    coreSelfWeightMn;

  const gravity: TallGravityResult = {
    superimposed_dead_kpa: round(deadPerFloor),
    total_dead_kpa: round(totalDeadPerFloorKpa),
    live_load_reduction_factor: round(reduction, 2),
    reduced_live_kpa: round(reducedLive),
    total_gravity_load_mn: round(totalGravityMn, 1),
    base_axial_per_column_mn: round(baseAxialPerColumn),
    column_size_mm: columnSizeMm,
    core_axial_share_mn: round(coreGravityMn, 1),
    note: `Live load reduced by ASCE 7-22 4.7.2 with KLL 4 and a ${round(tributaryArea, 1)} m² tributary area. The core share of 45 percent is a planning assumption for a core and frame system.`,
  };

  // ── Wind ──
  // ASCE 7-22 chapter 27 along wind procedure: velocity pressure from the
  // exposure profile, a gust effect factor from 26.11.5, and a force
  // coefficient on the loaded face. Forces are integrated storey by storey in
  // both plan directions, because the narrow face governs overturning while the
  // wide face governs base shear.
  const terrain = TERRAIN[input.terrain_exposure];
  const kzTop = velocityPressureCoefficient(height, input.terrain_exposure);
  const qzTopKpa =
    (0.613 *
      kzTop *
      input.wind_directionality_kd *
      Math.pow(input.basic_wind_speed_ms, 2)) /
    1000;

  // First period of the lateral system. For a cantilever with uniformly
  // distributed mass and stiffness, f1 = 0.560 sqrt(EI / (m H^4)). The core
  // carries the lateral system, and the system share below represents the frame,
  // outriggers or perimeter tube acting with it. The same number drives the gust
  // factor, so the wind load and the stiffness model cannot drift apart.
  // Lateral stiffness is derived from the plan, not from a multiplier. A frame
  // resists overturning through the axial couple in its columns, so its stiffness
  // is the sum of column area times distance squared about the axis. A tube adds
  // the perimeter treated as a thin wall. The core contributes its own section.
  // The engagement fractions below say how much of that perimeter stiffness the
  // system actually mobilises: an outrigger engages the perimeter at one or two
  // levels, a tube engages it continuously. They are calibration factors for
  // early sizing, and a real analysis replaces them.
  const columnAreaM2 = Math.pow(columnSizeM, 2);
  const spacingY = W / Math.max(gridY - 1, 1);
  const spacingX = L / Math.max(gridX - 1, 1);
  const sumOfSquares = (count: number, spacing: number) =>
    (count * (count * count - 1) * spacing * spacing) / 12;
  const frameIWeak = columnAreaM2 * gridX * sumOfSquares(gridY, spacingY);
  const frameIStrong = columnAreaM2 * gridY * sumOfSquares(gridX, spacingX);
  const equivalentWallThickness = columnAreaM2 / Math.max(spacingY, 1);
  const tubeIWeak = hollowSectionI(L, W, equivalentWallThickness);
  const tubeIStrong = hollowSectionI(W, L, equivalentWallThickness);

  const coreIWeak = hollowSectionI(coreLength, coreWidth, coreThickness);
  const coreIStrong = hollowSectionI(coreWidth, coreLength, coreThickness);

  const stiffnessBuild = (
    coreI: number,
    frameI: number,
    tubeI: number,
  ): { effectiveI: number; note: string } => {
    switch (selectedSystem) {
      case "rigid_frame":
        return {
          effectiveI: 0.5 * frameI,
          note: "rigid frame: half the column axial stiffness",
        };
      case "shear_core":
        return {
          effectiveI: coreI + 0.08 * frameI,
          note: "core plus 8 percent of the frame axial stiffness",
        };
      case "outrigger":
        return {
          effectiveI: coreI + 0.18 * frameI,
          note: "core plus 18 percent of the perimeter axial stiffness through the outriggers",
        };
      case "tube_in_tube":
        return {
          effectiveI: coreI + 0.6 * tubeI,
          note: "core plus 60 percent of the perimeter tube stiffness",
        };
      case "mega_frame":
        return {
          effectiveI: coreI + 0.45 * frameI,
          note: "core plus 45 percent of the mega frame axial stiffness",
        };
    }
  };

  const stiffnessWeak = stiffnessBuild(coreIWeak, frameIWeak, tubeIWeak);
  const stiffnessStrong = stiffnessBuild(
    coreIStrong,
    frameIStrong,
    tubeIStrong,
  );

  const ecMpa = concreteModulusMpa(input.concrete_grade_mpa);
  // ACI 318-19 table 6.6.3.1.1: cracked wall stiffness 0.70 for service analysis.
  const ecEffectiveKpa = ecMpa * 1000 * 0.7;
  const eiWeak = ecEffectiveKpa * stiffnessWeak.effectiveI; // kN m²
  const eiStrong = ecEffectiveKpa * stiffnessStrong.effectiveI;

  const massKg = (totalGravityMn * 1e6) / 9.81;
  const massPerMetreKg = massKg / Math.max(height, 1);
  const firstFrequencyHz =
    0.56 * Math.sqrt((eiWeak * 1000) / (massPerMetreKg * Math.pow(height, 4)));
  const firstPeriodS = 1 / Math.max(firstFrequencyHz, 0.01);
  const ta = 0.02 * Math.pow(height, 0.75); // ASCE 7-22 table 12.8-2

  const gust = gustEffectFactor({
    height,
    width: Math.min(L, W),
    lengthAlongWind: Math.max(L, W),
    frequencyHz: firstFrequencyHz,
    windSpeedMs: input.basic_wind_speed_ms,
    exposure: input.terrain_exposure,
    dampingRatio: 0.02,
  });
  const gustFactor = gust.gustFactor;

  interface LevelForce {
    /** Height to the mid height of the storey, m. */
    z: number;
    /** Storey height, m. */
    dz: number;
    /** Wind force on the storey, kN. */
    force: number;
  }

  interface DirectionResult {
    /** Base shear in kN. */
    shear: number;
    /** Overturning moment about the base in kNm. */
    moment: number;
    face: "short" | "long";
    levels: LevelForce[];
    ei: number;
    shearArea: number;
  }

  const windDirection = (
    faceWidth: number,
    face: "short" | "long",
  ): DirectionResult => {
    const levels: LevelForce[] = [];
    let shear = 0;
    let moment = 0;
    let z = 0;
    for (let level = 1; level <= floors; level += 1) {
      const storeyHeight =
        level === 1 ? input.ground_floor_height : input.floor_height;
      const midHeight = z + storeyHeight / 2;
      const kz = velocityPressureCoefficient(midHeight, input.terrain_exposure);
      const qz =
        (0.613 *
          kz *
          input.wind_directionality_kd *
          Math.pow(input.basic_wind_speed_ms, 2)) /
        1000;
      const force =
        qz * gustFactor * input.force_coefficient_cf * faceWidth * storeyHeight;
      levels.push({ z: midHeight, dz: storeyHeight, force });
      shear += force;
      moment += force * midHeight;
      z += storeyHeight;
    }
    // Wind on the long face bends the core about its weak axis, so the core
    // width is the depth in I = b h³ / 12. The shear area is the two webs
    // parallel to the wind, which is 2 t times the depth.
    const depth = face === "long" ? coreWidth : coreLength;
    return {
      shear,
      moment,
      face,
      levels,
      ei: face === "long" ? eiWeak : eiStrong,
      shearArea: Math.max(2 * coreThickness * depth, 0.5),
    };
  };

  interface DriftProfile {
    topMm: number;
    flexuralMm: number;
    shearMm: number;
    storeyDriftsMm: number[];
    maxStoreyDriftMm: number;
    maxStoreyDriftRatio: number;
    maxTheta: number;
    thetaLevel: number;
  }

  const analyseDrift = (direction: DirectionResult): DriftProfile => {
    const levels = direction.levels;
    const n = levels.length;
    // G = E / (2(1 + v)) with v = 0.2, on the same cracked modulus.
    const shearModulusKpa = ecEffectiveKpa / 2.4;
    const ga = Math.max(shearModulusKpa * direction.shearArea, 1);

    const shearAt = new Array<number>(n).fill(0);
    const momentAt = new Array<number>(n).fill(0);
    for (let i = n - 1; i >= 0; i -= 1) {
      let v = 0;
      let m = 0;
      for (let j = i; j < n; j += 1) {
        v += levels[j].force;
        m += levels[j].force * (levels[j].z - levels[i].z);
      }
      shearAt[i] = v;
      momentAt[i] = m;
    }

    const displacement = new Array<number>(n + 1).fill(0);
    let flexuralTop = 0;
    let shearTop = 0;
    for (let k = 0; k < n; k += 1) {
      const zTop = levels[k].z + levels[k].dz / 2;
      let flexural = 0;
      let shear = 0;
      for (let i = 0; i <= k; i += 1) {
        flexural +=
          (momentAt[i] * (zTop - levels[i].z) * levels[i].dz) / direction.ei;
        shear += (shearAt[i] * levels[i].dz) / ga;
      }
      displacement[k + 1] = (flexural + shear) * 1000; // mm
      if (k === n - 1) {
        flexuralTop = flexural * 1000;
        shearTop = shear * 1000;
      }
    }

    const storeyDriftsMm = displacement
      .slice(1)
      .map((value, index) => value - displacement[index]);

    let maxStoreyDriftMm = 0;
    let maxStoreyDriftRatio = 0;
    let maxTheta = 0;
    let thetaLevel = 0;
    let runningHeight = 0;
    for (let k = 0; k < n; k += 1) {
      runningHeight += levels[k].dz;
      const ratio = storeyDriftsMm[k] / 1000 / levels[k].dz;
      if (ratio > maxStoreyDriftRatio) {
        maxStoreyDriftRatio = ratio;
        maxStoreyDriftMm = storeyDriftsMm[k];
      }
      // Stability coefficient at this storey: P above times the storey drift
      // divided by the storey shear times the storey height (ASCE 7-22 12.8.7).
      const gravityAbove = totalGravityMn * (1 - runningHeight / height);
      const theta =
        (gravityAbove * 1000 * (storeyDriftsMm[k] / 1000)) /
        Math.max(shearAt[k] * levels[k].dz, 1e-6);
      if (theta > maxTheta) {
        maxTheta = theta;
        thetaLevel = k + 1;
      }
    }

    const topMm = displacement[n];
    return {
      topMm,
      flexuralMm: flexuralTop,
      shearMm: shearTop,
      storeyDriftsMm,
      maxStoreyDriftMm,
      maxStoreyDriftRatio,
      maxTheta,
      thetaLevel,
    };
  };

  const windLong = windDirection(L, "long"); // wind on the long face
  const windShort = windDirection(W, "short"); // wind on the short face
  const governing = windLong.moment >= windShort.moment ? windLong : windShort;

  const driftProfile = analyseDrift(governing);
  // Stiffness uncertainty: a plus or minus 50 percent band on the assumed
  // engagement gives the drift range a reviewer needs to see.
  const driftBandHigh = driftProfile.topMm / 1.5;
  const driftBandLow = driftProfile.topMm * 1.5;

  const drift = driftProfile.topMm;
  const driftLimit500 = (height * 1000) / 500;
  const driftLimit400 = (height * 1000) / 400;
  const storeyDriftLimit = (input.floor_height * 1000) / 400;
  const stabilityCoefficient = driftProfile.maxTheta;

  const windTunnelAdvised =
    height > 120 ||
    geometry.slenderness_ratio > 6 ||
    drift > driftLimit500 ||
    gust.rigid === false;

  const periodRatio = firstPeriodS / Math.max(ta, 0.01);

  const wind: TallWindResult = {
    kz_top: round(kzTop, 3),
    velocity_pressure_top_kpa: round(qzTopKpa, 3),
    gust_factor: round(gustFactor, 3),
    rigid_building: gust.rigid,
    natural_frequency_hz: round(firstFrequencyHz, 3),
    natural_period_s: round(firstPeriodS, 2),
    period_vs_approximate_ratio: round(periodRatio, 2),
    base_shear_mn: round(governing.shear / 1000, 2),
    overturning_moment_mnm: round(governing.moment / 1000, 1),
    governing_face: governing.face,
    drift_top_mm: round(drift, 1),
    drift_band_mm: [round(driftBandHigh, 1), round(driftBandLow, 1)],
    effective_stiffness_note: `${governing.face === "long" ? stiffnessWeak.note : stiffnessStrong.note}; I = ${round(governing.face === "long" ? stiffnessWeak.effectiveI : stiffnessStrong.effectiveI, 0)} m^4`,
    flexural_drift_mm: round(driftProfile.flexuralMm, 1),
    shear_drift_mm: round(driftProfile.shearMm, 1),
    storey_drift_max_mm: round(driftProfile.maxStoreyDriftMm, 1),
    storey_drift_limit_mm: round(storeyDriftLimit, 1),
    storey_drift_ratio: round(
      1 / Math.max(driftProfile.maxStoreyDriftRatio, 1e-9),
      0,
    ),
    storey_drift_ok: driftProfile.maxStoreyDriftMm <= storeyDriftLimit,
    drift_limit_h_over_500_mm: round(driftLimit500, 1),
    drift_limit_h_over_400_mm: round(driftLimit400, 1),
    drift_ratio: round((height * 1000) / Math.max(drift, 0.001), 0),
    passes_h_over_500: drift <= driftLimit500,
    passes_h_over_400: drift <= driftLimit400,
    stability_coefficient: round(stabilityCoefficient, 3),
    theta_level: driftProfile.thetaLevel,
    wind_tunnel_advised: windTunnelAdvised,
    proof: [
      `Kz at ${round(height, 1)} m, exposure ${input.terrain_exposure} (alpha ${terrain.alpha}, zg ${terrain.zg} m): 2.01 (z/zg)^(2/alpha) = ${round(kzTop, 3)}`,
      `qz at the top = 0.613 Kz Kd V² = 0.613 · ${round(kzTop, 3)} · ${input.wind_directionality_kd} · ${input.basic_wind_speed_ms}² = ${round(qzTopKpa, 3)} kPa`,
      `Gust factor G = ${round(gustFactor, 3)} from ASCE 7-22 26.11.5 with Iz = ${round(gust.turbulenceIntensity, 3)}, Q = ${round(gust.backgroundFactor, 3)}, R = ${round(gust.resonantFactor, 3)} using f1 = ${round(firstFrequencyHz, 3)} Hz`,
      `Storey by storey integration gives base shear ${round(governing.shear / 1000, 2)} MN on the ${governing.face} face and overturning ${round(governing.moment / 1000, 1)} MNm`,
      `Lateral stiffness: core ${round(governing.face === "long" ? coreIWeak : coreIStrong, 0)} m^4 plus perimeter (${governing.face === "long" ? stiffnessWeak.note : stiffnessStrong.note}) = ${round(governing.face === "long" ? stiffnessWeak.effectiveI : stiffnessStrong.effectiveI, 0)} m^4, Ec = 4700 sqrt(${input.concrete_grade_mpa}) = ${round(ecMpa, 0)} MPa cracked 0.70`,
      `First period f1 = 0.560 sqrt(EI / (m H^4)) = ${round(firstFrequencyHz, 3)} Hz, so T = ${round(firstPeriodS, 2)} s against the code approximation Ta = ${round(ta, 2)} s (ratio ${round(periodRatio, 2)})`,
      `Top drift ${round(drift, 1)} mm (${round(driftBandHigh, 0)} to ${round(driftBandLow, 0)} mm on a plus or minus 50 percent stiffness band), of which ${round(driftProfile.flexuralMm, 1)} mm flexural and ${round(driftProfile.shearMm, 1)} mm shear, H/${round((height * 1000) / Math.max(drift, 0.001), 0)}`,
      `Largest storey drift ${round(driftProfile.maxStoreyDriftMm, 1)} mm at 1 in ${round(1 / Math.max(driftProfile.maxStoreyDriftRatio, 1e-9), 0)} of the storey height, stability coefficient ${round(stabilityCoefficient, 3)} at storey ${driftProfile.thetaLevel}`,
    ],
  };

  // ── Seismic ──
  // ASCE 7-22 12.7.2 seismic weight is dead load plus permanent partitions,
  // with no live load for office and residential occupancy.
  // Seismic weight must include everything that moves with the building:
  // dead load, partitions, slab and beams, core walls, columns and facade.
  const seismicWeightMn =
    (floors * plate * totalDeadPerFloorKpa) / 1000 +
    facadeWeightMn +
    coreSelfWeightMn +
    columnSelfWeightMn;
  // ASCE 7-22 12.8.2.1 uses the approximate period without an upper limit for
  // the base shear when the approximate method is used directly.
  const periodS = ta;
  const csBase =
    input.seismic_sds / (input.seismic_r / input.seismic_importance);
  const ts =
    input.seismic_sd1 > 0 ? input.seismic_sds / input.seismic_sd1 : Infinity;
  const csCapped =
    periodS > ts && input.seismic_sd1 > 0
      ? Math.min(
          csBase,
          input.seismic_sd1 /
            (periodS * (input.seismic_r / input.seismic_importance)),
        )
      : csBase;
  // Two floors apply. ASCE 7-22 12.8.1.1: Cs is not less than 0.044 SDS Ie, and
  // where S1 is 0.6 or greater it is also not less than 0.5 S1 / (R/Ie).
  const csMinShort = 0.044 * input.seismic_sds * input.seismic_importance;
  const csMinLong =
    input.seismic_s1 >= 0.6
      ? (0.5 * input.seismic_s1) / (input.seismic_r / input.seismic_importance)
      : 0;
  const csFloor = Math.max(csMinShort, csMinLong);
  const cs = Math.max(csFloor, csCapped);

  // ASCE 7-22 12.8.3 vertical distribution: the exponent k is 1 up to 0.5 s,
  // varies linearly to 2 at 2.5 s, and stays at 2 beyond. The base moment is
  // V times the height of the resultant, not a fixed fraction of the height.
  const kExponent =
    periodS <= 0.5 ? 1 : periodS >= 2.5 ? 2 : 1 + (periodS - 0.5) / 2;
  let weightHeightK = 0;
  let weightHeightKPlus1 = 0;
  {
    let z = 0;
    for (let level = 1; level <= floors; level += 1) {
      const storeyHeight =
        level === 1 ? input.ground_floor_height : input.floor_height;
      const midHeight = z + storeyHeight / 2;
      const weightShare = storeyHeight; // uniform storey weight per metre of height
      weightHeightK += weightShare * Math.pow(midHeight, kExponent);
      weightHeightKPlus1 += weightShare * Math.pow(midHeight, kExponent + 1);
      z += storeyHeight;
    }
  }
  const resultantHeight = weightHeightKPlus1 / Math.max(weightHeightK, 1e-9);
  const seismicBaseShear = cs * seismicWeightMn;
  const seismicMoment = seismicBaseShear * resultantHeight;

  const seismic: TallSeismicResult = {
    approximate_period_s: round(periodS, 2),
    spectral_response_acceleration: round(cs, 3),
    k_exponent: round(kExponent, 2),
    resultant_height_m: round(resultantHeight, 1),
    cs_floor: round(csFloor, 3),
    base_shear_mn: round(seismicBaseShear, 2),
    overturning_moment_mnm: round(seismicMoment, 1),
    seismic_weight_mn: round(seismicWeightMn, 1),
    governs_over_wind: seismicBaseShear > governing.shear / 1000,
    proof: [
      `Approximate period Ta = Ct H^x = 0.02 · ${round(height, 1)}^0.75 = ${round(periodS, 2)} s (ASCE 7-22 table 12.8-2, all other systems)`,
      `Cs = SDS / (R/Ie) = ${input.seismic_sds} / (${input.seismic_r}/${input.seismic_importance}) = ${round(csBase, 3)}, capped by SD1/(T R/Ie) and floored at max(0.044 SDS Ie, ${input.seismic_s1 >= 0.6 ? "0.5 S1/(R/Ie)" : "no long period floor"}) = ${round(csFloor, 3)}, giving Cs = ${round(cs, 3)}`,
      `Seismic weight from dead load only = ${round(seismicWeightMn, 1)} MN, base shear V = Cs W = ${round(seismicBaseShear, 2)} MN`,
      `Vertical distribution exponent k = ${round(kExponent, 2)} for T = ${round(periodS, 2)} s, so the resultant sits at ${round(resultantHeight, 1)} m and the base moment = V · ${round(resultantHeight, 1)} = ${round(seismicMoment, 1)} MNm`,
    ],
  };

  // ── Foundation ──
  const soil = TALL_SOILS[input.soil_type];
  const raftThickness = clamp(round(1.0 + 0.03 * floors, 2), 1.0, 4.0);
  const raftSelfWeightMn = (plate * raftThickness * 24) / 1000;
  const serviceLoadMn = totalGravityMn + raftSelfWeightMn;

  const raftI = (L * Math.pow(W, 3)) / 12;
  const raftSectionModulus = raftI / (W / 2);
  const governingMomentMnm = Math.max(governing.moment / 1000, seismicMoment);
  const pressureAxial = (serviceLoadMn * 1000) / plate; // kPa
  const pressureBending = (governingMomentMnm * 1000) / raftSectionModulus; // kPa
  // Which pressure model applies depends on the foundation. A raft carries the
  // axial load and the moment together. Once piles exist, the moment is carried
  // by the pile group as a couple, so the raft contact pressure is the axial
  // term only and the piles are checked separately for the maximum pile load.
  const bearingPressureRaftOnly = pressureAxial + pressureBending;

  // Pile capacity, alpha method in clay and beta method in sand.
  const diameter = input.pile_diameter_m;
  const pileArea = (Math.PI * diameter * diameter) / 4;
  const pilePerimeter = Math.PI * diameter;
  const midDepth = input.pile_length_m / 2;
  const aboveWater = Math.min(midDepth, input.water_table_m);
  const belowWater = Math.max(0, midDepth - input.water_table_m);
  const verticalStressAtMid = Math.max(
    10,
    soil.unit_weight_kn_m3 * aboveWater +
      (soil.unit_weight_kn_m3 - 9.81) * belowWater,
  );

  const isCohesive = soil.cohesion_kpa > 0;
  const alpha = input.pile_construction === "bored" ? 0.45 : 0.6;
  // Sands use the beta method for shaft friction. Beta ranges from about 0.3 to
  // 0.4 for bored and driven piles; the driven value is the higher one.
  const beta = input.pile_construction === "bored" ? 0.35 : 0.45;
  const shaftCapacityKn = isCohesive
    ? alpha * soil.cohesion_kpa * pilePerimeter * input.pile_length_m
    : clamp(beta * verticalStressAtMid, 10, 150) *
      pilePerimeter *
      input.pile_length_m;

  // Meyerhof (1976) SPT method for sand: qp = 40 N (L/D), capped at 400 N, in kPa.
  const pileSlenderness = input.pile_length_m / diameter;
  const tipStressSand = clamp(
    Math.min(40 * input.spt_n * pileSlenderness, 400 * input.spt_n),
    500,
    12000,
  );
  const baseCapacityKn = isCohesive
    ? 9 * soil.cohesion_kpa * pileArea
    : tipStressSand * pileArea;

  // Bored piles mobilise less base resistance than driven piles because of
  // base cleanliness, so the base term is reduced by 30 percent, a common
  // preliminary allowance rather than a code factor.
  const baseReduction = input.pile_construction === "bored" ? 0.7 : 1.0;
  const ultimatePileKn = shaftCapacityKn + baseCapacityKn * baseReduction;
  const allowablePileKn = Math.max(150, ultimatePileKn / 2.5);

  const pilesForLoad = Math.ceil((serviceLoadMn * 1000) / allowablePileKn);
  // Pile group behaviour. The overturning moment is carried as a couple, so the
  // governing pile load is not the average: for a rigid cap the elastic
  // distribution gives N(x) = P/n ± 12 M x / (n B²), which is the familiar
  // (P/n)(1 ± 6e/B) form at the face. The count is set so the peak, not the
  // average, fits the allowable capacity.
  const eccentricity = governingMomentMnm / Math.max(serviceLoadMn, 0.001);
  const bendingWidth = Math.min(L, W);
  const momentAmplification = 1 + (6 * eccentricity) / bendingWidth;

  const raftOnlyWorks =
    bearingPressureRaftOnly <= soil.allowable_bearing_kpa && floors <= 15;
  // Group efficiency falls as the count rises, so the count is solved by
  // iteration rather than by one division: each pass recomputes the efficiency
  // for the current group and the number of piles the reduced capacity needs.
  const groupEfficiencyFor = (count: number): number => {
    if (count <= 0) return 1;
    const spacing = Math.sqrt(plate / count);
    const angle =
      (Math.atan(diameter / Math.max(spacing, 0.01)) * 180) / Math.PI;
    const columns = Math.max(
      1,
      Math.round(Math.sqrt(count * (L / Math.max(W, 1)))),
    );
    const rows = Math.max(1, Math.ceil(count / columns));
    const raw =
      1 -
      ((angle / 90) * ((rows - 1) * columns + (columns - 1) * rows)) /
        (columns * rows);
    // Converse-Labarre is known to be severe for large friction groups, so the
    // screening value is floored at 0.70 and the assumption is stated.
    return clamp(raw, 0.7, 1);
  };

  let pilesRequired = 0;
  if (!raftOnlyWorks) {
    pilesRequired = Math.max(4, pilesForLoad);
    for (let pass = 0; pass < 20; pass += 1) {
      const capacity = allowablePileKn * groupEfficiencyFor(pilesRequired);
      const needed = Math.ceil(
        (serviceLoadMn * 1000 * momentAmplification) / capacity,
      );
      if (needed <= pilesRequired) break;
      pilesRequired = needed;
    }
  }

  // Converse-Labarre group efficiency: closely spaced piles shield each other,
  // so the group is worth less than the sum of its piles.
  const pileSpacing = pilesRequired > 0 ? Math.sqrt(plate / pilesRequired) : 0;
  const columnsInGroup = Math.max(
    1,
    Math.round(Math.sqrt(pilesRequired * (L / Math.max(W, 1)))),
  );
  const rowsInGroup = Math.max(1, Math.ceil(pilesRequired / columnsInGroup));
  const groupEfficiency =
    pilesRequired === 0 ? 1 : groupEfficiencyFor(pilesRequired);
  const groupAllowableKn = allowablePileKn * groupEfficiency;

  const pileMaxLoadKn =
    pilesRequired > 0
      ? ((serviceLoadMn * 1000) / pilesRequired) * momentAmplification
      : 0;
  // The far face can go into tension. That is a real design case: the pile must
  // be detailed for uplift, and the cap for the reversal.
  const pileMinLoadKn =
    pilesRequired > 0
      ? ((serviceLoadMn * 1000) / pilesRequired) *
        (1 - (6 * eccentricity) / bendingWidth)
      : 0;
  const pileTensionKn = Math.max(0, -pileMinLoadKn);
  const tensionPileFraction =
    pilesRequired > 0 && eccentricity > bendingWidth / 6
      ? Math.max(0, 0.5 - bendingWidth / (12 * eccentricity))
      : 0;
  const pilesInTension =
    pilesRequired > 0 ? Math.round(tensionPileFraction * pilesRequired) : 0;
  const pileLoadOk =
    pilesRequired === 0 || pileMaxLoadKn <= groupAllowableKn * 1.001;

  const pileSpacingOk = pilesRequired === 0 || pileSpacing >= 2.5 * diameter;

  const bearingPressureMax =
    pilesRequired > 0 ? pressureAxial : bearingPressureRaftOnly;
  const bearingUtilisation =
    (bearingPressureMax / soil.allowable_bearing_kpa) * 100;
  const raftAloneOk = bearingPressureRaftOnly <= soil.allowable_bearing_kpa;
  // The scheme carries the load when either the raft alone is adequate, or the
  // piles are within capacity and spaced workably.
  // The bearing flag describes the soil contact pressure against the allowable,
  // so it has to agree with the utilisation printed beside it. Reading it from
  // the pile check produced a foundation reported as bearing OK at 368 percent
  // of the allowable, because the piles happened to fit. Whether the scheme
  // carries the load is reported by pile_load_ok, pile_spacing_ok, settlement_ok
  // and punching_ok, each on its own criterion.
  const bearingOk = raftAloneOk;

  // Settlement. A raft is treated as a rigid footing on an elastic half space,
  // q B (1 - v²) / Es with v = 0.3. A pile group is treated as an equivalent
  // raft at two thirds of the pile length, where the load has spread at 1 in 4
  // from the group perimeter. Both use the soil modulus at the level doing the
  // work. Settlement prediction is uncertain, so the result is reported with a
  // band and the design issue is angular distortion, not total settlement.
  const poissonFactor = 1 - 0.3 * 0.3;
  const equivalentRaftDepth = (2 / 3) * input.pile_length_m;
  const equivalentRaftWidth = W + equivalentRaftDepth / 2;
  const equivalentRaftLength = L + equivalentRaftDepth / 2;
  const equivalentRaftArea = equivalentRaftWidth * equivalentRaftLength;
  const equivalentRaftPressure = (serviceLoadMn * 1000) / equivalentRaftArea;
  const raftSettlementMm =
    ((bearingPressureMax * Math.min(W, L) * poissonFactor) /
      (soil.elastic_modulus_mpa * 1000)) *
    1000;
  // Confinement raises the modulus at depth; 2 is a planning multiplier.
  const pileSettlementMm =
    ((equivalentRaftPressure * equivalentRaftWidth * poissonFactor) /
      (soil.elastic_modulus_mpa * 2000)) *
    1000;
  const estimatedSettlementMm = round(
    pilesRequired > 0 ? pileSettlementMm : raftSettlementMm,
    1,
  );
  const settlementBandMm: [number, number] = [
    round(estimatedSettlementMm * 0.5, 1),
    round(estimatedSettlementMm * 1.5, 1),
  ];
  // Differential settlement between adjacent columns drives the facade and the
  // lifts; half the total settlement over the plan width is the usual screening
  // assumption, and 1 in 500 is the common distortion limit.
  const differentialSettlementMm = round(estimatedSettlementMm * 0.5, 1);
  const angularDistortion = Math.round(
    (bendingWidth * 1000) / Math.max(differentialSettlementMm, 0.1),
  );
  const settlementOk = estimatedSettlementMm <= 150 && angularDistortion >= 500;

  // Punching shear where the core meets the raft, EN 1992-1-1 6.4.4 form:
  // v_Ed = N / (u d) against v_Rd,c = 0.12 k (100 rho fck)^(1/3).
  // Core self weight is already inside coreGravityMn.
  const coreLoadMn = gravity.core_axial_share_mn;
  const effectiveDepth = Math.max(raftThickness - 0.1, 0.2);
  const criticalPerimeter = 2 * (coreLength + coreWidth) + 4 * effectiveDepth;
  const punchingStressMpa =
    (coreLoadMn * 1000) / (criticalPerimeter * effectiveDepth) / 1000;
  const kSize = Math.min(1 + Math.sqrt(200 / (effectiveDepth * 1000)), 2);
  const reinforcementRatio = 0.005;
  const punchingResistanceMpa =
    0.12 *
    kSize *
    Math.pow(100 * reinforcementRatio * input.concrete_grade_mpa, 1 / 3);
  const punchingRatio =
    punchingStressMpa / Math.max(punchingResistanceMpa, 0.01);
  const punchingOk = punchingRatio <= 1;

  const foundationType: TallFoundationKey =
    floors <= 12 && bearingOk
      ? "raft"
      : bearingOk && floors <= 30
        ? "thick_raft"
        : "piled_raft";
  const foundationLabel =
    foundationType === "raft"
      ? "Raft foundation"
      : foundationType === "thick_raft"
        ? "Thick raft, checked for punching around the core"
        : "Piled raft, piles carry the excess over the raft contribution";

  const foundation: TallFoundationResult = {
    foundation_type: foundationType,
    foundation_label: foundationLabel,
    raft_thickness_m: raftThickness,
    raft_area_m2: round(plate, 1),
    service_load_mn: round(serviceLoadMn, 1),
    bearing_pressure_max_kpa: round(bearingPressureMax, 1),
    allowable_bearing_kpa: soil.allowable_bearing_kpa,
    bearing_utilisation_pct: round(bearingUtilisation, 1),
    bearing_ok: bearingOk,
    raft_alone_ok: raftAloneOk,
    piles_required: pilesRequired,
    pile_max_load_kn: round(pileMaxLoadKn, 0),
    pile_load_ok: pileLoadOk,
    pile_tension_kn: round(pileTensionKn, 0),
    piles_in_tension: pilesInTension,
    group_efficiency: round(groupEfficiency, 3),
    group_allowable_kn: round(groupAllowableKn, 0),
    eccentricity_m: round(eccentricity, 2),
    pile_capacity_ultimate_kn: round(ultimatePileKn, 0),
    pile_capacity_allowable_kn: round(allowablePileKn, 0),
    pile_shaft_kn: round(shaftCapacityKn, 0),
    pile_base_kn: round(baseCapacityKn, 0),
    pile_spacing_m: round(pileSpacing, 2),
    pile_spacing_ok: pileSpacingOk,
    estimated_settlement_mm: estimatedSettlementMm,
    settlement_band_mm: settlementBandMm,
    differential_settlement_mm: differentialSettlementMm,
    angular_distortion: angularDistortion,
    settlement_ok: settlementOk,
    punching_stress_mpa: round(punchingStressMpa, 2),
    punching_resistance_mpa: round(punchingResistanceMpa, 2),
    punching_ratio: round(punchingRatio, 2),
    punching_ok: punchingOk,
    proof: [
      `Service load = structure ${round(totalGravityMn, 1)} MN + raft ${round(raftSelfWeightMn, 1)} MN = ${round(serviceLoadMn, 1)} MN`,
      `Raft ${round(raftThickness, 2)} m thick, section modulus L W²/6 = ${round(raftSectionModulus, 0)} m³`,
      pilesRequired > 0
        ? `Raft contact pressure = P/A = ${round(pressureAxial, 1)} kPa against ${soil.allowable_bearing_kpa} kPa for ${soil.label.toLowerCase()}. The overturning moment is carried by the pile group, not the raft.`
        : `Bearing pressure = P/A + M/Z = ${round(pressureAxial, 1)} + ${round(pressureBending, 1)} = ${round(bearingPressureMax, 1)} kPa against ${soil.allowable_bearing_kpa} kPa for ${soil.label.toLowerCase()}`,
      `Pile ${diameter} m diameter, ${input.pile_length_m} m long, ${input.pile_construction}: shaft ${round(shaftCapacityKn, 0)} kN + base ${round(baseCapacityKn, 0)} kN, ultimate ${round(ultimatePileKn, 0)} kN, allowable ${round(allowablePileKn, 0)} kN at a factor of safety of 2.5`,
      `Piles: ${pilesRequired} at ${round(pileSpacing, 2)} m spacing in a ${columnsInGroup} by ${rowsInGroup} group, Converse-Labarre efficiency ${round(groupEfficiency, 3)}, so the group allowable is ${round(groupAllowableKn, 0)} kN per pile`,
      `Eccentricity M/P = ${round(eccentricity, 2)} m gives a peak pile load of ${round(pileMaxLoadKn, 0)} kN and a far face tension of ${round(pileTensionKn, 0)} kN on about ${pilesInTension} piles`,
      `Settlement by the equivalent raft method at ${round(equivalentRaftDepth, 1)} m depth: q = ${round(equivalentRaftPressure, 0)} kPa over ${round(equivalentRaftWidth, 1)} x ${round(equivalentRaftLength, 1)} m gives ${estimatedSettlementMm} mm (band ${settlementBandMm[0]} to ${settlementBandMm[1]} mm), differential ${differentialSettlementMm} mm or 1 in ${angularDistortion}`,
      `Core punching: ${round(coreLoadMn, 1)} MN over a ${round(criticalPerimeter, 1)} m perimeter with d = ${round(effectiveDepth, 2)} m gives v_Ed ${round(punchingStressMpa, 2)} MPa against v_Rd,c ${round(punchingResistanceMpa, 2)} MPa, ratio ${round(punchingRatio, 2)}`,
    ],
  };

  // ── Quantities ──
  const coreConcrete = coreConcreteVolume;
  const columnConcrete = columnVolumeForLoad;
  const slabConcrete = slabVolumeForLoad;
  const raftConcrete = plate * raftThickness;

  const totalConcrete =
    coreConcrete + columnConcrete + slabConcrete + raftConcrete;
  // Reinforcement rates per element in kg/m³, from typical high rise ranges:
  // core walls 140, columns 180, slabs 110, raft 120.
  const rebarKg =
    coreConcrete * 140 +
    columnConcrete * 180 +
    slabConcrete * 110 +
    raftConcrete * 120;
  const formworkArea =
    coreConcrete * 8 + columnConcrete * 12 + slabConcrete * 4.5;

  const pileConcrete = pilesRequired * pileArea * input.pile_length_m;

  const quantities: TallQuantities = {
    core_concrete_m3: round(coreConcrete, 0),
    column_concrete_m3: round(columnConcrete, 0),
    slab_concrete_m3: round(slabConcrete, 0),
    raft_concrete_m3: round(raftConcrete, 0),
    total_concrete_m3: round(totalConcrete, 0),
    total_rebar_tonnes: round(rebarKg / 1000, 0),
    formwork_m2: round(formworkArea, 0),
    facade_area_m2: round(facadeArea, 0),
    piles_count: pilesRequired,
    pile_concrete_m3: round(pileConcrete, 0),
    proof: [
      `Core walls: perimeter ${round(2 * (coreLength + coreWidth), 1)} m · ${round(coreThickness, 2)} m · ${round(height, 1)} m, with 15% deducted for openings = ${round(coreConcrete, 0)} m³`,
      `Columns: ${columnCount} columns at ${columnSizeMm} mm, tapered to 70% of base area = ${round(columnConcrete, 0)} m³`,
      `Slabs: ${round(plate, 0)} m² · ${round(slabThickness, 2)} m · ${floors} floors = ${round(slabConcrete, 0)} m³`,
      `Raft: ${round(plate, 0)} m² · ${round(raftThickness, 2)} m = ${round(raftConcrete, 0)} m³`,
      `Reinforcement from element rates of 110 to 180 kg/m³ = ${round(rebarKg / 1000, 0)} t; rates are planning averages, not a bar schedule`,
    ],
  };

  // ── Schedule ──
  const substructureDays = Math.round(
    60 + pilesRequired * 0.6 + raftThickness * 30,
  );
  const structureDays = Math.round(floors * input.cycle_days_per_floor);
  const fitoutDays = 180;
  const totalDays = substructureDays + structureDays + fitoutDays;

  const schedule: TallSchedule = {
    substructure_days: substructureDays,
    structure_days: structureDays,
    facade_and_fitout_days: fitoutDays,
    total_days: totalDays,
    total_months: round(totalDays / 30.4, 1),
    floor_cycle_days: input.cycle_days_per_floor,
  };

  // ── Checks ──
  const checks: TallCheck[] = [];

  if (!withinRange) {
    checks.push({
      id: "system-range",
      severity: "critical",
      title: `${TALL_SYSTEM_LABELS[selectedSystem]} is outside its usual storey range`,
      observed: `${floors} storeys`,
      threshold: `${range.min} to ${range.max} storeys`,
      basis: "Tall building practice, not a code limit",
      action: `Review the lateral system. ${TALL_SYSTEM_LABELS[requiredSystem]} is the expected system at this height.`,
    });
  }

  if (geometry.slenderness_ratio > 8) {
    checks.push({
      id: "slenderness",
      severity: "critical",
      title: "Plan slenderness is high for a serviceable tower",
      observed: `H/B = ${geometry.slenderness_ratio}`,
      threshold: "Above about 8",
      basis: "Planning range for reinforced concrete towers",
      action:
        "Increase the plan dimensions, add outriggers, or commission a wind tunnel study before fixing the structure.",
    });
  } else if (geometry.slenderness_ratio > 6) {
    checks.push({
      id: "slenderness-advisory",
      severity: "advisory",
      title: "Slenderness is in the range where dynamic response matters",
      observed: `H/B = ${geometry.slenderness_ratio}`,
      threshold: "Above about 6",
      basis: "Planning range for reinforced concrete towers",
      action:
        "Expect a wind tunnel study and a dynamic response check for occupant comfort.",
    });
  }

  if (!wind.passes_h_over_500) {
    checks.push({
      id: "wind-drift",
      severity: wind.passes_h_over_400 ? "warning" : "critical",
      title: "Estimated wind drift exceeds the usual serviceability limit",
      observed: `${wind.drift_top_mm} mm, H/${wind.drift_ratio}`,
      threshold: `H/500 = ${wind.drift_limit_h_over_500_mm} mm`,
      basis: "Common wind serviceability limit for occupied towers",
      action:
        "Stiffen the core, add outriggers, or reduce the height to width ratio, then re-check.",
    });
  }

  if (wind.stability_coefficient > 0.1) {
    checks.push({
      id: "p-delta",
      severity: wind.stability_coefficient > 0.3 ? "critical" : "warning",
      title: "Second order stability coefficient is above the usual threshold",
      observed: `theta = ${wind.stability_coefficient}`,
      threshold:
        "0.10, with 0.30 as the upper bound before a second order analysis is required",
      basis: "ASCE 7-22 12.8.7 stability coefficient form",
      action:
        "Stiffen the lateral system or verify with a second order analysis.",
    });
  }

  if (!raftAloneOk) {
    checks.push({
      id: "bearing",
      severity: pilesRequired > 0 ? "advisory" : "critical",
      title:
        pilesRequired > 0
          ? "Raft contact pressure is above the allowable, so the scheme relies on piles"
          : "Raft contact pressure exceeds the entered allowable bearing",
      observed: `${foundation.bearing_pressure_max_kpa} kPa`,
      threshold: `${soil.allowable_bearing_kpa} kPa for ${soil.label.toLowerCase()}`,
      basis: "Entered soil assumption",
      action:
        pilesRequired > 0
          ? `${pilesRequired} piles carry the excess. Confirm the bearing values and pile capacity with a site investigation.`
          : "Adopt a piled raft or ground improvement, and confirm bearing values with a site investigation.",
    });
  }

  if (pilesRequired > 0 && pileTensionKn > 0) {
    checks.push({
      id: "pile-tension",
      severity: "warning",
      title: "Part of the pile group is in tension under the governing moment",
      observed: `${foundation.pile_tension_kn} kN per pile on about ${pilesInTension} piles`,
      threshold: "Uplift capacity is not established by this calculation",
      basis: "Elastic pile cap distribution, N(x) = P/n ± 12 M x / (n B²)",
      action:
        "Detail the tension piles and the cap for uplift, or reduce the eccentricity by stiffening the lateral system.",
    });
  }

  if (!punchingOk) {
    checks.push({
      id: "punching",
      severity: punchingRatio > 8 ? "critical" : "warning",
      title: "Core punching shear at the raft exceeds the concrete resistance",
      observed: `v_Ed ${foundation.punching_stress_mpa} MPa against v_Rd,c ${foundation.punching_resistance_mpa} MPa`,
      threshold: `EN 1992-1-1 6.4.4 with 0.5 percent reinforcement, ratio ${foundation.punching_ratio}`,
      basis: "Punching around the core footprint on the raft",
      action:
        "Thicken the raft under the core, add shear reinforcement, or place piles directly beneath the core.",
    });
  }

  if (eccentricity > bendingWidth / 6) {
    checks.push({
      id: "kern",
      severity: "warning",
      title: "Overturning resultant falls outside the kern of the foundation",
      observed: `e = ${foundation.eccentricity_m} m against B/6 = ${round(bendingWidth / 6, 2)} m`,
      threshold: "B/6, beyond which part of the base lifts",
      basis: "Elastic distribution of load and moment on the base",
      action:
        "Stiffen the lateral system or enlarge the plan, because beyond this point the pile count is driven by the moment rather than by the weight.",
    });
  }

  if (!settlementOk) {
    checks.push({
      id: "settlement",
      severity: "warning",
      title: "Estimated settlement or distortion exceeds the screening limit",
      observed: `${foundation.estimated_settlement_mm} mm total, ${foundation.differential_settlement_mm} mm differential, 1 in ${foundation.angular_distortion}`,
      threshold: "150 mm total and 1 in 500 angular distortion",
      basis: "Screening limits for rafts and pile groups, not code values",
      action:
        "Confirm the soil modulus and the pile group response with a geotechnical engineer before fixing the foundation.",
    });
  }

  if (pilesRequired > 0 && !pileLoadOk) {
    checks.push({
      id: "pile-load",
      severity: "critical",
      title: "Maximum pile load exceeds the allowable capacity",
      observed: `${foundation.pile_max_load_kn} kN per pile with the moment couple`,
      threshold: `${foundation.pile_capacity_allowable_kn} kN allowable`,
      basis:
        "Elastic pile cap distribution with a factor of safety of 2.5 on ultimate capacity",
      action:
        "Increase the pile diameter, length or count, or reduce the moment by stiffening the lateral system.",
    });
  }

  if (pilesRequired > 0 && !pileSpacingOk) {
    checks.push({
      id: "pile-spacing",
      severity: "warning",
      title: "Pile spacing is tight for the pile diameter",
      observed: `${foundation.pile_spacing_m} m`,
      threshold: `3 diameters = ${round(3 * diameter, 2)} m`,
      basis: "Common minimum spacing for bored piles",
      action:
        "Lengthen the piles, increase the diameter, or enlarge the raft so the group can spread.",
    });
  }

  if (seismic.governs_over_wind) {
    checks.push({
      id: "seismic-governs",
      severity: "advisory",
      title: "Seismic base shear governs over wind",
      observed: `${seismic.base_shear_mn} MN seismic against ${wind.base_shear_mn} MN wind`,
      threshold: "Higher of the two governs the lateral design",
      basis: "ASCE 7-22 12.8 and chapter 27 comparison",
      action:
        "Detail the core and frame for the seismic load case, including ductility requirements.",
    });
  }

  if (wind.wind_tunnel_advised) {
    checks.push({
      id: "wind-tunnel",
      severity: "advisory",
      title: "A wind tunnel study is expected at this height and slenderness",
      observed: `${round(height, 1)} m, H/B ${geometry.slenderness_ratio}`,
      threshold: "Above 120 m, or H/B above 6, or drift at the H/500 limit",
      basis: "Tall building practice",
      action:
        "Commission a boundary layer wind tunnel study for cladding pressures and dynamic response.",
    });
  }

  if (input.seismic_sds >= 1.0 || input.seismic_sd1 >= 0.5) {
    checks.push({
      id: "seismic-detail",
      severity: "warning",
      title: "High seismic demand entered",
      observed: `SDS ${input.seismic_sds}, SD1 ${input.seismic_sd1}`,
      threshold: "SDS 1.0 or SD1 0.5 and above",
      basis: "Entered site hazard",
      action:
        "Use a special moment frame or special structural wall system and check the detailing requirements with a licensed engineer.",
    });
  }

  // Architectural planning runs on the same geometry, so the structure, the plan
  // and the vertical transport cannot describe different buildings.
  const architecture = calculateArchitecturalMath({
    floors,
    floorHeight: input.floor_height,
    heightM: height,
    planLength: L,
    planWidth: W,
    coreArea,
    coreLength,
    coreWidth,
    slabThickness,
    columnCount,
    columnSizeMm,
    occupancy: input.occupancy,
    daylightDepthM: 7,
    servicesZoneM: 0.45,
    liftCarCapacity: 21,
  });

  if (!architecture.clearHeightOk) {
    checks.push({
      id: "clear-height",
      severity: "warning",
      title: "Finished floor to ceiling height is below the occupancy minimum",
      observed: `${architecture.clearHeightM} m`,
      threshold: `${OCCUPANCY_PROFILES[input.occupancy].minimumClearHeight} m for ${OCCUPANCY_PROFILES[input.occupancy].label.toLowerCase()}`,
      basis: "Floor to floor minus slab and services zone",
      action:
        "Raise the floor to floor height or reduce the services zone before the plan is fixed.",
    });
  }

  if (!architecture.lifts.fitsInCore) {
    checks.push({
      id: "lift-core",
      severity: "warning",
      title:
        "The core is too small for the vertical transport the population needs",
      observed: `${architecture.lifts.carsRequired} cars need about ${architecture.lifts.coreAreaNeededM2} m²`,
      threshold: `${round(architecture.coreToPlateRatioPct, 1)} percent of the plate, which is ${round(coreArea, 0)} m²`,
      basis: "Lift car shaft plus lobby allowance",
      action:
        "Enlarge the core, split the building into lift zones, or reduce the population per floor.",
    });
  }

  if (!architecture.lifts.intervalOk) {
    checks.push({
      id: "lift-interval",
      severity: "advisory",
      title: "Lift interval is longer than the occupancy target",
      observed: `${architecture.lifts.intervalS} s`,
      threshold: `${OCCUPANCY_PROFILES[input.occupancy].targetInterval} s target`,
      basis: "Round trip time divided by the number of cars",
      action:
        "Add cars, raise the car speed, or zone the building so each bank serves fewer floors.",
    });
  }

  if (!architecture.egressOk) {
    checks.push({
      id: "egress",
      severity: "critical",
      title: "Stair width is below the required egress width",
      observed: `${architecture.egressWidthProvidedMm} mm provided`,
      threshold: `${architecture.egressWidthRequiredMm} mm required at 5 mm per occupant`,
      basis: "IBC 1005.3.2 stair width",
      action: "Widen the stairs or reduce the occupant load per floor.",
    });
  }

  return {
    input,
    architecture,
    geometry,
    system,
    gravity,
    wind,
    seismic,
    foundation,
    quantities: {
      ...quantities,
      piles_count: pilesRequired,
      pile_concrete_m3: round(pileConcrete, 0),
    },
    schedule,
    checks,
    screening_notice: SCREENING_NOTICE,
    timestamp: new Date().toISOString(),
  };
}

/** Core wall concrete volume with a 15 percent allowance for openings. */
function perimeterCoreConcrete(
  coreLength: number,
  coreWidth: number,
  thickness: number,
  height: number,
): number {
  const perimeter = 2 * (coreLength + coreWidth);
  return perimeter * thickness * height * 0.85;
}

export const SCREENING_NOTICE =
  "PRELIMINARY SCREENING ONLY: loads are a simplified take-down, the natural period is a single-degree-of-freedom estimate, and wind and seismic actions are screened rather than analysed. There is no frame analysis, no second-order (P-delta) analysis, no diaphragm or core-frame interaction check and no member design or detailing. A result here sizes a scheme; it does not certify a building.";

export const TALL_ENGINE_VERSION = "1.0.0";
