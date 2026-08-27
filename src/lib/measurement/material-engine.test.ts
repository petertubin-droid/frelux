import { describe, it, expect } from 'vitest';
import {
  MATERIAL_CATEGORY_LABELS,
  createMaterialSpec,
  calculateMaterialQuantity,
} from './material-engine';

describe('measurement/material-engine', () => {
  it('MATERIAL_CATEGORY_LABELS has entries', () => {
    expect(Object.keys(MATERIAL_CATEGORY_LABELS).length).toBeGreaterThan(0);
  });

  it('createMaterialSpec returns default spec', () => {
    const spec = createMaterialSpec();
    expect(spec.id).toBeTruthy();
    expect(spec.productName).toBe('New Material');
    expect(spec.category).toBe('other');
    expect(spec.packageSize).toBe(1);
    expect(spec.currency).toBe('NGN');
    expect(spec.marketCode).toBe('NG');
    expect(spec.isApproved).toBe(false);
  });

  it('createMaterialSpec accepts partial overrides', () => {
    const spec = createMaterialSpec({
      productName: 'Cement Paint',
      category: 'paint',
      brand: 'Dulux',
      packageSize: 20,
    });
    expect(spec.productName).toBe('Cement Paint');
    expect(spec.category).toBe('paint');
    expect(spec.brand).toBe('Dulux');
    expect(spec.packageSize).toBe(20);
  });

  it('calculateMaterialQuantity calculates area-based coverage', () => {
    const spec = createMaterialSpec({
      productName: 'Test Paint',
      coverage: { type: 'area', value: 35, coats: 1, unit: 'm2' },
      quantityUnit: 'buckets',
    });
    const result = calculateMaterialQuantity(50, spec, 2, 10);
    // area=50, coats=2, coverage=35 per coat => effective = 35/2 = 17.5
    // base = 50/17.5 = 2.857
    // waste 10% => 3.143
    // round up => 4
    expect(result.areaM2).toBe(50);
    expect(result.coats).toBe(2);
    expect(result.purchaseQuantity).toBeGreaterThanOrEqual(3);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('calculateMaterialQuantity throws for non-area coverage', () => {
    const spec = createMaterialSpec({
      productName: 'Nails',
      coverage: { type: 'count', value: 10, unit: 'pieces' },
    });
    expect(() => calculateMaterialQuantity(50, spec)).toThrow('area-based coverage');
  });

  it('calculateMaterialQuantity throws for zero coverage', () => {
    const spec = createMaterialSpec({
      productName: 'Bad Paint',
      coverage: { type: 'area', value: 0, unit: 'm2' },
    });
    expect(() => calculateMaterialQuantity(50, spec)).toThrow('zero or negative');
  });

  it('calculateMaterialQuantity handles coverage already at 2 coats', () => {
    const spec = createMaterialSpec({
      productName: '2-Coat Paint',
      coverage: { type: 'area', value: 35, coats: 2, unit: 'm2' },
      quantityUnit: 'buckets',
    });
    // At 2 coats, effective coverage = 35 (already accounts for 2 coats)
    const result = calculateMaterialQuantity(35, spec, 2, 0);
    // base = 35/35 = 1 => purchase = 1
    expect(result.purchaseQuantity).toBe(1);
  });

  it('calculateMaterialQuantity uses material default waste when not specified', () => {
    const spec = createMaterialSpec({
      productName: 'Default Waste Paint',
      coverage: { type: 'area', value: 35, coats: 1, unit: 'm2' },
      defaultWastePercent: 10,
    });
    const result = calculateMaterialQuantity(35, spec, 1);
    expect(result.wastePercent).toBe(10);
    // base = 35/35 = 1, waste 10% => 1.1, round up => 2
    expect(result.purchaseQuantity).toBe(2);
  });
});
