
// =========================================================
// FRELUX Pro Connect — Database Types
// =========================================================

export interface DbProCategory {
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

export interface DbProService {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProLocation {
  id: string;
  state: string;
  city: string;
  area: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProAvailability = 'available' | 'busy' | 'unavailable';
export type ProVerificationStatus = 'unverified' | 'pending' | 'verified' | 'suspended';

export interface DbProProfile {
  id: string;
  user_id: string;
  category_id: string | null;
  business_name: string | null;
  display_name: string;
  slug: string;
  bio: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  years_experience: number | null;
  availability: ProAvailability;
  verification_status: ProVerificationStatus;
  is_profile_complete: boolean;
  is_listed: boolean;
  contact_email_public: boolean;
  contact_phone_public: boolean;
  contact_phone: string | null;
  website_url: string | null;
  rating_avg: number;
  rating_count: number;
  project_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbProProfileService {
  id: string;
  profile_id: string;
  service_id: string;
  created_at: string;
  service?: DbProService;
}

export interface DbProProfileLocation {
  id: string;
  profile_id: string;
  location_id: string;
  service_radius_km: number;
  created_at: string;
  location?: DbProLocation;
}

export interface DbProPortfolioItem {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  category: string | null;
  image_urls: string[];
  completed_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbProReview {
  id: string;
  professional_id: string;
  reviewer_id: string;
  rating: number;
  review_text: string | null;
  project_ref: string | null;
  professional_response: string | null;
  professional_response_at: string | null;
  is_hidden: boolean;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  reviewer_email?: string;
  professional?: { display_name: string; slug: string };
}

export type ProConversationStatus = 'active' | 'archived' | 'blocked';

export interface DbProConversation {
  id: string;
  professional_id: string;
  customer_id: string;
  project_ref: string | null;
  project_context: Record<string, unknown> | null;
  status: ProConversationStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  professional?: DbProProfile;
  last_message?: string;
  unread_count?: number;
}

export interface DbProMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  is_read: boolean;
  read_at: string | null;
  is_flagged: boolean;
  created_at: string;
}

export type ProReportType = 'profile' | 'review' | 'message' | 'portfolio';
export type ProReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface DbProReport {
  id: string;
  reporter_id: string;
  report_type: ProReportType;
  target_id: string;
  reason: string;
  description: string | null;
  status: ProReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProVerificationLog {
  id: string;
  profile_id: string;
  admin_id: string;
  old_status: ProVerificationStatus | null;
  new_status: ProVerificationStatus;
  notes: string | null;
  created_at: string;
}

// Composite type for directory search results (joined data)
export interface ProDirectoryResult {
  profile: DbProProfile;
  category?: DbProCategory;
  services: DbProService[];
  locations: DbProLocation[];
  portfolio_count: number;
}
