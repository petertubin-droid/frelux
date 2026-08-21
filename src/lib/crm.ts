import { supabase, isSupabaseConfigured } from './supabase';
import type { DbClient, DbClientCommunication } from '@/types/database';

// =========================================================
// Client CRUD
// =========================================================

export async function getClients(userId: string): Promise<DbClient[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbClient[];
}

export async function createClient(
  userId: string,
  input: { name: string; company?: string; email?: string; phone?: string; address?: string; notes?: string }
): Promise<DbClient> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name: input.name,
      company: input.company ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbClient;
}

export async function updateClient(
  clientId: string,
  userId: string,
  updates: Partial<Pick<DbClient, 'name' | 'company' | 'email' | 'phone' | 'address' | 'notes' | 'status'>>
): Promise<DbClient> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as DbClient;
}

export async function deleteClient(clientId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('user_id', userId);
  if (error) throw error;
}

// =========================================================
// Client Communications
// =========================================================

export async function getClientCommunications(clientId: string): Promise<DbClientCommunication[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('client_communications')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbClientCommunication[];
}

export async function addClientCommunication(
  clientId: string,
  userId: string,
  input: { type: DbClientCommunication['type']; subject?: string; body?: string }
): Promise<DbClientCommunication> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('client_communications')
    .insert({
      client_id: clientId,
      user_id: userId,
      type: input.type,
      subject: input.subject ?? null,
      body: input.body ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbClientCommunication;
}

export async function deleteClientCommunication(commId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('client_communications')
    .delete()
    .eq('id', commId)
    .eq('user_id', userId);
  if (error) throw error;
}

// =========================================================
// Client Project History
// =========================================================

export async function getClientProjects(userId: string, clientName: string) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('contractor_projects')
    .select('id, name, status, total_project_cost, currency, currency_symbol, created_at, updated_at')
    .eq('user_id', userId)
    .eq('client_name', clientName)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// =========================================================
// Project Folders
// =========================================================

export async function getProjectFolders(userId: string) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('project_folders')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createProjectFolder(userId: string, name: string, color?: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('project_folders')
    .insert({ user_id: userId, name, color: color ?? 'neutral' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProjectFolder(folderId: string, userId: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('project_folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function moveProjectToFolder(projectId: string, folderId: string | null) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('contractor_projects')
    .update({ folder_id: folderId })
    .eq('id', projectId);
  if (error) throw error;
}

// =========================================================
// Estimate History
// =========================================================

export async function saveEstimateHistory(
  userId: string | null,
  input: {
    calculator_type: 'paint' | 'tile' | 'pop' | 'screeding';
    project_name?: string;
    total_cost?: number;
    material_cost?: number;
    labour_cost?: number;
    currency?: string;
    input_data?: Record<string, unknown>;
    result_data?: Record<string, unknown>;
  }
) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('estimate_history')
    .insert({
      user_id: userId,
      calculator_type: input.calculator_type,
      project_name: input.project_name ?? null,
      total_cost: input.total_cost ?? null,
      material_cost: input.material_cost ?? null,
      labour_cost: input.labour_cost ?? null,
      currency: input.currency ?? 'NGN',
      input_data: input.input_data ?? {},
      result_data: input.result_data ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getEstimateHistory(userId: string, options?: { calculatorType?: string; limit?: number }) {
  if (!isSupabaseConfigured) return [];
  let q = supabase
    .from('estimate_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.calculatorType) q = q.eq('calculator_type', options.calculatorType);
  if (options?.limit) q = q.limit(options.limit);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// =========================================================
// Integration Settings (Admin)
// =========================================================

export async function getIntegrationSettings() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('integration_settings')
    .select('*')
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateIntegrationSetting(
  integrationKey: string,
  updates: { is_enabled?: boolean; config?: Record<string, unknown> }
) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('integration_settings')
    .update(updates)
    .eq('integration_key', integrationKey)
    .select()
    .single();
  if (error) throw error;

  // Sync Google integrations to site_settings for backward compatibility
  // (AnalyticsScripts and AdSlot legacy fallback read from site_settings)
  if (updates.config && data) {
    syncToSiteSettings(integrationKey, data).catch(() => {});
  }

  return data;
}

/**
 * Sync integration_settings changes to site_settings so legacy code paths
 * that read from site_settings (e.g. AdSlot legacy fallback) stay in sync.
 */
async function syncToSiteSettings(integrationKey: string, integration: { config: Record<string, unknown>; is_enabled: boolean }) {
  if (!isSupabaseConfigured) return;
  const cfg = integration.config;
  const updates: Record<string, unknown> = {};

  if (integrationKey === 'google_analytics') {
    updates.ga_measurement_id = (cfg.measurement_id as string) ?? '';
  } else if (integrationKey === 'google_adsense') {
    updates.adsense_publisher_id = (cfg.publisher_id as string) ?? (cfg.client_id as string) ?? '';
    updates.ads_enabled = integration.is_enabled && !!(cfg.publisher_id ?? cfg.client_id);
  } else if (integrationKey === 'google_search_console') {
    updates.google_site_verification = (cfg.verification_token as string) ?? '';
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('site_settings').update(updates).neq('id', '00000000-0000-0000-0000-000000000000');
  }
}
