import { describe, it, expect } from 'vitest';
import {
  calculatePopCeiling,
  calculatePopEstimate,
  calculateTile,
} from '@/lib/pop-tile-calc';
import type { DbPopMaterial, DbTileMaterial } from '@/types/database';
import type {
  PopCalcInput,
  TileCalcInput,
  PopCalcResult,
  PopEstimateResult,
} from '@/types';

const FT_TO_M = 0.3048;

// =========================================================
// Realistic Nigerian construction mock data (NGN)
// =========================================================

function makePopMaterial(
  overrides: Partial<DbPopMaterial> = {},
): DbPopMaterial {
  return {
    id: 'mat-' + Math.random().toString(36).slice(2),
    workflow: 'nigeria',
    category: 'primary',
    name: 'POP Cement',
    description: null,
    unit: 'bag',
    coverage_rate: 10,
    coverage_unit: 'm²',
    package_size: 1,
    package_unit: 'bag',
    unit_price: 3500,
    labour_rate_per_sqm: 0,
    is_optional: false,
    currency: 'NGN',
    is_active: true,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const popMaterials: DbPopMaterial[] = [
  makePopMaterial({
    id: 'pop-cement',
    category: 'primary',
    name: 'POP Cement',
    coverage_rate: 10, // 1 bag covers 10 m²
    package_size: 1,
    unit_price: 3500,
    sort_order: 1,
  }),
  makePopMaterial({
    id: 'pop-fibre',
    category: 'finishing',
    name: 'Fibre Mesh',
    coverage_rate: 5,
    package_size: 1,
    unit_price: 1500,
    sort_order: 2,
  }),
  makePopMaterial({
    id: 'pop-decorative',
    category: 'decorative',
    name: 'Decorative Cornice',
    coverage_rate: 4,
    package_size: 1,
    unit_price: 5000,
    is_optional: false,
    sort_order: 3,
  }),
  makePopMaterial({
    id: 'pop-optional-light',
    category: 'finishing',
    name: 'LED Light Fitting',
    coverage_rate: 2,
    package_size: 1,
    unit_price: 8000,
    is_optional: true,
    sort_order: 4,
  }),
  makePopMaterial({
    id: 'pop-labour',
    category: 'labour',
    name: 'POP Labour',
    coverage_rate: 0,
    labour_rate_per_sqm: 1500,
    sort_order: 5,
  }),
  // Inactive material — should always be filtered out
  makePopMaterial({
    id: 'pop-inactive',
    category: 'primary',
    name: 'Inactive Material',
    coverage_rate: 10,
    unit_price: 1000,
    is_active: false,
    sort_order: 0,
  }),
  // International workflow material — should be filtered out for nigeria workflow
  makePopMaterial({
    id: 'pop-intl',
    workflow: 'international',
    category: 'primary',
    name: 'International Board',
    coverage_rate: 8,
    unit_price: 6000,
    sort_order: 1,
  }),
];

function makeTileMaterial(
  overrides: Partial<DbTileMaterial> = {},
): DbTileMaterial {
  return {
    id: 'tile-mat-' + Math.random().toString(36).slice(2),
    category: 'tile',
    name: 'Porcelain Tile',
    description: null,
    unit: 'box',
    coverage_rate: 0,
    coverage_unit: 'm²',
    package_size: 1,
    package_unit: 'box',
    unit_price: 0,
    labour_rate_per_sqm: 0,
    currency: 'NGN',
    is_active: true,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const tileMaterials: DbTileMaterial[] = [
  makeTileMaterial({ id: 'tile-porcelain', name: 'Porcelain Tile 600x600' }),
];

const basePopInput: PopCalcInput = {
  workflow: 'nigeria',
  roomLength: 6,
  roomWidth: 4,
  unit: 'meters',
  wasteMargin: 10,
  includeDecorative: true,
  includeOptional: true,
};

const baseTileInput: TileCalcInput = {
  surfaceType: 'floor',
  method: 'adhesive',
  length: 5,
  width: 4,
  height: 3,
  tileWidthMm: 600,
  tileHeightMm: 600,
  tilesPerBox: 4,
  tilePricePerBox: 18000,
  adhesiveCoverageRate: 5, // 1 bag covers 5 m²
  adhesivePricePerBag: 7000,
  cementCoverageRate: 5,
  cementPricePerBag: 4500,
  cementPackageSize: 1,
  sandCoverageRate: 5,
  sandPricePerBag: 3000,
  sandPackageSize: 1,
  groutCoverageRate: 10, // 1 kg covers 10 m²
  groutPricePerKg: 2500,
  spacerCoverageRate: 50,
  spacerPricePerPack: 500,
  spacerPackageSize: 1,
  wasteMargin: 10,
  labourRatePerSqm: 2000,
  unit: 'meters',
};

// =========================================================
// calculatePopCeiling
// =========================================================

describe('calculatePopCeiling', () => {
  it('calculates ceiling area as length * width (meters)', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    // 6m x 4m = 24 m²
    expect(result.ceilingArea).toBeCloseTo(24, 10);
  });

  it('calculates ceiling area for feet input via conversion', () => {
    const input: PopCalcInput = { ...basePopInput, roomLength: 20, roomWidth: 16, unit: 'feet' };
    const result = calculatePopCeiling(input, popMaterials, 'NGN', '₦');
    // 20ft x 16ft = (20*0.3048) * (16*0.3048)
    const expected = (20 * FT_TO_M) * (16 * FT_TO_M);
    expect(result.ceilingArea).toBeCloseTo(expected, 6);
  });

  it('applies waste margin to compute wasteAmount', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    // ceilingArea = 24, wasteMargin = 10% => wasteAmount = 2.4
    expect(result.wasteAmount).toBeCloseTo(2.4, 10);
    // adjusted area = 26.4
    const adjusted = 24 * 1.1;
    expect(result.ceilingArea + result.wasteAmount).toBeCloseTo(adjusted, 10);
  });

  it('filters materials by workflow', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    const names = result.materials.map((m) => m.name);
    expect(names).not.toContain('International Board');
  });

  it('filters out inactive materials', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    const names = result.materials.map((m) => m.name);
    expect(names).not.toContain('Inactive Material');
  });

  it('excludes decorative materials when includeDecorative=false', () => {
    const input: PopCalcInput = { ...basePopInput, includeDecorative: false };
    const result = calculatePopCeiling(input, popMaterials, 'NGN', '₦');
    const names = result.materials.map((m) => m.name);
    expect(names).not.toContain('Decorative Cornice');
    // Decorative material is non-optional; with includeDecorative=true it should appear
    const included = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    expect(included.materials.map((m) => m.name)).toContain('Decorative Cornice');
  });

  it('excludes optional materials when includeOptional=false', () => {
    const input: PopCalcInput = { ...basePopInput, includeOptional: false };
    const result = calculatePopCeiling(input, popMaterials, 'NGN', '₦');
    const names = result.materials.map((m) => m.name);
    expect(names).not.toContain('LED Light Fitting');
  });

  it('includes optional materials when includeOptional=true', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    const names = result.materials.map((m) => m.name);
    expect(names).toContain('LED Light Fitting');
  });

  it('uses labour_rate_per_sqm for labour category materials', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    const labourItem = result.materials.find((m) => m.name === 'POP Labour');
    expect(labourItem).toBeDefined();
    // labour amount = ceilingArea * labourRate = 24 * 1500 = 36000
    expect(labourItem!.cost).toBeCloseTo(24 * 1500, 5);
    expect(labourItem!.quantity).toBeCloseTo(24, 10);
    expect(labourItem!.unit).toBe('m²');
    expect(labourItem!.packagesNeeded).toBe(1);
    // Labour cost totals
    expect(result.labourCost).toBeCloseTo(36000, 5);
  });

  it('uses coverage_rate and package calculations for non-labour materials', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    const cement = result.materials.find((m) => m.name === 'POP Cement');
    expect(cement).toBeDefined();
    // adjustedArea = 24 * 1.1 = 26.4; coverage 10 m²/bag => quantity 2.64
    // packagesNeeded = ceil(2.64 / 1) = 3; cost = 3 * 3500 = 10500
    const adjustedArea = 24 * 1.1;
    const quantity = adjustedArea / 10;
    const packagesNeeded = Math.ceil(quantity / 1);
    expect(cement!.packagesNeeded).toBe(packagesNeeded);
    expect(cement!.cost).toBe(packagesNeeded * 3500);
    expect(cement!.quantity).toBeCloseTo(Math.ceil(quantity * 10) / 10, 10);
  });

  it('handles package_size > 1 correctly for non-labour materials', () => {
    const materials = [
      makePopMaterial({
        id: 'bulk-cement',
        category: 'primary',
        name: 'Bulk POP Cement',
        coverage_rate: 10,
        package_size: 5, // sold in 5-bag packs
        unit_price: 15000,
        sort_order: 1,
      }),
      makePopMaterial({
        id: 'labour',
        category: 'labour',
        name: 'Labour',
        labour_rate_per_sqm: 1000,
        sort_order: 2,
      }),
    ];
    const result = calculatePopCeiling(basePopInput, materials, 'NGN', '₦');
    const bulk = result.materials.find((m) => m.name === 'Bulk POP Cement')!;
    // adjustedArea = 26.4, quantity = 2.64, packagesNeeded = ceil(2.64 / 5) = 1
    expect(bulk.packagesNeeded).toBe(1);
    expect(bulk.cost).toBe(1 * 15000);
  });

  it('sorts materials by sort_order ascending', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    const orders = result.materials.map((m) => {
      const mat = popMaterials.find((mm) => mm.name === m.name);
      return mat ? mat.sort_order : Infinity;
    });
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
    }
  });

  it('computes grandTotal = materialCost + labourCost', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    expect(result.grandTotal).toBeCloseTo(result.materialCost + result.labourCost, 5);
  });

  it('returns currency and currencySymbol as passed', () => {
    const result = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    expect(result.currency).toBe('NGN');
    expect(result.currencySymbol).toBe('₦');
  });

  it('returns no materials when none match workflow', () => {
    const materials: DbPopMaterial[] = [
      makePopMaterial({ workflow: 'international', id: 'intl-only' }),
    ];
    const result = calculatePopCeiling(basePopInput, materials, 'NGN', '₦');
    expect(result.materials).toHaveLength(0);
    expect(result.materialCost).toBe(0);
    expect(result.labourCost).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  it('handles zero waste margin', () => {
    const input: PopCalcInput = { ...basePopInput, wasteMargin: 0 };
    const result = calculatePopCeiling(input, popMaterials, 'NGN', '₦');
    expect(result.wasteAmount).toBe(0);
    expect(result.ceilingArea).toBeCloseTo(24, 10);
  });
});

// =========================================================
// calculatePopEstimate
// =========================================================

describe('calculatePopEstimate', () => {
  it('delegates to calculatePopCeiling and returns identical structure', () => {
    const ceiling = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦');
    const estimate = calculatePopEstimate(basePopInput, popMaterials, 'NGN', '₦');
    expect(estimate).toEqual(ceiling);
  });

  it('returns all fields of PopEstimateResult', () => {
    const estimate = calculatePopEstimate(basePopInput, popMaterials, 'NGN', '₦');
    const keys: (keyof PopEstimateResult)[] = [
      'ceilingArea',
      'materials',
      'materialCost',
      'labourCost',
      'wasteAmount',
      'grandTotal',
      'currency',
      'currencySymbol',
    ];
    for (const key of keys) {
      expect(estimate).toHaveProperty(key);
    }
  });

  it('produces same numeric results as calculatePopCeiling', () => {
    const ceiling = calculatePopCeiling(basePopInput, popMaterials, 'NGN', '₦') as PopCalcResult;
    const estimate = calculatePopEstimate(basePopInput, popMaterials, 'NGN', '₦') as PopEstimateResult;
    expect(estimate.ceilingArea).toBe(ceiling.ceilingArea);
    expect(estimate.grandTotal).toBe(ceiling.grandTotal);
    expect(estimate.materials).toHaveLength(ceiling.materials.length);
  });
});

// =========================================================
// calculateTile
// =========================================================

describe('calculateTile', () => {
  it('calculates floor surface area as length * width', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    // 5m x 4m = 20 m²
    expect(result.surfaceArea).toBeCloseTo(20, 10);
  });

  it('calculates wall surface area as length * height', () => {
    const input: TileCalcInput = { ...baseTileInput, surfaceType: 'wall', length: 4, height: 3 };
    const result = calculateTile(input, tileMaterials, 'NGN', '₦');
    // 4m x 3m = 12 m²
    expect(result.surfaceArea).toBeCloseTo(12, 10);
  });

  it('applies waste margin to compute wasteAmount', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    // surfaceArea = 20, waste 10% => wasteAmount = 2
    expect(result.wasteAmount).toBeCloseTo(2, 10);
  });

  it('computes tile area from mm dimensions (600x600mm = 0.36 m²)', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.tileArea).toBeCloseTo(0.36, 10);
  });

  it('computes tilesNeeded = ceil(adjustedArea / tileArea)', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    // adjustedArea = 20 * 1.1 = 22; tileArea = 0.36 => ceil(22 / 0.36) = ceil(61.11) = 62
    const expected = Math.ceil((20 * 1.1) / 0.36);
    expect(result.tilesNeeded).toBe(expected);
    expect(result.tilesNeeded).toBe(62);
  });

  it('computes boxesNeeded = ceil(tilesNeeded / tilesPerBox)', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    // tilesNeeded = 62, tilesPerBox = 4 => ceil(62/4) = 16
    const expected = Math.ceil(62 / 4);
    expect(result.boxesNeeded).toBe(expected);
    expect(result.boxesNeeded).toBe(16);
  });

  it('computes tileCost = boxesNeeded * tilePricePerBox', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.tileCost).toBe(result.boxesNeeded * baseTileInput.tilePricePerBox);
  });

  it('computes adhesiveNeeded with coverage rate', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    // adjustedArea = 22, coverage 5 m²/bag => 4.4 bags => ceil => 5
    expect(result.adhesiveNeeded).toBe(Math.ceil(22 / 5));
    expect(result.adhesiveNeeded).toBe(5);
  });

  it('computes adhesiveCost = ceil(adhesiveNeeded) * adhesivePricePerBag', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.adhesiveCost).toBe(result.adhesiveNeeded * baseTileInput.adhesivePricePerBag);
  });

  it('computes groutNeeded with coverage rate', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    // adjustedArea = 22, coverage 10 m²/kg => 2.2 kg => ceil => 3
    expect(result.groutNeeded).toBe(Math.ceil(22 / 10));
    expect(result.groutNeeded).toBe(3);
  });

  it('computes groutCost = ceil(groutNeeded) * groutPricePerKg', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.groutCost).toBe(result.groutNeeded * baseTileInput.groutPricePerKg);
  });

  it('computes materialCost = tileCost + adhesiveCost + groutCost', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.materialCost).toBeCloseTo(result.tileCost + result.adhesiveCost + result.cementCost + result.sandCost + result.groutCost + result.spacerCost, 5);
  });

  it('computes labourCost = surfaceArea * labourRatePerSqm', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.labourCost).toBeCloseTo(20 * 2000, 5);
  });

  it('computes grandTotal = materialCost + labourCost', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.grandTotal).toBeCloseTo(result.materialCost + result.labourCost, 5);
  });

  it('returns currency and currencySymbol as passed', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.currency).toBe('NGN');
    expect(result.currencySymbol).toBe('₦');
  });

  // ---- Edge cases ----

  it('edge case: tileArea = 0 returns tilesNeeded = 0', () => {
    const input: TileCalcInput = { ...baseTileInput, tileWidthMm: 0, tileHeightMm: 600 };
    const result = calculateTile(input, tileMaterials, 'NGN', '₦');
    expect(result.tileArea).toBe(0);
    expect(result.tilesNeeded).toBe(0);
    expect(result.boxesNeeded).toBe(0);
  });

  it('edge case: tilesPerBox = 0 returns boxesNeeded = tilesNeeded', () => {
    const input: TileCalcInput = { ...baseTileInput, tilesPerBox: 0 };
    const result = calculateTile(input, tileMaterials, 'NGN', '₦');
    expect(result.boxesNeeded).toBe(result.tilesNeeded);
    expect(result.boxesNeeded).toBe(62);
  });

  it('edge case: adhesiveCoverageRate = 0 returns adhesiveNeeded = 0 and adhesiveCost = 0', () => {
    const input: TileCalcInput = { ...baseTileInput, adhesiveCoverageRate: 0 };
    const result = calculateTile(input, tileMaterials, 'NGN', '₦');
    expect(result.adhesiveNeeded).toBe(0);
    expect(result.adhesiveCost).toBe(0);
  });

  it('edge case: groutCoverageRate = 0 returns groutNeeded = 0 and groutCost = 0', () => {
    const input: TileCalcInput = { ...baseTileInput, groutCoverageRate: 0 };
    const result = calculateTile(input, tileMaterials, 'NGN', '₦');
    expect(result.groutNeeded).toBe(0);
    expect(result.groutCost).toBe(0);
  });

  // ---- Unit conversion ----

  it('converts feet to meters for floor surface', () => {
    const input: TileCalcInput = {
      ...baseTileInput,
      surfaceType: 'floor',
      length: 16.4042, // ~5 meters
      width: 13.1234, // ~4 meters
      unit: 'feet',
    };
    const result = calculateTile(input, tileMaterials, 'NGN', '₦');
    const expected = (16.4042 * FT_TO_M) * (13.1234 * FT_TO_M);
    expect(result.surfaceArea).toBeCloseTo(expected, 4);
  });

  it('converts feet to meters for wall surface', () => {
    const input: TileCalcInput = {
      ...baseTileInput,
      surfaceType: 'wall',
      length: 13.1234, // ~4 meters
      height: 9.8425, // ~3 meters
      width: 0,
      unit: 'feet',
    };
    const result = calculateTile(input, tileMaterials, 'NGN', '₦');
    const expected = (13.1234 * FT_TO_M) * (9.8425 * FT_TO_M);
    expect(result.surfaceArea).toBeCloseTo(expected, 4);
  });

  it('uses meters directly when unit is meters', () => {
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');
    expect(result.surfaceArea).toBeCloseTo(20, 10);
  });

  // ---- Combined realistic Nigerian scenario ----

  it('matches a full hand-computed Nigerian scenario', () => {
    // Floor: 5m x 4m, 600x600 tiles, 4 per box, ₦18,000/box
    // 10% waste, adhesive 5 m²/bag @ ₦7,000, grout 10 m²/kg @ ₦2,500
    // spacers 50 m²/pack @ ₦500, labour ₦2,000/m²
    const result = calculateTile(baseTileInput, tileMaterials, 'NGN', '₦');

    const surfaceArea = 20;
    const adjustedArea = 22;
    const tileArea = 0.36;
    const tilesNeeded = Math.ceil(adjustedArea / tileArea); // 62
    const boxesNeeded = Math.ceil(tilesNeeded / 4); // 16
    const tileCost = boxesNeeded * 18000; // 288,000
    const adhesiveNeeded = Math.ceil(adjustedArea / 5); // 5
    const adhesiveCost = adhesiveNeeded * 7000; // 35,000
    const groutNeeded = Math.ceil(adjustedArea / 10); // 3
    const groutCost = groutNeeded * 2500; // 7,500
    const spacerNeeded = Math.ceil(adjustedArea / 50); // 1
    const spacerCost = spacerNeeded * 500; // 500
    const materialCost = tileCost + adhesiveCost + groutCost + spacerCost; // 331,000
    const labourCost = surfaceArea * 2000; // 40,000
    const grandTotal = materialCost + labourCost; // 371,000

    expect(result.surfaceArea).toBeCloseTo(surfaceArea, 10);
    expect(result.tileArea).toBeCloseTo(tileArea, 10);
    expect(result.tilesNeeded).toBe(tilesNeeded);
    expect(result.boxesNeeded).toBe(boxesNeeded);
    expect(result.tileCost).toBe(tileCost);
    expect(result.adhesiveNeeded).toBe(adhesiveNeeded);
    expect(result.adhesiveCost).toBe(adhesiveCost);
    expect(result.groutNeeded).toBe(groutNeeded);
    expect(result.groutCost).toBe(groutCost);
    expect(result.spacerNeeded).toBe(spacerNeeded);
    expect(result.spacerCost).toBe(spacerCost);
    expect(result.materialCost).toBe(materialCost);
    expect(result.labourCost).toBe(labourCost);
    expect(result.grandTotal).toBe(grandTotal);
  });
});
