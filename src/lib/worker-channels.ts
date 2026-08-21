// =========================================================
// FRELUX Worker Channels — Library Functions
// Phase 30: Nationwide worker chat & price updates
// =========================================================

import { supabase } from '@/lib/supabase';
import type {
  DbWorkerChannel,
  DbWorkerChannelCategory,
  DbWorkerChannelMessage,
  DbWorkerChannelReaction,
  DbWorkerModerationConfig,
} from '@/types/worker-channels';

// =========================================================
// Categories
// =========================================================

export async function fetchChannelCategories(): Promise<DbWorkerChannelCategory[]> {
  const { data, error } = await supabase
    .from('worker_channel_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] fetchChannelCategories:', error.message);
    return [];
  }
  return data as DbWorkerChannelCategory[];
}

// =========================================================
// Channels
// =========================================================

export async function fetchChannels(userId?: string): Promise<DbWorkerChannel[]> {
  let query = supabase
    .from('worker_channels')
    .select(`
      *,
      category:worker_channel_categories(*),
      member_count:worker_channel_members(count)
    `)
    .eq('is_active', true)
    .order('sort_order');

  const { data, error } = await query;
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] fetchChannels:', error.message);
    return [];
  }

  // Check which channels the user has joined
  let joinedChannelIds = new Set<string>();
  if (userId) {
    const { data: memberships } = await supabase
      .from('worker_channel_members')
      .select('channel_id')
      .eq('user_id', userId);
    joinedChannelIds = new Set((memberships ?? []).map((m: { channel_id: string }) => m.channel_id));
  }

  return (data ?? []).map((ch: Record<string, unknown>) => ({
    ...ch,
    category: ch.category as DbWorkerChannelCategory | null,
    member_count: (ch.member_count as { count: number }[] | undefined)?.[0]?.count ?? 0,
    is_joined: joinedChannelIds.has(ch.id as string),
  })) as DbWorkerChannel[];
}

export async function fetchChannelBySlug(slug: string): Promise<DbWorkerChannel | null> {
  const { data, error } = await supabase
    .from('worker_channels')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) {
    if (import.meta.env.DEV && error) console.error('[worker-channels] fetchChannelBySlug:', error.message);
    return null;
  }
  return data as DbWorkerChannel;
}

// =========================================================
// Membership
// =========================================================

export async function joinChannel(channelId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('worker_channel_members')
    .insert({ channel_id: channelId, user_id: userId, role: 'member' });
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] joinChannel:', error.message);
    return false;
  }
  return true;
}

export async function leaveChannel(channelId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('worker_channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] leaveChannel:', error.message);
    return false;
  }
  return true;
}

export async function isMember(channelId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('worker_channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

// =========================================================
// Messages
// =========================================================

export async function fetchMessages(
  channelId: string,
  limit = 50,
  before?: string
): Promise<DbWorkerChannelMessage[]> {
  let query = supabase
    .from('worker_channel_messages')
    .select(`
      *,
      reactions:worker_channel_reactions(*)
    `)
    .eq('channel_id', channelId)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] fetchMessages:', error.message);
    return [];
  }
  return (data ?? []).reverse() as DbWorkerChannelMessage[];
}

export interface SendMessageParams {
  channelId: string;
  userId: string;
  content: string;
  messageType?: 'chat' | 'price_update';
  replyTo?: string | null;
  // Price update fields
  priceItem?: string;
  priceAmount?: number;
  priceCurrency?: string;
  priceLocation?: string;
  priceStore?: string;
}

export async function sendMessage(params: SendMessageParams): Promise<DbWorkerChannelMessage | null> {
  const payload: Record<string, unknown> = {
    channel_id: params.channelId,
    user_id: params.userId,
    content: params.content,
    message_type: params.messageType ?? 'chat',
    reply_to: params.replyTo ?? null,
  };

  if (params.messageType === 'price_update') {
    payload.price_item = params.priceItem ?? null;
    payload.price_amount = params.priceAmount ?? null;
    payload.price_currency = params.priceCurrency ?? 'NGN';
    payload.price_location = params.priceLocation ?? null;
    payload.price_store = params.priceStore ?? null;
  }

  const { data, error } = await supabase
    .from('worker_channel_messages')
    .insert(payload)
    .select(`
      *,
      reactions:worker_channel_reactions(*)
    `)
    .single();
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] sendMessage:', error.message);
    return null;
  }
  return data as DbWorkerChannelMessage;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('worker_channel_messages')
    .update({ is_removed: true, removed_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] deleteMessage:', error.message);
    return false;
  }
  return true;
}

// =========================================================
// Reactions
// =========================================================

export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  // Check if reaction exists
  const { data: existing } = await supabase
    .from('worker_channel_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    // Remove existing reaction
    const { error } = await supabase
      .from('worker_channel_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) return false;
    return true;
  }

  // Add new reaction
  const { error } = await supabase
    .from('worker_channel_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] toggleReaction:', error.message);
    return false;
  }
  return true;
}

// =========================================================
// Realtime subscriptions
// =========================================================

export function subscribeToChannelMessages(
  channelId: string,
  callback: (message: DbWorkerChannelMessage) => void
) {
  return supabase
    .channel(`worker_channel:${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'worker_channel_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        callback(payload.new as DbWorkerChannelMessage);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'worker_channel_reactions',
      },
      () => {
        // Refetch reactions via the callback; we send a synthetic event
        callback({ id: '__reaction_update__', channel_id: channelId, user_id: '', content: '', message_type: 'system', is_flagged: false, flag_reason: null, flagged_by: null, is_removed: false, removed_by: null, removed_at: null, reply_to: null, attachment_url: null, created_at: '', updated_at: '' });
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'worker_channel_reactions',
      },
      () => {
        callback({ id: '__reaction_update__', channel_id: channelId, user_id: '', content: '', message_type: 'system', is_flagged: false, flag_reason: null, flagged_by: null, is_removed: false, removed_by: null, removed_at: null, reply_to: null, attachment_url: null, created_at: '', updated_at: '' });
      }
    )
    .subscribe();
}

// =========================================================
// Moderation Config
// =========================================================

export async function fetchModerationConfig(): Promise<DbWorkerModerationConfig | null> {
  const { data, error } = await supabase
    .from('worker_moderation_config')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    if (import.meta.env.DEV && error) console.error('[worker-channels] fetchModerationConfig:', error.message);
    return null;
  }
  return data as DbWorkerModerationConfig;
}

// =========================================================
// Price Updates (aggregated)
// =========================================================

export interface PriceUpdateSummary {
  price_item: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_count: number;
  latest_location: string | null;
  latest_date: string;
}

export async function fetchPriceUpdateSummaries(
  channelId?: string,
  limit = 20
): Promise<PriceUpdateSummary[]> {
  const { data, error } = await supabase.rpc('get_price_update_summaries', {
    p_channel_id: channelId ?? null,
    p_limit: limit,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] fetchPriceUpdateSummaries:', error.message);
    return [];
  }
  return (data ?? []) as PriceUpdateSummary[];
}

// =========================================================
// Account Type Check
// =========================================================

export async function isWorkerAccount(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', userId)
    .maybeSingle();
  return (data as { account_type?: string })?.account_type === 'pro_worker';
}

// =========================================================
// Verification Tier Check (for channel access gating)
// =========================================================

export async function getUserVerificationTier(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_verification_tier', { p_user_id: userId });
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] getUserVerificationTier:', error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

export function canAccessChannels(tier: number): boolean {
  return tier >= 2; // Tier 2 (FRELUX verified) and Tier 3 (FRELUX Pro)
}

// =========================================================
// Fetch user profile for display in chat
// =========================================================

export interface ChatUserProfile {
  id: string;
  display_name: string;
  business_name: string | null;
  bio: string | null;
  category_name: string | null;
  years_experience: number | null;
  verification_tier: number;
  verification_status: string;
  profile_image_url: string | null;
  slug: string;
  phone_verified: boolean;
  nin_verified: boolean;
  mobile_otp_verified: boolean;
  pro_level: boolean;
}

export async function fetchChatUserProfile(userId: string): Promise<ChatUserProfile | null> {
  const { data, error } = await supabase
    .from('pro_profiles')
    .select(`
      id,
      display_name,
      business_name,
      bio,
      years_experience,
      verification_status,
      profile_image_url,
      slug,
      phone_verified,
      nin_verified,
      mobile_otp_verified,
      pro_level,
      identity_verified_at,
      contact_verified_at,
      category:pro_categories(name)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    if (import.meta.env.DEV && error) console.error('[worker-channels] fetchChatUserProfile:', error.message);
    return null;
  }

  const p = data as Record<string, unknown>;
  let tier = 0;
  if (p.pro_level) tier = 3;
  else if (p.identity_verified_at) tier = 2;
  else if (p.contact_verified_at) tier = 1;

  return {
    id: p.id as string,
    display_name: p.display_name as string,
    business_name: p.business_name as string | null,
    bio: p.bio as string | null,
    category_name: (p.category as { name: string } | null)?.name ?? null,
    years_experience: p.years_experience as number | null,
    verification_tier: tier,
    verification_status: p.verification_status as string,
    profile_image_url: p.profile_image_url as string | null,
    slug: p.slug as string,
    phone_verified: p.phone_verified as boolean,
    nin_verified: p.nin_verified as boolean,
    mobile_otp_verified: p.mobile_otp_verified as boolean,
    pro_level: p.pro_level as boolean,
  };
}

// =========================================================
// Mobile OTP + NIN verification functions
// =========================================================

export async function sendMobileOTP(phoneNumber: string, userId: string): Promise<{ success: boolean; message: string; otpCode?: string }> {
  const { data, error } = await supabase.rpc('send_mobile_otp', {
    p_phone_number: phoneNumber,
    p_user_id: userId,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] sendMobileOTP:', error.message);
    return { success: false, message: error.message };
  }
  const result = data as { success: boolean; otp_code: string | null; message: string } | null;
  return {
    success: result?.success ?? false,
    message: result?.message ?? 'Failed to send OTP',
    otpCode: result?.otp_code ?? undefined,
  };
}

export async function verifyMobileOTP(
  phoneNumber: string,
  otpCode: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('verify_mobile_otp', {
    p_phone_number: phoneNumber,
    p_otp_code: otpCode,
    p_user_id: userId,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] verifyMobileOTP:', error.message);
    return { success: false, message: error.message };
  }
  const result = data as { success: boolean; message: string } | null;
  return {
    success: result?.success ?? false,
    message: result?.message ?? 'Verification failed',
  };
}

export async function submitNIN(ninNumber: string, userId: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('submit_nin_verification', {
    p_nin_number: ninNumber,
    p_user_id: userId,
  });
  if (error) {
    if (import.meta.env.DEV) console.error('[worker-channels] submitNIN:', error.message);
    return { success: false, message: error.message };
  }
  const result = data as { success: boolean; message: string } | null;
  return {
    success: result?.success ?? false,
    message: result?.message ?? 'NIN submission failed',
  };
}
