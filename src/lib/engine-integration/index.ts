/**
 * FRELUX Engine Integration — Barrel Export
 *
 * Import from here:
 *   import { fetchMaterialProfiles, dbProfileToMaterialSpec } from '@/lib/engine-integration';
 *
 * Everything is additive. Existing code is not modified.
 */

// Types (re-export)
export type {
  EmMaterialProfile,
  EmRoofMaterial,
  EmRoofSection,
  EmWasteConfig,
  EmAiVerificationState,
  EmRuleMetadata,
  EmEngineSetting,
  AiVerificationState,
  RuleSourceType,
  COVERAGE_TYPE_LABELS,
  SCOPE_LEVEL_LABELS,
  AI_VERIFICATION_STATE_LABELS,
  RULE_SOURCE_TYPE_LABELS,
  SETTING_CATEGORY_LABELS,
} from '@/types/engine-integration';

// Queries
export {
  fetchMaterialProfiles,
  fetchMaterialProfilesByCategory,
  upsertMaterialProfile,
  deleteMaterialProfile,
  approveMaterialProfile,
  toggleMaterialProfileActive,
  fetchRoofMaterials,
  upsertRoofMaterial,
  deleteRoofMaterial,
  fetchRoofSections,
  upsertRoofSection,
  deleteRoofSection,
  fetchWasteConfigs,
  fetchWasteConfigsByScope,
  upsertWasteConfig,
  updateWasteConfig,
  deleteWasteConfig,
  fetchAiVerifications,
  updateAiVerificationState,
  createAiVerification,
  fetchRuleMetadata,
  fetchRuleMetadataById,
  upsertRuleMetadata,
  deleteRuleMetadata,
  verifyRuleMetadata,
  fetchEngineSettings,
  fetchEngineSetting,
  updateEngineSetting,
  upsertEngineSetting,
  toggleMarketActivation,
  fetchMarketActivationStatus,
} from './queries';

// Bridge
export {
  dbProfileToMaterialSpec,
  dbProfilesToMaterialSpecs,
  dbWasteConfigsToWasteConfig,
  resolveWasteFromDb,
  dbSettingsToMap,
  getSetting,
  dbMetadataToReference,
  dbRoofMaterialToSpec,
  dbRoofMaterialsToSpecs,
  dbRoofSectionToConfig,
  dbRoofSectionsToConfigs,
  buildEngineMarketProfile,
} from './bridge';
