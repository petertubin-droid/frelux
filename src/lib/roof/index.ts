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
