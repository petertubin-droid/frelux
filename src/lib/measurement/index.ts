/**
 * FRELUX UNIFIED MEASUREMENT SYSTEM
 *
 * Barrel export for the centralized measurement architecture.
 *
 * ONE SHARED MEASUREMENT SYSTEM + SPECIALIZED CALCULATION ENGINES
 *
 * Import from here:
 *   import { toMeters, calculateMeasurementProject, ... } from '@/lib/measurement';
 */

// ── Unit Conversion ──
export {
  type LengthUnit,
  type AreaUnit,
  type CalculatorContext,
  type TileSizeUnit,
  FT_TO_M,
  INCH_TO_M,
  M_TO_FT,
  SQM_TO_SQFT,
  SQFT_TO_SQM,
  toMeters,
  fromMeters,
  toSqMeters,
  fromSqMeters,
  sqftToSqm,
  sqmToSqft,
  getAllowedUnits,
  isInchesAllowed,
  lengthUnitLabel,
  lengthUnitShort,
  areaUnitLabel,
  tileDimensionToMeters,
  tileAreaM2,
} from './units';

// ── Types ──
export {
  type SpaceType,
  SPACE_TYPE_LABELS,
  DEFAULT_SPACE_TYPES,
  type SurfaceType,
  SURFACE_TYPE_LABELS,
  type ProjectMode,
  PROJECT_MODE_LABELS,
  type TilePackagingMethod,
  type TileConfig,
  type MeasurementEntry,
  type MeasurementGroup,
  type MeasurementSection,
  type MeasurementProject,
  type CalculationStep,
  type MeasurementEntryResult,
  type MeasurementGroupResult,
  type MeasurementSectionResult,
  type MeasurementProjectResult,
} from './types';

// ── Validation ──
export {
  type ValidationResult,
  createValidationResult,
  validateMeasurementEntry,
  validateTileConfig,
  validateMeasurementProject,
  isValidDimension,
  isValidQuantity,
} from './validation';

// ── Geometry ──
export {
  wallAreaM2,
  ceilingAreaM2,
  floorAreaM2,
  singleSurfaceAreaM2,
  fenceDimensionAreaM2,
  rectangularAreaM2,
  openingAreaM2,
  netAreaM2,
  tilesRequired,
  cartonsFromTileCount,
  cartonsFromCoverage,
  applyWasteMargin,
  roundForDisplay,
  roundUpToWholeUnit,
  makeStep,
  formatM2,
  formatCount,
} from './geometry';

// ── Hierarchy Engine ──
export {
  calculateMeasurementEntry,
  calculateMeasurementGroup,
  calculateMeasurementSection,
  calculateMeasurementProject,
  calculateTileRequirement,
  type TileCalculationResult,
} from './hierarchy';

// ── Project Factory ──
export {
  createMeasurementProject,
  createMeasurementSection,
  createMeasurementGroup,
  createMeasurementEntry,
  generateId,
} from './factory';

// ── React Hook ──
export {
  useMeasurementProject,
  type UseMeasurementProjectOptions,
  type UseMeasurementProjectReturn,
} from './use-measurement-project';

// ── Engine Bridges ──
export {
  bridgeScreeding,
  bridgeTiling,
  bridgePainting,
  bridgeGrafitex,
  aggregateTilingResults,
  type GrafitexBridgeResult,
} from './bridges';
