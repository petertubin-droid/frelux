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
  | "surface_assessment";

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
const FINISHING_VERIFIED_MARKETS: readonly string[] = [
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
];

/** The full 20-market registry (matches BUILTIN_MARKET_PROFILES). */
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
];

// ============================================================
// THE REGISTRY
// ============================================================

const FINISHING_EVIDENCE =
  "Expansion phases 1–8: native wall/ceiling assemblies, " +
  "market_material_roles mappings and active pricebook rows for all 15 " +
  "markets (verified per-market product specs and prices, never cross-" +
  "market substitutions).";

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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
    evidence: "Nigerian rebar weight/bending data.",
    unverifiedReason: "No verified rebar catalogue for this market yet.",
  },
  {
    id: "doors_windows",
    name: "Doors & Windows Estimator",
    category: "structure",
    deterministic: true,
    portability: "portable",
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
    verifiedMarkets: ["NG"],
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
