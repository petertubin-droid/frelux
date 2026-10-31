/**
 * Supplier network types.
 *
 * The vocabulary here is deliberately conservative. A supplier has a
 * verification *level*, and a level records what FRELUX actually checked, not
 * how good the business is. Paid placement is a separate field from any ranking
 * input so a promoted listing can never be mistaken for an organic result.
 */

export type VerificationLevel =
  | "unverified"
  | "identity_checked"
  | "documents_reviewed"
  | "address_checked"
  | "platform_verified";

export type SubscriptionPlan = "free" | "growth" | "enterprise";
export type DeliveryFeeModel = "free" | "per_order" | "per_km" | "quoted";
export type ListingStatus = "pending" | "active" | "rejected" | "removed";

export interface SupplierProfile {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string | null;
  country_name: string | null;
  market_code: string;
  city: string | null;
  neighbourhood: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  business_reg_no: string | null;
  tax_id: string | null;
  description: string | null;
  product_categories: string[];
  public_slug: string | null;
  verification_status: string;
  verification_level: VerificationLevel;
  is_verified: boolean;
  delivery_radius_km: number | null;
  delivery_notes: string | null;
  minimum_order_value: number | null;
  delivery_fee_model: DeliveryFeeModel;
  rating: number | null;
  total_quotes_served: number | null;
  response_rate: number | null;
  avg_response_hours: number | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: string;
  subscription_renews_at: string | null;
  /** Paid placement. Never used as an organic ranking signal. */
  is_featured: boolean;
  featured_until: string | null;
  lead_credits: number;
  status: string | null;
  verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierListing {
  id: string;
  supplier_id: string;
  market_code: string;
  material_category: string;
  category: string | null;
  material_slug: string;
  product_name: string;
  brand_name: string | null;
  brand: string | null;
  specification: string | null;
  sku: string | null;
  description: string | null;
  unit: string;
  unit_price: number;
  currency: string;
  minimum_order_qty: number | null;
  in_stock: boolean;
  stock_status: string;
  lead_time_days: number | null;
  delivery_available: boolean | null;
  delivery_fee: number | null;
  delivery_fee_currency: string | null;
  bulk_discount_threshold: number | null;
  bulk_discount_pct: number | null;
  notes: string | null;
  is_featured: boolean;
  is_active: boolean;
  listing_status: ListingStatus;
  admin_notes: string | null;
  price_updated_at: string;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierDeliveryZone {
  id: string;
  supplier_id: string;
  market_code: string;
  city: string;
  neighbourhood: string | null;
  delivery_fee: number;
  currency: string;
  minimum_order_value: number | null;
  eta_days: number | null;
  is_active: boolean;
}

export interface SupplierPlan {
  code: SubscriptionPlan;
  name: string;
  currency: string;
  monthly_price: number;
  max_listings: number | null;
  includes_verified_badge: boolean;
  monthly_lead_credits: number;
  featured_slots: number;
  commission_pct: number;
  is_active: boolean;
}

export type MaterialRequestStatus =
  "draft" | "open" | "quoted" | "awarded" | "closed" | "cancelled";

export interface MaterialRequest {
  id: string;
  buyer_id: string;
  reference: string;
  market_code: string;
  currency: string;
  city: string | null;
  neighbourhood: string | null;
  title: string;
  notes: string | null;
  needed_by: string | null;
  visibility: "public" | "invited";
  status: MaterialRequestStatus;
  expires_at: string | null;
  awarded_quote_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialRequestItem {
  id: string;
  request_id: string;
  material_category: string;
  material_slug: string | null;
  product_name: string;
  brand: string | null;
  specification: string | null;
  unit: string;
  quantity: number;
  target_price: number | null;
}

export interface QuoteLine {
  /** Matches MaterialRequestItem.id when the supplier quotes a requested line. */
  request_item_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  /** Supplier's own specification note for this line. */
  specification?: string | null;
}

export interface MaterialRequestQuote {
  id: string;
  request_id: string;
  supplier_id: string;
  supplier_user_id: string;
  currency: string;
  lines: QuoteLine[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  lead_time_days: number | null;
  valid_until: string | null;
  notes: string | null;
  status: "submitted" | "withdrawn" | "accepted" | "declined" | "expired";
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed";

export interface MaterialOrder {
  id: string;
  reference: string;
  request_id: string;
  quote_id: string;
  buyer_id: string;
  supplier_id: string;
  currency: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  expected_delivery: string | null;
  delivered_at: string | null;
  delivery_confirmed_by: string | null;
  delivery_note: string | null;
  payment_status: "unpaid" | "pending" | "paid" | "refunded";
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialOrderEvent {
  id: string;
  order_id: string;
  status: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export interface SupplierCategory {
  slug: string;
  label: string;
  /** The unit a buyer normally requests in. Suppliers may list in others. */
  defaultUnit: string;
}

/** The fourteen material categories the directory covers. */
export const SUPPLIER_CATEGORIES: SupplierCategory[] = [
  { slug: "cement", label: "Cement", defaultUnit: "bag" },
  { slug: "steel", label: "Iron rods & steel", defaultUnit: "tonne" },
  { slug: "sand", label: "Sand", defaultUnit: "tonne" },
  { slug: "granite", label: "Granite & aggregates", defaultUnit: "tonne" },
  { slug: "blocks", label: "Blocks", defaultUnit: "piece" },
  { slug: "roofing", label: "Roofing materials", defaultUnit: "m²" },
  { slug: "floor-tiles", label: "Tiles", defaultUnit: "m²" },
  { slug: "painting-materials", label: "Paint", defaultUnit: "litre" },
  { slug: "timber", label: "Timber", defaultUnit: "piece" },
  { slug: "electrical", label: "Electrical materials", defaultUnit: "piece" },
  { slug: "plumbing", label: "Plumbing materials", defaultUnit: "piece" },
  { slug: "doors-windows", label: "Doors & windows", defaultUnit: "piece" },
  {
    slug: "finishing-materials",
    label: "Finishing materials",
    defaultUnit: "unit",
  },
  {
    slug: "construction-equipment",
    label: "Construction equipment",
    defaultUnit: "day",
  },
];

export function categoryLabel(slug: string): string {
  return (
    SUPPLIER_CATEGORIES.find((c) => c.slug === slug)?.label ??
    slug.replace(/-/g, " ")
  );
}

export function categoryDefaultUnit(slug: string): string {
  return (
    SUPPLIER_CATEGORIES.find((c) => c.slug === slug)?.defaultUnit ?? "unit"
  );
}

export interface SupplierSearchFilters {
  marketCode?: string;
  city?: string;
  neighbourhood?: string;
  category?: string;
  query?: string;
  verificationLevel?: VerificationLevel | "any";
  inStockOnly?: boolean;
  deliveryOnly?: boolean;
  limit?: number;
}

export interface SupplierSearchResult {
  supplier: SupplierProfile;
  listings: SupplierListing[];
  matchedListings: SupplierListing[];
  zones: SupplierDeliveryZone[];
  /** True only when the supplier paid for placement. Rendered as a label. */
  promoted: boolean;
  organicScore: number;
  lowestPrice: number | null;
  currency: string | null;
}
