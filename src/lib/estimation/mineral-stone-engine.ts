/**
 * FRELUX Mineral Stone Calculation Engine (Phase 3)
 *
 * Deterministic engine for packaged mineral-stone decorative finishes.
 *
 * PRINCIPLES
 * - Every business value (model, coverage, consumption, package size, coats,
 *   waste, price) comes from database configuration passed in as config.
 *   Nothing is hardcoded, nothing is guessed.
 * - Incomplete configuration => explicit data-requirement warning; the
 *   engine refuses to produce a quantity it cannot stand behind.
 * - Ranges (coverage_min/coverage_max, consumption_min/consumption_max) are
 *   surfaced as ranges end-to-end. A range is never collapsed into one number.
 * - Internal math keeps full float precision; rounding happens only at
 *   purchase (whole packages, round-up rule) and at display.
 * - Same inputs + same config => same result, always.
 *
 * MODELS
 * - coverage_based  (Model A): packages = (area × coats) / coverage [m²/package]
 * - mass_per_area   (Model B): kg = area × coats × consumption [kg/m²];
 *                              packages = kg / pack_kg
 * - volume_per_area (Model C): L = area × coats × consumption [L/m²];
 *                              packages = L / pack_L
 */

import type {
  EstimationProduct,
  EstimationProductQuality,
} from "@/types/estimation";
import { areaToM2, isAreaUnit, type AreaUnit } from "./units";

// ─────────────────────────────────────────────────────────
// Input / config / result types
// ─────────────────────────────────────────────────────────

export interface MineralStoneInput {
  /** Surface area as entered by the user. */
  area: number;
  /** Unit of the entered area: 'm2' or 'ft2'. */
  area_unit: string;
  /**
   * Coats/layers requested. The page seeds this from the configured
   * default_coats of the selected application profile; the user may change
   * it explicitly. If both this and the configured default are null the
   * engine refuses to calculate (no assumed coat count).
   */
  coats: number | null;
}

export interface MineralStoneConfig {
  product: Pick<
    EstimationProduct,
    | "id"
    | "name"
    | "slug"
    | "brand"
    | "product_notes"
    | "technical_spec"
    | "standard_pack_size"
  > & {
    /** Symbol of the pack unit, e.g. 'kg', 'L', 'bucket', 'bag' (from estimation_units). */
    pack_unit_symbol: string | null;
    /** Price of ONE package from estimation_prices. Null = not configured. */
    price_per_pack: number | null;
  };
  /** The selected application profile (estimation_product_quality row). */
  profile: Pick<
    EstimationProductQuality,
    | "id"
    | "name"
    | "slug"
    | "is_active"
    | "calculation_model"
    | "coverage"
    | "coverage_min"
    | "coverage_max"
    | "coverage_unit"
    | "consumption_min"
    | "consumption_max"
    | "consumption_unit"
    | "default_coats"
    | "waste_percentage"
  >;
}

export interface MineralStoneStep {
  label: string;
  detail: string;
}

export interface MineralStoneResult {
  calculable: boolean;
  warnings: string[];

  // Inputs (echoed)
  product_name: string;
  brand: string | null;
  profile_name: string;
  calculation_model: string | null;
  area_input: number;
  area_unit: AreaUnit | null;
  area_m2: number | null;
  coats: number | null;

  // Configuration used (echoed, null when missing)
  coverage_min: number | null;
  coverage_max: number | null;
  consumption_min: number | null;
  consumption_max: number | null;
  consumption_unit: string | null;
  pack_size: number | null;
  pack_unit: string | null;
  waste_percentage: number | null;

  // Material requirement (before waste), as a range
  material_min: number | null;
  material_max: number | null;
  material_unit: string | null; // 'package' for model A, consumption_unit for B/C

  // After configured waste
  with_waste_min: number | null;
  with_waste_max: number | null;

  // Purchase (whole packages)
  purchase_min: number | null;
  purchase_max: number | null;
  purchase_unit: string | null; // e.g. '25 kg bucket' — built from config, for display only

  // Cost
  cost_min: number | null;
  cost_max: number | null;
  price_per_pack: number | null;

  // Transparency
  steps: MineralStoneStep[];
  product_notes: string | null;
  technical_spec: string | null;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function fmt(n: number, digits = 2): string {
  return Number(n.toFixed(digits)).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function num(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Resolve the effective coverage range, falling back to the legacy single coverage column. */
function resolveCoverageRange(profile: MineralStoneConfig["profile"]): {
  min: number | null;
  max: number | null;
} {
  const min = num(profile.coverage_min);
  const max = num(profile.coverage_max);
  if (min !== null || max !== null) {
    return { min: min ?? max, max: max ?? min };
  }
  const single = num(profile.coverage);
  if (single !== null) {
    return { min: single, max: single };
  }
  return { min: null, max: null };
}

/** Ceil with an epsilon guard so 5.000000001 does not become 6. */
function ceilEpsilon(n: number): number {
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-9) return rounded;
  return Math.ceil(n);
}

// ─────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────

export function calculateMineralStone(
  input: MineralStoneInput,
  config: MineralStoneConfig,
): MineralStoneResult {
  const warnings: string[] = [];
  const steps: MineralStoneStep[] = [];
  const { product, profile } = config;

  const result: MineralStoneResult = {
    calculable: false,
    warnings,
    product_name: product.name,
    brand: product.brand ?? null,
    profile_name: profile.name,
    calculation_model: profile.calculation_model ?? null,
    area_input: input.area,
    area_unit: isAreaUnit(input.area_unit) ? input.area_unit : null,
    area_m2: null,
    coats: null,
    coverage_min: null,
    coverage_max: null,
    consumption_min: null,
    consumption_max: null,
    consumption_unit: profile.consumption_unit ?? null,
    pack_size: num(product.standard_pack_size),
    pack_unit: product.pack_unit_symbol ?? null,
    waste_percentage: num(profile.waste_percentage),
    material_min: null,
    material_max: null,
    material_unit: null,
    with_waste_min: null,
    with_waste_max: null,
    purchase_min: null,
    purchase_max: null,
    purchase_unit: null,
    cost_min: null,
    cost_max: null,
    price_per_pack: config.product.price_per_pack,
    steps,
    product_notes: product.product_notes ?? null,
    technical_spec: product.technical_spec ?? null,
  };

  // ── 0. Profile active state ──
  if (!profile.is_active) {
    warnings.push(
      `Application profile '${profile.name}' is inactive. Select an active product configuration.`,
    );
    return result;
  }

  // ── 1. Area validation + conversion ──
  if (!Number.isFinite(input.area) || input.area <= 0) {
    warnings.push("Surface area must be a positive number greater than zero.");
    return result;
  }
  if (!isAreaUnit(input.area_unit)) {
    warnings.push(
      `Invalid area unit '${input.area_unit}'. Supported units: m², ft².`,
    );
    return result;
  }
  const areaM2 = areaToM2(input.area, input.area_unit);
  if (areaM2 === null) {
    warnings.push("Area could not be converted to m².");
    return result;
  }
  result.area_m2 = areaM2;
  steps.push({
    label: "Surface area",
    detail: `${fmt(input.area)} ${input.area_unit === "m2" ? "m²" : "ft²"} = ${fmt(areaM2, 4)} m² (exact conversion 1 ft² = 0.09290304 m²)`,
  });

  // ── 2. Coats ──
  const coats =
    input.coats !== null ? input.coats : (profile.default_coats ?? null);
  if (coats === null || !Number.isFinite(coats) || coats <= 0) {
    warnings.push(
      `Number of coats/layers is not configured for '${profile.name}'. The calculation cannot proceed until a coat count is configured for this product or entered explicitly.`,
    );
    return result;
  }
  if (!Number.isInteger(coats)) {
    warnings.push("Number of coats/layers must be a whole number.");
    return result;
  }
  result.coats = coats;
  steps.push({
    label: "Coats/layers",
    detail: `${coats} coat${coats === 1 ? "" : "s"} (${input.coats !== null ? "entered" : "configured default"})`,
  });

  // ── 3. Model + material requirement ──
  const model = profile.calculation_model ?? null;
  if (!model) {
    warnings.push(
      `Calculation model is not configured for '${product.name}' / '${profile.name}'. Configure coverage-based or consumption-based data before calculating.`,
    );
    return result;
  }

  const waste = num(profile.waste_percentage ?? null);
  if (waste === null) {
    warnings.push(
      `Waste percentage is not configured for '${profile.name}'. Quantities are shown WITHOUT a waste allowance — add a waste configuration before relying on purchase numbers.`,
    );
  } else if (waste < 0 || waste >= 100) {
    warnings.push("Configured waste percentage is invalid (must be 0–99).");
    return result;
  }

  const effectiveArea = areaM2 * coats;
  let materialMin: number | null = null;
  let materialMax: number | null = null;
  let materialUnit: string | null = null;

  if (model === "coverage_based") {
    // Model A: coverage is m² covered per package.
    // Higher coverage => fewer packages. The light end of the range
    // (coverage_max) gives the minimum package count.
    const range = resolveCoverageRange(profile);
    const covMin = range.min;
    const covMax = range.max;
    result.coverage_min = covMin;
    result.coverage_max = covMax;
    if (covMin === null || covMax === null || covMin <= 0 || covMax <= 0) {
      warnings.push(
        `Coverage is not configured for '${product.name}' / '${profile.name}'. A Mineral Stone product without verified coverage data cannot be calculated reliably.`,
      );
      return result;
    }
    // coverage must be per m²; a ft²-based coverage unit is not verified for this engine
    const covUnit = profile.coverage_unit ?? "m2_per_package";
    if (covUnit !== "m2_per_package" && covUnit !== "") {
      warnings.push(
        `Coverage unit '${covUnit}' is not supported by the Mineral Stone engine (expected m² per package). Verify the product configuration.`,
      );
      return result;
    }
    materialMin = effectiveArea / covMax;
    materialMax = effectiveArea / covMin;
    materialUnit = "package";
    steps.push({
      label: "Calculation model",
      detail: "Area per package (coverage-based)",
    });
    steps.push({
      label: "Configured coverage",
      detail:
        covMin === covMax
          ? `${fmt(covMin, 4)} m² per package`
          : `${fmt(covMin, 4)}–${fmt(covMax, 4)} m² per package`,
    });
    steps.push({
      label: "Material requirement (packages)",
      detail:
        covMin === covMax
          ? `${fmt(effectiveArea, 4)} m² ÷ ${fmt(covMax, 4)} m²/package = ${fmt(materialMin, 4)} packages`
          : `${fmt(effectiveArea, 4)} m² ÷ ${fmt(covMax, 4)} = ${fmt(materialMin, 4)} packages (min) · ${fmt(effectiveArea, 4)} m² ÷ ${fmt(covMin, 4)} = ${fmt(materialMax, 4)} packages (max)`,
    });
  } else if (model === "mass_per_area" || model === "volume_per_area") {
    const consMin = num(profile.consumption_min);
    const consMax = num(profile.consumption_max);
    result.consumption_min = consMin;
    result.consumption_max = consMax;
    const consUnit =
      profile.consumption_unit ??
      (model === "mass_per_area" ? "kg_per_m2" : "litre_per_m2");
    const expectedUnit =
      model === "mass_per_area" ? "kg_per_m2" : "litre_per_m2";
    if (consUnit !== expectedUnit) {
      warnings.push(
        `Consumption unit '${consUnit}' is not supported (expected ${expectedUnit}). Verify the product configuration.`,
      );
      return result;
    }
    if (consMin === null || consMax === null || consMin <= 0 || consMax <= 0) {
      warnings.push(
        `${model === "mass_per_area" ? "Consumption (kg/m²)" : "Consumption (L/m²)"} is not configured for '${product.name}' / '${profile.name}'. The product cannot be calculated reliably until verified consumption data is supplied.`,
      );
      return result;
    }
    materialMin = effectiveArea * consMin;
    materialMax = effectiveArea * consMax;
    materialUnit = model === "mass_per_area" ? "kg" : "L";
    steps.push({
      label: "Calculation model",
      detail:
        model === "mass_per_area"
          ? "Mass per area (consumption-based)"
          : "Volume per area (consumption-based)",
    });
    steps.push({
      label: "Configured consumption",
      detail:
        consMin === consMax
          ? `${fmt(consMin, 4)} ${model === "mass_per_area" ? "kg/m²" : "L/m²"} per coat`
          : `${fmt(consMin, 4)}–${fmt(consMax, 4)} ${model === "mass_per_area" ? "kg/m²" : "L/m²"} per coat`,
    });
    steps.push({
      label: `Material requirement (${materialUnit})`,
      detail:
        consMin === consMax
          ? `${fmt(effectiveArea, 4)} m² × ${fmt(consMin, 4)} = ${fmt(materialMin, 4)} ${materialUnit}`
          : `${fmt(effectiveArea, 4)} m² × ${fmt(consMin, 4)} = ${fmt(materialMin, 4)} ${materialUnit} (min) · ${fmt(effectiveArea, 4)} m² × ${fmt(consMax, 4)} = ${fmt(materialMax, 4)} ${materialUnit} (max)`,
    });
  } else {
    warnings.push(`Unknown calculation model '${model}'.`);
    return result;
  }

  result.material_min = materialMin;
  result.material_max = materialMax;
  result.material_unit = materialUnit;

  // ── 4. Waste ──
  const wasteFactor = waste === null ? 1 : 1 + waste / 100;
  const withWasteMin = materialMin * wasteFactor;
  const withWasteMax = materialMax * wasteFactor;
  result.with_waste_min = withWasteMin;
  result.with_waste_max = withWasteMax;
  steps.push({
    label: "Waste allowance",
    detail:
      waste === null
        ? "Not configured — raw quantities shown"
        : `+${fmt(waste, 2)}% → ${fmt(withWasteMin, 4)}–${fmt(withWasteMax, 4)} ${materialUnit}`,
  });

  // ── 5. Purchase quantity ──
  const packSize = num(product.standard_pack_size);
  const packUnit = product.pack_unit_symbol;
  if (model === "coverage_based") {
    // material is already in whole-or-fractional packages
    const pMin = ceilEpsilon(withWasteMin);
    const pMax = ceilEpsilon(withWasteMax);
    result.purchase_min = pMin;
    result.purchase_max = pMax;
    result.purchase_unit = packUnit ? `${packUnit}(s)` : "package(s)";
    steps.push({
      label: "Purchase quantity",
      detail:
        pMin === pMax
          ? `${pMin} package(s) (rounded up)`
          : `${pMin}–${pMax} package(s) (rounded up)`,
    });
  } else {
    if (packSize === null || packSize <= 0 || !packUnit) {
      warnings.push(
        `Package size/unit is not configured for '${product.name}'. Material requirement is calculated, but purchase quantity cannot be determined until the package size is configured.`,
      );
    } else {
      const pMin = ceilEpsilon(withWasteMin / packSize);
      const pMax = ceilEpsilon(withWasteMax / packSize);
      result.purchase_min = pMin;
      result.purchase_max = pMax;
      result.purchase_unit = `${fmt(packSize)} ${packUnit} ${packUnit === "kg" || packUnit === "L" ? (packSize === 1 ? "package" : "packages") : `${packUnit}(s)`}`;
      steps.push({
        label: "Package requirement",
        detail: `${fmt(withWasteMin, 4)} ÷ ${fmt(packSize, 4)} = ${fmt(withWasteMin / packSize, 4)} (min) · ${fmt(withWasteMax, 4)} ÷ ${fmt(packSize, 4)} = ${fmt(withWasteMax / packSize, 4)} (max), rounded up`,
      });
      steps.push({
        label: "Purchase quantity",
        detail:
          pMin === pMax
            ? `${pMin} × ${fmt(packSize)} ${packUnit}`
            : `${pMin}–${pMax} × ${fmt(packSize)} ${packUnit}`,
      });
    }
  }

  // ── 6. Cost ──
  const price = config.product.price_per_pack;
  if (price === null || price < 0 || !Number.isFinite(price)) {
    warnings.push(
      `Price per package is not configured for '${product.name}'. Cost cannot be shown until pricing is supplied.`,
    );
  } else if (result.purchase_min !== null && result.purchase_max !== null) {
    result.cost_min = result.purchase_min * price;
    result.cost_max = result.purchase_max * price;
    steps.push({
      label: "Cost",
      detail:
        result.cost_min === result.cost_max
          ? `${result.purchase_min} × ${fmt(price)} = ${fmt(result.cost_min)}`
          : `${result.purchase_min}–${result.purchase_max} × ${fmt(price)} = ${fmt(result.cost_min)}–${fmt(result.cost_max)}`,
    });
  }

  // ── 7. Calculable? ──
  result.calculable =
    result.material_min !== null &&
    result.material_max !== null &&
    result.purchase_min !== null &&
    result.purchase_max !== null;

  return result;
}
