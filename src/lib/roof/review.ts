/**
 * FRELUX ROOF REVIEW — Data Aggregation & Verification
 *
 * Aggregates all roof data into a single review structure
 * for the final verification screen before estimation.
 *
 * The review screen shows:
 *   - Plan source (if imported)
 *   - Scale calibration status
 *   - Each roof section with its geometry, pitch, type, material
 *   - Edge classifications summary
 *   - Cutouts summary
 *   - Area pipeline results
 *   - Overall readiness score
 *   - What's missing / needs attention
 *
 * Feature 11: Roof Review Screen
 */

import type { MultiRoofSpec, MultiRoofCalculation } from './section-model-types';
import type { RoofAreaPipelineResult, RoofCutout } from './area-pipeline';
import type { EdgeSummary } from './edge-classification';
import type { ScaleCalibration, PlanFile } from './plan-scanner';
import {
  calculateMultiRoof,
  getSectionMissing,
} from './section-model';

// =========================================================
// Review Data Types
// =========================================================

export interface SectionReviewItem {
  sectionId: string;
  sectionName: string;
  roofType: string;
  roofingMaterial: string;
  pitchDegrees: number | null;
  pitchStatus: 'provided' | 'missing' | 'not_required';
  planAreaM2: number | null;
  areaStatus: 'provided' | 'missing';
  cutouts: RoofCutout[];
  cutoutCount: number;
  areaPipeline: RoofAreaPipelineResult | null;
  missing: string[];
  confirmed: boolean;
}

export interface RoofReviewData {
  /** Source plan file (if imported) */
  planFile: PlanFile | null;
  /** Scale calibration state */
  calibration: ScaleCalibration | null;
  /** Per-section review items */
  sections: SectionReviewItem[];
  /** Edge classification summary */
  edgeSummary: EdgeSummary | null;
  /** Overall multi-roof calculation */
  multiRoofCalc: MultiRoofCalculation | null;
  /** Readiness score 0-100 */
  readinessScore: number;
  /** Whether all data is verified and ready for estimation */
  readyForEstimation: boolean;
  /** List of issues that need attention */
  issues: ReviewIssue[];
}

export interface ReviewIssue {
  sectionId: string | null; // null = global issue
  sectionName: string | null;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// =========================================================
// Review Builder
// =========================================================

/**
 * Build the complete roof review data from all sources.
 */
export function buildRoofReview(
  spec: MultiRoofSpec,
  planFile: PlanFile | null = null,
  calibration: ScaleCalibration | null = null,
  edgeSummary: EdgeSummary | null = null,
  sectionCutouts: Map<string, RoofCutout[]> = new Map(),
  sectionPipelines: Map<string, RoofAreaPipelineResult> = new Map(),
): RoofReviewData {
  const sections: SectionReviewItem[] = [];
  const issues: ReviewIssue[] = [];

  // ── Plan source issue ──
  if (!planFile) {
    issues.push({
      sectionId: null,
      sectionName: null,
      severity: 'info',
      message: 'No plan imported. Roof data entered manually.',
    });
  }

  // ── Calibration issue ──
  if (!calibration?.calibrated) {
    issues.push({
      sectionId: null,
      sectionName: null,
      severity: 'warning',
      message: 'Scale not calibrated. Pixel-to-meter conversion unavailable.',
    });
  }

  // ── Per-section review ──
  for (const section of spec.sections) {
    const missing = getSectionMissing(section);
    const cutouts = sectionCutouts.get(section.id) ?? [];
    const pipeline = sectionPipelines.get(section.id) ?? null;

    const pitchStatus: SectionReviewItem['pitchStatus'] =
      section.roofType === 'flat'
        ? 'not_required'
        : section.pitchDegrees !== null
          ? 'provided'
          : 'missing';

    const areaStatus: SectionReviewItem['areaStatus'] =
      (section.planAreaM2 !== null && section.planAreaM2 > 0) ||
      (section.geometry !== null)
        ? 'provided'
        : 'missing';

    // Issues for this section
    if (areaStatus === 'missing') {
      issues.push({
        sectionId: section.id,
        sectionName: section.name,
        severity: 'error',
        message: `${section.name}: Area is missing. Trace geometry or enter plan area.`,
      });
    }

    if (pitchStatus === 'missing') {
      issues.push({
        sectionId: section.id,
        sectionName: section.name,
        severity: 'error',
        message: `${section.name}: Pitch is required for accurate surface area.`,
      });
    }

    if (!section.confirmed) {
      issues.push({
        sectionId: section.id,
        sectionName: section.name,
        severity: 'warning',
        message: `${section.name}: Section not yet confirmed.`,
      });
    }

    sections.push({
      sectionId: section.id,
      sectionName: section.name,
      roofType: section.roofType,
      roofingMaterial: section.roofingMaterial,
      pitchDegrees: section.pitchDegrees,
      pitchStatus,
      planAreaM2: section.planAreaM2,
      areaStatus,
      cutouts,
      cutoutCount: cutouts.length,
      areaPipeline: pipeline,
      missing,
      confirmed: section.confirmed,
    });
  }

  // ── Multi-roof calculation ──
  const multiRoofCalc = calculateMultiRoof(spec);

  // ── Readiness score ──
  let readinessScore = 0;

  // Plan imported (10 points)
  if (planFile) readinessScore += 10;

  // Calibrated (15 points)
  if (calibration?.calibrated) readinessScore += 15;

  // Sections complete (50 points, split across sections)
  if (spec.sections.length > 0) {
    const perSection = 50 / spec.sections.length;
    for (const section of spec.sections) {
      const missing = getSectionMissing(section);
      if (missing.length === 0) readinessScore += perSection;
    }
  }

  // All sections confirmed (15 points)
  if (spec.sections.length > 0 && spec.sections.every(s => s.confirmed)) {
    readinessScore += 15;
  }

  // Edges reviewed (10 points)
  if (edgeSummary && edgeSummary.unconfirmedCount === 0) {
    readinessScore += 10;
  }

  readinessScore = Math.round(readinessScore);

  // ── Ready for estimation? ──
  const hasErrors = issues.some(i => i.severity === 'error');
  const allSectionsComplete = spec.sections.length > 0 &&
    spec.sections.every(s => getSectionMissing(s).length === 0);
  const readyForEstimation = !hasErrors && allSectionsComplete;

  return {
    planFile,
    calibration,
    sections,
    edgeSummary,
    multiRoofCalc,
    readinessScore,
    readyForEstimation,
    issues,
  };
}

// =========================================================
// Issue Helpers
// =========================================================

export function getErrorIssues(review: RoofReviewData): ReviewIssue[] {
  return review.issues.filter(i => i.severity === 'error');
}

export function getWarningIssues(review: RoofReviewData): ReviewIssue[] {
  return review.issues.filter(i => i.severity === 'warning');
}

export function getInfoIssues(review: RoofReviewData): ReviewIssue[] {
  return review.issues.filter(i => i.severity === 'info');
}

/**
 * Get a human-readable readiness label.
 */
export function getReadinessLabel(score: number): string {
  if (score >= 90) return 'Ready for estimation';
  if (score >= 70) return 'Almost ready — review warnings';
  if (score >= 50) return 'Needs attention — missing data';
  return 'Not ready — critical data missing';
}
