/**
 * FRELUX ALREADY-HAVE / PURCHASE QUANTITY
 *
 * Feature 11 of 16: Already-Have / Purchase Quantity
 *
 * The calculation output must separate:
 * - Calculation-derived quantity (from the math)
 * - Purchase quantity (after waste, rounded up)
 * - Already-have quantity (user on-hand inventory)
 * - Final buy quantity (purchase − already-have)
 *
 * The system must NOT hide waste in the final buy quantity.
 * Waste is calculated independently of already-have.
 *
 * Quantity type:
 * - exact: decimal precision (e.g. 2.35 buckets)
 * - purchase: rounded up whole (e.g. 3 buckets)
 * - already_have: user input
 * - buy: purchase − already_have, minimum 0
 */

import type { MaterialCalculationResult } from './material-engine';
import { roundForDisplay, roundUpToWholeUnit } from './geometry';

// =========================================================
// QUANTITY TYPES
// =========================================================

/**
 * The type of quantity being represented.
 */
export type QuantityType = 'exact' | 'purchase' | 'already_have' | 'buy';

export const QUANTITY_TYPE_LABELS: Record<QuantityType, string> = {
  exact: 'Exact (calculated)',
  purchase: 'Purchase (after waste, rounded up)',
  already_have: 'Already Have (on-hand inventory)',
  buy: 'Buy (purchase − already-have)',
};

/**
 * A complete quantity breakdown.
 * This is the canonical representation of a material quantity
 * with all four levels visible.
 */
export interface QuantityBreakdown {
  /** Exact calculated quantity (before waste, decimal) */
  exactQuantity: number;
  /** Waste percentage applied */
  wastePercent: number;
  /** Quantity after waste (before rounding) */
  quantityWithWaste: number;
  /** Purchase quantity (rounded up to whole unit) */
  purchaseQuantity: number;
  /** Already-have quantity (user-specified on-hand) */
  alreadyHaveQuantity: number;
  /** Final buy quantity (purchase − already-have, minimum 0) */
  buyQuantity: number;
  /** Quantity unit */
  quantityUnit: string;
  /** Whether the user has enough on hand (buy = 0) */
  hasEnough: boolean;
  /** Whether there's surplus after buying (already-have + purchase > needed) */
  surplus: number;
}

// =========================================================
// QUANTITY CALCULATION
// =========================================================

/**
 * Build a complete quantity breakdown from a material calculation result.
 *
 * Waste is calculated independently of already-have:
 *   Exact → +Waste% → Purchase (rounded up) → −Already-Have → Buy
 *
 * The system does NOT hide waste in the buy quantity.
 * All four levels are visible.
 */
export function buildQuantityBreakdown(
  calcResult: MaterialCalculationResult,
  alreadyHaveQuantity: number = 0,
): QuantityBreakdown {
  const purchaseQuantity = calcResult.purchaseQuantity;
  const buyQuantity = Math.max(0, purchaseQuantity - alreadyHaveQuantity);
  const hasEnough = alreadyHaveQuantity >= purchaseQuantity;
  const surplus = Math.max(0, alreadyHaveQuantity - calcResult.baseQuantity);

  return {
    exactQuantity: roundForDisplay(calcResult.baseQuantity, 4),
    wastePercent: calcResult.wastePercent,
    quantityWithWaste: roundForDisplay(calcResult.quantityWithWaste, 4),
    purchaseQuantity,
    alreadyHaveQuantity,
    buyQuantity,
    hasEnough,
    surplus,
    quantityUnit: calcResult.quantityUnit as string,
  };
}

/**
 * Create a quantity breakdown from raw values.
 * This is useful when you don't have a MaterialCalculationResult.
 */
export function createQuantityBreakdown(
  exactQuantity: number,
  wastePercent: number,
  alreadyHaveQuantity: number = 0,
  quantityUnit: string = 'units',
): QuantityBreakdown {
  const quantityWithWaste = exactQuantity * (1 + wastePercent / 100);
  const purchaseQuantity = roundUpToWholeUnit(quantityWithWaste);
  const buyQuantity = Math.max(0, purchaseQuantity - alreadyHaveQuantity);
  const hasEnough = alreadyHaveQuantity >= purchaseQuantity;
  const surplus = Math.max(0, alreadyHaveQuantity - exactQuantity);

  return {
    exactQuantity: roundForDisplay(exactQuantity, 4),
    wastePercent,
    quantityWithWaste: roundForDisplay(quantityWithWaste, 4),
    purchaseQuantity,
    alreadyHaveQuantity,
    buyQuantity,
    hasEnough,
    surplus,
    quantityUnit,
  };
}

// =========================================================
// ALREADY-HAVE INVENTORY
// =========================================================

/**
 * An already-have inventory entry.
 * Tracks what materials the user already has on hand.
 */
export interface AlreadyHaveEntry {
  /** Material ID */
  materialId: string;
  /** Material name */
  materialName: string;
  /** Quantity on hand */
  quantity: number;
  /** Quantity unit */
  quantityUnit: string;
  /** Optional notes */
  notes?: string;
}

/**
 * A collection of already-have inventory entries.
 */
export interface AlreadyHaveInventory {
  entries: Map<string, AlreadyHaveEntry>;
}

/**
 * Create an empty already-have inventory.
 */
export function createAlreadyHaveInventory(): AlreadyHaveInventory {
  return { entries: new Map() };
}

/**
 * Add or update an already-have entry.
 */
export function setAlreadyHave(
  inventory: AlreadyHaveInventory,
  materialId: string,
  materialName: string,
  quantity: number,
  quantityUnit: string,
  notes?: string,
): AlreadyHaveInventory {
  const entries = new Map(inventory.entries);
  entries.set(materialId, {
    materialId,
    materialName,
    quantity,
    quantityUnit,
    notes,
  });
  return { entries };
}

/**
 * Get the already-have quantity for a material.
 */
export function getAlreadyHaveQuantity(
  inventory: AlreadyHaveInventory,
  materialId: string,
): number {
  return inventory.entries.get(materialId)?.quantity ?? 0;
}

/**
 * Remove an already-have entry.
 */
export function removeAlreadyHave(
  inventory: AlreadyHaveInventory,
  materialId: string,
): AlreadyHaveInventory {
  const entries = new Map(inventory.entries);
  entries.delete(materialId);
  return { entries };
}

/**
 * Get all already-have entries as an array.
 */
export function getAlreadyHaveEntries(
  inventory: AlreadyHaveInventory,
): AlreadyHaveEntry[] {
  return Array.from(inventory.entries.values());
}

// =========================================================
// INVENTORY → SUMMARY BRIDGE
// =========================================================

/**
 * Convert an already-have inventory to a Map for use with buildMaterialSummary.
 */
export function inventoryToMap(
  inventory: AlreadyHaveInventory,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const [materialId, entry] of inventory.entries) {
    map.set(materialId, entry.quantity);
  }
  return map;
}

// =========================================================
// FORMATTING
// =========================================================

/**
 * Format a quantity breakdown as readable text.
 */
export function quantityBreakdownToText(breakdown: QuantityBreakdown): string {
  const lines: string[] = [];
  lines.push('QUANTITY BREAKDOWN');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`Exact (calculated): ${breakdown.exactQuantity} ${breakdown.quantityUnit}`);
  if (breakdown.wastePercent > 0) {
    lines.push(`+ Waste (${breakdown.wastePercent}%): ${breakdown.quantityWithWaste} ${breakdown.quantityUnit}`);
  }
  lines.push(`Purchase (rounded up): ${breakdown.purchaseQuantity} ${breakdown.quantityUnit}`);
  lines.push(`Already have: ${breakdown.alreadyHaveQuantity} ${breakdown.quantityUnit}`);
  if (breakdown.hasEnough) {
    lines.push(`✓ You have enough on hand`);
  } else {
    lines.push(`→ Buy: ${breakdown.buyQuantity} ${breakdown.quantityUnit}`);
  }
  if (breakdown.surplus > 0) {
    lines.push(`Surplus: ${breakdown.surplus} ${breakdown.quantityUnit}`);
  }
  return lines.join('\n');
}
