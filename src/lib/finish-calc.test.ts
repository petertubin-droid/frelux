import { describe, it, expect } from 'vitest';
import {
  calculateFinish,
  getDefaultCoats,
  getFinishTypeLabel,
  getFinishTypeDescription,
  round,
  type FinishCalcInput,
  type FinishMaterialConfig,
} from './finish-calc';

describe('round helper', () => {
  it('rounds numbers to specified decimal places (default 2)', () => {
    expect(round(66.666666)).toBe(66.67);
    expect(round(10.1234, 2)).toBe(10.12);
    expect(round(10.125, 2)).toBe(10.13);
  });

  it('handles custom decimal precision', () => {
    expect(round(10.12345, 3)).toBe(10.123);
    expect(round(10.12345, 1)).toBe(10.1);
    expect(round(10.12345, 0)).toBe(10);
  });

  it('handles zero and non-finite numbers', () => {
    expect(round(0)).toBe(0);
    expect(round(NaN)).toBe(0);
    expect(round(Infinity)).toBe(0);
    expect(round(-Infinity)).toBe(0);
  });
});

describe('getDefaultCoats', () => {
  it('returns correct default coats for each finish type', () => {
    expect(getDefaultCoats('painting')).toBe(2);
    expect(getDefaultCoats('tyrolene')).toBe(2);
    expect(getDefaultCoats('grafitex')).toBe(1); // Grafitex is single-coat
  });
});

describe('getFinishTypeLabel', () => {
  it('returns correct display labels for each finish type', () => {
    expect(getFinishTypeLabel('painting')).toBe('Painting');
    expect(getFinishTypeLabel('tyrolene')).toBe('Tyrolene');
    expect(getFinishTypeLabel('grafitex')).toBe('Grafitex');
  });
});

describe('getFinishTypeDescription', () => {
  it('returns non-empty descriptions for each finish type', () => {
    expect(getFinishTypeDescription('painting')).toBeTruthy();
    expect(getFinishTypeDescription('tyrolene')).toBeTruthy();
    expect(getFinishTypeDescription('grafitex')).toBeTruthy();
  });
});

describe('calculateFinish — Painting', () => {
  const paintMaterial: FinishMaterialConfig = {
    id: 'paint-1',
    name: 'Paint',
    finishType: 'painting',
    coverageRate: 10,
    coverageUnit: 'L',
    packageSize: 20,
    packageUnit: 'L',
    unitPrice: 15000,
    defaultCoats: 2,
    isBase: true,
    isFinishing: false,
    isActive: true,
    sortOrder: 0,
  };

  it('calculates quantities, packages, and cost correctly', () => {
    const input: FinishCalcInput = {
      finishType: 'painting',
      area: 100,
      coats: 2,
      wasteMargin: 10,
      materials: [paintMaterial],
    };

    const result = calculateFinish(input);

    expect(result.finishType).toBe('painting');
    expect(result.area).toBe(100);
    expect(result.coats).toBe(2);
    expect(result.wasteMargin).toBe(10);
    expect(result.materials).toHaveLength(1);

    const mat = result.materials[0];
    // quantityRequired = (100 × 2) / 10 = 20 L
    expect(mat.quantityRequired).toBe(20);
    // quantityWithWaste = 20 × 1.1 = 22 L
    expect(mat.quantityWithWaste).toBe(22);
    // packagesNeeded = ceil(22 / 20) = 2
    expect(mat.packagesNeeded).toBe(2);
    // cost = 2 × 15000 = 30000
    expect(mat.cost).toBe(30000);

    expect(result.materialCost).toBe(30000);
    // LABOUR IS NOT CALCULATED
    expect(result.totalCost).toBe(30000);
    expect(result.labourNote).toBe('Labour: Not included, negotiated separately.');
  });

  it('uses default coats when coats parameter is omitted', () => {
    const input: FinishCalcInput = {
      finishType: 'painting',
      area: 100,
      wasteMargin: 10,
      materials: [paintMaterial],
    };

    const result = calculateFinish(input);
    expect(result.coats).toBe(2);
    expect(result.materials[0].quantityRequired).toBe(20);
  });
});

describe('calculateFinish — Grafitex (partition-based)', () => {
  it('calculates bucket requirements from partition count', () => {
    const input: FinishCalcInput = {
      finishType: 'grafitex',
      area: 0,
      coats: 1,
      wasteMargin: 0,
      grafitexBucketPrice: 20000,
      grafitexPartitionsPerBucket: 2, // FRELUX rule
      standardPartitionArea: 9, // 3m × 3m
      standardPartitionCount: 4,
    };

    const result = calculateFinish(input);

    expect(result.finishType).toBe('grafitex');
    expect(result.grafitexEquivalentPartitions).toBe(4);
    // Theoretical: 4 / 2 = 2 buckets
    expect(result.grafitexBucketsTheoretical).toBe(2);
    // Practical: ceil(2) = 2 buckets
    expect(result.grafitexBucketsPractical).toBe(2);
    // Cost: 2 × 20000 = 40000
    expect(result.materialCost).toBe(40000);
    expect(result.totalCost).toBe(40000);
    expect(result.labourNote).toBe('Labour: Not included, negotiated separately.');
  });

  it('rounds up fractional bucket requirements', () => {
    const input: FinishCalcInput = {
      finishType: 'grafitex',
      area: 0,
      coats: 1,
      wasteMargin: 0,
      grafitexBucketPrice: 20000,
      grafitexPartitionsPerBucket: 2,
      standardPartitionArea: 9,
      standardPartitionCount: 3,
    };

    const result = calculateFinish(input);

    // Theoretical: 3 / 2 = 1.5 buckets
    expect(result.grafitexBucketsTheoretical).toBe(1.5);
    // Practical: ceil(1.5) = 2 buckets
    expect(result.grafitexBucketsPractical).toBe(2);
    // Cost: 2 × 20000 = 40000
    expect(result.materialCost).toBe(40000);
  });

  it('uses admin-configurable bucket price', () => {
    const input1: FinishCalcInput = {
      finishType: 'grafitex',
      area: 0,
      coats: 1,
      wasteMargin: 0,
      grafitexBucketPrice: 20000,
      grafitexPartitionsPerBucket: 2,
      standardPartitionArea: 9,
      standardPartitionCount: 4,
    };

    const input2: FinishCalcInput = {
      ...input1,
      grafitexBucketPrice: 25000, // Admin changes price
    };

    const result1 = calculateFinish(input1);
    const result2 = calculateFinish(input2);

    expect(result1.materialCost).toBe(40000); // 2 × 20000
    expect(result2.materialCost).toBe(50000); // 2 × 25000
  });

  it('calculates from area when partition count not provided', () => {
    const input: FinishCalcInput = {
      finishType: 'grafitex',
      area: 36, // 36m² = 4 standard partitions (9m² each)
      coats: 1,
      wasteMargin: 0,
      grafitexBucketPrice: 20000,
      grafitexPartitionsPerBucket: 2,
      standardPartitionArea: 9,
    };

    const result = calculateFinish(input);

    expect(result.grafitexEquivalentPartitions).toBe(4);
    expect(result.grafitexBucketsTheoretical).toBe(2);
    expect(result.grafitexBucketsPractical).toBe(2);
  });
});

describe('calculateFinish — Zero area', () => {
  it('returns all zeros when area is 0', () => {
    const input: FinishCalcInput = {
      finishType: 'painting',
      area: 0,
      coats: 2,
      wasteMargin: 10,
      materials: [{
        id: 'p1',
        name: 'Paint',
        finishType: 'painting',
        coverageRate: 10,
        coverageUnit: 'L',
        packageSize: 20,
        packageUnit: 'L',
        unitPrice: 15000,
        defaultCoats: 2,
        isBase: true,
        isFinishing: false,
        isActive: true,
        sortOrder: 0,
      }],
    };

    const result = calculateFinish(input);

    expect(result.area).toBe(0);
    expect(result.materialCost).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.labourNote).toContain('Not included');
  });
});

describe('calculateFinish — Waste margin clamping', () => {
  it('clamps waste margin > 100% down to 100%', () => {
    const input: FinishCalcInput = {
      finishType: 'painting',
      area: 100,
      coats: 2,
      wasteMargin: 150,
      materials: [{
        id: 'p1',
        name: 'Paint',
        finishType: 'painting',
        coverageRate: 10,
        coverageUnit: 'L',
        packageSize: 20,
        packageUnit: 'L',
        unitPrice: 15000,
        defaultCoats: 2,
        isBase: true,
        isFinishing: false,
        isActive: true,
        sortOrder: 0,
      }],
    };

    const result = calculateFinish(input);

    expect(result.wasteMargin).toBe(100);
    const mat = result.materials[0];
    expect(mat.quantityRequired).toBe(20);
    // quantityWithWaste with 100% waste = 20 × 2.0 = 40 L
    expect(mat.quantityWithWaste).toBe(40);
    expect(mat.packagesNeeded).toBe(2);
    expect(mat.cost).toBe(30000);
  });
});

describe('calculateFinish — Negative inputs', () => {
  it('clamps negative area to 0', () => {
    const input: FinishCalcInput = {
      finishType: 'painting',
      area: -50,
      coats: 2,
      wasteMargin: 10,
      materials: [{
        id: 'p1',
        name: 'Paint',
        finishType: 'painting',
        coverageRate: 10,
        coverageUnit: 'L',
        packageSize: 20,
        packageUnit: 'L',
        unitPrice: 15000,
        defaultCoats: 2,
        isBase: true,
        isFinishing: false,
        isActive: true,
        sortOrder: 0,
      }],
    };

    const result = calculateFinish(input);
    expect(result.area).toBe(0);
    expect(result.materialCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('clamps negative waste margin to 0', () => {
    const input: FinishCalcInput = {
      finishType: 'painting',
      area: 100,
      coats: 2,
      wasteMargin: -15,
      materials: [{
        id: 'p1',
        name: 'Paint',
        finishType: 'painting',
        coverageRate: 10,
        coverageUnit: 'L',
        packageSize: 20,
        packageUnit: 'L',
        unitPrice: 15000,
        defaultCoats: 2,
        isBase: true,
        isFinishing: false,
        isActive: true,
        sortOrder: 0,
      }],
    };

    const result = calculateFinish(input);
    expect(result.wasteMargin).toBe(0);
    expect(result.materials[0].quantityWithWaste).toBe(20);
  });
});
