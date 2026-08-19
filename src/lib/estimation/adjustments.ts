import type { AdjustmentInput } from '@/types/estimation';

/**
 * Creates an AdjustmentInput record for tracking manual modifications to estimate fields or items.
 */
export function createAdjustmentRecord(
  estimateId: string,
  itemId: string | null,
  fieldName: string,
  originalValue: unknown,
  adjustedValue: unknown,
  reason: string
): AdjustmentInput {
  return {
    estimate_id: estimateId,
    item_id: itemId ?? null,
    field_name: fieldName,
    original_value: originalValue,
    adjusted_value: adjustedValue,
    reason: reason,
  };
}

/**
 * Checks if any items in the provided list have manual adjustments (adjustment_status !== 'none').
 */
export function hasAdjustments(
  items: Array<Record<string, unknown> | { adjustment_status?: string }>
): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const status = (item as Record<string, unknown>).adjustment_status;
    return typeof status === 'string' && status !== 'none' && status.trim() !== '';
  });
}

/**
 * Filters and returns only items that have manual adjustments (adjustment_status !== 'none').
 */
export function getAdjustedItems<T extends Record<string, unknown> | { adjustment_status?: string }>(
  items: T[]
): T[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const status = (item as Record<string, unknown>).adjustment_status;
    return typeof status === 'string' && status !== 'none' && status.trim() !== '';
  });
}
