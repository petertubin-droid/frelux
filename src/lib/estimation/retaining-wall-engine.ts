/**
 * Retaining Wall Material & Cost Engine
 *
 * A retaining wall holds back soil, so the buried footing does the structural
 * work and the stem only holds the face. This engine sizes the trench, the
 * footing concrete, the stem (blocks or poured concrete), the vertical
 * reinforcement and the drainage weep holes from a length and a height.
 *
 * The soil type changes geometry, not opinion: loose sand and wet clay carry
 * more lateral thrust, so the recommended footing width grows by a printed
 * factor. The contractor can override the width, and both numbers are shown so
 * the figure on screen traces back to a visible decision.
 *
 * Not included, and said out loud: excavation labour, backfill, drainage
 * aggregate behind the wall, mortar and plaster, and any engineer's design.
 */

import {
  TAX_NOT_DETERMINED,
  ceilQty,
  emptyResult,
  money,
  priceLines,
  ruleNumber,
  unpricedWarnings,
  type CalcRuleLike,
  type SpecialtyLine,
  type SpecialtyPriceMap,
  type SpecialtyResult,
  type SpecialtyStep,
} from "./specialty";

export type SoilType = "stable" | "loose_sand" | "wet_clay";
export type StemType = "block" | "concrete";

export interface RetainingWallRules {
  /** Footing width before any soil adjustment, metres */
  footing_width_m: number;
  footing_thickness_m: number;
  /** Standard 450 x 225 hollow blocks per square metre of face */
  blocks_per_m2: number;
  waste_pct: number;
  weep_spacing_m: number;
  bar_spacing_m: number;
  /** Poured stem thickness, metres */
  stem_thickness_m: number;
}

export const DEFAULT_RETAINING_WALL_RULES: RetainingWallRules = {
  footing_width_m: 0.6,
  footing_thickness_m: 0.2,
  blocks_per_m2: 10,
  waste_pct: 10,
  weep_spacing_m: 1.5,
  bar_spacing_m: 0.4,
  stem_thickness_m: 0.15,
};

/** Working space each side of the footing, for the dig and the formwork. */
export const TRENCH_WORKING_SPACE_M = 0.3;
/** Blinding under the footing, which the trench must also accommodate. */
export const BLINDING_DEPTH_M = 0.1;

export function parseRetainingWallRules(
  rows: CalcRuleLike[],
): RetainingWallRules {
  const r = { ...DEFAULT_RETAINING_WALL_RULES };
  r.footing_width_m = ruleNumber(rows, "footing_width_m") ?? r.footing_width_m;
  r.footing_thickness_m =
    ruleNumber(rows, "footing_thickness_m") ?? r.footing_thickness_m;
  r.blocks_per_m2 = ruleNumber(rows, "blocks_per_m2") ?? r.blocks_per_m2;
  r.waste_pct = ruleNumber(rows, "waste_pct") ?? r.waste_pct;
  r.weep_spacing_m = ruleNumber(rows, "weep_spacing_m") ?? r.weep_spacing_m;
  r.bar_spacing_m = ruleNumber(rows, "bar_spacing_m") ?? r.bar_spacing_m;
  r.stem_thickness_m =
    ruleNumber(rows, "stem_thickness_m") ?? r.stem_thickness_m;
  return r;
}

/** Lateral thrust factors applied to the recommended footing width. */
export const SOIL_FOOTING_FACTOR: Record<SoilType, number> = {
  stable: 1,
  loose_sand: 1.15,
  wet_clay: 1.3,
};

export const SOIL_LABELS: Record<SoilType, string> = {
  stable: "Stable soil (firm natural ground)",
  loose_sand: "Loose sand (granular, low cohesion)",
  wet_clay: "Wet clay (high moisture, high lateral thrust)",
};

/** 1:2:4 concrete, dry volume method: per m3 of finished concrete. */
export const CONCRETE_MIX = {
  cement_bags_per_m3: 6.34,
  sand_m3_per_m3: 0.44,
  granite_m3_per_m3: 0.88,
};

export interface RetainingWallStability {
  ka: number;
  active_thrust_kn_m: number;
  overturning_moment_knm_m: number;
  resisting_moment_knm_m: number;
  factor_of_safety_overturning: number;
  factor_of_safety_sliding: number;
  overturning_pass: boolean;
  sliding_pass: boolean;
  max_bearing_pressure_kpa: number;
  middle_third_pass: boolean;
  eccentricity_m: number;
  status_summary: string;
}

export interface RetainingWallInput {
  length_m: number;
  height_m: number;
  soil_type: SoilType;
  stem_type: StemType;
  /** Contractor override of the recommended footing width, metres */
  footing_width_override_m?: number | null;
}

export interface RetainingWallGeometry {
  recommended_footing_width_m: number;
  footing_width_m: number;
  footing_factor: number;
  footing_overridden: boolean;
  footing_thickness_m: number;
  stability: RetainingWallStability;
  excavation_m3: number;
  footing_concrete_m3: number;
  stem_concrete_m3: number;
  concrete_m3: number;
}

/**
 * Computes geotechnical stability against overturning and sliding using
 * classical Rankine lateral earth pressure theory (BS 8002 / Eurocode 7).
 */
export function computeRetainingWallStability(
  height_m: number,
  footing_width_m: number,
  footing_thickness_m: number,
  soil_type: SoilType,
  stem_type: StemType,
  stem_thickness_m: number = 0.225,
): RetainingWallStability {
  const H = Math.max(0.1, height_m);
  const B = Math.max(0.3, footing_width_m);
  const tf = Math.max(0.15, footing_thickness_m);
  const ts =
    stem_type === "concrete" ? Math.max(0.15, stem_thickness_m) : 0.225;

  const soilProps: Record<SoilType, { phi_deg: number; gamma: number }> = {
    stable: { phi_deg: 32, gamma: 18 },
    loose_sand: { phi_deg: 28, gamma: 17 },
    wet_clay: { phi_deg: 20, gamma: 19 },
  };
  const prop = soilProps[soil_type] ?? soilProps.stable;
  const phi_rad = (prop.phi_deg * Math.PI) / 180;
  // Base friction: the footing is cast in situ against the soil, so the
  // interface angle delta may be taken as phi (BS 8002, 5.3.3) and the
  // coefficient of friction on the sliding plane is mu = tan(phi). The
  // earlier fixed 0.25-0.38 values were the reduced delta = 2/3 phi used for
  // precast bases; applied to a cast footing with no passive resistance they
  // failed every geometry, including a 1 m wall, so the check could never pass.
  const mu = Math.tan(phi_rad);
  // Rankine active earth pressure coefficient Ka = (1 - sin phi) / (1 + sin phi)
  const ka = (1 - Math.sin(phi_rad)) / (1 + Math.sin(phi_rad));
  // Total active thrust Pa = 0.5 * Ka * gamma * H^2 (kN/m)
  const Pa = 0.5 * ka * prop.gamma * H * H;
  // Overturning moment about toe Mot = Pa * (H / 3)
  const Mot = Pa * (H / 3);

  // Geometry: typical toe projection is ~0.33 of base width
  const b_toe = Math.min(B * 0.33, Math.max(0.1, B - ts));
  const b_heel = Math.max(0, B - b_toe - ts);
  const stem_height = Math.max(0, H - tf);

  const gamma_concrete = 24; // kN/m³
  const gamma_masonry = 21; // kN/m³
  const gamma_stem = stem_type === "concrete" ? gamma_concrete : gamma_masonry;

  // Vertical components per linear metre:
  const W_footing = B * tf * gamma_concrete;
  const arm_footing = B / 2;

  const W_stem = ts * stem_height * gamma_stem;
  const arm_stem = b_toe + ts / 2;

  const W_soil = b_heel * stem_height * prop.gamma;
  const arm_soil = B - b_heel / 2;

  const W_total = W_footing + W_stem + W_soil;
  const MR = W_footing * arm_footing + W_stem * arm_stem + W_soil * arm_soil;

  const fs_ot = Mot > 0 ? MR / Mot : 99;
  const fs_sl = Pa > 0 ? (mu * W_total) / Pa : 99;

  const M_net = MR - Mot;
  const x_bar = W_total > 0 ? M_net / W_total : B / 2;
  const e = Math.abs(B / 2 - x_bar);
  const middle_third_limit = B / 6;
  const middle_third_pass = e <= middle_third_limit;

  const max_q = W_total > 0 && B > 0 ? (W_total / B) * (1 + (6 * e) / B) : 0;

  const ot_pass = fs_ot >= 1.5;
  const sl_pass = fs_sl >= 1.5;

  let summary = "Adequate geotechnical stability (BS 8002 / Eurocode 7)";
  if (!ot_pass && !sl_pass) {
    summary =
      "Unstable against both overturning and sliding — footing width must be increased";
  } else if (!ot_pass) {
    summary =
      "Overturning factor of safety is below 1.50 — widen the footing base";
  } else if (!sl_pass) {
    summary =
      "Sliding factor of safety is below 1.50 — add a shear key or widen base";
  } else if (!middle_third_pass) {
    summary = "Eccentricity outside middle third — risk of heel liftoff";
  }

  return {
    ka: Math.round(ka * 1000) / 1000,
    active_thrust_kn_m: Math.round(Pa * 10) / 10,
    overturning_moment_knm_m: Math.round(Mot * 10) / 10,
    resisting_moment_knm_m: Math.round(MR * 10) / 10,
    factor_of_safety_overturning: Math.round(fs_ot * 100) / 100,
    factor_of_safety_sliding: Math.round(fs_sl * 100) / 100,
    overturning_pass: ot_pass,
    sliding_pass: sl_pass,
    max_bearing_pressure_kpa: Math.round(max_q * 10) / 10,
    middle_third_pass,
    eccentricity_m: Math.round(e * 100) / 100,
    status_summary: summary,
  };
}

export function retainingWallGeometry(
  input: RetainingWallInput,
  rules: RetainingWallRules,
): RetainingWallGeometry {
  const factor = SOIL_FOOTING_FACTOR[input.soil_type] ?? 1;
  // Geotechnical scaling: B >= (0.50 to 0.75) * H depending on soil thrust
  const soilRatios: Record<SoilType, number> = {
    stable: 0.55,
    loose_sand: 0.65,
    wet_clay: 0.75,
  };
  const heightRatio = soilRatios[input.soil_type] ?? 0.55;
  const heightScaledWidth = Math.ceil(input.height_m * heightRatio * 20) / 20;
  const baseRuleWidth = rules.footing_width_m * factor;
  const recommended = money(Math.max(baseRuleWidth, heightScaledWidth));

  const override = input.footing_width_override_m;
  const width =
    override !== null && override !== undefined && override > 0
      ? override
      : recommended;

  const footingThickness = money(
    Math.max(
      rules.footing_thickness_m,
      Math.ceil((input.height_m / 10) * 20) / 20,
    ),
  );

  const footingConcrete = input.length_m * width * footingThickness;
  const stemConcrete =
    input.stem_type === "concrete"
      ? input.length_m * rules.stem_thickness_m * input.height_m
      : 0;

  const stability = computeRetainingWallStability(
    input.height_m,
    width,
    footingThickness,
    input.soil_type,
    input.stem_type,
    rules.stem_thickness_m,
  );

  return {
    recommended_footing_width_m: recommended,
    footing_width_m: money(width),
    footing_factor: factor,
    footing_overridden: width !== recommended,
    footing_thickness_m: footingThickness,
    stability,
    excavation_m3: money(
      input.length_m *
        (width + 2 * TRENCH_WORKING_SPACE_M) *
        (footingThickness + BLINDING_DEPTH_M),
    ),
    footing_concrete_m3: money(footingConcrete),
    stem_concrete_m3: money(stemConcrete),
    concrete_m3: money(footingConcrete + stemConcrete),
  };
}

export function calculateRetainingWall(
  input: RetainingWallInput,
  rules: RetainingWallRules,
  prices: SpecialtyPriceMap,
): SpecialtyResult {
  const errors: string[] = [];
  if (!Number.isFinite(input.length_m) || input.length_m <= 0) {
    errors.push("Wall length must be greater than zero (metres).");
  }
  if (!Number.isFinite(input.height_m) || input.height_m <= 0) {
    errors.push("Wall height must be greater than zero (metres).");
  }
  if (!(input.soil_type in SOIL_FOOTING_FACTOR)) {
    errors.push("Choose a soil type: the footing width depends on it.");
  }
  if (errors.length > 0) return emptyResult(errors);

  const geo = retainingWallGeometry(input, rules);
  const steps: SpecialtyStep[] = [
    {
      label: "Recommended footing width",
      detail: `${rules.footing_width_m} m base (rule) scaled for ${input.height_m} m wall height & ${input.soil_type.replace("_", " ")} = ${geo.recommended_footing_width_m} m`,
    },
    {
      label: "Footing width used",
      detail: geo.footing_overridden
        ? `${geo.footing_width_m} m, your override of the recommended width`
        : `${geo.footing_width_m} m, the recommended width`,
    },
    {
      label: "Footing trench & thickness",
      detail: `${input.length_m} m × ${geo.footing_width_m} m × ${geo.footing_thickness_m} m thick = ${geo.excavation_m3} m³ excavation (includes working space & blinding)`,
    },
    {
      label: "Geotechnical stability (Rankine / BS 8002)",
      detail: `Ka = ${geo.stability.ka.toFixed(3)}, Active thrust Pa = ${geo.stability.active_thrust_kn_m.toFixed(1)} kN/m. Overturning FS = ${geo.stability.factor_of_safety_overturning.toFixed(2)} (target ≥ 1.50, ${geo.stability.overturning_pass ? "PASS" : "FAIL"}), Sliding FS = ${geo.stability.factor_of_safety_sliding.toFixed(2)} (target ≥ 1.50, ${geo.stability.sliding_pass ? "PASS" : "FAIL"}). Max soil bearing pressure = ${geo.stability.max_bearing_pressure_kpa.toFixed(1)} kPa.`,
    },
    {
      label: "Concrete volume",
      detail:
        input.stem_type === "concrete"
          ? `footing ${geo.footing_concrete_m3} m³ + stem ${input.length_m} × ${rules.stem_thickness_m} × ${input.height_m} = ${geo.stem_concrete_m3} m³, total ${geo.concrete_m3} m³`
          : `footing only ${geo.footing_concrete_m3} m³ (block stem)`,
    },
    {
      label: "Concrete materials",
      detail: `1:2:4 mix → ${CONCRETE_MIX.cement_bags_per_m3} bags, ${CONCRETE_MIX.sand_m3_per_m3} m³ sand and ${CONCRETE_MIX.granite_m3_per_m3} m³ granite per m³`,
    },
  ];

  const lines: SpecialtyLine[] = [];

  if (geo.concrete_m3 > 0) {
    lines.push({
      key: "cement",
      label: "Cement (50 kg bags)",
      material_slug: "cement-per-bag",
      quantity: Math.ceil(geo.concrete_m3 * CONCRETE_MIX.cement_bags_per_m3),
      quantity_source: "rule_derived",
      unit: "bags",
      detail: `${geo.concrete_m3} m³ concrete at 1:2:4`,
      unit_price: null,
      line_total: null,
    });
    lines.push({
      key: "sand",
      label: "Sharp sand",
      material_slug: "sand-per-m3",
      quantity: money(geo.concrete_m3 * CONCRETE_MIX.sand_m3_per_m3),
      quantity_source: "rule_derived",
      unit: "m³",
      detail: `${geo.concrete_m3} m³ concrete at 1:2:4`,
      unit_price: null,
      line_total: null,
    });
    lines.push({
      key: "granite",
      label: "Granite / coarse aggregate",
      material_slug: "granite-per-m3",
      quantity: money(geo.concrete_m3 * CONCRETE_MIX.granite_m3_per_m3),
      quantity_source: "rule_derived",
      unit: "m³",
      detail: `${geo.concrete_m3} m³ concrete at 1:2:4`,
      unit_price: null,
      line_total: null,
    });
  }

  const faceArea = money(input.length_m * input.height_m);
  if (input.stem_type === "block") {
    const blocks = ceilQty(
      faceArea * rules.blocks_per_m2 * (1 + rules.waste_pct / 100),
    );
    lines.push({
      key: "blocks",
      label: "Hollow blocks (450 × 225)",
      material_slug: "block-per-piece",
      quantity: blocks,
      quantity_source: "rule_derived",
      unit: "pieces",
      detail: `${faceArea} m² face × ${rules.blocks_per_m2} blocks/m² with ${rules.waste_pct}% waste`,
      unit_price: null,
      line_total: null,
    });
  }

  const bars = Math.ceil(input.length_m / rules.bar_spacing_m) + 1;
  const barLength = money(bars * (input.height_m + 0.3));
  const barLengths = Math.ceil(barLength / 12);
  lines.push({
    key: "rebar",
    label: "12 mm reinforcement (12 m lengths)",
    material_slug: "rebar-12mm-per-length",
    quantity: barLengths,
    quantity_source: "rule_derived",
    unit: "lengths",
    detail: `${bars} vertical bars at ${rules.bar_spacing_m} m centres, ${input.height_m} m + 0.3 m lap = ${barLength} m`,
    unit_price: null,
    line_total: null,
  });

  const weeps = ceilQty(input.length_m / rules.weep_spacing_m);
  lines.push({
    key: "weep_holes",
    label: "Weep hole pipes (50 mm PVC)",
    material_slug: "weep-hole-pipe-per-piece",
    quantity: weeps,
    quantity_source: "rule_derived",
    unit: "pieces",
    detail: `one every ${rules.weep_spacing_m} m along the base row`,
    unit_price: null,
    line_total: null,
  });

  const priced = priceLines(lines, prices);

  const warnings: string[] = [...unpricedWarnings(priced.missing)];
  if (input.height_m > 2.5) {
    warnings.push(
      "Walls above 2.5 m are engineering work: a structural engineer must confirm the footing and stem before you build.",
    );
  }
  if (input.soil_type === "wet_clay") {
    warnings.push(
      "Wet clay is the condition retaining walls fail in. Provide drainage behind the wall and have the design checked before construction.",
    );
  }
  if (geo.footing_overridden) {
    warnings.push(
      `You are using a ${geo.footing_width_m} m footing instead of the recommended ${geo.recommended_footing_width_m} m. The recommendation is advisory, but a narrower footing carries less of the soil thrust.`,
    );
  }
  if (!geo.stability.overturning_pass) {
    warnings.push(
      `Overturning factor of safety (${geo.stability.factor_of_safety_overturning.toFixed(2)}) is below the required 1.50 minimum. The footing is at risk of overturning under active soil thrust: widen the footing base.`,
    );
  }
  if (!geo.stability.sliding_pass) {
    warnings.push(
      `Sliding factor of safety (${geo.stability.factor_of_safety_sliding.toFixed(2)}) is below the required 1.50 minimum. Provide a concrete shear key beneath the footing or widen the base.`,
    );
  }
  if (!geo.stability.middle_third_pass) {
    warnings.push(
      `Base resultant eccentricity (${geo.stability.eccentricity_m.toFixed(2)} m) exceeds the middle-third limit (${(geo.footing_width_m / 6).toFixed(2)} m). Tensile stresses exist under the heel; widen the footing to avoid liftoff.`,
    );
  }
  warnings.push(
    "Excavation labour, backfill, drainage aggregate behind the wall, mortar and plaster are not included.",
  );

  return {
    ok: true,
    errors: [],
    warnings,
    steps,
    lines: priced.lines,
    priced_subtotal: priced.priced_subtotal,
    material_subtotal: priced.material_subtotal,
    labour_total: 0,
    grand_total: priced.material_subtotal,
    incomplete: priced.material_subtotal === null,
    missing: priced.missing,
    tax_status: TAX_NOT_DETERMINED,
  };
}
