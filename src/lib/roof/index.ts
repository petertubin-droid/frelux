/**
 * FRELUX ROOF VIEW — Public API
 *
 * Feature 2: Roof View
 *
 * Exports:
 *   - Types for roof view provider, location, imagery results
 *   - Provider registry for checking configuration state
 *   - Imagery fetch function (calls Edge Function server-side)
 *
 * Usage in components:
 *   import { getRoofViewConfig, fetchRoofViewImagery } from '@/lib/roof';
 *   import type { RoofViewProviderConfig, RoofViewState } from '@/lib/roof';
 */

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
