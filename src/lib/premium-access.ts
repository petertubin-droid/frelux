// =========================================================
// FRELUX Premium Access Control
//
// Checks whether premium subscriptions are live (admin toggle).
// When disabled, SubscriptionGate shows a "Coming Soon" message
// instead of the paywall.
// =========================================================

import { supabase } from '@/lib/supabase';

let cachedEnabled: boolean | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Check if premium subscriptions are enabled (admin-controlled).
 * Cached for 1 minute to avoid hitting the database on every gated page load.
 */
export async function isPremiumEnabled(): Promise<boolean> {
  // Return cache if fresh
  if (cachedEnabled !== null && Date.now() < cacheExpiry) {
    return cachedEnabled ?? false;
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('premium_subscriptions_enabled')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      cachedEnabled = false;
    } else {
      cachedEnabled = data.premium_subscriptions_enabled ?? false;
    }
  } catch {
    cachedEnabled = false;
  }

  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedEnabled ?? false;
}

/**
 * Force-refresh the cache (e.g. after admin toggles the setting).
 */
export function invalidatePremiumCache(): void {
  cachedEnabled = null;
  cacheExpiry = 0;
}
