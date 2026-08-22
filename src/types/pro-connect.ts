
// =========================================================
// FRELUX Pro Connect — Database Types
// Phase 25 + Phase 26 (Verification System)
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

// Phase 26: Extended verification statuses
export type ProVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'more_info'
  | 'suspended';

// Phase 26: Verification tier levels
export type VerificationTier = 0 | 1 | 2 | 3;
// 0 = unverified, 1 = contact verified, 2 = FRELUX verified, 3 = FRELUX Pro

// Phase 26: Account types
export type AccountType = 'client' | 'pro_worker';

// Phase 26: Verification request types
export type VerificationRequestType = 'contact' | 'identity' | 'pro_level';
export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected' | 'more_info' | 'withdrawn';

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
  // Phase 26: Tiered verification columns
  contact_verified_at: string | null;
  identity_verified_at: string | null;
  pro_level: boolean;
  pro_level_awarded_at: string | null;
  phone_verified: boolean;
  phone_number: string | null;
  // Phase 31: KYC + mobile verification
  nin_number: string | null;
  nin_verified: boolean;
  nin_verified_at: string | null;
  mobile_otp_verified: boolean;
  mobile_otp_verified_at: string | null;
  mobile_number: string | null;
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
  is_verified_review: boolean; // Phase 26: "Verified Project Review"
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
  is_removed: boolean;
  flag_reason: string | null;
  flagged_by: string | null;
  message_type: string | null;
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

// Phase 26: Verification Request
export interface DbProVerificationRequest {
  id: string;
  profile_id: string;
  request_type: VerificationRequestType;
  status: VerificationRequestStatus;
  professional_name: string | null;
  business_name: string | null;
  category_id: string | null;
  service_locations: string[] | null;
  years_experience: number | null;
  identity_document_type: string | null;
  identity_document_number: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  more_info_request: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// Phase 26: Verification Document (private)
export interface DbProVerificationDocument {
  id: string;
  profile_id: string;
  request_id: string | null;
  document_type: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
  created_at: string;
}

// Phase 26: Professional Credential (regulated professions)
export type CredentialVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';

export interface DbProCredential {
  id: string;
  profile_id: string;
  professional_body: string;
  registration_number: string;
  credential_type: string;
  verification_status: CredentialVerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  expires_at: string | null;
  document_path: string | null;
  created_at: string;
  updated_at: string;
}

// Phase 26: Public credential view (no sensitive fields)
export interface DbProCredentialPublic {
  id: string;
  profile_id: string;
  professional_body: string;
  credential_type: string;
  verification_status: CredentialVerificationStatus;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Phase 26: Pro Settings (admin-configurable)
export interface DbProSettings {
  id: number;
  contact_verified_description: string;
  frelux_verified_description: string;
  pro_level_description: string;
  verification_disclaimer: string;
  pro_level_min_reviews: number;
  pro_level_min_rating: number;
  pro_level_min_portfolio_items: number;
  pro_level_min_profile_age_days: number;
  verified_boost_in_search: boolean;
  auto_publish_reviews: boolean;
  require_review_approval: boolean;
  created_at: string;
  updated_at: string;
}

// Composite type for directory search results (joined data)
export interface ProDirectoryResult {
  profile: DbProProfile;
  category?: DbProCategory;
  services: DbProService[];
  locations: DbProLocation[];
  portfolio_count: number;
}

// Phase 26: Helper to compute verification tier from profile
export function getVerificationTier(profile: DbProProfile): VerificationTier {
  if (profile.pro_level) return 3;
  if (profile.identity_verified_at) return 2;
  if (profile.contact_verified_at) return 1;
  return 0;
}

// Phase 26: Verification tier display info
export const verificationTierInfo: Record<VerificationTier, {
  label: string;
  shortLabel: string;
  icon: 'check' | 'shield' | 'award';
  color: string;
}> = {
  0: { label: 'Unverified', shortLabel: 'Unverified', icon: 'check', color: 'neutral' },
  1: { label: 'Contact Verified', shortLabel: 'Contact Verified', icon: 'check', color: 'emerald' },
  2: { label: 'FRELUX Verified', shortLabel: 'Verified', icon: 'shield', color: 'blue' },
  3: { label: 'FRELUX Pro', shortLabel: 'Pro', icon: 'award', color: 'amber' },
};
