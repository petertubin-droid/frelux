// =========================================================
// FRELUX Foundation Design Calculator
// Engine — Phase 32
//
// Calculates foundation sizing for Nigerian construction:
// - Strip footing width based on soil bearing capacity
// - Pad footing dimensions for column loads
// - Bearing capacity verification
// - Excavation volume estimation
//
// Based on BS 8004 / Eurocode 7 simplified methods, adapted
// for common Nigerian soil types (lateritic, sandy clay, etc.)
//
// DISCLAIMER: A geotechnical investigation is always required
// for actual foundation design. These are preliminary sizing tools.
// =========================================================

// ── Types ──

export type SoilType =
  | 'stiff_clay'
  | 'firm_clay'
  | 'sandy_clay'
  | 'loose_sand'
  | 'dense_sand'
  | 'lateritic'
  | 'rock'
  | 'custom';

export type FoundationShape = 'strip' | 'pad' | 'raft';

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
  safety_factor?: number; // typically 2.5-3.0
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
  excavation_volume: number; // m³
  concrete_volume: number; // m³
  blinding_volume: number; // m³ (75mm blinding)
  hardcore_volume: number; // m³
  bearing_check_pass: boolean;
  factor_of_safety: number;
  warnings: string[];
  formula_transparency: string[];
}

// ── Soil bearing capacities (typical, kN/m²) ──
// Based on BS 8004 Table 1, adapted for Nigerian conditions

export const SOIL_BEARING_CAPACITY: Record<SoilType, number> = {
  stiff_clay: 300,
  firm_clay: 150,
  sandy_clay: 200,
  loose_sand: 100,
  dense_sand: 300,
  lateritic: 250,
  rock: 600,
  custom: 0, // user-provided
};

export const SOIL_DESCRIPTIONS: Record<SoilType, string> = {
  stiff_clay: 'Stiff clay — high plasticity, firm to hard',
  firm_clay: 'Firm clay — medium plasticity',
  sandy_clay: 'Sandy clay — mixed granular-cohesive',
  loose_sand: 'Loose sand — poorly compacted',
  dense_sand: 'Dense sand — well-compacted granular',
  lateritic: 'Lateritic soil — common in Nigerian uplands',
  rock: 'Sound rock — very high capacity',
  custom: 'Custom — user-defined bearing capacity',
};

function roundUpTo50(n: number): number {
  return Math.ceil(n / 50) * 50;
}

function roundUpTo100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

export function designFoundation(input: FoundationDesignInput): FoundationDesignResult {
  const warnings: string[] = [];
  const formulas: string[] = [];

  // Determine allowable bearing capacity
  const gross_capacity = input.soil_type === 'custom'
    ? (input.custom_bearing_capacity ?? 150)
    : SOIL_BEARING_CAPACITY[input.soil_type];

  const safety_factor = input.safety_factor ?? 2.5;
  const allowable_capacity = gross_capacity / safety_factor;
  formulas.push(`Gross bearing capacity (${input.soil_type}) = ${gross_capacity} kN/m²`);
  formulas.push(`Allowable = ${gross_capacity} / ${safety_factor} (safety factor) = ${allowable_capacity.toFixed(0)} kN/m²`);

  if (input.soil_type !== 'custom' && input.soil_type !== 'rock') {
    warnings.push(`Bearing capacity for ${input.soil_type} is a typical value. A soil test is mandatory for actual design.`);
  }

  let result: FoundationDesignResult;

  if (input.shape === 'strip') {
    // ── Strip footing ──
    const applied_pressure = input.wall_load / (input.foundation_depth * 1); // kN/m² (per meter run)
    const required_width = (input.wall_load / allowable_capacity) * 1000; // mm
    formulas.push(`Required width = wall_load / allowable = ${input.wall_load} / ${allowable_capacity.toFixed(0)} = ${(required_width / 1000).toFixed(3)} m = ${required_width.toFixed(0)} mm`);

    const recommended_width = roundUpTo50(required_width);
    const min_width = 300; // minimum practical width
    const final_width = Math.max(recommended_width, min_width);
    formulas.push(`Recommended width = ${final_width} mm (min 300mm)`);

    // Volumes
    const total_length = input.building_length ? input.building_length * 2 + (input.building_width ?? 0) * 2 : 0;
    const excavation_volume = (final_width / 1000) * input.foundation_depth * total_length;
    const concrete_volume = (final_width / 1000) * 0.225 * total_length; // 225mm footing thickness
    const blinding_volume = (final_width / 1000) * 0.075 * total_length;
    const hardcore_volume = (final_width / 1000) * 0.15 * total_length;
    formulas.push(`Excavation = ${final_width/1000} × ${input.foundation_depth} × ${total_length} = ${excavation_volume.toFixed(1)} m³`);

    const check_pressure = input.wall_load / ((final_width / 1000) * 1);
    const bearing_check_pass = check_pressure <= allowable_capacity;
    const actual_fos = allowable_capacity / check_pressure;

    if (final_width > 1500) {
      warnings.push(`Strip footing width ${final_width}mm exceeds 1500mm. Consider pad footings or raft foundation instead.`);
    }
    if (allowable_capacity < 100) {
      warnings.push('Very low bearing capacity soil. Consider pile foundation or soil improvement.');
    }

    result = {
      shape: 'strip',
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
  } else if (input.shape === 'pad') {
    // ── Pad footing ──
    const column_load = input.column_load ?? 200; // default 200 kN
    const required_area = column_load / allowable_capacity; // m²
    const side = Math.sqrt(required_area) * 1000; // mm (square pad)
    formulas.push(`Required area = ${column_load} / ${allowable_capacity.toFixed(0)} = ${required_area.toFixed(3)} m²`);
    formulas.push(`Square pad side = √${required_area.toFixed(3)} = ${(side).toFixed(0)} mm`);

    const recommended_side = Math.max(roundUpTo100(side), 600); // min 600mm
    const actual_area = (recommended_side / 1000) * (recommended_side / 1000);
    const check_pressure = column_load / actual_area;
    const bearing_check_pass = check_pressure <= allowable_capacity;
    const actual_fos = allowable_capacity / check_pressure;

    // Volumes (single pad)
    const excavation_volume = actual_area * input.foundation_depth;
    const concrete_volume = actual_area * 0.3; // 300mm pad thickness
    const blinding_volume = actual_area * 0.075;
    const hardcore_volume = actual_area * 0.15;

    if (recommended_side > 2000) {
      warnings.push(`Pad size ${recommended_side}×${recommended_side}mm is very large. Consider raft foundation or soil improvement.`);
    }

    result = {
      shape: 'pad',
      soil_type: input.soil_type,
      bearing_capacity: allowable_capacity,
      applied_pressure: Math.round(check_pressure * 10) / 10,
      required_width: Math.ceil(side),
      recommended_width: recommended_side,
      required_length: Math.ceil(side),
      recommended_length: recommended_side,
      area_per_pad: Math.round(actual_area * 1000) / 1000,
      excavation_volume: Math.round(excavation_volume * 10) / 10,
      concrete_volume: Math.round(concrete_volume * 10) / 10,
      blinding_volume: Math.round(blinding_volume * 10) / 10,
      hardcore_volume: Math.round(hardcore_volume * 10) / 10,
      bearing_check_pass,
      factor_of_safety: Math.round(actual_fos * 100) / 100,
      warnings,
      formula_transparency: formulas,
    };
  } else {
    // ── Raft foundation ──
    const building_area = (input.building_length ?? 10) * (input.building_width ?? 8);
    const total_load = input.wall_load * ((input.building_length ?? 10) * 2 + (input.building_width ?? 8) * 2);
    const applied_pressure = total_load / building_area;
    const bearing_check_pass = applied_pressure <= allowable_capacity;
    const actual_fos = allowable_capacity / applied_pressure;

    const excavation_volume = building_area * input.foundation_depth;
    const concrete_volume = building_area * 0.3; // 300mm raft slab
    const blinding_volume = building_area * 0.075;
    const hardcore_volume = building_area * 0.15;

    if (applied_pressure > allowable_capacity) {
      warnings.push('Raft pressure exceeds soil capacity. Consider piles or soil improvement.');
    }

    result = {
      shape: 'raft',
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

  return result;
}
