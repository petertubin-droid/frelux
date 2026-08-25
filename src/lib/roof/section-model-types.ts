/**
 * FRELUX ROOF SECTION MODEL — Types
 *
 * Defines the data model for multiple roof sections/facets.
 * Each section stores its own geometry, pitch, roof type, material,
 * waste, and notes.
 *
 * Feature 4: Roof Facet / Section Engine
 */

import type { RoofGeometry } from './geometry-types';
import type { RoofType, RoofingMaterial } from '@/types/build-to-roof';

// =========================================================
// Roof Section Specification
// =========================================================

/**
 * A roof section with full specification for calculation.
 *
 * This extends RoofSectionGeometry (which only stores the traced polygon)
 * with calculation parameters: pitch, roof type, material, waste, notes.
 */
export interface RoofSectionSpec {
  id: string;
  /** Display name (e.g. "Main Roof", "Garage", "Porch") */
  name: string;
  /** Traced geometry (polygon vertices) — may be null when using footprint mode */
  geometry: RoofGeometry | null;
  /** Manual plan area in m² (when geometry not traced) */
  planAreaM2: number | null;
  /** Roof pitch in degrees */
  pitchDegrees: number | null;
  /** Roof type for this section */
  roofType: RoofType;
  /** Roofing material for this section */
  roofingMaterial: RoofingMaterial;
  /** Overhang in meters */
  overhangM: number;
  /** Waste percentage for roofing sheets */
  wastePercent: number;
  /** Notes */
  notes?: string;
  /** Whether the user has confirmed this section's data */
  confirmed: boolean;
}

// =========================================================
// Multi-Roof Model
// =========================================================

/**
 * Complete multi-section roof specification for a building.
 */
export interface MultiRoofSpec {
  sections: RoofSectionSpec[];
  /** Whether to use multi-section mode (vs legacy single-roof mode) */
  useMultiSection: boolean;
  /** Whether the entire roof spec has been user-verified */
  confirmed: boolean;
}

// =========================================================
// Section Calculation Result
// =========================================================

/**
 * Calculation result for a single roof section.
 */
export interface RoofSectionCalculation {
  sectionId: string;
  sectionName: string;
  /** Horizontal (plan) area in m² */
  planAreaM2: number;
  /** Pitch in degrees (null if not specified) */
  pitchDegrees: number | null;
  /** Pitch-adjusted surface area in m² */
  surfaceAreaM2: number;
  /** Roof type */
  roofType: RoofType;
  /** Roofing material */
  roofingMaterial: RoofingMaterial;
  /** Number of roofing sheets needed */
  sheetCount: number;
  /** Ridge length in meters */
  ridgeLengthM: number;
  /** Hip length in meters */
  hipLengthM: number;
  /** Fascia length in meters */
  fasciaLengthM: number;
  /** Timber needed in meters */
  timberM: number;
  /** Whether this section has complete data for calculation */
  complete: boolean;
  /** What's missing (if anything) */
  missing: string[];
}

// =========================================================
// Full Multi-Roof Calculation
// =========================================================

/**
 * Complete calculation result for a multi-section roof.
 */
export interface MultiRoofCalculation {
  sections: RoofSectionCalculation[];
  /** Total plan area across all sections */
  totalPlanAreaM2: number;
  /** Total surface area across all sections */
  totalSurfaceAreaM2: number;
  /** Total sheet count */
  totalSheetCount: number;
  /** Total ridge length */
  totalRidgeLengthM: number;
  /** Total hip length */
  totalHipLengthM: number;
  /** Total fascia length */
  totalFasciaLengthM: number;
  /** Total timber */
  totalTimberM: number;
  /** Number of complete (calculable) sections */
  completeSectionCount: number;
  /** Whether all sections are confirmed */
  confirmed: boolean;
}
