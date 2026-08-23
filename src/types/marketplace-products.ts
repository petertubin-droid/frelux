// Marketplace product types

export type ProductCondition = 'new' | 'like_new' | 'good' | 'fair';
export type ProductStatus = 'active' | 'sold' | 'paused' | 'removed';

export interface DbProductCategory {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_indexable: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbMarketplaceProduct {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  negotiable: boolean;
  condition: ProductCondition;
  quantity: number;
  unit: string | null;
  images: string[];
  primary_image_idx: number;
  location_state: string | null;
  location_city: string | null;
  location_area: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_available: boolean;
  delivery_fee: number | null;
  pickup_available: boolean;
  specs: Record<string, string>;
  tags: string[];
  brand: string | null;
  status: ProductStatus;
  is_featured: boolean;
  admin_removed: boolean;
  admin_notes: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_indexable: boolean;
  view_count: number;
  inquiry_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: { id: string; name: string; slug: string };
  seller?: { id: string; full_name: string; avatar_url: string | null; marketplace_id: string | null };
}

export interface DbProductInquiry {
  id: string;
  product_id: string;
  buyer_id: string;
  message: string;
  offered_price: number | null;
  contact_phone: string | null;
  status: 'pending' | 'responded' | 'closed' | 'spam';
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: DbMarketplaceProduct;
  buyer?: { id: string; full_name: string; avatar_url: string | null };
}

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Active',
  sold: 'Sold',
  paused: 'Paused',
  removed: 'Removed',
};
