/**
 * FRELUX ROOF SECTION MODEL — Calculation Engine
 *
 * Calculates per-section roof quantities (area, sheets, ridge, hip, fascia, timber)
 * for a multi-section roof specification.
 *
 * This engine does NOT replace the existing build-to-roof engine.
 * It adds multi-section capability that runs alongside the legacy single-roof
 * calculation. The existing calculateBuildToRoof() is untouched.
 *
 * Feature 4: Roof Facet / Section Engine
 */

import type {
  RoofSectionSpec,
  MultiRoofSpec,
  RoofSectionCalculation,
  MultiRoofCalculation,
} from './section-model-types';
import type { RoofType } from '@/types/build-to-roof';
import {
  calculateRoofArea,
  roofingSheetsCount,
  getSheetCoverage,
  calculateRidgeLength,
  calculateHipLength,
  calculateFasciaLength,
  estimateTimberMeters,
  SHEET_COVERAGE,
  SCREWS_PER_SHEET,
  RAFTER_SPACING,
} from '@/lib/estimation/build-to-roof-engine';
import { calculateRoofGeometry } from './geometry-engine';

// =========================================================
// Helpers
// =========================================================

/**
 * Calculate pitch-adjusted surface area from plan area and pitch.
 *
 * For flat roofs: surface = plan area
 * For pitched roofs: surface = plan area / cos(pitch)
 *
 * Returns 0 if plan area is invalid.
 * Returns plan area (unadjusted) if pitch is null (pitch required).
 */
export function pitchAdjustedArea(
  planAreaM2: number,
  pitchDegrees: number | null,
  roofType: RoofType,
): number {
  if (planAreaM2 <= 0) return 0;

  if (roofType === 'flat') return planAreaM2;

  if (pitchDegrees === null || pitchDegrees <= 0) {
    // Cannot calculate pitched area without pitch — return plan area
    // The UI must show "PITCH REQUIRED" in this case
    return planAreaM2;
  }

  const pitchRad = (pitchDegrees * Math.PI) / 180;
  if (Math.abs(pitchDegrees - 90) < 0.01) return planAreaM2; // vertical

  return planAreaM2 / Math.cos(pitchRad);
}

/**
 * Determine the effective plan area for a section.
 * Uses traced geometry if available, otherwise uses manual area input.
 */
export function getSectionPlanArea(section: RoofSectionSpec): number {
  // If geometry is provided and has valid sections, use it
  if (section.geometry && section.geometry.sections.length > 0) {
    const calc = calculateRoofGeometry(section.geometry);
    if (calc.totalPlanAreaM2 > 0) return calc.totalPlanAreaM2;
  }

  // Fall back to manual area
  return section.planAreaM2 ?? 0;
}

/**
 * Check if a section has complete data for calculation.
 * Returns what's missing.
 */
export function getSectionMissing(section: RoofSectionSpec): string[] {
  const missing: string[] = [];

  const planArea = getSectionPlanArea(section);
  if (planArea <= 0) {
    missing.push('area (trace geometry or enter plan area)');
  }

  if (section.roofType !== 'flat' && section.pitchDegrees === null) {
    missing.push('pitch');
  }

  return missing;
}

// =========================================================
// Section Calculation
// =========================================================

/**
 * Calculate quantities for a single roof section.
 */
export function calculateRoofSection(section: RoofSectionSpec): RoofSectionCalculation {
  const missing = getSectionMissing(section);
  const complete = missing.length === 0;

  const planAreaM2 = getSectionPlanArea(section);
  const surfaceAreaM2 = complete
    ? pitchAdjustedArea(planAreaM2, section.pitchDegrees, section.roofType)
    : 0;

  // Only calculate derived quantities if the section is complete
  if (!complete) {
    return {
      sectionId: section.id,
      sectionName: section.name,
      planAreaM2,
      pitchDegrees: section.pitchDegrees,
      surfaceAreaM2: 0,
      roofType: section.roofType,
      roofingMaterial: section.roofingMaterial,
      sheetCount: 0,
      ridgeLengthM: 0,
      hipLengthM: 0,
      fasciaLengthM: 0,
      timberM: 0,
      complete: false,
      missing,
    };
  }

  // Roofing sheets
  const sheetCoverage = getSheetCoverage(section.roofingMaterial);
  const sheetCount = roofingSheetsCount(surfaceAreaM2, sheetCoverage);

  // For ridge/hip/fascia, we need building dimensions which come from geometry
  // If geometry has vertices, we can derive approximate building dimensions
  // For now, use the plan area to estimate equivalent square dimensions
  const equivalentSide = Math.sqrt(planAreaM2); // approximate L = W = sqrt(area)
  const effectiveLength = equivalentSide;
  const effectiveWidth = equivalentSide;

  const ridgeLengthM = calculateRidgeLength(effectiveLength, effectiveWidth, section.roofType);
  const hipLengthM = section.roofType === 'hip'
    ? calculateHipLength(effectiveLength, effectiveWidth, section.pitchDegrees ?? 0)
    : 0;
  const fasciaLengthM = calculateFasciaLength(effectiveLength, effectiveWidth, section.overhangM);
  const timberM = estimateTimberMeters(
    surfaceAreaM2,
    effectiveLength,
    effectiveWidth,
    section.pitchDegrees ?? 0,
    section.overhangM,
    section.roofType,
  );

  return {
    sectionId: section.id,
    sectionName: section.name,
    planAreaM2,
    pitchDegrees: section.pitchDegrees,
    surfaceAreaM2,
    roofType: section.roofType,
    roofingMaterial: section.roofingMaterial,
    sheetCount,
    ridgeLengthM,
    hipLengthM,
    fasciaLengthM,
    timberM,
    complete: true,
    missing: [],
  };
}

// =========================================================
// Full Multi-Roof Calculation
// =========================================================

/**
 * Calculate all sections and aggregate totals.
 */
export function calculateMultiRoof(spec: MultiRoofSpec): MultiRoofCalculation {
  const sections: RoofSectionCalculation[] = [];
  let totalPlanAreaM2 = 0;
  let totalSurfaceAreaM2 = 0;
  let totalSheetCount = 0;
  let totalRidgeLengthM = 0;
  let totalHipLengthM = 0;
  let totalFasciaLengthM = 0;
  let totalTimberM = 0;
  let completeSectionCount = 0;

  for (const section of spec.sections) {
    const calc = calculateRoofSection(section);
    sections.push(calc);

    if (calc.complete) {
      totalPlanAreaM2 += calc.planAreaM2;
      totalSurfaceAreaM2 += calc.surfaceAreaM2;
      totalSheetCount += calc.sheetCount;
      totalRidgeLengthM += calc.ridgeLengthM;
      totalHipLengthM += calc.hipLengthM;
      totalFasciaLengthM += calc.fasciaLengthM;
      totalTimberM += calc.timberM;
      completeSectionCount += 1;
    }
  }

  return {
    sections,
    totalPlanAreaM2,
    totalSurfaceAreaM2,
    totalSheetCount,
    totalRidgeLengthM,
    totalHipLengthM,
    totalFasciaLengthM,
    totalTimberM,
    completeSectionCount,
    confirmed: spec.confirmed,
  };
}

// =========================================================
// Section Factory
// =========================================================

let sectionIdCounter = 0;

export function createRoofSectionSpec(
  name: string = 'New Section',
): RoofSectionSpec {
  sectionIdCounter += 1;
  return {
    id: `sec_spec_${Date.now()}_${sectionIdCounter}`,
    name,
    geometry: null,
    planAreaM2: null,
    pitchDegrees: null,
    roofType: 'gable',
    roofingMaterial: 'long_span_aluminium',
    overhangM: 0.6,
    wastePercent: 5,
    confirmed: false,
  };
}

/**
 * Create a default multi-roof spec with one section.
 */
export function createDefaultMultiRoofSpec(): MultiRoofSpec {
  const section = createRoofSectionSpec('Main Roof');
  return {
    sections: [section],
    useMultiSection: false,
    confirmed: false,
  };
}

// =========================================================
// Section Management
// =========================================================

export function addRoofSection(
  spec: MultiRoofSpec,
  name: string,
): MultiRoofSpec {
  const newSection = createRoofSectionSpec(name);
  return {
    ...spec,
    sections: [...spec.sections, newSection],
    confirmed: false,
  };
}

export function removeRoofSection(
  spec: MultiRoofSpec,
  sectionId: string,
): MultiRoofSpec {
  return {
    ...spec,
    sections: spec.sections.filter(s => s.id !== sectionId),
    confirmed: false,
  };
}

export function updateRoofSection(
  spec: MultiRoofSpec,
  sectionId: string,
  updates: Partial<RoofSectionSpec>,
): MultiRoofSpec {
  return {
    ...spec,
    sections: spec.sections.map(s =>
      s.id === sectionId ? { ...s, ...updates, confirmed: false } : s
    ),
    confirmed: false,
  };
}

export function renameRoofSection(
  spec: MultiRoofSpec,
  sectionId: string,
  name: string,
): MultiRoofSpec {
  return {
    ...spec,
    sections: spec.sections.map(s =>
      s.id === sectionId ? { ...s, name } : s
    ),
  };
}

export function confirmMultiRoofSpec(spec: MultiRoofSpec): MultiRoofSpec {
  return {
    ...spec,
    sections: spec.sections.map(s => ({ ...s, confirmed: true })),
    confirmed: true,
  };
}
