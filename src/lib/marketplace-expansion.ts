import { supabase } from '@/lib/supabase';
import type {
  DbMarketplaceFavorite,
  DbMarketplaceReview,
  DbMarketplaceReport,
  DbMarketplaceSellerProfile,
  DbMarketplacePricingUnit,
  FavoriteItemType,
  ReviewType,
  ReportType,
  ReportReason,
  SellerType,
} from '@/types/marketplace-expansion';

// ============================================================
// FAVORITES
// ============================================================

export async function toggleFavorite(
  userId: string,
  itemType: FavoriteItemType,
  itemId: string,
): Promise<boolean> {
  // Check if already favorited
  const col = itemType === 'product' ? 'product_id' : itemType === 'listing' ? 'listing_id' : 'pro_profile_id';
  const { data: existing } = await supabase
    .from('marketplace_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq(col, itemId)
    .maybeSingle();

  if (existing) {
    // Remove
    const { error } = await supabase
      .from('marketplace_favorites')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    // Add
    const insert: Record<string, unknown> = { user_id: userId, item_type: itemType };
    insert[col] = itemId;
    const { error } = await supabase
      .from('marketplace_favorites')
      .insert(insert);
    if (error) throw error;
    return true;
  }
}

export async function isFavorited(userId: string, itemType: FavoriteItemType, itemId: string): Promise<boolean> {
  const col = itemType === 'product' ? 'product_id' : itemType === 'listing' ? 'listing_id' : 'pro_profile_id';
  const { data } = await supabase
    .from('marketplace_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq(col, itemId)
    .maybeSingle();
  return !!data;
}

export async function fetchFavorites(userId: string, itemType?: FavoriteItemType): Promise<DbMarketplaceFavorite[]> {
  let query = supabase
    .from('marketplace_favorites')
    .select(`
      *,
      product:marketplace_products(id, title, price, currency, images, primary_image_idx),
      listing:marketplace_listings(id, title, status),
      pro_profile:pro_profiles(id, display_name, slug, profile_image_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (itemType) query = query.eq('item_type', itemType);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DbMarketplaceFavorite[];
}

export async function fetchFavoriteIds(userId: string, itemType: FavoriteItemType): Promise<Set<string>> {
  const col = itemType === 'product' ? 'product_id' : itemType === 'listing' ? 'listing_id' : 'pro_profile_id';
  const { data, error } = await supabase
    .from('marketplace_favorites')
    .select(col)
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .not(col, 'is', null);
  if (error) throw error;
  return new Set(((data ?? []) as Record<string, unknown>[]).map((r: Record<string, unknown>) => (r[col] as string)));
}

// ============================================================
// REVIEWS
// ============================================================

export async function fetchReviews(params: {
  review_type?: ReviewType;
  seller_id?: string;
  pro_profile_id?: string;
  product_id?: string;
  listing_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{ reviews: DbMarketplaceReview[]; total: number }> {
  let query = supabase
    .from('marketplace_reviews')
    .select('*, reviewer:profiles!reviewer_id(id, full_name, avatar_url)', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (params.review_type) query = query.eq('review_type', params.review_type);
  if (params.seller_id) query = query.eq('seller_id', params.seller_id);
  if (params.pro_profile_id) query = query.eq('pro_profile_id', params.pro_profile_id);
  if (params.product_id) query = query.eq('product_id', params.product_id);
  if (params.listing_id) query = query.eq('listing_id', params.listing_id);

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { reviews: (data ?? []) as unknown as DbMarketplaceReview[], total: count ?? 0 };
}

export async function fetchReviewStats(target: { type: ReviewType; id: string }): Promise<{
  avg: number;
  count: number;
}> {
  let query = supabase
    .from('marketplace_reviews')
    .select('rating')
    .eq('status', 'published');

  const col = target.type === 'product' ? 'product_id' : target.type === 'listing' ? 'listing_id'
    : target.type === 'professional' ? 'pro_profile_id' : 'seller_id';
  query = query.eq(col, target.id);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return { avg: 0, count: 0 };
  const sum = data.reduce((s, r) => s + r.rating, 0);
  return { avg: sum / data.length, count: data.length };
}

export async function createReview(data: {
  reviewer_id: string;
  review_type: ReviewType;
  product_id?: string;
  listing_id?: string;
  pro_profile_id?: string;
  seller_id?: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<DbMarketplaceReview> {
  const { data: result, error } = await supabase
    .from('marketplace_reviews')
    .insert({ ...data, status: 'published' })
    .select()
    .single();
  if (error) throw error;
  return result as unknown as DbMarketplaceReview;
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('marketplace_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('reviewer_id', userId);
  if (error) throw error;
}

// ============================================================
// REPORTS
// ============================================================

export async function createReport(data: {
  reporter_id: string;
  report_type: ReportType;
  product_id?: string;
  listing_id?: string;
  review_id?: string;
  reported_user_id?: string;
  pro_profile_id?: string;
  reason: ReportReason;
  description?: string;
}): Promise<DbMarketplaceReport> {
  const { data: result, error } = await supabase
    .from('marketplace_reports')
    .insert({ ...data, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return result as unknown as DbMarketplaceReport;
}

// ============================================================
// SELLER PROFILES
// ============================================================

export async function getSellerProfile(userId: string): Promise<DbMarketplaceSellerProfile | null> {
  const { data, error } = await supabase
    .from('marketplace_seller_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DbMarketplaceSellerProfile | null;
}

export async function createOrUpdateSellerProfile(userId: string, data: {
  seller_type?: SellerType;
  business_name?: string;
  business_registration?: string;
  tax_id?: string;
  business_address?: string;
  business_phone?: string;
  default_currency?: string;
  default_location_state?: string;
  default_location_city?: string;
  default_delivery_available?: boolean;
  default_pickup_available?: boolean;
}): Promise<DbMarketplaceSellerProfile> {
  // Check if profile exists
  const existing = await getSellerProfile(userId);
  if (existing) {
    const { data: result, error } = await supabase
      .from('marketplace_seller_profiles')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return result as unknown as DbMarketplaceSellerProfile;
  } else {
    const { data: result, error } = await supabase
      .from('marketplace_seller_profiles')
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return result as unknown as DbMarketplaceSellerProfile;
  }
}

// ============================================================
// PRICING UNITS
// ============================================================

export async function fetchPricingUnits(): Promise<DbMarketplacePricingUnit[]> {
  const { data, error } = await supabase
    .from('marketplace_pricing_units')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DbMarketplacePricingUnit[];
}
