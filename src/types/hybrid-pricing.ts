/**
 * Hybrid Pricing System Types
 * Systems A, B, and C: Macro Fluctuation Filter, Closed-Loop Crowdsourcing,
 * and Localized Supplier Inventory.
 */

// ============================================================
// SYSTEM A: THE FLUCTUATION FILTER (MACRO TRACKER) TYPES
// ============================================================

export type CommodityCategory =
  | "steel"
  | "cement"
  | "fuel_transport"
  | "timber"
  | "sand_gravel"
  | "roofing_sheet"
  | "general_inflation";

export interface MacroIndicator {
  id: string;
  market_code: string; // ISO 3166-1 alpha-2, e.g. KE, NG, GH, ZA
  country_name: string;
  currency: string;
  indicator_type: CommodityCategory;
  headline_name: string;
  current_index_value: number;
  baseline_index_value: number;
  pct_change_30d: number;
  pct_change_90d: number;
  pct_change_yoy: number;
  source_name: string;
  source_url?: string;
  published_at: string;
  last_synced_at: string;
}

export interface MacroElasticityRule {
  id: string;
  market_code: string;
  material_category: string; // e.g. steel, concrete, masonry, roofing, paint
  commodity_trigger: CommodityCategory;
  elasticity_multiplier: number; // e.g. 1.0 means 1:1, 0.6 means 60% passthrough
  activation_threshold_pct: number; // minimum % spike to trigger adjustment (e.g. 3%)
  ceiling_adjustment_pct: number; // cap max automated adjustment (e.g. 25%)
  is_active: boolean;
  notes?: string;
}

export interface MacroAdjustmentResult {
  marketCode: string;
  materialCategory: string;
  originalPrice: number;
  adjustedPrice: number;
  adjustmentPct: number;
  triggerIndicator: MacroIndicator | null;
  ruleApplied: MacroElasticityRule | null;
  appliedAt: string;
  rationale: string;
}

// ============================================================
// SYSTEM B: CLOSED-LOOP CROWDSOURCING ENGINE TYPES
// ============================================================

export type QuorumStatus = "insufficient_data" | "quorum_reached" | "promoted";

export interface CrowdsourcedExpenseSubmission {
  id: string;
  contributor_id?: string; // Anonymized hash of contractor user id
  project_id?: string;
  market_code: string;
  city?: string;
  material_category: string;
  material_name: string;
  material_slug: string;
  unit_price: number;
  currency: string;
  unit: string;
  purchased_at: string;
  is_outlier: boolean;
  opt_in_verified: boolean;
  created_at: string;
}

export interface CrowdsourcedMarketBenchmark {
  id: string;
  market_code: string;
  city?: string | null;
  material_slug: string;
  material_name: string;
  sample_size: number;
  median_price: number;
  trimmed_mean_price: number;
  currency: string;
  unit: string;
  quorum_threshold: number;
  quorum_status: QuorumStatus;
  is_promoted: boolean;
  window_days: number;
  last_promoted_at?: string | null;
  updated_at: string;
}

export interface ExpenseCrowdsourceInput {
  expenseId?: string;
  marketCode: string;
  city?: string;
  materialCategory: string;
  materialName: string;
  unitPrice: number;
  unit?: string;
  currency: string;
  vendorName?: string;
  optInCrowdsourcing: boolean;
}

// ============================================================
// SYSTEM C: LOCALIZED SUPPLIER INVENTORY TYPES
// ============================================================

export type SupplierVerificationStatus =
  "unverified" | "pending" | "verified" | "rejected";

export interface SupplierProfile {
  id: string;
  user_id: string;
  company_name: string;
  contact_name?: string;
  country_name?: string;
  market_code: string;
  city?: string;
  address?: string | null;
  phone?: string;
  whatsapp?: string | null;
  email?: string | null;
  business_reg_no?: string | null;
  tax_id?: string | null;
  verification_status?: SupplierVerificationStatus;
  verification_tier?: string;
  is_verified?: boolean;
  delivery_radius_km?: number;
  rating: number;
  total_quotes_served?: number;
  status?: string;
  verified_at?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierInventoryItem {
  id: string;
  supplier_id: string;
  market_code?: string;
  material_category?: string;
  category?: string;
  material_slug: string;
  product_name?: string;
  brand_name?: string;
  brand?: string | null;
  sku?: string;
  description?: string;
  unit: string;
  unit_price: number;
  currency: string;
  minimum_order_qty?: number;
  in_stock?: boolean;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock";
  lead_time_days?: number;
  delivery_available?: boolean;
  bulk_discount_threshold?: number;
  bulk_discount_pct?: number;
  notes?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  last_updated_at?: string;
  created_at?: string;
  updated_at?: string;
  supplier?: SupplierProfile;
}

export interface SupplierOffer {
  id: string;
  supplierId: string;
  supplierName: string;
  isVerified: boolean;
  city: string;
  distanceKm?: number;
  productName: string;
  brand?: string | null;
  unitPrice: number;
  currency: string;
  unit: string;
  inStock: boolean;
  leadTimeDays: number;
  phone: string;
  whatsapp?: string | null;
}

// ============================================================
// HYBRID RESOLUTION HIERARCHY
// ============================================================

export type PricingLayer =
  | "supplier_live"
  | "supplier"
  | "crowdsourced_quorum"
  | "crowdsource"
  | "macro_filtered"
  | "macro_adjusted"
  | "baseline_reference"
  | "baseline";

export interface HybridPriceResolution {
  price?: number;
  resolvedPrice: number;
  currency: string;
  unit: string | null;
  layer: PricingLayer;
  confidence: number | "verified_live" | "high" | "medium" | "estimated";
  isVerified?: boolean;
  marketCode?: string;
  materialSlug?: string;
  materialCategory?: string;
  resolvedAt?: string;
  provenance: {
    sourceName?: string;
    sourceType?: string;
    supplierName?: string;
    sampleSize?: number;
    macroAdjustmentPct?: number;
    timestamp?: string;
    description?: string;
    rationale?: string;
    supplierItem?: SupplierInventoryItem | null;
    supplierCount?: number;
    crowdsourceBenchmark?: CrowdsourcedMarketBenchmark | null;
    macroAdjustment?: MacroAdjustmentResult | null;
  };
  alternatives?: {
    supplierPrice?: number;
    crowdsourcedPrice?: number;
    macroAdjustedPrice?: number;
    basePrice?: number;
  };
}

// ============================================================
// AUTOMATED MATERIAL PRICING SYSTEM TYPES
// ============================================================

export type MaterialPricingSource = "api" | "crowdsourced" | "manual";

export interface DynamicMaterialPricingRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  base_price: number;
  last_updated_via: MaterialPricingSource;
  regional_multiplier: number;
  currency: string;
}
