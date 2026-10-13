/**
 * FRELUX INTERNATIONAL ARCHITECTURE, Types
 *
 * All types for the multi-market system: market profiles, material rules,
 * products, pricing, calculator config, and user preferences.
 *
 * These types are purely additive, existing types are not modified.
 */

// ============================================================
// MARKET PROFILE
// ============================================================

export type MarketStatus =
  "active" | "coming_soon" | "unsupported" | "test_only";
export type MeasurementSystem = "metric" | "imperial" | "mixed";

export type MarketCalculatorType =
  // Finishing
  | "painting"
  | "screeding"
  | "pop_ceiling"
  | "tile"
  | "wall_finishing"
  | "tyrolene"
  | "grafitex"
  | "mineral_stone"
  | "stucco"
  | "flooring"
  | "waterproofing"
  // Structure & envelope
  | "block"
  | "roofing"
  | "build_to_roof"
  | "foundation"
  | "structural"
  | "reinforcement"
  | "doors_windows"
  // MEP
  | "electrical"
  | "plumbing"
  | "generator"
  | "solar_pv"
  | "heat_comfort"
  // Costing & workflow
  | "cost_estimator"
  | "labour_estimator"
  | "margin_calculator"
  | "boq_generator"
  | "sequence"
  // AI-assisted
  | "ai_image_estimator"
  | "ai_color_assistant"
  | "conversational_estimator"
  | "count_vision"
  | "defect_diagnosis"
  | "surface_assessment";

export interface MarketProfile {
  id: string;
  country_code: string;
  country_name: string;
  region: string | null;

  currency_code: string;
  currency_symbol: string;
  currency_name: string | null;

  default_measurement_system: MeasurementSystem;
  supported_length_units: string[];
  supported_area_units: string[];
  default_length_unit: string;
  default_area_unit: string;

  default_language: string;
  local_terminology: Record<string, string>;

  status: MarketStatus;
  inherits_from: string | null;
  profile_version: string;

  sort_order: number;
  is_visible: boolean;
  admin_notes: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================================
// MATERIAL RULES
// ============================================================

export type MaterialRulePriceType =
  "product" | "material" | "labour" | "quality_level";

export interface MarketMaterialRule {
  id: string;
  market_code: string;
  calculator_type: MarketCalculatorType;
  rule_key: string;
  rule_label: string | null;
  rule_value: Record<string, unknown>;
  description: string | null;
  rule_version: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MARKET PRODUCTS
// ============================================================

export interface MarketProduct {
  id: string;
  market_code: string;
  product_name: string;
  brand: string | null;
  category: string;
  calculator_compatibility: string[];
  package_size: number | null;
  package_unit: string | null;
  coverage_value: number | null;
  coverage_unit: string | null;
  current_price: number | null;
  currency_code: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MARKET PRICING
// ============================================================

export interface MarketPricing {
  id: string;
  market_code: string;
  product_id: string | null;
  price_label: string | null;
  price_type: MaterialRulePriceType;
  price: number;
  currency_code: string;
  price_unit: string | null;
  package_size: number | null;
  package_unit: string | null;
  effective_from: string;
  effective_to: string | null;

  // Provenance (Prompt 2 / Phase 6): every price records where it
  // came from, when it was collected and how confident we are.
  // Existing rows predating provenance are labelled honestly as
  // 'Admin manual entry'.
  source_name: string | null;
  source_url: string | null;
  collected_at: string | null;
  confidence: "high" | "medium" | "low";

  pricing_version: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CALCULATOR CONFIG
// ============================================================

export interface MarketCalculatorConfig {
  id: string;
  market_code: string;
  calculator_type: MarketCalculatorType;
  is_available: boolean;
  config: Record<string, unknown>;
  labels: Record<string, string>;
  config_version: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// USER PREFERENCES
// ============================================================

export type PreferredLengthUnit = "meters" | "feet" | "inches";
export type PreferredAreaUnit = "sqm" | "sqft";

export interface UserMarketPreference {
  id: string;
  user_id: string;
  market_code: string;
  preferred_length_unit: PreferredLengthUnit;
  preferred_area_unit: PreferredAreaUnit;
  display_currency: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// RESOLVED MARKET CONTEXT
// ============================================================

/**
 * The fully resolved market context after inheritance is applied.
 * This is what calculators receive, they don't deal with the raw profile.
 */
export interface ResolvedMarketContext {
  marketCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  measurementSystem: MeasurementSystem;
  defaultLengthUnit: PreferredLengthUnit;
  defaultAreaUnit: PreferredAreaUnit;
  supportedLengthUnits: PreferredLengthUnit[];
  supportedAreaUnits: PreferredAreaUnit[];
  defaultLanguage: string;
  localTerminology: Record<string, string>;
  status: MarketStatus;
  profileVersion: string;
}

// ============================================================
// CALCULATION AUDIT METADATA
// ============================================================

/**
 * Attached to calculation records for traceability.
 * Allows future recalculation and auditing.
 */
export interface CalculationAuditMeta {
  market_code: string;
  input_unit: string;
  normalized_unit: string;
  market_profile_version: string;
  material_rule_version: string | null;
  calculator_version: string | null;
  currency_code: string;
  timestamp: string;
}

// ============================================================
// LABELS
// ============================================================

export const MARKET_STATUS_LABELS: Record<MarketStatus, string> = {
  active: "Active",
  coming_soon: "Coming Soon",
  unsupported: "Unsupported",
  test_only: "Test Only",
};

export const MEASUREMENT_SYSTEM_LABELS: Record<MeasurementSystem, string> = {
  metric: "Metric (metres, m²)",
  imperial: "Imperial (feet, sqft)",
  mixed: "Mixed (metres & feet)",
};

export const CALCULATOR_TYPE_LABELS: Record<MarketCalculatorType, string> = {
  painting: "Painting",
  screeding: "Screeding",
  pop_ceiling: "POP Ceiling",
  tile: "Tiling",
  wall_finishing: "Wall Finishing",
  tyrolene: "Tyrolene",
  grafitex: "Grafitex",
  mineral_stone: "Mineral Stone",
  stucco: "Stucco",
  flooring: "Flooring",
  waterproofing: "Waterproofing",
  block: "Block",
  roofing: "Roofing",
  build_to_roof: "Build to Roof",
  foundation: "Foundation",
  structural: "Structural",
  reinforcement: "Reinforcement",
  doors_windows: "Doors & Windows",
  electrical: "Electrical",
  plumbing: "Plumbing",
  generator: "Generator",
  solar_pv: "Solar PV",
  heat_comfort: "Heat Comfort",
  cost_estimator: "Cost Estimator",
  labour_estimator: "Labour Estimator",
  margin_calculator: "Margin Calculator",
  boq_generator: "BOQ Generator",
  sequence: "Construction Sequence",
  ai_image_estimator: "AI Photo Estimator",
  ai_color_assistant: "Smart Color Assistant",
  conversational_estimator: "Conversational Estimator",
  count_vision: "Count Vision",
  defect_diagnosis: "Defect Diagnosis",
  surface_assessment: "Surface Assessment",
};

export const PRICE_TYPE_LABELS: Record<MaterialRulePriceType, string> = {
  product: "Product",
  material: "Material",
  labour: "Labour",
  quality_level: "Quality Level",
};
