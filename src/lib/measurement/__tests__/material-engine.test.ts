/**
 * Tests for the Material Engine (Feature 5 — Material Engine)
 */

import { describe, it, expect } from 'vitest';
import {
  createMaterialSpec,
  calculateMaterialQuantity,
  createMaterialCatalog,
  addMaterialToCatalog,
  findMaterialsByCategory,
  findMaterialsByApplication,
  findMaterialById,
  toMaterialReference,
  MATERIAL_CATEGORY_LABELS,
} from '../material-engine';

describe('Material Creation', () => {
  it('creates a material with defaults', () => {
    const mat = createMaterialSpec();
    expect(mat.id).toBeDefined();
    expect(mat.category).toBe('other');
    expect(mat.productName).toBe('New Material');
    expect(mat.packageSize).toBe(1);
    expect(mat.quantityUnit).toBe('pieces');
    expect(mat.marketCode).toBe('NG');
    expect(mat.currency).toBe('NGN');
    expect(mat.isApproved).toBe(false);
  });

  it('creates a paint material spec', () => {
    const mat = createMaterialSpec({
      category: 'paint',
      productName: 'Premium Emulsion',
      brand: 'Dulux',
      packageSize: 20,
      packageUnit: 'litres',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 35, coats: 2, unit: 'm2' },
      application: 'paint',
      defaultWastePercent: 5,
      isApproved: true,
    });
    expect(mat.category).toBe('paint');
    expect(mat.productName).toBe('Premium Emulsion');
    expect(mat.brand).toBe('Dulux');
    expect(mat.packageSize).toBe(20);
    expect(mat.coverage?.value).toBe(35);
    expect(mat.coverage?.coats).toBe(2);
  });

  it('creates a cement material spec', () => {
    const mat = createMaterialSpec({
      category: 'cement',
      productName: 'Portland Cement',
      brand: 'Lafarge',
      packageSize: 40,
      packageUnit: 'kg',
      quantityUnit: 'bags',
      coverage: { type: 'area', value: 5, unit: 'm2' },
      application: 'screeding',
      isApproved: true,
    });
    expect(mat.category).toBe('cement');
    expect(mat.packageSize).toBe(40);
    expect(mat.quantityUnit).toBe('bags');
  });

  it('creates a tile material spec with configurable coverage', () => {
    const mat = createMaterialSpec({
      category: 'tiles',
      productName: 'Porcelain Tile 600×600',
      brand: 'Eagle',
      packageSize: 1,
      packageUnit: 'carton',
      quantityUnit: 'cartons',
      coverage: { type: 'area', value: 1.44, unit: 'm2' },
      application: 'tiling',
      isApproved: true,
    });
    expect(mat.category).toBe('tiles');
    expect(mat.coverage?.value).toBe(1.44);
  });
});

describe('Material Quantity Calculation', () => {
  it('calculates paint quantity for 100 m² with 2 coats', () => {
    const paint = createMaterialSpec({
      productName: 'Premium Emulsion',
      packageSize: 20,
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 35, coats: 2, unit: 'm2' },
      application: 'paint',
      defaultWastePercent: 5,
    });

    const result = calculateMaterialQuantity(100, paint, 2, 5);

    // Coverage: 35 m² @ 2 coats → effective coverage = 35 m² (already accounts for 2 coats)
    // Base = 100 / 35 = 2.857 buckets
    // With 5% waste = 2.857 × 1.05 = 3.0
    // Rounded up = 3 buckets
    expect(result.baseQuantity).toBeCloseTo(100 / 35, 3);
    expect(result.quantityWithWaste).toBeCloseTo(100 / 35 * 1.05, 3);
    expect(result.purchaseQuantity).toBe(3);
    expect(result.coats).toBe(2);
  });

  it('calculates paint quantity for 50 m² with 1 coat', () => {
    const paint = createMaterialSpec({
      productName: 'Primer',
      packageSize: 4,
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 40, unit: 'm2' },
      application: 'paint',
      defaultWastePercent: 0,
    });

    const result = calculateMaterialQuantity(50, paint, 1, 0);

    // Coverage: 40 m² per coat, 1 coat → effective = 40
    // Base = 50 / 40 = 1.25
    // No waste → 1.25
    // Rounded up = 2
    expect(result.baseQuantity).toBeCloseTo(1.25, 4);
    expect(result.purchaseQuantity).toBe(2);
  });

  it('calculates tile cartons for 30 m²', () => {
    const tiles = createMaterialSpec({
      productName: '600×600 Tile',
      packageSize: 1,
      quantityUnit: 'cartons',
      coverage: { type: 'area', value: 1.44, unit: 'm2' },
      application: 'tiling',
      defaultWastePercent: 10,
    });

    const result = calculateMaterialQuantity(30, tiles, 1, 10);

    // Coverage: 1.44 m² per carton
    // Base = 30 / 1.44 = 20.833
    // With 10% waste = 22.917
    // Rounded up = 23
    expect(result.baseQuantity).toBeCloseTo(20.833, 2);
    expect(result.quantityWithWaste).toBeCloseTo(22.917, 2);
    expect(result.purchaseQuantity).toBe(23);
  });

  it('calculates cement bags for screeding 50 m²', () => {
    const cement = createMaterialSpec({
      productName: 'Portland Cement',
      packageSize: 40,
      quantityUnit: 'bags',
      coverage: { type: 'area', value: 5, unit: 'm2' },
      application: 'screeding',
      defaultWastePercent: 10,
    });

    const result = calculateMaterialQuantity(50, cement, 1, 10);

    // Coverage: 5 m² per bag
    // Base = 50 / 5 = 10
    // With 10% waste = 11
    // Rounded up = 11
    expect(result.baseQuantity).toBe(10);
    expect(result.quantityWithWaste).toBe(11);
    expect(result.purchaseQuantity).toBe(11);
  });

  it('uses material default waste when not overridden', () => {
    const paint = createMaterialSpec({
      productName: 'Test Paint',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 100, unit: 'm2' },
      defaultWastePercent: 15,
    });

    const result = calculateMaterialQuantity(100, paint);
    // Base = 100/100 = 1, with 15% waste = 1.15, rounded up = 2
    expect(result.wastePercent).toBe(15);
    expect(result.purchaseQuantity).toBe(2);
  });

  it('throws for non-area coverage materials', () => {
    const cement = createMaterialSpec({
      productName: 'Volume Cement',
      quantityUnit: 'bags',
      coverage: { type: 'volume', value: 0.5, unit: 'm3' },
    });

    expect(() => calculateMaterialQuantity(100, cement)).toThrow('area-based coverage');
  });

  it('throws for zero coverage', () => {
    const bad = createMaterialSpec({
      productName: 'Bad Material',
      coverage: { type: 'area', value: 0, unit: 'm2' },
    });

    expect(() => calculateMaterialQuantity(100, bad)).toThrow('zero or negative');
  });

  it('produces calculation steps', () => {
    const paint = createMaterialSpec({
      productName: 'Test',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 35, coats: 2, unit: 'm2' },
      defaultWastePercent: 5,
    });

    const result = calculateMaterialQuantity(100, paint, 2, 5);
    expect(result.steps.length).toBeGreaterThanOrEqual(3); // coverage, base, waste, round
    const labels = result.steps.map((s) => s.label);
    expect(labels.some((l) => l.includes('Coverage'))).toBe(true);
    expect(labels.some((l) => l.includes('Base'))).toBe(true);
    expect(labels.some((l) => l.includes('Purchase'))).toBe(true);
  });
});

describe('Material Catalog', () => {
  it('creates a catalog', () => {
    const cat = createMaterialCatalog('NG', 'NGN');
    expect(cat.marketCode).toBe('NG');
    expect(cat.currency).toBe('NGN');
    expect(cat.materials).toEqual([]);
  });

  it('adds materials to catalog', () => {
    let cat = createMaterialCatalog();
    cat = addMaterialToCatalog(cat, createMaterialSpec({ category: 'paint', productName: 'A', isApproved: true }));
    cat = addMaterialToCatalog(cat, createMaterialSpec({ category: 'cement', productName: 'B', isApproved: true }));
    expect(cat.materials.length).toBe(2);
  });

  it('finds materials by category', () => {
    let cat = createMaterialCatalog();
    cat = addMaterialToCatalog(cat, createMaterialSpec({ category: 'paint', productName: 'A', isApproved: true }));
    cat = addMaterialToCatalog(cat, createMaterialSpec({ category: 'paint', productName: 'B', isApproved: true }));
    cat = addMaterialToCatalog(cat, createMaterialSpec({ category: 'cement', productName: 'C', isApproved: true }));
    cat = addMaterialToCatalog(cat, createMaterialSpec({ category: 'paint', productName: 'Unapproved', isApproved: false }));

    const paints = findMaterialsByCategory(cat, 'paint');
    expect(paints.length).toBe(2); // only approved
    expect(paints.every((m) => m.isApproved)).toBe(true);
  });

  it('finds materials by application', () => {
    let cat = createMaterialCatalog();
    cat = addMaterialToCatalog(cat, createMaterialSpec({ application: 'paint', productName: 'A', isApproved: true }));
    cat = addMaterialToCatalog(cat, createMaterialSpec({ application: 'screeding', productName: 'B', isApproved: true }));

    const paintMaterials = findMaterialsByApplication(cat, 'paint');
    expect(paintMaterials.length).toBe(1);
    expect(paintMaterials[0].productName).toBe('A');
  });

  it('finds material by ID', () => {
    let cat = createMaterialCatalog();
    const mat = createMaterialSpec({ productName: 'Test', isApproved: true });
    cat = addMaterialToCatalog(cat, mat);

    const found = findMaterialById(cat, mat.id);
    expect(found).toBeDefined();
    expect(found!.productName).toBe('Test');
  });

  it('creates material reference', () => {
    const mat = createMaterialSpec({
      category: 'paint',
      productName: 'Premium',
      brand: 'Dulux',
      packageSize: 20,
      packageUnit: 'litres',
    });
    const ref = toMaterialReference(mat);
    expect(ref.category).toBe('paint');
    expect(ref.productName).toBe('Premium');
    expect(ref.brand).toBe('Dulux');
    expect(ref.packageSize).toBe(20);
  });
});

describe('Material Category Labels', () => {
  it('has labels for all categories', () => {
    expect(MATERIAL_CATEGORY_LABELS.paint).toBe('Paint');
    expect(MATERIAL_CATEGORY_LABELS.cement).toBe('Cement');
    expect(MATERIAL_CATEGORY_LABELS.tiles).toBe('Tiles');
    expect(MATERIAL_CATEGORY_LABELS.screeding_compound).toBe('Screeding Compound');
    expect(MATERIAL_CATEGORY_LABELS.blocks).toBe('Blocks');
    expect(MATERIAL_CATEGORY_LABELS.other).toBe('Other');
  });
});
