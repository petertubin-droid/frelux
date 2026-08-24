/**
 * FRELUX Engine Integration — Supabase Queries
 *
 * CRUD operations for the engine management tables (em_*).
 * Admin-only: all queries rely on RLS policies that check is_admin().
 *
 * Used by the admin panel to configure the measurement engine.
 * Does NOT modify any existing queries or tables.
 */

import { supabase } from '@/lib/supabase';
import type {
  EmMaterialProfile,
  EmRoofMaterial,
  EmRoofSection,
  EmWasteConfig,
  EmAiVerificationState,
  EmRuleMetadata,
  EmEngineSetting,
  AiVerificationState,
} from '@/types/engine-integration';

// ============================================================
// MATERIAL PROFILES
// ============================================================

export async function fetchMaterialProfiles(marketCode = 'NG'): Promise<EmMaterialProfile[]> {
  const { data, error } = await supabase
    .from('em_material_profiles')
    .select('*')
    .eq('market_code', marketCode)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmMaterialProfile[];
}

export async function fetchMaterialProfilesByCategory(category: string, marketCode = 'NG'): Promise<EmMaterialProfile[]> {
  const { data, error } = await supabase
    .from('em_material_profiles')
    .select('*')
    .eq('category', category)
    .eq('market_code', marketCode)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmMaterialProfile[];
}

export async function upsertMaterialProfile(profile: Partial<EmMaterialProfile> & { material_key: string }): Promise<EmMaterialProfile> {
  const { data, error } = await supabase
    .from('em_material_profiles')
    .upsert(profile, { onConflict: 'material_key,market_code' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EmMaterialProfile;
}

export async function deleteMaterialProfile(id: string): Promise<void> {
  const { error } = await supabase.from('em_material_profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function approveMaterialProfile(id: string, approvedBy: string): Promise<void> {
  const { error } = await supabase
    .from('em_material_profiles')
    .update({ is_approved: true, approved_by: approvedBy, approved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleMaterialProfileActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('em_material_profiles')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// ROOF MATERIALS
// ============================================================

export async function fetchRoofMaterials(marketCode = 'NG'): Promise<EmRoofMaterial[]> {
  const { data, error } = await supabase
    .from('em_roof_materials')
    .select('*')
    .eq('market_code', marketCode)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmRoofMaterial[];
}

export async function upsertRoofMaterial(material: Partial<EmRoofMaterial> & { material_key: string }): Promise<EmRoofMaterial> {
  const { data, error } = await supabase
    .from('em_roof_materials')
    .upsert(material, { onConflict: 'material_key,market_code' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EmRoofMaterial;
}

export async function deleteRoofMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('em_roof_materials').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// ROOF SECTIONS
// ============================================================

export async function fetchRoofSections(marketCode = 'NG'): Promise<EmRoofSection[]> {
  const { data, error } = await supabase
    .from('em_roof_sections')
    .select('*')
    .eq('market_code', marketCode)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmRoofSection[];
}

export async function upsertRoofSection(section: Partial<EmRoofSection> & { section_key: string }): Promise<EmRoofSection> {
  const { data, error } = await supabase
    .from('em_roof_sections')
    .upsert(section, { onConflict: 'section_key,market_code' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EmRoofSection;
}

export async function deleteRoofSection(id: string): Promise<void> {
  const { error } = await supabase.from('em_roof_sections').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// WASTE CONFIGS
// ============================================================

export async function fetchWasteConfigs(): Promise<EmWasteConfig[]> {
  const { data, error } = await supabase
    .from('em_waste_configs')
    .select('*')
    .eq('is_active', true)
    .order('scope_level', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmWasteConfig[];
}

export async function fetchWasteConfigsByScope(scopeLevel: string): Promise<EmWasteConfig[]> {
  const { data, error } = await supabase
    .from('em_waste_configs')
    .select('*')
    .eq('scope_level', scopeLevel)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EmWasteConfig[];
}

export async function upsertWasteConfig(config: Partial<EmWasteConfig>): Promise<EmWasteConfig> {
  const { data, error } = await supabase
    .from('em_waste_configs')
    .insert(config)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EmWasteConfig;
}

export async function updateWasteConfig(id: string, updates: Partial<EmWasteConfig>): Promise<void> {
  const { error } = await supabase
    .from('em_waste_configs')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWasteConfig(id: string): Promise<void> {
  const { error } = await supabase.from('em_waste_configs').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// AI VERIFICATION STATES
// ============================================================

export async function fetchAiVerifications(state?: AiVerificationState): Promise<EmAiVerificationState[]> {
  let query = supabase
    .from('em_ai_verification_states')
    .select('*')
    .order('created_at', { ascending: false });
  if (state) query = query.eq('state', state);
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as EmAiVerificationState[];
}

export async function updateAiVerificationState(
  id: string,
  newState: AiVerificationState,
  reviewBy?: string,
  reviewNotes?: string,
): Promise<void> {
  const updates: Record<string, unknown> = {
    state: newState,
    reviewed_at: new Date().toISOString(),
  };
  if (reviewBy) updates.reviewed_by = reviewBy;
  if (reviewNotes) updates.review_notes = reviewNotes;

  const { error } = await supabase
    .from('em_ai_verification_states')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function createAiVerification(
  entry: Partial<EmAiVerificationState>,
): Promise<EmAiVerificationState> {
  const { data, error } = await supabase
    .from('em_ai_verification_states')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EmAiVerificationState;
}

// ============================================================
// RULE METADATA
// ============================================================

export async function fetchRuleMetadata(): Promise<EmRuleMetadata[]> {
  const { data, error } = await supabase
    .from('em_rule_metadata')
    .select('*')
    .eq('is_active', true)
    .order('rule_id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmRuleMetadata[];
}

export async function fetchRuleMetadataById(ruleId: string): Promise<EmRuleMetadata | null> {
  const { data, error } = await supabase
    .from('em_rule_metadata')
    .select('*')
    .eq('rule_id', ruleId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as EmRuleMetadata | null;
}

export async function upsertRuleMetadata(meta: Partial<EmRuleMetadata> & { rule_id: string }): Promise<EmRuleMetadata> {
  const { data, error } = await supabase
    .from('em_rule_metadata')
    .upsert(meta, { onConflict: 'rule_id,rule_version' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EmRuleMetadata;
}

export async function deleteRuleMetadata(id: string): Promise<void> {
  const { error } = await supabase.from('em_rule_metadata').delete().eq('id', id);
  if (error) throw error;
}

export async function verifyRuleMetadata(id: string, verifiedBy: string): Promise<void> {
  const { error } = await supabase
    .from('em_rule_metadata')
    .update({ is_verified: true, verified_by: verifiedBy, verified_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// ENGINE SETTINGS
// ============================================================

export async function fetchEngineSettings(): Promise<EmEngineSetting[]> {
  const { data, error } = await supabase
    .from('em_engine_settings')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmEngineSetting[];
}

export async function fetchEngineSetting(key: string): Promise<EmEngineSetting | null> {
  const { data, error } = await supabase
    .from('em_engine_settings')
    .select('*')
    .eq('setting_key', key)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as EmEngineSetting | null;
}

export async function updateEngineSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from('em_engine_settings')
    .update({ setting_value: value, updated_at: new Date().toISOString() })
    .eq('setting_key', key);
  if (error) throw error;
}

export async function upsertEngineSetting(setting: Partial<EmEngineSetting> & { setting_key: string }): Promise<EmEngineSetting> {
  const { data, error } = await supabase
    .from('em_engine_settings')
    .upsert(setting, { onConflict: 'setting_key' })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EmEngineSetting;
}

// ============================================================
// MARKET ACTIVATION (bridge to existing market_profiles)
// ============================================================

/**
 * Toggle a market's active status.
 * Uses the existing market_profiles table — does NOT create a duplicate.
 * Ghana and Kenya remain inactive unless explicitly activated here.
 */
export async function toggleMarketActivation(countryCode: string, status: 'active' | 'coming_soon' | 'unsupported' | 'test_only'): Promise<void> {
  const { error } = await supabase
    .from('market_profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('country_code', countryCode);
  if (error) throw error;
}

/**
 * Fetch market activation status.
 */
export async function fetchMarketActivationStatus(): Promise<{ country_code: string; country_name: string; status: string }[]> {
  const { data, error } = await supabase
    .from('market_profiles')
    .select('country_code, country_name, status')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as { country_code: string; country_name: string; status: string }[];
}
