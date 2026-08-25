/**
 * FRELUX ROOF → MATERIAL ENGINE
 *
 * Feature 17: Roof → Material Engine
 *
 * Connects verified roof geometry to the existing FRELUX Material Engine.
 *
 * Architecture:
 *   VERIFIED ROOF GEOMETRY
 *     ↓
 *   ROOF AREA (surface area from roof calculation)
 *     ↓
 *   ROOF TYPE (hip, gable, flat, etc.)
 *     ↓
 *   MATERIAL SPECIFICATION (configurable per roofing material)
 *     ↓
 *   COVERAGE / PACKAGE RULE (from material spec, not hardcoded)
 *     ↓
 *   REQUIRED QUANTITY
 *
 * The material engine uses configurable material specifications.
 * NO hardcoded universal dimensions, coverage, or waste rules.
 *
 * Different roofing materials may have different:
 *   - dimensions
 *   - coverage
 *   - package units
 *   - waste rules
 *
 * The engine explains how the material quantity was derived.
 *
 * This module integrates with the existing Material Engine and
 * does NOT replace the roof calculation engine.
 */

import type { MaterialSpec, MaterialCalculationResult } from '@/lib/measurement/material-engine';
import { calculateMaterialQuantity, createMaterialSpec } from '@/lib/measurement/material-engine';
import type { MultiRoofCalculation, RoofSectionCalculation } from './section-model-types';
import type { RoofingMaterial } from '@/types/build-to-roof';
import { SCREWS_PER_SHEET } from '@/lib/estimation/build-to-roof-engine';

// =========================================================
// ROOF MATERIAL SPECIFICATION
// =========================================================

/**
 * A roofing material specification with configurable coverage.
 * This extends the generic MaterialSpec with roof-specific metadata.
 */
export interface RoofMaterialSpec {
  /** The base material spec */
  materialSpec: MaterialSpec;
  /** Roofing material type this spec is for */
  roofingMaterial: RoofingMaterial;
  /** Sheet/panel width in meters */
  sheetWidthM?: number;
  /** Sheet/panel length in meters */
  sheetLengthM?: number;
  /** Whether this is a sheet-based material (vs tile/panel) */
  isSheetBased: boolean;
  /** Screws per sheet/panel (configurable, not hardcoded) */
  screwsPerUnit?: number;
  /** Ridge cap coverage in meters per piece */
  ridgeCapCoverageM?: number;
  /** Hip cap coverage in meters per piece */
  hipCapCoverageM?: number;
  /** Fascia board coverage in meters per piece */
  fasciaCoverageM?: number;
}

/**
 * Result of calculating roof material requirements for one section.
 */
export interface RoofSectionMaterialResult {
  sectionId: string;
  sectionName: string;
  /** Roof surface area for this section */
  surfaceAreaM2: number;
  /** Roofing material calculation */
  roofingMaterial: MaterialCalculationResult | null;
  /** Screws needed */
  screwsNeeded: number | null;
  /** Ridge cap quantity */
  ridgeCapQuantity: number | null;
  /** Hip cap quantity */
  hipCapQuantity: number | null;
  /** Fascia board quantity */
  fasciaBoardQuantity: number | null;
  /** Explanation of how quantities were derived */
  explanation: string[];
  /** Whether material spec was configured */
  materialConfigured: boolean;
}

/**
 * Result of calculating roof material requirements for entire roof.
 */
export interface RoofMaterialResult {
  sections: RoofSectionMaterialResult[];
  /** Total roofing material needed */
  totalRoofingMaterial: number;
  /** Total screws */
  totalScrews: number;
  /** Total ridge caps */
  totalRidgeCaps: number;
  /** Total hip caps */
  totalHipCaps: number;
  /** Total fascia boards */
  totalFasciaBoards: number;
  /** Material spec used (if configured) */
  materialSpecName: string | null;
  /** Whether all sections had configured materials */
  allConfigured: boolean;
  /** Combined explanation */
  explanation: string[];
}

// =========================================================
// FACTORY
// =========================================================

/**
 * Create a roofing material specification.
 * Coverage and waste are configurable — not hardcoded.
 */
export function createRoofMaterialSpec(params: {
  productName: string;
  roofingMaterial: RoofingMaterial;
  brand?: string;
  /** Coverage in m² per sheet/panel/carton */
  coverageM2: number;
  /** Package unit (sheets, panels, cartons, etc.) */
  quantityUnit: string;
  /** Waste percentage (0-100) */
  wastePercent?: number;
  /** Sheet width in meters (optional, for reference) */
  sheetWidthM?: number;
  /** Sheet length in meters (optional, for reference) */
  sheetLengthM?: number;
  /** Screws per sheet/panel */
  screwsPerUnit?: number;
  /** Ridge cap coverage in meters per piece */
  ridgeCapCoverageM?: number;
  /** Hip cap coverage in meters per piece */
  hipCapCoverageM?: number;
  /** Fascia board coverage in meters per piece */
  fasciaCoverageM?: number;
  marketCode?: string;
  currency?: string;
}): RoofMaterialSpec {
  const materialSpec = createMaterialSpec({
    productName: params.productName,
    brand: params.brand,
    category: 'roofing',
    quantityUnit: params.quantityUnit as string,
    coverage: {
      type: 'area',
      value: params.coverageM2,
      unit: 'm2',
      coats: 1,
    },
    defaultWastePercent: params.wastePercent ?? 10,
    application: 'none',
    marketCode: params.marketCode ?? 'NG',
    currency: params.currency ?? 'NGN',
    isApproved: true,
  });

  return {
    materialSpec,
    roofingMaterial: params.roofingMaterial,
    sheetWidthM: params.sheetWidthM,
    sheetLengthM: params.sheetLengthM,
    isSheetBased: params.sheetWidthM !== undefined && params.sheetLengthM !== undefined,
    screwsPerUnit: params.screwsPerUnit ?? SCREWS_PER_SHEET,
    ridgeCapCoverageM: params.ridgeCapCoverageM,
    hipCapCoverageM: params.hipCapCoverageM,
    fasciaCoverageM: params.fasciaCoverageM,
  };
}

// =========================================================
// ROOF SECTION → MATERIAL CALCULATION
// =========================================================

/**
 * Calculate material requirements for a single roof section.
 *
 * Uses the configurable RoofMaterialSpec — no hardcoded coverage.
 * If no material spec is provided, shows area without pricing.
 */
export function calculateRoofSectionMaterials(
  section: RoofSectionCalculation,
  materialSpec: RoofMaterialSpec | null,
): RoofSectionMaterialResult {
  const explanation: string[] = [];
  const surfaceArea = section.surfaceAreaM2;

  if (!materialSpec) {
    explanation.push(
      `Section "${section.sectionName}": Surface area = ${surfaceArea.toFixed(2)} m². ` +
      `No material specification configured. ` +
      `Material quantity cannot be calculated without a configured material spec.`
    );
    return {
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      surfaceAreaM2: surfaceArea,
      roofingMaterial: null,
      screwsNeeded: null,
      ridgeCapQuantity: null,
      hipCapQuantity: null,
      fasciaBoardQuantity: null,
      explanation,
      materialConfigured: false,
    };
  }

  // Calculate roofing material using the existing Material Engine
  const roofingResult = calculateMaterialQuantity(
    surfaceArea,
    materialSpec.materialSpec,
    1, // 1 coat/layer
    materialSpec.materialSpec.defaultWastePercent,
  );

  explanation.push(
    `Section "${section.sectionName}": ${surfaceArea.toFixed(2)} m² surface area ÷ ` +
    `${materialSpec.materialSpec.coverage!.value} m² per ${materialSpec.materialSpec.quantityUnit} ` +
    `= ${roofingResult.baseQuantity.toFixed(2)} ${materialSpec.materialSpec.quantityUnit} (base)`
  );
  explanation.push(
    `With ${materialSpec.materialSpec.defaultWastePercent}% waste: ` +
    `${roofingResult.quantityWithWaste.toFixed(2)} → ${roofingResult.purchaseQuantity} ${materialSpec.materialSpec.quantityUnit} (rounded up)`
  );

  // Screws
  let screwsNeeded: number | null = null;
  if (materialSpec.screwsPerUnit) {
    screwsNeeded = roofingResult.purchaseQuantity * materialSpec.screwsPerUnit;
    explanation.push(
      `Screws: ${roofingResult.purchaseQuantity} ${materialSpec.materialSpec.quantityUnit} × ${materialSpec.screwsPerUnit} screws = ${screwsNeeded} screws`
    );
  }

  // Ridge caps
  let ridgeCapQuantity: number | null = null;
  if (materialSpec.ridgeCapCoverageM && materialSpec.ridgeCapCoverageM > 0) {
    ridgeCapQuantity = Math.ceil(section.ridgeLengthM / materialSpec.ridgeCapCoverageM);
    explanation.push(
      `Ridge caps: ${section.ridgeLengthM.toFixed(2)} m ridge ÷ ${materialSpec.ridgeCapCoverageM} m per cap = ${ridgeCapQuantity} caps`
    );
  }

  // Hip caps
  let hipCapQuantity: number | null = null;
  if (materialSpec.hipCapCoverageM && materialSpec.hipCapCoverageM > 0 && section.hipLengthM > 0) {
    hipCapQuantity = Math.ceil(section.hipLengthM / materialSpec.hipCapCoverageM);
    explanation.push(
      `Hip caps: ${section.hipLengthM.toFixed(2)} m hip ÷ ${materialSpec.hipCapCoverageM} m per cap = ${hipCapQuantity} caps`
    );
  }

  // Fascia boards
  let fasciaBoardQuantity: number | null = null;
  if (materialSpec.fasciaCoverageM && materialSpec.fasciaCoverageM > 0) {
    fasciaBoardQuantity = Math.ceil(section.fasciaLengthM / materialSpec.fasciaCoverageM);
    explanation.push(
      `Fascia boards: ${section.fasciaLengthM.toFixed(2)} m fascia ÷ ${materialSpec.fasciaCoverageM} m per board = ${fasciaBoardQuantity} boards`
    );
  }

  return {
    sectionId: section.sectionId,
    sectionName: section.sectionName,
    surfaceAreaM2: surfaceArea,
    roofingMaterial: roofingResult,
    screwsNeeded,
    ridgeCapQuantity,
    hipCapQuantity,
    fasciaBoardQuantity,
    explanation,
    materialConfigured: true,
  };
}

// =========================================================
// MULTI-ROOF → MATERIAL CALCULATION
// =========================================================

/**
 * Calculate material requirements for an entire multi-section roof.
 *
 * Each section uses the same material spec (or section-specific specs
 * can be provided via a map). The engine explains every derivation.
 */
export function calculateRoofMaterials(
  roofCalc: MultiRoofCalculation,
  materialSpec: RoofMaterialSpec | null,
  sectionMaterialSpecs?: Map<string, RoofMaterialSpec>,
): RoofMaterialResult {
  const sections: RoofSectionMaterialResult[] = [];
  const explanation: string[] = [];
  let totalRoofingMaterial = 0;
  let totalScrews = 0;
  let totalRidgeCaps = 0;
  let totalHipCaps = 0;
  let totalFasciaBoards = 0;
  let allConfigured = true;

  for (const section of roofCalc.sections) {
    if (!section.complete) {
      explanation.push(
        `Section "${section.sectionName}": Incomplete data — missing: ${section.missing.join(', ')}. Skipped.`
      );
      allConfigured = false;
      continue;
    }

    // Use section-specific spec if provided, otherwise the default
    const spec = sectionMaterialSpecs?.get(section.sectionId) ?? materialSpec;

    const sectionResult = calculateRoofSectionMaterials(section, spec);
    sections.push(sectionResult);
    explanation.push(...sectionResult.explanation);

    if (sectionResult.roofingMaterial) {
      totalRoofingMaterial += sectionResult.roofingMaterial.purchaseQuantity;
    } else {
      allConfigured = false;
    }

    if (sectionResult.screwsNeeded) totalScrews += sectionResult.screwsNeeded;
    if (sectionResult.ridgeCapQuantity) totalRidgeCaps += sectionResult.ridgeCapQuantity;
    if (sectionResult.hipCapQuantity) totalHipCaps += sectionResult.hipCapQuantity;
    if (sectionResult.fasciaBoardQuantity) totalFasciaBoards += sectionResult.fasciaBoardQuantity;
  }

  return {
    sections,
    totalRoofingMaterial,
    totalScrews,
    totalRidgeCaps,
    totalHipCaps,
    totalFasciaBoards,
    materialSpecName: materialSpec?.materialSpec.productName ?? null,
    allConfigured,
    explanation,
  };
}

// =========================================================
// AREA PIPELINE → MATERIAL
// =========================================================

/**
 * Calculate material requirements from a raw surface area
 * (e.g., from the area pipeline, not the section model).
 *
 * This allows the material engine to work with any roof area source.
 */
export function calculateRoofMaterialsFromArea(
  surfaceAreaM2: number,
  materialSpec: RoofMaterialSpec | null,
): { result: MaterialCalculationResult | null; explanation: string[] } {
  const explanation: string[] = [];

  if (!materialSpec) {
    explanation.push(
      `Surface area: ${surfaceAreaM2.toFixed(2)} m². No material specification configured.`
    );
    return { result: null, explanation };
  }

  const result = calculateMaterialQuantity(
    surfaceAreaM2,
    materialSpec.materialSpec,
    1,
    materialSpec.materialSpec.defaultWastePercent,
  );

  explanation.push(
    `${surfaceAreaM2.toFixed(2)} m² ÷ ${materialSpec.materialSpec.coverage!.value} m² per ${materialSpec.materialSpec.quantityUnit} ` +
    `= ${result.baseQuantity.toFixed(2)} ${materialSpec.materialSpec.quantityUnit}`
  );
  explanation.push(
    `With ${materialSpec.materialSpec.defaultWastePercent}% waste: ${result.quantityWithWaste.toFixed(2)} → ${result.purchaseQuantity} ${materialSpec.materialSpec.quantityUnit}`
  );

  return { result, explanation };
}
