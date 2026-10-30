/**
 * Site & soil intelligence: shared types.
 *
 * The distinction these types enforce is the whole point of the feature:
 * a SCREENING value came from a model or a published regional source and can
 * only prompt a question; a VERIFIED value came from a document a reviewer
 * accepted. Nothing here can promote one to the other.
 */

export type SoilSource =
  | "not_stated"
  | "map_screening"
  | "user_selection"
  | "report_verified";

export interface SoilClassification {
  id: string;
  slug: string;
  code: string;
  name: string;
  name_fr: string | null;
  summary: string;
  engineering_notes: string;
  implication: string;
  drainage_flag: boolean;
  dewatering_flag: boolean;
  ground_improvement_flag: boolean;
  investigation_priority: "standard" | "elevated" | "essential";
  sort_order: number;
}

export type ScreeningConfidence = "screening" | "sourced" | "unknown";

export interface ScreeningValue<T> {
  value: T | null;
  confidence: ScreeningConfidence;
  /** Human-readable origin, e.g. "Elevation model (Open-Meteo)" or a source reference. */
  source: string | null;
  /** Why the value cannot be treated as a finding. */
  limitation: string | null;
}

export interface RegionalSiteProfile {
  id: string;
  country_code: string;
  region_slug: string;
  region_name: string;
  city_slug: string | null;
  groundwater_note: string | null;
  flood_exposure: "low" | "moderate" | "high" | "unknown" | null;
  drainage_note: string | null;
  terrain_note: string | null;
  erosion_note: string | null;
  source_reference: string;
  source_url: string | null;
  source_year: number | null;
  verification_status: "sourced" | "verified" | "withdrawn";
}

export interface SiteScreening {
  latitude: number;
  longitude: number;
  elevation_m: ScreeningValue<number>;
  slope_degrees: ScreeningValue<number>;
  coastal_distance_km: ScreeningValue<number>;
  flood_exposure: ScreeningValue<"low" | "moderate" | "high" | "unknown">;
  drainage_note: ScreeningValue<string>;
  groundwater_note: ScreeningValue<string>;
  erosion_note: ScreeningValue<string>;
  regional_profile: RegionalSiteProfile | null;
  generated_at: string;
}

export type FoundationType =
  | "strip"
  | "pad"
  | "raft"
  | "pile"
  | "ground_improvement";

export type BearingSource = "report_verified" | "user_assumption";

export interface ScenarioAssumptions {
  /** Allowable bearing capacity the user is willing to run the scenario on. */
  bearing_capacity_kpa: number;
  bearing_source: BearingSource;
  depth_m: number;
  wall_load_kn_m?: number;
  column_load_kn?: number;
  building_length_m?: number;
  building_width_m?: number;
  /** Reinforcement intensity, user-editable; no default is presented as a finding. */
  reinforcement_kg_per_m3?: number;
  formwork_area_m2?: number;
  /** Dewatering is a user cost allowance, never an inferred quantity. */
  dewatering_allowance?: number;
  ground_improvement_area_m2?: number;
  pile_count?: number;
  pile_depth_m?: number;
  concrete_grade?: string;
}

export interface ScenarioQuantities {
  excavation_m3: number;
  concrete_m3: number;
  blinding_m3: number;
  hardcore_m3: number;
  reinforcement_kg: number;
  formwork_m2: number;
  dewatering_allowance: number;
  ground_improvement_m2: number;
  pile_metres: number;
}

export interface CostLine {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  amount: number | null;
  material_slug?: string;
  /** Where this line's price came from, or why it has none. */
  price_note: string;
}

export interface ScenarioCost {
  currency: string;
  lines: CostLine[];
  subtotal: number | null;
  /** Lines with no price, which make the subtotal incomplete. */
  unpriced: string[];
  price_basis: {
    city_slug: string | null;
    representative_date: string | null;
    sample_size: number | null;
    verification: "verified" | "reported" | "mixed" | "none";
    note: string;
  };
}

export interface FoundationScenarioResult {
  quantities: ScenarioQuantities;
  design: {
    required_width_mm: number | null;
    recommended_width_mm: number | null;
    bearing_check_pass: boolean | null;
    applied_pressure_kpa: number | null;
  };
  warnings: string[];
  cost: ScenarioCost | null;
}

export interface GeotechReport {
  id: string;
  project_site_id: string;
  report_type:
    | "soil_investigation"
    | "borehole_log"
    | "laboratory"
    | "bearing_capacity"
    | "groundwater";
  title: string;
  storage_path: string;
  original_filename: string | null;
  report_date: string | null;
  prepared_by: string | null;
  findings: string | null;
  bearing_capacity_kpa: number | null;
  groundwater_depth_m: number | null;
  borehole_count: number | null;
  verification_status: "unverified" | "verified" | "rejected";
  verified_by: string | null;
  verified_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface ProjectSite {
  id: string;
  user_id: string;
  project_id: string | null;
  label: string;
  latitude: number;
  longitude: number;
  address: string | null;
  country_code: string | null;
  city_slug: string | null;
  soil_classification_id: string | null;
  soil_source: SoilSource;
  screening: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}
