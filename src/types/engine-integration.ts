/**
 * FRELUX Engine Integration — Types
 *
 * TypeScript types for the engine management tables (em_*).
 * These map to the Phase 42 migration tables.
 * All types are additive — no existing types are modified.
 */

// ============================================================
// MATERIAL PROFILES
// ============================================================

export interface EmMaterialProfile {
  id: string;
  material_key: string;
  product_name: string;
  brand: string | null;
  category: string;

  coverage_type: 'area' | 'linear' | 'count' | 'volume' | 'weight';
  coverage_value: number;
  coverage_unit: string;
  coverage_coats: number;
  coverage_basis: string | null;

  package_size: number;
  package_unit: string;
  quantity_unit: string;

  default_waste_percent: number;
  min_waste_percent: number;
  max_waste_percent: number;

  market_code: string;

  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;

  is_active: boolean;
  sort_order: number;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ROOF MATERIALS
// ============================================================

export interface EmRoofMaterial {
  id: string;
  material_key: string;
  material_name: string;
  brand: string | null;
  category: string;

  coverage_type: 'area' | 'linear' | 'count';
  coverage_value: number;
  coverage_unit: string;
  coverage_basis: string | null;

  package_size: number;
  package_unit: string;
  quantity_unit: string;

  default_waste_percent: number;
  market_code: string;

  is_approved: boolean;
  is_active: boolean;
  sort_order: number;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// ROOF SECTIONS
// ============================================================

export interface EmRoofSection {
  id: string;
  section_key: string;
  section_name: string;
  roof_type: string;

  pitch_type: 'ratio' | 'degrees' | 'flat';
  pitch_value: number | null;
  pitch_ratio_run: number;
  is_flat: boolean;

  default_length: number | null;
  default_width: number | null;
  default_overhang: number;

  area_factor: number;

  market_code: string;
  is_active: boolean;
  sort_order: number;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// WASTE CONFIGS
// ============================================================

export interface EmWasteConfig {
  id: string;
  scope_level: 'global' | 'country' | 'market' | 'category' | 'rule';
  country_code: string | null;
  market_code: string | null;
  material_category: string | null;
  rule_id: string | null;

  waste_percent: number;
  is_override: boolean;

  source: string | null;
  description: string | null;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================================
// AI VERIFICATION STATES
// ============================================================

export type AiVerificationState = 'pending' | 'in_progress' | 'verified' | 'flagged' | 'rejected' | 'auto_verified';

export interface EmAiVerificationState {
  id: string;
  measurement_type: string;
  measurement_id: string | null;
  project_id: string | null;

  state: AiVerificationState;

  ai_confidence: number | null;
  ai_notes: string | null;
  ai_flags: string[] | null;

  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  corrections: Record<string, unknown> | null;

  image_url: string | null;
  input_data: Record<string, unknown> | null;
  verified_data: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
}

// ============================================================
// RULE METADATA
// ============================================================

export type RuleSourceType = 'frelux' | 'industry_standard' | 'vendor' | 'user_survey' | 'market_research';

export interface EmRuleMetadata {
  id: string;
  rule_id: string;
  rule_name: string;
  rule_version: string;

  source_type: RuleSourceType;
  source_name: string | null;
  source_url: string | null;
  source_date: string | null;

  reference_doc: string | null;
  reference_page: string | null;
  reference_author: string | null;

  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;

  is_active: boolean;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================================
// ENGINE SETTINGS
// ============================================================

export interface EmEngineSetting {
  id: string;
  setting_key: string;
  setting_value: unknown;
  setting_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  category: string;
  description: string | null;
  is_editable: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================================
// LABELS
// ============================================================

export const COVERAGE_TYPE_LABELS: Record<string, string> = {
  area: 'Area (m²)',
  linear: 'Linear (m)',
  count: 'Count',
  volume: 'Volume (L)',
  weight: 'Weight (kg)',
};

export const SCOPE_LEVEL_LABELS: Record<string, string> = {
  global: 'Global Default',
  country: 'Country',
  market: 'Market/Region',
  category: 'Material Category',
  rule: 'Specific Rule',
};

export const AI_VERIFICATION_STATE_LABELS: Record<AiVerificationState, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  verified: 'Verified',
  flagged: 'Flagged',
  rejected: 'Rejected',
  auto_verified: 'Auto-Verified',
};

export const RULE_SOURCE_TYPE_LABELS: Record<RuleSourceType, string> = {
  frelux: 'FRELUX',
  industry_standard: 'Industry Standard',
  vendor: 'Vendor',
  user_survey: 'User Survey',
  market_research: 'Market Research',
};

export const SETTING_CATEGORY_LABELS: Record<string, string> = {
  measurement: 'Measurement',
  waste: 'Waste',
  market: 'Market',
  material: 'Material',
  roof: 'Roof',
  ai: 'AI Verification',
  general: 'General',
};
