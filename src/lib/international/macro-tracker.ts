/**
 * System A: The Fluctuation Filter (Macro Tracker) Engine
 *
 * Automatically tracks regional commodity trackers and central bank inflation indices.
 * When wholesale commodities or inflation spike beyond activation thresholds,
 * applies rule-based elasticity adjustments to baseline construction estimates.
 */

import { supabase } from "@/lib/supabase";
import type {
  MacroIndicator,
  MacroElasticityRule,
  MacroAdjustmentResult,
  CommodityCategory,
} from "@/types/hybrid-pricing";

export const DEFAULT_MACRO_INDICATORS: Record<string, MacroIndicator[]> = {
  KE: [
    {
      id: "ke-steel-knbs",
      market_code: "KE",
      country_name: "Kenya",
      currency: "KES",
      indicator_type: "steel",
      headline_name: "KNBS Wholesale Reinforcement Steel Bar Index",
      current_index_value: 128.4,
      baseline_index_value: 121.1,
      pct_change_30d: 6.03, // +6% spike
      pct_change_90d: 7.8,
      pct_change_yoy: 14.2,
      source_name: "Kenya National Bureau of Statistics (KNBS)",
      source_url: "https://www.knbs.or.ke",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
    {
      id: "ke-cement-cbk",
      market_code: "KE",
      country_name: "Kenya",
      currency: "KES",
      indicator_type: "cement",
      headline_name: "CBK Building Materials (Cement Index)",
      current_index_value: 114.2,
      baseline_index_value: 110.0,
      pct_change_30d: 3.82,
      pct_change_90d: 4.1,
      pct_change_yoy: 8.5,
      source_name: "Central Bank of Kenya (CBK)",
      source_url: "https://www.centralbank.go.ke",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
    {
      id: "ke-inflation-cpi",
      market_code: "KE",
      country_name: "Kenya",
      currency: "KES",
      indicator_type: "general_inflation",
      headline_name: "Kenya Headline CPI Inflation Rate",
      current_index_value: 135.2,
      baseline_index_value: 132.8,
      pct_change_30d: 1.81,
      pct_change_90d: 3.2,
      pct_change_yoy: 6.9,
      source_name: "KNBS CPI Bulletin",
      source_url: "https://www.knbs.or.ke",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
  ],
  NG: [
    {
      id: "ng-steel-cbn",
      market_code: "NG",
      country_name: "Nigeria",
      currency: "NGN",
      indicator_type: "steel",
      headline_name: "NBS / CBN Imported Rebar & Structural Steel Benchmark",
      current_index_value: 242.0,
      baseline_index_value: 220.0,
      pct_change_30d: 10.0,
      pct_change_90d: 18.5,
      pct_change_yoy: 38.0,
      source_name: "National Bureau of Statistics (NBS) Nigeria",
      source_url: "https://nigerianstat.gov.ng",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
    {
      id: "ng-cement-cbn",
      market_code: "NG",
      country_name: "Nigeria",
      currency: "NGN",
      indicator_type: "cement",
      headline_name: "NBS Domestic Portland Cement Producer Index",
      current_index_value: 195.0,
      baseline_index_value: 185.0,
      pct_change_30d: 5.41,
      pct_change_90d: 11.2,
      pct_change_yoy: 29.4,
      source_name: "NBS Construction Price Watch",
      source_url: "https://nigerianstat.gov.ng",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
  ],
  GH: [
    {
      id: "gh-steel-bog",
      market_code: "GH",
      country_name: "Ghana",
      currency: "GHS",
      indicator_type: "steel",
      headline_name: "Bank of Ghana Construction Inputs (Steel & Rods)",
      current_index_value: 145.0,
      baseline_index_value: 139.0,
      pct_change_30d: 4.32,
      pct_change_90d: 6.8,
      pct_change_yoy: 15.0,
      source_name: "Bank of Ghana (BOG)",
      source_url: "https://www.bog.gov.gh",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
  ],
  ZA: [
    {
      id: "za-steel-sarb",
      market_code: "ZA",
      country_name: "South Africa",
      currency: "ZAR",
      indicator_type: "steel",
      headline_name: "Stats SA PPI for Civil Engineering & Rebar",
      current_index_value: 122.5,
      baseline_index_value: 120.0,
      pct_change_30d: 2.08,
      pct_change_90d: 3.5,
      pct_change_yoy: 6.2,
      source_name: "Statistics South Africa (Stats SA)",
      source_url: "https://www.statssa.gov.za",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
  ],
  US: [
    {
      id: "us-steel-bls",
      market_code: "US",
      country_name: "United States",
      currency: "USD",
      indicator_type: "steel",
      headline_name: "US Bureau of Labor Statistics PPI Steel Mill Products",
      current_index_value: 185.0,
      baseline_index_value: 180.0,
      pct_change_30d: 2.78,
      pct_change_90d: 4.1,
      pct_change_yoy: 5.5,
      source_name: "US BLS",
      source_url: "https://www.bls.gov",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
  ],
  GB: [
    {
      id: "gb-steel-ons",
      market_code: "GB",
      country_name: "United Kingdom",
      currency: "GBP",
      indicator_type: "steel",
      headline_name:
        "UK ONS Construction Material Price Index: Fabricated Steel",
      current_index_value: 168.0,
      baseline_index_value: 164.0,
      pct_change_30d: 2.44,
      pct_change_90d: 3.9,
      pct_change_yoy: 5.1,
      source_name: "UK Office for National Statistics (ONS)",
      source_url: "https://www.ons.gov.uk",
      published_at: "2026-10-01T00:00:00Z",
      last_synced_at: "2026-10-14T12:00:00Z",
    },
  ],
};

export const DEFAULT_ELASTICITY_RULES: MacroElasticityRule[] = [
  {
    id: "rule-steel-direct",
    market_code: "*",
    material_category: "steel",
    commodity_trigger: "steel",
    elasticity_multiplier: 1.0, // 100% passthrough for steel reinforcement
    activation_threshold_pct: 3.0,
    ceiling_adjustment_pct: 30.0,
    is_active: true,
    notes:
      "Direct commodity passthrough for reinforcement steel & structural rebar",
  },
  {
    id: "rule-concrete-cement",
    market_code: "*",
    material_category: "concrete",
    commodity_trigger: "cement",
    elasticity_multiplier: 0.65, // Cement makes up ~65% of ready-mix concrete cost
    activation_threshold_pct: 3.0,
    ceiling_adjustment_pct: 25.0,
    is_active: true,
    notes:
      "65% weight of cement cost variation into finished concrete estimate",
  },
  {
    id: "rule-masonry-cement",
    market_code: "*",
    material_category: "masonry",
    commodity_trigger: "cement",
    elasticity_multiplier: 0.45,
    activation_threshold_pct: 3.0,
    ceiling_adjustment_pct: 20.0,
    is_active: true,
    notes: "Blockwork and mortar elasticity linked to cement bags",
  },
  {
    id: "rule-paint-general",
    market_code: "*",
    material_category: "paint",
    commodity_trigger: "general_inflation",
    elasticity_multiplier: 0.85,
    activation_threshold_pct: 2.0,
    ceiling_adjustment_pct: 15.0,
    is_active: true,
    notes:
      "Finished paint product correlation with general transport & raw resin inflation",
  },
  {
    id: "rule-roofing-steel",
    market_code: "*",
    material_category: "roofing",
    commodity_trigger: "steel",
    elasticity_multiplier: 0.75,
    activation_threshold_pct: 3.5,
    ceiling_adjustment_pct: 25.0,
    is_active: true,
    notes:
      "Corrugated and box profile iron sheets tied to global steel coil prices",
  },
];

/**
 * Match the best elasticity rule for a given market and material category.
 */
export function matchMacroRule(
  marketCode: string,
  materialCategory: string,
  rules: MacroElasticityRule[] = DEFAULT_ELASTICITY_RULES,
): MacroElasticityRule | null {
  const normCat = materialCategory.toLowerCase().trim();
  const normMkt = marketCode.toUpperCase().trim();

  // 1. Exact market + exact category
  const exact = rules.find(
    (r) =>
      r.is_active &&
      r.market_code.toUpperCase() === normMkt &&
      r.material_category.toLowerCase() === normCat,
  );
  if (exact) return exact;

  // 2. Wildcard market + exact category
  const wildcard = rules.find(
    (r) =>
      r.is_active &&
      (r.market_code === "*" || r.market_code.toUpperCase() === normMkt) &&
      r.material_category.toLowerCase() === normCat,
  );
  if (wildcard) return wildcard;

  // 3. Fallback partial category match (e.g. "rebar" or "reinforcement" -> "steel")
  const partial = rules.find((r) => {
    if (!r.is_active) return false;
    const ruleCat = r.material_category.toLowerCase();
    return normCat.includes(ruleCat) || ruleCat.includes(normCat);
  });

  return partial || null;
}

/**
 * Calculate the macro-adjusted price based on active indicators and elasticity rules.
 */
export function calculateMacroAdjustment(params: {
  marketCode: string;
  materialCategory: string;
  basePrice: number;
  indicators?: MacroIndicator[];
  rules?: MacroElasticityRule[];
}): MacroAdjustmentResult {
  const {
    marketCode,
    materialCategory,
    basePrice,
    indicators = DEFAULT_MACRO_INDICATORS[marketCode.toUpperCase()] || [],
    rules = DEFAULT_ELASTICITY_RULES,
  } = params;

  const rule = matchMacroRule(marketCode, materialCategory, rules);
  const nowIso = new Date().toISOString();

  if (!rule) {
    return {
      marketCode,
      materialCategory,
      originalPrice: basePrice,
      adjustedPrice: basePrice,
      adjustmentPct: 0,
      triggerIndicator: null,
      ruleApplied: null,
      appliedAt: nowIso,
      rationale: "No active macro elasticity rule found for this category.",
    };
  }

  // Find the indicator triggering this rule
  const indicator = indicators.find(
    (ind) =>
      ind.market_code.toUpperCase() === marketCode.toUpperCase() &&
      ind.indicator_type === rule.commodity_trigger,
  );

  if (!indicator) {
    return {
      marketCode,
      materialCategory,
      originalPrice: basePrice,
      adjustedPrice: basePrice,
      adjustmentPct: 0,
      triggerIndicator: null,
      ruleApplied: rule,
      appliedAt: nowIso,
      rationale: `Rule matched (${rule.commodity_trigger}) but no live indicator available for market ${marketCode}.`,
    };
  }

  const changePct = indicator.pct_change_30d;

  // Check if threshold is breached
  if (Math.abs(changePct) < rule.activation_threshold_pct) {
    return {
      marketCode,
      materialCategory,
      originalPrice: basePrice,
      adjustedPrice: basePrice,
      adjustmentPct: 0,
      triggerIndicator: indicator,
      ruleApplied: rule,
      appliedAt: nowIso,
      rationale: `Indicator change (${changePct.toFixed(2)}%) within safe fluctuation band (threshold: ${rule.activation_threshold_pct}%).`,
    };
  }

  // Calculate elasticity adjustment
  let rawAdjPct = changePct * rule.elasticity_multiplier;

  // Apply ceiling cap
  if (Math.abs(rawAdjPct) > rule.ceiling_adjustment_pct) {
    rawAdjPct = Math.sign(rawAdjPct) * rule.ceiling_adjustment_pct;
  }

  const adjustedPrice = Math.round(basePrice * (1 + rawAdjPct / 100));

  return {
    marketCode,
    materialCategory,
    originalPrice: basePrice,
    adjustedPrice,
    adjustmentPct: Number(rawAdjPct.toFixed(2)),
    triggerIndicator: indicator,
    ruleApplied: rule,
    appliedAt: nowIso,
    rationale: `Fluctuation Filter applied: ${indicator.headline_name} shifted ${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}% in 30d. Rule '${rule.material_category}' elasticity ${rule.elasticity_multiplier}x adjusted price by ${rawAdjPct > 0 ? "+" : ""}${rawAdjPct.toFixed(2)}%.`,
  };
}

/**
 * Fetch live macro indicators from Supabase with graceful fallback to default verified records.
 */
export async function fetchMarketMacroIndicators(
  marketCode: string,
): Promise<MacroIndicator[]> {
  try {
    const { data, error } = await supabase
      .from("macro_economic_indicators")
      .select("*")
      .eq("market_code", marketCode.toUpperCase());

    if (error || !data || data.length === 0) {
      return DEFAULT_MACRO_INDICATORS[marketCode.toUpperCase()] || [];
    }
    return data as MacroIndicator[];
  } catch {
    return DEFAULT_MACRO_INDICATORS[marketCode.toUpperCase()] || [];
  }
}

/**
 * Fetch live elasticity rules from Supabase.
 */
export async function fetchMarketElasticityRules(
  marketCode: string,
): Promise<MacroElasticityRule[]> {
  try {
    const { data, error } = await supabase
      .from("macro_elasticity_rules")
      .select("*")
      .or(`market_code.eq.${marketCode.toUpperCase()},market_code.eq.*`)
      .eq("is_active", true);

    if (error || !data || data.length === 0) {
      return DEFAULT_ELASTICITY_RULES;
    }
    return data as MacroElasticityRule[];
  } catch {
    return DEFAULT_ELASTICITY_RULES;
  }
}

/**
 * Apply the Fluctuation Filter directly to a raw estimate.
 */
export async function applyFluctuationFilter(params: {
  marketCode: string;
  materialCategory: string;
  basePrice: number;
}): Promise<MacroAdjustmentResult> {
  const indicators = await fetchMarketMacroIndicators(params.marketCode);
  const rules = await fetchMarketElasticityRules(params.marketCode);

  return calculateMacroAdjustment({
    marketCode: params.marketCode,
    materialCategory: params.materialCategory,
    basePrice: params.basePrice,
    indicators,
    rules,
  });
}

/**
 * Simulate macro impact for the Admin Fluctuation Filter Sandbox.
 */
export function simulateMacroImpact(params: {
  marketCode: string;
  commodity: CommodityCategory;
  simulatedSpikePct: number;
  sampleItems: { category: string; basePrice: number; name: string }[];
}): {
  name: string;
  category: string;
  basePrice: number;
  adjustedPrice: number;
  delta: number;
  pct: number;
}[] {
  const mockIndicator: MacroIndicator = {
    id: `sim-${params.commodity}`,
    market_code: params.marketCode,
    country_name: "Simulated Market",
    currency: "USD",
    indicator_type: params.commodity,
    headline_name: `Simulated ${params.commodity} Index`,
    current_index_value: 100 * (1 + params.simulatedSpikePct / 100),
    baseline_index_value: 100,
    pct_change_30d: params.simulatedSpikePct,
    pct_change_90d: params.simulatedSpikePct,
    pct_change_yoy: params.simulatedSpikePct,
    source_name: "Simulation Sandbox",
    published_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  };

  return params.sampleItems.map((item) => {
    const adj = calculateMacroAdjustment({
      marketCode: params.marketCode,
      materialCategory: item.category,
      basePrice: item.basePrice,
      indicators: [mockIndicator],
      rules: DEFAULT_ELASTICITY_RULES,
    });
    return {
      name: item.name,
      category: item.category,
      basePrice: item.basePrice,
      adjustedPrice: adj.adjustedPrice,
      delta: adj.adjustedPrice - item.basePrice,
      pct: adj.adjustmentPct,
    };
  });
}
