/**
 * FRELUX ROOF REVIEW — Tests
 *
 * Feature 11: Roof Review Screen
 */

import { describe, it, expect } from 'vitest';
import { buildRoofReview, getErrorIssues, getWarningIssues, getReadinessLabel } from '../review';
import { createDefaultMultiRoofSpec, addRoofSection, updateRoofSection } from '../section-model';
import { createDefaultCalibration, completeCalibration, createPlanFile } from '../plan-scanner';
import type { RoofCutout } from '../area-pipeline';

describe('Roof Review: Basic', () => {
  it('builds review for default spec (1 incomplete section)', () => {
    const spec = createDefaultMultiRoofSpec();
    const review = buildRoofReview(spec);
    expect(review.sections).toHaveLength(1);
    expect(review.readyForEstimation).toBe(false);
    expect(review.issues.length).toBeGreaterThan(0);
  });

  it('has readiness score between 0 and 100', () => {
    const spec = createDefaultMultiRoofSpec();
    const review = buildRoofReview(spec);
    expect(review.readinessScore).toBeGreaterThanOrEqual(0);
    expect(review.readinessScore).toBeLessThanOrEqual(100);
  });
});

describe('Roof Review: Issues', () => {
  it('reports error when area is missing', () => {
    const spec = createDefaultMultiRoofSpec();
    const review = buildRoofReview(spec);
    const errors = getErrorIssues(review);
    expect(errors.some(e => e.message.includes('Area is missing'))).toBe(true);
  });

  it('reports error when pitch is missing for non-flat roof', () => {
    let spec = createDefaultMultiRoofSpec();
    const sectionId = spec.sections[0].id;
    spec = updateRoofSection(spec, sectionId, { planAreaM2: 100, pitchDegrees: null, roofType: 'gable' });
    const review = buildRoofReview(spec);
    const errors = getErrorIssues(review);
    expect(errors.some(e => e.message.includes('Pitch is required'))).toBe(true);
  });

  it('does not report pitch error for flat roofs', () => {
    let spec = createDefaultMultiRoofSpec();
    const sectionId = spec.sections[0].id;
    spec = updateRoofSection(spec, sectionId, { planAreaM2: 100, pitchDegrees: null, roofType: 'flat' });
    const review = buildRoofReview(spec);
    const errors = getErrorIssues(review);
    expect(errors.some(e => e.message.includes('Pitch is required'))).toBe(false);
  });

  it('reports warning when section not confirmed', () => {
    const spec = createDefaultMultiRoofSpec();
    const review = buildRoofReview(spec);
    const warnings = getWarningIssues(review);
    expect(warnings.some(w => w.message.includes('not yet confirmed'))).toBe(true);
  });

  it('reports warning when scale not calibrated', () => {
    const spec = createDefaultMultiRoofSpec();
    const review = buildRoofReview(spec, null, createDefaultCalibration());
    const warnings = getWarningIssues(review);
    expect(warnings.some(w => w.message.includes('Scale not calibrated'))).toBe(true);
  });

  it('reports info when no plan imported', () => {
    const spec = createDefaultMultiRoofSpec();
    const review = buildRoofReview(spec);
    const infos = review.issues.filter(i => i.severity === 'info');
    expect(infos.some(i => i.message.includes('No plan imported'))).toBe(true);
  });
});

describe('Roof Review: Ready for Estimation', () => {
  it('is NOT ready when section has missing data', () => {
    const spec = createDefaultMultiRoofSpec();
    const review = buildRoofReview(spec);
    expect(review.readyForEstimation).toBe(false);
  });

  it('is ready when section is complete (area + pitch)', () => {
    let spec = createDefaultMultiRoofSpec();
    const sectionId = spec.sections[0].id;
    spec = updateRoofSection(spec, sectionId, {
      planAreaM2: 100,
      pitchDegrees: 30,
      roofType: 'gable',
      confirmed: true,
    });
    const review = buildRoofReview(spec);
    expect(review.readyForEstimation).toBe(true);
  });

  it('is ready for flat roof without pitch', () => {
    let spec = createDefaultMultiRoofSpec();
    const sectionId = spec.sections[0].id;
    spec = updateRoofSection(spec, sectionId, {
      planAreaM2: 100,
      pitchDegrees: null,
      roofType: 'flat',
      confirmed: true,
    });
    const review = buildRoofReview(spec);
    expect(review.readyForEstimation).toBe(true);
  });
});

describe('Roof Review: Readiness Score', () => {
  it('score increases with plan import', () => {
    const spec = createDefaultMultiRoofSpec();
    const withoutPlan = buildRoofReview(spec);
    const planFile = createPlanFile('plan.pdf', 1000000, 'blob:url', 'application/pdf');
    const withPlan = buildRoofReview(spec, planFile);
    expect(withPlan.readinessScore).toBeGreaterThan(withoutPlan.readinessScore);
  });

  it('score increases with calibration', () => {
    let spec = createDefaultMultiRoofSpec();
    const sectionId = spec.sections[0].id;
    spec = updateRoofSection(spec, sectionId, { planAreaM2: 100, pitchDegrees: 30, roofType: 'gable' });

    const withoutCal = buildRoofReview(spec);
    const cal = completeCalibration(createDefaultCalibration(), 5, 'm', 500);
    const withCal = buildRoofReview(spec, null, cal);
    expect(withCal.readinessScore).toBeGreaterThan(withoutCal.readinessScore);
  });

  it('score increases when sections are complete', () => {
    let spec = createDefaultMultiRoofSpec();
    const incomplete = buildRoofReview(spec);
    const sectionId = spec.sections[0].id;
    spec = updateRoofSection(spec, sectionId, { planAreaM2: 100, pitchDegrees: 30, roofType: 'gable' });
    const complete = buildRoofReview(spec);
    expect(complete.readinessScore).toBeGreaterThan(incomplete.readinessScore);
  });
});

describe('Roof Review: Readiness Label', () => {
  it('returns "Ready for estimation" for score ≥ 90', () => {
    expect(getReadinessLabel(90)).toBe('Ready for estimation');
    expect(getReadinessLabel(100)).toBe('Ready for estimation');
  });

  it('returns "Almost ready" for score 70-89', () => {
    expect(getReadinessLabel(75)).toBe('Almost ready — review warnings');
  });

  it('returns "Needs attention" for score 50-69', () => {
    expect(getReadinessLabel(60)).toBe('Needs attention — missing data');
  });

  it('returns "Not ready" for score < 50', () => {
    expect(getReadinessLabel(30)).toBe('Not ready — critical data missing');
  });
});

describe('Roof Review: Multiple Sections', () => {
  it('reviews all sections', () => {
    let spec = createDefaultMultiRoofSpec();
    spec = addRoofSection(spec, 'Garage');
    spec = addRoofSection(spec, 'Porch');
    const review = buildRoofReview(spec);
    expect(review.sections).toHaveLength(3);
    expect(review.sections.map(s => s.sectionName)).toContain('Main Roof');
    expect(review.sections.map(s => s.sectionName)).toContain('Garage');
    expect(review.sections.map(s => s.sectionName)).toContain('Porch');
  });

  it('issues reference correct section names', () => {
    let spec = createDefaultMultiRoofSpec();
    spec = addRoofSection(spec, 'Garage');
    const review = buildRoofReview(spec);
    const errors = getErrorIssues(review);
    expect(errors.some(e => e.sectionName === 'Main Roof')).toBe(true);
    expect(errors.some(e => e.sectionName === 'Garage')).toBe(true);
  });
});

describe('Roof Review: Cutouts', () => {
  it('includes cutout count per section', () => {
    let spec = createDefaultMultiRoofSpec();
    const sectionId = spec.sections[0].id;
    spec = updateRoofSection(spec, sectionId, { planAreaM2: 100, pitchDegrees: 30, roofType: 'gable' });

    const cutouts: RoofCutout[] = [
      { id: 'c1', name: 'Skylight', areaM2: 4, type: 'skylight' },
      { id: 'c2', name: 'Courtyard', areaM2: 10, type: 'courtyard' },
    ];
    const cutoutMap = new Map([[sectionId, cutouts]]);

    const review = buildRoofReview(spec, null, null, null, cutoutMap);
    expect(review.sections[0].cutoutCount).toBe(2);
    expect(review.sections[0].cutouts).toHaveLength(2);
  });
});
