/**
 * Tests for the Fence Element Engine (Feature 4 — Fence Element Engine)
 */

import { describe, it, expect } from 'vitest';
import {
  createFenceDimension,
  createFence,
  createFenceWithDimensions,
  calculateFenceDimension,
  calculateFence,
  fenceDimensionToSpace,
  fenceToSpaces,
} from '../fence-engine';

describe('Fence Creation', () => {
  it('creates a fence with defaults', () => {
    const fence = createFence();
    expect(fence.name).toBe('New Fence');
    expect(fence.defaultUnit).toBe('feet');
    expect(fence.dimensions).toEqual([]);
    expect(fence.finishType).toBe('screeding');
  });

  it('creates a fence with 3 dimensions (not hardcoded to 4)', () => {
    const fence = createFenceWithDimensions('Test', 3, 'feet', 6, 2);
    expect(fence.dimensions.length).toBe(3);
    expect(fence.dimensions[0].label).toBe('Dimension 1');
    expect(fence.dimensions[1].label).toBe('Dimension 2');
    expect(fence.dimensions[2].label).toBe('Dimension 3');
  });

  it('creates a fence with 5 dimensions', () => {
    const fence = createFenceWithDimensions('Test', 5);
    expect(fence.dimensions.length).toBe(5);
  });

  it('creates a fence with 1 dimension', () => {
    const fence = createFenceWithDimensions('Test', 1);
    expect(fence.dimensions.length).toBe(1);
  });

  it('creates a fence dimension with defaults', () => {
    const dim = createFenceDimension();
    expect(dim.label).toBe('Dimension 1');
    expect(dim.unit).toBe('feet');
    expect(dim.partitionCount).toBe(1);
    expect(dim.height).toBe(0);
  });

  it('creates a fence dimension with custom values', () => {
    const dim = createFenceDimension({
      label: 'Front',
      length: 50,
      height: 6,
      unit: 'feet',
      partitionCount: 3,
    });
    expect(dim.label).toBe('Front');
    expect(dim.length).toBe(50);
    expect(dim.height).toBe(6);
    expect(dim.partitionCount).toBe(3);
  });
});

describe('Dimension Calculation', () => {
  it('calculates partition area for 50ft × 6ft with 1 partition', () => {
    const dim = createFenceDimension({
      length: 50,
      height: 6,
      unit: 'feet',
      partitionCount: 1,
    });
    const result = calculateFenceDimension(dim);

    // 50 ft = 15.24 m, 6 ft = 1.8288 m
    // Area = 15.24 × 1.8288 = 27.8709 m²
    expect(result.partitionAreaM2).toBeCloseTo(27.8709, 2);
    expect(result.dimensionAreaM2).toBeCloseTo(27.8709, 2); // × 1 partition
  });

  it('calculates partition area with 3 partitions', () => {
    const dim = createFenceDimension({
      length: 50,
      height: 6,
      unit: 'feet',
      partitionCount: 3,
    });
    const result = calculateFenceDimension(dim);

    // Partition area = 27.8709 m²
    // Dimension area = 27.8709 × 3 = 83.6127 m²
    expect(result.partitionAreaM2).toBeCloseTo(27.8709, 2);
    expect(result.dimensionAreaM2).toBeCloseTo(83.6127, 2);
  });

  it('calculates with metre inputs', () => {
    const dim = createFenceDimension({
      length: 10,
      height: 2,
      unit: 'meters',
      partitionCount: 4,
    });
    const result = calculateFenceDimension(dim);

    // 10 × 2 = 20 m² per partition, × 4 = 80 m²
    expect(result.partitionAreaM2).toBeCloseTo(20, 4);
    expect(result.dimensionAreaM2).toBeCloseTo(80, 4);
  });

  it('applies waste margin', () => {
    const dim = createFenceDimension({
      length: 10,
      height: 2,
      unit: 'meters',
      partitionCount: 1,
      wasteMarginPercent: 10,
    });
    const result = calculateFenceDimension(dim);

    // Base area = 20 m², with 10% waste = 22 m²
    expect(result.dimensionAreaM2).toBeCloseTo(20, 4);
    expect(result.adjustedAreaM2).toBeCloseTo(22, 4);
  });

  it('uses global waste when dimension waste is 0', () => {
    const dim = createFenceDimension({
      length: 10,
      height: 2,
      unit: 'meters',
      partitionCount: 1,
      wasteMarginPercent: 0,
    });
    const result = calculateFenceDimension(dim, 15); // global 15%

    // 20 m² × 1.15 = 23 m²
    expect(result.adjustedAreaM2).toBeCloseTo(23, 4);
  });

  it('dimension waste overrides global', () => {
    const dim = createFenceDimension({
      length: 10,
      height: 2,
      unit: 'meters',
      partitionCount: 1,
      wasteMarginPercent: 5,
    });
    const result = calculateFenceDimension(dim, 15); // global 15%, dim 5%

    // 20 m² × 1.05 = 21 m² (dimension's 5% used, not global 15%)
    expect(result.adjustedAreaM2).toBeCloseTo(21, 4);
  });

  it('produces calculation steps', () => {
    const dim = createFenceDimension({
      label: 'Front',
      length: 50,
      height: 6,
      unit: 'feet',
      partitionCount: 3,
    });
    const result = calculateFenceDimension(dim);
    expect(result.steps.length).toBeGreaterThan(0);
    // Should have convert length, convert height, partition area, dimension area steps
    const labels = result.steps.map((s) => s.label);
    expect(labels.some((l) => l.includes('Convert length'))).toBe(true);
    expect(labels.some((l) => l.includes('Convert height'))).toBe(true);
    expect(labels.some((l) => l.includes('Partition area'))).toBe(true);
  });
});

describe('Fence Calculation (Multi-Dimension)', () => {
  it('calculates a fence with 3 dimensions and different partitions', () => {
    const fence = createFence('Perimeter Fence', 'feet');
    fence.dimensions = [
      createFenceDimension({ label: 'Front', length: 50, height: 6, unit: 'feet', partitionCount: 3 }),
      createFenceDimension({ label: 'Left', length: 100, height: 6, unit: 'feet', partitionCount: 4 }),
      createFenceDimension({ label: 'Right', length: 100, height: 6, unit: 'feet', partitionCount: 2 }),
    ];

    const result = calculateFence(fence);
    expect(result.dimensionResults.length).toBe(3);
    expect(result.totalAreaM2).toBeGreaterThan(0);

    // Front: 50×6×3 = 900 ft²
    // Left: 100×6×4 = 2400 ft²
    // Right: 100×6×2 = 1200 ft²
    // Total: 4500 ft² = 418.06... m²
    expect(result.totalAreaM2).toBeCloseTo(418.064, 1);
  });

  it('calculates a fence with mixed units', () => {
    const fence = createFence('Mixed Fence', 'feet');
    fence.dimensions = [
      createFenceDimension({ label: 'Metric', length: 10, height: 2, unit: 'meters', partitionCount: 2 }),
      createFenceDimension({ label: 'Imperial', length: 30, height: 6, unit: 'feet', partitionCount: 1 }),
    ];

    const result = calculateFence(fence);
    // Metric: 10×2×2 = 40 m²
    // Imperial: 30×6×1 = 180 ft² = 16.722... m²
    // Total: 56.722... m²
    expect(result.totalAreaM2).toBeCloseTo(56.722, 1);
  });

  it('handles empty fence', () => {
    const fence = createFence('Empty', 'feet');
    const result = calculateFence(fence);
    expect(result.totalAreaM2).toBe(0);
  });

  it('applies global waste to all dimensions', () => {
    const fence = createFence('Test', 'meters');
    fence.globalWastePercent = 10;
    fence.dimensions = [
      createFenceDimension({ label: 'A', length: 10, height: 2, unit: 'meters', partitionCount: 1 }),
      createFenceDimension({ label: 'B', length: 20, height: 2, unit: 'meters', partitionCount: 1 }),
    ];

    const result = calculateFence(fence);
    // A: 20 m² × 1.1 = 22 m²
    // B: 40 m² × 1.1 = 44 m²
    // Total: 66 m²
    expect(result.totalAreaM2).toBeCloseTo(66, 4);
  });
});

describe('Fence Tiling', () => {
  it('calculates tiles when tile config is provided', () => {
    const fence = createFence('Tiled Fence', 'meters');
    fence.finishType = 'tiling';
    fence.tileConfig = {
      tileLength: 600,
      tileWidth: 600,
      tileUnit: 'mm',
      packagingMethod: 'tiles_per_carton',
      tilesPerCarton: 4,
    };
    fence.dimensions = [
      createFenceDimension({
        label: 'Front',
        length: 10,
        height: 2,
        unit: 'meters',
        partitionCount: 2,
      }),
    ];

    const result = calculateFence(fence);
    const dimResult = result.dimensionResults[0];

    // Area = 10 × 2 × 2 = 40 m²
    // Tile area = 0.6 × 0.6 = 0.36 m²
    // Tiles = 40 / 0.36 = 111.11...
    expect(dimResult.tilesNeeded).toBeCloseTo(111.111, 1);
    // Cartons = ⌈111.11 / 4⌉ = 28
    expect(dimResult.cartonsNeeded).toBe(28);
  });
});

describe('Bridge to Space Engine', () => {
  it('converts a fence dimension to a space', () => {
    const dim = createFenceDimension({
      label: 'Front',
      length: 50,
      height: 6,
      unit: 'feet',
      partitionCount: 3,
    });
    const space = fenceDimensionToSpace(dim, 'screeding');
    expect(space.name).toBe('Front');
    expect(space.length).toBe(50);
    expect(space.height).toBe(6);
    expect(space.unit).toBe('feet');
    expect(space.quantity).toBe(3);
    expect(space.surfaceType).toBe('fence');
    expect(space.finishType).toBe('screeding');
  });

  it('converts a fence to an array of spaces', () => {
    const fence = createFence('Test', 'feet');
    fence.dimensions = [
      createFenceDimension({ label: 'A', length: 50, height: 6, unit: 'feet', partitionCount: 3 }),
      createFenceDimension({ label: 'B', length: 100, height: 6, unit: 'feet', partitionCount: 4 }),
    ];
    const spaces = fenceToSpaces(fence);
    expect(spaces.length).toBe(2);
    expect(spaces[0].name).toBe('A');
    expect(spaces[1].name).toBe('B');
  });
});

describe('Screeding is Area-Based', () => {
  it('screeding calculation produces m² not buckets', () => {
    const fence = createFence('Screeding Fence', 'meters');
    fence.finishType = 'screeding';
    fence.dimensions = [
      createFenceDimension({ label: 'Front', length: 20, height: 2, unit: 'meters', partitionCount: 5 }),
    ];

    const result = calculateFence(fence);
    // 20 × 2 × 5 = 200 m² — this is an area, not a bucket count
    expect(result.totalAreaM2).toBeCloseTo(200, 4);
    expect(result.totalTilesNeeded).toBeUndefined(); // no tiling
  });
});
