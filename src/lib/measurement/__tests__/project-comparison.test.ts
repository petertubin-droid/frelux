import { describe, it, expect } from 'vitest';
import { compareEstimates, type ComparisonColumn } from '../project-comparison';
import type { CostEstimate } from '../cost-integration';

function makeEstimate(total: number, materials: { name: string; category: string; lineTotal: number }[]): CostEstimate {
  return {
    lineItems: materials.map((m, i) => ({
      id: `item_${i}`,
      materialName: m.name,
      category: m.category,
      quantity: 1, quantityUnit: 'pcs',
      unitPrice: m.lineTotal, currency: 'NGN',
      lineTotal: m.lineTotal,
      priceSource: 'market_intelligence' as const,
      quantitySource: 'calculated' as const,
      priceFreshness: 'fresh' as const,
      priceConfidence: 'high' as const,
      priceOverridden: false,
      hasPrice: true,
      explanation: '',
    })),
    categories: [],
    materialsTotal: materials.reduce((s, m) => s + m.lineTotal, 0),
    labourTotal: 0,
    contingencyPercent: 0,
    contingencyAmount: 0,
    grandTotal: total,
    currency: 'NGN',
    confidence: 'high' as const,
    pricedItemCount: materials.length,
    unpricedItemCount: 0,
    stalePriceCount: 0,
    overriddenPriceCount: 0,
    priceSourceBreakdown: { market_intelligence: materials.length, user_override: 0, manual: 0, not_configured: 0 },
    allPriced: true,
    explanation: [],
    issues: [],
  };
}

describe('Feature 20: Project Comparison', () => {
  it('compares two estimates', () => {
    const colA: ComparisonColumn = { label: 'Option A', estimate: makeEstimate(500000, [
      { name: 'Cement', category: 'foundation', lineTotal: 200000 },
      { name: 'Sand', category: 'foundation', lineTotal: 300000 },
    ]) };
    const colB: ComparisonColumn = { label: 'Option B', estimate: makeEstimate(450000, [
      { name: 'Cement', category: 'foundation', lineTotal: 180000 },
      { name: 'Sand', category: 'foundation', lineTotal: 270000 },
    ]) };

    const result = compareEstimates([colA, colB]);
    expect(result.materialRows).toHaveLength(2);
    expect(result.summary.totalValues).toEqual([500000, 450000]);
    expect(result.summary.cheapestLabel).toBe('Option B');
    expect(result.summary.mostExpensiveLabel).toBe('Option A');
    expect(result.summary.spread).toBe(50000);
  });

  it('computes deltas from first column', () => {
    const colA: ComparisonColumn = { label: 'A', estimate: makeEstimate(100, [{ name: 'X', category: 'c', lineTotal: 100 }]) };
    const colB: ComparisonColumn = { label: 'B', estimate: makeEstimate(80, [{ name: 'X', category: 'c', lineTotal: 80 }]) };

    const result = compareEstimates([colA, colB]);
    expect(result.materialRows[0].deltas).toEqual([0, -20]);
    expect(result.summary.totalDeltas).toEqual([0, -20]);
  });

  it('handles materials present in only one estimate', () => {
    const colA: ComparisonColumn = { label: 'A', estimate: makeEstimate(200, [
      { name: 'X', category: 'c', lineTotal: 200 },
    ]) };
    const colB: ComparisonColumn = { label: 'B', estimate: makeEstimate(150, [
      { name: 'Y', category: 'c', lineTotal: 150 },
    ]) };

    const result = compareEstimates([colA, colB]);
    expect(result.materialRows).toHaveLength(2);
    expect(result.materialRows[0].values).toEqual([200, null]);
    expect(result.materialRows[1].values).toEqual([null, 150]);
  });

  it('handles single column gracefully', () => {
    const colA: ComparisonColumn = { label: 'A', estimate: makeEstimate(100, [{ name: 'X', category: 'c', lineTotal: 100 }]) };
    const result = compareEstimates([colA]);
    expect(result.materialRows).toHaveLength(0);
    expect(result.summary.totalValues).toEqual([100]);
  });
});
