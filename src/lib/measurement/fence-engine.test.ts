import { describe, it, expect } from 'vitest';
import {
  createFenceDimension,
  createFence,
  createFenceWithDimensions,
  calculateFence,
} from './fence-engine';

describe('measurement/fence-engine', () => {
  it('createFenceDimension returns default dimension', () => {
    const dim = createFenceDimension();
    expect(dim.id).toBeTruthy();
    expect(dim.label).toBe('Dimension 1');
    expect(dim.length).toBe(0);
    expect(dim.unit).toBe('feet');
    expect(dim.partitionCount).toBe(1);
  });

  it('createFenceDimension accepts partial overrides', () => {
    const dim = createFenceDimension({ length: 100, height: 6, label: 'Front' });
    expect(dim.label).toBe('Front');
    expect(dim.length).toBe(100);
    expect(dim.height).toBe(6);
  });

  it('createFence returns default fence', () => {
    const fence = createFence();
    expect(fence.id).toBeTruthy();
    expect(fence.name).toBe('New Fence');
    expect(fence.dimensions).toEqual([]);
    expect(fence.defaultUnit).toBe('feet');
  });

  it('createFence accepts name and unit', () => {
    const fence = createFence('Back Yard', 'meters');
    expect(fence.name).toBe('Back Yard');
    expect(fence.defaultUnit).toBe('meters');
  });

  it('createFenceWithDimensions creates N dimensions', () => {
    const fence = createFenceWithDimensions('Test', 3, 'feet', 6, 1);
    expect(fence.dimensions.length).toBe(3);
    expect(fence.dimensions[0].label).toBe('Dimension 1');
    expect(fence.dimensions[1].label).toBe('Dimension 2');
    expect(fence.dimensions[2].label).toBe('Dimension 3');
  });

  it('createFenceWithDimensions with 0 creates empty fence', () => {
    const fence = createFenceWithDimensions('Test', 0);
    expect(fence.dimensions.length).toBe(0);
  });

  it('calculateFence returns result with areas', () => {
    const fence = createFenceWithDimensions('Test', 1, 'feet', 6, 1);
    fence.dimensions[0].length = 100; // 100 feet
    fence.dimensions[0].height = 6; // 6 feet
    const result = calculateFence(fence);
    expect(result).toBeTruthy();
    expect(result.dimensionResults).toBeTruthy();
    expect(result.dimensionResults.length).toBe(1);
  });

  it('calculateFence handles empty dimensions', () => {
    const fence = createFence('Empty');
    const result = calculateFence(fence);
    expect(result.dimensionResults).toEqual([]);
  });
});
