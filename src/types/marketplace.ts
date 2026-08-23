// Marketplace database types

export interface DbMarketplaceListing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  project_type: 'painting' | 'screeding' | 'pop_ceiling' | 'tiling' | 'multi_trade';
  category_id: string | null;
  scope_summary: Record<string, unknown>;
  estimate_ref: string | null;
  project_ref: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  location_state: string | null;
  location_city: string | null;
  location_area: string | null;
  status: 'draft' | 'open' | 'awarded' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  urgency: 'standard' | 'urgent' | 'flexible';
  is_featured: boolean;
  is_active: boolean;
  admin_removed: boolean;
  admin_notes: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_indexable: boolean;
  latitude: number | null;
  longitude: number | null;
  view_count: number;
  bid_count: number;
  expires_at: string | null;
  awarded_to: string | null;
  awarded_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMarketplaceBid {
  id: string;
  listing_id: string;
  pro_profile_id: string;
  proposed_price: number;
  proposed_timeline_days: number | null;
  cover_message: string;
  attachments: Array<{ url: string; name: string; type: string }>;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  rejected_at: string | null;
  rejected_reason: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  pro_profile?: {
    id: string;
    display_name: string;
    business_name: string | null;
    slug: string;
    profile_image_url: string | null;
    verification_status: string;
    rating_avg: number;
    rating_count: number;
    project_count: number;
  };
}

export interface DbMarketplaceOrder {
  id: string;
  listing_id: string;
  bid_id: string;
  client_id: string;
  pro_profile_id: string;
  agreed_price: number;
  agreed_timeline_days: number | null;
  agreement_terms: string | null;
  currency: string;
  payment_status: 'unpaid' | 'deposit_paid' | 'partially_paid' | 'fully_paid' | 'refunded';
  status: 'pending_start' | 'in_progress' | 'client_review' | 'completed' | 'disputed' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancel_initiated_by: string | null;
  client_rating: number | null;
  client_review: string | null;
  client_reviewed_at: string | null;
  pro_rating: number | null;
  pro_review: string | null;
  pro_reviewed_at: string | null;
  order_number: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  listing?: DbMarketplaceListing;
  pro_profile?: {
    id: string;
    display_name: string;
    business_name: string | null;
    slug: string;
    profile_image_url: string | null;
    verification_status: string;
    rating_avg: number;
    project_count: number;
  };
  client?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface DbMarketplaceMilestone {
  id: string;
  order_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  expected_date: string | null;
  completed_date: string | null;
  client_approved: boolean;
  client_approved_at: string | null;
  pro_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMarketplacePayment {
  id: string;
  order_id: string;
  payer_id: string;
  payee_id: string | null;
  amount: number;
  currency: string;
  payment_type: 'deposit' | 'milestone' | 'final' | 'refund' | 'commission';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: string | null;
  provider_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMarketplaceDispute {
  id: string;
  order_id: string;
  raised_by: string;
  raised_by_role: 'client' | 'pro';
  reason: string;
  description: string | null;
  evidence_urls: string[];
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  admin_resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  painting: 'Painting',
  screeding: 'Screeding',
  pop_ceiling: 'POP Ceiling',
  tiling: 'Tiling',
  multi_trade: 'Multi-Trade',
};

export const URGENCY_LABELS: Record<string, string> = {
  standard: 'Standard',
  urgent: 'Urgent',
  flexible: 'Flexible',
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  awarded: 'Awarded',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_start: 'Pending Start',
  in_progress: 'In Progress',
  client_review: 'Client Review',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
};

export const BID_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};
