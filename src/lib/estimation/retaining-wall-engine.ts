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
  excavation_m3: number;
  footing_concrete_m3: number;
  stem_concrete_m3: number;
  concrete_m3: number;
}

export function retainingWallGeometry(
  input: RetainingWallInput,
  rules: RetainingWallRules,
): RetainingWallGeometry {
  const factor = SOIL_FOOTING_FACTOR[input.soil_type] ?? 1;
  const recommended = money(rules.footing_width_m * factor);
  const override = input.footing_width_override_m;
  const width =
    override !== null && override !== undefined && override > 0
      ? override
      : recommended;

  const footingConcrete = input.length_m * width * rules.footing_thickness_m;
  const stemConcrete =
    input.stem_type === "concrete"
      ? input.length_m * rules.stem_thickness_m * input.height_m
      : 0;

  return {
    recommended_footing_width_m: recommended,
    footing_width_m: money(width),
    footing_factor: factor,
    footing_overridden: width !== recommended,
    excavation_m3: money(input.length_m * width * rules.footing_thickness_m),
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
      detail: `${rules.footing_width_m} m × ${geo.footing_factor} (${input.soil_type.replace("_", " ")}) = ${geo.recommended_footing_width_m} m`,
    },
    {
      label: "Footing width used",
      detail: geo.footing_overridden
        ? `${geo.footing_width_m} m, your override of the recommended width`
        : `${geo.footing_width_m} m, the recommended width`,
    },
    {
      label: "Footing trench",
      detail: `${input.length_m} m × ${geo.footing_width_m} m × ${rules.footing_thickness_m} m = ${geo.excavation_m3} m³`,
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
