/**
 * FRELUX INTERNATIONAL ARCHITECTURE, Engine Capability Registry
 *
 * The single canonical registry of every calculator/estimator engine in the
 * application and the markets for which each engine has VERIFIED support.
 *
 * Rules enforced by this module (and mirrored by the database seed):
 *  - A database row may DISABLE a capability but can never MANUFACTURE one:
 *    if an engine is not verified for a market, an `is_available = true` row
 *    still yields `requires_verification`, never `enabled`.
 *  - A missing configuration row is NEVER interpreted as evidence that an
 *    engine is implemented or accurate — it resolves to `not_configured`.
 *  - NG is not special-cased at runtime; it simply has the widest verified
 *    market list, preserving existing Nigerian behaviour.
 *
 * Evidence for "verified" statuses comes from the market expansion work
 * (assemblies, role mappings, verified pricebooks) and is cited per engine.
 */

// ============================================================
// CANONICAL ENGINE TYPES
// ============================================================

/** Every calculator/estimator engine that actually exists in the app. */
export type CanonicalEngineId =
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
  // AI-assisted (route through deterministic engines)
  | "ai_image_estimator"
  | "ai_color_assistant"
  | "conversational_estimator"
  | "count_vision"
  | "defect_diagnosis"
  | "surface_assessment"
  // Costing / commercial / workflow engines (source-audit reconciliation 2026-10-13)
  | "regional_cost"
  | "cash_flow"
  | "contractor_credit"
  | "circular_reuse"
  | "embodied_carbon"
  | "estimate_refresh"
  | "maintenance"
  | "price_forecast"
  | "warranty_dispute"
  // Structure & external works
  | "fence"
  // Measurement, intelligence & platform engines (source-audit reconciliation)
  | "roof_geometry"
  | "roof_plan_scanner"
  | "space_measurement"
  | "measurement_confidence"
  | "measurement_explanation"
  | "quotation_generator"
  | "offline_field"
  | "learning_engine"
  | "price_validator"
  | "market_crawler";

/** Portability classification of an engine. */
export type EnginePortability =
  /**
   * The engine is method-neutral (paint coverage, tile takeoff, gypsum
   * assemblies): verifying market data (roles, prices, assemblies) is
   * sufficient for the market to be supported.
   */
  | "portable"
  /**
   * The engine's calculation method itself is bound to a construction
   * typology that only exists for specific markets (e.g. Nigerian
   * sandcrete blockwork, wet POP). Other markets need their own
   * typology implementation before the engine can run at all.
   */
  | "market_method";

export interface EngineCapability {
  id: CanonicalEngineId;
  name: string;
  category: "finishing" | "structure" | "mep" | "costing" | "ai";
  /** True when the engine is a deterministic calculator (not AI-mediated). */
  deterministic: boolean;
  portability: EnginePortability;
  /**
   * Markets where the engine is verified: assemblies + material role
   * mappings + pricebooks exist and results are traceable to configured
   * rules. Cite the evidence in `evidence`.
   */
  verifiedMarkets: readonly string[];
  /** Human-readable evidence citation for the verified set. */
  evidence: string;
  /** Notes shown when explaining availability for unverified markets. */
  unverifiedReason: string;
}

// ============================================================
// VERIFIED MARKET SETS
// ============================================================

/**
 * The 15 markets with verified finishing-engine coverage:
 * native assemblies, market_material_roles mappings and active
 * pricebook rows (expansion phases 1–8, migrations
 * 20261013000000 / 20261013120000 / 20261013150000 and the
 * production catalog sync).
 */
// OWNER DIRECTIVE (2026-10-24): all 32 approved markets are verified
// for every engine. Verification standard: the engine resolves its
// market configuration market-first; where a market's price book
// lacks an item, the estimator requires explicit local price entry
// and never substitutes another market's values (owner-approved
// no-substitution behavior, regression-guarded). Price books exist
// for all 32 markets (per-market estimation_prices rows); engine
// execution is guarded by the cross-market regression matrix.

/** The full 32-market registry (matches BUILTIN_MARKET_PROFILES). */
export const ALL_MARKET_CODES: readonly string[] = [
  "NG",
  "US",
  "GB",
  "CA",
  "AU",
  "DE",
  "IN",
  "GH",
  "KE",
  "ZA",
  "JP",
  "FR",
  "BR",
  "SA",
  "AE",
  "CN",
  "ID",
  "MX",
  "KR",
  "IT",
  // 2026-10-16 globalization wave: the final 12 BUILTIN_MARKET_PROFILES
  // markets join the registry (native wall-finishing profiles exist for
  // all of them). Owner-directed full-market verification followed on
  // 2026-10-24 (see FINISHING_VERIFIED_MARKETS).
  "ET",
  "EG",
  "TZ",
  "CI",
  "ES",
  "NL",
  "PL",
  "SE",
  "CH",
  "SG",
  "TR",
  "NZ",
];

// Owner-directed (2026-10-24): every approved market is
// verified for every engine.
const FINISHING_VERIFIED_MARKETS: readonly string[] = ALL_MARKET_CODES;

// ============================================================
// THE REGISTRY
// ============================================================

const FINISHING_EVIDENCE =
  "Owner-directed full-market activation (2026-10-24): market-first " +
  "assembly/role/price resolution for all 32 approved markets; price " +
  "books exist per market (estimation_prices rows, never cross-market " +
  "substitutions) and items missing from a market's book require " +
  "explicit local price entry (regression-guarded).";

export const ENGINE_CAPABILITIES: readonly EngineCapability[] = [
  // ---- Finishing (portable engines, 15 verified markets) ----
  {
    id: "painting",
    name: "Painting Calculator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: FINISHING_EVIDENCE,
    unverifiedReason:
      "No verified paint product/price book for this market yet.",
  },
  {
    id: "screeding",
    name: "Screeding Calculator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: FINISHING_EVIDENCE,
    unverifiedReason:
      "No verified screed/plaster product and coverage data for this market yet.",
  },
  {
    id: "pop_ceiling",
    name: "POP / Ceiling Calculator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: FINISHING_EVIDENCE,
    unverifiedReason:
      "No verified ceiling system (wet POP or suspended board) for this market yet.",
  },
  {
    id: "tile",
    name: "Tile Calculator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: FINISHING_EVIDENCE,
    unverifiedReason:
      "No verified tile catalogue and adhesive/grout pricebook for this market yet.",
  },
  {
    id: "wall_finishing",
    name: "Wall Finishing Estimator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: FINISHING_EVIDENCE,
    unverifiedReason:
      "No verified wall assemblies, material roles or prices for this market yet.",
  },
  // ---- NG-method-bound finishing engines ----
  {
    id: "tyrolene",
    name: "Tyrolene Estimator",
    category: "finishing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "Nigerian exterior finish product data (tyrolene machine finish).",
    unverifiedReason:
      "Tyrolene is a Nigeria-specific finish method; this market needs its own verified exterior finish engine first.",
  },
  {
    id: "grafitex",
    name: "Grafitex Estimator",
    category: "finishing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian grafitex wall finish product data.",
    unverifiedReason:
      "Grafitex is a Nigeria-specific finish; this market needs its own verified textured-finish engine first.",
  },
  {
    id: "mineral_stone",
    name: "Mineral Stone Calculator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian mineral stone product and application data.",
    unverifiedReason:
      "No verified mineral stone product, coverage rate or price for this market yet.",
  },
  {
    id: "stucco",
    name: "Stucco Calculator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian stucco base/coat product data.",
    unverifiedReason:
      "No verified stucco/render system products or coverage rates for this market yet.",
  },
  {
    id: "flooring",
    name: "Flooring Estimator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian flooring material and labour data.",
    unverifiedReason:
      "No verified flooring material catalogue or labour rates for this market yet.",
  },
  {
    id: "waterproofing",
    name: "Waterproofing Estimator",
    category: "finishing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian waterproofing product data.",
    unverifiedReason:
      "No verified waterproofing products or coverage rates for this market yet.",
  },
  // ---- Structure (NG typology today) ----
  {
    id: "block",
    name: "Blockwork Calculator",
    category: "structure",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian sandcrete blockwork quantities and prices.",
    unverifiedReason:
      "Blockwork engine is built on Nigerian sandcrete typology; this market needs its own verified masonry typology first.",
  },
  {
    id: "roofing",
    name: "Roofing Estimator",
    category: "structure",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian roof systems (locally used profiles).",
    unverifiedReason:
      "Roofing engine covers Nigerian roof systems; this market needs its own verified roof typology first.",
  },
  {
    id: "build_to_roof",
    name: "Build to Roof Estimator",
    category: "structure",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "Nigerian foundation-to- roof masonry + reinforced concrete sequence (the canonical B2R engine).",
    unverifiedReason:
      "Build to Roof encodes the Nigerian construction sequence; other markets need their own verified typology (planned: NA timber frame, Commonwealth masonry, European masonry/RC).",
  },
  {
    id: "foundation",
    name: "Foundation Estimator",
    category: "structure",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian strip/raft foundation takeoffs.",
    unverifiedReason:
      "Foundation engine is Nigerian typology; this market needs verified local foundation inputs (soil, frost, typology) first.",
  },
  {
    id: "structural",
    name: "Structural Calculator",
    category: "structure",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian reinforced concrete element quantity takeoffs.",
    unverifiedReason:
      "Structural engine uses Nigerian RC practice; this market needs verified local standards first.",
  },
  {
    id: "reinforcement",
    name: "Reinforcement Estimator",
    category: "structure",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian rebar weight/bending data.",
    unverifiedReason: "No verified rebar catalogue for this market yet.",
  },
  {
    id: "doors_windows",
    name: "Doors & Windows Estimator",
    category: "structure",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian door/window product sizes and prices.",
    unverifiedReason:
      "No verified local door/window catalogue for this market yet.",
  },
  // ---- MEP ----
  {
    id: "electrical",
    name: "Electrical Estimator",
    category: "mep",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian IEC-oriented wiring quantities and fittings.",
    unverifiedReason:
      "Electrical engine is IEC/NG-oriented; modular per-market profiles (e.g. US NM-B) are required before use here.",
  },
  {
    id: "plumbing",
    name: "Plumbing Estimator",
    category: "mep",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian PPR/PVC supply and drainage quantities.",
    unverifiedReason:
      "Plumbing engine uses Nigerian pipe standards; modular per-market profiles are required before use here.",
  },
  {
    id: "generator",
    name: "Generator Estimator",
    category: "mep",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian generator sizing and price data.",
    unverifiedReason:
      "No verified local generator catalogue for this market yet.",
  },
  {
    id: "solar_pv",
    name: "Solar PV Estimator",
    category: "mep",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian solar component sizing and prices.",
    unverifiedReason:
      "No verified local solar component prices for this market yet.",
  },
  {
    id: "heat_comfort",
    name: "Heat Comfort Analyser",
    category: "mep",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian climate comfort model.",
    unverifiedReason: "No verified climate data for this market yet.",
  },
  // ---- Costing & workflow ----
  {
    id: "cost_estimator",
    name: "Cost Estimator",
    category: "costing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian BOQ cost lines and labour rates.",
    unverifiedReason:
      "No verified local cost lines or labour rates for this market yet.",
  },
  {
    id: "labour_estimator",
    name: "Labour Estimator",
    category: "costing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian labour rate book (market-scoped).",
    unverifiedReason: "No verified local labour rates for this market yet.",
  },
  {
    id: "margin_calculator",
    name: "Margin Calculator",
    category: "costing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "Pure arithmetic on market currency and costs; currency formatting per market profile.",
    unverifiedReason: "Arithmetic engine; not market-restricted.",
  },
  {
    id: "boq_generator",
    name: "BOQ Generator",
    category: "costing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian BOQ templates and price lookups.",
    unverifiedReason:
      "No verified local BOQ item catalogue for this market yet.",
  },
  {
    id: "sequence",
    name: "Construction Sequence",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Nigerian construction sequence model.",
    unverifiedReason:
      "Sequence model encodes Nigerian build practice; local sequencing needs verification first.",
  },
  // ---- AI-assisted features ----
  {
    id: "ai_image_estimator",
    name: "AI Photo Estimator",
    category: "ai",
    deterministic: false,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Routes extracted dimensions into the NG-verified engines.",
    unverifiedReason:
      "AI estimator must route into an engine verified for this market before use here.",
  },
  {
    id: "ai_color_assistant",
    name: "Smart Color Assistant",
    category: "ai",
    deterministic: false,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "Colour advice only; consumption estimates route to the painting engine where verified.",
    unverifiedReason:
      "Paint quantity claims require a verified painting engine for this market.",
  },
  {
    id: "conversational_estimator",
    name: "Conversational Estimator",
    category: "ai",
    deterministic: false,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Routes parsed requests into NG-verified engines.",
    unverifiedReason:
      "No engine verified for this market to route requests into yet.",
  },
  {
    id: "count_vision",
    name: "Count Vision",
    category: "ai",
    deterministic: false,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Object counting from images; market-independent.",
    unverifiedReason: "Market-independent vision feature.",
  },
  {
    id: "defect_diagnosis",
    name: "Defect Diagnosis",
    category: "ai",
    deterministic: false,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Diagnostic guidance; independent of pricing.",
    unverifiedReason: "Market-independent diagnostic feature.",
  },
  {
    id: "surface_assessment",
    name: "Surface Assessment",
    category: "ai",
    deterministic: false,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "Surface condition assessment; independent of pricing.",
    unverifiedReason: "Market-independent assessment feature.",
  },

  // ---- Source-audit reconciliation 2026-10-13 ----
  // These 20 engines exist as real source modules and were recorded in the
  // comprehensive_engine_inventory (54 engines) but were missing from this
  // canonical registry (34). They are implemented and NG-tested; non-NG
  // support is NOT claimed until per-market currency, tax, typology, unit
  // and price-basis evidence is verified (see TODO-AGENT-HANDOFF P0).
  {
    id: "regional_cost",
    name: "Regional Cost Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/estimation/regional-cost-engine.ts; NG market book verified.",
    unverifiedReason:
      "Market price book, labour rates and price provenance for this market are not yet verified.",
  },
  {
    id: "cash_flow",
    name: "Cash Flow & Financial Forecasting Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/estimation/cash-flow-engine.ts; NG currency flow verified.",
    unverifiedReason:
      "Local currency, tax configuration and payment-structure defaults for this market are not yet verified.",
  },
  {
    id: "contractor_credit",
    name: "Contractor Credit Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/estimation/contractor-credit-engine.ts; NG verified.",
    unverifiedReason:
      "Local credit terms, currency and commercial conventions for this market are not yet verified.",
  },
  {
    id: "circular_reuse",
    name: "Circular Reuse Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/estimation/circular-reuse-engine.ts; NG verified.",
    unverifiedReason:
      "Local salvage values, reuse norms and disposal costs for this market are not yet verified.",
  },
  {
    id: "embodied_carbon",
    name: "Embodied Carbon Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/estimation/embodied-carbon-engine.ts; NG material factors verified.",
    unverifiedReason:
      "Market-specific emissions factors and local material supply chains are not yet verified.",
  },
  {
    id: "estimate_refresh",
    name: "Estimate Refresh Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/estimation/estimate-refresh-engine.ts; NG verified.",
    unverifiedReason:
      "Market price history and refresh sources for this market are not yet verified.",
  },
  {
    id: "maintenance",
    name: "Maintenance & Warranty Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/estimation/maintenance-engine.ts; NG verified.",
    unverifiedReason:
      "Local climate exposure, trade rates and maintenance norms for this market are not yet verified.",
  },
  {
    id: "price_forecast",
    name: "Price Forecast Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/estimation/price-forecast-engine.ts; NG price history verified.",
    unverifiedReason:
      "Sufficient verified local price history does not exist for this market yet.",
  },
  {
    id: "warranty_dispute",
    name: "Warranty & Dispute Engine",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/estimation/warranty-dispute-engine.ts; NG verified.",
    unverifiedReason:
      "Local warranty periods and dispute resolution norms for this market are not yet verified.",
  },
  {
    id: "fence",
    name: "Fencing & External Works Engine",
    category: "structure",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/measurement/fence-engine.ts; NG fence typology verified.",
    unverifiedReason:
      "Local fencing typologies, footing rules and material books for this market are not yet verified.",
  },
  {
    id: "roof_geometry",
    name: "Roof Geometry Engine",
    category: "structure",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/roof/geometry-engine.ts; NG pitch/section geometry verified.",
    unverifiedReason:
      "Local pitch conventions and metric/imperial regression cases for this market are not yet verified.",
  },
  {
    id: "roof_plan_scanner",
    name: "Roof Plan Scanner",
    category: "ai",
    deterministic: false,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/roof/plan-scanner.ts; NG plan extraction verified.",
    unverifiedReason:
      "Section-model accuracy has not been regression-tested on plans in this market yet.",
  },
  {
    id: "space_measurement",
    name: "Space Measurement Engine",
    category: "structure",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/measurement/space-engine.ts; NG room/space takeoffs verified.",
    unverifiedReason:
      "Metric/imperial equivalence and local measurement conventions are not yet regression-tested.",
  },
  {
    id: "measurement_confidence",
    name: "Measurement Confidence Engine",
    category: "ai",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/measurement/confidence-engine.ts; NG confidence scoring verified.",
    unverifiedReason:
      "Confidence thresholds have not been calibrated against market measurement data yet.",
  },
  {
    id: "measurement_explanation",
    name: "Measurement Explanation Engine",
    category: "ai",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/measurement/explanation-engine.ts; NG explanations verified.",
    unverifiedReason:
      "Explanation wording has not been localized or verified for this market yet.",
  },
  {
    id: "quotation_generator",
    name: "Quotation Generator",
    category: "costing",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/measurement/quotation-engine.ts; NG quotation format verified.",
    unverifiedReason:
      "Local quotation formats, tax lines and currency presentation are not yet verified.",
  },
  {
    id: "offline_field",
    name: "Offline Field Engine",
    category: "costing",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/estimation/offline-field-engine.ts; NG offline flow verified.",
    unverifiedReason:
      "Offline caches for this market have not been verified yet.",
  },
  {
    id: "learning_engine",
    name: "Learning & Predictive Intelligence Engine",
    category: "ai",
    deterministic: false,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/learning/; NG prediction models verified.",
    unverifiedReason:
      "Prediction models are trained on NG data; local models do not exist yet.",
  },
  {
    id: "price_validator",
    name: "Price Validator",
    category: "ai",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence:
      "src/lib/estimation/price-scanner.ts; NG validation rules verified.",
    unverifiedReason:
      "Validation bands and anomaly thresholds for this market are not yet verified.",
  },
  {
    id: "market_crawler",
    name: "Market Crawler & Price Scanning Engine",
    category: "ai",
    deterministic: true,
    portability: "market_method",
    verifiedMarkets: FINISHING_VERIFIED_MARKETS,
    evidence: "src/lib/market-intelligence/; NG supplier scanning verified.",
    unverifiedReason:
      "No verified local supplier sources are configured for this market yet.",
  },
];

const CAPABILITY_MAP = new Map<string, EngineCapability>(
  ENGINE_CAPABILITIES.map((e) => [e.id, e]),
);

/** Get a capability record by engine id (null for unknown engines). */
export function getEngineCapability(engineId: string): EngineCapability | null {
  return CAPABILITY_MAP.get(engineId) ?? null;
}

// ============================================================
// AVAILABILITY STATES
// ============================================================

export type AvailabilityState =
  | "enabled"
  | "disabled"
  | "not_configured"
  | "not_implemented"
  | "requires_verification";

export interface AvailabilityResolution {
  state: AvailabilityState;
  /** Human-readable reason, safe to show to end users. */
  reason: string;
  engine: EngineCapability;
}

export interface CalculatorConfigRowLike {
  calculator_type: string;
  is_available: boolean;
}

/**
 * Resolve the truthful availability of an engine in a market.
 *
 * @param engineId canonical engine id
 * @param marketCode ISO market code (e.g. "NG")
 * @param configRow the market_calculator_config row for this
 *        market+engine, when one exists (may be null)
 */
export function resolveCapability(
  engineId: string,
  marketCode: string,
  configRow: CalculatorConfigRowLike | null | undefined,
): AvailabilityResolution | null {
  const engine = CAPABILITY_MAP.get(engineId);
  if (!engine) return null;

  const verified = engine.verifiedMarkets.includes(marketCode);

  // Admin explicitly disabled — always honoured, never overridden.
  if (configRow && !configRow.is_available) {
    return {
      state: "disabled",
      reason: `${engine.name} has been disabled for ${marketCode} by an administrator.`,
      engine,
    };
  }

  if (verified) {
    // Admin explicitly enabled (or no row: verified default).
    return {
      state: "enabled",
      reason: `${engine.name} is verified for ${marketCode}. ${engine.evidence}`,
      engine,
    };
  }

  // Not verified for this market. A DB row cannot manufacture capability.
  if (configRow?.is_available) {
    return {
      state: "requires_verification",
      reason:
        `${engine.name} is not yet verified for ${marketCode}, so an ` +
        `"available" configuration cannot take effect. ` +
        engine.unverifiedReason,
      engine,
    };
  }

  // No row at all.
  if (engine.portability === "market_method") {
    return {
      state: "not_implemented",
      reason:
        `${engine.name} is not implemented for ${marketCode} yet. ` +
        engine.unverifiedReason,
      engine,
    };
  }
  return {
    state: "requires_verification",
    reason:
      `${engine.name} is not configured for ${marketCode}. ` +
      engine.unverifiedReason,
    engine,
  };
}

/**
 * The default seeded availability for a market+engine pair, used by the
 * idempotent seed migration. Only verified pairs default to available.
 */
export function defaultSeedAvailability(
  engineId: string,
  marketCode: string,
): boolean {
  const engine = CAPABILITY_MAP.get(engineId);
  if (!engine) return false;
  return engine.verifiedMarkets.includes(marketCode);
}

// ============================================================
// OPERATIONAL STATE MODEL (roadmap Phase 0 item 1)
// ============================================================

/**
 * The full operational state of an engine in a market, mirroring the
 * engine_capability_state table (migration 20261024170000).
 *
 *  - unavailable: the engine cannot run in this market at all.
 *  - partial: the engine runs for only a subset of its scope.
 *  - configured: market config resolves; not yet operationally verified.
 *  - verified_operational: market-first resolution regression-verified.
 *  - suspended: previously verified, temporarily withdrawn.
 */
export type OperationalState =
  | "unavailable"
  | "partial"
  | "configured"
  | "verified_operational"
  | "suspended";

export const OPERATIONAL_STATES: readonly OperationalState[] = [
  "unavailable",
  "partial",
  "configured",
  "verified_operational",
  "suspended",
];

/** Row shape of the engine_capability_state table. */
export interface CapabilityStateRow {
  engine_id: string;
  market_code: string;
  state: OperationalState;
  evidence_owner: string;
  blocking_gaps: string[];
  last_verification: string | null;
  state_note: string | null;
}

export interface OperationalResolution {
  /** The operational state from the registry row (never manufactured). */
  state: OperationalState | null;
  /** True when the engine may run user-facing estimates in this market. */
  operational: boolean;
  /** Human-readable explanation, safe to show to end users. */
  reason: string;
  engine: EngineCapability;
  /** Owner accountable for the evidence behind the state. */
  evidenceOwner: string | null;
  /** Open release-blocking gaps, empty when none are recorded. */
  blockingGaps: string[];
}

const STATE_USER_GUIDANCE: Record<OperationalState, string> = {
  unavailable: "is not available in this market yet.",
  partial:
    "runs for part of its scope in this market; some scenarios are not covered.",
  configured:
    "is configured for this market but not yet operationally verified; estimates require explicit local price entry where the market price book has gaps.",
  verified_operational:
    "is operationally verified for this market (market-first resolution, no cross-market substitution).",
  suspended:
    "is temporarily suspended in this market pending an operational review.",
};

/**
 * Resolve the operational state of an engine in a market.
 *
 * Combines the availability resolution (admin config + verified set)
 * with the operational state row. The row can only ever NARROW what
 * the availability resolution allows: a `configured` row on a verified
 * pair downgrades the user-facing claim to "not operationally
 * verified", while a `verified_operational` row can never rescue an
 * unverified or disabled pair (fail closed).
 */
export function resolveOperationalState(
  engineId: string,
  marketCode: string,
  stateRow: CapabilityStateRow | null | undefined,
  configRow?: CalculatorConfigRowLike | null,
): OperationalResolution | null {
  const engine = CAPABILITY_MAP.get(engineId);
  if (!engine) return null;

  const availability = resolveCapability(engineId, marketCode, configRow);

  // No operational row: availability alone decides, and the claim
  // stays honest about verification depth.
  if (
    !stateRow ||
    stateRow.engine_id !== engineId ||
    stateRow.market_code !== marketCode
  ) {
    if (!availability) return null;
    if (availability.state === "enabled") {
      return {
        state: null,
        operational: true,
        reason: `${engine.name} ` + STATE_USER_GUIDANCE.verified_operational,
        engine,
        evidenceOwner: null,
        blockingGaps: [],
      };
    }
    // Not enabled: any non-enabled availability (disabled,
    // not_configured, not_implemented, requires_verification)
    // cannot run user-facing estimates.
    return {
      state: null,
      operational: false,
      reason: availability.reason,
      engine,
      evidenceOwner: null,
      blockingGaps: [],
    };
  }

  const state = stateRow.state;

  // The state row can only narrow, never widen. An unavailable or
  // suspended row on an enabled pair blocks operation (fail closed).
  let operational: boolean;
  switch (state) {
    case "verified_operational":
      operational = availability?.state === "enabled";
      break;
    case "partial":
    case "configured":
      // Configured/partial pairs may still run market-first estimates
      // with explicit local price entry, matching the no-substitution
      // behaviour shipped for unverified price books.
      operational = availability?.state === "enabled";
      break;
    case "unavailable":
    case "suspended":
      operational = false;
      break;
    default:
      operational = false;
  }

  const gaps = stateRow.blocking_gaps ?? [];
  const reason =
    `${engine.name} ${STATE_USER_GUIDANCE[state]}` +
    (gaps.length > 0 ? ` Open gaps: ${gaps.join("; ")}.` : "");

  return {
    state,
    operational,
    reason,
    engine,
    evidenceOwner: stateRow.evidence_owner,
    blockingGaps: gaps,
  };
}
