import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { haversineKm } from '@/lib/location';
import type { _DbProLocation } from '@/types/pro-connect';
import type { _DbMarketplaceListing } from '@/types/marketplace';

// ============================================================
// Location-based discovery — nearby professionals and listings
// ============================================================
// Uses Postgres RPC (find_nearby_professionals / find_nearby_listings)
// for server-side distance calculation via Haversine.
// Falls back to client-side filtering if RPC unavailable.

export interface NearbyProfessional {
  id: string;
  display_name: string;
  business_name: string | null;
  slug: string;
  profile_image_url: string | null;
  bio: string | null;
  verification_status: string;
  availability: string;
  rating_avg: number;
  rating_count: number;
  project_count: number;
  years_experience: number | null;
  category_id: string | null;
  distance_km: number;
}

export interface NearbyListing {
  id: string;
  title: string;
  description: string | null;
  project_type: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  location_state: string | null;
  location_city: string | null;
  location_area: string | null;
  status: string;
  urgency: string;
  is_featured: boolean;
  bid_count: number;
  created_at: string;
  distance_km: number;
}

// -- Nearby Professionals --

export async function findNearbyProfessionals(params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  categorySlug?: string;
  minRating?: number;
  verifiedOnly?: boolean;
}): Promise<NearbyProfessional[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase.rpc('find_nearby_professionals', {
      user_lat: params.latitude,
      user_lng: params.longitude,
      radius_km: params.radiusKm,
      cat_slug: params.categorySlug ?? null,
      min_rating: params.minRating ?? 0,
      verified_only: params.verifiedOnly ?? false,
    });

    if (error) {
      if (import.meta.env.DEV) console.error('[location] findNearbyProfessionals:', error.message);
      // Fallback: client-side filtering
      return fallbackNearbyProfessionals(params);
    }

    return (data ?? []) as NearbyProfessional[];
  } catch (err) {
    if (import.meta.env.DEV) console.error('[location] findNearbyProfessionals:', err);
    return fallbackNearbyProfessionals(params);
  }
}

// Fallback: fetch pro profiles with their locations, compute distance client-side
async function fallbackNearbyProfessionals(params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  categorySlug?: string;
  minRating?: number;
  verifiedOnly?: boolean;
}): Promise<NearbyProfessional[]> {
  // Get category id if slug provided
  let categoryId: string | undefined;
  if (params.categorySlug) {
    const { data: cat } = await supabase
      .from('pro_categories')
      .select('id')
      .eq('slug', params.categorySlug)
      .eq('is_active', true)
      .single();
    if (cat) categoryId = cat.id;
  }

  // Fetch profiles with their locations
  let profileQuery = supabase
    .from('pro_profiles')
    .select(`
      id, display_name, business_name, slug, profile_image_url, bio,
      verification_status, availability, rating_avg, rating_count,
      project_count, years_experience, category_id,
      locations:pro_profile_locations(
        location:pro_locations(latitude, longitude)
      )
    `)
    .eq('is_listed', true)
    .neq('verification_status', 'suspended');

  if (categoryId) profileQuery = profileQuery.eq('category_id', categoryId);
  if (params.minRating) profileQuery = profileQuery.gte('rating_avg', params.minRating);
  if (params.verifiedOnly) profileQuery = profileQuery.eq('verification_status', 'verified');

  const { data: profiles, error } = await profileQuery;
  if (error) return [];

  const results: NearbyProfessional[] = [];

  for (const p of (profiles ?? []) as unknown[]) {
    // Find the closest location
    let minDist = Infinity;
    if (p.locations) {
      for (const ppl of p.locations) {
        const loc = ppl?.location;
        if (loc?.latitude && loc?.longitude) {
          const dist = haversineKm(params.latitude, params.longitude, loc.latitude, loc.longitude);
          if (dist < minDist) minDist = dist;
        }
      }
    }

    if (minDist <= params.radiusKm) {
      results.push({
        id: p.id,
        display_name: p.display_name,
        business_name: p.business_name,
        slug: p.slug,
        profile_image_url: p.profile_image_url,
        bio: p.bio,
        verification_status: p.verification_status,
        availability: p.availability,
        rating_avg: p.rating_avg,
        rating_count: p.rating_count,
        project_count: p.project_count,
        years_experience: p.years_experience,
        category_id: p.category_id,
        distance_km: minDist === Infinity ? 999 : minDist,
      });
    }
  }

  // Sort: verified first, then distance, then rating
  results.sort((a, b) => {
    const va = a.verification_status === 'verified' ? 0 : a.verification_status === 'pending' ? 1 : 2;
    const vb = b.verification_status === 'verified' ? 0 : b.verification_status === 'pending' ? 1 : 2;
    if (va !== vb) return va - vb;
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    return b.rating_avg - a.rating_avg;
  });

  return results;
}

// -- Nearby Listings --

export async function findNearbyListings(params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  projectType?: string;
  categorySlug?: string;
}): Promise<NearbyListing[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase.rpc('find_nearby_listings', {
      user_lat: params.latitude,
      user_lng: params.longitude,
      radius_km: params.radiusKm,
      filter_project_type: params.projectType ?? null,
      filter_category_slug: params.categorySlug ?? null,
    });

    if (error) {
      if (import.meta.env.DEV) console.error('[location] findNearbyListings:', error.message);
      return fallbackNearbyListings(params);
    }

    return (data ?? []) as NearbyListing[];
  } catch (err) {
    if (import.meta.env.DEV) console.error('[location] findNearbyListings:', err);
    return fallbackNearbyListings(params);
  }
}

// Fallback: client-side distance filtering
async function fallbackNearbyListings(params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  projectType?: string;
  categorySlug?: string;
}): Promise<NearbyListing[]> {
  let query = supabase
    .from('marketplace_listings')
    .select(`
      id, title, description, project_type, budget_min, budget_max,
      currency, location_state, location_city, location_area,
      status, urgency, is_featured, bid_count, created_at,
      latitude, longitude
    `)
    .eq('is_active', true)
    .eq('admin_removed', false)
    .in('status', ['open', 'awarded', 'in_progress'])
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (params.projectType) query = query.eq('project_type', params.projectType);

  const { data: listings, error } = await query;
  if (error) return [];

  let categoryId: string | undefined;
  if (params.categorySlug) {
    const { data: cat } = await supabase
      .from('pro_categories')
      .select('id')
      .eq('slug', params.categorySlug)
      .eq('is_active', true)
      .single();
    if (cat) categoryId = cat.id;
  }

  const results: NearbyListing[] = [];

  for (const l of (listings ?? []) as unknown[]) {
    if (categoryId && l.category_id !== categoryId) continue;
    const dist = haversineKm(params.latitude, params.longitude, l.latitude, l.longitude);
    if (dist <= params.radiusKm) {
      results.push({
        id: l.id,
        title: l.title,
        description: l.description,
        project_type: l.project_type,
        budget_min: l.budget_min,
        budget_max: l.budget_max,
        currency: l.currency,
        location_state: l.location_state,
        location_city: l.location_city,
        location_area: l.location_area,
        status: l.status,
        urgency: l.urgency,
        is_featured: l.is_featured,
        bid_count: l.bid_count,
        created_at: l.created_at,
        distance_km: dist,
      });
    }
  }

  results.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return results;
}

// -- SEO page settings --

export interface SeoPageSetting {
  id: string;
  page_type: string;
  entity_id: string | null;
  category_slug: string | null;
  location_slug: string | null;
  seo_title: string;
  seo_description: string;
  canonical_path: string | null;
  is_indexable: boolean;
  structured_data: Record<string, unknown> | null;
}

export async function getSeoPageSettings(params: {
  pageType: string;
  entityId?: string;
  categorySlug?: string;
  locationSlug?: string;
}): Promise<SeoPageSetting | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('seo_page_settings')
    .select('*')
    .eq('page_type', params.pageType)
    .eq('entity_id', params.entityId ?? '')
    .eq('category_slug', params.categorySlug ?? '')
    .eq('location_slug', params.locationSlug ?? '')
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.error('[location] getSeoPageSettings:', error.message);
    return null;
  }
  return data as SeoPageSetting | null;
}

// -- Admin: fetch all SEO page settings --

export async function adminFetchSeoPageSettings(): Promise<SeoPageSetting[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('seo_page_settings')
    .select('*')
    .order('page_type, updated_at DESC');
  if (error) return [];
  return data as SeoPageSetting[];
}

export async function adminUpsertSeoPageSettings(settings: Partial<SeoPageSetting>): Promise<SeoPageSetting | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('seo_page_settings')
    .upsert({
      page_type: settings.page_type,
      entity_id: settings.entity_id ?? '',
      category_slug: settings.category_slug ?? '',
      location_slug: settings.location_slug ?? '',
      seo_title: settings.seo_title,
      seo_description: settings.seo_description,
      canonical_path: settings.canonical_path,
      is_indexable: settings.is_indexable ?? true,
      structured_data: settings.structured_data ?? null,
    })
    .select()
    .single();
  if (error) {
    if (import.meta.env.DEV) console.error('[location] adminUpsertSeoPageSettings:', error.message);
    return null;
  }
  return data as SeoPageSetting;
}

export async function adminDeleteSeoPageSettings(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('seo_page_settings').delete().eq('id', id);
  return !error;
}

// -- Admin: update pro_location coordinates --
export async function adminUpdateLocationCoords(id: string, lat: number, lng: number): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_locations')
    .update({ latitude: lat, longitude: lng })
    .eq('id', id);
  return !error;
}

// -- Admin: update category SEO --
export async function adminUpdateCategorySeo(id: string, seo: {
  seo_title?: string;
  seo_description?: string;
  seo_indexable?: boolean;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_categories')
    .update(seo)
    .eq('id', id);
  return !error;
}

// -- Admin: update listing SEO --
export async function adminUpdateListingSeo(id: string, seo: {
  seo_title?: string;
  seo_description?: string;
  seo_indexable?: boolean;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('marketplace_listings')
    .update(seo)
    .eq('id', id);
  return !error;
}

// -- Admin: update pro profile SEO --
export async function adminUpdateProProfileSeo(id: string, seo: {
  seo_title?: string;
  seo_description?: string;
  seo_indexable?: boolean;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_profiles')
    .update(seo)
    .eq('id', id);
  return !error;
}
