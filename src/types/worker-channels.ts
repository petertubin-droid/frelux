// =========================================================
// FRELUX Worker Channels — Database Types
// Phase 30: Nationwide worker chat & price updates
// =========================================================

export interface DbWorkerChannelCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbWorkerChannel {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  region: string | null;
  icon: string | null;
  is_active: boolean;
  is_official: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (from queries)
  member_count?: number;
  is_joined?: boolean;
  category?: DbWorkerChannelCategory | null;
  last_message?: {
    content: string;
    created_at: string;
    user_name?: string;
  } | null;
}

export type WorkerChannelMemberRole = 'member' | 'moderator' | 'admin';

export interface DbWorkerChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: WorkerChannelMemberRole;
  joined_at: string;
  muted_until: string | null;
}

export type WorkerMessageType = 'chat' | 'price_update' | 'system' | 'moderation';

export interface DbWorkerChannelMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  message_type: WorkerMessageType;
  // Price update fields
  price_item: string | null;
  price_amount: number | null;
  price_currency: string | null;
  price_location: string | null;
  price_store: string | null;
  // Moderation
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_by: string | null;
  is_removed: boolean;
  removed_by: string | null;
  removed_at: string | null;
  // Metadata
  reply_to: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  author_name?: string;
  author_avatar?: string | null;
  reactions?: DbWorkerChannelReaction[];
}

export interface DbWorkerChannelReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export type ModerationAction = 'flag' | 'remove' | 'mute_user' | 'unmute' | 'restore';

export interface DbWorkerModerationLog {
  id: string;
  message_id: string | null;
  channel_id: string | null;
  action: ModerationAction;
  reason: string | null;
  performed_by: string;
  ai_score: number | null;
  ai_categories: string[] | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface DbWorkerModerationConfig {
  id: string;
  is_enabled: boolean;
  auto_remove_threshold: number;
  auto_flag_threshold: number;
  banned_words: string[];
  banned_patterns: string[];
  warning_message: string;
  ai_provider: string;
  ai_model: string;
  created_at: string;
  updated_at: string;
}
