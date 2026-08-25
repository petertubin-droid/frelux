/**
 * FRELUX MEASUREMENT VALIDATION (spec section 27)
 *
 * Rejects or flags invalid measurements with clear, specific error messages.
 * Never silently produces a result from incomplete data.
 */

import type { MeasurementEntry, MeasurementProject } from './types';
import type { CalculatorContext } from './units';
import { getAllowedUnits, isInchesAllowed, lengthUnitLabel } from './units';

// =========================================================
// Single Entry Validation
// =========================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function createValidationResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

/**
 * Validate a single measurement entry.
 * Returns specific error messages telling the user exactly what to correct.
 */
export function validateMeasurementEntry(
  entry: MeasurementEntry,
  context: CalculatorContext,
): ValidationResult {
  const result = createValidationResult();

  // --- Unit validation ---
  if (!entry.unit || !isFinite(entry.unit.length)) {
    result.errors.push('A measurement unit is required.');
    result.valid = false;
  } else {
    const allowed = getAllowedUnits(context);
    if (!allowed.includes(entry.unit)) {
      result.errors.push(
        `Unit "${lengthUnitLabel(entry.unit)}" is not allowed for ${context}. Allowed units: ${allowed.map(lengthUnitLabel).join(', ')}.`,
      );
      result.valid = false;
    }
    // Explicit inches check (spec section 21–22)
    if (entry.unit === 'inches' && !isInchesAllowed(context)) {
      result.errors.push(
        'Inches are only available in the Block calculator. Use feet or metres instead.',
      );
      result.valid = false;
    }
  }

  // --- Dimensions: reject zero, negative, missing, infinite, NaN ---
  const dims: Array<[string, number | undefined]> = [
    ['Length', entry.length],
    ['Width', entry.width],
    ['Height', entry.height],
  ];

  for (const [label, val] of dims) {
    if (val === undefined) continue; // optional dimension
    if (val === 0) {
      result.errors.push(`${label} cannot be zero.`);
      result.valid = false;
    } else if (val < 0) {
      result.errors.push(`${label} cannot be negative.`);
      result.valid = false;
    } else if (!isFinite(val) || isNaN(val)) {
      result.errors.push(`${label} must be a valid number.`);
      result.valid = false;
    }
  }

  // --- Length is always required ---
  if (entry.length === undefined || entry.length <= 0 || !isFinite(entry.length)) {
    if (!result.errors.some((e) => e.startsWith('Length'))) {
      result.errors.push('Length is required and must be greater than 0.');
      result.valid = false;
    }
  }

  // --- Quantity validation ---
  if (entry.quantity === undefined || entry.quantity < 1 || !isFinite(entry.quantity)) {
    result.errors.push('Quantity must be at least 1.');
    result.valid = false;
  } else if (entry.quantity < 0) {
    result.errors.push('Quantity cannot be negative.');
    result.valid = false;
  }

  // --- Waste margin validation ---
  if (entry.wasteMarginPercent !== undefined) {
    if (entry.wasteMarginPercent < 0) {
      result.errors.push('Waste allowance cannot be negative.');
      result.valid = false;
    } else if (entry.wasteMarginPercent > 100) {
      result.errors.push('Waste allowance cannot exceed 100%.');
      result.valid = false;
    }
  }

  // --- Fence partition validation (spec section 11) ---
  if (entry.partitionCount !== undefined) {
    if (entry.partitionCount < 1 || !isFinite(entry.partitionCount)) {
      result.errors.push('Fence partition count must be at least 1.');
      result.valid = false;
    }
    // Fence partitions require height
    if (!entry.height || entry.height <= 0) {
      result.errors.push('Fence partition height is required.');
      result.valid = false;
    }
  }

  // --- Door/window validation ---
  if (entry.doors !== undefined && entry.doors < 0) {
    result.errors.push('Number of doors cannot be negative.');
    result.valid = false;
  }
  if (entry.windows !== undefined && entry.windows < 0) {
    result.errors.push('Number of windows cannot be negative.');
    result.valid = false;
  }

  return result;
}

// =========================================================
// Tile Config Validation (spec section 27)
// =========================================================

export function validateTileConfig(
  tileConfig: NonNullable<MeasurementEntry['tileConfig']>,
): ValidationResult {
  const result = createValidationResult();

  // Tile dimensions
  if (!tileConfig.tileLength || tileConfig.tileLength <= 0) {
    result.errors.push('Tile length is required and must be greater than 0.');
    result.valid = false;
  }
  if (!tileConfig.tileWidth || tileConfig.tileWidth <= 0) {
    result.errors.push('Tile width is required and must be greater than 0.');
    result.valid = false;
  }

  if (!result.valid) return result;

  // Packaging method validation
  if (tileConfig.packagingMethod === 'tiles_per_carton') {
    if (!tileConfig.tilesPerCarton || tileConfig.tilesPerCarton <= 0) {
      result.errors.push('Tiles per carton is required and must be greater than 0.');
      result.valid = false;
    }
  } else if (tileConfig.packagingMethod === 'carton_coverage') {
    if (!tileConfig.cartonCoverageM2 || tileConfig.cartonCoverageM2 <= 0) {
      result.errors.push('Carton coverage (m²) is required and must be greater than 0.');
      result.valid = false;
    }
  }

  return result;
}

// =========================================================
// Project-Level Validation
// =========================================================

/**
 * Validate an entire measurement project.
 * Checks that sections have groups, groups have entries, and all entries are valid.
 */
export function validateMeasurementProject(
  project: MeasurementProject,
): ValidationResult {
  const result = createValidationResult();

  if (!project.sections || project.sections.length === 0) {
    result.errors.push('Add at least one measurement before calculating.');
    result.valid = false;
    return result;
  }

  for (const section of project.sections) {
    if (!section.groups || section.groups.length === 0) {
      result.errors.push(`Section "${section.label}" has no measurements. Add at least one.`);
      result.valid = false;
      continue;
    }

    for (const group of section.groups) {
      const entryResult = validateMeasurementEntry(group.entry, project.calculatorContext);
      if (!entryResult.valid) {
        result.errors.push(`In "${group.label}": ${entryResult.errors.join(' ')}`);
        result.valid = false;
      }

      // Tile config validation for tiling context
      if (
        project.calculatorContext === 'tiling' &&
        group.entry.tileConfig
      ) {
        const tileResult = validateTileConfig(group.entry.tileConfig);
        if (!tileResult.valid) {
          result.errors.push(`In "${group.label}": ${tileResult.errors.join(' ')}`);
          result.valid = false;
        }
      }

      // Merge warnings
      result.warnings.push(...entryResult.warnings);
    }
  }

  return result;
}

// =========================================================
// Quick Validation Helpers
// =========================================================

export function isValidDimension(value: number | undefined): boolean {
  return value !== undefined && value > 0 && isFinite(value) && !isNaN(value);
}

export function isValidQuantity(value: number | undefined): boolean {
  return value !== undefined && value >= 1 && isFinite(value);
}
