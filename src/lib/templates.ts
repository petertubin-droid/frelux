import { supabase, isSupabaseConfigured } from './supabase';
import { FALLBACK_TEMPLATES } from './template-data';
import type {
  DbCalculatorTemplate,
  TemplateCreateInput,
  TemplateUpdateInput,
  CalculatorType,
  TemplateVisibility,
} from '@/types/database';

// =========================================================
// Private User Templates (authenticated)
// =========================================================

export async function getUserTemplates(
  userId: string,
  options?: { calculatorType?: CalculatorType; search?: string; sort?: 'recent' | 'name' | 'favorites' }
): Promise<DbCalculatorTemplate[]> {
  if (!isSupabaseConfigured) return [];
  let q = supabase
    .from('calculator_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('visibility', 'private');

  if (options?.calculatorType) q = q.eq('calculator_type', options.calculatorType);
  if (options?.search) q = q.ilike('name', `%${options.search}%`);

  if (options?.sort === 'name') q = q.order('name', { ascending: true });
  else if (options?.sort === 'favorites') q = q.order('is_favorite', { ascending: false }).order('updated_at', { ascending: false });
  else q = q.order('updated_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbCalculatorTemplate[];
}

export async function createUserTemplate(
  userId: string,
  input: TemplateCreateInput
): Promise<DbCalculatorTemplate> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('calculator_templates')
    .insert({
      user_id: userId,
      calculator_type: input.calculator_type,
      name: input.name,
      description: input.description ?? null,
      input_data: input.input_data,
      visibility: input.visibility ?? 'private',
      is_published: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbCalculatorTemplate;
}

export async function updateUserTemplate(
  templateId: string,
  userId: string,
  updates: TemplateUpdateInput
): Promise<DbCalculatorTemplate> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('calculator_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as DbCalculatorTemplate;
}

export async function deleteUserTemplate(templateId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('calculator_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function duplicateUserTemplate(
  templateId: string,
  userId: string,
  newName?: string
): Promise<DbCalculatorTemplate> {
  const original = await getUserTemplateById(templateId, userId);
  return createUserTemplate(userId, {
    calculator_type: original.calculator_type,
    name: newName ?? `${original.name} (Copy)`,
    description: original.description ?? undefined,
    input_data: original.input_data,
    visibility: 'private',
  });
}

export async function getUserTemplateById(
  templateId: string,
  userId: string
): Promise<DbCalculatorTemplate> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('calculator_templates')
    .select('*')
    .eq('id', templateId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data as DbCalculatorTemplate;
}

// =========================================================
// Public Templates (no auth required)
// =========================================================

export async function getPublicTemplates(
  options?: { calculatorType?: CalculatorType; search?: string; featuredOnly?: boolean }
): Promise<DbCalculatorTemplate[]> {
  if (!isSupabaseConfigured) {
    let result = FALLBACK_TEMPLATES;
    if (options?.calculatorType) result = result.filter((t) => t.calculator_type === options.calculatorType);
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false));
    }
    if (options?.featuredOnly) result = result.filter((t) => t.is_featured);
    return result.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.display_order - b.display_order);
  }
  let q = supabase
    .from('calculator_templates')
    .select('*')
    .eq('visibility', 'public')
    .eq('is_published', true);

  if (options?.calculatorType) q = q.eq('calculator_type', options.calculatorType);
  if (options?.search) q = q.ilike('name', `%${options.search}%`);
  if (options?.featuredOnly) q = q.eq('is_featured', true);

  q = q.order('is_featured', { ascending: false }).order('display_order', { ascending: true });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbCalculatorTemplate[];
}

export async function getPublicTemplateBySlug(slug: string): Promise<DbCalculatorTemplate | null> {
  if (!isSupabaseConfigured) return FALLBACK_TEMPLATES.find((t) => t.slug === slug) ?? null;
  const { data, error } = await supabase
    .from('calculator_templates')
    .select('*')
    .eq('slug', slug)
    .eq('visibility', 'public')
    .eq('is_published', true)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data as DbCalculatorTemplate;
}

export async function getRelatedPublicTemplates(
  calculatorType: CalculatorType,
  excludeId: string,
  limit = 4
): Promise<DbCalculatorTemplate[]> {
  if (!isSupabaseConfigured) {
    return FALLBACK_TEMPLATES
      .filter((t) => t.calculator_type === calculatorType && t.id !== excludeId)
      .sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.display_order - b.display_order)
      .slice(0, limit);
  }
  const { data, error } = await supabase
    .from('calculator_templates')
    .select('*')
    .eq('visibility', 'public')
    .eq('is_published', true)
    .eq('calculator_type', calculatorType)
    .neq('id', excludeId)
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DbCalculatorTemplate[];
}

// =========================================================
// Admin Template Management
// =========================================================

export async function adminGetAllTemplates(): Promise<DbCalculatorTemplate[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('calculator_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbCalculatorTemplate[];
}

export async function adminCreateTemplate(
  input: TemplateCreateInput & {
    is_featured?: boolean;
    is_published?: boolean;
    slug?: string;
    seo_title?: string;
    seo_description?: string;
    display_order?: number;
  }
): Promise<DbCalculatorTemplate> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('calculator_templates')
    .insert({
      calculator_type: input.calculator_type,
      name: input.name,
      description: input.description ?? null,
      input_data: input.input_data,
      visibility: 'public',
      is_published: input.is_published ?? true,
      is_featured: input.is_featured ?? false,
      slug: input.slug ?? null,
      seo_title: input.seo_title ?? null,
      seo_description: input.seo_description ?? null,
      display_order: input.display_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbCalculatorTemplate;
}

export async function adminUpdateTemplate(
  templateId: string,
  updates: Partial<DbCalculatorTemplate>
): Promise<DbCalculatorTemplate> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('calculator_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();
  if (error) throw error;
  return data as DbCalculatorTemplate;
}

export async function adminDeleteTemplate(templateId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('calculator_templates')
    .delete()
    .eq('id', templateId);
  if (error) throw error;
}

// =========================================================
// Calculator type metadata
// =========================================================
export const CALCULATOR_META: Record<CalculatorType, { label: string; path: string; icon: string }> = {
  paint: { label: 'Painting', path: '/paint-calculator?mode=room-estimate', icon: 'paint' },
  tile: { label: 'Tiling', path: '/tile-calculator', icon: 'tile' },
  pop: { label: 'POP Ceiling', path: '/pop-ceiling-calculator', icon: 'pop' },
  screeding: { label: 'Wall Screeding', path: '/screeding-calculator', icon: 'screeding' },
};

export function calculatorLabel(type: CalculatorType): string {
  return CALCULATOR_META[type]?.label ?? type;
}

export function calculatorPath(type: CalculatorType): string {
  return CALCULATOR_META[type]?.path ?? '/';
}

// =========================================================
// Template Import / Export
// =========================================================

export interface TemplateExportData {
  version: number;
  exportedAt: string;
  template: {
    calculator_type: CalculatorType;
    name: string;
    description: string | null;
    input_data: Record<string, unknown>;
    visibility: TemplateVisibility;
    category: string | null;
    building_type: string | null;
  };
}

export function exportTemplate(template: DbCalculatorTemplate): void {
  const exportData: TemplateExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    template: {
      calculator_type: template.calculator_type,
      name: template.name,
      description: template.description,
      input_data: template.input_data,
      visibility: template.visibility,
      category: (template as DbCalculatorTemplate & { category?: string | null }).category ?? null,
      building_type: (template as DbCalculatorTemplate & { building_type?: string | null }).building_type ?? null,
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `frelux-template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importTemplate(
  userId: string,
  file: File
): Promise<DbCalculatorTemplate> {
  const text = await file.text();
  let data: TemplateExportData;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid template file: not valid JSON');
  }

  if (!data.version || !data.template) {
    throw new Error('Invalid template file: missing required fields');
  }

  if (!data.template.calculator_type || !data.template.name) {
    throw new Error('Invalid template file: missing calculator_type or name');
  }

  const validTypes: CalculatorType[] = ['paint', 'tile', 'pop', 'screeding'];
  if (!validTypes.includes(data.template.calculator_type)) {
    throw new Error(`Invalid calculator type: ${data.template.calculator_type}`);
  }

  return createUserTemplate(userId, {
    calculator_type: data.template.calculator_type,
    name: data.template.name,
    description: data.template.description ?? undefined,
    input_data: data.template.input_data,
    visibility: 'private',
  });
}

// =========================================================
// Template Categories
// =========================================================

export const TEMPLATE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
] as const;

export const BUILDING_TYPES = [
  { value: 'residential', label: 'Residential Building' },
  { value: 'commercial', label: 'Commercial Building' },
  { value: 'industrial', label: 'Industrial Project' },
  { value: 'hotel', label: 'Hotels' },
  { value: 'hospital', label: 'Hospitals' },
  { value: 'school', label: 'Schools' },
  { value: 'duplex', label: 'Duplexes' },
  { value: 'apartment', label: 'Apartments' },
] as const;

export async function getTemplatesByCategory(
  category: string,
  options?: { calculatorType?: CalculatorType }
): Promise<DbCalculatorTemplate[]> {
  if (!isSupabaseConfigured) return [];
  let q = supabase
    .from('calculator_templates')
    .select('*')
    .eq('visibility', 'public')
    .eq('is_published', true)
    .eq('category', category);

  if (options?.calculatorType) q = q.eq('calculator_type', options.calculatorType);

  q = q.order('display_order', { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbCalculatorTemplate[];
}

export async function getTemplatesByBuildingType(
  buildingType: string,
  options?: { calculatorType?: CalculatorType }
): Promise<DbCalculatorTemplate[]> {
  if (!isSupabaseConfigured) return [];
  let q = supabase
    .from('calculator_templates')
    .select('*')
    .eq('visibility', 'public')
    .eq('is_published', true)
    .eq('building_type', buildingType);

  if (options?.calculatorType) q = q.eq('calculator_type', options.calculatorType);

  q = q.order('display_order', { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbCalculatorTemplate[];
}

// =========================================================
// Default Template Management
// =========================================================

export async function setDefaultTemplate(
  userId: string,
  templateId: string,
  calculatorType: CalculatorType
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  // Unset any existing default for this calculator type
  await supabase
    .from('calculator_templates')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('calculator_type', calculatorType)
    .eq('is_default', true);

  // Set the new default
  const { error } = await supabase
    .from('calculator_templates')
    .update({ is_default: true })
    .eq('id', templateId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getDefaultTemplate(
  userId: string,
  calculatorType: CalculatorType
): Promise<DbCalculatorTemplate | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('calculator_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('calculator_type', calculatorType)
    .eq('is_default', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as DbCalculatorTemplate;
}
