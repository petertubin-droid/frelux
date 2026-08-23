// =========================================================
// FRELUX Premium Image Estimation — Types
// Phase 31
//
// Users upload a building photo → AI vision analyzes building
// characteristics → Build-to-Roof engine generates a full cost estimate.
// Access is premium-gated and admin-controlled.
// =========================================================

// ── Access control ──

export type EstimationAccessMode = 'free' | 'rewarded' | 'paid' | 'free_rewarded' | 'disabled';

export interface EstimationAccessConfig {
  enabled: boolean;
  accessMode: EstimationAccessMode;
  dailyFreeUses: number;
  rewardedEnabled: boolean;
  paidEnabled: boolean;
  paidPrice: number;
  paidCurrency: string;
  resetPeriod: string;
  adminOverride: boolean;
  /** Whether the edge function is deployed and configured */
  aiConfigured: boolean;
}

export interface EstimationUsageStatus {
  usedToday: number;
  remaining: number;
  limit: number;
  resetPeriod: string;
  hasRemaining: boolean;
  isAuthenticated: boolean;
}

export type EstimationAccessDecision =
  | { allowed: true; reason: 'free' | 'rewarded' | 'paid' | 'admin_override' }
  | {
      allowed: false;
      reason: 'disabled' | 'limit_reached' | 'not_configured' | 'login_required' | 'not_subscribed';
      nextAction?: 'rewarded' | 'paid' | 'login' | 'none';
    };

// ── AI analysis result ──

/**
 * What the AI vision extracts from the building photo.
 * These fields map directly to BuildToRoofInput parameters.
 */
export interface BuildingAnalysisResult {
  detected_building_type: string;
  detected_building_type_confidence: number; // 0-1
  estimated_length: number; // meters
  estimated_width: number; // meters
  estimated_floors: number;
  estimated_height_per_floor: number; // meters
  detected_roof_type: string;
  detected_roof_type_confidence: number;
  estimated_roof_pitch: number; // degrees
  detected_roofing_material: string;
  detected_block_type: string;
  estimated_internal_wall_length: number; // meters
  detected_openings: {
    type: 'door' | 'window';
    estimated_width: number;
    estimated_height: number;
    estimated_count: number;
  }[];
  detected_foundation_type: string;
  ai_confidence: 'high' | 'moderate' | 'low';
  analysis_notes: string[];
  warnings: string[];
  /** URL of the analyzed image (stored in Supabase storage) */
  image_url?: string;
}

// ── Saved estimate ──

export interface SavedEstimationResult {
  id: string;
  user_id: string;
  project_name: string;
  image_url: string | null;
  analysis: BuildingAnalysisResult;
  estimate_summary: {
    grand_total: number;
    materials_total: number;
    labour_total: number;
    contingency: number;
    confidence: string;
  };
  created_at: string;
}
