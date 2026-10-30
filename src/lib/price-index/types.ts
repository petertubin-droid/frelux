/** Shared types for the Live Material Price Index. */

export type PriceKind =
  | "retail"
  | "wholesale"
  | "delivery_inclusive"
  | "ex_depot";

export type VerificationStatus = "verified" | "reported" | "unverified" | "flagged";

export const PRICE_KIND_LABELS: Record<PriceKind, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  delivery_inclusive: "Delivery included",
  ex_depot: "Ex-depot",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: "Verified",
  reported: "Reported, unverified",
  unverified: "Unverified",
  flagged: "Flagged",
};

export type MarketCity = {
  slug: string;
  country_code: string;
  name: string;
  state: string | null;
  is_active: boolean;
  sort_order: number;
};

export type IndexMaterial = {
  material_id: string;
  name: string;
  slug: string;
  category: string;
  /** Sale basis as recorded on the price, e.g. "50 kg bag". */
  sale_unit: string | null;
};

export type IndexListing = IndexMaterial & {
  price_id: string;
  price: number;
  currency: string;
  price_kind: PriceKind | null;
  market: string;
  city_slug: string | null;
  supplier_name: string | null;
  source_url: string | null;
  price_source: string | null;
  effective_date: string | null;
  verified_at: string | null;
  verification_status: VerificationStatus | null;
  supporting_submissions: number;
};

export type IndexHistoryPoint = {
  observed_at: string;
  price: number;
  note: string | null;
};

export type SubmissionRow = {
  id: string;
  market: string;
  city_slug: string | null;
  item_name: string;
  estimation_material_id: string | null;
  vendor: string | null;
  price: number;
  currency: string;
  unit: string | null;
  price_kind: PriceKind | null;
  source_url: string | null;
  notes: string | null;
  status: string;
  flag_reason: string | null;
  verification_count: number;
  created_at: string;
  reviewed_at: string | null;
};

export type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  note: string | null;
  created_at: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};
