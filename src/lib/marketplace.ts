import { supabase } from '@/lib/supabase';
import type {
  DbMarketplaceListing,
  DbMarketplaceBid,
  DbMarketplaceOrder,
  DbMarketplaceMilestone,
} from '@/types/marketplace';

// ============================================================
// LISTINGS
// ============================================================

export async function fetchListings(params: {
  status?: string;
  project_type?: string;
  location_state?: string;
  location_city?: string;
  category_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
  featured_only?: boolean;
}) {
  let query = supabase
    .from('marketplace_listings')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('admin_removed', false)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (params.status) query = query.eq('status', params.status);
  else query = query.in('status', ['open', 'awarded', 'in_progress']);

  if (params.project_type) query = query.eq('project_type', params.project_type);
  if (params.location_state) query = query.eq('location_state', params.location_state);
  if (params.location_city) query = query.eq('location_city', params.location_city);
  if (params.category_id) query = query.eq('category_id', params.category_id);
  if (params.featured_only) query = query.eq('is_featured', true);
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  const limit = params.limit ?? 12;
  const offset = params.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { listings: (data ?? []) as DbMarketplaceListing[], total: count ?? 0 };
}

export async function fetchListing(id: string) {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as DbMarketplaceListing;
}

export async function fetchMyListings(userId: string) {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbMarketplaceListing[];
}

export async function createListing(data: {
  user_id: string;
  title: string;
  description?: string;
  project_type: string;
  category_id?: string;
  scope_summary?: Record<string, unknown>;
  estimate_ref?: string;
  project_ref?: string;
  budget_min?: number;
  budget_max?: number;
  currency?: string;
  location_state?: string;
  location_city?: string;
  location_area?: string;
  urgency?: string;
  expires_at?: string;
}) {
  const { data: result, error } = await supabase
    .from('marketplace_listings')
    .insert({
      ...data,
      status: 'open',
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return result as DbMarketplaceListing;
}

export async function updateListing(id: string, updates: Partial<DbMarketplaceListing>) {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbMarketplaceListing;
}

export async function cancelListing(id: string, reason: string) {
  return updateListing(id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancel_reason: reason,
  });
}

export async function incrementListingView(id: string) {
  await supabase.rpc('increment_view_count', { listing_id: id }).then(() => {}).catch(() => {});
  // Fallback: direct update
  await supabase
    .from('marketplace_listings')
    .update({ view_count: supabase.rpc ? undefined : undefined })
    .eq('id', id);
  // Use raw SQL approach via update
  const { data } = await supabase
    .from('marketplace_listings')
    .select('view_count')
    .eq('id', id)
    .single();
  if (data) {
    await supabase
      .from('marketplace_listings')
      .update({ view_count: (data as { view_count: number }).view_count + 1 })
      .eq('id', id);
  }
}

// ============================================================
// BIDS
// ============================================================

export async function fetchBidsForListing(listingId: string) {
  const { data, error } = await supabase
    .from('marketplace_bids')
    .select(`
      *,
      pro_profile:pro_profiles(
        id, display_name, business_name, slug,
        profile_image_url, verification_status,
        rating_avg, rating_count, project_count
      )
    `)
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DbMarketplaceBid[];
}

export async function fetchMyBids(proProfileId: string) {
  const { data, error } = await supabase
    .from('marketplace_bids')
    .select(`
      *,
      listing:marketplace_listings(*)
    `)
    .eq('pro_profile_id', proProfileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as (DbMarketplaceBid & { listing: DbMarketplaceListing })[];
}

export async function createBid(data: {
  listing_id: string;
  pro_profile_id: string;
  proposed_price: number;
  proposed_timeline_days?: number;
  cover_message: string;
  attachments?: Array<{ url: string; name: string; type: string }>;
}) {
  const { data: result, error } = await supabase
    .from('marketplace_bids')
    .insert({
      ...data,
      status: 'pending',
      attachments: data.attachments ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return result as DbMarketplaceBid;
}

export async function updateBidStatus(bidId: string, status: 'accepted' | 'rejected' | 'withdrawn', reason?: string) {
  const updates: Record<string, unknown> = { status };
  if (status === 'accepted') updates.accepted_at = new Date().toISOString();
  if (status === 'rejected') {
    updates.rejected_at = new Date().toISOString();
    updates.rejected_reason = reason;
  }

  const { data, error } = await supabase
    .from('marketplace_bids')
    .update(updates)
    .eq('id', bidId)
    .select()
    .single();
  if (error) throw error;
  return data as DbMarketplaceBid;
}

// ============================================================
// ORDERS
// ============================================================

export async function fetchOrder(id: string) {
  const { data, error } = await supabase
    .from('marketplace_orders')
    .select(`
      *,
      listing:marketplace_listings(*),
      pro_profile:pro_profiles(
        id, display_name, business_name, slug,
        profile_image_url, verification_status,
        rating_avg, project_count
      )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as DbMarketplaceOrder;
}

export async function fetchMyOrders(userId: string, role: 'client' | 'pro') {
  let query = supabase
    .from('marketplace_orders')
    .select(`
      *,
      listing:marketplace_listings(*),
      pro_profile:pro_profiles(
        id, display_name, business_name, slug,
        profile_image_url, verification_status,
        rating_avg, project_count
      )
    `)
    .order('created_at', { ascending: false });

  if (role === 'client') {
    query = query.eq('client_id', userId);
  } else {
    // Pro: filter by pro_profile_id where user_id matches
    const { data: profile } = await supabase
      .from('pro_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (!profile) return [];
    query = query.eq('pro_profile_id', profile.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DbMarketplaceOrder[];
}

export async function updateOrderStatus(orderId: string, status: string, extra?: Record<string, unknown>) {
  const updates: Record<string, unknown> = { status, ...extra };
  if (status === 'in_progress') updates.started_at = new Date().toISOString();
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('marketplace_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data as DbMarketplaceOrder;
}

export async function submitOrderReview(
  orderId: string,
  role: 'client' | 'pro',
  rating: number,
  review: string,
) {
  const updates: Record<string, unknown> = {};
  if (role === 'client') {
    updates.client_rating = rating;
    updates.client_review = review;
    updates.client_reviewed_at = new Date().toISOString();
  } else {
    updates.pro_rating = rating;
    updates.pro_review = review;
    updates.pro_reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('marketplace_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data as DbMarketplaceOrder;
}

// ============================================================
// MILESTONES
// ============================================================

export async function fetchMilestones(orderId: string) {
  const { data, error } = await supabase
    .from('marketplace_milestones')
    .select('*')
    .eq('order_id', orderId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbMarketplaceMilestone[];
}

export async function createMilestone(data: {
  order_id: string;
  title: string;
  description?: string;
  sort_order?: number;
  expected_date?: string;
}) {
  const { data: result, error } = await supabase
    .from('marketplace_milestones')
    .insert({
      ...data,
      status: 'pending',
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return result as DbMarketplaceMilestone;
}

export async function updateMilestone(id: string, updates: Partial<DbMarketplaceMilestone>) {
  const { data, error } = await supabase
    .from('marketplace_milestones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbMarketplaceMilestone;
}

export async function approveMilestone(id: string) {
  return updateMilestone(id, {
    status: 'approved',
    client_approved: true,
    client_approved_at: new Date().toISOString(),
    completed_date: new Date().toISOString().slice(0, 10),
  });
}

// ============================================================
// UPLOAD ATTACHMENTS
// ============================================================

export async function uploadBidAttachment(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('marketplace')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: url } = supabase.storage.from('marketplace').getPublicUrl(path);
  return url.publicUrl;
}

// ============================================================
// ADMIN
// ============================================================

export async function adminFetchAllListings(params: { status?: string; limit?: number; offset?: number }) {
  let query = supabase
    .from('marketplace_listings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (params.status) query = query.eq('status', params.status);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { listings: (data ?? []) as DbMarketplaceListing[], total: count ?? 0 };
}

export async function adminToggleListingFeatured(id: string, featured: boolean) {
  return updateListing(id, { is_featured: featured });
}

export async function adminRemoveListing(id: string, notes: string) {
  return updateListing(id, { admin_removed: true, admin_notes: notes, is_active: false });
}

export async function adminFetchAllOrders(params: { status?: string; limit?: number; offset?: number }) {
  let query = supabase
    .from('marketplace_orders')
    .select(`
      *,
      listing:marketplace_listings(*),
      pro_profile:pro_profiles(id, display_name, business_name, slug, profile_image_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });
  if (params.status) query = query.eq('status', params.status);
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: (data ?? []) as unknown as DbMarketplaceOrder[], total: count ?? 0 };
}

export async function adminFetchDisputes() {
  const { data, error } = await supabase
    .from('marketplace_disputes')
    .select(`
      *,
      order:marketplace_orders(
        id, order_number, status,
        listing:marketplace_listings(title)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminResolveDispute(id: string, resolution: string) {
  const { data, error } = await supabase
    .from('marketplace_disputes')
    .update({
      status: 'resolved',
      admin_resolution: resolution,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
