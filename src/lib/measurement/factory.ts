/**
 * FRELUX MEASUREMENT PROJECT FACTORY
 *
 * Helper functions to create measurement projects, sections, groups, and entries
 * with unique IDs and sensible defaults.
 */

import type {
  MeasurementEntry,
  MeasurementGroup,
  MeasurementSection,
  MeasurementProject,
} from './types';
import type { CalculatorContext, LengthUnit } from './units';
import { getAllowedUnits } from './units';

// =========================================================
// ID Generator
// =========================================================

let idCounter = 0;

/**
 * Generate a unique ID for measurement entities.
 * Uses a prefix + timestamp + counter for uniqueness.
 */
export function generateId(prefix: string = 'm'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

// =========================================================
// Factory Functions
// =========================================================

/**
 * Create a new measurement entry with defaults.
 */
export function createMeasurementEntry(
  partial: Partial<MeasurementEntry> = {},
): MeasurementEntry {
  return {
    id: generateId('entry'),
    length: 0,
    unit: 'feet',
    quantity: 1,
    ...partial,
  };
}

/**
 * Create a new measurement group with a single entry.
 */
export function createMeasurementGroup(
  label: string,
  entry: MeasurementEntry,
): MeasurementGroup {
  return {
    id: generateId('group'),
    label,
    entry,
  };
}

/**
 * Create a new measurement section.
 */
export function createMeasurementSection(
  label: string,
  groups: MeasurementGroup[] = [],
): MeasurementSection {
  return {
    id: generateId('section'),
    label,
    groups,
  };
}

/**
 * Create a new measurement project.
 */
export function createMeasurementProject(
  calculatorContext: CalculatorContext,
  preferredUnit?: LengthUnit,
): MeasurementProject {
  const allowed = getAllowedUnits(calculatorContext);
  const defaultUnit = preferredUnit && allowed.includes(preferredUnit)
    ? preferredUnit
    : allowed[0] ?? 'feet';

  return {
    id: generateId('project'),
    calculatorContext,
    projectMode: 'single_room',
    sections: [],
    preferredUnit: defaultUnit,
  };
}
