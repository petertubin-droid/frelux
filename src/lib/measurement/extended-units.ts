/**
 * FRELUX UNIVERSAL MEASUREMENT ENGINE — Extended Units
 *
 * ADDITIVE EXTENSION to the existing measurement/units.ts.
 * Does NOT modify existing LengthUnit, AreaUnit, or any existing function.
 *
 * Adds:
 * - Extended length units: millimetres (mm), centimetres (cm)
 * - Volume units: cubic metres (m³), cubic feet (ft³), litres (L)
 * - Quantity/package units: pieces, bags, buckets, cartons, packs, sheets, rolls, partitions, other
 * - Conversion functions for all new units
 * - Calculator-declared supported units
 *
 * All internal calculations continue to use:
 * - Metres for length (canonical)
 * - Square metres for area (canonical)
 * - Cubic metres for volume (canonical)
 * - Individual pieces for quantity (canonical)
 *
 * The user's input unit is a presentation/input preference.
 * It must NOT change the underlying mathematical accuracy.
 */

import type { LengthUnit, CalculatorContext } from './units';
import { FT_TO_M, INCH_TO_M } from './units';

// =========================================================
// EXTENDED LENGTH UNITS
// =========================================================

/**
 * Extended length units including mm and cm.
 * The existing LengthUnit ('feet' | 'meters' | 'inches') is a subset.
 */
export type ExtendedLengthUnit = LengthUnit | 'millimeters' | 'centimeters';

/** 1 millimetre = 0.001 metres */
export const MM_TO_M = 0.001;

/** 1 centimetre = 0.01 metres */
export const CM_TO_M = 0.01;

/** 1 metre = 1000 millimetres */
export const M_TO_MM = 1000;

/** 1 metre = 100 centimetres */
export const M_TO_CM = 100;

/**
 * Convert a length value from an extended unit to metres (canonical).
 * Works with both existing LengthUnit and new ExtendedLengthUnit.
 */
export function toMetersExtended(value: number, unit: ExtendedLengthUnit): number {
  switch (unit) {
    case 'meters':
      return value;
    case 'feet':
      return value * FT_TO_M;
    case 'inches':
      return value * INCH_TO_M;
    case 'millimeters':
      return value * MM_TO_M;
    case 'centimeters':
      return value * CM_TO_M;
    default:
      throw new Error(`Unknown length unit: ${unit}`);
  }
}

/**
 * Convert metres to an extended length unit for display.
 */
export function fromMetersExtended(valueM: number, unit: ExtendedLengthUnit): number {
  switch (unit) {
    case 'meters':
      return valueM;
    case 'feet':
      return valueM / FT_TO_M;
    case 'inches':
      return valueM / INCH_TO_M;
    case 'millimeters':
      return valueM / MM_TO_M;
    case 'centimeters':
      return valueM / CM_TO_M;
    default:
      throw new Error(`Unknown length unit: ${unit}`);
  }
}

/**
 * Convert between any two extended length units.
 */
export function convertLength(
  value: number,
  from: ExtendedLengthUnit,
  to: ExtendedLengthUnit,
): number {
  const meters = toMetersExtended(value, from);
  return fromMetersExtended(meters, to);
}

/**
 * Human-readable label for an extended length unit.
 */
export function extendedLengthUnitLabel(unit: ExtendedLengthUnit): string {
  switch (unit) {
    case 'feet':
      return 'Feet';
    case 'meters':
      return 'Metres';
    case 'inches':
      return 'Inches';
    case 'millimeters':
      return 'Millimetres';
    case 'centimeters':
      return 'Centimetres';
    default:
      return unit;
  }
}

/**
 * Human-readable short label for an extended length unit.
 */
export function extendedLengthUnitShort(unit: ExtendedLengthUnit): string {
  switch (unit) {
    case 'feet':
      return 'ft';
    case 'meters':
      return 'm';
    case 'inches':
      return 'in';
    case 'millimeters':
      return 'mm';
    case 'centimeters':
      return 'cm';
    default:
      return unit;
  }
}

// =========================================================
// VOLUME UNITS
// =========================================================

export type VolumeUnit = 'cubic_meters' | 'cubic_feet' | 'litres';

/** 1 cubic foot = 0.028316846592 cubic metres (exact, derived from FT_TO_M³) */
export const CUBIC_FT_TO_CUBIC_M = FT_TO_M * FT_TO_M * FT_TO_M;

/** 1 cubic metre = 1000 litres (exact) */
export const CUBIC_M_TO_LITRES = 1000;

/** 1 litre = 0.001 cubic metres */
export const LITRES_TO_CUBIC_M = 0.001;

/** 1 cubic metre = 35.3147 cubic feet (derived) */
export const CUBIC_M_TO_CUBIC_FT = 1 / CUBIC_FT_TO_CUBIC_M;

/**
 * Convert a volume value to cubic metres (canonical internal unit).
 */
export function toCubicMeters(value: number, unit: VolumeUnit): number {
  switch (unit) {
    case 'cubic_meters':
      return value;
    case 'cubic_feet':
      return value * CUBIC_FT_TO_CUBIC_M;
    case 'litres':
      return value * LITRES_TO_CUBIC_M;
    default:
      throw new Error(`Unknown volume unit: ${unit}`);
  }
}

/**
 * Convert cubic metres to a volume unit for display.
 */
export function fromCubicMeters(valueM3: number, unit: VolumeUnit): number {
  switch (unit) {
    case 'cubic_meters':
      return valueM3;
    case 'cubic_feet':
      return valueM3 * CUBIC_M_TO_CUBIC_FT;
    case 'litres':
      return valueM3 * CUBIC_M_TO_LITRES;
    default:
      throw new Error(`Unknown volume unit: ${unit}`);
  }
}

/**
 * Convert between any two volume units.
 */
export function convertVolume(
  value: number,
  from: VolumeUnit,
  to: VolumeUnit,
): number {
  const m3 = toCubicMeters(value, from);
  return fromCubicMeters(m3, to);
}

/**
 * Human-readable label for a volume unit.
 */
export function volumeUnitLabel(unit: VolumeUnit): string {
  switch (unit) {
    case 'cubic_meters':
      return 'Cubic Metres (m³)';
    case 'cubic_feet':
      return 'Cubic Feet (ft³)';
    case 'litres':
      return 'Litres (L)';
    default:
      return unit;
  }
}

/**
 * Human-readable short label for a volume unit.
 */
export function volumeUnitShort(unit: VolumeUnit): string {
  switch (unit) {
    case 'cubic_meters':
      return 'm³';
    case 'cubic_feet':
      return 'ft³';
    case 'litres':
      return 'L';
    default:
      return unit;
  }
}

// =========================================================
// QUANTITY / PACKAGE UNITS
// =========================================================

export type QuantityUnit =
  | 'pieces'
  | 'bags'
  | 'buckets'
  | 'cartons'
  | 'packs'
  | 'sheets'
  | 'rolls'
  | 'partitions'
  | 'other';

export const QUANTITY_UNIT_LABELS: Record<QuantityUnit, string> = {
  pieces: 'Pieces',
  bags: 'Bags',
  buckets: 'Buckets',
  cartons: 'Cartons',
  packs: 'Packs',
  sheets: 'Sheets',
  rolls: 'Rolls',
  partitions: 'Partitions',
  other: 'Other',
};

export const QUANTITY_UNIT_SHORT: Record<QuantityUnit, string> = {
  pieces: 'pcs',
  bags: 'bags',
  buckets: 'buckets',
  cartons: 'cartons',
  packs: 'packs',
  sheets: 'sheets',
  rolls: 'rolls',
  partitions: 'partitions',
  other: 'units',
};

/**
 * Human-readable label for a quantity unit.
 */
export function quantityUnitLabel(unit: QuantityUnit): string {
  return QUANTITY_UNIT_LABELS[unit] ?? unit;
}

/**
 * Human-readable short label for a quantity unit.
 */
export function quantityUnitShort(unit: QuantityUnit): string {
  return QUANTITY_UNIT_SHORT[unit] ?? unit;
}

// =========================================================
// CALCULATOR-DECLARED SUPPORTED UNITS
// =========================================================

/**
 * Each calculator can declare which units it supports.
 * This replaces hardcoded global unit availability.
 */
export interface CalculatorUnitSupport {
  /** Calculator context key */
  context: CalculatorContext;
  /** Supported length units for input */
  lengthUnits: ExtendedLengthUnit[];
  /** Whether area input is supported (sqft / sqm) */
  supportsAreaInput: boolean;
  /** Whether volume input is supported */
  supportsVolumeInput: boolean;
  /** Supported volume units (if volume input is supported) */
  volumeUnits?: VolumeUnit[];
  /** Supported quantity/package units for this calculator */
  quantityUnits: QuantityUnit[];
}

/**
 * Default unit support declarations for each calculator context.
 * These declare which units each calculator accepts.
 *
 * Inches are ONLY available for block-related measurements.
 */
export const CALCULATOR_UNIT_SUPPORT: Record<CalculatorContext, CalculatorUnitSupport> = {
  painting: {
    context: 'painting',
    lengthUnits: ['feet', 'meters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['buckets'],
  },
  screeding: {
    context: 'screeding',
    lengthUnits: ['feet', 'meters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['buckets', 'bags'],
  },
  tiling: {
    context: 'tiling',
    lengthUnits: ['feet', 'meters', 'millimeters', 'centimeters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['cartons', 'packs', 'pieces'],
  },
  grafitex: {
    context: 'grafitex',
    lengthUnits: ['feet', 'meters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['buckets', 'bags'],
  },
  block: {
    context: 'block',
    lengthUnits: ['feet', 'meters', 'inches'],
    supportsAreaInput: false,
    supportsVolumeInput: false,
    quantityUnits: ['pieces'],
  },
  pop: {
    context: 'pop',
    lengthUnits: ['feet', 'meters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['bags', 'pieces'],
  },
  tyrolene: {
    context: 'tyrolene',
    lengthUnits: ['feet', 'meters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['buckets'],
  },
  fence_screeding: {
    context: 'fence_screeding',
    lengthUnits: ['feet', 'meters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['buckets', 'bags'],
  },
  fence_painting: {
    context: 'fence_painting',
    lengthUnits: ['feet', 'meters'],
    supportsAreaInput: true,
    supportsVolumeInput: false,
    quantityUnits: ['buckets'],
  },
};

/**
 * Get the supported length units for a calculator context.
 * Uses the declarative unit support table.
 */
export function getSupportedLengthUnits(context: CalculatorContext): ExtendedLengthUnit[] {
  return CALCULATOR_UNIT_SUPPORT[context]?.lengthUnits ?? ['feet', 'meters'];
}

/**
 * Get the supported quantity units for a calculator context.
 */
export function getSupportedQuantityUnits(context: CalculatorContext): QuantityUnit[] {
  return CALCULATOR_UNIT_SUPPORT[context]?.quantityUnits ?? ['pieces'];
}

/**
 * Check if a specific length unit is supported by a calculator context.
 */
export function isLengthUnitSupported(context: CalculatorContext, unit: ExtendedLengthUnit): boolean {
  return getSupportedLengthUnits(context).includes(unit);
}

/**
 * Check if a specific quantity unit is supported by a calculator context.
 */
export function isQuantityUnitSupported(context: CalculatorContext, unit: QuantityUnit): boolean {
  return getSupportedQuantityUnits(context).includes(unit);
}

// =========================================================
// EXTENDED AREA CONVERSIONS
// =========================================================

/**
 * Convert an area from square centimetres to square metres.
 * 1 m² = 10,000 cm²
 */
export const SQCM_TO_SQM = 0.0001;

/**
 * Convert an area from square millimetres to square metres.
 * 1 m² = 1,000,000 mm²
 */
export const SQMM_TO_SQM = 0.000001;

/**
 * Extended area unit type.
 */
export type ExtendedAreaUnit = 'sqm' | 'sqft' | 'sqcm' | 'sqmm';

/**
 * Convert an area value to square metres (canonical).
 * Works with both existing AreaUnit and new extended units.
 */
export function toSqMetersExtended(value: number, unit: ExtendedAreaUnit): number {
  switch (unit) {
    case 'sqm':
      return value;
    case 'sqft':
      return value * FT_TO_M * FT_TO_M;
    case 'sqcm':
      return value * SQCM_TO_SQM;
    case 'sqmm':
      return value * SQMM_TO_SQM;
    default:
      throw new Error(`Unknown area unit: ${unit}`);
  }
}

/**
 * Convert square metres to an extended area unit for display.
 */
export function fromSqMetersExtended(valueSqm: number, unit: ExtendedAreaUnit): number {
  switch (unit) {
    case 'sqm':
      return valueSqm;
    case 'sqft':
      return valueSqm / (FT_TO_M * FT_TO_M);
    case 'sqcm':
      return valueSqm / SQCM_TO_SQM;
    case 'sqmm':
      return valueSqm / SQMM_TO_SQM;
    default:
      throw new Error(`Unknown area unit: ${unit}`);
  }
}

/**
 * Human-readable label for an extended area unit.
 */
export function extendedAreaUnitLabel(unit: ExtendedAreaUnit): string {
  switch (unit) {
    case 'sqm':
      return 'm²';
    case 'sqft':
      return 'ft²';
    case 'sqcm':
      return 'cm²';
    case 'sqmm':
      return 'mm²';
    default:
      return unit;
  }
}

// =========================================================
// UNIT SYSTEM PREFERENCE
// =========================================================

/**
 * A user's measurement system preference.
 * This determines default units for new measurements.
 * Does NOT restrict the user from choosing any supported unit.
 */
export type UnitSystemPreference = 'metric' | 'imperial' | 'mixed';

/**
 * Default length unit for a given system preference.
 */
export function defaultLengthUnitForSystem(system: UnitSystemPreference): ExtendedLengthUnit {
  switch (system) {
    case 'metric':
      return 'meters';
    case 'imperial':
      return 'feet';
    case 'mixed':
      return 'meters'; // mixed defaults to metric
    default:
      return 'meters';
  }
}

/**
 * Default area unit for a given system preference.
 */
export function defaultAreaUnitForSystem(system: UnitSystemPreference): ExtendedAreaUnit {
  switch (system) {
    case 'metric':
      return 'sqm';
    case 'imperial':
      return 'sqft';
    case 'mixed':
      return 'sqm';
    default:
      return 'sqm';
  }
}

/**
 * Default volume unit for a given system preference.
 */
export function defaultVolumeUnitForSystem(system: UnitSystemPreference): VolumeUnit {
  switch (system) {
    case 'metric':
      return 'litres';
    case 'imperial':
      return 'cubic_feet';
    case 'mixed':
      return 'litres';
    default:
      return 'litres';
  }
}
