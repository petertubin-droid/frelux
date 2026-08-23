import { supabase } from '@/lib/supabase';
import type { DbMarketplaceProduct, DbProductCategory, DbProductInquiry, ProductCondition } from '@/types/marketplace-products';

// ============================================================
// PRODUCT CATEGORIES
// ============================================================

export async function fetchProductCategories(): Promise<DbProductCategory[]> {
  const { data, error } = await supabase
    .from('marketplace_product_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbProductCategory[];
}

export async function fetchProductCategoryBySlug(slug: string): Promise<DbProductCategory | null> {
  const { data, error } = await supabase
    .from('marketplace_product_categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as DbProductCategory;
}

// ============================================================
// PRODUCTS CRUD
// ============================================================

export async function searchProducts(params: {
  search?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  condition?: ProductCondition;
  location_state?: string;
  location_city?: string;
  delivery_available?: boolean;
  sort?: 'newest' | 'price_low' | 'price_high' | 'popular' | 'featured';
  limit?: number;
  offset?: number;
}): Promise<{ products: DbMarketplaceProduct[]; total: number }> {
  const limit = params.limit ?? 24;
  const offset = params.offset ?? 0;

  let query = supabase
    .from('marketplace_products')
    .select('*, category:marketplace_product_categories(id, name, slug), seller:profiles!seller_id(id, full_name, avatar_url, marketplace_id)', { count: 'exact' })
    .eq('status', 'active')
    .eq('admin_removed', false)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,brand.ilike.%${params.search}%`);
  }
  if (params.category_id) query = query.eq('category_id', params.category_id);
  if (params.min_price !== undefined) query = query.gte('price', params.min_price);
  if (params.max_price !== undefined) query = query.lte('price', params.max_price);
  if (params.condition) query = query.eq('condition', params.condition);
  if (params.location_state) query = query.eq('location_state', params.location_state);
  if (params.location_city) query = query.ilike('location_city', `%${params.location_city}%`);
  if (params.delivery_available !== undefined) query = query.eq('delivery_available', params.delivery_available);

  // Sort
  if (params.sort === 'price_low') {
    query = query.order('is_featured', { ascending: false }).order('price', { ascending: true });
  } else if (params.sort === 'price_high') {
    query = query.order('is_featured', { ascending: false }).order('price', { ascending: false });
  } else if (params.sort === 'popular') {
    query = query.order('is_featured', { ascending: false }).order('view_count', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { products: (data ?? []) as unknown as DbMarketplaceProduct[], total: count ?? 0 };
}

export async function fetchProduct(id: string): Promise<DbMarketplaceProduct | null> {
  const { data, error } = await supabase
    .from('marketplace_products')
    .select('*, category:marketplace_product_categories(id, name, slug), seller:profiles!seller_id(id, full_name, avatar_url, marketplace_id)')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as DbMarketplaceProduct;
}

export async function fetchMyProducts(userId: string): Promise<DbMarketplaceProduct[]> {
  const { data, error } = await supabase
    .from('marketplace_products')
    .select('*')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbMarketplaceProduct[];
}

export async function createProduct(data: {
  seller_id: string;
  title: string;
  description?: string;
  category_id?: string;
  price: number;
  compare_at_price?: number;
  currency?: string;
  negotiable?: boolean;
  condition?: ProductCondition;
  quantity?: number;
  unit?: string;
  images?: string[];
  primary_image_idx?: number;
  location_state?: string;
  location_city?: string;
  location_area?: string;
  latitude?: number;
  longitude?: number;
  delivery_available?: boolean;
  delivery_fee?: number;
  pickup_available?: boolean;
  specs?: Record<string, string>;
  tags?: string[];
  brand?: string;
}): Promise<DbMarketplaceProduct> {
  const { data: result, error } = await supabase
    .from('marketplace_products')
    .insert({
      ...data,
      status: 'active',
      images: data.images ?? [],
      specs: data.specs ?? {},
      tags: data.tags ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return result as DbMarketplaceProduct;
}

export async function updateProduct(id: string, updates: Partial<DbMarketplaceProduct>): Promise<DbMarketplaceProduct> {
  const { data, error } = await supabase
    .from('marketplace_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbMarketplaceProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('marketplace_products')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function incrementProductView(id: string): Promise<void> {
  try {
    await supabase.rpc('increment_product_view_count', { p_product_id: id });
  } catch { /* non-critical */ }
}

// ============================================================
// INQUIRIES
// ============================================================

export async function createInquiry(data: {
  product_id: string;
  buyer_id: string;
  message: string;
  offered_price?: number;
  contact_phone?: string;
}): Promise<DbProductInquiry> {
  const { data: result, error } = await supabase
    .from('marketplace_product_inquiries')
    .insert({
      ...data,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  // Increment inquiry count
  await supabase.rpc('increment_product_inquiry_count', { product_id: data.product_id });

  return result as DbProductInquiry;
}

export async function fetchInquiriesForProduct(productId: string): Promise<DbProductInquiry[]> {
  const { data, error } = await supabase
    .from('marketplace_product_inquiries')
    .select('*, buyer:profiles(id, full_name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DbProductInquiry[];
}

export async function fetchInquiriesForSeller(sellerId: string): Promise<DbProductInquiry[]> {
  const { data, error } = await supabase
    .from('marketplace_product_inquiries')
    .select(`
      *,
      product:marketplace_products(id, title, price, images, status),
      buyer:profiles(id, full_name, avatar_url)
    `)
    .in('product_id', (
      await supabase.from('marketplace_products').select('id').eq('seller_id', sellerId)
    ).data?.map((p) => p.id) ?? [])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DbProductInquiry[];
}

export async function updateInquiryStatus(id: string, status: 'responded' | 'closed' | 'spam'): Promise<void> {
  const { error } = await supabase
    .from('marketplace_product_inquiries')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}
