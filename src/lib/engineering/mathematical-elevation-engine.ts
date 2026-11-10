// =========================================================
// FRELUX DETERMINISTIC MATHEMATICAL PLAN ELEVATION ENGINE
// Deterministic architectural geometry and indicative quantity schedule
//
// Pure architectural geometry and illustrative quantities:
// - NO AI or external LLM/vision inference
// - Trigonometric pitch elevation & true slope 3D geometry
// - No soil, structural capacity, connection, lintel or code-compliance checks
// - No block, reinforcement, foundation, product yield or roof framing takeoff without required specifications
// - No generic wind-pressure or connection outputs
// - Geometry and indicative quantities only; no assumed project programme
// =========================================================

import { round1, round2, round3 } from "@/lib/engineering/rounding";
import type {
  BuildToRoofInput,
  BuildingType,
  RoofType,
} from "@/types/build-to-roof";

// ── Types & Interfaces ──

export type SoilTypeKey = "unverified";

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
  /** Site-specific allowable bearing value from a geotechnical report; null means unknown. */
  soil_bearing_capacity_kpa: number | null;
  basic_wind_speed_ms: number; // retained input only; not used to calculate design loads
  wind_exposure: "B" | "C" | "D"; // retained input only; no wind design is performed
  openings: PlanOpening[];
  occupancy_type?: "residential" | "commercial" | "institutional";
}

export interface Level1FoundationMath {
  level_name: string;
  excavation_depth_m: null;
  footing_width_calculated_m: null;
  footing_width_adopted_m: null;
  footing_thickness_m: null;
  total_working_dead_load_kn_m: null;
  total_working_live_load_kn_m: null;
  total_line_load_kn_m: null;
  applied_soil_pressure_kpa: number | null;
  allowable_bearing_capacity_kpa: number | null;
  bearing_utilization_pct: number | null;
  bearing_margin_on_allowable: number | null;
  /** Null: this tool does not perform a foundation design/check. */
  is_bearing_safe: null;
  blinding_thickness_m: null;
  hardcore_thickness_m: null;
  dpc_elevation_m: null;
  excavation_volume_m3: null;
  concrete_footing_volume_m3: null;
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
  slenderness_limit: null;
  /** Null: ratio is descriptive only; no masonry stability check is performed. */
  is_slenderness_compliant: null;
  wall_courses_count: null;
  total_blocks_count: null;
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
  main_rebar_diameter_mm: null;
  main_rebar_bars_count: null;
  total_main_rebar_weight_kg: null;
  stirrups_spacing_mm: null;
  /** Empty until a span/load/material-specific lintel design is provided. */
  lintel_checks: [];
  mathematical_proof: string[];
}

export interface Level5RoofMath {
  level_name: string;
  roof_span_m: number | null;
  roof_pitch_deg: number;
  ridge_rise_m: number | null;
  rafter_slope_length_m: number | null;
  /** Coarse plan/pitch proxy; not a roof-plan takeoff. */
  approximate_roof_covering_area_m2: number | null;
  horizontal_roof_footprint_m2: number;
  pitch_area_multiplier: number;
  trusses_count: null;
  purlin_runs_per_slope: null;
  total_purlin_length_m: null;
  eaves_fascia_perimeter_m: number;
  eaves_gutter_run_m: number;
  /** Height of the wall top above finished ground level. */
  eaves_height_m: number;
  /** Height of the ridge above finished ground level. */
  total_building_height_m: number;
  mathematical_proof: string[];
}

export interface WindAerodynamicsMath {
  basic_wind_speed_ms: number;
  velocity_pressure_qz_pa: null;
  windward_wall_cpe: null;
  leeward_wall_cpe: null;
  roof_cpe_windward: null;
  /** The roof coefficient actually used, after sign handling. */
  governing_roof_suction_cp: null;
  roof_cpe_leeward: null;
  internal_pressure_cpi: null;
  gross_uplift_pressure_kpa: null;
  roof_dead_load_resistance_kpa: null;
  net_uplift_pressure_kpa: null;
  total_net_uplift_force_kn: null;
  hurricane_ties_required: null;
  /** Per-tie demand in kN; total_net_uplift_force_kn holds the total force. */
  required_tie_down_capacity_kn: null;
  tie_down_points_count: null;
  /** Indicative tension per truss tie, which is the connection demand. */
  tension_per_tie_kn: null;
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
  total_cement_bags_50kg: null;
  total_sand_m3: null;
  total_granite_m3: null;
  total_blocks_units: null;
  total_rebar_tonnes: null;
  total_rebar_kg: null;
  total_mortar_volume_m3: null;
  total_roof_sheets_approx: null;
  timeline_phases: Array<{
    phase_number: number;
    phase_name: number | string;
    level: string;
    duration_days: number;
    curing_hold_days: number;
    cumulative_days: number;
    milestone: string;
  }>;
  total_project_days: null;
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

// ── Defaults are for geometry and quantity illustration only. ──

/**
 * Storey range this geometry model supports. It measures walls, beams, one
 * ground slab and one roof, so it stays inside the range where that description
 * is still true of the building. Taller buildings belong to the tall building
 * engine, which performs the lateral design this model deliberately omits.
 */
export const MAX_SUPPORTED_STOREYS = 60;

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
  roof_overhang: 0.6,
  roof_type: "hip",
  soil_type: "unverified",
  soil_bearing_capacity_kpa: null,
  basic_wind_speed_ms: 34.0, // standard inland design speed (122 km/h)
  wind_exposure: "B", // suburban / urban terrain
  openings: [
    {
      id: "d1",
      type: "door",
      width: 1.0,
      height: 2.1,
      count: 1,
      wall_side: "front",
      label: "Main Entrance Door",
    },
    {
      id: "d2",
      type: "door",
      width: 0.9,
      height: 2.1,
      count: 3,
      wall_side: "back",
      label: "Internal & Kitchen Doors",
    },
    {
      id: "w1",
      type: "window",
      width: 1.5,
      height: 1.2,
      count: 4,
      wall_side: "front",
      label: "Living / Front Windows",
    },
    {
      id: "w2",
      type: "window",
      width: 1.2,
      height: 1.2,
      count: 4,
      wall_side: "back",
      label: "Bedroom Windows",
    },
    {
      id: "w3",
      type: "window",
      width: 0.6,
      height: 0.6,
      count: 2,
      wall_side: "left",
      label: "Bathroom High Windows",
    },
  ],
  occupancy_type: "residential",
};

// ── Core Hand Mathematics & Deterministic Elevation Function ──

export function calculateMathematicalElevation(
  rawInput: Partial<PlanElevationInput>,
): MathematicalElevationResult {
  const finiteInput = (value: number | undefined, fallback: number) =>
    value !== undefined && Number.isFinite(value) ? value : fallback;
  const input: PlanElevationInput = {
    ...DEFAULT_PLAN_INPUT,
    ...rawInput,
    building_length: Math.max(
      3.0,
      finiteInput(rawInput.building_length, DEFAULT_PLAN_INPUT.building_length),
    ),
    building_width: Math.max(
      3.0,
      finiteInput(rawInput.building_width, DEFAULT_PLAN_INPUT.building_width),
    ),
    floor_to_floor_height: Math.max(
      2.1,
      finiteInput(
        rawInput.floor_to_floor_height,
        DEFAULT_PLAN_INPUT.floor_to_floor_height,
      ),
    ),
    storeys: Math.max(
      1,
      Math.min(MAX_SUPPORTED_STOREYS, Math.round(finiteInput(
        rawInput.storeys,
        DEFAULT_PLAN_INPUT.storeys,
      ))),
    ),
    wall_thickness: Math.max(
      0.12,
      Math.min(
        0.4,
        finiteInput(rawInput.wall_thickness, DEFAULT_PLAN_INPUT.wall_thickness),
      ),
    ),
    internal_wall_length: Math.max(
      0,
      finiteInput(
        rawInput.internal_wall_length,
        DEFAULT_PLAN_INPUT.internal_wall_length,
      ),
    ),
    roof_pitch_deg: Math.max(
      5.0,
      Math.min(
        60.0,
        finiteInput(rawInput.roof_pitch_deg, DEFAULT_PLAN_INPUT.roof_pitch_deg),
      ),
    ),
    roof_overhang: Math.max(
      0.2,
      Math.min(
        1.5,
        finiteInput(rawInput.roof_overhang, DEFAULT_PLAN_INPUT.roof_overhang),
      ),
    ),
    soil_bearing_capacity_kpa:
      typeof rawInput.soil_bearing_capacity_kpa === "number" &&
      Number.isFinite(rawInput.soil_bearing_capacity_kpa) &&
      rawInput.soil_bearing_capacity_kpa > 0
        ? rawInput.soil_bearing_capacity_kpa
        : null,
    basic_wind_speed_ms: Math.max(
      20,
      Math.min(
        70,
        finiteInput(
          rawInput.basic_wind_speed_ms,
          DEFAULT_PLAN_INPUT.basic_wind_speed_ms,
        ),
      ),
    ),
    openings: (rawInput.openings ?? DEFAULT_PLAN_INPUT.openings).map(
      (opening) => {
        const finiteOrZero = (value: number) =>
          Number.isFinite(value) ? value : 0;
        return {
          ...opening,
          width: Math.max(0, finiteOrZero(opening.width)),
          height: Math.max(0, finiteOrZero(opening.height)),
          count: Math.max(0, Math.round(finiteOrZero(opening.count))),
        };
      },
    ),
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

  const discrepancies: HandMathDiscrepancy[] = [];
  const normalizedFields: Array<[keyof PlanElevationInput, string]> = [
    ["building_length", "Building length"],
    ["building_width", "Building width"],
    ["floor_to_floor_height", "Floor-to-floor height"],
    ["storeys", "Storey count"],
    ["wall_thickness", "Wall thickness"],
    ["internal_wall_length", "Internal wall length"],
    ["roof_pitch_deg", "Roof pitch"],
    ["roof_overhang", "Roof overhang"],
    ["basic_wind_speed_ms", "Wind speed input"],
  ];
  for (const [field, label] of normalizedFields) {
    const requested = rawInput[field] as unknown;
    const used = input[field];
    if (
      requested !== undefined &&
      (typeof requested !== "number" || !Number.isFinite(requested))
    ) {
      discrepancies.push({
        id: `input-invalid-${field}`,
        severity: "warning",
        category: "geometry",
        title: `${label} was not a valid number`,
        detected_value: String(requested),
        permissible_threshold: "Enter a finite numeric value",
        regulation_code: "Input validation",
        mathematical_proof: `The invalid ${label.toLowerCase()} value was replaced with the documented default ${String(used)} before calculation.`,
        recommended_fix:
          "Enter a valid number and review the resulting value shown by the calculator.",
      });
    } else if (
      typeof requested === "number" &&
      Number.isFinite(requested) &&
      requested !== used
    ) {
      discrepancies.push({
        id: `input-normalized-${field}`,
        severity: "advisory",
        category: "geometry",
        title: `${label} adjusted to supported input range`,
        detected_value: `Entered ${requested}; calculator uses ${used}`,
        permissible_threshold: "See the displayed input limits",
        regulation_code: "Input normalization",
        mathematical_proof: `The value ${requested} was normalized to ${used} before calculations.`,
        recommended_fix:
          "Review the displayed value and limits; update the field if this is not intended.",
      });
    }
  }
  (rawInput.openings ?? []).forEach((requested, index) => {
    const used = input.openings[index];
    if (!used) return;
    for (const field of ["width", "height", "count"] as const) {
      const requestedValue = requested[field] as unknown;
      if (
        requestedValue !== undefined &&
        (typeof requestedValue !== "number" || !Number.isFinite(requestedValue))
      ) {
        discrepancies.push({
          id: `input-invalid-opening-${index}-${field}`,
          severity: "warning",
          category: "geometry",
          title: `Opening ${field} was not a valid number`,
          detected_value: String(requestedValue),
          permissible_threshold: "Enter a finite, non-negative number",
          regulation_code: "Input validation",
          mathematical_proof: `Opening ${index + 1} ${field} was set to 0 because the supplied value is invalid.`,
          recommended_fix:
            "Enter a valid opening measurement or count and verify the updated deduction.",
        });
      } else if (
        typeof requestedValue === "number" &&
        Number.isFinite(requestedValue) &&
        requestedValue !== used[field]
      ) {
        discrepancies.push({
          id: `input-normalized-opening-${index}-${field}`,
          severity: "advisory",
          category: "geometry",
          title: `Opening ${field} adjusted before calculation`,
          detected_value: `Entered ${requested[field]}; calculator uses ${used[field]}`,
          permissible_threshold: "Non-negative dimensions and count",
          regulation_code: "Input normalization",
          mathematical_proof: `Opening ${index + 1} ${field} was normalized from ${requestedValue} to ${used[field]}.`,
          recommended_fix: "Review the opening value shown in the form.",
        });
      }
    }
  });

  // =========================================================
  // LEVEL 1: FOUNDATION & SUBSTRUCTURE
  // No footing geometry, soil bearing, load path or excavation design is computed.
  // =========================================================
  const P_ext = 2 * (L + W);
  const L_centerline = P_ext + input.internal_wall_length;
  const level1Math: Level1FoundationMath = {
    level_name: "Level 1: Substructure & Foundation",
    excavation_depth_m: null,
    footing_width_calculated_m: null,
    footing_width_adopted_m: null,
    footing_thickness_m: null,
    total_working_dead_load_kn_m: null,
    total_working_live_load_kn_m: null,
    total_line_load_kn_m: null,
    applied_soil_pressure_kpa: null,
    allowable_bearing_capacity_kpa: q_allow,
    bearing_utilization_pct: null,
    bearing_margin_on_allowable: null,
    is_bearing_safe: null,
    blinding_thickness_m: null,
    hardcore_thickness_m: null,
    dpc_elevation_m: null,
    excavation_volume_m3: null,
    concrete_footing_volume_m3: null,
    mathematical_proof: [
      "Not assessed: footing geometry, excavation depth and quantities require site-specific geotechnical and structural design inputs.",
      q_allow === null
        ? "No site-specific allowable bearing value supplied. Soil type is not used to infer one."
        : `A site-specific allowable bearing value (${q_allow} kPa) was supplied, but no bearing check is performed.`,
      "No foundation load combination, bearing pressure, footing reinforcement, bearing utilization or safety status is calculated.",
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
    slab_area_m2: round2(net_internal_slab_area),
    slab_concrete_volume_m3: round2(slab_concrete_volume_m3),
    brc_mesh_area_m2: round2(net_internal_slab_area * 1.1),
    dpm_membrane_area_m2: round2(net_internal_slab_area * 1.15),
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
    if (side in sideOpeningWidths)
      sideOpeningWidths[side] += op.width * op.count;
  });

  const gross_masonry_area_m2 =
    gross_external_wall_area_m2 + gross_internal_wall_area_m2;
  // A floor of 10 m² used to be applied here, which fabricated wall area on a
  // building smaller than that and hid openings larger than the walls. The area
  // now falls to zero and the over deduction is reported instead.
  const net_masonry_area_m2 = Math.max(
    0,
    gross_masonry_area_m2 - total_opening_deductions_m2,
  );

  if (total_opening_deductions_m2 > gross_masonry_area_m2) {
    discrepancies.push({
      id: "err-openings-exceed-walls",
      severity: "critical",
      category: "geometry",
      title: "Opening areas exceed the wall area they sit in",
      detected_value: `${total_opening_deductions_m2.toFixed(1)} m² of openings`,
      permissible_threshold: `${gross_masonry_area_m2.toFixed(1)} m² of gross wall`,
      regulation_code: "Input consistency",
      mathematical_proof: `Openings total ${total_opening_deductions_m2.toFixed(1)} m² against ${gross_masonry_area_m2.toFixed(1)} m² of gross wall area, so net masonry is held at 0 m². One of the two inputs cannot be right.`,
      recommended_fix:
        "Check the opening counts, widths and heights against the wall runs, then re-enter the schedule.",
    });
  }

  // A glazed envelope is a legitimate building, not a data error. This model
  // measures the solid wall that remains, so say plainly how much of the
  // envelope is glazed and where the glass itself is priced.
  const glazedSharePercent =
    gross_masonry_area_m2 > 0
      ? (total_opening_deductions_m2 / gross_masonry_area_m2) * 100
      : 0;
  const openingAreaByType = input.openings.reduce(
    (totals, opening) => {
      const area = opening.width * opening.height * opening.count;
      if (opening.type === "window") totals.window += area;
      else if (opening.type === "door") totals.door += area;
      else totals.other += area;
      return totals;
    },
    { window: 0, door: 0, other: 0 },
  );
  const glazedAreaM2 = openingAreaByType.window;
  const doorAreaM2 = openingAreaByType.door;
  if (
    glazedSharePercent >= 60 &&
    total_opening_deductions_m2 <= gross_masonry_area_m2
  ) {
    discrepancies.push({
      id: "advisory-glazed-envelope",
      severity: "advisory",
      category: "geometry",
      title: "Envelope is predominantly glazed",
      detected_value: `${glazedSharePercent.toFixed(1)}% of the gross wall is opening`,
      permissible_threshold: "Advisory only; a glazed envelope is a valid design",
      regulation_code: "Scope note",
      mathematical_proof: `Openings total ${total_opening_deductions_m2.toFixed(1)} m² of the ${gross_masonry_area_m2.toFixed(1)} m² gross wall, so only ${net_masonry_area_m2.toFixed(1)} m² is solid masonry. Of the openings, ${glazedAreaM2.toFixed(1)} m² are windows and ${doorAreaM2.toFixed(1)} m² are doors. Glass, framing and fixings are not measured or priced here.`,
      recommended_fix: `Enter ${glazedAreaM2.toFixed(1)} m² of glazing as panels of the size being bought: the windows and doors estimator prices per unit, so its rate must match the panel size, not a standard window.`,

    });
  }

  // Geometry ratio only; no effective-height factor or capacity check.
  const effective_wall_height_m = H;
  const slenderness_ratio = effective_wall_height_m / tw;
  const slenderness_limit = null;
  const is_slenderness_compliant = null;

  // Geometry consistency check only; opening positions, piers, lintels and
  // structural wall capacity are not represented by the aggregate schedule.
  let max_opening_ratio_percent = 0;
  Object.keys(sideWidths).forEach((side) => {
    const sideLen = sideWidths[side] * storeys;
    const openWidth = sideOpeningWidths[side] || 0;
    const ratioPct = (openWidth / sideLen) * 100;
    if (ratioPct > max_opening_ratio_percent) {
      max_opening_ratio_percent = ratioPct;
    }
    if (ratioPct > 100) {
      discrepancies.push({
        id: `err-opening-ratio-${side}`,
        severity: "critical",
        category: "geometry",
        title: `Aggregate opening widths exceed the ${side.toUpperCase()} wall length across entered storeys`,
        detected_value: `${ratioPct.toFixed(1)}% opening width`,
        permissible_threshold: `≤ ${storeys} storey wall runs`,
        regulation_code: "Geometry consistency only",
        mathematical_proof: `Entered opening widths on ${side} total ${openWidth.toFixed(2)}m over ${storeys} storey run(s) totaling ${sideLen.toFixed(2)}m (${ratioPct.toFixed(1)}%). This is not a structural wall check.`,
        recommended_fix:
          "Check opening counts and wall-side assignments. Wall strength and stability are not checked here.",
      });
    }
  });

  // Optional user-input height warning; not a regulatory check
  if (H < 2.6) {
    discrepancies.push({
      id: "err-headroom-clearance",
      severity: "warning",
      category: "regulation",
      title: "Entered storey height is below illustrative screening threshold",
      detected_value: `${H.toFixed(2)}m clear height`,
      permissible_threshold: `Below configured 2.60m planning threshold`,
      regulation_code: "Check local requirements",
      mathematical_proof: `Entered storey height H = ${H.toFixed(2)}m is below the configured 2.60m planning threshold; applicability must be checked locally.`,
      recommended_fix:
        "Check room-height requirements against the applicable local building regulations and project brief.",
    });
  }

  // Product dimensions and course heights are not input, so a block/course
  // takeoff would require invented assumptions.
  const total_blocks_count = null;
  const wall_courses_count = null;

  const level3Math: Level3SuperstructureMath = {
    level_name: "Level 3: Superstructure Walls & Openings",
    gross_external_wall_area_m2: round2(gross_external_wall_area_m2),
    gross_internal_wall_area_m2: round2(gross_internal_wall_area_m2),
    total_opening_deductions_m2: round2(total_opening_deductions_m2),
    net_masonry_area_m2: round2(net_masonry_area_m2),
    effective_wall_height_m: round2(effective_wall_height_m),
    slenderness_ratio: round1(slenderness_ratio),
    slenderness_limit,
    is_slenderness_compliant,
    wall_courses_count,
    total_blocks_count,
    max_opening_ratio_percent: round1(max_opening_ratio_percent),
    mathematical_proof: [
      `Gross Area: A_ext (${gross_external_wall_area_m2.toFixed(1)} m²) + A_int (${gross_internal_wall_area_m2.toFixed(1)} m²) - Deductions (${total_opening_deductions_m2.toFixed(1)} m²) = ${net_masonry_area_m2.toFixed(1)} m²`,
      `Geometric storey-height / wall-thickness ratio: ${effective_wall_height_m.toFixed(2)} / ${tw} = ${slenderness_ratio.toFixed(1)}. No effective-height factor or structural limit is applied.`,
      "Block and course counts not assessed: product dimensions, bond, openings and waste allowance are not specified.",
    ],
  };

  // =========================================================
  // LEVEL 4: RING BEAM & LINTELS MATHEMATICS
  // Illustrative ring-beam quantities only
  // =========================================================
  const ring_beam_width_m = tw;
  const ring_beam_depth_m = 0.225;
  // A ring beam runs at each floor level, roof level included, so a multi storey
  // building has one beam set per storey. Counting the run once and printing it
  // against a tower understated the beams by the storey count.
  const beam_levels = storeys;
  const beam_length_per_level_m = L_centerline;
  const total_beam_length_m = beam_length_per_level_m * beam_levels;
  const ring_beam_concrete_volume =
    total_beam_length_m * ring_beam_width_m * ring_beam_depth_m;
  // No reinforcement quantity is produced without a project-specific design.
  const main_rebar_bars_count = null;
  const main_rebar_diameter_mm = null;
  const total_main_rebar_weight_kg = null;

  // Openings are counted for wall quantities only. No lintel span, depth,
  // bearing or capacity checks are performed without loads and materials.
  const lintel_checks: Level4RingBeamMath["lintel_checks"] = [];

  const level4Math: Level4RingBeamMath = {
    level_name: "Level 4: Illustrative Ring Beam Geometry",
    elevation_at_beam_top_m: round2(
      plinth_height_above_ground_m + H * storeys + ring_beam_depth_m,
    ),
    ring_beam_width_m,
    ring_beam_depth_m,
    total_beam_length_m: round2(total_beam_length_m),
    concrete_volume_m3: round2(ring_beam_concrete_volume),
    main_rebar_diameter_mm,
    main_rebar_bars_count,
    total_main_rebar_weight_kg,
    stirrups_spacing_mm: null,
    lintel_checks,
    mathematical_proof: [
      `Continuous perimeter bond beam: ${beam_length_per_level_m.toFixed(2)}m per level × ${beam_levels} level(s) = ${total_beam_length_m.toFixed(2)}m, Section = ${(ring_beam_width_m * 1000).toFixed(0)} × ${(ring_beam_depth_m * 1000).toFixed(0)} mm`,
      `Concrete volume: V_beam = ${total_beam_length_m.toFixed(2)} · ${ring_beam_width_m} · ${ring_beam_depth_m} = ${ring_beam_concrete_volume.toFixed(2)} m³`,
      "Reinforcement, anchorage, laps and links are not specified or quantified; obtain a project-specific design.",
    ],
  };

  // =========================================================
  // LEVEL 5: ROOF STRUCTURE & PITCH TRIGONOMETRY
  // Parametric roof geometry only; not structural member design
  // =========================================================
  const roofGeometrySupported =
    input.roof_type === "gable" || input.roof_type === "hip";
  const roof_span_m = Math.min(L, W);
  const half_span = roof_span_m / 2;
  const ridge_rise_m = roofGeometrySupported
    ? half_span * Math.tan(pitchRad)
    : null;
  // The single common-rafter slope is only meaningful for the modeled gable.
  // Hip rafters and hip planes have different geometry and are not quantified.
  const rafter_slope_length_m =
    input.roof_type === "gable"
      ? (half_span + overhang) / Math.cos(pitchRad)
      : null;
  const horizontal_roof_footprint_m2 = (L + 2 * overhang) * (W + 2 * overhang);
  const pitch_area_multiplier = 1 / Math.cos(pitchRad);
  // A plane at pitch theta projects onto the plan at cos(theta) of its true
  // area, so true area = plan projection / cos(theta) for every plane. The
  // planes of a gable or hip roof together project onto exactly the footprint,
  // which is why a hip roof needs no extra area factor. A premium was applied
  // here before, inflating hips by 6% that geometry does not support.
  // A rectangular plan/pitch proxy is suitable only for the simple gable
  // model. Hip planes have differing pitches and need roof-plan geometry.
  const approximate_roof_covering_area_m2 =
    input.roof_type === "gable"
      ? horizontal_roof_footprint_m2 * pitch_area_multiplier
      : null;

  // Framing spacing is design/product specific and is not estimated here.
  const roof_eave_run_m =
    input.roof_type === "hip"
      ? 2 * (L + W + 4 * overhang)
      : 2 * (Math.max(L, W) + 2 * overhang);
  const eaves_fascia_perimeter_m = roof_eave_run_m;
  const eaves_gutter_run_m = roof_eave_run_m;

  // Height above finished ground level. The excavation depth is not part of the
  // building's height; it is reported on the substructure level instead.
  const eaves_height_m =
    plinth_height_above_ground_m + H * storeys + ring_beam_depth_m;
  // Round the parts before summing so the figures a visitor adds up on the page
  // add up: a displayed ridge that is a centimetre off reads like an error.
  // Round once, from the unrounded geometry: adding two rounded figures moves
  // the apex by up to a centimetre against the ridge rise printed beside it.
  const eaves_display_m = round2(eaves_height_m);
  const total_building_height_m = round2(eaves_height_m + (ridge_rise_m ?? 0));

  // Roof Pitch Discrepancy Checks
  if (roofGeometrySupported && pitchDeg < 12.0) {
    discrepancies.push({
      id: "err-roof-pitch-low",
      severity: "warning",
      category: "angles",
      title: "Roof pitch is below configured product-check threshold",
      detected_value: `θ = ${pitchDeg.toFixed(1)}°`,
      permissible_threshold: `θ ≥ 12.0° (corrugated / trapezoidal sheets)`,
      regulation_code: "Product-specific review required",
      mathematical_proof: `Pitch angle θ = ${pitchDeg.toFixed(1)}° is geometry only; minimum pitch depends on the selected covering product and drainage design.`,
      recommended_fix:
        "Check the selected roof covering manufacturer's minimum pitch and project-specific drainage design.",
    });
  } else if (roofGeometrySupported && pitchDeg > 45.0) {
    discrepancies.push({
      id: "err-roof-pitch-steep",
      severity: "advisory",
      category: "angles",
      title: "Steep roof pitch flagged for project-specific review",
      detected_value: `θ = ${pitchDeg.toFixed(1)}°`,
      permissible_threshold: `Recommended θ ≤ 35.0° - 40.0°`,
      regulation_code: "Project-specific wind review",
      mathematical_proof: `Pitch angle θ = ${pitchDeg.toFixed(1)}° is an input geometry only; no wind response or structural consequence is assessed.`,
      recommended_fix:
        "Request project-specific roof framing and wind design from a qualified local professional.",
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
      recommended_fix:
        "Check the overhang against the architectural design, weather exposure, and local requirements.",
    });
  }

  const level5Math: Level5RoofMath = {
    level_name: "Level 5: Roof Pitch Geometry (not structural framing)",
    roof_span_m: roofGeometrySupported ? round2(roof_span_m) : null,
    roof_pitch_deg: pitchDeg,
    ridge_rise_m: ridge_rise_m === null ? null : round2(ridge_rise_m),
    rafter_slope_length_m:
      rafter_slope_length_m === null ? null : round2(rafter_slope_length_m),
    approximate_roof_covering_area_m2:
      approximate_roof_covering_area_m2 === null
        ? null
        : round2(approximate_roof_covering_area_m2),
    horizontal_roof_footprint_m2: round2(horizontal_roof_footprint_m2),
    pitch_area_multiplier: round3(pitch_area_multiplier),
    trusses_count: null,
    purlin_runs_per_slope: null,
    total_purlin_length_m: null,
    eaves_fascia_perimeter_m: round2(eaves_fascia_perimeter_m),
    eaves_gutter_run_m: round2(eaves_gutter_run_m),
    eaves_height_m: eaves_display_m,
    total_building_height_m,
    mathematical_proof: [
      roofGeometrySupported
        ? `Clear roof span: S = min(L, W) = ${roof_span_m.toFixed(2)} m (overhang does not change ridge rise; half-span = ${half_span.toFixed(2)} m)`
        : `Roof form ${input.roof_type} is not modeled by the gable/hip geometry in this calculator.`,
      roofGeometrySupported
        ? `Ridge rise: h = (S/2) · tan(θ) = ${half_span.toFixed(2)} · tan(${pitchDeg}°) = ${ridge_rise_m!.toFixed(2)} m`
        : "Ridge rise is not assessed for this roof form.",
      input.roof_type === "gable"
        ? "Illustrative gable common-rafter slope length; this is not a member design or cutting schedule."
        : "Rafter lengths are not assessed for this roof form; hip and jack-rafter geometry is not modeled.",
      input.roof_type === "gable"
        ? `Approximate gable roof surface proxy: expanded plan ${horizontal_roof_footprint_m2.toFixed(1)} m² / cos(${pitchDeg}°) = ${approximate_roof_covering_area_m2!.toFixed(1)} m². Verify roof plan, laps, cuts, penetrations and product coverage before ordering.`
        : "Roof surface area is not assessed for this roof form; a hip roof plan is required.",
      `Apex above finished ground level = plinth ${plinth_height_above_ground_m.toFixed(2)} + walls ${(H * storeys).toFixed(2)} + ring beam ${ring_beam_depth_m.toFixed(2)} + rise ${ridge_rise_m === null ? "not assessed" : ridge_rise_m.toFixed(2)} = ${total_building_height_m.toFixed(2)} m`,
    ],
  };

  // No wind pressure, uplift or tie demand is computed. A reliable result needs
  // a jurisdictional wind basis, site exposure/topography, building enclosure,
  // geometry, pressure zones and connection design that this form does not ask for.
  const windMath: WindAerodynamicsMath = {
    basic_wind_speed_ms: input.basic_wind_speed_ms,
    velocity_pressure_qz_pa: null,
    windward_wall_cpe: null,
    leeward_wall_cpe: null,
    roof_cpe_windward: null,
    governing_roof_suction_cp: null,
    roof_cpe_leeward: null,
    internal_pressure_cpi: null,
    gross_uplift_pressure_kpa: null,
    roof_dead_load_resistance_kpa: null,
    net_uplift_pressure_kpa: null,
    total_net_uplift_force_kn: null,
    hurricane_ties_required: null,
    required_tie_down_capacity_kn: null,
    tie_down_points_count: null,
    tension_per_tie_kn: null,
    mathematical_proof: [
      "Not assessed: the inputs do not define a jurisdictional wind standard, site-specific parameters, pressure zones, enclosure classification or connection design.",
      "Do not use wind speed or exposure selections in this form to size roof members, anchors or ties.",
    ],
  };

  // =========================================================
  // 5D BIM SCHEDULE: QUANTITIES, COSTS & PHASING TIMELINE
  // 3D Geometry -> 4D Time -> 5D Cost & BOQ
  // =========================================================
  const total_concrete_volume_m3 =
    slab_concrete_volume_m3 + ring_beam_concrete_volume;

  // No mix design, aggregate bulk-density, product yield, or block-joint
  // specification is collected. Do not derive marketable material totals.
  const mortar_volume_m3 = null;
  const total_cement_bags_50kg = null;
  const total_sand_m3 = null;
  const total_granite_m3 = null;
  // Structural reinforcement is not specified or quantified.
  const total_rebar_kg = null;
  const total_rebar_tonnes = null;
  const total_roof_sheets_approx = null; // Product coverage and laps not supplied; no order quantity

  const materialsSchedule = [
    {
      item: "Ground Floor Slab Concrete",
      category: "Ground Floor",
      quantity: round1(slab_concrete_volume_m3),
      unit: "m³",
      notes: "Illustrative 150mm slab thickness assumption",
    },
    {
      item: "Ring Beam Concrete",
      category: "Superstructure",
      quantity: round1(ring_beam_concrete_volume),
      unit: "m³",
      notes: "225x225mm perimeter tie beam",
    },
    {
      item: "Illustrative Eaves Run",
      category: "Roofing",
      quantity: round2(eaves_fascia_perimeter_m),
      unit: "m",
      notes: "Plan-based eave length only; verify roof form and detailing",
    },
  ];

  const timeline_phases: FiveDBimSchedule["timeline_phases"] = [];
  const total_project_days = null;

  const five_d_bim: FiveDBimSchedule = {
    materials: materialsSchedule,
    total_concrete_volume_m3: round1(total_concrete_volume_m3),
    total_cement_bags_50kg,
    total_sand_m3,
    total_granite_m3,
    total_blocks_units: total_blocks_count,
    total_rebar_tonnes,
    total_rebar_kg,
    total_mortar_volume_m3: mortar_volume_m3,
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

  const regulation_compliance = {
    passed_all: false as const,
    checks_count: 0 as const,
    passed_count: 0 as const,
    violations_count: 0 as const,
    note: "No structural or building-regulation compliance checks are performed.",
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
