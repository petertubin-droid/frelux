/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for Feature 17: Roof → Material Engine
 */
import { describe, it, expect } from 'vitest';
import {
  createRoofMaterialSpec,
  calculateRoofSectionMaterials,
  calculateRoofMaterials,
  calculateRoofMaterialsFromArea,
} from '../roof-material-engine';
import type { RoofSectionCalculation, MultiRoofCalculation } from '../section-model-types';

function makeSection(overrides: Partial<RoofSectionCalculation> = {}): RoofSectionCalculation {
  return {
    sectionId: 's1',
    sectionName: 'Main Roof',
    planAreaM2: 100,
    pitchDegrees: 25,
    surfaceAreaM2: 110.34,
    roofType: 'hip' as any,
    roofingMaterial: 'long_span_aluminium' as any,
    sheetCount: 74,
    ridgeLengthM: 10,
    hipLengthM: 14.14,
    fasciaLengthM: 40,
    timberM: 120,
    complete: true,
    missing: [],
    ...overrides,
  };
}

function makeMultiRoof(sections: RoofSectionCalculation[]): MultiRoofCalculation {
  const totals = sections.reduce(
    (acc, s) => {
      acc.totalPlanAreaM2 += s.planAreaM2;
      acc.totalSurfaceAreaM2 += s.surfaceAreaM2;
      acc.totalSheetCount += s.sheetCount;
      acc.totalRidgeLengthM += s.ridgeLengthM;
      acc.totalHipLengthM += s.hipLengthM;
      acc.totalFasciaLengthM += s.fasciaLengthM;
      acc.totalTimberM += s.timberM;
      return acc;
    },
    {
      totalPlanAreaM2: 0, totalSurfaceAreaM2: 0, totalSheetCount: 0,
      totalRidgeLengthM: 0, totalHipLengthM: 0, totalFasciaLengthM: 0, totalTimberM: 0,
    }
  );
  return {
    sections,
    ...totals,
    completeSectionCount: sections.filter((s) => s.complete).length,
    confirmed: true,
  };
}

describe('Feature 17: Roof → Material Engine', () => {
  describe('createRoofMaterialSpec', () => {
    it('creates a configurable roofing material spec', () => {
      const spec = createRoofMaterialSpec({
        productName: 'Long Span Aluminium',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 1.5,
        quantityUnit: 'sheets',
        wastePercent: 10,
        sheetWidthM: 0.5,
        sheetLengthM: 3.0,
        screwsPerUnit: 10,
        ridgeCapCoverageM: 1.0,
        fasciaCoverageM: 3.0,
      });
      expect(spec.materialSpec.productName).toBe('Long Span Aluminium');
      expect(spec.materialSpec.category).toBe('roofing');
      expect(spec.materialSpec.coverage!.value).toBe(1.5);
      expect(spec.materialSpec.defaultWastePercent).toBe(10);
      expect(spec.isSheetBased).toBe(true);
      expect(spec.screwsPerUnit).toBe(10);
      expect(spec.ridgeCapCoverageM).toBe(1.0);
    });

    it('uses default waste of 10 when not specified', () => {
      const spec = createRoofMaterialSpec({
        productName: 'Test Sheet',
        roofingMaterial: 'gi_sheet' as any,
        coverageM2: 1.52,
        quantityUnit: 'sheets',
      });
      expect(spec.materialSpec.defaultWastePercent).toBe(10);
    });
  });

  describe('calculateRoofSectionMaterials', () => {
    it('calculates materials with configured spec', () => {
      const section = makeSection();
      const spec = createRoofMaterialSpec({
        productName: 'Aluminium Sheet',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 1.5,
        quantityUnit: 'sheets',
        wastePercent: 10,
        screwsPerUnit: 10,
        ridgeCapCoverageM: 1.0,
        fasciaCoverageM: 3.0,
      });

      const result = calculateRoofSectionMaterials(section, spec);
      expect(result.materialConfigured).toBe(true);
      expect(result.roofingMaterial).not.toBeNull();
      expect(result.roofingMaterial!.purchaseQuantity).toBeGreaterThan(0);
      expect(result.screwsNeeded).toBeGreaterThan(0);
      expect(result.ridgeCapQuantity).toBeGreaterThan(0);
      expect(result.fasciaBoardQuantity).toBeGreaterThan(0);
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('returns unconfigured result when no spec provided', () => {
      const section = makeSection();
      const result = calculateRoofSectionMaterials(section, null);
      expect(result.materialConfigured).toBe(false);
      expect(result.roofingMaterial).toBeNull();
      expect(result.screwsNeeded).toBeNull();
      expect(result.surfaceAreaM2).toBe(section.surfaceAreaM2);
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('explains the material derivation', () => {
      const section = makeSection();
      const spec = createRoofMaterialSpec({
        productName: 'Test Sheet',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 1.5,
        quantityUnit: 'sheets',
        wastePercent: 10,
      });

      const result = calculateRoofSectionMaterials(section, spec);
      const explanationText = result.explanation.join(' ');
      expect(explanationText).toContain('110.34');
      expect(explanationText).toContain('1.5');
      expect(explanationText).toContain('sheets');
    });
  });

  describe('calculateRoofMaterials (multi-section)', () => {
    it('calculates materials across multiple sections', () => {
      const s1 = makeSection({ sectionId: 's1', sectionName: 'Main', surfaceAreaM2: 110 });
      const s2 = makeSection({ sectionId: 's2', sectionName: 'Porch', surfaceAreaM2: 20 });
      const roofCalc = makeMultiRoof([s1, s2]);

      const spec = createRoofMaterialSpec({
        productName: 'Aluminium',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 1.5,
        quantityUnit: 'sheets',
        wastePercent: 10,
      });

      const result = calculateRoofMaterials(roofCalc, spec);
      expect(result.sections).toHaveLength(2);
      expect(result.totalRoofingMaterial).toBeGreaterThan(0);
      expect(result.allConfigured).toBe(true);
    });

    it('skips incomplete sections', () => {
      const s1 = makeSection({ complete: true });
      const s2 = makeSection({ sectionId: 's2', complete: false, missing: ['pitch'] });
      const roofCalc = makeMultiRoof([s1, s2]);

      const spec = createRoofMaterialSpec({
        productName: 'Test',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 1.5,
        quantityUnit: 'sheets',
      });

      const result = calculateRoofMaterials(roofCalc, spec);
      expect(result.sections).toHaveLength(1);
      expect(result.allConfigured).toBe(false);
    });

    it('uses section-specific specs when provided', () => {
      const s1 = makeSection({ sectionId: 's1', roofingMaterial: 'long_span_aluminium' as any, surfaceAreaM2: 100 });
      const s2 = makeSection({ sectionId: 's2', roofingMaterial: 'stone_coated' as any, surfaceAreaM2: 50 });
      const roofCalc = makeMultiRoof([s1, s2]);

      const defaultSpec = createRoofMaterialSpec({
        productName: 'Default Sheet',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 1.5,
        quantityUnit: 'sheets',
      });
      const sectionSpec = createRoofMaterialSpec({
        productName: 'Stone Coated Panel',
        roofingMaterial: 'stone_coated' as any,
        coverageM2: 0.53,
        quantityUnit: 'panels',
      });

      const sectionSpecs = new Map([['s2', sectionSpec]]);
      const result = calculateRoofMaterials(roofCalc, defaultSpec, sectionSpecs);
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].roofingMaterial!.quantityUnit).toBe('sheets');
      expect(result.sections[1].roofingMaterial!.quantityUnit).toBe('panels');
    });

    it('shows area without pricing when no spec configured', () => {
      const s1 = makeSection();
      const roofCalc = makeMultiRoof([s1]);

      const result = calculateRoofMaterials(roofCalc, null);
      expect(result.totalRoofingMaterial).toBe(0);
      expect(result.allConfigured).toBe(false);
      expect(result.materialSpecName).toBeNull();
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });

  describe('calculateRoofMaterialsFromArea', () => {
    it('calculates from raw surface area', () => {
      const spec = createRoofMaterialSpec({
        productName: 'Test Sheet',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 1.5,
        quantityUnit: 'sheets',
        wastePercent: 10,
      });

      const { result, explanation } = calculateRoofMaterialsFromArea(100, spec);
      expect(result).not.toBeNull();
      expect(result!.purchaseQuantity).toBeGreaterThan(0);
      expect(explanation.length).toBeGreaterThan(0);
    });

    it('returns null result when no spec', () => {
      const { result, explanation } = calculateRoofMaterialsFromArea(100, null);
      expect(result).toBeNull();
      expect(explanation[0]).toContain('No material specification');
    });
  });

  describe('Configurable coverage (no hardcoding)', () => {
    it('different materials produce different quantities', () => {
      const area = 100;
      const spec1 = createRoofMaterialSpec({
        productName: 'Wide Sheet',
        roofingMaterial: 'long_span_aluminium' as any,
        coverageM2: 2.0,
        quantityUnit: 'sheets',
        wastePercent: 5,
      });
      const spec2 = createRoofMaterialSpec({
        productName: 'Narrow Panel',
        roofingMaterial: 'stone_coated' as any,
        coverageM2: 0.5,
        quantityUnit: 'panels',
        wastePercent: 15,
      });

      const r1 = calculateRoofMaterialsFromArea(area, spec1).result!;
      const r2 = calculateRoofMaterialsFromArea(area, spec2).result!;

      expect(r1.purchaseQuantity).not.toBe(r2.purchaseQuantity);
      expect(r1.purchaseQuantity).toBeLessThan(r2.purchaseQuantity); // wider coverage → fewer
    });
  });
});
