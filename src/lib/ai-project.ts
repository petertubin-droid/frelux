import { supabase, isSupabaseConfigured } from './supabase';

// =========================================================
// AI Project Assistant Client
// =========================================================

export interface ProjectAiReview {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingMaterials: string[];
  costAnalysis: string;
  recommendations: string[];
  estimatedDurationNote: string;
  industryStandards: string[];
  bestPractices: string[];
}

export interface ProjectAiOptimization {
  strategy: string;
  savings: string;
  changes: Array<{
    area: string;
    current: string;
    recommended: string;
    impact: string;
  }>;
  tradeOffs: string[];
  newEstimate: string;
  warnings: string[];
}

export interface ProjectAiExplanation {
  overview: string;
  roomBreakdowns: Array<{
    roomName: string;
    calculations: string[];
  }>;
  materialLogic: string;
  wasteFactor: string;
  labourLogic: string;
  proTips: string[];
}

export interface ProjectAiQa {
  answer: string;
  details: string;
  recommendations: string[];
  references: string[];
}

export interface ProjectDataForAi {
  name: string;
  project_type: string;
  building_type: string;
  finish_quality: string;
  budget_level: string;
  status: string;
  rooms?: Array<{
    name: string;
    calculation_type: string;
    surface_area: number;
    material_cost: number;
    labour_cost: number;
    input_data: Record<string, unknown>;
  }>;
  total_material_cost: number;
  total_labour_cost: number;
  total_project_cost: number;
  currency: string;
  currency_symbol: string;
  notes?: string;
}

export async function aiProjectReview(projectData: ProjectDataForAi): Promise<ProjectAiReview> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('ai-project-assistant', {
    body: { action: 'review', projectData },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as ProjectAiReview;
}

export async function aiProjectOptimize(
  projectData: ProjectDataForAi,
  target: string
): Promise<ProjectAiOptimization> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('ai-project-assistant', {
    body: { action: 'optimize', projectData, optimizationTarget: target },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as ProjectAiOptimization;
}

export async function aiProjectExplain(projectData: ProjectDataForAi): Promise<ProjectAiExplanation> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('ai-project-assistant', {
    body: { action: 'explain', projectData },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as ProjectAiExplanation;
}

export async function aiProjectQa(projectData: ProjectDataForAi, question: string): Promise<ProjectAiQa> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('ai-project-assistant', {
    body: { action: 'qa', projectData, question },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as ProjectAiQa;
}

// =========================================================
// AI Before & After Preview Client
// =========================================================

export interface ColorPreviewResult {
  previewDescription: string;
  colorSuggestions: Array<{
    hex: string;
    name: string;
    reasoning: string;
    coverageArea: string;
  }>;
  applicationTips: string[];
}

export interface ColorPreviewRequest {
  imageDataUrl?: string;
  roomDescription?: string;
  targetColors: Array<{ name: string; hex: string }>;
  roomType?: string;
  lightingCondition?: string;
  mood?: string;
  style?: string;
}

export async function aiColorPreview(req: ColorPreviewRequest): Promise<ColorPreviewResult> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('ai-color-preview', {
    body: req,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as ColorPreviewResult;
}
