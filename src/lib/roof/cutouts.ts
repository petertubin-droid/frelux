/**
 * FRELUX ROOF CUTOUTS — Management Engine
 *
 * Allows users to mark roof cutouts/penetrations:
 *   - skylight, courtyard, rooftop equipment, roof opening, other configurable
 *
 * Calculation:
 *   Gross roof area
 *   - verified cutout area
 *   = net roof area
 *
 * Feature 8: Roof Cutouts / Penetrations
 */

import type { RoofCutout } from './area-pipeline';

// =========================================================
// Cutout Types
// =========================================================

export const CUTOUT_TYPES = [
  { type: 'skylight', label: 'Skylight', icon: '◉' },
  { type: 'courtyard', label: 'Courtyard', icon: '▢' },
  { type: 'equipment', label: 'Rooftop Equipment', icon: '▣' },
  { type: 'opening', label: 'Roof Opening', icon: '○' },
  { type: 'other', label: 'Other', icon: '◇' },
] as const;

export type CutoutType = typeof CUTOUT_TYPES[number]['type'];

// =========================================================
// Cutout Factory
// =========================================================

let cutoutIdCounter = 0;

export function createCutout(
  name: string,
  areaM2: number,
  type: CutoutType = 'other',
): RoofCutout {
  cutoutIdCounter += 1;
  return {
    id: `cutout_${Date.now()}_${cutoutIdCounter}`,
    name,
    areaM2: Math.max(0, areaM2),
    type,
  };
}

// =========================================================
// Cutout Management
// =========================================================

export function addCutout(
  cutouts: RoofCutout[],
  name: string,
  areaM2: number,
  type: CutoutType = 'other',
): RoofCutout[] {
  return [...cutouts, createCutout(name, areaM2, type)];
}

export function updateCutout(
  cutouts: RoofCutout[],
  id: string,
  updates: Partial<Omit<RoofCutout, 'id'>>,
): RoofCutout[] {
  return cutouts.map(c =>
    c.id === id
      ? { ...c, ...updates, areaM2: Math.max(0, updates.areaM2 ?? c.areaM2) }
      : c
  );
}

export function deleteCutout(
  cutouts: RoofCutout[],
  id: string,
): RoofCutout[] {
  return cutouts.filter(c => c.id !== id);
}

// =========================================================
// Cutout Area Calculation
// =========================================================

/**
 * Calculate total cutout area.
 * Ignores negative values.
 */
export function totalCutoutArea(cutouts: RoofCutout[]): number {
  return cutouts.reduce((sum, c) => sum + Math.max(0, c.areaM2), 0);
}

/**
 * Calculate net area: gross - cutouts.
 * Never returns negative.
 */
export function netAreaAfterCutouts(
  grossAreaM2: number,
  cutouts: RoofCutout[],
): number {
  const cutoutArea = totalCutoutArea(cutouts);
  return Math.max(0, grossAreaM2 - cutoutArea);
}

// =========================================================
// Validation
// =========================================================

/**
 * Validate a cutout — returns error messages if invalid.
 */
export function validateCutout(cutout: RoofCutout): string[] {
  const errors: string[] = [];
  if (!cutout.name || cutout.name.trim() === '') {
    errors.push('Name is required');
  }
  if (cutout.areaM2 <= 0) {
    errors.push('Area must be greater than 0');
  }
  if (!CUTOUT_TYPES.some(t => t.type === cutout.type)) {
    errors.push('Invalid cutout type');
  }
  return errors;
}
