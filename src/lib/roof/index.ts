/**
 * FRELUX ROOF — Public API
 *
 * Exports:
 *   - Roof View (imagery provider interface)
 *   - Roof Geometry (editable tracing engine)
 *
 * Features 2-3: Roof View, Editable Roof Tracing
 */

// ── Roof View (Feature 2) ──
export type {
  RoofViewProviderType,
  RoofViewProviderConfig,
  RoofViewLocation,
  RoofViewImageryResult,
  RoofViewState,
  DbRoofViewConfig,
} from './types';

export {
  SUPPORTED_PROVIDERS,
  NOT_CONFIGURED,
  getRoofViewConfig,
  getRoofViewState,
  clearRoofViewConfigCache,
  fetchRoofViewImagery,
} from './provider-registry';

export { useRoofView } from './use-roof-view';

// ── Roof Geometry (Feature 3) ──
export type {
  RoofPoint,
  RoofSectionGeometry,
  RoofGeometry,
  EdgeType,
  RoofEdge,
  GeometrySource,
  SectionAreaResult,
  RoofGeometryCalculation,
} from './geometry-types';

export {
  generateGeometryId,
  createPoint,
  distanceBetween,
  polygonArea,
  polygonPerimeter,
  pixelAreaToM2,
  pixelLengthToM,
  classifyEdge,
  generateEdges,
  isValidSection,
  calculateRoofGeometry,
  createRoofSection,
  createDefaultRoofGeometry,
  addVertex,
  moveVertex,
  deleteVertex,
  addSection,
  removeSection,
  renameSection,
  confirmGeometry,
  setSectionSource,
} from './geometry-engine';

// ── Roof Section Model (Feature 4) ──
export type {
  RoofSectionSpec,
  MultiRoofSpec,
  RoofSectionCalculation,
  MultiRoofCalculation,
} from './section-model-types';

export {
  pitchAdjustedArea,
  getSectionPlanArea,
  getSectionMissing,
  calculateRoofSection,
  calculateMultiRoof,
  createRoofSectionSpec,
  createDefaultMultiRoofSpec,
  addRoofSection,
  removeRoofSection,
  updateRoofSection,
  renameRoofSection,
  confirmMultiRoofSpec,
} from './section-model';

// ── Roof Area Pipeline (Feature 6) ──
export type {
  RoofCutout,
  RoofAreaPipelineInput,
  RoofAreaPipelineResult,
  RoofAreaExplanation,
} from './area-pipeline';

export { calculateRoofAreaPipeline } from './area-pipeline';

// ── Edge Classification (Feature 7) ──
export type {
  // re-export EdgeType from geometry-types (already exported above)
} from './geometry-types';

export {
  EDGE_TYPE_LABELS,
  EDGE_TYPE_COLORS,
  LINEAR_EDGE_TYPES,
  reclassifyEdge,
  confirmAllEdges,
  getUnconfirmedEdges,
  calculateEdgeLengths,
  getEdgeSummary,
  getMultiSectionEdgeSummary,
} from './edge-classification';

export type {
  EdgeSummaryLine,
  EdgeSummary,
} from './edge-classification';

// ── Roof Cutouts (Feature 8) ──
export { CUTOUT_TYPES } from './cutouts';
export type { CutoutType } from './cutouts';
export {
  createCutout,
  addCutout,
  updateCutout,
  deleteCutout,
  totalCutoutArea,
  netAreaAfterCutouts,
  validateCutout,
} from './cutouts';

// ── Roof Cutouts (Feature 8) ──
export { CUTOUT_TYPES } from './cutouts';
export type { CutoutType } from './cutouts';
export {
  createCutout,
  addCutout,
  updateCutout,
  deleteCutout,
  totalCutoutArea,
  netAreaAfterCutouts,
  validateCutout,
} from './cutouts';

// ── Plan Scanner (Feature 9) ──
export type {
  PlanFileType,
  PlanFile,
  PlanRenderResult,
  PlanMetadata,
  ScaleCalibration,
} from './plan-scanner';
export {
  detectPlanFileType,
  isSupportedPlanType,
  MAX_PLAN_FILE_SIZE,
  validatePlanFile,
  createPlanFile,
  extractPlanMetadata,
  createDefaultCalibration,
  computePixelsPerMeter,
  completeCalibration,
} from './plan-scanner';

// ── Roof Review (Feature 11) ──
export type {
  SectionReviewItem,
  RoofReviewData,
  ReviewIssue,
} from './review';
export {
  buildRoofReview,
  getErrorIssues,
  getWarningIssues,
  getInfoIssues,
  getReadinessLabel,
} from './review';

// ── Source Tracking & Audit Trail (Feature 12, 13) ──
export type {
  DataSource,
  SourceRecord,
  AuditAction,
  AuditEntry,
  AuditTrail,
} from './source-tracking';
export {
  createAuditEntry,
  appendAuditEntry,
  createEmptyAuditTrail,
  getAuditForTarget,
  getLatestAuditForTarget,
  getAuditBySource,
  getUnverifiedAiEstimates,
  createSourceRecord,
  verifySourceRecord,
  SOURCE_LABELS,
  SOURCE_COLORS,
  requiresVerification,
} from './source-tracking';

// ── Rule Versioning (Feature 14) ──
export type {
  RuleVersionReference,
  RuleSet,
  RuleSetHistory,
} from './rule-versioning';
export {
  computeContentHash,
  createRuleSet,
  publishRuleSetVersion,
  getActiveRuleSet,
  getRuleSetVersion,
  toRuleVersionReference,
  createRuleSetHistory,
  verifyRuleVersion,
} from './rule-versioning';

// ── Roof Material Engine (Feature 17: Roof → Material Engine) ──
export {
  type RoofMaterialSpec,
  type RoofSectionMaterialResult,
  type RoofMaterialResult,
  createRoofMaterialSpec,
  calculateRoofSectionMaterials,
  calculateRoofMaterials,
  calculateRoofMaterialsFromArea,
} from './roof-material-engine';
