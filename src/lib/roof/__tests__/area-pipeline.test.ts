/**
 * FRELUX ROOF AREA PIPELINE — Tests
 *
 * Feature 6: Pitch-Adjusted Roof Area
 */

import { describe, it, expect } from 'vitest';
import { calculateRoofAreaPipeline } from '../area-pipeline';
import type { RoofCutout, RoofAreaPipelineInput } from '../area-pipeline';

// =========================================================
// Basic Pipeline
// =========================================================

describe('Roof Area Pipeline: Basic', () => {
  it('calculates flat roof with no cutouts', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts: [],
      wastePercent: 5,
    });
    expect(result.planAreaM2).toBe(100);
    expect(result.slopedSurfaceAreaM2).toBe(100);
    expect(result.netAreaM2).toBe(100);
    expect(result.orderAreaM2).toBeCloseTo(105, 2);
    expect(result.pitchApplied).toBe(false);
  });

  it('calculates gable roof with 30° pitch', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'gable',
      cutouts: [],
      wastePercent: 5,
    });
    expect(result.slopedSurfaceAreaM2).toBeCloseTo(115.47, 1);
    expect(result.netAreaM2).toBeCloseTo(115.47, 1);
    expect(result.orderAreaM2).toBeCloseTo(115.47 * 1.05, 1);
    expect(result.pitchApplied).toBe(true);
  });

  it('does not apply pitch for flat roof even if pitch is set', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'flat',
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.slopedSurfaceAreaM2).toBe(100);
    expect(result.pitchApplied).toBe(false);
  });

  it('does not apply pitch when pitch is null for gable', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'gable',
      cutouts: [],
      wastePercent: 10,
    });
    expect(result.slopedSurfaceAreaM2).toBe(100);
    expect(result.pitchApplied).toBe(false);
  });
});

// =========================================================
// Cutouts
// =========================================================

describe('Roof Area Pipeline: Cutouts', () => {
  it('subtracts a single cutout', () => {
    const cutouts: RoofCutout[] = [
      { id: 'c1', name: 'Skylight', areaM2: 4, type: 'skylight' },
    ];
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts,
      wastePercent: 0,
    });
    expect(result.cutoutAreaM2).toBe(4);
    expect(result.netAreaM2).toBe(96);
  });

  it('subtracts multiple cutouts', () => {
    const cutouts: RoofCutout[] = [
      { id: 'c1', name: 'Skylight A', areaM2: 3, type: 'skylight' },
      { id: 'c2', name: 'Courtyard', areaM2: 20, type: 'courtyard' },
      { id: 'c3', name: 'AC Unit', areaM2: 2, type: 'equipment' },
    ];
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts,
      wastePercent: 0,
    });
    expect(result.cutoutAreaM2).toBe(25);
    expect(result.netAreaM2).toBe(75);
  });

  it('ignores negative cutout areas', () => {
    const cutouts: RoofCutout[] = [
      { id: 'c1', name: 'Invalid', areaM2: -5, type: 'other' },
    ];
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts,
      wastePercent: 0,
    });
    expect(result.cutoutAreaM2).toBe(0);
    expect(result.netAreaM2).toBe(100);
  });

  it('net area never goes below 0', () => {
    const cutouts: RoofCutout[] = [
      { id: 'c1', name: 'Huge Opening', areaM2: 200, type: 'courtyard' },
    ];
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts,
      wastePercent: 0,
    });
    expect(result.netAreaM2).toBe(0);
    expect(result.orderAreaM2).toBe(0);
  });
});

// =========================================================
// Waste
// =========================================================

describe('Roof Area Pipeline: Waste', () => {
  it('applies 5% waste correctly', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts: [],
      wastePercent: 5,
    });
    expect(result.orderAreaM2).toBeCloseTo(105, 2);
  });

  it('applies 10% waste correctly', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts: [],
      wastePercent: 10,
    });
    expect(result.orderAreaM2).toBeCloseTo(110, 2);
  });

  it('handles 0% waste', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.orderAreaM2).toBe(100);
  });

  it('ignores negative waste', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts: [],
      wastePercent: -5,
    });
    expect(result.orderAreaM2).toBe(100);
  });
});

// =========================================================
// Full Pipeline (pitch + cutouts + waste)
// =========================================================

describe('Roof Area Pipeline: Full Pipeline', () => {
  it('combines pitch, cutouts, and waste', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'gable',
      cutouts: [
        { id: 'c1', name: 'Skylight', areaM2: 5, type: 'skylight' },
      ],
      wastePercent: 10,
    });
    // sloped = 100 / cos(30) = 115.47
    // net = 115.47 - 5 = 110.47
    // order = 110.47 * 1.10 = 121.52
    expect(result.slopedSurfaceAreaM2).toBeCloseTo(115.47, 1);
    expect(result.netAreaM2).toBeCloseTo(110.47, 1);
    expect(result.orderAreaM2).toBeCloseTo(121.52, 1);
    expect(result.pitchApplied).toBe(true);
  });
});

// =========================================================
// Explanation
// =========================================================

describe('Roof Area Pipeline: Explanation', () => {
  it('generates explanation for every step', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'gable',
      cutouts: [{ id: 'c1', name: 'Skylight', areaM2: 4, type: 'skylight' }],
      wastePercent: 5,
    });
    expect(result.explanation.planArea).toContain('100.00 m²');
    expect(result.explanation.pitch).toContain('30.0°');
    expect(result.explanation.slopedSurface).toContain('m²');
    expect(result.explanation.cutouts).toContain('Skylight');
    expect(result.explanation.cutouts).toContain('4.00 m²');
    expect(result.explanation.net).toContain('m²');
    expect(result.explanation.waste).toContain('5.0%');
    expect(result.explanation.order).toContain('m²');
  });

  it('explains when pitch is not provided', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'gable',
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.explanation.pitch).toContain('NOT PROVIDED');
    expect(result.explanation.pitch).toContain('pitch required');
  });

  it('explains flat roof pitch as N/A', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.explanation.pitch).toContain('flat roof');
    expect(result.explanation.pitch).toContain('no pitch adjustment');
  });

  it('explains no cutouts', () => {
    const result = calculateRoofAreaPipeline({
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      cutouts: [],
      wastePercent: 0,
    });
    expect(result.explanation.cutouts).toBe('Cutouts: none');
  });
});

// =========================================================
// Determinism
// =========================================================

describe('Roof Area Pipeline: Determinism', () => {
  it('same input produces same output', () => {
    const input: RoofAreaPipelineInput = {
      planAreaM2: 150,
      pitchDegrees: 25,
      roofType: 'gable',
      cutouts: [{ id: 'c1', name: 'Opening', areaM2: 10, type: 'opening' }],
      wastePercent: 7.5,
    };
    const r1 = calculateRoofAreaPipeline(input);
    const r2 = calculateRoofAreaPipeline(input);
    expect(r1).toEqual(r2);
  });
});
