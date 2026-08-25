/**
 * FRELUX MATERIAL SPECIFICATION ENGINE
 *
 * Feature 5 of 16: Material Engine
 *
 * A material specification represents:
 * - category (paint, cement, tiles, etc.)
 * - product name
 * - brand
 * - package size
 * - package unit
 * - coverage/yield
 * - application
 * - waste
 * - market
 * - currency
 * - price source
 *
 * The system does NOT assume every product has the same package size.
 * Package sizes are configurable. Coverage/yield is configurable.
 * No hardcoded generic material assumptions in the engine.
 */

import type { QuantityUnit } from './extended-units';
import type { FinishType } from './space-engine';
import { generateId } from './factory';

// =========================================================
// MATERIAL CATEGORY
// =========================================================

export type MaterialCategory =
  | 'paint'
  | 'cement'
  | 'screeding_compound'
  | 'tiles'
  | 'grafitex'
  | 'pop'
  | 'tyrolene'
  | 'blocks'
  | 'sand'
  | 'gravel'
  | 'reinforcement'
  | 'timber'
  | 'roofing'
  | 'waterproofing'
  | 'primer'
  | 'filler'
  | 'other';

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  paint: 'Paint',
  cement: 'Cement',
  screeding_compound: 'Screeding Compound',
  tiles: 'Tiles',
  grafitex: 'Grafitex',
  pop: 'POP (Plaster of Paris)',
  tyrolene: 'Tyrolene',
  blocks: 'Blocks',
  sand: 'Sand',
  gravel: 'Gravel',
  reinforcement: 'Reinforcement',
  timber: 'Timber',
  roofing: 'Roofing',
  waterproofing: 'Waterproofing',
  primer: 'Primer',
  filler: 'Filler',
  other: 'Other',
};

// =========================================================
// COVERAGE / YIELD
// =========================================================

/**
 * How a material's coverage/yield is specified.
 * - area: coverage in m² per package (e.g. 1 bucket covers 35 m²)
 * - volume: yield in m³ per package
 * - count: pieces per package (e.g. 1 carton = 12 tiles)
 * - per_unit: material is sold per individual unit (no package)
 */
export type CoverageType = 'area' | 'volume' | 'count' | 'per_unit';

/**
 * Material coverage specification.
 * Not every material covers area — some are count-based or volume-based.
 */
export interface MaterialCoverage {
  type: CoverageType;
  /** For area: m² per package. For volume: m³ per package. For count: pieces per package. */
  value: number;
  /** Number of coats/layers this coverage applies to (default 1) */
  coats?: number;
  /** Unit of the coverage value (for display) */
  unit: 'm2' | 'm3' | 'pieces' | 'litres';
}

// =========================================================
// MATERIAL SPECIFICATION
// =========================================================

/**
 * A complete material specification.
 * This is NOT a price — it's the physical product specification.
 * Pricing is handled separately by the Market Intelligence layer.
 */
export interface MaterialSpec {
  /** Unique identifier */
  id: string;
  /** Material category */
  category: MaterialCategory;
  /** Product name (e.g. "Premium Emulsion Paint", "Portland Cement") */
  productName: string;
  /** Brand (e.g. "Dulux", "Lafarge", "Eagle") */
  brand?: string;
  /** Package size (e.g. 20, 40, 5) */
  packageSize: number;
  /** Package unit (e.g. litres, kg, carton) */
  packageUnit: string;
  /** Quantity unit for purchasing (bags, buckets, cartons, etc.) */
  quantityUnit: QuantityUnit;
  /** Coverage/yield specification */
  coverage?: MaterialCoverage;
  /** Application/finish type this material is used for */
  application: FinishType;
  /** Default waste percentage (0–100) — can be overridden per calculation */
  defaultWastePercent: number;
  /** Market/country code this material is specified for */
  marketCode: string;
  /** Currency code (e.g. NGN, GHS, KES, ZAR, USD) */
  currency: string;
  /** Price source identifier (from Market Intelligence) */
  priceSourceId?: string;
  /** Whether this material spec is approved for use */
  isApproved: boolean;
  /** Notes */
  notes?: string;
  /** Product SKU or code */
  sku?: string;
}

/**
 * A simplified material reference for when full spec isn't needed.
 */
export interface MaterialReference {
  category: MaterialCategory;
  productName: string;
  brand?: string;
  packageSize: number;
  packageUnit: string;
}

// =========================================================
// MATERIAL CALCULATION
// =========================================================

/**
 * Result of calculating material quantity for a given area.
 */
export interface MaterialCalculationResult {
  /** The material spec used */
  materialId: string;
  /** Input area in m² */
  areaM2: number;
  /** Number of coats applied */
  coats: number;
  /** Coverage per package in m² (adjusted for coats) */
  effectiveCoverageM2: number;
  /** Raw quantity needed (before waste) */
  baseQuantity: number;
  /** Waste percentage applied */
  wastePercent: number;
  /** Quantity after waste */
  quantityWithWaste: number;
  /** Final purchase quantity (rounded up) */
  purchaseQuantity: number;
  /** Quantity unit (bags, buckets, cartons, etc.) */
  quantityUnit: QuantityUnit;
  /** Calculation steps for transparency */
  steps: { label: string; formula: string; value: string }[];
}

// =========================================================
// FACTORY
// =========================================================

/**
 * Create a material specification with defaults.
 */
export function createMaterialSpec(
  partial: Partial<MaterialSpec> = {},
): MaterialSpec {
  return {
    id: generateId('mat'),
    category: partial.category ?? 'other',
    productName: partial.productName ?? 'New Material',
    brand: partial.brand,
    packageSize: partial.packageSize ?? 1,
    packageUnit: partial.packageUnit ?? 'unit',
    quantityUnit: partial.quantityUnit ?? 'pieces',
    coverage: partial.coverage,
    application: partial.application ?? 'none',
    defaultWastePercent: partial.defaultWastePercent ?? 0,
    marketCode: partial.marketCode ?? 'NG',
    currency: partial.currency ?? 'NGN',
    priceSourceId: partial.priceSourceId,
    isApproved: partial.isApproved ?? false,
    notes: partial.notes,
    sku: partial.sku,
  };
}

// =========================================================
// MATERIAL QUANTITY CALCULATION
// =========================================================

import { roundForDisplay, roundUpToWholeUnit } from './geometry';
import { makeStep } from './geometry';

/**
 * Calculate material quantity for a given area.
 *
 * Area (m²) × Coats ÷ Coverage (m² per package) = Base quantity
 * Base quantity × (1 + waste%) = Quantity with waste
 * ⌈Quantity with waste⌉ = Purchase quantity
 *
 * This is a pure calculation — no pricing, no market data.
 * The Market Intelligence layer provides validated prices separately.
 *
 * @param areaM2 - Surface area to cover in m²
 * @param material - Material specification with coverage info
 * @param coats - Number of coats/layers (default 1, or from material coverage)
 * @param wastePercent - Waste percentage override (0–100); uses material default if not provided
 * @returns Material calculation result with transparent steps
 */
export function calculateMaterialQuantity(
  areaM2: number,
  material: MaterialSpec,
  coats?: number,
  wastePercent?: number,
): MaterialCalculationResult {
  const steps: { label: string; formula: string; value: string }[] = [];

  const effectiveCoats = coats ?? material.coverage?.coats ?? 1;
  const effectiveWaste = wastePercent ?? material.defaultWastePercent;

  // Coverage per package
  if (!material.coverage || material.coverage.type !== 'area') {
    throw new Error(
      `Material ${material.productName} does not have area-based coverage. ` +
      `Coverage type: ${material.coverage?.type ?? 'none'}. ` +
      `This calculation requires area-based coverage (m² per package).`,
    );
  }

  const coveragePerPackageM2 = material.coverage.value;
  if (coveragePerPackageM2 <= 0) {
    throw new Error(`Material ${material.productName} has zero or negative coverage.`);
  }

  // Effective coverage = coverage per package / coats
  // If coverage says "35 m² per bucket at 2 coats", then effective coverage at 2 coats = 35
  // If coverage says "35 m² per bucket at 1 coat", then at 2 coats = 35 / 2 = 17.5
  let effectiveCoverageM2: number;
  if (material.coverage.coats && material.coverage.coats > 1) {
    // Coverage already accounts for multiple coats
    if (effectiveCoats === material.coverage.coats) {
      effectiveCoverageM2 = coveragePerPackageM2;
    } else {
      // Adjust proportionally
      effectiveCoverageM2 = coveragePerPackageM2 * (material.coverage.coats / effectiveCoats);
    }
  } else {
    // Coverage is per single coat
    effectiveCoverageM2 = coveragePerPackageM2 / effectiveCoats;
  }

  steps.push(makeStep(
    'Coverage per package',
    `${coveragePerPackageM2} m²${material.coverage.coats ? ` @ ${material.coverage.coats} coat${material.coverage.coats > 1 ? 's' : ''}` : ''}`,
    `${roundForDisplay(effectiveCoverageM2, 4)} m² effective`,
  ));

  // Base quantity = area / effective coverage
  const baseQuantity = areaM2 / effectiveCoverageM2;
  steps.push(makeStep(
    'Base quantity',
    `${roundForDisplay(areaM2, 2)} m² ÷ ${roundForDisplay(effectiveCoverageM2, 4)} m²`,
    `${roundForDisplay(baseQuantity, 4)} ${material.quantityUnit}`,
  ));

  // Apply waste
  let quantityWithWaste = baseQuantity;
  if (effectiveWaste > 0) {
    quantityWithWaste = baseQuantity * (1 + effectiveWaste / 100);
    steps.push(makeStep(
      'Waste allowance',
      `+${effectiveWaste}%`,
      `${roundForDisplay(quantityWithWaste, 4)} ${material.quantityUnit}`,
    ));
  }

  // Round up to whole purchasable unit
  const purchaseQuantity = roundUpToWholeUnit(quantityWithWaste);
  steps.push(makeStep(
    'Purchase quantity (rounded up)',
    `⌈${roundForDisplay(quantityWithWaste, 4)}⌉`,
    `${purchaseQuantity} ${material.quantityUnit}`,
  ));

  return {
    materialId: material.id,
    areaM2,
    coats: effectiveCoats,
    effectiveCoverageM2,
    baseQuantity,
    wastePercent: effectiveWaste,
    quantityWithWaste,
    purchaseQuantity,
    quantityUnit: material.quantityUnit,
    steps,
  };
}

// =========================================================
// MATERIAL CATALOG
// =========================================================

/**
 * A catalog of material specifications.
 * This is the in-memory collection of approved materials.
 * In production, this maps to the database material specifications.
 */
export interface MaterialCatalog {
  materials: MaterialSpec[];
  marketCode: string;
  currency: string;
}

/**
 * Create a material catalog.
 */
export function createMaterialCatalog(
  marketCode: string = 'NG',
  currency: string = 'NGN',
): MaterialCatalog {
  return {
    materials: [],
    marketCode,
    currency,
  };
}

/**
 * Add a material to a catalog.
 */
export function addMaterialToCatalog(
  catalog: MaterialCatalog,
  material: MaterialSpec,
): MaterialCatalog {
  return {
    ...catalog,
    materials: [...catalog.materials, material],
  };
}

/**
 * Find materials by category in a catalog.
 */
export function findMaterialsByCategory(
  catalog: MaterialCatalog,
  category: MaterialCategory,
): MaterialSpec[] {
  return catalog.materials.filter((m) => m.category === category && m.isApproved);
}

/**
 * Find materials by application/finish type.
 */
export function findMaterialsByApplication(
  catalog: MaterialCatalog,
  application: FinishType,
): MaterialSpec[] {
  return catalog.materials.filter((m) => m.application === application && m.isApproved);
}

/**
 * Find a material by ID.
 */
export function findMaterialById(
  catalog: MaterialCatalog,
  materialId: string,
): MaterialSpec | undefined {
  return catalog.materials.find((m) => m.id === materialId);
}

/**
 * Create a material reference from a material spec.
 */
export function toMaterialReference(material: MaterialSpec): MaterialReference {
  return {
    category: material.category,
    productName: material.productName,
    brand: material.brand,
    packageSize: material.packageSize,
    packageUnit: material.packageUnit,
  };
}
