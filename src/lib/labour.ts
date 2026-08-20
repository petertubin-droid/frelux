import { supabase } from '@/lib/supabase';
import type { LabourPricingMethod, LabourEstimatorKey, DbLabourSettings, DbLabourCategory } from '@/types/database';

// =========================================================
// Shared Labour Cost System
// =========================================================

export type { LabourPricingMethod, LabourEstimatorKey };

export interface LabourConfig {
  includeLabour: boolean;
  pricingMethod: LabourPricingMethod;
  /** Fixed total labour cost */
  fixedAmount: number;
  /** Cost per square metre */
  perSqmRate: number;
  /** Cost per room */
  perRoomRate: number;
  /** Number of rooms (for per_room method) */
  roomCount: number;
  /** Daily labour rate */
  dailyRate: number;
  /** Number of days (for daily method) */
  dayCount: number;
  /** Custom labour calculation — user enters any amount */
  customAmount: number;
  /** Selected category ID (optional, for suggested rates) */
  categoryId: string | null;
}

export const DEFAULT_LABOUR_CONFIG: LabourConfig = {
  includeLabour: false,
  pricingMethod: 'fixed',
  fixedAmount: 0,
  perSqmRate: 0,
  perRoomRate: 0,
  roomCount: 1,
  dailyRate: 0,
  dayCount: 1,
  customAmount: 0,
  categoryId: null,
};

export const PRICING_METHOD_LABELS: Record<LabourPricingMethod, string> = {
  fixed: 'Fixed Labour Cost',
  per_sqm: 'Cost per Square Metre',
  per_room: 'Cost per Room',
  daily: 'Daily Labour Rate',
  custom: 'Custom Labour Calculation',
};

export const PRICING_METHOD_DESCRIPTIONS: Record<LabourPricingMethod, string> = {
  fixed: 'Enter a single total labour cost for the entire project',
  per_sqm: 'Labour rate multiplied by the total area in square metres',
  per_room: 'Labour rate multiplied by the number of rooms',
  daily: 'Daily rate multiplied by the number of working days',
  custom: 'Enter any custom labour amount, full flexibility',
};

/**
 * Calculate labour cost based on the chosen pricing method and area.
 */
export function calculateLabourCost(config: LabourConfig, area: number): number {
  if (!config.includeLabour) return 0;

  switch (config.pricingMethod) {
    case 'fixed':
      return Math.max(0, config.fixedAmount);
    case 'per_sqm':
      return Math.max(0, area) * Math.max(0, config.perSqmRate);
    case 'per_room':
      return Math.max(0, config.roomCount) * Math.max(0, config.perRoomRate);
    case 'daily':
      return Math.max(0, config.dayCount) * Math.max(0, config.dailyRate);
    case 'custom':
      return Math.max(0, config.customAmount);
    default:
      return 0;
  }
}

/**
 * Fetch labour settings for a specific estimator (falls back to global).
 */
export async function fetchLabourSettings(estimatorKey: LabourEstimatorKey): Promise<DbLabourSettings | null> {
  // Try estimator-specific settings first
  const { data } = await supabase
    .from('labour_settings')
    .select('*')
    .eq('estimator_key', estimatorKey)
    .maybeSingle();

  if (data) return data as DbLabourSettings;

  // Fall back to global settings
  const { data: globalData } = await supabase
    .from('labour_settings')
    .select('*')
    .eq('estimator_key', 'global')
    .maybeSingle();

  return (globalData as DbLabourSettings) ?? null;
}

/**
 * Fetch all labour settings (for admin).
 */
export async function fetchAllLabourSettings(): Promise<DbLabourSettings[]> {
  const { data } = await supabase
    .from('labour_settings')
    .select('*')
    .order('estimator_key');
  return (data as DbLabourSettings[]) ?? [];
}

/**
 * Fetch labour categories for a specific estimator.
 */
export async function fetchLabourCategories(estimatorKey: LabourEstimatorKey): Promise<DbLabourCategory[]> {
  const { data } = await supabase
    .from('labour_categories')
    .select('*')
    .eq('estimator_key', estimatorKey)
    .eq('is_active', true)
    .order('sort_order');
  return (data as DbLabourCategory[]) ?? [];
}

/**
 * Create a LabourConfig initialized from admin settings + suggested rates.
 */
export function createInitialLabourConfig(settings: DbLabourSettings | null): LabourConfig {
  if (!settings) return { ...DEFAULT_LABOUR_CONFIG };

  const rates = settings.suggested_rates;
  return {
    ...DEFAULT_LABOUR_CONFIG,
    pricingMethod: settings.default_pricing_method,
    perSqmRate: rates.per_sqm ?? 0,
    perRoomRate: rates.per_room ?? 0,
    dailyRate: rates.daily ?? 0,
    fixedAmount: rates.fixed ?? 0,
  };
}

/**
 * Serialize labour config for saving to user_projects.project_data.
 */
export function serializeLabourConfig(config: LabourConfig): Record<string, unknown> {
  return { ...config };
}

/**
 * Deserialize labour config from saved project data.
 */
export function deserializeLabourConfig(data: Record<string, unknown> | null | undefined): LabourConfig {
  if (!data) return { ...DEFAULT_LABOUR_CONFIG };
  return {
    includeLabour: Boolean(data.includeLabour ?? DEFAULT_LABOUR_CONFIG.includeLabour),
    pricingMethod: (data.pricingMethod as LabourPricingMethod) ?? DEFAULT_LABOUR_CONFIG.pricingMethod,
    fixedAmount: Number(data.fixedAmount ?? 0),
    perSqmRate: Number(data.perSqmRate ?? 0),
    perRoomRate: Number(data.perRoomRate ?? 0),
    roomCount: Number(data.roomCount ?? 1),
    dailyRate: Number(data.dailyRate ?? 0),
    dayCount: Number(data.dayCount ?? 1),
    customAmount: Number(data.customAmount ?? 0),
    categoryId: (data.categoryId as string) ?? null,
  };
}
