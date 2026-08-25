/**
 * FRELUX Credits & Rewards — Client-side API
 *
 * All credit operations go through Supabase Edge Functions or RPC functions.
 * The frontend NEVER directly writes to credit_wallets or credit_transactions.
 * All award/deduct operations are server-side with idempotency protection.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// =========================================================
// Types
// =========================================================

export interface CreditWallet {
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'spend' | 'admin_adjust';
  reason: string;
  reference_id: string | null;
  balance_after: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RewardItem {
  id: string;
  reward_key: string;
  name: string;
  description: string;
  credit_cost: number;
  reward_type: 'ai_token' | 'pdf_export' | 'calc_unlock' | 'premium_week';
  is_enabled: boolean;
  sort_order: number;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_key: string;
  credits_spent: number;
  status: 'completed' | 'failed';
  granted_at: string;
  metadata: Record<string, unknown>;
}

export interface ActivityStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  total_active_days: number;
}

export interface WeeklyMission {
  id: string;
  week_start: string;
  week_end: string;
  mission_config: {
    tasks: MissionTask[];
    reward_credits: number;
  };
  is_active: boolean;
}

export interface MissionTask {
  key: string;
  label: string;
  target: number;
  type: string;
}

export interface MissionProgress {
  id: string;
  task_key: string;
  progress: number;
  completed: boolean;
  updated_at: string;
}

export interface RewardSettings {
  id: number;
  rewards_enabled: boolean;
  weekly_mission_credits: number;
  streak_7_day_credits: number;
  streak_grace_days: number;
}

// =========================================================
// Reward event definitions (client-side tracking for UI feedback)
// =========================================================

export interface RewardEventDef {
  eventType: string;
  amount: number;
  reason: string;
}

export const REWARD_EVENTS = {
  first_calc: { eventType: 'first_calc', amount: 10, reason: 'Completed first calculator' },
  three_different_calcs: { eventType: 'three_different_calcs', amount: 20, reason: 'Completed 3 different calculators' },
  save_estimate: { eventType: 'save_estimate', amount: 10, reason: 'Saved an estimate' },
  return_3_days: { eventType: 'return_3_days', amount: 15, reason: 'Returned on 3 different days' },
  streak_7_day: { eventType: 'streak_7_day', amount: 50, reason: '7-day activity streak' },
  build_to_roof: { eventType: 'build_to_roof', amount: 30, reason: 'Completed a Build-to-Roof estimate' },
  ai_photo_estimator: { eventType: 'ai_photo_estimator', amount: 20, reason: 'Successfully used AI Photo Estimator' },
  five_estimates: { eventType: 'five_estimates', amount: 50, reason: 'Completed 5 estimates' },
  referral: { eventType: 'referral', amount: 100, reason: 'Referred a new user to FRELUX' },
  // Achievement-linked credit rewards
  ach_builder_10: { eventType: 'ach_builder_10', amount: 100, reason: 'Achievement: FRELUX Builder (10 estimates)' },
  ach_estimator_25: { eventType: 'ach_estimator_25', amount: 250, reason: 'Achievement: Estimator Pro (25 estimates)' },
  ach_master_5: { eventType: 'ach_master_5', amount: 500, reason: 'Achievement: FRELUX Master (5 categories)' },
} as const;

export type RewardEventKey = keyof typeof REWARD_EVENTS;

// =========================================================
// API functions
// =========================================================

/** Get the user's credit wallet */
export async function getCreditWallet(userId: string): Promise<CreditWallet | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('credit_wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data as CreditWallet | null;
}

/** Get transaction history (paginated) */
export async function getCreditTransactions(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ transactions: CreditTransaction[]; hasMore: boolean }> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  if (!isSupabaseConfigured) return { transactions: [], hasMore: false };

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { transactions: [], hasMore: false };
  return { transactions: (data ?? []) as CreditTransaction[], hasMore: data?.length === limit };
}

/** Get reward catalogue */
export async function getRewardCatalogue(): Promise<RewardItem[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('reward_catalogue')
    .select('*')
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data ?? []) as RewardItem[];
}

/** Get reward redemptions */
export async function getRewardRedemptions(userId: string): Promise<RewardRedemption[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as RewardRedemption[];
}

/** Get activity streak */
export async function getActivityStreak(userId: string): Promise<ActivityStreak | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('activity_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data as ActivityStreak | null;
}

/** Get current weekly mission */
export async function getCurrentWeeklyMission(): Promise<WeeklyMission | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('weekly_missions')
    .select('*')
    .eq('is_active', true)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data as WeeklyMission | null;
}

/** Get user mission progress for current mission */
export async function getMissionProgress(userId: string, missionId: string): Promise<MissionProgress[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('user_mission_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('mission_id', missionId);
  if (error) return [];
  return (data ?? []) as MissionProgress[];
}

/** Get reward settings */
export async function getRewardSettings(): Promise<RewardSettings | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('reward_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) return null;
  return data as RewardSettings | null;
}

// =========================================================
// Edge Function calls (server-side operations)
// =========================================================

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

/** Award credits via edge function (secure, idempotent) */
export async function awardCredits(
  sessionToken: string,
  eventDef: RewardEventDef,
  referenceId: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; newBalance?: number; alreadyAwarded?: boolean; error?: string }> {
  if (!isSupabaseConfigured || !EDGE_FUNCTION_URL) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/award-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        eventType: eventDef.eventType,
        referenceId,
        amount: eventDef.amount,
        reason: eventDef.reason,
        metadata: metadata ?? {},
      }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error ?? 'Unknown error' };
    return data;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** Redeem a reward via edge function (secure, atomic) */
export async function redeemReward(
  sessionToken: string,
  rewardKey: string,
  idempotencyKey: string
): Promise<{ success: boolean; newBalance?: number; error?: string; reward?: { key: string; name: string; description: string; type: string } }> {
  if (!isSupabaseConfigured || !EDGE_FUNCTION_URL) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/redeem-reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        rewardKey,
        idempotencyKey,
      }),
    });

    const data = await res.json();
    if (!res.ok) return data;
    return data;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** Record activity (updates streak + mission progress) */
export async function recordActivity(
  sessionToken: string,
  activityType: string,
  missionTaskType?: string,
  activityData?: Record<string, unknown>
): Promise<{ success: boolean; streakAwarded?: number; missionUpdated?: boolean; error?: string }> {
  if (!isSupabaseConfigured || !EDGE_FUNCTION_URL) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/record-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        activityType,
        missionTaskType,
        activityData: activityData ?? {},
      }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error ?? 'Unknown error' };
    return data;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// =========================================================
// Admin functions (service role via RPC)
// =========================================================

/** Admin: adjust user credits */
export async function adminAdjustCredits(
  adminId: string,
  targetUserId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Not configured' };
  const { data, error } = await supabase.rpc('admin_adjust_credits', {
    p_admin_id: adminId,
    p_target_user_id: targetUserId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) return { success: false, error: error.message };
  const result = data?.[0];
  return { success: result?.success ?? false, newBalance: result?.new_balance, error: result?.error };
}

/** Admin: update reward catalogue item */
export async function adminUpdateReward(
  rewardId: string,
  updates: { name?: string; description?: string; credit_cost?: number; is_enabled?: boolean }
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('reward_catalogue')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', rewardId);
  return !error;
}

/** Admin: get all wallets (for overview) */
export async function adminGetAllWallets(limit = 50): Promise<CreditWallet[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('credit_wallets')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as CreditWallet[];
}

/** Admin: get all transactions (for overview) */
export async function adminGetAllTransactions(limit = 50): Promise<CreditTransaction[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as CreditTransaction[];
}

/** Admin: update reward settings */
export async function adminUpdateSettings(
  updates: { rewards_enabled?: boolean; weekly_mission_credits?: number; streak_7_day_credits?: number; streak_grace_days?: number }
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('reward_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1);
  return !error;
}

// =========================================================
// Utility: generate reference IDs
// =========================================================

export function generateReferenceId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Get a date-based reference ID for one-time daily events */
export function getDailyRefId(prefix: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return `${prefix}_${dateStr}`;
}
