import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCurrency,
  classNames,
  feetToMeters,
  metersToFeet,
  calculateScreedingArea,
  calculateScreedingEstimate,
  validateScreedingInput,
} from './utils';
import type { ScreedingCalcInput, ScreedingEstimateInput } from '@/types';

// ─────────────────────────────────────────────────────────
// formatNumber
// ─────────────────────────────────────────────────────────
describe('formatNumber', () => {
  it('formats with default 2 decimal places', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57');
  });

  it('formats with custom decimal places', () => {
    expect(formatNumber(1234.5678, 3)).toBe('1,234.568');
  });

  it('removes trailing zeros (minFractionDigits=0)', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(100.5)).toBe('100.5');
  });

  it('adds thousand separators', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});

// ─────────────────────────────────────────────────────────
// formatCurrency
// ─────────────────────────────────────────────────────────
describe('formatCurrency', () => {
  it('formats with naira symbol by default', () => {
    expect(formatCurrency(25000)).toBe('₦25,000');
  });

  it('formats with custom currency symbol', () => {
    expect(formatCurrency(100, '$')).toBe('$100');
  });

  it('formats large numbers', () => {
    expect(formatCurrency(1000000)).toBe('₦1,000,000');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('₦0');
  });
});

// ─────────────────────────────────────────────────────────
// classNames
// ─────────────────────────────────────────────────────────
describe('classNames', () => {
  it('joins truthy classes', () => {
    expect(classNames('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(classNames('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns empty string for all falsy', () => {
    expect(classNames(false, null, undefined, '')).toBe('');
  });

  it('handles single class', () => {
    expect(classNames('only')).toBe('only');
  });
});

// ─────────────────────────────────────────────────────────
// Unit conversion
// ─────────────────────────────────────────────────────────
describe('feetToMeters', () => {
  it('converts 1 foot to 0.3048 meters', () => {
    expect(feetToMeters(1)).toBe(0.3048);
  });

  it('converts 10 feet to 3.048 meters', () => {
    expect(feetToMeters(10)).toBe(3.048);
  });

  it('handles 0 feet', () => {
    expect(feetToMeters(0)).toBe(0);
  });
});

describe('metersToFeet', () => {
  it('converts 1 meter to ~3.281 feet', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.2808, 3);
  });

  it('round-trips correctly', () => {
    const original = 15;
    const converted = metersToFeet(feetToMeters(original));
    expect(converted).toBeCloseTo(original, 5);
  });
});

// ─────────────────────────────────────────────────────────
// Screeding calculations
// ─────────────────────────────────────────────────────────
describe('calculateScreedingArea', () => {
  it('calculates full room area', () => {
    // 10ft × 12ft × 10ft room → 3.048m × 3.658m × 3.048m
    // Perimeter = 2*(3.048+3.658) = 13.412, × 3.048 = 40.882 m²
    const input: ScreedingCalcInput = {
      method: 'full_room',
      roomLength: 10,
      roomWidth: 12,
      wallHeight: 10,
      wallWidth: 0,
      wallCount: 1,
      doors: 0,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const result = calculateScreedingArea(input);
    expect(result.grossWallArea).toBeCloseTo(40.88, 1);
    expect(result.netScreedingArea).toBeCloseTo(40.88, 1);
  });

  it('deducts door and window areas', () => {
    const input: ScreedingCalcInput = {
      method: 'full_room',
      roomLength: 10,
      roomWidth: 10,
      wallHeight: 10,
      wallWidth: 0,
      wallCount: 1,
      doors: 1,
      doorDims: { width: 0.8, height: 2.1 },
      windows: 1,
      windowDims: { width: 1.0, height: 1.0 },
      unit: 'feet',
    };
    const result = calculateScreedingArea(input);
    // Perimeter = 2*(3.048+3.048)=12.192, ×3.048=37.16
    // Door: 0.8*2.1=1.68, Window: 1.0*1.0=1.0, deduction=2.68
    // Net: 37.16 - 2.68 = 34.48
    expect(result.doorArea).toBeCloseTo(1.68, 2);
    expect(result.windowArea).toBeCloseTo(1.0, 2);
    expect(result.netScreedingArea).toBeGreaterThan(0);
  });

  it('calculates single wall method', () => {
    // 5ft wide wall, 10ft high, 2 walls
    const input: ScreedingCalcInput = {
      method: 'single_wall',
      roomLength: 0,
      roomWidth: 0,
      wallHeight: 10,
      wallWidth: 5,
      wallCount: 2,
      doors: 0,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const result = calculateScreedingArea(input);
    // wallWidth: 1.524m, height: 3.048m, × 2 walls = 9.29 m²
    expect(result.grossWallArea).toBeCloseTo(9.29, 1);
  });

  it('handles full_room with width=0 (two walls only)', () => {
    const input: ScreedingCalcInput = {
      method: 'full_room',
      roomLength: 10,
      roomWidth: 0,
      wallHeight: 10,
      wallWidth: 0,
      wallCount: 1,
      doors: 0,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const result = calculateScreedingArea(input);
    // 2 × 3.048 × 3.048 = 18.58 m²
    expect(result.grossWallArea).toBeCloseTo(18.58, 1);
  });
});

describe('calculateScreedingEstimate', () => {
  it('calculates material and labor costs', () => {
    const input: ScreedingEstimateInput = {
      netScreedingArea: 50,
      coverageRate: 5, // 5 m² per unit
      wasteMargin: 10,
      packageSize: 20,
      packageUnit: 'kg',
      unitPrice: 7500,
      labourRatePerSqm: 500,
      materialName: 'Cement',
      currency: 'NGN',
      currencySymbol: '₦',
    };
    const result = calculateScreedingEstimate(input);
    // Base: 50/5 = 10, waste: 10*1.1 = 11
    // Packages: ceil(11/20) = 1
    // Material: 1 * 7500 = 7500
    // Labour: 50 * 500 = 25000
    // Total: 7500 + 25000 = 32500
    expect(result.materialRequired).toBe(11);
    expect(result.packagesNeeded).toBe(1);
    expect(result.materialCost).toBe(7500);
    expect(result.labourCost).toBe(25000);
    expect(result.total).toBe(32500);
  });

  it('rounds up packages correctly', () => {
    const input: ScreedingEstimateInput = {
      netScreedingArea: 100,
      coverageRate: 5,
      wasteMargin: 0,
      packageSize: 20,
      packageUnit: 'kg',
      unitPrice: 7500,
      labourRatePerSqm: 500,
      materialName: 'Cement',
      currency: 'NGN',
      currencySymbol: '₦',
    };
    // Base: 100/5 = 20, no waste
    // Packages: ceil(20/20) = 1
    const result = calculateScreedingEstimate(input);
    expect(result.packagesNeeded).toBe(1);
  });

  it('returns zeros for invalid input (coverage=0)', () => {
    const input: ScreedingEstimateInput = {
      netScreedingArea: 50,
      coverageRate: 0,
      wasteMargin: 10,
      packageSize: 20,
      packageUnit: 'kg',
      unitPrice: 7500,
      labourRatePerSqm: 500,
      materialName: 'Cement',
      currency: 'NGN',
      currencySymbol: '₦',
    };
    const result = calculateScreedingEstimate(input);
    expect(result.materialRequired).toBe(0);
    expect(result.materialCost).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('validateScreedingInput', () => {
  it('returns no errors for valid full_room input', () => {
    const input: ScreedingCalcInput = {
      method: 'full_room',
      roomLength: 10,
      roomWidth: 12,
      wallHeight: 10,
      wallWidth: 0,
      wallCount: 1,
      doors: 1,
      doorDims: { width: 0.8, height: 2.1 },
      windows: 1,
      windowDims: { width: 1.0, height: 1.0 },
      unit: 'feet',
    };
    expect(Object.keys(validateScreedingInput(input))).toHaveLength(0);
  });

  it('returns error for zero room length in full_room mode', () => {
    const input: ScreedingCalcInput = {
      method: 'full_room',
      roomLength: 0,
      roomWidth: 10,
      wallHeight: 10,
      wallWidth: 0,
      wallCount: 1,
      doors: 0,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const errors = validateScreedingInput(input);
    expect(errors.roomLength).toBeDefined();
  });

  it('returns error for zero wall height', () => {
    const input: ScreedingCalcInput = {
      method: 'full_room',
      roomLength: 10,
      roomWidth: 10,
      wallHeight: 0,
      wallWidth: 0,
      wallCount: 1,
      doors: 0,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const errors = validateScreedingInput(input);
    expect(errors.wallHeight).toBeDefined();
  });

  it('returns error for zero wall width in single_wall mode', () => {
    const input: ScreedingCalcInput = {
      method: 'single_wall',
      roomLength: 0,
      roomWidth: 0,
      wallHeight: 10,
      wallWidth: 0,
      wallCount: 2,
      doors: 0,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const errors = validateScreedingInput(input);
    expect(errors.wallWidth).toBeDefined();
  });

  it('returns error for zero wall count in single_wall mode', () => {
    const input: ScreedingCalcInput = {
      method: 'single_wall',
      roomLength: 0,
      roomWidth: 0,
      wallHeight: 10,
      wallWidth: 5,
      wallCount: 0,
      doors: 0,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const errors = validateScreedingInput(input);
    expect(errors.wallCount).toBeDefined();
  });

  it('returns error for negative doors', () => {
    const input: ScreedingCalcInput = {
      method: 'full_room',
      roomLength: 10,
      roomWidth: 10,
      wallHeight: 10,
      wallWidth: 0,
      wallCount: 1,
      doors: -1,
      doorDims: { width: 0, height: 0 },
      windows: 0,
      windowDims: { width: 0, height: 0 },
      unit: 'feet',
    };
    const errors = validateScreedingInput(input);
    expect(errors.doors).toBeDefined();
  });
});
