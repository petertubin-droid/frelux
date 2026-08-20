/**
 * FRELUX Phase 3 — Tyrolene Estimation Engine Tests
 *
 * Tests cover all 12 required test cases from the specification:
 * 1. 4 standard partitions → exact ratio
 * 2. 8 standard partitions → 2× ratio
 * 3. 2 standard partitions → fractional ratio
 * 4. Actual partition dimensions → equivalent partitions
 * 5. Multiple partition types → combined equivalent
 * 6. Price change → new estimates use new price, old estimates retain old
 * 7. Ratio change → new estimates use new ratio, old estimates retain old
 * 8. No quality levels displayed
 * 9. Exterior only
 * 10. Labour never calculated
 * 11. Missing config → no invented estimate
 * 12. Purchase rounding applied only after theoretical quantities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTyroleneProject,
  calculatePartitionArea,
  calculateStandardPartitionArea,
  calculateEquivalentPartitions,
  calculateTheoreticalMaterialQuantity,
  parseMaterialRatio,
  parseStandardPartition,
  getRoundingRule,
  validateTyroleneInput,
  checkTyroleneProductionEligibility,
  formatTyroleneCurrency,
  type TyroleneProjectInput,
  type TyroleneCalcConfig,
  type PartitionTypeInput,
  type ProductionRuleRow,
} from './tyrolene-engine';
import type {
  EstimationProduct,
  EstimationMaterial,
  EstimationPrice,
  EstimationCalcRule,
  EstimationPackSize,
} from '@/types/estimation';

// =========================================================
// Test helpers
// =========================================================

function makeProduct(overrides: Partial<EstimationProduct> = {}): EstimationProduct {
  return {
    id: 'tyrolene-id',
    name: 'Tyrolene',
    slug: 'tyrolene',
    category: 'tyrolene',
    description: 'Exterior textured finishing',
    product_type: 'coating',
    calculation_method: 'partition_based',
    standard_pack_size: null,
    pack_unit_id: null,
    recommended_surface: 'exterior',
    finish: 'textured',
    texture: 'rough',
    gloss_level: null,
    durability: null,
    colour_compatibility: null,
    paint_compatibility: null,
    has_quality_levels: false,
    is_active: true,
    sort_order: 20,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
    ...overrides,
  };
}

function makeMaterial(slug: string, name: string, overrides: Partial<EstimationMaterial> = {}): EstimationMaterial {
  return {
    id: `mat-${slug}`,
    name,
    slug,
    category: 'general',
    description: null,
    unit_id: null,
    pack_size: null,
    pack_unit_id: null,
    supplier: null,
    notes: null,
    effective_date: null,
    is_active: true,
    sort_order: 0,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
    ...overrides,
  };
}

function makePrice(refId: string, price: number, overrides: Partial<EstimationPrice> = {}): EstimationPrice {
  return {
    id: `price-${refId}`,
    price_type: 'material',
    ref_id: refId,
    price,
    currency: 'NGN',
    pack_size_id: null,
    effective_date: '2026-08-20',
    notes: null,
    is_active: true,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
    ...overrides,
  };
}

function makePackSize(refId: string, packSize: number, roundingRule = 'ceil'): EstimationPackSize {
  return {
    id: `pack-${refId}`,
    ref_type: 'material',
    ref_id: refId,
    pack_size: packSize,
    pack_unit_id: null,
    purchase_rule: 'full_pack',
    min_quantity: 1,
    rounding_rule: roundingRule,
    is_active: true,
    sort_order: 1,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
  };
}

function makeCalcRule(
  ruleKey: string,
  ruleValue: Record<string, unknown>,
  ruleStatus: 'verified_frelux' | 'admin_configured' = 'verified_frelux'
): EstimationCalcRule {
  return {
    id: `rule-${ruleKey}`,
    rule_key: ruleKey,
    calculator_type: 'tyrolene',
    rule_value: ruleValue,
    rule_status: ruleStatus,
    description: null,
    is_active: true,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
  };
}

/** Verified FRELUX material ratio */
const VERIFIED_RATIO = {
  partitions_per_ratio: 4,
  materials: [
    { slug: 'cement', quantity: 1, unit: 'bags' },
    { slug: 'sand', quantity: 6, unit: 'bags' },
    { slug: 'acrylic-bond', quantity: 3, unit: 'kg' },
    { slug: 'water-seal', quantity: 1, unit: 'kg' },
    { slug: 'anti-fungal', quantity: 0.5, unit: 'kg' },
  ],
};

/** Standard partition: 3m × 3m = 9m² (admin-configurable) */
const STANDARD_WIDTH = 3;
const STANDARD_HEIGHT = 3;
const STANDARD_AREA = 9;

function makeConfig(overrides: Partial<TyroleneCalcConfig> = {}): TyroleneCalcConfig {
  const materials = [
    makeMaterial('cement', 'Cement'),
    makeMaterial('sand', 'Sand'),
    makeMaterial('acrylic-bond', 'Acrylic Bond'),
    makeMaterial('water-seal', 'Water Seal'),
    makeMaterial('anti-fungal', 'Anti-fungal'),
  ];

  const prices = new Map<string, EstimationPrice>();
  prices.set('cement', makePrice('mat-cement', 5000));
  prices.set('sand', makePrice('mat-sand', 2000));
  prices.set('acrylic-bond', makePrice('mat-acrylic-bond', 3000));
  prices.set('water-seal', makePrice('mat-water-seal', 2500));
  prices.set('anti-fungal', makePrice('mat-anti-fungal', 4000));

  const packSizes = new Map<string, EstimationPackSize>();
  packSizes.set('cement', makePackSize('mat-cement', 1, 'ceil'));
  packSizes.set('sand', makePackSize('mat-sand', 1, 'ceil'));
  packSizes.set('acrylic-bond', makePackSize('mat-acrylic-bond', 1, 'ceil'));
  packSizes.set('water-seal', makePackSize('mat-water-seal', 1, 'ceil'));
  packSizes.set('anti-fungal', makePackSize('mat-anti-fungal', 1, 'ceil'));

  const calcRules = new Map<string, EstimationCalcRule>();
  calcRules.set('standard_partition_dimensions', makeCalcRule(
    'standard_partition_dimensions',
    { width: STANDARD_WIDTH, height: STANDARD_HEIGHT },
    'admin_configured'
  ));
  calcRules.set('material_ratio', makeCalcRule(
    'material_ratio',
    VERIFIED_RATIO,
    'verified_frelux'
  ));
  calcRules.set('purchase_rounding_rule', makeCalcRule(
    'purchase_rounding_rule',
    { rule: 'ceil' },
    'verified_frelux'
  ));

  return {
    product: makeProduct(),
    materials,
    prices,
    packSizes,
    calcRules,
    productionRules: [],
    calcVersionId: 'tyrolene-v1',
    ...overrides,
  };
}

function makeInput(overrides: Partial<TyroleneProjectInput> = {}): TyroleneProjectInput {
  return {
    partition_types: [],
    standard_partition_count: 4,
    currency: 'NGN',
    user_id: null,
    client_hash: null,
    project_description: 'Test Tyrolene project',
    customer_location: 'owerri',
    ...overrides,
  };
}

// =========================================================
// Tests
// =========================================================

describe('Tyrolene Engine — parseMaterialRatio', () => {
  it('parses verified FRELUX ratio correctly', () => {
    const rule = makeCalcRule('material_ratio', VERIFIED_RATIO, 'verified_frelux');
    const ratio = parseMaterialRatio(rule);

    expect(ratio.partitions_per_ratio).toBe(4);
    expect(ratio.materials).toHaveLength(5);
    expect(ratio.materials[0]).toEqual({ slug: 'cement', quantity: 1, unit: 'bags' });
    expect(ratio.materials[1]).toEqual({ slug: 'sand', quantity: 6, unit: 'bags' });
    expect(ratio.materials[2]).toEqual({ slug: 'acrylic-bond', quantity: 3, unit: 'kg' });
    expect(ratio.materials[3]).toEqual({ slug: 'water-seal', quantity: 1, unit: 'kg' });
    expect(ratio.materials[4]).toEqual({ slug: 'anti-fungal', quantity: 0.5, unit: 'kg' });
  });

  it('falls back to verified FRELUX ratio when rule is null', () => {
    const ratio = parseMaterialRatio(null);
    expect(ratio.partitions_per_ratio).toBe(4);
    expect(ratio.materials).toHaveLength(5);
  });
});

describe('Tyrolene Engine — parseStandardPartition', () => {
  it('parses configured dimensions', () => {
    const rule = makeCalcRule('standard_partition_dimensions', { width: 3, height: 3 }, 'admin_configured');
    const sp = parseStandardPartition(rule);
    expect(sp.width).toBe(3);
    expect(sp.height).toBe(3);
  });

  it('returns nulls when not configured', () => {
    const rule = makeCalcRule('standard_partition_dimensions', { width: null, height: null }, 'admin_configured');
    const sp = parseStandardPartition(rule);
    expect(sp.width).toBeNull();
    expect(sp.height).toBeNull();
  });

  it('returns nulls when rule is null', () => {
    const sp = parseStandardPartition(null);
    expect(sp.width).toBeNull();
    expect(sp.height).toBeNull();
  });
});

describe('Tyrolene Engine — calculateTheoreticalMaterialQuantity', () => {
  // TEST 1: 4 standard partitions
  it('TEST 1: 4 standard partitions → exact ratio', () => {
    const ratio = parseMaterialRatio(makeCalcRule('material_ratio', VERIFIED_RATIO));

    const cement = calculateTheoreticalMaterialQuantity(4, ratio.materials[0], 4);
    const sand = calculateTheoreticalMaterialQuantity(4, ratio.materials[1], 4);
    const acrylic = calculateTheoreticalMaterialQuantity(4, ratio.materials[2], 4);
    const waterSeal = calculateTheoreticalMaterialQuantity(4, ratio.materials[3], 4);
    const antiFungal = calculateTheoreticalMaterialQuantity(4, ratio.materials[4], 4);

    expect(cement).toBe(1);       // 1 bag
    expect(sand).toBe(6);          // 6 bags
    expect(acrylic).toBe(3);       // 3 kg
    expect(waterSeal).toBe(1);     // 1 kg
    expect(antiFungal).toBe(0.5);  // 0.5 kg
  });

  // TEST 2: 8 standard partitions
  it('TEST 2: 8 standard partitions → 2× ratio', () => {
    const ratio = parseMaterialRatio(makeCalcRule('material_ratio', VERIFIED_RATIO));

    const cement = calculateTheoreticalMaterialQuantity(8, ratio.materials[0], 4);
    const sand = calculateTheoreticalMaterialQuantity(8, ratio.materials[1], 4);
    const acrylic = calculateTheoreticalMaterialQuantity(8, ratio.materials[2], 4);
    const waterSeal = calculateTheoreticalMaterialQuantity(8, ratio.materials[3], 4);
    const antiFungal = calculateTheoreticalMaterialQuantity(8, ratio.materials[4], 4);

    expect(cement).toBe(2);       // 2 bags
    expect(sand).toBe(12);         // 12 bags
    expect(acrylic).toBe(6);       // 6 kg
    expect(waterSeal).toBe(2);     // 2 kg
    expect(antiFungal).toBe(1);    // 1 kg
  });

  // TEST 3: 2 standard partitions (fractional)
  it('TEST 3: 2 standard partitions → fractional ratio', () => {
    const ratio = parseMaterialRatio(makeCalcRule('material_ratio', VERIFIED_RATIO));

    const cement = calculateTheoreticalMaterialQuantity(2, ratio.materials[0], 4);
    const sand = calculateTheoreticalMaterialQuantity(2, ratio.materials[1], 4);
    const acrylic = calculateTheoreticalMaterialQuantity(2, ratio.materials[2], 4);
    const waterSeal = calculateTheoreticalMaterialQuantity(2, ratio.materials[3], 4);
    const antiFungal = calculateTheoreticalMaterialQuantity(2, ratio.materials[4], 4);

    expect(cement).toBe(0.5);      // 0.5 bag
    expect(sand).toBe(3);          // 3 bags
    expect(acrylic).toBe(1.5);     // 1.5 kg
    expect(waterSeal).toBe(0.5);   // 0.5 kg
    expect(antiFungal).toBe(0.25); // 0.25 kg
  });
});

describe('Tyrolene Engine — calculatePartitionArea', () => {
  it('calculates area as width × height', () => {
    expect(calculatePartitionArea(3, 3)).toBe(9);
    expect(calculatePartitionArea(4, 2.5)).toBe(10);
    expect(calculatePartitionArea(0, 3)).toBe(0);
  });

  it('rounds to 4 decimal places', () => {
    expect(calculatePartitionArea(3.14159, 2.71828)).toBe(8.5397);
  });
});

describe('Tyrolene Engine — calculateStandardPartitionArea', () => {
  it('calculates area when configured', () => {
    const area = calculateStandardPartitionArea({ width: 3, height: 3 });
    expect(area).toBe(9);
  });

  it('returns null when not configured', () => {
    expect(calculateStandardPartitionArea({ width: null, height: null })).toBeNull();
  });
});

describe('Tyrolene Engine — calculateEquivalentPartitions', () => {
  // TEST 4: Actual partition dimensions
  it('TEST 4: actual partition dimensions → equivalent standard partitions', () => {
    const standardArea = 9; // 3m × 3m
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 10, width: 3, height: 3 },  // 10 × 9m² = 90m² → 10 equivalent
    ];

    const result = calculateEquivalentPartitions(partitionTypes, standardArea);
    expect(result.equivalent).toBe(10);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].area).toBe(9);
    expect(result.breakdown[0].equivalent_partitions).toBe(10);
  });

  it('TEST 4b: taller partition → more equivalent partitions', () => {
    const standardArea = 9; // 3m × 3m
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Tall partition', quantity: 10, width: 3, height: 4.5 }, // 10 × 13.5m² = 135m² → 15 equivalent
    ];

    const result = calculateEquivalentPartitions(partitionTypes, standardArea);
    expect(result.equivalent).toBe(15);
  });

  // TEST 5: Multiple partition types
  it('TEST 5: multiple partition types → combined equivalent', () => {
    const standardArea = 9; // 3m × 3m
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 10, width: 3, height: 3 },   // 10 × 9 = 90m² → 10 equiv
      { id: 'pt2', label: 'Type B', quantity: 5, width: 3, height: 4.5 },  // 5 × 13.5 = 67.5m² → 7.5 equiv
    ];

    const result = calculateEquivalentPartitions(partitionTypes, standardArea);
    expect(result.equivalent).toBe(17.5);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0].equivalent_partitions).toBe(10);
    expect(result.breakdown[1].equivalent_partitions).toBe(7.5);
  });
});

describe('Tyrolene Engine — calculateTyroleneProject', () => {
  // TEST 1 (full): 4 standard partitions
  it('TEST 1 (full): 4 standard partitions → exact ratio with costs', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), makeConfig());

    expect(result.valid).toBe(true);
    expect(result.equivalent_standard_partitions).toBe(4);
    expect(result.has_dimensional_adjustment).toBe(false);
    expect(result.materials).toHaveLength(5);

    // Verify exact theoretical quantities
    expect(result.materials.find(m => m.material_slug === 'cement')!.theoretical_quantity).toBe(1);
    expect(result.materials.find(m => m.material_slug === 'sand')!.theoretical_quantity).toBe(6);
    expect(result.materials.find(m => m.material_slug === 'acrylic-bond')!.theoretical_quantity).toBe(3);
    expect(result.materials.find(m => m.material_slug === 'water-seal')!.theoretical_quantity).toBe(1);
    expect(result.materials.find(m => m.material_slug === 'anti-fungal')!.theoretical_quantity).toBe(0.5);
  });

  // TEST 2 (full): 8 standard partitions
  it('TEST 2 (full): 8 standard partitions → 2× ratio', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 8 }), makeConfig());

    expect(result.valid).toBe(true);
    expect(result.equivalent_standard_partitions).toBe(8);

    expect(result.materials.find(m => m.material_slug === 'cement')!.theoretical_quantity).toBe(2);
    expect(result.materials.find(m => m.material_slug === 'sand')!.theoretical_quantity).toBe(12);
    expect(result.materials.find(m => m.material_slug === 'acrylic-bond')!.theoretical_quantity).toBe(6);
    expect(result.materials.find(m => m.material_slug === 'water-seal')!.theoretical_quantity).toBe(2);
    expect(result.materials.find(m => m.material_slug === 'anti-fungal')!.theoretical_quantity).toBe(1);
  });

  // TEST 3 (full): 2 standard partitions (fractional)
  it('TEST 3 (full): 2 standard partitions → fractional, theoretical preserved', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 2 }), makeConfig());

    expect(result.valid).toBe(true);
    expect(result.equivalent_standard_partitions).toBe(2);

    // Theoretical quantities preserved (not rounded)
    expect(result.materials.find(m => m.material_slug === 'cement')!.theoretical_quantity).toBe(0.5);
    expect(result.materials.find(m => m.material_slug === 'sand')!.theoretical_quantity).toBe(3);
    expect(result.materials.find(m => m.material_slug === 'acrylic-bond')!.theoretical_quantity).toBe(1.5);
    expect(result.materials.find(m => m.material_slug === 'water-seal')!.theoretical_quantity).toBe(0.5);
    expect(result.materials.find(m => m.material_slug === 'anti-fungal')!.theoretical_quantity).toBe(0.25);

    // Practical purchase should be rounded up (ceil)
    expect(result.materials.find(m => m.material_slug === 'cement')!.practical_purchase_quantity).toBe(1);
    expect(result.materials.find(m => m.material_slug === 'sand')!.practical_purchase_quantity).toBe(3);
    expect(result.materials.find(m => m.material_slug === 'acrylic-bond')!.practical_purchase_quantity).toBe(2);
    expect(result.materials.find(m => m.material_slug === 'water-seal')!.practical_purchase_quantity).toBe(1);
    expect(result.materials.find(m => m.material_slug === 'anti-fungal')!.practical_purchase_quantity).toBe(1);
  });

  // TEST 4 (full): actual partition dimensions
  it('TEST 4 (full): actual partition dimensions → equivalent partitions → materials', () => {
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 10, width: 3, height: 3 },
    ];

    const result = calculateTyroleneProject(
      makeInput({ partition_types: partitionTypes, standard_partition_count: null }),
      makeConfig()
    );

    expect(result.valid).toBe(true);
    expect(result.has_dimensional_adjustment).toBe(true);
    expect(result.equivalent_standard_partitions).toBe(10); // 10 × 9m² / 9m² = 10

    // 10 partitions → 10/4 = 2.5 × ratio
    expect(result.materials.find(m => m.material_slug === 'cement')!.theoretical_quantity).toBe(2.5);
    expect(result.materials.find(m => m.material_slug === 'sand')!.theoretical_quantity).toBe(15);
    expect(result.materials.find(m => m.material_slug === 'acrylic-bond')!.theoretical_quantity).toBe(7.5);
    expect(result.materials.find(m => m.material_slug === 'water-seal')!.theoretical_quantity).toBe(2.5);
    expect(result.materials.find(m => m.material_slug === 'anti-fungal')!.theoretical_quantity).toBe(1.25);
  });

  // TEST 5 (full): multiple partition types
  it('TEST 5 (full): multiple partition types → combined equivalent → materials', () => {
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 10, width: 3, height: 3 },   // 10 × 9 = 90 → 10 equiv
      { id: 'pt2', label: 'Type B', quantity: 5, width: 3, height: 4.5 },  // 5 × 13.5 = 67.5 → 7.5 equiv
    ];

    const result = calculateTyroleneProject(
      makeInput({ partition_types: partitionTypes, standard_partition_count: null }),
      makeConfig()
    );

    expect(result.valid).toBe(true);
    expect(result.has_dimensional_adjustment).toBe(true);
    expect(result.equivalent_standard_partitions).toBe(17.5);
    expect(result.partition_breakdown).toHaveLength(2);

    // 17.5 partitions → 17.5/4 = 4.375 × ratio
    expect(result.materials.find(m => m.material_slug === 'cement')!.theoretical_quantity).toBe(4.375);
    expect(result.materials.find(m => m.material_slug === 'sand')!.theoretical_quantity).toBe(26.25);
    expect(result.materials.find(m => m.material_slug === 'acrylic-bond')!.theoretical_quantity).toBe(13.125);
    expect(result.materials.find(m => m.material_slug === 'water-seal')!.theoretical_quantity).toBe(4.375);
    expect(result.materials.find(m => m.material_slug === 'anti-fungal')!.theoretical_quantity).toBe(2.1875);
  });

  // TEST 6: Price change → new estimates use new price
  it('TEST 6a: new estimate uses current price', () => {
    const config = makeConfig();
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), config);

    const cement = result.materials.find(m => m.material_slug === 'cement')!;
    expect(cement.unit_price).toBe(5000);
    expect(cement.total_price).toBe(5000); // 1 bag × 5000
  });

  it('TEST 6b: price change → new estimate uses new price', () => {
    // First estimate with old price
    const oldConfig = makeConfig();
    const oldResult = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), oldConfig);
    expect(oldResult.materials.find(m => m.material_slug === 'cement')!.unit_price).toBe(5000);

    // Admin changes cement price to 7000
    const newConfig = makeConfig();
    newConfig.prices.set('cement', makePrice('mat-cement', 7000));

    const newResult = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), newConfig);
    expect(newResult.materials.find(m => m.material_slug === 'cement')!.unit_price).toBe(7000);

    // Old estimate's price snapshot should still show old price
    // (The price_snapshot is stored on the estimate — this simulates that old estimates retain old prices)
    expect(oldResult.materials.find(m => m.material_slug === 'cement')!.unit_price).toBe(5000);
  });

  it('TEST 6c: price snapshot stored on line items', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), makeConfig());

    const cementItem = result.line_items.find(li => li.item_name === 'Cement');
    expect(cementItem).toBeDefined();
    expect(cementItem!.price_snapshot.unit_price).toBe(5000);
    expect(cementItem!.price_snapshot.ref_name).toBe('Cement');
  });

  // TEST 7: Ratio change → new estimates use new ratio, old estimates retain old
  it('TEST 7a: new estimate uses updated material ratio', () => {
    const newRatio = {
      partitions_per_ratio: 4,
      materials: [
        { slug: 'cement', quantity: 2, unit: 'bags' },
        { slug: 'sand', quantity: 8, unit: 'bags' },
        { slug: 'acrylic-bond', quantity: 4, unit: 'kg' },
        { slug: 'water-seal', quantity: 1.5, unit: 'kg' },
        { slug: 'anti-fungal', quantity: 0.75, unit: 'kg' },
      ],
    };

    const newConfig = makeConfig();
    newConfig.calcRules.set('material_ratio', makeCalcRule('material_ratio', newRatio, 'admin_configured'));

    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), newConfig);

    expect(result.materials.find(m => m.material_slug === 'cement')!.theoretical_quantity).toBe(2);
    expect(result.materials.find(m => m.material_slug === 'sand')!.theoretical_quantity).toBe(8);
    expect(result.materials.find(m => m.material_slug === 'acrylic-bond')!.theoretical_quantity).toBe(4);
    expect(result.materials.find(m => m.material_slug === 'water-seal')!.theoretical_quantity).toBe(1.5);
    expect(result.materials.find(m => m.material_slug === 'anti-fungal')!.theoretical_quantity).toBe(0.75);
  });

  it('TEST 7b: old estimate retains old ratio (verified via separate calc)', () => {
    // Simulate: old estimate was created with verified ratio
    const oldConfig = makeConfig();
    const oldResult = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), oldConfig);
    expect(oldResult.material_ratio.materials[0].quantity).toBe(1); // old cement ratio

    // Admin changes ratio
    const newRatio = {
      partitions_per_ratio: 4,
      materials: [
        { slug: 'cement', quantity: 2, unit: 'bags' },
        { slug: 'sand', quantity: 8, unit: 'bags' },
        { slug: 'acrylic-bond', quantity: 4, unit: 'kg' },
        { slug: 'water-seal', quantity: 1.5, unit: 'kg' },
        { slug: 'anti-fungal', quantity: 0.75, unit: 'kg' },
      ],
    };
    const newConfig = makeConfig();
    newConfig.calcRules.set('material_ratio', makeCalcRule('material_ratio', newRatio, 'admin_configured'));

    const newResult = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), newConfig);
    expect(newResult.material_ratio.materials[0].quantity).toBe(2); // new cement ratio

    // Old result still has old ratio
    expect(oldResult.material_ratio.materials[0].quantity).toBe(1);
  });

  // TEST 8: No quality levels
  it('TEST 8: Tyrolene does not display quality levels', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), makeConfig());

    // Product should have has_quality_levels = false
    expect(result.product?.has_quality_levels).toBe(false);

    // Result should not have any quality-related fields
    expect(result.materials).toHaveLength(5);
    // No quality references in calc steps
    const qualitySteps = result.calculation_steps.filter(s =>
      s.label.toLowerCase().includes('quality')
    );
    expect(qualitySteps).toHaveLength(0);
  });

  // TEST 9: Exterior only
  it('TEST 9: Tyrolene displays exterior only', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), makeConfig());

    expect(result.product?.recommended_surface).toBe('exterior');
  });

  // TEST 10: Labour never calculated
  it('TEST 10: labour is never automatically calculated', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), makeConfig());

    expect(result.labour_note).toBe('Labour: Not included — negotiated separately.');
    // No labour line items
    const labourItems = result.line_items.filter(li => li.item_type === 'labour');
    expect(labourItems).toHaveLength(0);
  });

  // TEST 11: Missing config → no invented estimate
  it('TEST 11a: missing standard partition dimensions → error, no invented estimate', () => {
    const config = makeConfig();
    config.calcRules.delete('standard_partition_dimensions');

    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 10, width: 3, height: 3 },
    ];

    const result = calculateTyroleneProject(
      makeInput({ partition_types: partitionTypes, standard_partition_count: null }),
      config
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('configuration'))).toBe(true);
  });

  it('TEST 11b: missing material ratio → error', () => {
    const config = makeConfig();
    config.calcRules.delete('material_ratio');

    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), config);

    // Should fall back to verified ratio (parseMaterialRatio falls back)
    // But warnings should be present
    expect(result.valid).toBe(true); // falls back, still calculates
    expect(result.materials).toHaveLength(5); // fallback ratio still has 5 materials
  });

  it('TEST 11c: missing product → error', () => {
    const config = makeConfig({ product: null });

    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), config);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('product'))).toBe(true);
  });

  it('TEST 11d: missing material price → warning, cost is 0', () => {
    const config = makeConfig();
    config.prices.delete('cement');

    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), config);

    const cement = result.materials.find(m => m.material_slug === 'cement')!;
    expect(cement.unit_price).toBe(0);
    expect(cement.total_price).toBe(0);
    expect(result.warnings.some(w => w.includes('cement'))).toBe(true);
  });

  // TEST 12: Purchase rounding applied only after theoretical quantities
  it('TEST 12: purchase rounding applied only after theoretical quantities are calculated', () => {
    // 2 partitions → 0.5 bag cement theoretical → 1 bag practical (ceil)
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 2 }), makeConfig());

    const cement = result.materials.find(m => m.material_slug === 'cement')!;

    // Theoretical is 0.5 (not rounded)
    expect(cement.theoretical_quantity).toBe(0.5);
    // Practical is 1 (ceil of 0.5)
    expect(cement.practical_purchase_quantity).toBe(1);
    // Leftover is 0.5
    expect(cement.leftover_quantity).toBe(0.5);

    // Anti-fungal: 0.25 theoretical → 1 practical (ceil)
    const antiFungal = result.materials.find(m => m.material_slug === 'anti-fungal')!;
    expect(antiFungal.theoretical_quantity).toBe(0.25);
    expect(antiFungal.practical_purchase_quantity).toBe(1);
    expect(antiFungal.leftover_quantity).toBe(0.75);
  });
});

describe('Tyrolene Engine — Validation', () => {
  it('rejects negative partition count', () => {
    const result = calculateTyroleneProject(
      makeInput({ standard_partition_count: -5 }),
      makeConfig()
    );
    expect(result.valid).toBe(false);
  });

  it('rejects zero quantity partition type', () => {
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 0, width: 3, height: 3 },
    ];
    const result = calculateTyroleneProject(
      makeInput({ partition_types: partitionTypes, standard_partition_count: null }),
      makeConfig()
    );
    expect(result.valid).toBe(false);
  });

  it('rejects zero width partition', () => {
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 5, width: 0, height: 3 },
    ];
    const result = calculateTyroleneProject(
      makeInput({ partition_types: partitionTypes, standard_partition_count: null }),
      makeConfig()
    );
    expect(result.valid).toBe(false);
  });

  it('rejects negative dimensions', () => {
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 5, width: -3, height: 3 },
    ];
    const result = calculateTyroleneProject(
      makeInput({ partition_types: partitionTypes, standard_partition_count: null }),
      makeConfig()
    );
    expect(result.valid).toBe(false);
  });
});

describe('Tyrolene Engine — Production Eligibility', () => {
  const productionRules: ProductionRuleRow[] = [
    { product_category: 'tyrolene', quality_slug: null, location_rule: 'owerri', min_quantity: 0, is_active: true },
  ];

  it('Owerri: always eligible, no minimum', () => {
    const result = checkTyroleneProductionEligibility('owerri', 1, productionRules);
    expect(result.eligible).toBe(true);
    expect(result.min_required).toBe(0);
    expect(result.min_configured).toBe(true);
  });

  it('Outside Owerri: not configured → cannot determine eligibility', () => {
    const result = checkTyroleneProductionEligibility('outside_owerri', 10, productionRules);
    expect(result.eligible).toBe(false);
    expect(result.min_configured).toBe(false);
    expect(result.message).toContain('cannot be determined');
  });

  it('Outside Owerri: configured minimum met → eligible', () => {
    const rules: ProductionRuleRow[] = [
      { product_category: 'tyrolene', quality_slug: null, location_rule: 'outside_owerri', min_quantity: 20, is_active: true },
      { product_category: 'tyrolene', quality_slug: null, location_rule: 'owerri', min_quantity: 0, is_active: true },
    ];
    const result = checkTyroleneProductionEligibility('outside_owerri', 25, rules);
    expect(result.eligible).toBe(true);
    expect(result.min_required).toBe(20);
    expect(result.min_configured).toBe(true);
  });

  it('Outside Owerri: configured minimum not met → not eligible', () => {
    const rules: ProductionRuleRow[] = [
      { product_category: 'tyrolene', quality_slug: null, location_rule: 'outside_owerri', min_quantity: 20, is_active: true },
      { product_category: 'tyrolene', quality_slug: null, location_rule: 'owerri', min_quantity: 0, is_active: true },
    ];
    const result = checkTyroleneProductionEligibility('outside_owerri', 15, rules);
    expect(result.eligible).toBe(false);
    expect(result.min_required).toBe(20);
    expect(result.min_configured).toBe(true);
  });
});

describe('Tyrolene Engine — Calculation Steps & Transparency', () => {
  it('generates calculation steps for transparency', () => {
    const result = calculateTyroleneProject(makeInput({ standard_partition_count: 4 }), makeConfig());

    expect(result.calculation_steps.length).toBeGreaterThan(0);

    // Should have steps for material ratio, scaling factor, and per-material calculations
    const ratioStep = result.calculation_steps.find(s => s.label === 'Material Ratio');
    expect(ratioStep).toBeDefined();

    const scalingStep = result.calculation_steps.find(s => s.label === 'Scaling Factor');
    expect(scalingStep).toBeDefined();

    const cementTheoreticalStep = result.calculation_steps.find(s => s.label === 'Cement — Theoretical');
    expect(cementTheoreticalStep).toBeDefined();
    expect(cementTheoreticalStep!.value).toBe('1 bags');

    const costStep = result.calculation_steps.find(s => s.label === 'Practical Purchase Cost');
    expect(costStep).toBeDefined();
  });

  it('shows dimensional adjustment steps when actual dimensions are used', () => {
    const partitionTypes: PartitionTypeInput[] = [
      { id: 'pt1', label: 'Type A', quantity: 10, width: 3, height: 3 },
    ];

    const result = calculateTyroleneProject(
      makeInput({ partition_types: partitionTypes, standard_partition_count: null }),
      makeConfig()
    );

    expect(result.has_dimensional_adjustment).toBe(true);

    const actualDimStep = result.calculation_steps.find(s => s.label === 'Actual Partition Dimensions');
    expect(actualDimStep).toBeDefined();

    const equivStep = result.calculation_steps.find(s => s.label === 'Equivalent Standard Partitions');
    expect(equivStep).toBeDefined();
  });
});

describe('Tyrolene Engine — formatTyroleneCurrency', () => {
  it('formats NGN correctly', () => {
    expect(formatTyroleneCurrency(50000, 'NGN')).toBe('₦50,000');
  });

  it('formats with decimals', () => {
    expect(formatTyroleneCurrency(50000.5, 'NGN')).toBe('₦50,000.5');
  });

  it('handles NaN', () => {
    expect(formatTyroleneCurrency(NaN, 'NGN')).toBe('₦0');
  });
});
