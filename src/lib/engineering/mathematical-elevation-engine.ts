// =========================================================
// FRELUX DETERMINISTIC MATHEMATICAL PLAN ELEVATION ENGINE
// Hand Mathematics, Structural Analysis, Wind Logic & 5D BIM
//
// Pure architectural mathematics and engineering mechanics:
// - NO AI or external LLM/vision inference
// - Trigonometric pitch elevation & true slope 3D geometry
// - Simplified indicative soil-bearing and footing-width arithmetic only
// - Wall proportion and opening-width screening only
// - Indicative opening and ring-beam quantities only
// - Simplified wind-pressure illustration; not code-based uplift or connection design
// - Hand mathematics error detector (angles, dimensions, regulations)
// - 5D BIM schedule: 3D spatial + 4D timeline + 5D quantities & costs
// =========================================================

import type { BuildToRoofInput, BuildingType, RoofType } from "@/types/build-to-roof";

// ── Types & Interfaces ──

export type SoilTypeKey =
  | "laterite"
  | "sandy_clay"
  | "firm_clay"
  | "dense_sand"
  | "rock";

export interface PlanOpening {
  id: string;
  type: "window" | "door";
  width: number; // meters
  height: number; // meters
  count: number;
  wall_side: "front" | "back" | "left" | "right";
  label?: string;
}

export interface PlanElevationInput {
  project_name: string;
  building_type: BuildingType;
  building_length: number; // meters (L)
  building_width: number; // meters (W)
  floor_to_floor_height: number; // meters (H)
  storeys: number;
  wall_thickness: number; // meters (tw, e.g. 0.225 for 9", 0.150 for 6")
  internal_wall_length: number; // meters
  roof_pitch_deg: number; // theta in degrees
  roof_overhang: number; // meters (e.g. 0.60m)
  roof_type: RoofType;
  soil_type: SoilTypeKey;
  soil_bearing_capacity_kpa: number; // q_allow in kPa (kN/m²)
  basic_wind_speed_ms: number; // V in m/s (default 34 m/s)
  wind_exposure: "B" | "C" | "D"; // Simplified illustrative exposure selector
  openings: PlanOpening[];
  occupancy_type?: "residential" | "commercial" | "institutional";
}

export interface Level1FoundationMath {
  level_name: string;
  excavation_depth_m: number;
  footing_width_calculated_m: number;
  footing_width_adopted_m: number;
  footing_thickness_m: number;
  total_working_dead_load_kn_m: number;
  total_working_live_load_kn_m: number;
  total_line_load_kn_m: number;
  applied_soil_pressure_kpa: number;
  allowable_bearing_capacity_kpa: number;
  bearing_capacity_safety_factor: number;
  is_bearing_safe: boolean;
  blinding_thickness_m: number;
  hardcore_thickness_m: number;
  dpc_elevation_m: number;
  excavation_volume_m3: number;
  concrete_footing_volume_m3: number;
  mathematical_proof: string[];
}

export interface Level2GroundSlabMath {
  level_name: string;
  plinth_height_above_ground_m: number;
  slab_thickness_m: number;
  slab_area_m2: number;
  slab_concrete_volume_m3: number;
  brc_mesh_area_m2: number;
  dpm_membrane_area_m2: number;
  mathematical_proof: string[];
}

export interface Level3SuperstructureMath {
  level_name: string;
  gross_external_wall_area_m2: number;
  gross_internal_wall_area_m2: number;
  total_opening_deductions_m2: number;
  net_masonry_area_m2: number;
  effective_wall_height_m: number;
  slenderness_ratio: number;
  slenderness_limit: number;
  is_slenderness_compliant: boolean;
  wall_courses_count: number;
  total_blocks_count: number;
  max_opening_ratio_percent: number;
  mathematical_proof: string[];
}

export interface Level4RingBeamMath {
  level_name: string;
  elevation_at_beam_top_m: number;
  ring_beam_width_m: number;
  ring_beam_depth_m: number;
  total_beam_length_m: number;
  concrete_volume_m3: number;
  main_rebar_diameter_mm: number;
  main_rebar_bars_count: number;
  total_main_rebar_weight_kg: number;
  stirrups_spacing_mm: number;
  lintel_checks: Array<{
    opening_label: string;
    span_m: number;
    required_depth_m: number;
    required_bearing_m: number;
    is_bearing_sufficient: boolean;
  }>;
  mathematical_proof: string[];
}

export interface Level5RoofMath {
  level_name: string;
  roof_span_m: number;
  roof_pitch_deg: number;
  ridge_rise_m: number;
  rafter_slope_length_m: number;
  true_3d_roof_area_m2: number;
  horizontal_roof_footprint_m2: number;
  pitch_area_multiplier: number;
  trusses_count: number;
  purlin_runs_per_slope: number;
  total_purlin_length_m: number;
  eaves_fascia_perimeter_m: number;
  eaves_gutter_run_m: number;
  total_building_height_m: number;
  mathematical_proof: string[];
}

export interface WindAerodynamicsMath {
  basic_wind_speed_ms: number;
  velocity_pressure_qz_pa: number;
  windward_wall_cpe: number;
  leeward_wall_cpe: number;
  roof_cpe_windward: number;
  roof_cpe_leeward: number;
  internal_pressure_cpi: number;
  gross_uplift_pressure_kpa: number;
  roof_dead_load_resistance_kpa: number;
  net_uplift_pressure_kpa: number;
  total_net_uplift_force_kn: number;
  hurricane_ties_required: boolean;
  required_tie_down_capacity_kn: number;
  tie_down_points_count: number;
  tension_per_tie_kn: number;
  mathematical_proof: string[];
}

export type ErrorSeverity = "critical" | "warning" | "advisory";

export interface HandMathDiscrepancy {
  id: string;
  severity: ErrorSeverity;
  category: "geometry" | "angles" | "structural" | "wind" | "regulation";
  title: string;
  detected_value: string;
  permissible_threshold: string;
  regulation_code: string;
  mathematical_proof: string;
  recommended_fix: string;
}

export interface FiveDBimSchedule {
  materials: Array<{
    item: string;
    category: string;
    quantity: number;
    unit: string;
    notes: string;
  }>;
  total_concrete_volume_m3: number;
  total_cement_bags_50kg: number;
  total_sand_m3: number;
  total_granite_m3: number;
  total_blocks_units: number;
  total_rebar_tonnes: number;
  total_roof_sheets_approx: number;
  timeline_phases: Array<{
    phase_number: number;
    phase_name: number | string;
    level: string;
    duration_days: number;
    curing_hold_days: number;
    cumulative_days: number;
    milestone: string;
  }>;
  total_project_days: number;
}

export interface MathematicalElevationResult {
  input: PlanElevationInput;
  timestamp: string;
  levels: {
    level_1_foundation: Level1FoundationMath;
    level_2_ground_slab: Level2GroundSlabMath;
    level_3_superstructure: Level3SuperstructureMath;
    level_4_ring_beam: Level4RingBeamMath;
    level_5_roof: Level5RoofMath;
  };
  wind_analysis: WindAerodynamicsMath;
  discrepancies: HandMathDiscrepancy[];
  regulation_compliance: {
    /** Always false: this tool does not perform regulatory compliance review. */
    passed_all: false;
    checks_count: 0;
    passed_count: 0;
    violations_count: 0;
    note: string;
  };
  five_d_bim: FiveDBimSchedule;
  derived_patch: Partial<BuildToRoofInput>;
}

// ── Default Standard Constants & Soil Bearing Table ──

export const SOIL_CAPACITIES_KPA: Record<SoilTypeKey, number> = {
  laterite: 150, // typical compacted lateritic clay/sand (West Africa / tropics)
  sandy_clay: 120, // firm sandy clay
  firm_clay: 100, // stiff/firm cohesive clay
  dense_sand: 250, // medium to dense coarse sand / gravel
  rock: 500, // sound sedimentary or metamorphic bed rock
};

export const DEFAULT_PLAN_INPUT: PlanElevationInput = {
  project_name: "Architectural Plan Mathematical Elevation",
  building_type: "bungalow",
  building_length: 12.0,
  building_width: 9.0,
  floor_to_floor_height: 3.0,
  storeys: 1,
  wall_thickness: 0.225, // 9" standard hollow sandcrete
  internal_wall_length: 22.0,
  roof_pitch_deg: 25.0,
  roof_overhang: 0.60,
  roof_type: "hip",
  soil_type: "laterite",
  soil_bearing_capacity_kpa: 150,
  basic_wind_speed_ms: 34.0, // standard inland design speed (122 km/h)
  wind_exposure: "B", // suburban / urban terrain
  openings: [
    { id: "d1", type: "door", width: 1.0, height: 2.1, count: 1, wall_side: "front", label: "Main Entrance Door" },
    { id: "d2", type: "door", width: 0.9, height: 2.1, count: 3, wall_side: "back", label: "Internal & Kitchen Doors" },
    { id: "w1", type: "window", width: 1.5, height: 1.2, count: 4, wall_side: "front", label: "Living / Front Windows" },
    { id: "w2", type: "window", width: 1.2, height: 1.2, count: 4, wall_side: "back", label: "Bedroom Windows" },
    { id: "w3", type: "window", width: 0.6, height: 0.6, count: 2, wall_side: "left", label: "Bathroom High Windows" },
  ],
  occupancy_type: "residential",
};

// ── Core Hand Mathematics & Deterministic Elevation Function ──

export function calculateMathematicalElevation(
  rawInput: Partial<PlanElevationInput>
): MathematicalElevationResult {
  const input: PlanElevationInput = {
    ...DEFAULT_PLAN_INPUT,
    ...rawInput,
    building_length: Math.max(3.0, Number(rawInput.building_length) || DEFAULT_PLAN_INPUT.building_length),
    building_width: Math.max(3.0, Number(rawInput.building_width) || DEFAULT_PLAN_INPUT.building_width),
    floor_to_floor_height: Math.max(2.1, Number(rawInput.floor_to_floor_height) || DEFAULT_PLAN_INPUT.floor_to_floor_height),
    storeys: Math.max(1, Math.min(5, Math.round(Number(rawInput.storeys) || 1))),
    wall_thickness: Math.max(0.12, Math.min(0.40, Number(rawInput.wall_thickness) || DEFAULT_PLAN_INPUT.wall_thickness)),
    internal_wall_length: Math.max(0, Number(rawInput.internal_wall_length) || 0),
    roof_pitch_deg: Math.max(5.0, Math.min(60.0, Number(rawInput.roof_pitch_deg) || DEFAULT_PLAN_INPUT.roof_pitch_deg)),
    roof_overhang: Math.max(0.20, Math.min(1.50, Number(rawInput.roof_overhang) || DEFAULT_PLAN_INPUT.roof_overhang)),
    soil_bearing_capacity_kpa: Math.max(50, Number(rawInput.soil_bearing_capacity_kpa) || 150),
    basic_wind_speed_ms: Math.max(20, Math.min(70, Number(rawInput.basic_wind_speed_ms) || 34)),
    openings: (rawInput.openings ?? DEFAULT_PLAN_INPUT.openings).map((opening) => ({
      ...opening,
      width: Math.max(0, Number(opening.width) || 0),
      height: Math.max(0, Number(opening.height) || 0),
      count: Math.max(0, Math.round(Number(opening.count) || 0)),
    })),
  };

  const L = input.building_length;
  const W = input.building_width;
  const H = input.floor_to_floor_height;
  const tw = input.wall_thickness;
  const storeys = input.storeys;
  const pitchDeg = input.roof_pitch_deg;
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const overhang = input.roof_overhang;
  const q_allow = input.soil_bearing_capacity_kpa;
  const V_wind = input.basic_wind_speed_ms;

  const discrepancies: HandMathDiscrepancy[] = [];

  // =========================================================
  // LEVEL 1: FOUNDATION & SUBSTRUCTURE MATHEMATICS
  // Simplified assumed-load calculation; not geotechnical design
  // =========================================================
  const P_ext = 2 * (L + W);
  const L_centerline = P_ext + input.internal_wall_length;
  // const A_footprint = L * W;

  // Dead Load Breakdown per linear meter of external wall:
  // 1. Roof dead load tributary: 0.35 kN/m² roof area transferred to external walls
  const A_roof_plan = (L + 2 * overhang) * (W + 2 * overhang);
  const roof_dead_load_kn_m = (0.35 * (A_roof_plan / Math.cos(pitchRad))) / P_ext;

  // 2. Ring beam dead load (24 kN/m³ concrete * 0.225m * 0.225m = 1.215 kN/m)
  const ring_beam_dead_kn_m = 24.0 * tw * 0.225 * storeys;

  // 3. Superstructure wall load (18 kN/m³ sandcrete masonry * tw * H * storeys)
  // Deduct ~15% average for openings
  const wall_dead_kn_m = 18.0 * tw * H * storeys * 0.85;

  // 4. Ground floor slab transfer (if ground supported or suspended, ~1.5 kN/m perimeter edge load)
  const slab_transfer_kn_m = 1.8 * storeys;

  // 5. Substructure foundation wall below ground: 0.90m depth * tw * 19 kN/m³
  const substructure_wall_kn_m = 19.0 * tw * 0.90;

  const total_working_dead_load =
    roof_dead_load_kn_m +
    ring_beam_dead_kn_m +
    wall_dead_kn_m +
    slab_transfer_kn_m +
    substructure_wall_kn_m;

  // Working Live Load: residential floor 1.5 kN/m² + roof access 0.25 kN/m²
  const total_working_live_load = (1.5 * (W / 4) * storeys) + (0.25 * (W / 4));
  const total_line_load_kn_m = total_working_dead_load + total_working_live_load;

  // Footing Width Calculation: Bf = (P / q_allow) * 1.15 (self-weight factor)
  const footing_width_calc = (total_line_load_kn_m / q_allow) * 1.15;
  // Illustrative minimum geometry only; not a code minimum
  const footing_width_min = Math.max(0.45, 3 * tw);
  const footing_width_adopted = Math.max(
    Math.round(footing_width_calc * 100) / 100,
    Math.round(footing_width_min * 100) / 100
  );

  const excavation_depth_m = 0.90; // Fixed illustrative assumption, not a required depth
  // Illustrative footing geometry; no structural capacity design
  const footing_projection = (footing_width_adopted - tw) / 2;
  const footing_thickness_m = Math.max(0.15, Math.round(footing_projection * 100) / 100, 0.225);

  const applied_soil_pressure_kpa =
    (total_line_load_kn_m + 24.0 * footing_width_adopted * footing_thickness_m) /
    footing_width_adopted;

  // Ultimate Bearing Capacity Safety Factor: FS = (3.0 * q_allow) / applied_pressure
  const bearing_safety_factor = (3.0 * q_allow) / applied_soil_pressure_kpa;
  const is_bearing_safe = applied_soil_pressure_kpa <= q_allow;

  if (!is_bearing_safe) {
    discrepancies.push({
      id: "err-foundation-bearing",
      severity: "critical",
      category: "structural",
      title: "Foundation Soil Bearing Pressure Exceeded",
      detected_value: `${applied_soil_pressure_kpa.toFixed(1)} kPa`,
      permissible_threshold: `${q_allow.toFixed(1)} kPa allowable`,
      regulation_code: "Professional review required",
      mathematical_proof: `Simplified assumed line load and bearing value produce an indicative pressure of ${applied_soil_pressure_kpa.toFixed(1)} kPa against the entered ${q_allow.toFixed(1)} kPa screen; loads and ground conditions are unverified.`,
      recommended_fix: "Obtain a site-specific geotechnical and structural foundation design; this screen is not a footing recommendation.",
    });
  }

  const excavation_volume_m3 = L_centerline * footing_width_adopted * excavation_depth_m;
  const concrete_footing_volume_m3 = L_centerline * footing_width_adopted * footing_thickness_m;

  const level1Math: Level1FoundationMath = {
    level_name: "Level 1: Substructure & Foundation",
    excavation_depth_m,
    footing_width_calculated_m: Math.round(footing_width_calc * 100) / 100,
    footing_width_adopted_m: footing_width_adopted,
    footing_thickness_m,
    total_working_dead_load_kn_m: Math.round(total_working_dead_load * 100) / 100,
    total_working_live_load_kn_m: Math.round(total_working_live_load * 100) / 100,
    total_line_load_kn_m: Math.round(total_line_load_kn_m * 100) / 100,
    applied_soil_pressure_kpa: Math.round(applied_soil_pressure_kpa * 10) / 10,
    allowable_bearing_capacity_kpa: q_allow,
    bearing_capacity_safety_factor: Math.round(bearing_safety_factor * 100) / 100,
    is_bearing_safe,
    blinding_thickness_m: 0.05,
    hardcore_thickness_m: 0.20,
    dpc_elevation_m: 0.45,
    excavation_volume_m3: Math.round(excavation_volume_m3 * 100) / 100,
    concrete_footing_volume_m3: Math.round(concrete_footing_volume_m3 * 100) / 100,
    mathematical_proof: [
      `Total line load: w = g_dead + q_live = ${total_working_dead_load.toFixed(2)} + ${total_working_live_load.toFixed(2)} = ${total_line_load_kn_m.toFixed(2)} kN/m`,
      `Required footing width: B_req = (w / q_allow) · 1.15 = (${total_line_load_kn_m.toFixed(2)} / ${q_allow}) · 1.15 = ${footing_width_calc.toFixed(2)} m`,
      `Adopted width B_f = max(B_req, 3·tw) = max(${footing_width_calc.toFixed(2)}, ${(3 * tw).toFixed(2)}) = ${footing_width_adopted.toFixed(2)} m`,
      `Simplified contact-pressure comparison: ${applied_soil_pressure_kpa.toFixed(1)} kPa versus entered assumption ${q_allow} kPa. Not a geotechnical or code verification.`,
    ],
  };

  // =========================================================
  // LEVEL 2: GROUND FLOOR SLAB & DPC MATHEMATICS
  // Fixed illustrative slab assumptions
  // =========================================================
  const plinth_height_above_ground_m = 0.45; // 3 block courses
  const slab_thickness_m = 0.15; // 150mm reinforced concrete slab
  const net_internal_slab_area = Math.max(0, (L - 2 * tw) * (W - 2 * tw));
  const slab_concrete_volume_m3 = net_internal_slab_area * slab_thickness_m;

  const level2Math: Level2GroundSlabMath = {
    level_name: "Level 2: Ground Floor Slab & DPC",
    plinth_height_above_ground_m,
    slab_thickness_m,
    slab_area_m2: Math.round(net_internal_slab_area * 100) / 100,
    slab_concrete_volume_m3: Math.round(slab_concrete_volume_m3 * 100) / 100,
    brc_mesh_area_m2: Math.round(net_internal_slab_area * 1.10 * 100) / 100,
    dpm_membrane_area_m2: Math.round(net_internal_slab_area * 1.15 * 100) / 100,
    mathematical_proof: [
      `Net slab boundary: L_int = L - 2·tw = ${(L - 2 * tw).toFixed(2)} m, W_int = W - 2·tw = ${(W - 2 * tw).toFixed(2)} m`,
      `Slab Volume: V_slab = L_int · W_int · h_s = ${net_internal_slab_area.toFixed(2)} m² · ${slab_thickness_m} m = ${slab_concrete_volume_m3.toFixed(2)} m³`,
      `Illustrative plinth datum: +${plinth_height_above_ground_m.toFixed(2)} m (not a flood or code clearance check)`,
    ],
  };

  // =========================================================
  // LEVEL 3: SUPERSTRUCTURE WALLS & OPENINGS
  // Indicative wall proportion and opening deductions only
  // =========================================================
  const gross_external_wall_area_m2 = P_ext * H * storeys;
  const gross_internal_wall_area_m2 = input.internal_wall_length * H * storeys;

  let total_opening_deductions_m2 = 0;
  const sideWidths: Record<string, number> = {
    front: L,
    back: L,
    left: W,
    right: W,
  };
  const sideOpeningWidths: Record<string, number> = {
    front: 0,
    back: 0,
    left: 0,
    right: 0,
  };

  input.openings.forEach((op) => {
    const area = op.width * op.height * op.count;
    total_opening_deductions_m2 += area;
    const side = op.wall_side || "front";
    if (side in sideOpeningWidths) sideOpeningWidths[side] += op.width * op.count;
  });

  const net_masonry_area_m2 = Math.max(
    10,
    gross_external_wall_area_m2 + gross_internal_wall_area_m2 - total_opening_deductions_m2
  );

  // Slenderness Ratio: lambda = beta * H / tw
  // With horizontal ring beam and slab restraint, effective height beta = 0.75
  const effective_wall_height_m = 0.75 * H;
  const slenderness_ratio = effective_wall_height_m / tw;
  const slenderness_limit = 27.0; // Illustrative screening threshold, not a code limit
  const is_slenderness_compliant = slenderness_ratio <= slenderness_limit;

  if (!is_slenderness_compliant) {
    discrepancies.push({
      id: "err-wall-slenderness",
      severity: "critical",
      category: "structural",
      title: "Wall proportion exceeds illustrative screening threshold",
      detected_value: `λ = ${slenderness_ratio.toFixed(1)}`,
      permissible_threshold: `λ ≤ ${slenderness_limit.toFixed(0)}`,
      regulation_code: "Planning screen only",
      mathematical_proof: `Illustrative height-to-thickness ratio = 0.75 · ${H}m / ${tw}m = ${slenderness_ratio.toFixed(1)}; configured threshold 27.0 is not a code limit.`,
      recommended_fix: "Have a locally licensed structural engineer assess the wall using the project drawings, materials, support conditions, and applicable code.",
    });
  }

  // Opening Ratio Check: openings on any wall side must not exceed 50%
  let max_opening_ratio_percent = 0;
  Object.keys(sideWidths).forEach((side) => {
    const sideLen = sideWidths[side];
    const openWidth = sideOpeningWidths[side] || 0;
    const ratioPct = (openWidth / sideLen) * 100;
    if (ratioPct > max_opening_ratio_percent) {
      max_opening_ratio_percent = ratioPct;
    }
    if (ratioPct > 50) {
      discrepancies.push({
        id: `err-opening-ratio-${side}`,
        severity: "critical",
        category: "geometry",
        title: `Opening width exceeds illustrative screen on ${side.toUpperCase()} wall`,
        detected_value: `${ratioPct.toFixed(1)}% opening width`,
        permissible_threshold: `≤ 50.0% unreinforced masonry limit`,
        regulation_code: "Planning screen only",
        mathematical_proof: `Openings on ${side} wall sum to ${openWidth.toFixed(2)}m over a wall span of ${sideLen.toFixed(2)}m (${ratioPct.toFixed(1)}%). Masonry pier action is compromised.`,
        recommended_fix: "Review opening layout and wall stability with a locally licensed structural engineer.",
      });
    }
  });

  // Optional user-input height warning; not a regulatory check
  if (H < 2.60) {
    discrepancies.push({
      id: "err-headroom-clearance",
      severity: "warning",
      category: "regulation",
      title: "Entered storey height is below illustrative screening threshold",
      detected_value: `${H.toFixed(2)}m clear height`,
      permissible_threshold: `Below configured 2.60m planning threshold`,
      regulation_code: "Check local requirements",
      mathematical_proof: `Entered storey height H = ${H.toFixed(2)}m is below the configured 2.60m planning threshold; applicability must be checked locally.`,
      recommended_fix: "Check room-height requirements against the applicable local building regulations and project brief.",
    });
  }

  // Assumed nominal block coverage and waste; verify product dimensions and site waste
  const BLOCKS_PER_M2 = 9.13;
  const total_blocks_count = Math.ceil(net_masonry_area_m2 * BLOCKS_PER_M2 * 1.05);
  const wall_courses_count = Math.round(H / 0.225);

  const level3Math: Level3SuperstructureMath = {
    level_name: "Level 3: Superstructure Walls & Openings",
    gross_external_wall_area_m2: Math.round(gross_external_wall_area_m2 * 100) / 100,
    gross_internal_wall_area_m2: Math.round(gross_internal_wall_area_m2 * 100) / 100,
    total_opening_deductions_m2: Math.round(total_opening_deductions_m2 * 100) / 100,
    net_masonry_area_m2: Math.round(net_masonry_area_m2 * 100) / 100,
    effective_wall_height_m: Math.round(effective_wall_height_m * 100) / 100,
    slenderness_ratio: Math.round(slenderness_ratio * 10) / 10,
    slenderness_limit,
    is_slenderness_compliant,
    wall_courses_count,
    total_blocks_count,
    max_opening_ratio_percent: Math.round(max_opening_ratio_percent * 10) / 10,
    mathematical_proof: [
      `Gross Area: A_ext (${gross_external_wall_area_m2.toFixed(1)} m²) + A_int (${gross_internal_wall_area_m2.toFixed(1)} m²) - Deductions (${total_opening_deductions_m2.toFixed(1)} m²) = ${net_masonry_area_m2.toFixed(1)} m²`,
      `Indicative height-to-thickness ratio: ${effective_wall_height_m.toFixed(2)} / ${tw} = ${slenderness_ratio.toFixed(1)}. The configured threshold is not a verified code limit.`,
      `Block Count: ${net_masonry_area_m2.toFixed(1)} m² · 9.13 blocks/m² · 1.05 waste = ${total_blocks_count} units`,
    ],
  };

  // =========================================================
  // LEVEL 4: RING BEAM & LINTELS MATHEMATICS
  // Illustrative ring-beam quantities only
  // =========================================================
  const ring_beam_width_m = tw;
  const ring_beam_depth_m = 0.225;
  const total_beam_length_m = L_centerline;
  const ring_beam_concrete_volume = total_beam_length_m * ring_beam_width_m * ring_beam_depth_m;
  const main_rebar_bars_count = 4;
  const main_rebar_diameter_mm = 12; // 4xY12
  // Weight of Y12 bar = 0.888 kg/m
  const total_main_rebar_weight_kg = total_beam_length_m * main_rebar_bars_count * 0.888 * 1.08; // 8% lap

  const lintel_checks: Level4RingBeamMath["lintel_checks"] = [];
  input.openings.forEach((op) => {
    const span = op.width;
    const required_depth = Math.max(0.15, span / 10);
    // Bearing length must be >= 150mm or span/10 (BS 8110 §3.4)
    const required_bearing = Math.max(0.15, span / 10);
    // For standard openings, verify against assumed 0.20m default bearing
    const assumed_bearing = 0.20;
    const is_sufficient = assumed_bearing >= required_bearing;

    lintel_checks.push({
      opening_label: op.label || `${op.type} (${op.width}m)`,
      span_m: span,
      required_depth_m: Math.round(required_depth * 1000) / 1000,
      required_bearing_m: Math.round(required_bearing * 1000) / 1000,
      is_bearing_sufficient: is_sufficient,
    });

    if (span > 2.40) {
      discrepancies.push({
        id: `err-lintel-span-${op.id}`,
        severity: "warning",
        category: "structural",
        title: `Wide Lintel Span on ${op.label || op.type}`,
        detected_value: `Clear span = ${span.toFixed(2)}m`,
        permissible_threshold: `Simple masonry lintels limited to ≤ 2.40m`,
        regulation_code: "Professional review required",
        mathematical_proof: `Entered opening span is ${span.toFixed(2)}m; this calculator does not size lintels or calculate structural moments.`,
        recommended_fix: "Have the opening and lintel designed for the project loads, supports, materials, and applicable code.",
      });
    }
  });

  const level4Math: Level4RingBeamMath = {
    level_name: "Level 4: Lintel & Reinforced Concrete Ring Beam",
    elevation_at_beam_top_m: Math.round((plinth_height_above_ground_m + H * storeys + ring_beam_depth_m) * 100) / 100,
    ring_beam_width_m,
    ring_beam_depth_m,
    total_beam_length_m: Math.round(total_beam_length_m * 100) / 100,
    concrete_volume_m3: Math.round(ring_beam_concrete_volume * 100) / 100,
    main_rebar_diameter_mm,
    main_rebar_bars_count,
    total_main_rebar_weight_kg: Math.round(total_main_rebar_weight_kg * 10) / 10,
    stirrups_spacing_mm: 200,
    lintel_checks,
    mathematical_proof: [
      `Continuous perimeter bond beam: Length = ${total_beam_length_m.toFixed(2)}m, Section = ${(ring_beam_width_m * 1000).toFixed(0)} × ${(ring_beam_depth_m * 1000).toFixed(0)} mm`,
      `Concrete volume: V_beam = ${total_beam_length_m.toFixed(2)} · ${ring_beam_width_m} · ${ring_beam_depth_m} = ${ring_beam_concrete_volume.toFixed(2)} m³`,
      `Steel tie: 4 × Y12 longitudinal reinforcement = ${total_main_rebar_weight_kg.toFixed(1)} kg steel anchored at all junctions`,
    ],
  };

  // =========================================================
  // LEVEL 5: ROOF STRUCTURE & PITCH TRIGONOMETRY
  // Parametric roof geometry only; not structural member design
  // =========================================================
  const roof_span_m = W + 2 * overhang;
  const half_span = roof_span_m / 2;
  const ridge_rise_m = half_span * Math.tan(pitchRad);
  const rafter_slope_length_m = half_span / Math.cos(pitchRad);
  const horizontal_roof_footprint_m2 = (L + 2 * overhang) * (W + 2 * overhang);
  const pitch_area_multiplier = 1 / Math.cos(pitchRad);
  // Hip roofs add ~6% extra area for hips and valley valleys
  const hipFactor = input.roof_type === "hip" ? 1.06 : 1.0;
  const true_3d_roof_area_m2 = horizontal_roof_footprint_m2 * pitch_area_multiplier * hipFactor;

  const trusses_count = Math.ceil((L + 2 * overhang) / 1.20) + 1;
  const purlin_runs_per_slope = Math.ceil(rafter_slope_length_m / 0.90) + 1;
  const total_purlin_length_m = purlin_runs_per_slope * 2 * (L + 2 * overhang);
  const eaves_fascia_perimeter_m = 2 * ((L + 2 * overhang) + (W + 2 * overhang));
  const eaves_gutter_run_m = 2 * (L + 2 * overhang);

  const total_building_height_m =
    excavation_depth_m +
    plinth_height_above_ground_m +
    H * storeys +
    ring_beam_depth_m +
    ridge_rise_m;

  // Roof Pitch Discrepancy Checks
  if (pitchDeg < 12.0) {
    discrepancies.push({
      id: "err-roof-pitch-low",
      severity: "warning",
      category: "angles",
      title: "Roof pitch is below configured product-check threshold",
      detected_value: `θ = ${pitchDeg.toFixed(1)}°`,
      permissible_threshold: `θ ≥ 12.0° (corrugated / trapezoidal sheets)`,
      regulation_code: "Product-specific review required",
      mathematical_proof: `Pitch angle θ = ${pitchDeg.toFixed(1)}° creates low velocity runoff (rise h = ${(ridge_rise_m).toFixed(2)}m over ${(half_span).toFixed(2)}m run), causing capillary siphon and ponding risk during heavy tropical rainfall.`,
      recommended_fix: "Check the selected roof covering manufacturer's minimum pitch and project-specific drainage design.",
    });
  } else if (pitchDeg > 45.0) {
    discrepancies.push({
      id: "err-roof-pitch-steep",
      severity: "advisory",
      category: "angles",
      title: "Steep roof pitch flagged for project-specific review",
      detected_value: `θ = ${pitchDeg.toFixed(1)}°`,
      permissible_threshold: `Recommended θ ≤ 35.0° - 40.0°`,
      regulation_code: "Project-specific wind review",
      mathematical_proof: `Pitch angle θ = ${pitchDeg.toFixed(1)}° increases windward slope area and converts roof from suction to heavy positive wind drag, elevating lateral overturning moments.`,
      recommended_fix: "Request project-specific roof framing and wind design from a qualified local professional.",
    });
  }

  // Eaves Overhang Clearance Check
  if (overhang < 0.45) {
    discrepancies.push({
      id: "err-eaves-overhang",
      severity: "advisory",
      category: "geometry",
      title: "Eaves overhang is below configured planning threshold",
      detected_value: `${(overhang * 1000).toFixed(0)}mm overhang`,
      permissible_threshold: `Below configured 450mm planning threshold`,
      regulation_code: "Project-specific review",
      mathematical_proof: `Entered overhang is ${(overhang * 1000).toFixed(0)}mm; weather performance depends on project exposure and detailing.`,
      recommended_fix: "Check the overhang against the architectural design, weather exposure, and local requirements.",
    });
  }

  const level5Math: Level5RoofMath = {
    level_name: "Level 5: Roof Pitch Trigonometry & Structural Framing",
    roof_span_m: Math.round(roof_span_m * 100) / 100,
    roof_pitch_deg: pitchDeg,
    ridge_rise_m: Math.round(ridge_rise_m * 100) / 100,
    rafter_slope_length_m: Math.round(rafter_slope_length_m * 100) / 100,
    true_3d_roof_area_m2: Math.round(true_3d_roof_area_m2 * 100) / 100,
    horizontal_roof_footprint_m2: Math.round(horizontal_roof_footprint_m2 * 100) / 100,
    pitch_area_multiplier: Math.round(pitch_area_multiplier * 1000) / 1000,
    trusses_count,
    purlin_runs_per_slope,
    total_purlin_length_m: Math.round(total_purlin_length_m * 10) / 10,
    eaves_fascia_perimeter_m: Math.round(eaves_fascia_perimeter_m * 100) / 100,
    eaves_gutter_run_m: Math.round(eaves_gutter_run_m * 100) / 100,
    total_building_height_m: Math.round(total_building_height_m * 100) / 100,
    mathematical_proof: [
      `Roof span: S = W + 2·OH = ${W} + 2·${overhang} = ${roof_span_m.toFixed(2)} m (Half-span = ${half_span.toFixed(2)} m)`,
      `Ridge rise: h = (S/2) · tan(θ) = ${half_span.toFixed(2)} · tan(${pitchDeg}°) = ${ridge_rise_m.toFixed(2)} m`,
      `Rafter slope length: L_r = (S/2) / cos(θ) = ${half_span.toFixed(2)} / cos(${pitchDeg}°) = ${rafter_slope_length_m.toFixed(2)} m`,
      `True 3D Roof Area: A_true = A_plan / cos(θ) · ${hipFactor} = ${horizontal_roof_footprint_m2.toFixed(1)} / ${Math.cos(pitchRad).toFixed(3)} = ${true_3d_roof_area_m2.toFixed(1)} m²`,
      `Total building apex: Ground to ridge = ${total_building_height_m.toFixed(2)} m`,
    ],
  };

  // =========================================================
  // AERODYNAMIC WIND LOAD & UPLIFT LOGIC
  // Simplified illustrative wind-pressure arithmetic only
  // =========================================================
  // qz = 0.613 * Kz * Kzt * Kd * V^2 (SI, N/m²)
  // Fixed illustrative coefficients; not a validated jurisdictional wind model
  const Kz = input.wind_exposure === "D" ? 1.03 : input.wind_exposure === "C" ? 0.98 : 0.85;
  const Kzt = 1.0;
  const Kd = 0.85;
  const qz_pa = 0.613 * Kz * Kzt * Kd * Math.pow(V_wind, 2);

  // Pressure coefficients:
  const windward_wall_cpe = 0.80;
  const leeward_wall_cpe = -0.50;
  const internal_pressure_cpi = 0.18; // Fixed illustration assumption, not verified for the project

  // Roof aerodynamic suction coefficient based on pitch angle theta:
  let roof_cpe_windward = -0.70;
  if (pitchDeg < 10.0) {
    roof_cpe_windward = -1.0; // severe aerofoil suction
  } else if (pitchDeg <= 30.0) {
    roof_cpe_windward = -0.70;
  } else {
    // Transition from suction to positive pressure: Cp = 0.02 * theta - 0.70
    roof_cpe_windward = 0.02 * pitchDeg - 0.70;
  }
  const roof_cpe_leeward = -0.60;

  // Simplified illustrative pressure; excludes required code combinations and coefficients
  const gross_uplift_pressure_pa = qz_pa * (Math.abs(roof_cpe_windward) + internal_pressure_cpi);
  const gross_uplift_pressure_kpa = gross_uplift_pressure_pa / 1000;

  // Resisting dead weight per m²: 0.9 * (sheeting + timber framing + ceiling)
  // Sheeting ~0.045 kPa, timber ~0.120 kPa, ceiling ~0.090 kPa -> Total ~0.255 kPa
  const roof_dead_load_resistance_kpa = 0.9 * 0.255;

  const net_uplift_pressure_kpa = Math.max(0, gross_uplift_pressure_kpa - roof_dead_load_resistance_kpa);
  const total_net_uplift_force_kn = net_uplift_pressure_kpa * horizontal_roof_footprint_m2;
  const hurricane_ties_required = total_net_uplift_force_kn > 0;
  const tie_down_points_count = 2 * trusses_count;
  const tension_per_tie_kn = hurricane_ties_required
    ? total_net_uplift_force_kn / tie_down_points_count
    : 0;

  if (hurricane_ties_required) {
    discrepancies.push({
      id: "warn-wind-uplift",
      severity: tension_per_tie_kn > 4.0 ? "critical" : "warning",
      category: "wind",
      title: "Simplified wind screen indicates uplift may exceed assumed roof weight",
      detected_value: `Net uplift force = ${total_net_uplift_force_kn.toFixed(1)} kN`,
      permissible_threshold: `Gravity resisting weight = ${(roof_dead_load_resistance_kpa * horizontal_roof_footprint_m2).toFixed(1)} kN`,
      regulation_code: "Simplified wind screen",
      mathematical_proof: `Velocity pressure qz = 0.613 · ${Kz} · ${Kd} · ${V_wind}² = ${qz_pa.toFixed(1)} Pa. Net suction uplift pressure = ${net_uplift_pressure_kpa.toFixed(3)} kPa. Tension per truss tie = ${tension_per_tie_kn.toFixed(2)} kN.`,
      recommended_fix: "Obtain a site-specific roof pressure and connection design; this simplified screen cannot specify tie capacity or spacing.",
    });
  }

  const windMath: WindAerodynamicsMath = {
    basic_wind_speed_ms: V_wind,
    velocity_pressure_qz_pa: Math.round(qz_pa * 10) / 10,
    windward_wall_cpe,
    leeward_wall_cpe,
    roof_cpe_windward: Math.round(roof_cpe_windward * 100) / 100,
    roof_cpe_leeward,
    internal_pressure_cpi,
    gross_uplift_pressure_kpa: Math.round(gross_uplift_pressure_kpa * 1000) / 1000,
    roof_dead_load_resistance_kpa: Math.round(roof_dead_load_resistance_kpa * 1000) / 1000,
    net_uplift_pressure_kpa: Math.round(net_uplift_pressure_kpa * 1000) / 1000,
    total_net_uplift_force_kn: Math.round(total_net_uplift_force_kn * 10) / 10,
    hurricane_ties_required,
    required_tie_down_capacity_kn: Math.round(total_net_uplift_force_kn * 10) / 10,
    tie_down_points_count,
    tension_per_tie_kn: Math.round(tension_per_tie_kn * 100) / 100,
    mathematical_proof: [
      `Velocity pressure: q_z = 0.613 · K_z (${Kz}) · K_d (${Kd}) · V² (${V_wind} m/s)² = ${qz_pa.toFixed(1)} N/m²`,
      `Aerodynamic suction: p_gross = q_z · (|Cp_roof| (${Math.abs(roof_cpe_windward).toFixed(2)}) + Cp_i (0.18)) = ${gross_uplift_pressure_pa.toFixed(1)} N/m² (${gross_uplift_pressure_kpa.toFixed(3)} kPa)`,
      `Dead weight resistance: w_dead = 0.9 · 0.255 = ${roof_dead_load_resistance_kpa.toFixed(3)} kPa`,
      `Net uplift: p_net = max(0, ${gross_uplift_pressure_kpa.toFixed(3)} - ${roof_dead_load_resistance_kpa.toFixed(3)}) = ${net_uplift_pressure_kpa.toFixed(3)} kPa (Total ${total_net_uplift_force_kn.toFixed(1)} kN)`,
      `Simplified screen only: ${hurricane_ties_required ? `indicative tension = ${tension_per_tie_kn.toFixed(2)} kN across assumed ${tie_down_points_count} points` : "assumed gravity resistance exceeds modeled illustration"}. No anchor design is performed.`,
    ],
  };

  // =========================================================
  // 5D BIM SCHEDULE: QUANTITIES, COSTS & PHASING TIMELINE
  // 3D Geometry -> 4D Time -> 5D Cost & BOQ
  // =========================================================
  const total_concrete_volume_m3 =
    concrete_footing_volume_m3 +
    (L_centerline * footing_width_adopted * 0.05) + // Blinding
    slab_concrete_volume_m3 +
    ring_beam_concrete_volume;

  // Generic material-yield approximations; not a mix design
  const total_cement_bags_50kg = Math.ceil(
    (total_concrete_volume_m3 * 6.4) +
    (total_blocks_count / 30) // Mortar for blocks: ~1 bag per 30 blocks
  );
  const total_sand_m3 = Math.round(total_concrete_volume_m3 * 0.45 + (total_blocks_count / 100) * 10) / 10;
  const total_granite_m3 = Math.round(total_concrete_volume_m3 * 0.85 * 10) / 10;
  const total_rebar_tonnes = Math.round(((total_main_rebar_weight_kg * 1.5) / 1000) * 100) / 100;
  const total_roof_sheets_approx = Math.ceil(true_3d_roof_area_m2 / 2.5); // Standard 3m x 0.9m sheet with laps covers ~2.5m²

  const materialsSchedule = [
    { item: "Excavation to Foundation", category: "Substructure", quantity: Math.round(excavation_volume_m3), unit: "m³", notes: "Strip footing trenches @ 0.9m depth" },
    { item: "Blinding Concrete (1:3:6)", category: "Substructure", quantity: Math.round(L_centerline * footing_width_adopted * 0.05 * 10) / 10, unit: "m³", notes: "50mm protective bed" },
    { item: "Footing Concrete (illustrative mix)", category: "Substructure", quantity: Math.round(concrete_footing_volume_m3 * 10) / 10, unit: "m³", notes: `${(footing_thickness_m * 1000).toFixed(0)}mm assumed geometry; no structural design` },
    { item: "Ground Floor Slab Concrete", category: "Ground Floor", quantity: Math.round(slab_concrete_volume_m3 * 10) / 10, unit: "m³", notes: "Illustrative 150mm slab thickness assumption" },
    { item: "Masonry Blocks", category: "Superstructure", quantity: total_blocks_count, unit: "units", notes: `${(tw * 1000).toFixed(0)}mm blocks including 5% wastage` },
    { item: "Ring Beam Concrete", category: "Superstructure", quantity: Math.round(ring_beam_concrete_volume * 10) / 10, unit: "m³", notes: "225x225mm perimeter tie beam" },
    { item: "Assumed longitudinal reinforcement", category: "Reinforcement", quantity: Math.round(total_main_rebar_weight_kg), unit: "kg", notes: "Illustrative ring-beam quantity only; not a reinforcement schedule" },
    { item: "Roof Covering Sheets", category: "Roofing", quantity: total_roof_sheets_approx, unit: "sheets", notes: `True slope area ${true_3d_roof_area_m2.toFixed(1)}m² at ${pitchDeg}°` },
    { item: "Roof timber quantity illustration", category: "Roofing", quantity: Math.round(total_purlin_length_m + trusses_count * half_span * 4), unit: "m", notes: `${trusses_count} assumed truss sets; spacing and member design unverified` },
    { item: "Fascia & Gutter Eaves Run", category: "Roofing", quantity: Math.round(eaves_fascia_perimeter_m), unit: "m", notes: "Perimeter eaves fascia" },
  ];

  const timeline_phases: FiveDBimSchedule["timeline_phases"] = [
    { phase_number: 1, phase_name: "Excavation & Blinding", level: "Level 1", duration_days: 4, curing_hold_days: 1, cumulative_days: 5, milestone: "Foundation trenches ready & blinded" },
    { phase_number: 2, phase_name: "Foundation Footing & Dwarf Wall", level: "Level 1", duration_days: 5, curing_hold_days: 7, cumulative_days: 17, milestone: "Footing cast & substructure walling complete" },
    { phase_number: 3, phase_name: "Hardcore, DPC & Oversite Slab", level: "Level 2", duration_days: 4, curing_hold_days: 7, cumulative_days: 28, milestone: "Ground slab cured to 7-day striking strength" },
    { phase_number: 4, phase_name: "Superstructure Block Walling", level: "Level 3", duration_days: 10 * storeys, curing_hold_days: 2, cumulative_days: 28 + (12 * storeys), milestone: "Superstructure blocks laid to lintel head" },
    { phase_number: 5, phase_name: "Lintel & Ring Beam Casting", level: "Level 4", duration_days: 4, curing_hold_days: 14, cumulative_days: 46 + (12 * storeys), milestone: "Ring beam cured to design compressive strength" },
    { phase_number: 6, phase_name: "Roof Framing, Trusses & Cladding", level: "Level 5", duration_days: 7, curing_hold_days: 0, cumulative_days: 53 + (12 * storeys), milestone: "Roof covered, hurricane ties anchored, shell dry" },
  ];

  const total_project_days = timeline_phases[timeline_phases.length - 1].cumulative_days;

  const five_d_bim: FiveDBimSchedule = {
    materials: materialsSchedule,
    total_concrete_volume_m3: Math.round(total_concrete_volume_m3 * 10) / 10,
    total_cement_bags_50kg,
    total_sand_m3,
    total_granite_m3,
    total_blocks_units: total_blocks_count,
    total_rebar_tonnes,
    total_roof_sheets_approx,
    timeline_phases,
    total_project_days,
  };

  // Derived Build-to-Roof Input Patch
  const derived_patch: Partial<BuildToRoofInput> = {
    project_name: input.project_name,
    building_type: input.building_type,
    number_of_floors: input.storeys,
    measurement_unit: "m",
    building_length: L,
    building_width: W,
    floor_to_floor_height: H,
    wall_thickness: tw,
    internal_wall_length: input.internal_wall_length,
    foundation_type: "strip_footing",
    foundation_depth: excavation_depth_m,
    foundation_width: footing_width_adopted,
    footing_thickness: footing_thickness_m,
    blinding_thickness: 0.05,
    hardcore_thickness: 0.20,
    roof_type: input.roof_type,
    roof_pitch_degrees: pitchDeg,
    roof_overhang: overhang,
    openings: input.openings.map((o) => ({
      type: o.type,
      width: o.width,
      height: o.height,
      count: o.count,
      label: o.label,
    })),
  };

  const _violations_count = discrepancies.filter((d) => d.severity === "critical").length;
  const regulation_compliance = {
    passed_all: false as const,
    checks_count: 0 as const,
    passed_count: 0 as const,
    violations_count: 0 as const,
    note: "No building-regulation compliance checks are performed.",
  };

  return {
    input,
    timestamp: new Date().toISOString(),
    levels: {
      level_1_foundation: level1Math,
      level_2_ground_slab: level2Math,
      level_3_superstructure: level3Math,
      level_4_ring_beam: level4Math,
      level_5_roof: level5Math,
    },
    wind_analysis: windMath,
    discrepancies,
    regulation_compliance,
    five_d_bim,
    derived_patch,
  };
}
