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

// ── Market Profile / International Architecture (Feature 16) ──
export {
  type UnitSystem,
  type MarketProfile,
  type MarketProfileRegistry,
  createMarketProfileRegistry,
  registerProfile,
  getProfile,
  getActiveProfiles,
  createNigeriaProfile,
  createGhanaProfile,
  createKenyaProfile,
  createDefaultRegistry,
  getMarketWastePercent,
  getMarketPackageSize,
  getMarketCoverage,
  getMarketCurrency,
  getMarketLengthUnit,
  getMarketRuleIds,
  isMarketActive,
  marketProfileToText,
  listProfiles,
} from './market-profile';

// ── Engine Bridges ──
export {
  bridgeScreeding,
  bridgeTiling,
  bridgePainting,
  bridgeGrafitex,
  aggregateTilingResults,
  type GrafitexBridgeResult,
} from './bridges';

// ── Engine Features Hook (Feature: UI Integration) ──
export {
  useEngineFeatures,
  type UseEngineFeaturesOptions,
  type UseEngineFeaturesReturn,
} from './use-engine-features';

// ── Multi-Building Project Engine (Feature 15: Multi-Building Projects) ──
export {
  type BuildingType,
  type Building,
  type BuildingResult,
  type MultiBuildingProject,
  type MultiBuildingProjectResult,
  BUILDING_TYPE_LABELS,
  createBuilding,
  createMultiBuildingProject,
  addBuilding,
  renameBuilding,
  removeBuilding,
  updateBuilding,
  getBuilding,
  addElementToBuilding,
  setBuildingRoofSpec,
  calculateBuilding,
  calculateMultiBuildingProject,
  totalAreaByBuildingType,
  getBuildingSpaces,
  buildingSummary,
  multiBuildingProjectToConstructionProject,
  duplicateBuildingResult,
} from './multi-building';

// ── Plan Intelligence (Feature 16: Plan → Space Engine Integration) ──
export {
  type RoomVerificationState,
  VERIFICATION_STATE_LABELS,
  type DetectedRoom,
  type PlanDetectionResult,
  type VerifiedSpace,
  createDetectedRoom,
  createPlanDetectionResult,
  startRoomReview,
  editDetectedRoom,
  confirmDetectedRoom,
  rejectDetectedRoom,
  confirmAllRooms,
  updateDetectionStatus,
  detectedRoomToSpace,
  detectionToVerifiedSpaces,
  verifiedSpacesToSpaces,
  selectForCalculation,
  detectionSummary,
  roomsByVerificationState,
} from './plan-intelligence';

// ── Cost Integration (Feature 18: Cost Integration) ──
export {
  type PriceSource,
  type QuantitySource,
  type CostLineItem,
  type CostCategory,
  type CostEstimate,
  type CostIssue,
  type MaterialPriceInput,
  type MaterialQuantityInput,
  buildCostLineItem,
  buildCostEstimate,
  roofMaterialResultToQuantities,
  materialCalculationsToQuantities,
} from './cost-integration';

// ── Labour Cost Engine (Feature 19) ──
export {
  type LabourRateType,
  type TradeCategory,
  TRADE_LABELS,
  type LabourRate,
  type LabourActivityInput,
  type LabourLineItem,
  type LabourTradeSubtotal,
  type LabourCostResult,
  buildLabourLineItem,
  calculateLabourCost,
  generateDefaultLabourActivities,
} from './labour-engine';

// ── Project Comparison (Feature 20) ──
export {
  type ComparisonColumn,
  type ComparisonRow,
  type CategoryComparisonRow,
  type ComparisonSummary,
  type ComparisonResult,
  compareEstimates,
} from './project-comparison';

// ── Timeline Engine (Feature 21) ──
export {
  type PhaseStatus,
  type TimelinePhase,
  type TimelineResult,
  type TimelineMilestone,
  type PhaseTemplate,
  DEFAULT_PHASE_TEMPLATES,
  estimateTimeline,
} from './timeline-engine';

// ── Quotation & Export (Feature 22) ──
export {
  type QuotationSettings,
  DEFAULT_QUOTATION_SETTINGS,
  type QuotationSection,
  type QuotationSectionType,
  type QuotationDocument,
  generateQuotationNumber,
  buildQuotation,
} from './quotation-engine';

// ── Verification States (Feature 19) ──
// Note: VERIFICATION_STATE_LABELS is also exported from plan-intelligence.ts
// for RoomVerificationState. The verification-states module uses the same
// name for the unified VerificationState system. We alias here to avoid
// export conflicts in the barrel.
export {
  type VerificationState,
  type AiDetectionConfidence,
  VERIFICATION_STATE_DESCRIPTIONS as DATA_VERIFICATION_STATE_DESCRIPTIONS,
  VERIFICATION_STATE_COLORS as DATA_VERIFICATION_STATE_COLORS,
  VERIFICATION_STATE_VERIFIED as DATA_VERIFICATION_STATE_VERIFIED,
  VERIFICATION_STATE_REQUIRES_ACTION as DATA_VERIFICATION_STATE_REQUIRES_ACTION,
  VERIFICATION_STATE_ICONS as DATA_VERIFICATION_STATE_ICONS,
  AI_CONFIDENCE_LABELS,
  type UnifiedConfidenceAssessment,
  type VerificationBadge,
  type VerificationRecord,
  type VerificationSummary,
  canTransition,
  transitionVerificationState,
  assessUnifiedConfidence,
  buildVerificationBadge,
  createVerificationRecord,
  updateVerificationRecord,
  buildVerificationSummary,
} from './verification-states';
// VERIFICATION_STATE_LABELS from verification-states.ts is available
// as VERIFICATION_STATE_LABELS from plan-intelligence.ts (same concept,
// different type). For the unified labels, import directly from
// the module: verification-states.ts
export { VERIFICATION_STATE_LABELS as UNIFIED_VERIFICATION_STATE_LABELS } from './verification-states';

// ── Smart Roof Report (Feature 20) ──
export {
  type MeasurementSource,
  type ReportMetadata,
  type RoofSectionSummary,
  type RoofSummarySection,
  type LinearMeasurementEntry,
  type LinearMeasurementsSection,
  type CutoutEntry,
  type CutoutsSection,
  type MaterialRequirementEntry,
  type MaterialRequirementsSection,
  type WasteSection,
  type MarketPriceEntry,
  type MarketPriceSection,
  type ConfidenceSection,
  type CalculationExplanationEntry,
  type CalculationExplanationSection,
  type SmartRoofReport,
  buildSmartRoofReport,
} from './smart-roof-report';

// ── Smart AI Image Report (Feature 21) ──
export {
  type ImageReference,
  type DetectedBuildingInfo,
  type DetectedRoomInfo,
  type DetectedDimension,
  type DetectedRoofInfo,
  type ScaleStatus,
  type ScaleInfo,
  type AiReviewStatus,
  type AiReviewInfo,
  type VerifiedMeasurement,
  type CalculationResultEntry,
  type AiMaterialRequirement,
  type AiConfidenceSummary,
  type SmartAiImageReport,
  buildSmartAiImageReport,
} from './smart-ai-report';

// ── Shared Engine Pipeline (Feature 22) ──
export {
  type PipelineSource,
  type PipelineStage,
  PIPELINE_SOURCE_LABELS,
  PIPELINE_STAGE_LABELS,
  type PipelineInput,
  type MeasurementStageResult,
  type SpaceElementStageResult,
  type CalculationStageResult,
  type MaterialStageResult,
  type MarketIntelligenceStageResult,
  type ValidationStageResult,
  type EstimateStageResult,
  type ReportStageResult,
  type PipelineResult,
  executeSharedPipeline,
  createBuildingToRoofInput,
  createAiImageInput,
  canSharePipeline,
} from './shared-engine-pipeline';

// Re-export TileSizeUnit from types (moved from units block)
export { type TileSizeUnit } from './types';
