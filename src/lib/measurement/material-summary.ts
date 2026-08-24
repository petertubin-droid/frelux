/**
 * FRELUX PROJECT MATERIAL SUMMARY
 *
 * Feature 10 of 16: Project Material Summary
 *
 * Aggregates all material requirements across an entire project.
 * The system must:
 * - Collect every material requirement across every space, element, fence, and opening
 * - Group by material category
 * - Subtotal per category
 * - Show purchase quantity per material
 * - Provide a grand total list
 *
 * The summary distinguishes between:
 * - Calculation-derived quantity (from the math)
 * - Purchase quantity (rounded up, after waste)
 * - Already-have quantity (user-specified inventory on hand)
 * - Final buy quantity (purchase − already-have)
 */

import type { SpaceResult } from './space-engine';
import type { ConstructionProjectResult } from './project-engine';
import type { MaterialSpec, MaterialCalculationResult } from './material-engine';
import type { FinishType } from './space-engine';
import { calculateMaterialQuantity } from './material-engine';
import { roundForDisplay, formatM2 } from './geometry';

// =========================================================
// MATERIAL LINE ITEM
// =========================================================

/**
 * A single material line in the project material summary.
 */
export interface MaterialLineItem {
  /** Unique line ID */
  lineId: string;
  /** Material spec reference */
  materialId: string;
  /** Material name */
  materialName: string;
  /** Brand */
  brand?: string;
  /** Category */
  category: string;
  /** Finish type this material is used for */
  finishType: FinishType | string;
  /** Area covered in m² */
  areaM2: number;
  /** Number of coats/layers */
  coats: number;
  /** Base quantity (before waste) */
  baseQuantity: number;
  /** Waste percentage applied */
  wastePercent: number;
  /** Quantity after waste */
  quantityWithWaste: number;
  /** Purchase quantity (rounded up) */
  purchaseQuantity: number;
  /** Already-have quantity (user-specified on-hand inventory) */
  alreadyHaveQuantity: number;
  /** Final buy quantity (purchase − already-have, minimum 0) */
  buyQuantity: number;
  /** Quantity unit (buckets, bags, cartons, etc.) */
  quantityUnit: string;
  /** Space/element this line is from */
  source: string;
}

/**
 * A category subtotal in the material summary.
 */
export interface MaterialCategorySubtotal {
  /** Category name */
  category: string;
  /** All line items in this category */
  lines: MaterialLineItem[];
  /** Total purchase quantity across all lines */
  totalPurchaseQuantity: number;
  /** Total buy quantity across all lines */
  totalBuyQuantity: number;
  /** Total area covered */
  totalAreaM2: number;
  /** Quantity unit (assumed same within a category) */
  quantityUnit: string;
}

/**
 * The complete project material summary.
 */
export interface ProjectMaterialSummary {
  /** Project name */
  projectName: string;
  /** All material line items */
  lineItems: MaterialLineItem[];
  /** Grouped by category */
  categorySubtotals: MaterialCategorySubtotal[];
  /** Grand total purchase quantity (note: different units per category) */
  grandTotalAreaM2: number;
  /** Total line items */
  totalLines: number;
}

// =========================================================
// MATERIAL REQUIREMENT
// =========================================================

/**
 * A material requirement derived from a space calculation.
 * This is an intermediate representation before aggregation.
 */
export interface MaterialRequirement {
  material: MaterialSpec;
  areaM2: number;
  coats: number;
  wastePercent: number;
  source: string;
  finishType: FinishType | string;
}

// =========================================================
// SUMMARY BUILDER
// =========================================================

let lineIdCounter = 0;

function nextLineId(): string {
  lineIdCounter++;
  return `ml-${lineIdCounter}`;
}

/**
 * Create a material line item from a material requirement.
 */
export function createMaterialLineItem(
  req: MaterialRequirement,
  alreadyHaveQuantity: number = 0,
): MaterialLineItem {
  const calcResult = calculateMaterialQuantity(
    req.areaM2,
    req.material,
    req.coats,
    req.wastePercent,
  );

  const buyQuantity = Math.max(0, calcResult.purchaseQuantity - alreadyHaveQuantity);

  return {
    lineId: nextLineId(),
    materialId: req.material.id,
    materialName: req.material.productName,
    brand: req.material.brand,
    category: req.material.category,
    finishType: req.finishType,
    areaM2: req.areaM2,
    coats: calcResult.coats,
    baseQuantity: roundForDisplay(calcResult.baseQuantity, 4),
    wastePercent: calcResult.wastePercent,
    quantityWithWaste: roundForDisplay(calcResult.quantityWithWaste, 4),
    purchaseQuantity: calcResult.purchaseQuantity,
    alreadyHaveQuantity,
    buyQuantity,
    quantityUnit: req.material.quantityUnit as string,
    source: req.source,
  };
}

/**
 * Group line items by material category.
 */
export function groupByCategory(
  lines: MaterialLineItem[],
): MaterialCategorySubtotal[] {
  const categoryMap = new Map<string, MaterialLineItem[]>();

  for (const line of lines) {
    const existing = categoryMap.get(line.category) ?? [];
    existing.push(line);
    categoryMap.set(line.category, existing);
  }

  const subtotals: MaterialCategorySubtotal[] = [];
  for (const [category, categoryLines] of categoryMap) {
    const totalPurchase = categoryLines.reduce((sum, l) => sum + l.purchaseQuantity, 0);
    const totalBuy = categoryLines.reduce((sum, l) => sum + l.buyQuantity, 0);
    const totalArea = categoryLines.reduce((sum, l) => sum + l.areaM2, 0);
    const unit = categoryLines[0]?.quantityUnit ?? 'units';

    subtotals.push({
      category,
      lines: categoryLines,
      totalPurchaseQuantity: totalPurchase,
      totalBuyQuantity: totalBuy,
      totalAreaM2: totalArea,
      quantityUnit: unit,
    });
  }

  return subtotals;
}

/**
 * Build a project material summary from material requirements.
 *
 * @param projectName - Project name
 * @param requirements - All material requirements across the project
 * @param alreadyHave - Map of materialId → already-have quantity
 * @returns Complete material summary
 */
export function buildMaterialSummary(
  projectName: string,
  requirements: MaterialRequirement[],
  alreadyHave: Map<string, number> = new Map(),
): ProjectMaterialSummary {
  const lineItems: MaterialLineItem[] = [];

  for (const req of requirements) {
    const onHand = alreadyHave.get(req.material.id) ?? 0;
    const line = createMaterialLineItem(req, onHand);
    lineItems.push(line);
  }

  const categorySubtotals = groupByCategory(lineItems);
  const grandTotalAreaM2 = lineItems.reduce((sum, l) => sum + l.areaM2, 0);

  return {
    projectName,
    lineItems,
    categorySubtotals,
    grandTotalAreaM2,
    totalLines: lineItems.length,
  };
}

// =========================================================
// SUMMARY FROM PROJECT RESULT
// =========================================================

/**
 * Build material requirements from a construction project result.
 * Maps each element's finish type to a material spec.
 *
 * @param result - The project calculation result
 * @param materialMap - Map of finish type → material spec
 * @param wastePercent - Default waste percentage (0–100)
 * @returns Array of material requirements
 */
export function requirementsFromProject(
  result: ConstructionProjectResult,
  materialMap: Map<FinishType, MaterialSpec>,
  wastePercent: number = 10,
): MaterialRequirement[] {
  const requirements: MaterialRequirement[] = [];

  // Use areaByFinishType from the project result
  for (const [finishType, areaM2] of Object.entries(result.areaByFinishType)) {
    const material = materialMap.get(finishType as FinishType);

    if (material && areaM2 > 0) {
      requirements.push({
        material,
        areaM2,
        coats: 1,
        wastePercent,
        source: result.name,
        finishType: finishType as FinishType,
      });
    }
  }

  return requirements;
}

/**
 * Build a complete material summary from a project result.
 */
export function summaryFromProject(
  result: ConstructionProjectResult,
  materialMap: Map<FinishType, MaterialSpec>,
  wastePercent: number = 10,
  alreadyHave: Map<string, number> = new Map(),
): ProjectMaterialSummary {
  const requirements = requirementsFromProject(result, materialMap, wastePercent);
  return buildMaterialSummary(result.name, requirements, alreadyHave);
}

// =========================================================
// SUMMARY FORMATTING
// =========================================================

/**
 * Format the material summary as readable text.
 */
export function materialSummaryToText(summary: ProjectMaterialSummary): string {
  const lines: string[] = [];

  lines.push(`MATERIAL SUMMARY: ${summary.projectName}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`Total area: ${formatM2(summary.grandTotalAreaM2)}`);
  lines.push(`Total line items: ${summary.totalLines}`);
  lines.push('');

  for (const subtotal of summary.categorySubtotals) {
    lines.push(`▸ ${subtotal.category.toUpperCase()}`);
    lines.push(`  Subtotal: ${subtotal.totalPurchaseQuantity} ${subtotal.quantityUnit} (buy: ${subtotal.totalBuyQuantity})`);
    for (const line of subtotal.lines) {
      const brandPart = line.brand ? ` [${line.brand}]` : '';
      lines.push(`  • ${line.materialName}${brandPart} — ${line.purchaseQuantity} ${line.quantityUnit} (have: ${line.alreadyHaveQuantity}, buy: ${line.buyQuantity})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
