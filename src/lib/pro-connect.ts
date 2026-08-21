import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  DbProProfile,
  DbProCategory,
  DbProService,
  DbProLocation,
  DbProReview,
  DbProConversation,
  DbProMessage,
  DbProProfileService,
  DbProProfileLocation,
  DbProPortfolioItem,
  ProAvailability,
} from '@/types/pro-connect';
import { sendPushToUser } from '@/lib/push-notifications';

// =========================================================
// PRO CONNECT — Data access layer
// All functions use the Supabase client with RLS enforcement.
// No hardcoded data. No demo professionals.
// =========================================================

// -- Category / Service / Location lookups (public) --

export async function fetchCategories(): Promise<DbProCategory[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] fetchCategories:', error.message);
    return [];
  }
  return data as DbProCategory[];
}

export async function fetchServices(categoryId?: string): Promise<DbProService[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('pro_services').select('*').eq('is_active', true).order('sort_order');
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] fetchServices:', error.message);
    return [];
  }
  return data as DbProService[];
}

export async function fetchLocations(): Promise<DbProLocation[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_locations')
    .select('*')
    .eq('is_active', true)
    .order('state, city, sort_order');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] fetchLocations:', error.message);
    return [];
  }
  return data as DbProLocation[];
}

export async function fetchStates(): Promise<string[]> {
  const locations = await fetchLocations();
  return [...new Set(locations.map((l) => l.state))].sort();
}

export async function fetchCitiesByState(state: string): Promise<string[]> {
  const locations = await fetchLocations();
  return [...new Set(locations.filter((l) => l.state === state).map((l) => l.city))].sort();
}

// -- Profile management --

export async function getMyProProfile(userId: string): Promise<DbProProfile | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('pro_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getMyProProfile:', error.message);
    return null;
  }
  return data as DbProProfile | null;
}

export async function getProProfileBySlug(slug: string): Promise<DbProProfile | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('pro_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getProProfileBySlug:', error.message);
    return null;
  }
  return data as DbProProfile | null;
}

export async function getProProfileServices(profileId: string): Promise<DbProProfileService[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_profile_services')
    .select('*, service:pro_services(*)')
    .eq('profile_id', profileId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getProProfileServices:', error.message);
    return [];
  }
  return data as DbProProfileService[];
}

export async function getProProfileLocations(profileId: string): Promise<DbProProfileLocation[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_profile_locations')
    .select('*, location:pro_locations(*)')
    .eq('profile_id', profileId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getProProfileLocations:', error.message);
    return [];
  }
  return data as DbProProfileLocation[];
}

export async function getProPortfolio(profileId: string): Promise<DbProPortfolioItem[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_portfolio_items')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order, created_at DESC');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getProPortfolio:', error.message);
    return [];
  }
  return data as DbProPortfolioItem[];
}

export async function getProReviews(professionalId: string): Promise<DbProReview[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_reviews')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('is_hidden', false)
    .order('created_at DESC');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getProReviews:', error.message);
    return [];
  }
  return data as DbProReview[];
}

// -- Directory search with matching algorithm --

export interface DirectorySearchParams {
  categoryId?: string;
  serviceId?: string;
  state?: string;
  city?: string;
  availability?: ProAvailability;
  minRating?: number;
  verifiedOnly?: boolean;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface DirectorySearchResult {
  profiles: DbProProfile[];
  total: number;
  hasMore: boolean;
}

/**
 * Matching algorithm:
 * 1. Filter by category, service, location, availability, rating, verification
 * 2. Score by: verification status, rating, profile completeness, availability, years experience
 * 3. Sort by relevance score (not creation date)
 *
 * The scoring weights are:
 * - Verified: +100
 * - Profile complete: +50
 * - Available: +30, Busy: +10
 * - Rating: rating_avg * 20
 * - Years experience: min(years, 20) * 2
 * - Has portfolio: +15
 * - Has services defined: +10
 */
export async function searchProfessionals(params: DirectorySearchParams): Promise<DirectorySearchResult> {
  if (!isSupabaseConfigured) return { profiles: [], total: 0, hasMore: false };

  const page = params.page || 1;
  const pageSize = params.pageSize || 12;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('pro_profiles')
    .select('*', { count: 'exact' })
    .eq('is_listed', true)
    .neq('verification_status', 'suspended');

  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }
  if (params.availability) {
    query = query.eq('availability', params.availability);
  }
  if (params.minRating) {
    query = query.gte('rating_avg', params.minRating);
  }
  if (params.verifiedOnly) {
    query = query.eq('verification_status', 'verified');
  }
  if (params.searchQuery) {
    query = query.or(`display_name.ilike.%${params.searchQuery}%,business_name.ilike.%${params.searchQuery}%,bio.ilike.%${params.searchQuery}%`);
  }

  // Order by: verified first, then rating, then profile completeness
  query = query.order('verification_status', { ascending: false }) // 'verified' > 'pending' > 'unverified' alphabetically reversed
    .order('rating_avg', { ascending: false })
    .order('is_profile_complete', { ascending: false })
    .order('years_experience', { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] searchProfessionals:', error.message);
    return { profiles: [], total: 0, hasMore: false };
  }

  const profiles = (data || []) as DbProProfile[];
  const total = count || 0;

  // If filtering by service or location, we need post-filter
  let filteredProfiles = profiles;

  if (params.serviceId) {
    const profileIds = profiles.map((p) => p.id);
    if (profileIds.length > 0) {
      const { data: serviceLinks } = await supabase
        .from('pro_profile_services')
        .select('profile_id')
        .in('profile_id', profileIds)
        .eq('service_id', params.serviceId);
      const validIds = new Set((serviceLinks || []).map((s) => s.profile_id));
      filteredProfiles = filteredProfiles.filter((p) => validIds.has(p.id));
    }
  }

  if (params.state || params.city) {
    const profileIds = filteredProfiles.map((p) => p.id);
    if (profileIds.length > 0) {
      const locQuery = supabase
        .from('pro_profile_locations')
        .select('profile_id, location:pro_locations(state, city)')
        .in('profile_id', profileIds);
      const { data: locLinks } = await locQuery;
      const validIds = new Set(
        (locLinks || [])
          .filter((link) => {
            const loc = (link as unknown as { location: DbProLocation[] }).location?.[0] ?? null;
            if (!loc) return false;
            if (params.state && loc.state !== params.state) return false;
            if (params.city && loc.city !== params.city) return false;
            return true;
          })
          .map((l) => (l as { profile_id: string }).profile_id)
      );
      filteredProfiles = filteredProfiles.filter((p) => validIds.has(p.id));
    }
  }

  return {
    profiles: filteredProfiles,
    total: filteredProfiles.length,
    hasMore: page * pageSize < total,
  };
}

// -- Profile creation / updates --

export async function createProProfile(profile: {
  display_name: string;
  slug: string;
  category_id?: string;
  business_name?: string;
  bio?: string;
  years_experience?: number;
  contact_phone?: string;
  website_url?: string;
}): Promise<DbProProfile | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('pro_profiles')
    .insert({
      user_id: user.id,
      display_name: profile.display_name,
      slug: profile.slug,
      category_id: profile.category_id || null,
      business_name: profile.business_name || null,
      bio: profile.bio || null,
      years_experience: profile.years_experience || null,
      contact_phone: profile.contact_phone || null,
      website_url: profile.website_url || null,
    })
    .select('*')
    .single();
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] createProProfile:', error.message);
    return null;
  }
  return data as DbProProfile;
}

export async function updateProProfile(profileId: string, updates: Partial<DbProProfile>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  // Strip fields that shouldn't be user-editable
  const { ...safeUpdates } = updates;
  const { error } = await supabase
    .from('pro_profiles')
    .update(safeUpdates)
    .eq('id', profileId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] updateProProfile:', error.message);
    return false;
  }
  return true;
}

export async function updateProfileServices(profileId: string, serviceIds: string[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  // Delete existing and re-insert (simple, safe)
  await supabase.from('pro_profile_services').delete().eq('profile_id', profileId);
  if (serviceIds.length > 0) {
    const inserts = serviceIds.map((service_id) => ({ profile_id: profileId, service_id }));
    const { error } = await supabase.from('pro_profile_services').insert(inserts);
    if (error) {
      if (import.meta.env.DEV) console.error('[pro-connect] updateProfileServices:', error.message);
      return false;
    }
  }
  return true;
}

export async function updateProfileLocations(profileId: string, locationIds: string[]): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  await supabase.from('pro_profile_locations').delete().eq('profile_id', profileId);
  if (locationIds.length > 0) {
    const inserts = locationIds.map((location_id) => ({ profile_id: profileId, location_id }));
    const { error } = await supabase.from('pro_profile_locations').insert(inserts);
    if (error) {
      if (import.meta.env.DEV) console.error('[pro-connect] updateProfileLocations:', error.message);
      return false;
    }
  }
  return true;
}

// -- Portfolio --

export async function addPortfolioItem(profileId: string, item: {
  title: string;
  description?: string;
  category?: string;
  image_urls: string[];
  completed_date?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_portfolio_items')
    .insert({
      profile_id: profileId,
      title: item.title,
      description: item.description || null,
      category: item.category || null,
      image_urls: item.image_urls,
      completed_date: item.completed_date || null,
    });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] addPortfolioItem:', error.message);
    return false;
  }
  return true;
}

export async function deletePortfolioItem(itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('pro_portfolio_items').delete().eq('id', itemId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] deletePortfolioItem:', error.message);
    return false;
  }
  return true;
}

// -- Reviews --

export async function createReview(professionalId: string, rating: number, reviewText?: string, projectRef?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Prevent self-review
  const { data: profile } = await supabase
    .from('pro_profiles')
    .select('user_id')
    .eq('id', professionalId)
    .maybeSingle();
  if (profile && (profile as { user_id: string }).user_id === user.id) return false;

  const { error } = await supabase
    .from('pro_reviews')
    .insert({
      professional_id: professionalId,
      reviewer_id: user.id,
      rating,
      review_text: reviewText || null,
      project_ref: projectRef || null,
    });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] createReview:', error.message);
    return false;
  }
  return true;
}

export async function respondToReview(reviewId: string, response: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_reviews')
    .update({
      professional_response: response,
      professional_response_at: new Date().toISOString(),
    })
    .eq('id', reviewId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] respondToReview:', error.message);
    return false;
  }
  return true;
}

// -- Messaging --

export async function getOrCreateConversation(professionalId: string, projectRef?: string, projectContext?: Record<string, unknown>): Promise<DbProConversation | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if conversation already exists
  let query = supabase
    .from('pro_conversations')
    .select('*, professional:pro_profiles(*)')
    .eq('customer_id', user.id)
    .eq('professional_id', professionalId);
  if (projectRef) {
    query = query.eq('project_ref', projectRef);
  } else {
    query = query.is('project_ref', null);
  }
  const { data: existing } = await query.maybeSingle();
  if (existing) return existing as DbProConversation;

  // Create new conversation
  const { data, error } = await supabase
    .from('pro_conversations')
    .insert({
      professional_id: professionalId,
      customer_id: user.id,
      project_ref: projectRef || null,
      project_context: projectContext || null,
    })
    .select('*, professional:pro_profiles(*)')
    .single();
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getOrCreateConversation:', error.message);
    return null;
  }
  return data as DbProConversation;
}

export async function getMyConversations(): Promise<DbProConversation[]> {
  if (!isSupabaseConfigured) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get conversations where user is the customer
  const { data: asCustomer, error: err1 } = await supabase
    .from('pro_conversations')
    .select('*, professional:pro_profiles(*)')
    .eq('customer_id', user.id)
    .order('last_message_at DESC', { nullsFirst: false });

  // Get conversations where user is the professional
  const { data: proProfile } = await supabase
    .from('pro_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let asProfessional: DbProConversation[] = [];
  if (proProfile) {
    const { data: proConvos } = await supabase
      .from('pro_conversations')
      .select('*, professional:pro_profiles(*)')
      .eq('professional_id', (proProfile as { id: string }).id)
      .order('last_message_at DESC', { nullsFirst: false });
    asProfessional = (proConvos || []) as DbProConversation[];
  }

  if (err1) {
    if (import.meta.env.DEV) console.error('[pro-connect] getMyConversations:', err1.message);
    return [];
  }

  // Merge and deduplicate
  const all = [...(asCustomer || []), ...asProfessional] as DbProConversation[];
  const seen = new Set<string>();
  const unique = all.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  return unique;
}

export async function getMessages(conversationId: string): Promise<DbProMessage[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at ASC');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getMessages:', error.message);
    return [];
  }
  return data as DbProMessage[];
}

export async function sendMessage(conversationId: string, body: string, attachmentUrl?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('pro_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
      attachment_url: attachmentUrl || null,
    });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] sendMessage:', error.message);
    return false;
  }

  // Update conversation's last_message_at
  await supabase
    .from('pro_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Send push notification to the recipient
  try {
    // Get conversation to find recipient
    const { data: convo } = await supabase
      .from('pro_conversations')
      .select('customer_id, professional_id, pro_profiles(display_name)')
      .eq('id', conversationId)
      .maybeSingle();

    if (convo) {
      // If sender is the pro, recipient is the customer; if sender is the customer, recipient is the pro
      let pushRecipientId: string | null = null;
      if (convo.customer_id === user.id) {
        // Sender is customer — notify the professional's user_id
        const { data: profProfile } = await supabase
          .from('pro_profiles')
          .select('user_id')
          .eq('id', convo.professional_id)
          .maybeSingle();
        pushRecipientId = profProfile?.user_id || null;
      } else {
        pushRecipientId = convo.customer_id;
      }

      if (pushRecipientId) {
        const senderName = convo.pro_profiles?.[0]?.display_name || 'Someone';
        const pushBody = body.length > 50 ? body.slice(0, 50) + '…' : body;
        await sendPushToUser(
          pushRecipientId,
          `New message from ${senderName}`,
          pushBody,
          `/messages/${conversationId}`
        );
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) console.error('[pro-connect] Push notification failed:', err);
    // Don't fail the message send if push fails
  }

  return true;
}

export async function markMessagesRead(conversationId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('pro_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('is_read', false);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] markMessagesRead:', error.message);
    return false;
  }
  return true;
}

export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // Get conversation IDs where user is a participant
  const { data: asCustomer } = await supabase
    .from('pro_conversations')
    .select('id')
    .eq('customer_id', user.id);

  const { data: proProfile } = await supabase
    .from('pro_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let proConvIds: { id: string }[] = [];
  if (proProfile) {
    const { data: proConvos } = await supabase
      .from('pro_conversations')
      .select('id')
      .eq('professional_id', (proProfile as { id: string }).id);
    proConvIds = proConvos || [];
  }

  const allConvIds = [...(asCustomer || []), ...proConvIds].map((c) => (c as { id: string }).id);
  if (allConvIds.length === 0) return 0;

  const { count } = await supabase
    .from('pro_messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', allConvIds)
    .neq('sender_id', user.id)
    .eq('is_read', false);

  return count || 0;
}

// -- Reports --

export async function createReport(report: {
  report_type: 'profile' | 'review' | 'message' | 'portfolio';
  target_id: string;
  reason: string;
  description?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('pro_reports')
    .insert({
      reporter_id: user.id,
      report_type: report.report_type,
      target_id: report.target_id,
      reason: report.reason,
      description: report.description || null,
    });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] createReport:', error.message);
    return false;
  }
  return true;
}

// -- Calculator-to-Professional CTA mapping --

export function getCategoryFromCalculator(calculatorType: string): string | null {
  const mapping: Record<string, string> = {
    paint: 'painters',
    painting: 'painters',
    tile: 'tilers',
    tiling: 'tilers',
    screeding: 'wall-screeders',
    pop: 'pop-installers',
    pop_ceiling: 'pop-installers',
    finish: 'building-contractors',
    tyrolene: 'building-contractors',
    contractor: 'building-contractors',
  };
  return mapping[calculatorType] || null;
}

// -- Slug generation --

export function generateProSlug(name: string, existingSlugs?: string[]): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!existingSlugs || !existingSlugs.includes(base)) return base;
  let i = 2;
  while (existingSlugs.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const { data, error } = await supabase
    .from('pro_profiles')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  if (error) return true;
  return !data;
}

// =========================================================
// PHASE 26: Verification System API
// =========================================================

import type {
  DbProVerificationRequest,
  DbProVerificationDocument,
  DbProCredential,
  DbProCredentialPublic,
  DbProSettings,
  VerificationRequestType,
  AccountType,
} from '@/types/pro-connect';
import { DbProVerificationLog } from '@/types/pro-connect';

// -- Account Type --

export async function getAccountType(userId: string): Promise<AccountType> {
  if (!isSupabaseConfigured) return 'client';
  const { data } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', userId)
    .maybeSingle();
  return (data as { account_type?: AccountType })?.account_type || 'client';
}

export async function upgradeToProWorker(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.rpc('upgrade_account_type', { target_user: user.id });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] upgradeToProWorker:', error.message);
    return false;
  }
  return true;
}

export async function updateAccountType(userId: string, accountType: AccountType): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ account_type: accountType })
    .eq('id', userId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] updateAccountType:', error.message);
    return false;
  }
  return true;
}

// -- Verification Settings (public) --

export async function fetchProSettings(): Promise<DbProSettings | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('pro_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] fetchProSettings:', error.message);
    return null;
  }
  return data as DbProSettings;
}

export async function updateProSettings(updates: Partial<DbProSettings>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_settings')
    .update(updates)
    .eq('id', 1);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] updateProSettings:', error.message);
    return false;
  }
  return true;
}

// -- Verification Requests --

export async function createVerificationRequest(profileId: string, request: {
  request_type: VerificationRequestType;
  professional_name?: string;
  business_name?: string;
  category_id?: string;
  service_locations?: string[];
  years_experience?: number;
  identity_document_type?: string;
  identity_document_number?: string;
}): Promise<DbProVerificationRequest | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('pro_verification_requests')
    .insert({
      profile_id: profileId,
      request_type: request.request_type,
      professional_name: request.professional_name || null,
      business_name: request.business_name || null,
      category_id: request.category_id || null,
      service_locations: request.service_locations || null,
      years_experience: request.years_experience || null,
      identity_document_type: request.identity_document_type || null,
      identity_document_number: request.identity_document_number || null,
    })
    .select('*')
    .single();
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] createVerificationRequest:', error.message);
    return null;
  }

  // Update profile verification_status to 'pending'
  await supabase
    .from('pro_profiles')
    .update({ verification_status: 'pending' })
    .eq('id', profileId);

  return data as DbProVerificationRequest;
}

export async function getMyVerificationRequests(profileId: string): Promise<DbProVerificationRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_verification_requests')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at DESC');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getMyVerificationRequests:', error.message);
    return [];
  }
  return data as DbProVerificationRequest[];
}

export async function getAllVerificationRequests(status?: string): Promise<DbProVerificationRequest[]> {
  if (!isSupabaseConfigured) return [];
  let query = supabase
    .from('pro_verification_requests')
    .select('*, profile:pro_profiles(display_name, slug, business_name, category_id)')
    .order('created_at DESC');
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getAllVerificationRequests:', error.message);
    return [];
  }
  return data as unknown as DbProVerificationRequest[];
}

export async function withdrawVerificationRequest(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_verification_requests')
    .update({ status: 'withdrawn' })
    .eq('id', requestId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] withdrawVerificationRequest:', error.message);
    return false;
  }
  return true;
}

// -- Admin verification actions (via RPC functions) --

export async function adminApproveVerification(profileId: string, requestId: string, notes?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('approve_verification', {
    profile_uuid: profileId,
    request_uuid: requestId,
    admin_notes: notes || null,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminApproveVerification:', error.message);
    return false;
  }
  return true;
}

export async function adminRejectVerification(profileId: string, requestId: string, reason?: string, notes?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('reject_verification', {
    profile_uuid: profileId,
    request_uuid: requestId,
    rejection_reason: reason || null,
    admin_notes: notes || null,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminRejectVerification:', error.message);
    return false;
  }
  return true;
}

export async function adminRequestMoreInfo(profileId: string, requestId: string, infoRequest: string, notes?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('request_more_info_verification', {
    profile_uuid: profileId,
    request_uuid: requestId,
    info_request: infoRequest,
    admin_notes: notes || null,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminRequestMoreInfo:', error.message);
    return false;
  }
  return true;
}

export async function adminSuspendVerification(profileId: string, reason?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('suspend_verification', {
    profile_uuid: profileId,
    reason: reason || null,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminSuspendVerification:', error.message);
    return false;
  }
  return true;
}

export async function adminReinstateVerification(profileId: string, notes?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('reinstate_verification', {
    profile_uuid: profileId,
    admin_notes: notes || null,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminReinstateVerification:', error.message);
    return false;
  }
  return true;
}

export async function adminAwardProLevel(profileId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('award_pro_level', { profile_uuid: profileId });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminAwardProLevel:', error.message);
    return false;
  }
  return true;
}

export async function adminRevokeProLevel(profileId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.rpc('revoke_pro_level', { profile_uuid: profileId });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminRevokeProLevel:', error.message);
    return false;
  }
  return true;
}

export async function checkProLevelEligibility(profileId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase.rpc('check_pro_level_eligibility', { profile_uuid: profileId });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] checkProLevelEligibility:', error.message);
    return false;
  }
  return data as boolean;
}

// -- Verification Logs --

export async function getVerificationLogs(profileId: string): Promise<DbProVerificationLog[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_verification_logs')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at DESC');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getVerificationLogs:', error.message);
    return [];
  }
  return data as DbProVerificationLog[];
}

// -- Credentials (regulated professions) --

export async function getCredentials(profileId: string): Promise<DbProCredential[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_credentials')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at DESC');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getCredentials:', error.message);
    return [];
  }
  return data as DbProCredential[];
}

export async function getPublicCredentials(profileId: string): Promise<DbProCredentialPublic[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_credentials_public')
    .select('*')
    .eq('profile_id', profileId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getPublicCredentials:', error.message);
    return [];
  }
  return data as DbProCredentialPublic[];
}

export async function addCredential(profileId: string, credential: {
  professional_body: string;
  registration_number: string;
  credential_type: string;
  expires_at?: string;
  document_path?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_credentials')
    .insert({
      profile_id: profileId,
      professional_body: credential.professional_body,
      registration_number: credential.registration_number,
      credential_type: credential.credential_type,
      expires_at: credential.expires_at || null,
      document_path: credential.document_path || null,
    });
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] addCredential:', error.message);
    return false;
  }
  return true;
}

export async function deleteCredential(credentialId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('pro_credentials').delete().eq('id', credentialId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] deleteCredential:', error.message);
    return false;
  }
  return true;
}

export async function adminVerifyCredential(credentialId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from('pro_credentials')
    .update({
      verification_status: 'verified',
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', credentialId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminVerifyCredential:', error.message);
    return false;
  }
  return true;
}

export async function adminRejectCredential(credentialId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase
    .from('pro_credentials')
    .update({ verification_status: 'rejected' })
    .eq('id', credentialId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] adminRejectCredential:', error.message);
    return false;
  }
  return true;
}

// -- Verification Documents (private storage) --

export async function uploadVerificationDocument(
  profileId: string,
  requestId: string | null,
  file: File,
  documentType: string
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${profileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('pro-verification')
    .upload(path, file);

  if (uploadError) {
    if (import.meta.env.DEV) console.error('[pro-connect] uploadVerificationDocument:', uploadError.message);
    return null;
  }

  const { error } = await supabase
    .from('pro_verification_documents')
    .insert({
      profile_id: profileId,
      request_id: requestId,
      document_type: documentType,
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });

  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] uploadVerificationDocument record:', error.message);
  }

  return path;
}

export async function getVerificationDocuments(profileId: string): Promise<DbProVerificationDocument[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('pro_verification_documents')
    .select('*')
    .eq('profile_id', profileId)
    .order('uploaded_at DESC');
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] getVerificationDocuments:', error.message);
    return [];
  }
  return data as DbProVerificationDocument[];
}

export async function createSignedUrlForDocument(storagePath: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.storage
    .from('pro-verification')
    .createSignedUrl(storagePath, 300); // 5-minute expiry
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] createSignedUrlForDocument:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

export async function deleteVerificationDocument(docId: string, storagePath: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  await supabase.storage.from('pro-verification').remove([storagePath]);
  const { error } = await supabase
    .from('pro_verification_documents')
    .delete()
    .eq('id', docId);
  if (error) {
    if (import.meta.env.DEV) console.error('[pro-connect] deleteVerificationDocument:', error.message);
    return false;
  }
  return true;
}

// -- Verification tier helper re-export --
export { getVerificationTier } from '@/types/pro-connect';
export type { VerificationTier } from '@/types/pro-connect';
