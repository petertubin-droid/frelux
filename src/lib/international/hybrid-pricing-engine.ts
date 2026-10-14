/**
 * Hybrid Pricing Resolution Engine
 *
 * Unifies System A, B, and C into an automated 4-layer pricing resolution cascade:
 *
 *   Layer 1 (Highest Fidelity): Live Verified Supplier Inventory
 *   Layer 2: Quorum-Verified Crowdsourced Contractor Expense Aggregates
 *   Layer 3: Rule-Based Macro Fluctuation Filter (Commodity & Central Bank Spikes)
 *   Layer 4: Default Static Baseline / Seeded Pricebook
 *
 * Always returns rich provenance metadata and UI confidence ratings.
 */

import {
  fetchVerifiedSupplierOffers,
  selectBestSupplierQuote,
} from "./supplier-inventory-engine";
import { fetchCrowdsourcedBenchmark } from "./crowdsourcing-engine";
import { applyFluctuationFilter } from "./macro-tracker";
import type {
  HybridPriceResolution,
  SupplierInventoryItem,
  CrowdsourcedMarketBenchmark,
  MacroAdjustmentResult,
} from "@/types/hybrid-pricing";

export interface ResolveHybridPriceParams {
  marketCode: string;
  materialCategory: string;
  materialSlug: string;
  basePrice?: number;
  currency?: string;
  unit?: string;
  city?: string;
  quantity?: number;
}

/**
 * Resolve price using the hybrid pricing cascade.
 */
export async function resolveHybridPrice(
  params: ResolveHybridPriceParams,
): Promise<HybridPriceResolution> {
  const {
    marketCode,
    materialCategory,
    materialSlug,
    basePrice = 1000,
    currency = "USD",
    unit = "unit",
    city,
    quantity = 1,
  } = params;

  const resolvedAt = new Date().toISOString();

  // ============================================================
  // LAYER 1: LIVE VERIFIED SUPPLIER INVENTORY
  // ============================================================
  const supplierOffers = await fetchVerifiedSupplierOffers({
    marketCode,
    materialSlug,
    materialCategory,
    city,
    minQty: quantity,
  });

  const bestSupplierItem = selectBestSupplierQuote(supplierOffers, quantity);

  if (bestSupplierItem) {
    const resolvedPrice = bestSupplierItem.unit_price;
    return {
      price: resolvedPrice,
      resolvedPrice,
      layer: "supplier",
      confidence: "verified_live",
      currency: bestSupplierItem.currency,
      unit: bestSupplierItem.unit,
      isVerified: true,
      marketCode,
      materialSlug,
      materialCategory,
      provenance: {
        sourceName:
          bestSupplierItem.supplier?.company_name || "Verified Local Merchant",
        sourceType: "Live Verified Supplier Inventory",
        supplierName: bestSupplierItem.supplier?.company_name,
        timestamp: bestSupplierItem.last_updated_at || resolvedAt,
        description: `Live merchant price from ${bestSupplierItem.supplier?.company_name || "Verified Supplier"} for ${bestSupplierItem.product_name || materialSlug}.`,
        supplierItem: bestSupplierItem,
        supplierCount: supplierOffers.length,
      },
      alternatives: {
        supplierPrice: resolvedPrice,
        basePrice,
      },
      resolvedAt,
    };
  }

  // ============================================================
  // LAYER 2: QUORUM-VERIFIED CROWDSOURCED BENCHMARK
  // ============================================================
  const benchmark = await fetchCrowdsourcedBenchmark({
    marketCode,
    materialSlug,
    city,
  });

  if (
    benchmark &&
    benchmark.is_promoted &&
    benchmark.sample_size >= benchmark.quorum_threshold
  ) {
    const resolvedPrice = benchmark.trimmed_mean_price;
    return {
      price: resolvedPrice,
      resolvedPrice,
      layer: "crowdsource",
      confidence: "high",
      currency: benchmark.currency,
      unit: benchmark.unit,
      isVerified: true,
      marketCode,
      materialSlug,
      materialCategory,
      provenance: {
        sourceName: "Contractor Expense Tracker Quorum",
        sourceType: "Closed-Loop Crowdsourcing Engine",
        sampleSize: benchmark.sample_size,
        timestamp: benchmark.last_promoted_at || resolvedAt,
        description: `Self-healing aggregate: ${benchmark.sample_size} local contractors in ${benchmark.city || marketCode} logged actual receipts. Trimmed mean: ${benchmark.trimmed_mean_price} ${benchmark.currency}.`,
        crowdsourceBenchmark: benchmark,
      },
      alternatives: {
        crowdsourcedPrice: resolvedPrice,
        basePrice,
      },
      resolvedAt,
    };
  }

  // ============================================================
  // LAYER 3: MACRO FLUCTUATION FILTER
  // ============================================================
  const macroResult: MacroAdjustmentResult = await applyFluctuationFilter({
    marketCode,
    materialCategory,
    basePrice,
  });

  if (macroResult.adjustmentPct !== 0) {
    const resolvedPrice = macroResult.adjustedPrice;
    return {
      price: resolvedPrice,
      resolvedPrice,
      layer: "macro_adjusted",
      confidence: "medium",
      currency,
      unit,
      isVerified: true,
      marketCode,
      materialSlug,
      materialCategory,
      provenance: {
        sourceName:
          macroResult.triggerIndicator?.headline_name || "Macro Economic Index",
        sourceType: "The Fluctuation Filter",
        macroAdjustmentPct: macroResult.adjustmentPct,
        timestamp: macroResult.appliedAt,
        description: macroResult.rationale,
        macroAdjustment: macroResult,
      },
      alternatives: {
        macroAdjustedPrice: resolvedPrice,
        basePrice,
      },
      resolvedAt,
    };
  }

  // ============================================================
  // LAYER 4: DEFAULT BASELINE PRICEBOOK
  // ============================================================
  return {
    price: basePrice,
    resolvedPrice: basePrice,
    layer: "baseline",
    confidence: "estimated",
    currency,
    unit,
    isVerified: false,
    marketCode,
    materialSlug,
    materialCategory,
    provenance: {
      sourceName: "Frelux Baseline Pricebook",
      sourceType: "Baseline Reference",
      timestamp: resolvedAt,
      description: `Default baseline estimate for ${marketCode}. No active supplier inventory, crowdsourced quorum, or macro trigger detected.`,
      rationale: "Default reference estimate",
    },
    alternatives: {
      basePrice,
    },
    resolvedAt,
  };
}

/**
 * Format badge presentation details for the resolved hybrid price.
 */
export function getHybridPriceBadgeInfo(resolution: HybridPriceResolution): {
  label: string;
  badgeClass: string;
  sourceText: string;
  confidencePct: number;
} {
  const confidencePct =
    typeof resolution.confidence === "number"
      ? Math.round(resolution.confidence * 100)
      : resolution.confidence === "verified_live"
        ? 98
        : resolution.confidence === "high"
          ? 90
          : resolution.confidence === "medium"
            ? 75
            : 60;

  switch (resolution.layer) {
    case "supplier":
    case "supplier_live":
      return {
        label: "Live Supplier Price",
        badgeClass:
          "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
        sourceText: `Supplier: ${resolution.provenance.supplierItem?.supplier?.company_name || resolution.provenance.sourceName || "Verified Local Merchant"}`,
        confidencePct,
      };
    case "crowdsource":
    case "crowdsourced_quorum":
      return {
        label: "Crowdsourced Quorum",
        badgeClass:
          "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
        sourceText: `${resolution.provenance.sampleSize || resolution.provenance.crowdsourceBenchmark?.sample_size || 15} verified local contractors`,
        confidencePct,
      };
    case "macro_adjusted":
    case "macro_filtered":
      return {
        label: "Macro-Adjusted",
        badgeClass:
          "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
        sourceText: `Fluctuation Filter (${resolution.provenance.macroAdjustmentPct && resolution.provenance.macroAdjustmentPct > 0 ? "+" : ""}${resolution.provenance.macroAdjustmentPct}%)`,
        confidencePct,
      };
    case "baseline":
    case "baseline_reference":
    default:
      return {
        label: "Baseline Estimate",
        badgeClass:
          "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        sourceText: "Standard regional reference",
        confidencePct,
      };
  }
}
