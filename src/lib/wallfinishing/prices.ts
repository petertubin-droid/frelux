// =========================================================
// FRELUX Wall Finishing — price & labour resolution (DB).
//
// Prices are NEVER hard-coded here. Every layer resolves its
// role through the market price book (market_material_roles →
// estimation_materials → estimation_prices) with full
// provenance (retailer, scan source, date). When a market has
// no price the result is `unpriced` — the UI asks for a local
// price and labels it clearly. Labour rates come from the
// wallfin_labour_rates table (per market + task), stored with
// source references and marked as estimates.
// =========================================================

import { supabase } from "@/lib/supabase";
import {
  fetchMarketRoleMappings,
  resolveMaterialPriceByRole,
} from "@/lib/estimation/market-materials";
import type {
  LabourRateMethod,
  ResolvedLabourRate,
  ResolvedLayerPrice,
} from "@/types/wallfinishing";

export async function resolveLayerPrice(
  role: string,
  market: string,
  currency: string,
): Promise<ResolvedLayerPrice> {
  const resolved = await resolveMaterialPriceByRole(role as never, market);
  if (!resolved) {
    return {
      materialName: null,
      unitPrice: null,
      packUnits: null,
      purchaseLabel: null,
      currency,
      resolvedMarket: null,
      priceSource: null,
      scanSource: null,
      priceDate: null,
      isManualPrice: false,
      unpriced: true,
    };
  }
  // Pack size: the market's own mapping first, then the
  // inherited mapping's unit label ('20L', 'gallon', 'bag'...).
  const mappings = await fetchMarketRoleMappings(resolved.resolved_market);
  const label = mappings.find((m) => m.role === role)?.unit_label ?? null;
  const pack = parsePackUnits(label);
  return {
    materialName: resolved.material.name,
    unitPrice: Number(resolved.price.price),
    packUnits: pack,
    purchaseLabel: label,
    currency: resolved.price.currency ?? currency,
    resolvedMarket: resolved.resolved_market,
    priceSource: resolved.price.price_source ?? null,
    scanSource: resolved.price.scan_source ?? null,
    priceDate: resolved.price.effective_date ?? null,
    isManualPrice: (resolved.price.price_source ?? "")
      .toLowerCase()
      .includes("manual"),
    unpriced: false,
  };
}

/** '20L' → 20, '10L' → 10, 'gallon' → 3.785, 'quart' → 0.946. */
export function parsePackUnits(unitLabel: string | null): number | null {
  if (!unitLabel) return null;
  const litres = unitLabel.match(/(\d+(?:\.\d+)?)\s*L\b/i);
  if (litres) return Number(litres[1]);
  if (/gallon/i.test(unitLabel)) return 3.785;
  if (/quart/i.test(unitLabel)) return 0.946;
  return null;
}

export interface WallFinLabourRateRow {
  market: string;
  task_key: string;
  method: LabourRateMethod;
  rate: number;
  currency: string;
  output_per_worker_day: number | null;
  source_reference: string | null;
  effective_date: string | null;
  is_active: boolean;
}

export async function fetchWallFinLabourRates(
  market: string,
): Promise<WallFinLabourRateRow[]> {
  const { data, error } = await supabase
    .from("wallfin_labour_rates")
    .select(
      "market, task_key, method, rate, currency, output_per_worker_day, source_reference, effective_date, is_active",
    )
    .eq("is_active", true)
    .or(`market.eq.${market},market.eq.NG`);
  if (error) return [];
  return (data ?? []) as WallFinLabourRateRow[];
}

/**
 * Resolve a labour rate for a task: the market's own rate first,
 * then the NG/US reference book, then null — never a guess.
 */
export async function resolveLabourRate(
  taskKey: string,
  market: string,
  currency: string,
): Promise<ResolvedLabourRate | null> {
  const rows = await fetchWallFinLabourRates(market);
  const own = rows.find((r) => r.market === market && r.task_key === taskKey);
  const ref = rows.find((r) => r.market === "NG" && r.task_key === taskKey);
  const row = own ?? ref;
  if (!row) return null;
  return {
    taskKey,
    method: row.method,
    rate: Number(row.rate),
    currency: row.currency ?? currency,
    outputPerWorkerDay:
      row.output_per_worker_day !== null
        ? Number(row.output_per_worker_day)
        : null,
    sourceReference: row.source_reference,
    effectiveDate: row.effective_date,
    // Rates are research benchmarks — always shown as estimates.
    isEstimate: true,
  };
}
