/**
 * Soffit, Fascia & Rainwater Gutter Engine
 *
 * The transition band between roof and wall: the horizontal eaves perimeter
 * becomes linear fascia and gutter, the overhang becomes soffit area, and the
 * gutter run decides how many downpipes and brackets you buy.
 *
 * The perimeter can be measured directly at the eaves, or derived from a
 * footprint plus overhang through the roof engine's own fascia helper, so a
 * user who already ran the roof estimate gets the same number here.
 */

import { calculateFasciaLength } from "./build-to-roof-engine";
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

export type SoffitMaterial = "aluminium" | "pvc";

export interface SoffitGutterRules {
  waste_pct: number;
  downpipe_spacing_m: number;
  bracket_spacing_m: number;
}

export const DEFAULT_SOFFIT_GUTTER_RULES: SoffitGutterRules = {
  waste_pct: 5,
  downpipe_spacing_m: 12,
  bracket_spacing_m: 0.6,
};

export function parseSoffitGutterRules(
  rows: CalcRuleLike[],
): SoffitGutterRules {
  return {
    waste_pct:
      ruleNumber(rows, "waste_pct") ?? DEFAULT_SOFFIT_GUTTER_RULES.waste_pct,
    downpipe_spacing_m:
      ruleNumber(rows, "downpipe_spacing_m") ??
      DEFAULT_SOFFIT_GUTTER_RULES.downpipe_spacing_m,
    bracket_spacing_m:
      ruleNumber(rows, "bracket_spacing_m") ??
      DEFAULT_SOFFIT_GUTTER_RULES.bracket_spacing_m,
  };
}

export const SOFFIT_MATERIAL_LABELS: Record<SoffitMaterial, string> = {
  aluminium: "Aluminium sheets",
  pvc: "PVC wood grain panels",
};

/** A saved starting profile, offered as a template rather than assumed. */
export const BUNGALOW_TEMPLATE = {
  label: "Standard 3 bedroom bungalow roof finishing profile",
  perimeter_m: 65,
  overhang_m: 0.6,
};

export interface SoffitGutterInput {
  /** Either measure the eaves perimeter, or derive it from a footprint. */
  mode: "perimeter" | "footprint";
  perimeter_m?: number | null;
  building_length_m?: number | null;
  building_width_m?: number | null;
  overhang_m: number;
  material: SoffitMaterial;
}

export function resolveEavesPerimeter(input: SoffitGutterInput): number | null {
  if (input.mode === "perimeter") {
    const p = Number(input.perimeter_m);
    return Number.isFinite(p) && p > 0 ? money(p) : null;
  }
  const l = Number(input.building_length_m);
  const w = Number(input.building_width_m);
  const o = Number(input.overhang_m);
  if (!Number.isFinite(l) || l <= 0) return null;
  if (!Number.isFinite(w) || w <= 0) return null;
  if (!Number.isFinite(o) || o < 0) return null;
  // Same helper the roof engine uses, so both tools report one perimeter.
  return money(calculateFasciaLength(l, w, o));
}

export function calculateSoffitGutter(
  input: SoffitGutterInput,
  rules: SoffitGutterRules,
  prices: SpecialtyPriceMap,
): SpecialtyResult {
  const errors: string[] = [];
  const perimeter = resolveEavesPerimeter(input);
  if (perimeter === null) {
    errors.push(
      input.mode === "perimeter"
        ? "Enter the roof perimeter measured at the eaves (metres)."
        : "Enter the building length and width, both greater than zero.",
    );
  }
  if (!Number.isFinite(input.overhang_m) || input.overhang_m < 0) {
    errors.push("Eaves overhang width must be zero or more (metres).");
  }
  if (errors.length > 0 || perimeter === null) return emptyResult(errors);

  const wasteFactor = 1 + rules.waste_pct / 100;
  const fasciaLength = money(perimeter * wasteFactor);
  const gutterLength = money(perimeter * wasteFactor);
  const soffitArea = money(perimeter * input.overhang_m * wasteFactor);
  const downpipes = ceilQty(perimeter / rules.downpipe_spacing_m);
  const brackets = ceilQty(gutterLength / rules.bracket_spacing_m);

  const steps: SpecialtyStep[] = [
    {
      label: "Eaves perimeter",
      detail:
        input.mode === "footprint"
          ? `2 × (${input.building_length_m} + 2 × ${input.overhang_m}) + 2 × (${input.building_width_m} + 2 × ${input.overhang_m}) = ${perimeter} m`
          : `${perimeter} m as measured`,
    },
    {
      label: "Fascia and gutter run",
      detail: `${perimeter} m × ${wasteFactor} (${rules.waste_pct}% cutting waste) = ${fasciaLength} m each`,
    },
    {
      label: "Soffit area",
      detail: `${perimeter} m × ${input.overhang_m} m overhang × ${wasteFactor} = ${soffitArea} m²`,
    },
    {
      label: "Downpipes",
      detail: `${perimeter} m ÷ ${rules.downpipe_spacing_m} m spacing, rounded up = ${downpipes}`,
    },
    {
      label: "Gutter brackets",
      detail: `${gutterLength} m ÷ ${rules.bracket_spacing_m} m spacing, rounded up = ${brackets}`,
    },
  ];

  const lines: SpecialtyLine[] = [
    {
      key: "fascia",
      label: "Fascia board",
      material_slug: "fascia-per-meter",
      quantity: fasciaLength,
      quantity_source: "rule_derived",
      unit: "linear m",
      detail: `eaves perimeter with ${rules.waste_pct}% waste`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "gutter",
      label: "Rainwater gutter",
      material_slug: "gutter-per-meter",
      quantity: gutterLength,
      quantity_source: "rule_derived",
      unit: "linear m",
      detail: `eaves perimeter with ${rules.waste_pct}% waste`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "soffit",
      label: `Soffit panels (${SOFFIT_MATERIAL_LABELS[input.material].toLowerCase()})`,
      material_slug:
        input.material === "aluminium"
          ? "soffit-panel-aluminium-per-m2"
          : "soffit-panel-pvc-per-m2",
      quantity: soffitArea,
      quantity_source: "rule_derived",
      unit: "m²",
      detail: `${perimeter} m perimeter × ${input.overhang_m} m overhang with ${rules.waste_pct}% waste`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "downpipes",
      label: "Downpipes",
      material_slug: "downpipe-per-piece",
      quantity: downpipes,
      quantity_source: "rule_derived",
      unit: "pieces",
      detail: `one every ${rules.downpipe_spacing_m} m of gutter run`,
      unit_price: null,
      line_total: null,
    },
    {
      key: "brackets",
      label: "Gutter brackets",
      material_slug: "gutter-bracket-per-piece",
      quantity: brackets,
      quantity_source: "rule_derived",
      unit: "pieces",
      detail: `one every ${rules.bracket_spacing_m} m of gutter`,
      unit_price: null,
      line_total: null,
    },
  ];

  const priced = priceLines(lines, prices);

  const warnings: string[] = [...unpricedWarnings(priced.missing)];
  warnings.push(
    "Measure the perimeter at the eaves line, not at the wall: a wall measurement understates the gutter run wherever the roof oversails.",
  );
  if (input.overhang_m > 0.9) {
    warnings.push(
      "Overhangs beyond 0.9 m usually need a soffit support or bearer, which this shopping list does not include.",
    );
  }
  warnings.push(
    "Gutter falls, outlets, stop ends, sealant and the soakaway or storage that receives the water are not included.",
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
