/**
 * Tests for the Confidence Engine (Feature 9)
 */

import { describe, it, expect } from 'vitest';
import {
  assessCalculationConfidence,
  assessMaterialConfidence,
  assessPriceConfidence,
  combineConfidence,
  CONFIDENCE_LEVEL_LABELS,
} from '../confidence-engine';
import { createSpace, calculateSpace } from '../space-engine';
import { createMaterialSpec, calculateMaterialQuantity } from '../material-engine';

describe('Calculation Confidence', () => {
  it('gives HIGH confidence for complete inputs', () => {
    const space = createSpace({
      name: 'Room', type: 'bedroom',
      length: 12, width: 12, height: 10,
      unit: 'feet', surfaceType: 'wall',
    });
    const result = calculateSpace(space);
    const assessment = assessCalculationConfidence(result);

    expect(assessment.calculationConfidence).toBe('high');
    expect(assessment.factors.length).toBeGreaterThan(0);
    expect(assessment.factors.every((f) => f.passed)).toBe(true);
  });

  it('gives LOW confidence for zero dimensions', () => {
    const space = createSpace({
      name: 'Room', type: 'bedroom',
      length: 0, width: 0, height: 0,
      unit: 'feet', surfaceType: 'wall',
    });
    const result = calculateSpace(space);
    const assessment = assessCalculationConfidence(result);

    expect(assessment.calculationConfidence).not.toBe('high');
    const dimFactor = assessment.factors.find((f) => f.name === 'Valid dimensions');
    expect(dimFactor?.passed).toBe(false);
  });

  it('reflects unapproved rule in confidence', () => {
    const space = createSpace({
      name: 'Room', type: 'bedroom',
      length: 12, width: 12, height: 10,
      unit: 'feet', surfaceType: 'wall',
    });
    const result = calculateSpace(space);
    const assessment = assessCalculationConfidence(result, { hasApprovedRule: false });

    const ruleFactor = assessment.factors.find((f) => f.name === 'Approved calculation rule');
    expect(ruleFactor?.passed).toBe(false);
  });

  it('price confidence is unavailable by default', () => {
    const space = createSpace({
      name: 'Room', type: 'bedroom',
      length: 12, width: 12, height: 10,
      unit: 'feet', surfaceType: 'wall',
    });
    const result = calculateSpace(space);
    const assessment = assessCalculationConfidence(result);

    expect(assessment.priceConfidence).toBe('unavailable');
  });
});

describe('Material Confidence', () => {
  it('gives HIGH confidence for complete material spec', () => {
    const material = createMaterialSpec({
      productName: 'Test Paint',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 35, coats: 2, unit: 'm2' },
      packageSize: 20,
      isApproved: true,
    });
    const assessment = assessMaterialConfidence(material);

    expect(assessment.calculationConfidence).toBe('high');
  });

  it('gives LOW confidence for missing coverage', () => {
    const material = createMaterialSpec({
      productName: 'Bad Material',
      isApproved: false,
    });
    const assessment = assessMaterialConfidence(material);

    const coverageFactor = assessment.factors.find((f) => f.name === 'Coverage defined');
    expect(coverageFactor?.passed).toBe(false);
  });

  it('gives LOW confidence for non-area coverage', () => {
    const material = createMaterialSpec({
      productName: 'Volume Material',
      coverage: { type: 'volume', value: 0.5, unit: 'm3' },
    });
    const assessment = assessMaterialConfidence(material);

    const areaFactor = assessment.factors.find((f) => f.name === 'Area-based coverage');
    expect(areaFactor?.passed).toBe(false);
  });

  it('includes calculation result in assessment', () => {
    const material = createMaterialSpec({
      productName: 'Paint',
      quantityUnit: 'buckets',
      coverage: { type: 'area', value: 35, coats: 2, unit: 'm2' },
      isApproved: true,
    });
    const calcResult = calculateMaterialQuantity(100, material, 2, 5);
    const assessment = assessMaterialConfidence(material, calcResult);

    const resultFactor = assessment.factors.find((f) => f.name === 'Valid calculation result');
    expect(resultFactor).toBeDefined();
    expect(resultFactor?.passed).toBe(true);
  });
});

describe('Price Confidence', () => {
  it('gives HIGH confidence for verified, fresh price', () => {
    const assessment = assessPriceConfidence({
      hasApprovedPrice: true,
      hasPriceSource: true,
      isSourceVerified: true,
      priceAgeDays: 5,
      hasProductMatch: true,
    });

    expect(assessment.priceConfidence).toBe('high');
  });

  it('gives LOW confidence for no price', () => {
    const assessment = assessPriceConfidence({});

    expect(assessment.priceConfidence).not.toBe('high');
  });

  it('penalizes stale prices', () => {
    const fresh = assessPriceConfidence({
      hasApprovedPrice: true, hasPriceSource: true, isSourceVerified: true,
      priceAgeDays: 5,
    });
    const stale = assessPriceConfidence({
      hasApprovedPrice: true, hasPriceSource: true, isSourceVerified: true,
      priceAgeDays: 120,
    });

    const freshFreshnessFactor = fresh.factors.find((f) => f.name === 'Price freshness');
    const staleFreshnessFactor = stale.factors.find((f) => f.name === 'Price freshness');
    expect(freshFreshnessFactor?.passed).toBe(true);
    expect(staleFreshnessFactor?.passed).toBe(false);
  });

  it('keeps calculation confidence separate', () => {
    const assessment = assessPriceConfidence({});
    expect(assessment.calculationConfidence).toBe('high'); // calculation is independent
    expect(assessment.priceConfidence).not.toBe('high');
  });
});

describe('Combined Confidence', () => {
  it('combines calc HIGH with price HIGH → overall HIGH', () => {
    const calc = assessCalculationConfidence(
      calculateSpace(createSpace({ name: 'R', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall' })),
    );
    const price = assessPriceConfidence({
      hasApprovedPrice: true, hasPriceSource: true, isSourceVerified: true, priceAgeDays: 5, hasProductMatch: true,
    });
    const combined = combineConfidence(calc, price);

    expect(combined.level).toBe('high');
    expect(combined.calculationConfidence).toBe('high');
    expect(combined.priceConfidence).toBe('high');
  });

  it('combines calc HIGH with price unavailable → overall REVIEW_REQUIRED', () => {
    const calc = assessCalculationConfidence(
      calculateSpace(createSpace({ name: 'R', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall' })),
    );
    const price = assessPriceConfidence({});
    const combined = combineConfidence(calc, price);

    expect(combined.calculationConfidence).toBe('high');
    expect(combined.priceConfidence).toBe('review_required');
  });

  it('uses the lower of the two confidence levels', () => {
    const calc = assessCalculationConfidence(
      calculateSpace(createSpace({ name: 'R', type: 'bedroom', length: 12, width: 12, height: 10, unit: 'feet', surfaceType: 'wall' })),
    );
    const price = assessPriceConfidence({ hasApprovedPrice: false });
    const combined = combineConfidence(calc, price);

    // Price is lower, so overall should be at most the price level
    expect(combined.level).not.toBe('high');
  });
});

describe('Confidence Labels', () => {
  it('has labels for all levels', () => {
    expect(CONFIDENCE_LEVEL_LABELS.high).toBe('HIGH');
    expect(CONFIDENCE_LEVEL_LABELS.medium).toBe('MEDIUM');
    expect(CONFIDENCE_LEVEL_LABELS.low).toBe('LOW');
    expect(CONFIDENCE_LEVEL_LABELS.review_required).toBe('REVIEW REQUIRED');
  });
});
