// =========================================================
// FRELUX Premium Estimation — Access Control
// Phase 31 / Phase 33
//
// Follows the same pattern as ai-access.ts:
// - Admin configures access mode, daily limits, and pricing in site_settings
// - Users are gated by the configured mode (free / rewarded / paid / disabled)
// - Usage is tracked server-side (edge function consumes on success)
// - Client can only READ usage status (never write)
//
// Phase 33: Now checks user_paid_status for paid mode — a subscriber
// with an active plan gets full access to all estimation features.
// =========================================================

import { supabase } from '@/lib/supabase';
import type { DbUserPaidStatus } from '@/types/database';
import type {
  EstimationAccessConfig,
  EstimationUsageStatus,
  EstimationAccessDecision,
} from '@/types/premium-estimation';

const CLIENT_ID_KEY = 'frelux_estimation_client_id';

export function getClientId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Fetch admin config from site_settings ──

export async function fetchEstimationAccessConfig(): Promise<EstimationAccessConfig | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select(`
      estimation_enabled,
      estimation_access_mode,
      estimation_daily_free_uses,
      estimation_rewarded_enabled,
      estimation_paid_enabled,
      estimation_paid_price,
      estimation_paid_currency,
      estimation_reset_period,
      estimation_admin_override
    `)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Fallback defaults — feature disabled if not configured
    return {
      enabled: false,
      accessMode: 'disabled',
      dailyFreeUses: 0,
      rewardedEnabled: false,
      paidEnabled: false,
      paidPrice: 0,
      paidCurrency: 'NGN',
      resetPeriod: 'daily',
      adminOverride: true,
      aiConfigured: false,
    };
  }

  return {
    enabled: data.estimation_enabled ?? false,
    accessMode: (data.estimation_access_mode as EstimationAccessConfig['accessMode']) ?? 'disabled',
    dailyFreeUses: data.estimation_daily_free_uses ?? 0,
    rewardedEnabled: data.estimation_rewarded_enabled ?? false,
    paidEnabled: data.estimation_paid_enabled ?? false,
    paidPrice: Number(data.estimation_paid_price) || 0,
    paidCurrency: data.estimation_paid_currency ?? 'NGN',
    resetPeriod: data.estimation_reset_period ?? 'daily',
    adminOverride: data.estimation_admin_override ?? true,
    aiConfigured: true,
  };
}

// ── Read usage status (read-only — server tracks consumption) ──

export async function getEstimationUsageStatus(
  config: EstimationAccessConfig,
  userId?: string | null,
): Promise<EstimationUsageStatus> {
  const today = todayStr();
  const isAuthenticated = !!userId;

  let query;
  if (isAuthenticated) {
    query = supabase
      .from('estimation_usage_daily')
      .select('uses_consumed')
      .eq('user_id', userId!)
      .eq('usage_date', today)
      .maybeSingle();
  } else {
    const clientId = getClientId();
    query = supabase
      .from('estimation_usage_daily')
      .select('uses_consumed')
      .eq('client_hash', clientId)
      .eq('usage_date', today)
      .maybeSingle();
  }

  const { data } = await query;
  const usedToday = data?.uses_consumed ?? 0;
  const remaining = Math.max(0, config.dailyFreeUses - usedToday);

  return {
    usedToday,
    remaining,
    limit: config.dailyFreeUses,
    resetPeriod: config.resetPeriod,
    hasRemaining: remaining > 0,
    isAuthenticated,
  };
}

/**
 * Check if the user has an active paid subscription.
 * This is a client-side check — the edge function does the authoritative
 * server-side check using the service role key.
 */
export function checkUserPaidStatus(paidStatus: DbUserPaidStatus | null): boolean {
  if (!paidStatus || !paidStatus.is_paid) return false;
  if (paidStatus.paid_until) {
    const expiry = new Date(paidStatus.paid_until).getTime();
    if (Date.now() > expiry) return false;
  }
  return true;
}

// ── Check whether user can use the feature right now ──

export function checkEstimationAccess(
  config: EstimationAccessConfig,
  usage: EstimationUsageStatus,
  isAdmin = false,
  isPaid = false,
): EstimationAccessDecision {
  if (!config.enabled) return { allowed: false, reason: 'disabled' };
  if (config.accessMode === 'disabled') return { allowed: false, reason: 'disabled' };

  // Admin bypass
  if (isAdmin && config.adminOverride) {
    return { allowed: true, reason: 'admin_override' };
  }

  // Active subscribers get full access regardless of mode
  if (isPaid) {
    return { allowed: true, reason: 'paid' };
  }

  // Paid mode — requires subscription
  if (config.accessMode === 'paid') {
    return config.paidEnabled
      ? { allowed: false, reason: 'not_subscribed', nextAction: 'paid' }
      : { allowed: false, reason: 'not_configured', nextAction: 'none' };
  }

  // Free mode
  if (config.accessMode === 'free') {
    return usage.hasRemaining
      ? { allowed: true, reason: 'free' }
      : { allowed: false, reason: 'limit_reached', nextAction: 'none' };
  }

  // Rewarded mode — free uses then ad gate
  if (config.accessMode === 'rewarded') {
    if (usage.hasRemaining) return { allowed: true, reason: 'free' };
    return config.rewardedEnabled
      ? { allowed: false, reason: 'limit_reached', nextAction: 'rewarded' }
      : { allowed: false, reason: 'limit_reached', nextAction: 'none' };
  }

  // Free + rewarded hybrid
  if (config.accessMode === 'free_rewarded') {
    if (usage.hasRemaining) return { allowed: true, reason: 'free' };
    return config.rewardedEnabled
      ? { allowed: false, reason: 'limit_reached', nextAction: 'rewarded' }
      : { allowed: false, reason: 'limit_reached', nextAction: 'none' };
  }

  return { allowed: false, reason: 'disabled' };
}

// ── Save estimate to database ──

export async function saveEstimationResult(
  userId: string,
  projectName: string,
  imageUrl: string | null,
  analysis: unknown,
  estimateSummary: unknown,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('estimation_results').insert({
    user_id: userId,
    project_name: projectName,
    image_url: imageUrl,
    analysis,
    estimate_summary: estimateSummary,
  });

  return { error: error?.message ?? null };
}

// ── Fetch user's saved estimates ──

export async function fetchSavedEstimates(userId: string) {
  const { data, error } = await supabase
    .from('estimation_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
