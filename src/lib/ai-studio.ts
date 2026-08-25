import { supabase, getFunctionErrorMessage } from '@/lib/supabase';
import type { StudioToolType, DbStudioSession, DbStudioArtifact, DbStudioVersion, DbStudioPrompt, DbStudioPlugin, DbStudioIntegration, DbStudioFeature, DbStudioMetric, DbStudioRole, DbStudioChat } from '@/types/database';

export interface StudioAiRequest {
  tool: StudioToolType;
  prompt: string;
  context?: {
    fileName?: string;
    fileContent?: string;
    artifactType?: string;
    sessionHistory?: { role: string; content: string }[];
  };
  sessionId?: string;
}

export interface StudioAiResponse {
  response: string;
  tool: string;
}

export class StudioAiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'StudioAiError';
  }
}

export async function invokeStudioAi(req: StudioAiRequest): Promise<string> {
  try {
  const { data, error } = await supabase.functions.invoke<StudioAiResponse | { error: string; code?: string }>('ai-studio', {
    body: req,
  });

  if (error) {
    throw new StudioAiError(await getFunctionErrorMessage(error), 'INVOCATION_ERROR', 500);
  }

  if (!data) {
    throw new StudioAiError('No response from AI service.', 'EMPTY_RESPONSE', 502);
  }

  if ('error' in data && data.error) {
    const code = data.code ?? 'AI_ERROR';
    const message =
      code === 'NO_API_KEY'
        ? 'The AI service is not configured. Add a Google AI API key in Supabase secrets.'
        : code === 'UNAUTHORIZED'
        ? 'You must be signed in as an admin to use the AI Studio.'
        : code === 'FORBIDDEN'
        ? 'Admin access is required for the AI Studio.'
        : data.error;
    throw new StudioAiError(message, code, code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' ? 403 : 502);
  }

  if (!('response' in data) || !data.response) {
    throw new StudioAiError('The AI response was incomplete.', 'INVALID_RESPONSE', 502);
  }

  return data.response;
  } catch (error) {
    captureAiError(error, { feature: 'AI Studio' });
    throw error;
  }
}

// =========================================================
// Sessions
// =========================================================

export async function createSession(toolType: StudioToolType, title: string): Promise<DbStudioSession> {
  const { data, error } = await supabase
    .from('ai_studio_sessions')
    .insert({ tool_type: toolType, title })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbStudioSession;
}

export async function fetchSessions(toolType?: StudioToolType): Promise<DbStudioSession[]> {
  let query = supabase.from('ai_studio_sessions').select('*').order('updated_at', { ascending: false }).limit(50);
  if (toolType) query = query.eq('tool_type', toolType);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioSession[];
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('ai_studio_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// =========================================================
// Chat
// =========================================================

export async function fetchChatHistory(sessionId: string): Promise<DbStudioChat[]> {
  const { data, error } = await supabase
    .from('ai_studio_chat')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioChat[];
}

// =========================================================
// Artifacts
// =========================================================

export async function fetchArtifacts(sessionId?: string): Promise<DbStudioArtifact[]> {
  let query = supabase.from('ai_studio_artifacts').select('*').order('updated_at', { ascending: false }).limit(100);
  if (sessionId) query = query.eq('session_id', sessionId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioArtifact[];
}

export async function createArtifact(input: {
  session_id?: string;
  artifact_type: string;
  title: string;
  description?: string;
  content: string;
  language?: string;
  tags?: string[];
}): Promise<DbStudioArtifact> {
  const { data, error } = await supabase
    .from('ai_studio_artifacts')
    .insert({
      session_id: input.session_id ?? null,
      artifact_type: input.artifact_type,
      title: input.title,
      description: input.description ?? null,
      content: input.content,
      language: input.language ?? 'typescript',
      tags: input.tags ?? [],
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbStudioArtifact;
}

export async function updateArtifact(id: string, updates: Partial<Pick<DbStudioArtifact, 'title' | 'description' | 'content' | 'status' | 'tags'>>): Promise<void> {
  const { error } = await supabase.from('ai_studio_artifacts').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteArtifact(id: string): Promise<void> {
  const { error } = await supabase.from('ai_studio_artifacts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// =========================================================
// Versions
// =========================================================

export async function fetchVersions(artifactId: string): Promise<DbStudioVersion[]> {
  const { data, error } = await supabase
    .from('ai_studio_versions')
    .select('*')
    .eq('artifact_id', artifactId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioVersion[];
}

export async function createVersion(artifactId: string, versionNumber: number, content: string, changeSummary?: string): Promise<void> {
  const { error } = await supabase.from('ai_studio_versions').insert({
    artifact_id: artifactId,
    version_number: versionNumber,
    content,
    change_summary: changeSummary ?? null,
  });
  if (error) throw new Error(error.message);
}

// =========================================================
// Prompts
// =========================================================

export async function fetchPrompts(category?: string): Promise<DbStudioPrompt[]> {
  let query = supabase.from('ai_studio_prompts').select('*').order('sort_order', { ascending: true }).order('title', { ascending: true });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioPrompt[];
}

export async function createPrompt(input: {
  title: string;
  category: string;
  description?: string;
  system_prompt: string;
  user_prompt_template: string;
  tool_type?: StudioToolType;
}): Promise<DbStudioPrompt> {
  const { data, error } = await supabase
    .from('ai_studio_prompts')
    .insert({ ...input, is_builtin: false })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbStudioPrompt;
}

export async function deletePrompt(id: string): Promise<void> {
  const { error } = await supabase.from('ai_studio_prompts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// =========================================================
// Plugins
// =========================================================

export async function fetchPlugins(): Promise<DbStudioPlugin[]> {
  const { data, error } = await supabase.from('ai_studio_plugins').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioPlugin[];
}

export async function updatePluginStatus(id: string, status: DbStudioPlugin['status']): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'installed' || status === 'enabled') updates.installed_at = new Date().toISOString();
  const { error } = await supabase.from('ai_studio_plugins').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

// =========================================================
// Integrations
// =========================================================

export async function fetchIntegrations(): Promise<DbStudioIntegration[]> {
  const { data, error } = await supabase.from('ai_studio_integrations').select('*').order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioIntegration[];
}

export async function createIntegration(input: { name: string; service_type: string; config?: Record<string, unknown> }): Promise<DbStudioIntegration> {
  const { data, error } = await supabase
    .from('ai_studio_integrations')
    .insert({ ...input, config: input.config ?? {} })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbStudioIntegration;
}

export async function updateIntegration(id: string, updates: Partial<Pick<DbStudioIntegration, 'status' | 'config' | 'health_status'>>): Promise<void> {
  const { error } = await supabase.from('ai_studio_integrations').update({ ...updates, last_checked_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteIntegration(id: string): Promise<void> {
  const { error } = await supabase.from('ai_studio_integrations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// =========================================================
// Features
// =========================================================

export async function fetchFeatures(): Promise<DbStudioFeature[]> {
  const { data, error } = await supabase.from('ai_studio_features').select('*').order('category', { ascending: true }).order('label', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioFeature[];
}

export async function updateFeature(id: string, updates: Partial<Pick<DbStudioFeature, 'is_enabled' | 'rollout_percentage' | 'description'>>): Promise<void> {
  const { error } = await supabase.from('ai_studio_features').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

// =========================================================
// Metrics
// =========================================================

export async function fetchMetrics(category?: string, limit = 100): Promise<DbStudioMetric[]> {
  let query = supabase.from('ai_studio_metrics').select('*').order('recorded_at', { ascending: false }).limit(limit);
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioMetric[];
}

// =========================================================
// Roles
// =========================================================

export async function fetchRoles(): Promise<DbStudioRole[]> {
  const { data, error } = await supabase.from('ai_studio_roles').select('*').order('role_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbStudioRole[];
}

export async function createRole(input: { role_name: string; description?: string; permissions: string[] }): Promise<DbStudioRole> {
  const { data, error } = await supabase
    .from('ai_studio_roles')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbStudioRole;
}

export async function updateRole(id: string, updates: Partial<Pick<DbStudioRole, 'description' | 'permissions'>>): Promise<void> {
  const { error } = await supabase.from('ai_studio_roles').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('ai_studio_roles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
