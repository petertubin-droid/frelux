/**
 * FRELUX ROOF SECTION MODEL — Tests
 *
 * Feature 4: Roof Facet / Section Engine
 */

import { describe, it, expect } from 'vitest';
import {
  pitchAdjustedArea,
  getSectionPlanArea,
  getSectionMissing,
  calculateRoofSection,
  calculateMultiRoof,
  createRoofSectionSpec,
  createDefaultMultiRoofSpec,
  addRoofSection,
  removeRoofSection,
  updateRoofSection,
  renameRoofSection,
  confirmMultiRoofSpec,
} from '../section-model';
import type {
  RoofSectionSpec,
  MultiRoofSpec,
} from '../section-model-types';

// =========================================================
// Pitch-Adjusted Area
// =========================================================

describe('Roof Section Model: Pitch-Adjusted Area', () => {
  it('returns plan area for flat roofs', () => {
    expect(pitchAdjustedArea(100, null, 'flat')).toBe(100);
    expect(pitchAdjustedArea(100, 0, 'flat')).toBe(100);
    expect(pitchAdjustedArea(100, 45, 'flat')).toBe(100);
  });

  it('returns plan area unchanged when pitch is null', () => {
    expect(pitchAdjustedArea(100, null, 'gable')).toBe(100);
  });

  it('returns plan area when pitch is 0', () => {
    expect(pitchAdjustedArea(100, 0, 'gable')).toBe(100);
  });

  it('calculates pitched area correctly for 45° gable', () => {
    const result = pitchAdjustedArea(100, 45, 'gable');
    // 100 / cos(45°) = 100 / 0.7071 = 141.42
    expect(result).toBeCloseTo(141.42, 1);
  });

  it('calculates pitched area correctly for 30° gable', () => {
    const result = pitchAdjustedArea(100, 30, 'gable');
    // 100 / cos(30°) = 100 / 0.866 = 115.47
    expect(result).toBeCloseTo(115.47, 1);
  });

  it('returns 0 for invalid plan area', () => {
    expect(pitchAdjustedArea(0, 30, 'gable')).toBe(0);
    expect(pitchAdjustedArea(-10, 30, 'gable')).toBe(0);
  });

  it('handles near-vertical pitch gracefully', () => {
    const result = pitchAdjustedArea(100, 89.99, 'gable');
    expect(result).toBeGreaterThan(100);
    expect(isFinite(result)).toBe(true);
  });
});

// =========================================================
// Section Plan Area
// =========================================================

describe('Roof Section Model: Plan Area', () => {
  it('returns manual area when geometry is null', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Test'),
      geometry: null,
      planAreaM2: 150,
    };
    expect(getSectionPlanArea(section)).toBe(150);
  });

  it('returns 0 when both geometry and manual area are null', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Test'),
      geometry: null,
      planAreaM2: null,
    };
    expect(getSectionPlanArea(section)).toBe(0);
  });
});

// =========================================================
// Section Missing Data
// =========================================================

describe('Roof Section Model: Missing Data Detection', () => {
  it('reports area as missing when no area provided', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Test'),
      geometry: null,
      planAreaM2: null,
      pitchDegrees: 30,
      roofType: 'gable',
    };
    const missing = getSectionMissing(section);
    expect(missing).toContain('area (trace geometry or enter plan area)');
    expect(missing).not.toContain('pitch');
  });

  it('reports pitch as missing for non-flat roofs without pitch', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Test'),
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'gable',
    };
    const missing = getSectionMissing(section);
    expect(missing).toContain('pitch');
  });

  it('does not report pitch for flat roofs', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Test'),
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
    };
    const missing = getSectionMissing(section);
    expect(missing).not.toContain('pitch');
  });

  it('reports nothing missing for complete section', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Test'),
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'gable',
    };
    expect(getSectionMissing(section)).toHaveLength(0);
  });
});

// =========================================================
// Section Calculation
// =========================================================

describe('Roof Section Model: Section Calculation', () => {
  it('calculates a complete gable section', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Main Roof'),
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'gable',
      roofingMaterial: 'long_span_aluminium',
      overhangM: 0.6,
    };
    const calc = calculateRoofSection(section);
    expect(calc.complete).toBe(true);
    expect(calc.missing).toHaveLength(0);
    expect(calc.planAreaM2).toBe(100);
    expect(calc.surfaceAreaM2).toBeCloseTo(115.47, 1);
    expect(calc.sheetCount).toBeGreaterThan(0);
    expect(calc.ridgeLengthM).toBeGreaterThan(0);
  });

  it('calculates a flat roof section', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Flat Roof'),
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      roofingMaterial: 'long_span_aluminium',
    };
    const calc = calculateRoofSection(section);
    expect(calc.complete).toBe(true);
    expect(calc.surfaceAreaM2).toBe(100); // no pitch adjustment for flat
  });

  it('returns incomplete result when pitch is missing', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Incomplete'),
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'gable',
    };
    const calc = calculateRoofSection(section);
    expect(calc.complete).toBe(false);
    expect(calc.missing).toContain('pitch');
    expect(calc.surfaceAreaM2).toBe(0);
    expect(calc.sheetCount).toBe(0);
  });

  it('returns incomplete result when area is missing', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('No Area'),
      planAreaM2: null,
      pitchDegrees: 30,
      roofType: 'gable',
    };
    const calc = calculateRoofSection(section);
    expect(calc.complete).toBe(false);
    expect(calc.missing).toContain('area (trace geometry or enter plan area)');
  });

  it('calculates hip roof with hip length', () => {
    const section: RoofSectionSpec = {
      ...createRoofSectionSpec('Hip Roof'),
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'hip',
    };
    const calc = calculateRoofSection(section);
    expect(calc.complete).toBe(true);
    expect(calc.hipLengthM).toBeGreaterThan(0);
  });
});

// =========================================================
// Multi-Roof Calculation
// =========================================================

describe('Roof Section Model: Multi-Roof Calculation', () => {
  it('calculates totals across multiple sections', () => {
    const spec: MultiRoofSpec = {
      sections: [
        {
          ...createRoofSectionSpec('Main Roof'),
          planAreaM2: 200,
          pitchDegrees: 25,
          roofType: 'gable',
        },
        {
          ...createRoofSectionSpec('Garage'),
          planAreaM2: 50,
          pitchDegrees: 15,
          roofType: 'gable',
        },
      ],
      useMultiSection: true,
      confirmed: false,
    };

    const result = calculateMultiRoof(spec);
    expect(result.sections).toHaveLength(2);
    expect(result.completeSectionCount).toBe(2);
    expect(result.totalPlanAreaM2).toBeCloseTo(250, 2);
    expect(result.totalSurfaceAreaM2).toBeGreaterThan(250); // pitch-adjusted
    expect(result.totalSheetCount).toBeGreaterThan(0);
  });

  it('only counts complete sections in totals', () => {
    const spec: MultiRoofSpec = {
      sections: [
        {
          ...createRoofSectionSpec('Complete'),
          planAreaM2: 100,
          pitchDegrees: 30,
          roofType: 'gable',
        },
        {
          ...createRoofSectionSpec('Incomplete'),
          planAreaM2: 50,
          pitchDegrees: null, // missing pitch
          roofType: 'gable',
        },
      ],
      useMultiSection: true,
      confirmed: false,
    };

    const result = calculateMultiRoof(spec);
    expect(result.completeSectionCount).toBe(1);
    expect(result.totalPlanAreaM2).toBe(100); // only complete section
  });

  it('handles empty section list', () => {
    const spec: MultiRoofSpec = {
      sections: [],
      useMultiSection: true,
      confirmed: false,
    };
    const result = calculateMultiRoof(spec);
    expect(result.totalPlanAreaM2).toBe(0);
    expect(result.totalSurfaceAreaM2).toBe(0);
  });
});

// =========================================================
// Section Management
// =========================================================

describe('Roof Section Model: Section Management', () => {
  it('creates default spec with one section', () => {
    const spec = createDefaultMultiRoofSpec();
    expect(spec.sections).toHaveLength(1);
    expect(spec.sections[0].name).toBe('Main Roof');
    expect(spec.useMultiSection).toBe(false);
    expect(spec.confirmed).toBe(false);
  });

  it('adds a section', () => {
    const spec = createDefaultMultiRoofSpec();
    const result = addRoofSection(spec, 'Garage');
    expect(result.sections).toHaveLength(2);
    expect(result.sections[1].name).toBe('Garage');
    expect(result.confirmed).toBe(false);
  });

  it('removes a section', () => {
    const spec = createDefaultMultiRoofSpec();
    const result = addRoofSection(spec, 'Garage');
    const garageId = result.sections[1].id;
    const removed = removeRoofSection(result, garageId);
    expect(removed.sections).toHaveLength(1);
  });

  it('updates a section and un-confirms', () => {
    const spec = createDefaultMultiRoofSpec();
    const confirmed = confirmMultiRoofSpec(spec);
    expect(confirmed.confirmed).toBe(true);

    const sectionId = confirmed.sections[0].id;
    const updated = updateRoofSection(confirmed, sectionId, { pitchDegrees: 35 });
    expect(updated.sections[0].pitchDegrees).toBe(35);
    expect(updated.confirmed).toBe(false);
    expect(updated.sections[0].confirmed).toBe(false);
  });

  it('renames a section', () => {
    const spec = createDefaultMultiRoofSpec();
    const sectionId = spec.sections[0].id;
    const result = renameRoofSection(spec, sectionId, 'Porch');
    expect(result.sections[0].name).toBe('Porch');
  });

  it('confirms all sections', () => {
    const spec = createDefaultMultiRoofSpec();
    const result = confirmMultiRoofSpec(spec);
    expect(result.confirmed).toBe(true);
    result.sections.forEach(s => expect(s.confirmed).toBe(true));
  });
});

// =========================================================
// No Hardcoded Limit on Sections
// =========================================================

describe('Roof Section Model: No Hardcoded Limit', () => {
  it('supports many sections', () => {
    let spec = createDefaultMultiRoofSpec();
    for (let i = 0; i < 20; i++) {
      spec = addRoofSection(spec, `Section ${i + 2}`);
    }
    expect(spec.sections).toHaveLength(21);
  });
});
