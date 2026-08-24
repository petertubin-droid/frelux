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

// ── Extended Units (Feature 1: Universal Measurement Engine) ──
export {
  type ExtendedLengthUnit,
  type VolumeUnit,
  type QuantityUnit,
  type ExtendedAreaUnit,
  type UnitSystemPreference,
  type CalculatorUnitSupport,
  MM_TO_M,
  CM_TO_M,
  M_TO_MM,
  M_TO_CM,
  CUBIC_FT_TO_CUBIC_M,
  CUBIC_M_TO_LITRES,
  LITRES_TO_CUBIC_M,
  CUBIC_M_TO_CUBIC_FT,
  SQCM_TO_SQM,
  SQMM_TO_SQM,
  QUANTITY_UNIT_LABELS,
  QUANTITY_UNIT_SHORT,
  CALCULATOR_UNIT_SUPPORT,
  toMetersExtended,
  fromMetersExtended,
  convertLength,
  extendedLengthUnitLabel,
  extendedLengthUnitShort,
  toCubicMeters,
  fromCubicMeters,
  convertVolume,
  volumeUnitLabel,
  volumeUnitShort,
  quantityUnitLabel,
  quantityUnitShort,
  getSupportedLengthUnits,
  getSupportedQuantityUnits,
  isLengthUnitSupported,
  isQuantityUnitSupported,
  toSqMetersExtended,
  fromSqMetersExtended,
  extendedAreaUnitLabel,
  defaultLengthUnitForSystem,
  defaultAreaUnitForSystem,
  defaultVolumeUnitForSystem,
} from './extended-units';

// ── Space Engine (Feature 2: Space Engine) ──
export {
  type FinishType,
  type SpaceOpening,
  type Space,
  type SpaceResult,
  type SpaceGroup,
  type SpaceGroupResult,
  type SpaceCollection,
  type SpaceCollectionResult,
  FINISH_TYPE_LABELS,
  createSpace,
  createOpening,
  createSpaceCollection,
  calculateSpace,
  calculateSpaceGroup,
  groupSpacesByType,
  calculateSpaceCollection,
  spaceToMeasurementEntry,
  spaceCollectionToMeasurementProject,
  totalAreaByFinishType,
  spaceSummary,
} from './space-engine';

// ── Project Engine (Feature 3: Project/Building Engine) ──
export {
  type ProjectElementType,
  type ProjectElement,
  type ProjectElementResult,
  type ConstructionProject,
  type ConstructionProjectResult,
  PROJECT_ELEMENT_TYPE_LABELS,
  createConstructionProject,
  createProjectElement,
  calculateProjectElement,
  calculateConstructionProject,
  projectToMeasurementProject,
  totalAreaByElementType,
  getSpacesByType,
  getSpacesByFinishType,
  getSpaceCount,
  elementSummary,
  finishTypeSummary,
} from './project-engine';

// ── Fence Engine (Feature 4: Fence Element Engine) ──
export {
  type FenceDimension,
  type FenceDimensionResult,
  type Fence,
  type FenceResult,
  createFenceDimension,
  createFence,
  createFenceWithDimensions,
  calculateFenceDimension,
  calculateFence,
  fenceDimensionToSpace,
  fenceToSpaces,
} from './fence-engine';

// ── Material Engine (Feature 5: Material Engine) ──
export {
  type MaterialCategory,
  type CoverageType,
  type MaterialCoverage,
  type MaterialSpec,
  type MaterialReference,
  type MaterialCalculationResult,
  type MaterialCatalog,
  MATERIAL_CATEGORY_LABELS,
  createMaterialSpec,
  calculateMaterialQuantity,
  createMaterialCatalog,
  addMaterialToCatalog,
  findMaterialsByCategory,
  findMaterialsByApplication,
  findMaterialById,
  toMaterialReference,
} from './material-engine';

// ── Rule Registry (Feature 6: Calculation Rule Registry) ──
export {
  type RuleScope,
  type RuleStatus,
  type RuleApprovalStatus,
  type RuleCategory,
  type CalculationRule,
  type RuleRegistry,
  type RuleQuery,
  RULE_CATEGORY_LABELS,
  createRuleRegistry,
  createRule,
  registerRule,
  registerRules,
  findRules,
  findApplicableRule,
  findApplicableRules,
  getRuleById,
  getRuleParameter,
  createGlobalGeometryRules,
  createNigeriaPaintingRules,
  createNigeriaScreedingRules,
} from './rule-registry';

// ── Rule Versioning (Feature 7: Rule Versioning) ──
export {
  type RuleVersionEntry,
  type RuleVersionHistory,
  type RuleVersionRegistry,
  type RuleVersionReference,
  createVersionRegistry,
  registerInitialVersion,
  createNewVersion,
  getVersionHistory,
  getRuleVersion,
  getLatestVersion,
  getAllVersions,
  hasMultipleVersions,
  createRuleVersionReference,
  verifyRuleVersion,
} from './rule-versioning';

// ── Explanation Engine (Feature 8: Calculation Explanation) ──
export {
  type ExplanationSection,
  type CalculationExplanation,
  explainSpaceCalculation,
  explainFenceCalculation,
  explainMaterialCalculation,
  explainProjectCalculation,
  explainFromSteps,
  explanationToText,
} from './explanation-engine';

// ── Confidence Engine (Feature 9: Result Confidence) ──
export {
  type ConfidenceLevel,
  type ConfidenceFactor,
  type ConfidenceAssessment,
  CONFIDENCE_LEVEL_LABELS,
  CONFIDENCE_LEVEL_COLORS,
  assessCalculationConfidence,
  assessMaterialConfidence,
  assessPriceConfidence,
  combineConfidence,
} from './confidence-engine';

// ── Material Summary (Feature 10: Project Material Summary) ──
export {
  type MaterialLineItem,
  type MaterialCategorySubtotal,
  type ProjectMaterialSummary,
  type MaterialRequirement,
  createMaterialLineItem,
  groupByCategory,
  buildMaterialSummary,
  requirementsFromProject,
  summaryFromProject,
  materialSummaryToText,
} from './material-summary';

// ── Already-Have / Purchase Quantity (Feature 11) ──
export {
  type QuantityType,
  type QuantityBreakdown,
  type AlreadyHaveEntry,
  type AlreadyHaveInventory,
  QUANTITY_TYPE_LABELS,
  buildQuantityBreakdown,
  createQuantityBreakdown,
  createAlreadyHaveInventory,
  setAlreadyHave,
  getAlreadyHaveQuantity,
  removeAlreadyHave,
  getAlreadyHaveEntries,
  inventoryToMap,
  quantityBreakdownToText,
} from './already-have';

// ── Configurable Waste (Feature 12) ──
export {
  type WasteSource,
  type WasteResolution,
  type WasteConfig,
  WASTE_SOURCE_LABELS,
  createWasteConfig,
  resolveWaste,
  resolveWasteFromRule,
  applyResolvedWaste,
  setGlobalDefaultWaste,
  setCountryWaste,
  setMarketWaste,
  setUserWaste,
  createNigeriaWasteConfig,
  wasteResolutionToText,
} from './waste-config';

// ── Visual Summary (Feature 13: Visual Measurement Summary) ──
export {
  type SummaryBar,
  type SummaryChart,
  type SummaryRow,
  type SummaryTable,
  type VisualMeasurementSummary,
  buildAreaChart,
  buildFinishTypeChart,
  buildMaterialChart,
  buildDetailTable,
  buildMaterialTable,
  buildKeyMetrics,
  buildVisualSummary,
  chartToAscii,
  tableToAscii,
} from './visual-summary';

// ── Estimate Report (Feature 14: Estimate Report Engine) ──
export {
  type ReportSectionType,
  type ReportSection,
  type EstimateReport,
  buildEstimateReport,
  reportToText,
  reportToMarkdown,
} from './estimate-report';

// ── Engine Bridges ──
export {
  bridgeScreeding,
  bridgeTiling,
  bridgePainting,
  bridgeGrafitex,
  aggregateTilingResults,
  type GrafitexBridgeResult,
} from './bridges';
