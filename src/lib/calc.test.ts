import { describe, it, expect } from 'vitest';
import {
  calculateWallArea,
  calculateCeilingArea,
  calculateDoorArea,
  calculateWindowArea,
  calculatePaintableArea,
  calculatePaintRequired,
  calculateAdjustedPaintRequired,
  recommendContainerCombination,
  recommendPracticalContainers,
  calculatePaint,
  calculatePaintCost,
  calculateMaterialCost,
  calculateLaborCost,
  calculateEstimatedTotal,
  calculateAdvancedEstimate,
  calculateScreedingMix,
} from './calc';
import type { CalculatorInput, CostEstimateInput } from '@/types';

// ─────────────────────────────────────────────────────────
// Wall area
// ─────────────────────────────────────────────────────────
describe('calculateWallArea', () => {
  it('calculates perimeter × height for a room', () => {
    // 6m × 4m room, 3m height → perimeter 20m × 3m = 60 m²
    expect(calculateWallArea(6, 4, 3, 'room')).toBe(60);
  });

  it('calculates two walls when width is 0 (optional field)', () => {
    // 6m length, 0 width, 3m height → 2 × 6 × 3 = 36
    expect(calculateWallArea(6, 0, 3, 'room')).toBe(36);
  });

  it('calculates two walls when width is negative', () => {
    expect(calculateWallArea(5, -1, 3, 'house')).toBe(30);
  });

  it('treats fence as flat surface (length × height)', () => {
    // 10m fence, 2m height → 10 × 2 = 20 m² (width irrelevant)
    expect(calculateWallArea(10, 3, 2, 'fence')).toBe(20);
  });

  it('handles exterior project type', () => {
    // 8m × 5m exterior, 4m height → perimeter 26m × 4m = 104 m²
    expect(calculateWallArea(8, 5, 4, 'exterior')).toBe(104);
  });

  it('returns 0 when height is 0', () => {
    expect(calculateWallArea(5, 4, 0, 'room')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// Ceiling area
// ─────────────────────────────────────────────────────────
describe('calculateCeilingArea', () => {
  it('calculates length × width for room', () => {
    expect(calculateCeilingArea(6, 4, 'room')).toBe(24);
  });

  it('returns 0 for exterior (no ceiling)', () => {
    expect(calculateCeilingArea(6, 4, 'exterior')).toBe(0);
  });

  it('returns 0 for fence (no ceiling)', () => {
    expect(calculateCeilingArea(10, 2, 'fence')).toBe(0);
  });

  it('returns 0 when width is 0', () => {
    expect(calculateCeilingArea(6, 0, 'room')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// Door & window area
// ─────────────────────────────────────────────────────────
describe('calculateDoorArea', () => {
  it('calculates total door area', () => {
    // 2 doors × 0.8m × 2.4m = 3.84 m²
    expect(calculateDoorArea(2)).toBe(3.84);
  });

  it('returns 0 for 0 doors', () => {
    expect(calculateDoorArea(0)).toBe(0);
  });

  it('handles custom dimensions', () => {
    expect(calculateDoorArea(1, { width: 1.0, height: 2.5 })).toBe(2.5);
  });

  it('handles negative count (clamped to 0)', () => {
    expect(calculateDoorArea(-1)).toBe(0);
  });
});

describe('calculateWindowArea', () => {
  it('calculates total window area', () => {
    // 3 windows × 1.2m × 1.2m = 4.32 m²
    expect(calculateWindowArea(3)).toBeCloseTo(4.32, 2);
  });

  it('returns 0 for 0 windows', () => {
    expect(calculateWindowArea(0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// Paintable area
// ─────────────────────────────────────────────────────────
describe('calculatePaintableArea', () => {
  it('subtracts openings from surface', () => {
    // 60 walls + 24 ceiling - 3.84 doors - 4.32 windows = 75.84
    expect(calculatePaintableArea(60, 24, 3.84, 4.32, true)).toBeCloseTo(75.84, 2);
  });

  it('excludes ceiling when includeCeiling is false', () => {
    // 60 - 3.84 - 4.32 = 51.84
    expect(calculatePaintableArea(60, 24, 3.84, 4.32, false)).toBeCloseTo(51.84, 2);
  });

  it('clamps to 0 (never negative)', () => {
    expect(calculatePaintableArea(10, 0, 20, 20, false)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// Paint required
// ─────────────────────────────────────────────────────────
describe('calculatePaintRequired', () => {
  it('calculates liters from area, coats, coverage', () => {
    // 50 m² × 2 coats / 10 m²/L = 10 L
    expect(calculatePaintRequired(50, 2, 10)).toBe(10);
  });

  it('enforces minimum 1 coat', () => {
    // 50 m² × max(1, 0) coats / 10 = 5 L
    expect(calculatePaintRequired(50, 0, 10)).toBe(5);
  });

  it('returns 0 for zero coverage rate', () => {
    expect(calculatePaintRequired(50, 2, 0)).toBe(0);
  });

  it('returns 0 for zero area', () => {
    expect(calculatePaintRequired(0, 2, 10)).toBe(0);
  });
});

describe('calculateAdjustedPaintRequired', () => {
  it('applies waste margin', () => {
    // 10 L × (1 + 0.10) = 11 L
    expect(calculateAdjustedPaintRequired(10, 10)).toBe(11);
  });

  it('handles 0% waste', () => {
    expect(calculateAdjustedPaintRequired(10, 0)).toBe(10);
  });

  it('clamps waste margin to 100%', () => {
    // 10 L × (1 + 1.0) = 20 L (200% would be 30 L but clamped to 100%)
    expect(calculateAdjustedPaintRequired(10, 150)).toBe(20);
  });

  it('handles negative waste (clamped to 0)', () => {
    expect(calculateAdjustedPaintRequired(10, -10)).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────
// Container recommendation
// ─────────────────────────────────────────────────────────
describe('recommendContainerCombination', () => {
  it('recommends largest containers first', () => {
    // 25 L with [1, 4, 20] → 1×20L + 2×4L (but 5 remaining → 1×4L + 1×1L)
    const result = recommendContainerCombination(25, [1, 4, 20]);
    // 25/20 = 1 (remaining 5), 5/4 = 1 (remaining 1), 1/1 = 1
    expect(result).toEqual([
      { size: 20, count: 1 },
      { size: 4, count: 1 },
      { size: 1, count: 1 },
    ]);
  });

  it('returns empty for 0 liters', () => {
    expect(recommendContainerCombination(0, [1, 4, 20])).toEqual([]);
  });

  it('adds smallest container for remainder', () => {
    // 0.5 L → can't fill even 1L, so 1×1L (smallest)
    const result = recommendContainerCombination(0.5, [1, 4, 20]);
    expect(result).toEqual([{ size: 1, count: 1 }]);
  });

  it('uses default container sizes when none provided', () => {
    const result = recommendContainerCombination(20, []);
    expect(result).toEqual([{ size: 20, count: 1 }]);
  });

  it('handles exact fit (no remainder)', () => {
    const result = recommendContainerCombination(8, [4, 20]);
    expect(result).toEqual([{ size: 4, count: 2 }]);
  });
});

// ─────────────────────────────────────────────────────────
// Full paint calculation
// ─────────────────────────────────────────────────────────
describe('calculatePaint', () => {
  const baseInput: CalculatorInput = {
    projectType: 'room',
    length: 6,
    width: 4,
    wallHeight: 3,
    doors: 1,
    doorDims: { width: 0.8, height: 2.4 },
    windows: 1,
    windowDims: { width: 1.2, height: 1.2 },
    coats: 2,
    paintType: 'emulsion',
    unit: 'meters',
    includeCeiling: true,
    wasteMargin: 10,
  };

  it('produces a complete result with all fields', () => {
    const result = calculatePaint(baseInput);
    expect(result).toHaveProperty('wallArea');
    expect(result).toHaveProperty('ceilingArea');
    expect(result).toHaveProperty('paintableArea');
    expect(result).toHaveProperty('paintRequiredLiters');
    expect(result).toHaveProperty('adjustedLiters');
    expect(result).toHaveProperty('recommendedContainers');
    expect(result).toHaveProperty('totalRecommendedLiters');
  });

  it('calculates correctly for a 6×4×3m room with 1 door, 1 window, 2 coats', () => {
    const result = calculatePaint(baseInput);
    // Wall: 2*(6+4)*3 = 60, Ceiling: 6*4 = 24
    // Door: 0.8*2.4 = 1.92, Window: 1.2*1.2 = 1.44
    // Paintable: 60+24-1.92-1.44 = 80.64
    // Paint: 80.64*2/10 = 16.128 L → 10% waste → 17.7408
    expect(result.wallArea).toBe(60);
    expect(result.ceilingArea).toBe(24);
    expect(result.doorArea).toBe(1.92);
    expect(result.windowArea).toBeCloseTo(1.44, 2);
    expect(result.paintableArea).toBeCloseTo(80.64, 2);
    expect(result.paintRequiredLiters).toBeCloseTo(16.13, 1);
    expect(result.adjustedLiters).toBeCloseTo(17.74, 1);
  });

  it('respects custom coverage rate via config', () => {
    const result = calculatePaint(baseInput, { coverageRate: 5 });
    // With 5 m²/L instead of 10, paint required doubles
    expect(result.coverageRate).toBe(5);
    expect(result.paintRequiredLiters).toBeCloseTo(32.26, 1);
  });

  it('handles feet input correctly', () => {
    const feetInput: CalculatorInput = {
      ...baseInput,
      length: 20, // ~6.096m
      width: 13,  // ~3.962m
      wallHeight: 10, // ~3.048m
      unit: 'feet',
    };
    const result = calculatePaint(feetInput);
    // Wall: 2*(6.096+3.962)*3.048 ≈ 61.36 m²
    expect(result.wallArea).toBeCloseTo(61.36, 0);
    expect(result.unit).toBe('feet');
  });

  it('excludes ceiling when includeCeiling is false', () => {
    const result = calculatePaint({ ...baseInput, includeCeiling: false });
    // Paintable = 60 - 1.92 - 1.44 = 56.64 (no ceiling)
    expect(result.paintableArea).toBeCloseTo(56.64, 1);
  });

  it('handles fence project type', () => {
    const fenceInput: CalculatorInput = {
      ...baseInput,
      projectType: 'fence',
      length: 10,
      width: 0,
      wallHeight: 2,
    };
    const result = calculatePaint(fenceInput);
    // Fence: 10 × 2 = 20 m²
    expect(result.wallArea).toBe(20);
    expect(result.ceilingArea).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// Cost calculations
// ─────────────────────────────────────────────────────────
describe('calculatePaintCost', () => {
  it('uses container pricing when enabled', () => {
    const input: CostEstimateInput = {
      paintLiters: 18,
      paintUseContainerPricing: true,
      paintContainerSize: 20,
      paintContainerPrice: 25000,
      paintPricePerLiter: 0,
    } as unknown as CostEstimateInput;
    // ceil(18/20) = 1 container × 25000 = 25000
    expect(calculatePaintCost(input).cost).toBe(25000);
    expect(calculatePaintCost(input).containerCount).toBe(1);
  });

  it('rounds up to full containers', () => {
    const input: CostEstimateInput = {
      paintLiters: 21,
      paintUseContainerPricing: true,
      paintContainerSize: 20,
      paintContainerPrice: 25000,
      paintPricePerLiter: 0,
    } as unknown as CostEstimateInput;
    // ceil(21/20) = 2 containers × 25000 = 50000
    expect(calculatePaintCost(input).cost).toBe(50000);
    expect(calculatePaintCost(input).containerCount).toBe(2);
  });

  it('falls back to per-liter pricing when container pricing disabled', () => {
    const input: CostEstimateInput = {
      paintLiters: 18,
      paintUseContainerPricing: false,
      paintContainerSize: 20,
      paintContainerPrice: 25000,
      paintPricePerLiter: 1500,
    } as unknown as CostEstimateInput;
    // 18 × 1500 = 27000
    expect(calculatePaintCost(input).cost).toBe(27000);
    expect(calculatePaintCost(input).containerCount).toBe(0);
  });
});

describe('calculateMaterialCost', () => {
  const baseMaterials: Pick<CostEstimateInput,
    'includeFiller' | 'fillerCost' | 'includePutty' | 'puttyCost' |
    'includeSandpaper' | 'sandpaperCost' | 'includeBrushes' | 'brushesCost' |
    'includeRollers' | 'rollersCost' | 'includeOther' | 'otherMaterialsCost'
  > = {
    includeFiller: true, fillerCost: 5000,
    includePutty: true, puttyCost: 3000,
    includeSandpaper: false, sandpaperCost: 1000,
    includeBrushes: true, brushesCost: 2000,
    includeRollers: false, rollersCost: 1500,
    includeOther: false, otherMaterialsCost: 500,
  };

  it('sums only included materials', () => {
    const input = baseMaterials as unknown as CostEstimateInput;
    // 5000 + 3000 + 2000 = 10000 (sandpaper, rollers, other excluded)
    expect(calculateMaterialCost(input)).toBe(10000);
  });

  it('returns 0 when all materials excluded', () => {
    const input = {
      includeFiller: false, fillerCost: 0,
      includePutty: false, puttyCost: 0,
      includeSandpaper: false, sandpaperCost: 0,
      includeBrushes: false, brushesCost: 0,
      includeRollers: false, rollersCost: 0,
      includeOther: false, otherMaterialsCost: 0,
    } as unknown as CostEstimateInput;
    expect(calculateMaterialCost(input)).toBe(0);
  });
});

describe('calculateLaborCost', () => {
  it('calculates per-sqm labor', () => {
    const input: CostEstimateInput = {
      laborMode: 'perSqm',
      paintableArea: 80,
      laborRatePerSqm: 500,
      laborTotal: 0,
    } as unknown as CostEstimateInput;
    // 80 × 500 = 40000
    expect(calculateLaborCost(input)).toBe(40000);
  });

  it('uses manual labor total when mode is manual', () => {
    const input: CostEstimateInput = {
      laborMode: 'manual',
      paintableArea: 80,
      laborRatePerSqm: 500,
      laborTotal: 25000,
    } as unknown as CostEstimateInput;
    expect(calculateLaborCost(input)).toBe(25000);
  });
});

describe('calculateEstimatedTotal', () => {
  it('sums all cost components', () => {
    const input: CostEstimateInput = {
      paintableArea: 80,
      paintLiters: 18,
      paintType: 'emulsion',
      paintUseContainerPricing: true,
      paintContainerSize: 20,
      paintContainerPrice: 25000,
      paintPricePerLiter: 0,
      paintProductId: null,
      paintProductName: '',
      includePrimer: true,
      primerLiters: 5,
      primerPricePerLiter: 1200,
      includeFiller: true, fillerCost: 5000,
      includePutty: false, puttyCost: 0,
      includeSandpaper: false, sandpaperCost: 0,
      includeBrushes: true, brushesCost: 2000,
      includeRollers: false, rollersCost: 0,
      includeOther: false, otherMaterialsCost: 0,
      laborMode: 'perSqm',
      laborRatePerSqm: 500,
      laborTotal: 0,
      projectType: 'room',
      coats: 2,
    } as unknown as CostEstimateInput;

    const result = calculateEstimatedTotal(input);
    // Paint: 1 × 25000 = 25000
    // Primer: 5 × 1200 = 6000
    // Materials: 5000 + 2000 = 7000
    // Labor: 80 × 500 = 40000
    // Total: 25000 + 6000 + 7000 + 40000 = 78000
    expect(result.paintCost).toBe(25000);
    expect(result.primerCost).toBe(6000);
    expect(result.fillerCost).toBe(5000);
    expect(result.brushesCost).toBe(2000);
    expect(result.laborCost).toBe(40000);
    expect(result.total).toBe(78000);
  });
});

// =========================================================
// Advanced Calculator Tests — verifies waste is NOT double-counted
// =========================================================

describe('calculateAdvancedEstimate', () => {
  it('should not double-count waste in subtotal and grandTotal', () => {
    const input = {
      netArea: 50,
      thickness: 10,
      coats: 2,
      mixRatio: '1:3',
      paintCoverageRateM2PerL: 5,
      paintBucketSizeL: 20,
      paintPricePerBucket: 25000,
      cementRatioKgPerL: 2,
      cementBagSizeKg: 40,
      cementPricePerBag: 5000,
      labourRatePerSqm: 0,
      transportCost: 5000,
      wastePercentage: 20,
      markupPercentage: 10,
      profitPercentage: 5,
      taxPercentage: 7.5,
      currency: 'NGN',
      currencySymbol: '₦',
    };

    const result = calculateAdvancedEstimate(input);

    // basePaintLiters = (50 × 2 × 1.0) / 5 = 20L
    // paintLiters = 20 × 1.2 = 24L
    // paintBuckets = ceil(24 / 20) = 2
    // paintCost = 2 × 25000 = 50000
    expect(result.paintLiters).toBe(24);
    expect(result.paintBuckets).toBe(2);

    // cementKg = 24 × 2 = 48kg
    // cementBags = ceil(48 / 40) = 2
    // cementCost = 2 × 5000 = 10000
    expect(result.cementKg).toBe(48);
    expect(result.cementBags).toBe(2);

    // materialCost = 50000 + 10000 = 60000 (ALREADY includes waste)
    expect(result.materialCost).toBe(60000);

    // wasteAmount should be informational only:
    // wasteFraction = 0.2, wasteAmount = 60000 × (0.2 / 1.2) = 10000
    expect(result.wasteAmount).toBe(10000);

    // subtotal = materialCost + transportCost = 60000 + 5000 = 65000
    // NOT 65000 + 10000 = 75000 (which would be the double-counting bug)
    // markupAmount = 65000 × 0.10 = 6500
    // profitAmount = (65000 + 6500) × 0.05 = 3575
    // preTax = 65000 + 6500 + 3575 = 75075
    // taxAmount = 75075 × 0.075 = 5630.625 → round = 5630.63
    // grandTotal = 75075 + 5630.63 = 80705.63

    // If the bug existed: subtotal would be 75000, grandTotal would be ~92392
    expect(result.grandTotal).toBeLessThan(90000); // guard against double-counting
    expect(result.grandTotal).toBeCloseTo(80705.63, 1);
  });

  it('should handle zero waste correctly', () => {
    const input = {
      netArea: 50,
      thickness: 10,
      coats: 2,
      mixRatio: '1:3',
      paintCoverageRateM2PerL: 5,
      paintBucketSizeL: 20,
      paintPricePerBucket: 25000,
      cementRatioKgPerL: 2,
      cementBagSizeKg: 40,
      cementPricePerBag: 5000,
      labourRatePerSqm: 0,
      transportCost: 0,
      wastePercentage: 0,
      markupPercentage: 0,
      profitPercentage: 0,
      taxPercentage: 0,
      currency: 'NGN',
      currencySymbol: '₦',
    };

    const result = calculateAdvancedEstimate(input);
    // basePaintLiters = 20L, no waste → 20L
    // buckets = ceil(20/20) = 1
    // paintCost = 25000
    // cementKg = 40, bags = 1, cementCost = 5000
    // materialCost = 30000
    // wasteAmount = 0
    // subtotal = 30000
    expect(result.paintLiters).toBe(20);
    expect(result.paintBuckets).toBe(1);
    expect(result.materialCost).toBe(30000);
    expect(result.wasteAmount).toBe(0);
    expect(result.grandTotal).toBe(30000);
  });

  it('should apply thickness factor for >10mm applications', () => {
    const input = {
      netArea: 50,
      thickness: 15, // 15mm → factor = 1.5
      coats: 2,
      mixRatio: '1:3',
      paintCoverageRateM2PerL: 5,
      paintBucketSizeL: 20,
      paintPricePerBucket: 25000,
      cementRatioKgPerL: 2,
      cementBagSizeKg: 40,
      cementPricePerBag: 5000,
      labourRatePerSqm: 0,
      transportCost: 0,
      wastePercentage: 0,
      markupPercentage: 0,
      profitPercentage: 0,
      taxPercentage: 0,
      currency: 'NGN',
      currencySymbol: '₦',
    };

    const result = calculateAdvancedEstimate(input);
    // basePaintLiters = (50 × 2 × 1.5) / 5 = 30L
    // buckets = ceil(30/20) = 2
    // paintCost = 50000
    expect(result.paintLiters).toBe(30);
    expect(result.paintBuckets).toBe(2);
  });
});

// =========================================================
// Edge case tests for existing calculators
// =========================================================

describe('Edge cases: container recommendation', () => {
  it('should return empty array for 0 liters', () => {
    expect(recommendContainerCombination(0, [20, 4, 1])).toEqual([]);
  });

  it('should return exactly one 20L for exactly 20 liters', () => {
    expect(recommendContainerCombination(20, [20, 4, 1])).toEqual([
      { size: 20, count: 1 },
    ]);
  });

  it('should handle fractional liters by rounding up to smallest', () => {
    const result = recommendContainerCombination(0.5, [20, 4, 1]);
    expect(result).toEqual([{ size: 1, count: 1 }]);
  });

  it('should prefer larger containers when possible', () => {
    const result = recommendContainerCombination(24, [20, 4, 1]);
    // 1 × 20L + 1 × 4L = 24L
    expect(result).toContainEqual({ size: 20, count: 1 });
    expect(result).toContainEqual({ size: 4, count: 1 });
  });
});

describe('Edge cases: screeding mix waste', () => {
  it('should not double-count waste in grandTotal', () => {
    const config = {
      paintCoverageRateM2PerL: 5,
      wastePercentage: 10,
      taxVatPercentage: 0,
      paintBucketSizeL: 20,
      paintPricePerBucket: 25000,
      cementConsumptionRatioKgPerL: 2,
      cementBagSizeKg: 40,
      cementPricePerBag: 5000,
      defaultMixRatio: '1:3',
      labourRatePerSqm: 500,
      currency: 'NGN',
      currencySymbol: '₦',
    };

    const result = calculateScreedingMix(50, config);
    // paintRequired = 50/5 = 10L
    // paintWithWaste = 10 × 1.1 = 11L
    // buckets = ceil(11/20) = 1
    // paintCost = 25000
    // cementKg = 11 × 2 = 22kg
    // cementBags = ceil(22/40) = 1
    // cementCost = 5000
    // materialCost = 30000
    // taxAmount = 0
    // grandTotal = 30000 (NOT 30000 + wasteAllowance)
    expect(result.grandTotal).toBe(30000);
    // wasteAllowance is informational: 30000 × (0.1/1.1) ≈ 2727.27
    expect(result.wasteAmount).toBeCloseTo(2727.27, 0);
  });
});

// ─────────────────────────────────────────────────────────
// Surface condition adjustment
// ─────────────────────────────────────────────────────────
describe('surface condition factors', () => {
  it('reduces coverage for textured surfaces', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      surfaceCondition: 'textured',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    // Textured factor = 0.85 → adjusted coverage = 8.5 m²/L
    expect(result.coverageRate).toBe(8.5);
    expect(result.baseCoverageRate).toBe(10);
    expect(result.surfaceConditionFactor).toBe(0.85);
  });

  it('reduces coverage more for rough surfaces', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      surfaceCondition: 'rough',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    // Rough factor = 0.75 → adjusted coverage = 7.5 m²/L
    expect(result.coverageRate).toBe(7.5);
  });

  it('keeps base coverage for smooth surfaces', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      surfaceCondition: 'smooth',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    expect(result.coverageRate).toBe(10);
    expect(result.baseCoverageRate).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────
// Color condition logic
// ─────────────────────────────────────────────────────────
describe('color condition logic', () => {
  it('enforces minimum 3 coats for dark over light', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      colorCondition: 'dark_over_light',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    // Should bump to 3 coats minimum
    expect(result.coats).toBe(3);
    expect(result.colorWarning).toBeTruthy();
  });

  it('keeps user coats when already above minimum', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 4, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      colorCondition: 'dark_over_light',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    expect(result.coats).toBe(4);
  });

  it('no warning for same/light colour', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      colorCondition: 'same_or_light',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    expect(result.colorWarning).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────
// Primer calculation
// ─────────────────────────────────────────────────────────
describe('primer calculation', () => {
  it('calculates primer when includePrimer is true', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      includePrimer: true,
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    // Primer: area / (10 * 1.3) with 1 coat
    // Wall area = 60, primer coverage = 13
    // primerLiters = 60 / 13 ≈ 4.62
    expect(result.primerLiters).toBeGreaterThan(0);
    expect(result.primerContainers.length).toBeGreaterThan(0);
  });

  it('auto-recommends primer for new plaster', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      surfaceCondition: 'new_plaster',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    expect(result.primerRecommended).toBe(true);
    // includePrimer defaults to primerRecommended when not explicitly set
    expect(result.primerLiters).toBeGreaterThan(0);
  });

  it('no primer when not included', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      includePrimer: false,
      surfaceCondition: 'smooth',
      colorCondition: 'same_or_light',
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    expect(result.primerLiters).toBe(0);
    expect(result.primerContainers).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────
// Practical container recommendation
// ─────────────────────────────────────────────────────────
describe('recommendPracticalContainers', () => {
  it('prefers one 20L bucket over multiple small containers', () => {
    const result = recommendPracticalContainers(19, [1, 4, 20]);
    // 19L → 1 × 20L (practical) instead of 4×4L + 3×1L
    expect(result).toEqual([{ size: 20, count: 1 }]);
  });

  it('uses single smallest when under smallest size', () => {
    const result = recommendPracticalContainers(0.5, [1, 4, 20]);
    expect(result).toEqual([{ size: 1, count: 1 }]);
  });

  it('handles exact multiples', () => {
    const result = recommendPracticalContainers(40, [1, 4, 20]);
    expect(result).toEqual([{ size: 20, count: 2 }]);
  });

  it('returns empty for 0 liters', () => {
    expect(recommendPracticalContainers(0, [1, 4, 20])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────
// Leftover calculation
// ─────────────────────────────────────────────────────────
describe('leftover paint calculation', () => {
  it('calculates leftover from container rounding', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 6, width: 4, wallHeight: 3,
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'meters',
      includeCeiling: false, wasteMargin: 0,
      surfaceCondition: 'smooth',
      colorCondition: 'same_or_light',
      includePrimer: false,
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    if (result.totalRecommendedLiters > result.adjustedLiters) {
      expect(result.leftoverLiters).toBeGreaterThan(0);
      expect(result.leftoverLiters).toBeCloseTo(
        Math.round((result.totalRecommendedLiters - result.adjustedLiters) * 100) / 100, 1
      );
    }
  });
});

// ─────────────────────────────────────────────────────────
// Height warning
// ─────────────────────────────────────────────────────────
describe('height warning', () => {
  it('warns when wall height exceeds 8ft standard', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 12, width: 12, wallHeight: 12, // 12 feet > 8 feet standard
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'feet',
      includeCeiling: false, wasteMargin: 0,
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    expect(result.heightWarning).toBeTruthy();
    expect(result.heightWarning).toContain('FRELUX standard');
  });

  it('no warning for standard height', () => {
    const input: CalculatorInput = {
      projectType: 'room',
      length: 12, width: 12, wallHeight: 8, // 8 feet = standard
      doors: 0, doorDims: { width: 0.8, height: 2.4 },
      windows: 0, windowDims: { width: 1.2, height: 1.2 },
      coats: 2, paintType: 'emulsion', unit: 'feet',
      includeCeiling: false, wasteMargin: 0,
    };
    const result = calculatePaint(input, { coverageRate: 10 });
    expect(result.heightWarning).toBeNull();
  });
});
