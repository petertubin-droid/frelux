// =========================================================
// FRELUX Structural Engineering Calculator
// Engine — Phase 32
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

export type ConcreteGrade = 'C20' | 'C25' | 'C30' | 'C35';
export type SteelGrade = 'Fe410' | 'Fe500';
export type SupportCondition = 'simply_supported' | 'fixed' | 'continuous' | 'cantilever';
export type BeamType = 'ground_beam' | 'suspended_beam' | 'ring_beam' | 'lintel';
export type SlabType = 'one_way' | 'two_way' | 'cantilever_slab';

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
  short_or_slender: 'short' | 'slender';
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
  warnings: string[];
  formula_transparency: string[];
}

// ── Material properties ──

const CONCRETE_PROPS: Record<ConcreteGrade, { fcu: number; Ec: number }> = {
  C20: { fcu: 20, Ec: 25 },
  C25: { fcu: 25, Ec: 28 },
  C30: { fcu: 30, Ec: 30 },
  C35: { fcu: 35, Ec: 32 },
};

const STEEL_PROPS: Record<SteelGrade, { fy: number }> = {
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

export function designBeam(input: BeamDesignInput): BeamDesignResult {
  const warnings: string[] = [];
  const formulas: string[] = [];

  const fcu = CONCRETE_PROPS[input.concrete_grade].fcu;
  const fy = STEEL_PROPS[input.steel_grade].fy;

  // Effective span (BS 8110: clear span + effective depth, or center-to-center)
  const effective_span = input.span + 0.1; // approximate
  formulas.push(`Effective span = clear span + 0.1 = ${input.span} + 0.1 = ${effective_span.toFixed(2)} m`);

  // Loads
  const total_dead = input.dead_load * input.tributary_width;
  const total_live = input.live_load * input.tributary_width;
  const design_load = total_dead + total_live;
  const factored_load = 1.4 * total_dead + 1.6 * total_live;
  formulas.push(`Factored load = 1.4 × ${total_dead.toFixed(2)} + 1.6 × ${total_live.toFixed(2)} = ${factored_load.toFixed(2)} kN/m`);

  // Moments and shears based on support condition
  let momentCoeff = 1 / 8; // simply supported
  let shearCoeff = 0.5;
  switch (input.support_condition) {
    case 'simply_supported':
      momentCoeff = 1 / 8;
      shearCoeff = 0.5;
      break;
    case 'fixed':
      momentCoeff = 1 / 12; // sagging
      shearCoeff = 0.5;
      break;
    case 'continuous':
      momentCoeff = 1 / 10; // approximate for span
      shearCoeff = 0.6;
      break;
    case 'cantilever':
      momentCoeff = 1 / 2;
      shearCoeff = 1.0;
      break;
  }

  const max_moment = momentCoeff * factored_load * effective_span * effective_span;
  const max_shear = shearCoeff * factored_load * effective_span;
  formulas.push(`Max moment = ${momentCoeff.toFixed(4)} × ${factored_load.toFixed(2)} × ${effective_span.toFixed(2)}² = ${max_moment.toFixed(2)} kN·m`);
  formulas.push(`Max shear = ${shearCoeff} × ${factored_load.toFixed(2)} × ${effective_span.toFixed(2)} = ${max_shear.toFixed(2)} kN`);

  // Required effective depth (singly reinforced, approximate)
  // d = sqrt(M / (0.87 × fcu × b × 0.167)) — simplified
  // Assume b = 225mm (9-inch block width) initially — 9-inch is standard for Nigerian load-bearing walls
  const assumed_width = input.existing_width ?? 225;
  const _K = max_moment * 1e6 / (fcu * assumed_width); // K = M / (fcu × b × d²)
  // z = d × (0.5 + sqrt(0.25 - K/0.9)) — lever arm factor
  // For simplified: d ≈ sqrt(M / (0.156 × fcu × b))
  const required_depth_eff = Math.sqrt((max_moment * 1e6) / (0.156 * fcu * assumed_width));
  const required_depth = required_depth_eff + input.cover_mm + 25; // add cover + half bar
  formulas.push(`Required effective depth = √(${(max_moment * 1e6).toFixed(0)} / (0.156 × ${fcu} × ${assumed_width})) = ${required_depth_eff.toFixed(0)} mm`);
  formulas.push(`Required overall depth = ${required_depth_eff.toFixed(0)} + ${input.cover_mm} (cover) + 25 (bar/2) = ${required_depth.toFixed(0)} mm`);

  // Span/depth ratio check (deflection)
  const span_to_depth = (effective_span * 1000) / required_depth_eff;
  const basicRatio = input.support_condition === 'cantilever' ? 7 :
                     input.support_condition === 'continuous' ? 26 : 20;
  const deflection_check_pass = span_to_depth <= basicRatio;
  formulas.push(`Span/depth = ${(effective_span * 1000).toFixed(0)} / ${required_depth_eff.toFixed(0)} = ${span_to_depth.toFixed(1)} ≤ ${basicRatio} (limit) → ${deflection_check_pass ? 'PASS' : 'FAIL'}`);

  // Steel area
  const z = 0.87 * required_depth_eff; // lever arm (simplified)
  const As = (max_moment * 1e6) / (0.87 * fy * z);
  const min_As = 0.13 * assumed_width * required_depth_eff / 100; // 0.13% min
  const max_As = 4 * assumed_width * required_depth_eff / 100; // 4% max
  formulas.push(`Steel area required = ${(max_moment * 1e6).toFixed(0)} / (0.87 × ${fy} × ${z.toFixed(0)}) = ${As.toFixed(0)} mm²`);
  formulas.push(`Min steel = 0.13% × ${assumed_width} × ${required_depth_eff.toFixed(0)} = ${min_As.toFixed(0)} mm²`);

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
    warnings.push(`Provided steel (${provided_As.toFixed(0)} mm²) is below minimum (${min_As.toFixed(0)} mm²). Increase bar count.`);
  }

  // Shear check
  const vc = 0.79 * Math.pow(fcu / 25, 1 / 3) * Math.pow(100 * provided_As / (assumed_width * required_depth_eff), 1 / 3) * (400 / required_depth_eff) ** 0.25;
  const shear_capacity = vc * assumed_width * required_depth_eff / 1000; // kN
  const shear_check_pass = shear_capacity >= max_shear;
  formulas.push(`Shear capacity v_c × b × d = ${vc.toFixed(2)} × ${assumed_width} × ${required_depth_eff.toFixed(0)} = ${shear_capacity.toFixed(1)} kN vs ${max_shear.toFixed(1)} kN → ${shear_check_pass ? 'PASS' : 'FAIL'}`);

  if (!shear_check_pass) {
    warnings.push(`Shear capacity insufficient. Provide shear reinforcement (links) at closer spacing or increase section.`);
  }

  // Recommended dimensions
  const recommended_depth = roundUpTo50(required_depth);
  const recommended_width = assumed_width;

  // Links
  const link_diameter = bestDiameter >= 20 ? 10 : 8;
  const link_spacing = Math.min(300, 0.75 * required_depth_eff);

  // Beam-type specific warnings
  if (input.beam_type === 'ground_beam' && recommended_depth < 450) {
    warnings.push('Ground beams in Nigerian practice are typically ≥ 450mm deep. Consider increasing depth.');
  }
  if (input.beam_type === 'lintel' && recommended_depth > 450) {
    warnings.push('Lintel beams are typically 225×225mm (9-inch). Verify if larger section is truly needed.');
  }
  if (span_to_depth > basicRatio) {
    warnings.push(`Deflection check failed (span/depth = ${span_to_depth.toFixed(1)} > ${basicRatio}). Increase beam depth.`);
  }

  return {
    span: input.span,
    effective_span,
    design_load,
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
    span_to_depth: Math.round(span_to_depth * 10) / 10,
    warnings,
    formula_transparency: formulas,
  };
}

// ── Column design ──

export function designColumn(input: ColumnDesignInput): ColumnDesignResult {
  const warnings: string[] = [];
  const formulas: string[] = [];

  const fcu = CONCRETE_PROPS[input.concrete_grade].fcu;
  const fy = STEEL_PROPS[input.steel_grade].fy;

  // Factored load (BS 8110: 1.4 × dead + 1.6 × live, but for axial mostly 1.4)
  const factored_load = 1.4 * input.axial_load;
  formulas.push(`Factored load = 1.4 × ${input.axial_load} = ${factored_load.toFixed(1)} kN`);

  // Required gross area (short column, simplified)
  // N = 0.4 × fcu × Ac + 0.67 × fy × As
  // Assume steel ratio ρ = 2% initially
  const rho_initial = 0.02;
  const required_area = (factored_load * 1000) / (0.4 * fcu + 0.67 * fy * rho_initial);
  formulas.push(`Required area = ${factored_load * 1000} / (0.4 × ${fcu} + 0.67 × ${fy} × 0.02) = ${required_area.toFixed(0)} mm²`);

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
    const diameter = Math.sqrt(4 * required_area / Math.PI);
    recommended_width = roundUpTo50(diameter);
    recommended_depth = recommended_width;
  }

  const gross_area = recommended_width * recommended_depth;
  formulas.push(`Section: ${recommended_width} × ${recommended_depth} = ${gross_area} mm²`);

  // Slenderness check
  const slenderness_ratio = (input.height * 1000) / Math.min(recommended_width, recommended_depth);
  const is_short = slenderness_ratio <= 15;
  formulas.push(`Slenderness ratio = ${input.height * 1000} / ${Math.min(recommended_width, recommended_depth)} = ${slenderness_ratio.toFixed(1)} → ${is_short ? 'short column' : 'slender column'}`);

  if (!is_short) {
    warnings.push(`Column is slender (ratio ${slenderness_ratio.toFixed(1)} > 15). Requires additional moment magnification — consult structural engineer.`);
  }

  // Steel area
  const steel_area = ((factored_load * 1000) - 0.4 * fcu * gross_area) / (0.67 * fy);
  const min_steel = 0.004 * gross_area; // 0.4% min (BS 8110)
  const _max_steel = 0.06 * gross_area; // 6% max
  const final_steel = Math.max(steel_area, min_steel);
  const steel_ratio = (final_steel / gross_area) * 100;

  formulas.push(`Steel area = (${(factored_load * 1000).toFixed(0)} - 0.4 × ${fcu} × ${gross_area}) / (0.67 × ${fy}) = ${steel_area.toFixed(0)} mm²`);
  formulas.push(`Steel ratio = ${final_steel.toFixed(0)} / ${gross_area} × 100 = ${steel_ratio.toFixed(2)}%`);

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
  const link_spacing = Math.min(recommended_width * 0.75, 300, 12 * bestDiameter);

  // Load capacity
  const provided_steel = bestCount * barArea(bestDiameter);
  const load_capacity = (0.4 * fcu * gross_area + 0.67 * fy * provided_steel) / 1000; // kN
  const capacity_check_pass = load_capacity >= factored_load;

  formulas.push(`Capacity = (0.4 × ${fcu} × ${gross_area} + 0.67 × ${fy} × ${provided_steel}) / 1000 = ${load_capacity.toFixed(1)} kN ≥ ${factored_load.toFixed(1)} kN → ${capacity_check_pass ? 'PASS' : 'FAIL'}`);

  if (recommended_width < 225) {
    warnings.push(`Column width ${recommended_width}mm is below typical 225mm (9-inch) minimum for Nigerian block walls. Consider 225mm (9-inch) minimum.`);
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
    short_or_slender: is_short ? 'short' : 'slender',
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

  const fcu = CONCRETE_PROPS[input.concrete_grade].fcu;
  const fy = STEEL_PROPS[input.steel_grade].fy;

  // Determine if one-way or two-way
  const ratio = input.span_y / input.span_x;
  const is_two_way = ratio < 2 && input.slab_type === 'two_way';

  // Minimum thickness (BS 8110)
  let min_thickness = 100; // general minimum
  if (input.slab_type === 'cantilever_slab') {
    min_thickness = Math.max(125, input.span_x * 1000 / 7); // L/7
    formulas.push(`Cantilever min thickness = span/7 = ${input.span_x * 1000} / 7 = ${min_thickness.toFixed(0)} mm`);
  } else if (is_two_way) {
    min_thickness = Math.max(125, input.span_x * 1000 / 28);
    formulas.push(`Two-way slab min thickness = span/28 = ${input.span_x * 1000} / 28 = ${min_thickness.toFixed(0)} mm`);
  } else {
    min_thickness = Math.max(100, input.span_x * 1000 / 20); // one-way simply supported
    formulas.push(`One-way slab min thickness = span/20 = ${input.span_x * 1000} / 20 = ${min_thickness.toFixed(0)} mm`);
  }

  const required_thickness = Math.ceil(min_thickness);
  const recommended_thickness = input.existing_thickness ?? roundUpTo25(required_thickness);

  // Self weight
  const self_weight = (recommended_thickness / 1000) * 24; // 24 kN/m³ for RC
  const total_dead = self_weight + input.dead_load;
  const total_load = 1.4 * total_dead + 1.6 * input.live_load;
  formulas.push(`Self weight = ${recommended_thickness}/1000 × 24 = ${self_weight.toFixed(1)} kN/m²`);
  formulas.push(`Factored load = 1.4 × ${total_dead.toFixed(1)} + 1.6 × ${input.live_load} = ${total_load.toFixed(1)} kN/m²`);

  // Effective depth
  const eff_depth = recommended_thickness - input.cover_mm - 10; // assume 20mm bar
  formulas.push(`Effective depth = ${recommended_thickness} - ${input.cover_mm} - 10 = ${eff_depth} mm`);

  // Moments
  let momentCoeff = 1 / 8;
  switch (input.support_condition) {
    case 'simply_supported':
      momentCoeff = 1 / 8;
      break;
    case 'fixed':
      momentCoeff = 1 / 12;
      break;
    case 'continuous':
      momentCoeff = 1 / 10;
      break;
    case 'cantilever':
      momentCoeff = 1 / 2;
      break;
  }

  const max_moment = momentCoeff * total_load * input.span_x * input.span_x;
  const max_shear = total_load * input.span_x / 2;
  formulas.push(`Max moment = ${momentCoeff.toFixed(4)} × ${total_load.toFixed(1)} × ${input.span_x}² = ${max_moment.toFixed(2)} kN·m/m`);
  formulas.push(`Max shear = ${total_load.toFixed(1)} × ${input.span_x} / 2 = ${max_shear.toFixed(2)} kN/m`);

  // Steel area
  const z = 0.87 * eff_depth;
  const As = (max_moment * 1e6) / (0.87 * fy * z);
  const min_As = 0.13 * 1000 * eff_depth / 100;
  const final_As = Math.max(As, min_As);
  formulas.push(`Steel area = ${(max_moment * 1e6).toFixed(0)} / (0.87 × ${fy} × ${z}) = ${As.toFixed(0)} mm²/m`);
  formulas.push(`Min steel = 0.13% × 1000 × ${eff_depth} = ${min_As.toFixed(0)} mm²/m`);

  // Bar selection
  let bestDiameter = 10;
  let bestSpacing = Math.round(1000 * barArea(10) / final_As);
  for (const d of [10, 12, 16]) {
    const spacing = Math.round(1000 * barArea(d) / final_As);
    if (spacing >= 75 && spacing <= 300) {
      bestDiameter = d;
      bestSpacing = spacing;
      break;
    }
  }
  bestSpacing = Math.min(300, Math.max(75, roundUpTo25(bestSpacing)));

  // Deflection check
  const span_to_depth = (input.span_x * 1000) / eff_depth;
  const basicRatio = input.support_condition === 'cantilever' ? 7 :
                     input.support_condition === 'continuous' ? 32 :
                     input.slab_type === 'two_way' ? 36 : 20;
  const deflection_check_pass = span_to_depth <= basicRatio;

  formulas.push(`Span/depth = ${input.span_x * 1000} / ${eff_depth} = ${span_to_depth.toFixed(1)} ≤ ${basicRatio} → ${deflection_check_pass ? 'PASS' : 'FAIL'}`);

  // Shear check
  const vc = 0.79 * Math.pow(fcu / 25, 1 / 3) * Math.pow(100 * final_As / (1000 * eff_depth), 1 / 3) * Math.pow(400 / eff_depth, 0.25);
  const shear_capacity = vc * 1000 * eff_depth / 1000;
  const shear_link_note = shear_capacity >= max_shear
    ? 'No shear reinforcement required (solid slab)'
    : 'Shear reinforcement required — consider thickening slab or adding links';

  if (shear_capacity < max_shear) {
    warnings.push(shear_link_note);
  }

  if (!deflection_check_pass) {
    warnings.push(`Deflection check failed (L/d = ${span_to_depth.toFixed(1)} > ${basicRatio}). Increase slab thickness.`);
  }
  if (recommended_thickness < 150 && input.span_x > 3) {
    warnings.push(`Slab thickness ${recommended_thickness}mm may be thin for ${input.span_x}m span. Consider 150mm minimum.`);
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
    recommended_bar_diameter: bestDiameter,
    recommended_bar_spacing: bestSpacing,
    link_check: shear_link_note,
    span_to_depth: Math.round(span_to_depth * 10) / 10,
    deflection_check_pass,
    warnings,
    formula_transparency: formulas,
  };
}
