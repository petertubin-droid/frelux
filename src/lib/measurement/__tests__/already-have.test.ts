/**
 * Tests for Already-Have / Purchase Quantity (Feature 11)
 */

import { describe, it, expect } from 'vitest';
import {
  buildQuantityBreakdown,
  createQuantityBreakdown,
  createAlreadyHaveInventory,
  setAlreadyHave,
  getAlreadyHaveQuantity,
  removeAlreadyHave,
  getAlreadyHaveEntries,
  inventoryToMap,
  quantityBreakdownToText,
  QUANTITY_TYPE_LABELS,
} from '../already-have';
import { createMaterialSpec, calculateMaterialQuantity } from '../material-engine';

describe('Quantity Breakdown', () => {
  it('builds breakdown from calculation result', () => {
    const paint = createMaterialSpec({
      productName: 'Test',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 50, unit: 'm2' },
      defaultWastePercent: 10,
    });
    const calcResult = calculateMaterialQuantity(100, paint, 1, 10);
    const breakdown = buildQuantityBreakdown(calcResult);

    // Exact: 100/50 = 2
    // With 10% waste: 2.2
    // Purchase: ⌈2.2⌉ = 3
    expect(breakdown.exactQuantity).toBeCloseTo(2, 4);
    expect(breakdown.quantityWithWaste).toBeCloseTo(2.2, 4);
    expect(breakdown.purchaseQuantity).toBe(3);
    expect(breakdown.alreadyHaveQuantity).toBe(0);
    expect(breakdown.buyQuantity).toBe(3);
    expect(breakdown.hasEnough).toBe(false);
  });

  it('subtracts already-have from purchase', () => {
    const paint = createMaterialSpec({
      productName: 'Test',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 50, unit: 'm2' },
    });
    const calcResult = calculateMaterialQuantity(100, paint, 1, 0);
    const breakdown = buildQuantityBreakdown(calcResult, 1);

    // Exact: 2, waste: 0, purchase: 2, have: 1, buy: 1
    expect(breakdown.purchaseQuantity).toBe(2);
    expect(breakdown.alreadyHaveQuantity).toBe(1);
    expect(breakdown.buyQuantity).toBe(1);
  });

  it('buy quantity is never negative', () => {
    const paint = createMaterialSpec({
      productName: 'Test',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 100, unit: 'm2' },
    });
    const calcResult = calculateMaterialQuantity(50, paint, 1, 0);
    const breakdown = buildQuantityBreakdown(calcResult, 5);

    // Exact: 0.5, purchase: 1, have: 5, buy: max(0, 1-5) = 0
    expect(breakdown.buyQuantity).toBe(0);
    expect(breakdown.hasEnough).toBe(true);
  });

  it('waste is independent of already-have', () => {
    const paint = createMaterialSpec({
      productName: 'Test',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 50, unit: 'm2' },
    });
    const calcResult = calculateMaterialQuantity(100, paint, 1, 10);
    const breakdown = buildQuantityBreakdown(calcResult, 0);

    // Waste is still visible: exact=2, with waste=2.2, purchase=3
    expect(breakdown.wastePercent).toBe(10);
    expect(breakdown.exactQuantity).toBeCloseTo(2, 4);
    expect(breakdown.quantityWithWaste).toBeCloseTo(2.2, 4);
    expect(breakdown.purchaseQuantity).toBe(3);
  });
});

describe('Create Quantity Breakdown from Raw', () => {
  it('creates breakdown without a calculation result', () => {
    const breakdown = createQuantityBreakdown(2.35, 10, 1, 'buckets');
    // Exact: 2.35, waste: 10%, with waste: 2.585, purchase: 3, have: 1, buy: 2
    expect(breakdown.exactQuantity).toBeCloseTo(2.35, 4);
    expect(breakdown.quantityWithWaste).toBeCloseTo(2.585, 3);
    expect(breakdown.purchaseQuantity).toBe(3);
    expect(breakdown.alreadyHaveQuantity).toBe(1);
    expect(breakdown.buyQuantity).toBe(2);
  });

  it('handles zero waste', () => {
    const breakdown = createQuantityBreakdown(5, 0, 0, 'bags');
    expect(breakdown.quantityWithWaste).toBe(5);
    expect(breakdown.purchaseQuantity).toBe(5);
    expect(breakdown.buyQuantity).toBe(5);
  });
});

describe('Already-Have Inventory', () => {
  it('creates an empty inventory', () => {
    const inv = createAlreadyHaveInventory();
    expect(inv.entries.size).toBe(0);
  });

  it('adds entries', () => {
    let inv = createAlreadyHaveInventory();
    inv = setAlreadyHave(inv, 'mat-1', 'Paint', 2, 'buckets');
    inv = setAlreadyHave(inv, 'mat-2', 'Cement', 5, 'bags');
    expect(inv.entries.size).toBe(2);
  });

  it('updates existing entry', () => {
    let inv = createAlreadyHaveInventory();
    inv = setAlreadyHave(inv, 'mat-1', 'Paint', 2, 'buckets');
    inv = setAlreadyHave(inv, 'mat-1', 'Paint', 3, 'buckets');
    expect(getAlreadyHaveQuantity(inv, 'mat-1')).toBe(3);
  });

  it('gets quantity', () => {
    let inv = createAlreadyHaveInventory();
    inv = setAlreadyHave(inv, 'mat-1', 'Paint', 2, 'buckets');
    expect(getAlreadyHaveQuantity(inv, 'mat-1')).toBe(2);
    expect(getAlreadyHaveQuantity(inv, 'nonexistent')).toBe(0);
  });

  it('removes entries', () => {
    let inv = createAlreadyHaveInventory();
    inv = setAlreadyHave(inv, 'mat-1', 'Paint', 2, 'buckets');
    inv = removeAlreadyHave(inv, 'mat-1');
    expect(inv.entries.size).toBe(0);
    expect(getAlreadyHaveQuantity(inv, 'mat-1')).toBe(0);
  });

  it('gets all entries', () => {
    let inv = createAlreadyHaveInventory();
    inv = setAlreadyHave(inv, 'mat-1', 'Paint', 2, 'buckets');
    inv = setAlreadyHave(inv, 'mat-2', 'Cement', 5, 'bags');
    const entries = getAlreadyHaveEntries(inv);
    expect(entries.length).toBe(2);
  });

  it('converts to map for buildMaterialSummary', () => {
    let inv = createAlreadyHaveInventory();
    inv = setAlreadyHave(inv, 'mat-1', 'Paint', 2, 'buckets');
    const map = inventoryToMap(inv);
    expect(map.get('mat-1')).toBe(2);
  });
});

describe('Text Formatting', () => {
  it('formats breakdown as text', () => {
    const breakdown = createQuantityBreakdown(2, 10, 1, 'buckets');
    const text = quantityBreakdownToText(breakdown);
    expect(text).toContain('QUANTITY BREAKDOWN');
    expect(text).toContain('Exact');
    expect(text).toContain('Purchase');
    expect(text).toContain('Already have');
    expect(text).toContain('Buy');
  });

  it('shows "have enough" when buy is 0', () => {
    const breakdown = createQuantityBreakdown(1, 0, 5, 'buckets');
    const text = quantityBreakdownToText(breakdown);
    expect(text).toContain('have enough');
  });
});

describe('Quantity Type Labels', () => {
  it('has labels for all types', () => {
    expect(QUANTITY_TYPE_LABELS.exact).toContain('Exact');
    expect(QUANTITY_TYPE_LABELS.purchase).toContain('Purchase');
    expect(QUANTITY_TYPE_LABELS.already_have).toContain('Already Have');
    expect(QUANTITY_TYPE_LABELS.buy).toContain('Buy');
  });
});
