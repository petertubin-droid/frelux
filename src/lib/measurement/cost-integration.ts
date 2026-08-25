/**
 * FRELUX COST INTEGRATION ENGINE
 *
 * Feature 18: Cost Integration
 *
 * Connects material quantities (from Material Engine, Roof Material Engine)
 * with market prices (from Market Intelligence) to produce cost estimates.
 *
 * Architecture:
 *   MATERIAL QUANTITY (from any engine)
 *     ↓
 *   MARKET PRICE (from Market Intelligence / approved prices)
 *     ↓
 *   LINE ITEM COST = quantity × unit price
 *     ↓
 *   CATEGORY SUBTOTALS
 *     ↓
 *   CONFIDENCE ASSESSMENT (price freshness, source reliability)
 *     ↓
 *   TOTAL PROJECT COST
 *
 * The engine does NOT hardcode prices. All prices come from the
 * Market Intelligence layer or user-provided overrides.
 *
 * The engine tracks:
 *   - Which price source was used
 *   - Price freshness (fresh/recent/stale/expired)
 *   - Price confidence (high/medium/low)
 *   - Whether the price was user-overridden
 *   - Whether material quantity was AI-estimated or user-verified
 *
 * This module is additive — it does not replace existing cost calculations
 * in build-to-roof-engine.ts. It provides a unified interface for
 * cost estimation across all FRELUX calculation engines.
 */

import type { MaterialCalculationResult } from './material-engine';
import type { RoofMaterialResult } from '@/lib/roof/roof-material-engine';
import type { ConfidenceLevel } from './confidence-engine';
import type { MatchConfidence, Freshness } from '@/types/market-intelligence';

// =========================================================
// COST LINE ITEM
// =========================================================

/**
 * Source of the price used in a cost line item.
 */
export type PriceSource = 'market_intelligence' | 'user_override' | 'manual' | 'not_configured';

/**
 * Source of the material quantity.
 */
export type QuantitySource = 'calculated' | 'ai_estimated' | 'user_verified' | 'manual';

/**
 * A single cost line item: material quantity × market price.
 */
export interface CostLineItem {
  /** Unique line ID */
  id: string;
  /** Material name */
  materialName: string;
  /** Material category */
  category: string;
  /** Quantity (purchase quantity) */
  quantity: number;
  /** Quantity unit (bags, sheets, etc.) */
  quantityUnit: string;
  /** Unit price */
  unitPrice: number;
  /** Currency code */
  currency: string;
  /** Line total = quantity × unit price */
  lineTotal: number;
  /** Source of the price */
  priceSource: PriceSource;
  /** Source of the quantity */
  quantitySource: QuantitySource;
  /** Price freshness (if from market intelligence) */
  priceFreshness: Freshness | null;
  /** Price confidence (if from market intelligence) */
  priceConfidence: MatchConfidence | null;
  /** Whether the user overrode the price */
  priceOverridden: boolean;
  /** Whether the price is available */
  hasPrice: boolean;
  /** Explanation of how the cost was derived */
  explanation: string;
}

// =========================================================
// COST CATEGORY
// =========================================================

/**
 * A category subtotal in the cost estimate.
 */
export interface CostCategory {
  /** Category name */
  name: string;
  /** Line items in this category */
  items: CostLineItem[];
  /** Subtotal for this category */
  subtotal: number;
  /** Number of line items */
  itemCount: number;
  /** Whether all items have prices */
  allPriced: boolean;
}

// =========================================================
// COST ESTIMATE RESULT
// =========================================================

/**
 * Complete cost estimate for a project.
 */
export interface CostEstimate {
  /** Line items */
  lineItems: CostLineItem[];
  /** Category subtotals */
  categories: CostCategory[];
  /** Total materials cost */
  materialsTotal: number;
  /** Total labour cost (if provided) */
  labourTotal: number;
  /** Contingency percentage */
  contingencyPercent: number;
  /** Contingency amount */
  contingencyAmount: number;
  /** Grand total (materials + labour + contingency) */
  grandTotal: number;
  /** Currency code */
  currency: string;
  /** Overall confidence level */
  confidence: ConfidenceLevel;
  /** Number of items with prices */
  pricedItemCount: number;
  /** Number of items without prices */
  unpricedItemCount: number;
  /** Number of items with stale prices */
  stalePriceCount: number;
  /** Number of user-overridden prices */
  overriddenPriceCount: number;
  /** Price source breakdown */
  priceSourceBreakdown: Record<PriceSource, number>;
  /** Whether all items are priced */
  allPriced: boolean;
  /** Explanation of the total */
  explanation: string[];
  /** Items that need attention */
  issues: CostIssue[];
}

/**
 * An issue that needs attention in the cost estimate.
 */
export interface CostIssue {
  lineItemId: string;
  materialName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// =========================================================
// PRICE INPUT
// =========================================================

/**
 * A price input for a material.
 * Can come from Market Intelligence or be a user override.
 */
export interface MaterialPriceInput {
  /** Material name (must match the line item) */
  materialName: string;
  /** Category */
  category?: string;
  /** Unit price */
  unitPrice: number;
  /** Currency */
  currency: string;
  /** Source of this price */
  source: PriceSource;
  /** Freshness (if from market intelligence) */
  freshness?: Freshness;
  /** Confidence (if from market intelligence) */
  confidence?: MatchConfidence;
  /** Whether user overrode */
  overridden?: boolean;
}

/**
 * A quantity input from any calculation engine.
 */
export interface MaterialQuantityInput {
  /** Material name */
  materialName: string;
  /** Category */
  category: string;
  /** Purchase quantity */
  quantity: number;
  /** Quantity unit */
  quantityUnit: string;
  /** Source of the quantity */
  quantitySource: QuantitySource;
  /** Material calculation result (if from Material Engine) */
  calculationResult?: MaterialCalculationResult;
}

// =========================================================
// FACTORY
// =========================================================

let costItemIdCounter = 0;

function generateCostItemId(): string {
  return `cost_${++costItemIdCounter}`;
}

// =========================================================
// COST LINE ITEM BUILDER
// =========================================================

/**
 * Build a cost line item from a quantity and a price.
 *
 * If no price is available, the line item is created with hasPrice=false
 * and lineTotal=0. The item appears in the estimate but doesn't contribute
 * to the total.
 */
export function buildCostLineItem(
  quantity: MaterialQuantityInput,
  price: MaterialPriceInput | null,
): CostLineItem {
  if (!price) {
    return {
      id: generateCostItemId(),
      materialName: quantity.materialName,
      category: quantity.category,
      quantity: quantity.quantity,
      quantityUnit: quantity.quantityUnit,
      unitPrice: 0,
      currency: '',
      lineTotal: 0,
      priceSource: 'not_configured',
      quantitySource: quantity.quantitySource,
      priceFreshness: null,
      priceConfidence: null,
      priceOverridden: false,
      hasPrice: false,
      explanation: `${quantity.materialName}: ${quantity.quantity} ${quantity.quantityUnit} — no price configured`,
    };
  }

  const lineTotal = quantity.quantity * price.unitPrice;
  const freshnessLabel = price.freshness ?? null;
  const confidenceLabel = price.confidence ?? null;

  let explanation = `${quantity.materialName}: ${quantity.quantity} ${quantity.quantityUnit} × ${price.unitPrice} ${price.currency}`;
  if (price.source === 'user_override') {
    explanation += ' (user-overridden price)';
  } else if (price.freshness === 'stale' || price.freshness === 'expired') {
    explanation += ` (price is ${price.freshness})`;
  }

  return {
    id: generateCostItemId(),
    materialName: quantity.materialName,
    category: quantity.category,
    quantity: quantity.quantity,
    quantityUnit: quantity.quantityUnit,
    unitPrice: price.unitPrice,
    currency: price.currency,
    lineTotal,
    priceSource: price.source,
    quantitySource: quantity.quantitySource,
    priceFreshness: freshnessLabel,
    priceConfidence: confidenceLabel,
    priceOverridden: price.overridden ?? false,
    hasPrice: true,
    explanation,
  };
}

// =========================================================
// COST ESTIMATE BUILDER
// =========================================================

/**
 * Build a complete cost estimate from quantities and prices.
 *
 * @param quantities - Material quantities from any engine
 * @param prices - Price inputs (market intelligence or user overrides)
 * @param options - Additional options (labour, contingency)
 */
export function buildCostEstimate(
  quantities: MaterialQuantityInput[],
  prices: Map<string, MaterialPriceInput>,
  options?: {
    labourTotal?: number;
    contingencyPercent?: number;
    currency?: string;
  },
): CostEstimate {
  const currency = options?.currency ?? 'NGN';
  const contingencyPercent = options?.contingencyPercent ?? 0;

  // Build line items
  const lineItems: CostLineItem[] = quantities.map((qty) => {
    const price = prices.get(qty.materialName) ?? null;
    return buildCostLineItem(qty, price);
  });

  // Group by category
  const categoryMap = new Map<string, CostLineItem[]>();
  for (const item of lineItems) {
    const cat = item.category || 'Other';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(item);
  }

  const categories: CostCategory[] = [];
  for (const [name, items] of categoryMap) {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    categories.push({
      name,
      items,
      subtotal,
      itemCount: items.length,
      allPriced: items.every((item) => item.hasPrice),
    });
  }

  // Calculate totals
  const materialsTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const labourTotal = options?.labourTotal ?? 0;
  const contingencyAmount = (materialsTotal + labourTotal) * (contingencyPercent / 100);
  const grandTotal = materialsTotal + labourTotal + contingencyAmount;

  // Count items
  const pricedItemCount = lineItems.filter((item) => item.hasPrice).length;
  const unpricedItemCount = lineItems.filter((item) => !item.hasPrice).length;
  const stalePriceCount = lineItems.filter(
    (item) => item.priceFreshness === 'stale' || item.priceFreshness === 'expired'
  ).length;
  const overriddenPriceCount = lineItems.filter((item) => item.priceOverridden).length;

  // Price source breakdown
  const priceSourceBreakdown: Record<PriceSource, number> = {
    market_intelligence: 0,
    user_override: 0,
    manual: 0,
    not_configured: 0,
  };
  for (const item of lineItems) {
    priceSourceBreakdown[item.priceSource]++;
  }

  // Determine overall confidence
  let confidence: ConfidenceLevel;
  if (unpricedItemCount > 0) {
    confidence = 'review_required';
  } else if (stalePriceCount > 0) {
    confidence = 'low';
  } else if (overriddenPriceCount > lineItems.length / 2) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  // Build explanation
  const explanation: string[] = [];
  explanation.push(`Materials total: ${materialsTotal.toFixed(2)} ${currency}`);
  if (labourTotal > 0) {
    explanation.push(`Labour total: ${labourTotal.toFixed(2)} ${currency}`);
  }
  if (contingencyPercent > 0) {
    explanation.push(`Contingency (${contingencyPercent}%): ${contingencyAmount.toFixed(2)} ${currency}`);
  }
  explanation.push(`Grand total: ${grandTotal.toFixed(2)} ${currency}`);
  explanation.push(`Confidence: ${confidence.toUpperCase()}`);
  if (unpricedItemCount > 0) {
    explanation.push(`${unpricedItemCount} item(s) without prices`);
  }
  if (stalePriceCount > 0) {
    explanation.push(`${stalePriceCount} item(s) with stale prices`);
  }

  // Build issues
  const issues: CostIssue[] = [];
  for (const item of lineItems) {
    if (!item.hasPrice) {
      issues.push({
        lineItemId: item.id,
        materialName: item.materialName,
        severity: 'error',
        message: `No price configured for ${item.materialName}`,
      });
    } else if (item.priceFreshness === 'stale' || item.priceFreshness === 'expired') {
      issues.push({
        lineItemId: item.id,
        materialName: item.materialName,
        severity: 'warning',
        message: `Price for ${item.materialName} is ${item.priceFreshness}`,
      });
    }
  }

  return {
    lineItems,
    categories,
    materialsTotal,
    labourTotal,
    contingencyPercent,
    contingencyAmount,
    grandTotal,
    currency,
    confidence,
    pricedItemCount,
    unpricedItemCount,
    stalePriceCount,
    overriddenPriceCount,
    priceSourceBreakdown,
    allPriced: unpricedItemCount === 0,
    explanation,
    issues,
  };
}

// =========================================================
// ROOF MATERIAL → COST INTEGRATION
// =========================================================

/**
 * Convert a RoofMaterialResult into MaterialQuantityInput[]
 * for the cost integration engine.
 */
export function roofMaterialResultToQuantities(
  roofResult: RoofMaterialResult,
): MaterialQuantityInput[] {
  const quantities: MaterialQuantityInput[] = [];

  for (const section of roofResult.sections) {
    if (section.roofingMaterial && section.materialConfigured) {
      quantities.push({
        materialName: `Roofing — ${section.sectionName}`,
        category: 'roofing',
        quantity: section.roofingMaterial.purchaseQuantity,
        quantityUnit: section.roofingMaterial.quantityUnit,
        quantitySource: 'calculated',
      });
    }

    if (section.screwsNeeded) {
      quantities.push({
        materialName: `Roofing screws — ${section.sectionName}`,
        category: 'roofing',
        quantity: section.screwsNeeded,
        quantityUnit: 'pcs',
        quantitySource: 'calculated',
      });
    }

    if (section.ridgeCapQuantity) {
      quantities.push({
        materialName: `Ridge caps — ${section.sectionName}`,
        category: 'roofing',
        quantity: section.ridgeCapQuantity,
        quantityUnit: 'pcs',
        quantitySource: 'calculated',
      });
    }

    if (section.hipCapQuantity) {
      quantities.push({
        materialName: `Hip caps — ${section.sectionName}`,
        category: 'roofing',
        quantity: section.hipCapQuantity,
        quantityUnit: 'pcs',
        quantitySource: 'calculated',
      });
    }

    if (section.fasciaBoardQuantity) {
      quantities.push({
        materialName: `Fascia boards — ${section.sectionName}`,
        category: 'roofing',
        quantity: section.fasciaBoardQuantity,
        quantityUnit: 'pcs',
        quantitySource: 'calculated',
      });
    }
  }

  return quantities;
}

// =========================================================
// MATERIAL ENGINE → COST INTEGRATION
// =========================================================

/**
 * Convert MaterialCalculationResults into MaterialQuantityInput[]
 * for the cost integration engine.
 */
export function materialCalculationsToQuantities(
  results: Array<{
    materialName: string;
    category: string;
    calculation: MaterialCalculationResult;
    quantitySource?: QuantitySource;
  }>,
): MaterialQuantityInput[] {
  return results.map((r) => ({
    materialName: r.materialName,
    category: r.category,
    quantity: r.calculation.purchaseQuantity,
    quantityUnit: r.calculation.quantityUnit,
    quantitySource: r.quantitySource ?? 'calculated',
  }));
}
