// Marketplace expansion types — favorites, reviews, reports, seller profiles

export type FavoriteItemType = 'product' | 'listing' | 'professional' | 'project';
export type ReviewType = 'seller' | 'professional' | 'product' | 'listing';
export type ReviewStatus = 'published' | 'hidden' | 'flagged' | 'removed';
export type ReportType = 'product' | 'listing' | 'review' | 'seller' | 'professional';
export type ReportReason =
  | 'scam' | 'counterfeit' | 'prohibited_item' | 'misleading_information'
  | 'inappropriate_content' | 'duplicate' | 'wrong_category' | 'spam' | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type SellerType = 'individual' | 'business' | 'supplier' | 'manufacturer' | 'distributor' | 'professional';
export type SellerVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';

export interface DbMarketplaceFavorite {
  id: string;
  user_id: string;
  item_type: FavoriteItemType;
  product_id: string | null;
  listing_id: string | null;
  pro_profile_id: string | null;
  created_at: string;
  // Joined
  product?: { id: string; title: string; price: number; currency: string; images: string[]; primary_image_idx: number };
  listing?: { id: string; title: string; status: string };
  pro_profile?: { id: string; display_name: string; slug: string; profile_image_url: string | null };
}

export interface DbMarketplaceReview {
  id: string;
  reviewer_id: string;
  review_type: ReviewType;
  seller_id: string | null;
  pro_profile_id: string | null;
  product_id: string | null;
  listing_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  admin_notes: string | null;
  seller_response: string | null;
  seller_responded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  reviewer?: { id: string; full_name: string; avatar_url: string | null };
}

export interface DbMarketplaceReport {
  id: string;
  reporter_id: string;
  report_type: ReportType;
  product_id: string | null;
  listing_id: string | null;
  review_id: string | null;
  reported_user_id: string | null;
  pro_profile_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMarketplaceSellerProfile {
  id: string;
  user_id: string;
  seller_type: SellerType;
  business_name: string | null;
  business_registration: string | null;
  tax_id: string | null;
  business_address: string | null;
  business_phone: string | null;
  verification_status: SellerVerificationStatus;
  verification_docs: unknown[];
  verified_at: string | null;
  verified_by: string | null;
  default_currency: string;
  default_location_state: string | null;
  default_location_city: string | null;
  default_delivery_available: boolean;
  default_pickup_available: boolean;
  active_listing_count: number;
  total_sales: number;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMarketplacePricingUnit {
  id: string;
  unit: string;
  label: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  individual: 'Individual Seller',
  business: 'Business',
  supplier: 'Supplier',
  manufacturer: 'Manufacturer',
  distributor: 'Distributor',
  professional: 'Professional',
};

export const SELLER_VERIFICATION_LABELS: Record<SellerVerificationStatus, string> = {
  unverified: 'Unverified',
  pending: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  scam: 'Scam / Fraud',
  counterfeit: 'Counterfeit Item',
  prohibited_item: 'Prohibited Item',
  misleading_information: 'Misleading Information',
  inappropriate_content: 'Inappropriate Content',
  duplicate: 'Duplicate Listing',
  wrong_category: 'Wrong Category',
  spam: 'Spam',
  other: 'Other',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  published: 'Published',
  hidden: 'Hidden',
  flagged: 'Flagged',
  removed: 'Removed',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};
