/**
 * FRELUX INTERNATIONAL ARCHITECTURE — Supabase Queries
 *
 * CRUD operations for the international architecture tables.
 * Used by admin pages and the market context provider.
 */

import { supabase } from '@/lib/supabase';
import type {
  MarketProfile,
  MarketMaterialRule,
  MarketProduct,
  MarketPricing,
  MarketCalculatorConfig,
  UserMarketPreference,
  MarketCalculatorType,
} from '@/types/international';

// ============================================================
// MARKET PROFILES
// ============================================================

export async function fetchMarketProfiles(includeInactive = false): Promise<MarketProfile[]> {
  let query = supabase.from('market_profiles').select('*').order('sort_order', { ascending: true });
  if (!includeInactive) {
    query = query.in('status', ['active', 'coming_soon']);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as MarketProfile[];
}

export async function fetchMarketProfile(countryCode: string): Promise<MarketProfile | null> {
  const { data, error } = await supabase
    .from('market_profiles')
    .select('*')
    .eq('country_code', countryCode)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as MarketProfile | null;
}

export async function upsertMarketProfile(profile: Partial<MarketProfile> & { country_code: string }): Promise<MarketProfile> {
  const { data, error } = await supabase
    .from('market_profiles')
    .upsert(profile, { onConflict: 'country_code' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as MarketProfile;
}

export async function deleteMarketProfile(countryCode: string): Promise<void> {
  const { error } = await supabase
    .from('market_profiles')
    .delete()
    .eq('country_code', countryCode);
  if (error) throw error;
}

// ============================================================
// MATERIAL RULES
// ============================================================

export async function fetchMaterialRulesDb(marketCode: string, calculatorType?: string): Promise<MarketMaterialRule[]> {
  let query = supabase
    .from('market_material_rules')
    .select('*')
    .eq('market_code', marketCode)
    .order('calculator_type', { ascending: true });
  if (calculatorType) query = query.eq('calculator_type', calculatorType);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as MarketMaterialRule[];
}

export async function upsertMaterialRule(rule: Partial<MarketMaterialRule>): Promise<MarketMaterialRule> {
  const { data, error } = await supabase
    .from('market_material_rules')
    .upsert(rule)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as MarketMaterialRule;
}

export async function deleteMaterialRule(id: string): Promise<void> {
  const { error } = await supabase.from('market_material_rules').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// MARKET PRODUCTS
// ============================================================

export async function fetchMarketProductsDb(marketCode: string): Promise<MarketProduct[]> {
  const { data, error } = await supabase
    .from('market_products')
    .select('*')
    .eq('market_code', marketCode)
    .order('product_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MarketProduct[];
}

export async function upsertMarketProduct(product: Partial<MarketProduct>): Promise<MarketProduct> {
  const { data, error } = await supabase
    .from('market_products')
    .upsert(product)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as MarketProduct;
}

export async function deleteMarketProduct(id: string): Promise<void> {
  const { error } = await supabase.from('market_products').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// MARKET PRICING
// ============================================================

export async function fetchMarketPricingDb(marketCode: string): Promise<MarketPricing[]> {
  const { data, error } = await supabase
    .from('market_pricing')
    .select('*')
    .eq('market_code', marketCode)
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MarketPricing[];
}

export async function upsertMarketPricing(pricing: Partial<MarketPricing>): Promise<MarketPricing> {
  const { data, error } = await supabase
    .from('market_pricing')
    .upsert(pricing)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as MarketPricing;
}

export async function deleteMarketPricing(id: string): Promise<void> {
  const { error } = await supabase.from('market_pricing').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// CALCULATOR CONFIG
// ============================================================

export async function fetchCalculatorConfigsDb(marketCode: string): Promise<MarketCalculatorConfig[]> {
  const { data, error } = await supabase
    .from('market_calculator_config')
    .select('*')
    .eq('market_code', marketCode)
    .order('calculator_type', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MarketCalculatorConfig[];
}

export async function upsertCalculatorConfig(config: Partial<MarketCalculatorConfig>): Promise<MarketCalculatorConfig> {
  const { data, error } = await supabase
    .from('market_calculator_config')
    .upsert(config, { onConflict: 'market_code,calculator_type' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as MarketCalculatorConfig;
}

export async function toggleCalculatorAvailability(
  marketCode: string,
  calculatorType: MarketCalculatorType,
  available: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('market_calculator_config')
    .upsert(
      { market_code: marketCode, calculator_type: calculatorType, is_available: available },
      { onConflict: 'market_code,calculator_type' },
    );
  if (error) throw error;
}

// ============================================================
// USER PREFERENCES
// ============================================================

export async function fetchUserMarketPreference(userId: string): Promise<UserMarketPreference | null> {
  const { data, error } = await supabase
    .from('user_market_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as UserMarketPreference | null;
}

export async function upsertUserMarketPreference(
  userId: string,
  pref: Partial<Omit<UserMarketPreference, 'user_id'>>,
): Promise<UserMarketPreference> {
  const { data, error } = await supabase
    .from('user_market_preferences')
    .upsert({ user_id: userId, ...pref }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as UserMarketPreference;
}
