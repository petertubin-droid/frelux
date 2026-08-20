import { supabase, isSupabaseConfigured } from './supabase';
import { FALLBACK_TEMPLATES } from './template-data';
import type {
  DbCalculatorTemplate,
  TemplateCreateInput,
  TemplateUpdateInput,
  CalculatorType,
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
  paint: { label: 'Painting', path: '/paint-calculator', icon: 'paint' },
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
