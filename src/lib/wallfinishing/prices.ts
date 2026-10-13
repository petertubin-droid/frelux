// =========================================================
// FRELUX Wall Finishing - price & labour resolution (DB).
//
// Prices are NEVER hard-coded here. Every layer resolves its
// role through the market price book (market_material_roles →
// estimation_materials → estimation_prices) with full
// provenance (retailer, scan source, date). When a market has
// no price the result is `unpriced` - the UI asks for a local
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

/**
 * Pack conversion for the wall-finishing cost engine.
 *
 * parsePackUnits above answers "how many LITRES per purchase pack" —
 * correct for litre-based quantities (the AI engine, NG/GB/DE/IN paint
 * layers). But wall-finishing layers express quantity in MANY units:
 * pack units ("20 L pail", "saco de 30 kg", "lata de 18 L") and small
 * units ("litre", "gallon"). Dividing a pack-unit quantity by a
 * litres-per-pack number silently undercounts — the exact bug this
 * helper exists to make impossible.
 *
 * effectivePackSize returns the pack size expressed in the LAYER's OWN
 * unit, so `packs = ceil(quantity / pack)` is always dimension-correct:
 *
 *   layer unit        label        → pack  meaning
 *   "20 L pail"       "pail 20 L"  → 1     qty is already packs; price is per pack
 *   "litre"           "20L"        → 20    litres per 20 L pail
 *   "gallon"          "gallon"     → 1     qty is gallons; price is per gallon
 *   "gallon"          "quart"      → 0.25  4 quarts per gallon
 *   "gallon"          "19 L"       → 5.02  19 L galón = 5.02 gallons per pack
 *
 * Container words (bag/pail/can/lata/sac/pot/box/roll/sheet...) mean
 * the layer quantity is already counted in whole purchase packs; the
 * mapping is responsible for pairing a product of the SAME pack size
 * (assemblies align layer packs to the market's retail packs).
 * kg packs on small-unit layers convert at the water-based ≈1 kg/L
 * density used across the templates.
 */
const PACK_UNIT_RE =
  /bag|pail|can\b|can$|pot\b|sac\b|sac[ok]\b|box\b|roll|sack|container|bucket|lata|galão|galao|galo\b|drum\b|tin\b|bale\b|sheet|feuille|cubo|bald\w*e|lat\w*a\b/i;
const LITRES_PER = { gallon: 3.785, quart: 0.946 };

export function effectivePackSize(
  layerUnit: string,
  purchaseLabel: string | null,
  packUnits: number | null,
): number | null {
  const u = layerUnit.toLowerCase();
  if (!u) return null;

  // Layer quantity already counted in whole purchase packs.
  if (PACK_UNIT_RE.test(u)) return 1;

  // Small-unit layer: express the pack in the layer's unit.
  const kgMatch = purchaseLabel?.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  const kgPerPack = kgMatch ? Number(kgMatch[1].replace(",", ".")) : null;

  if (/gallon|^gal\b/.test(u)) {
    // explicit gallon/quart packs first — exact by definition
    if (/gallon/i.test(purchaseLabel ?? "")) return 1;
    if (/quart/i.test(purchaseLabel ?? "")) return 0.25; // 4 US quarts = 1 gallon
    if (packUnits && packUnits > 0)
      return round4(packUnits / LITRES_PER.gallon);
    if (kgPerPack) return round4(kgPerPack / LITRES_PER.gallon);
    return null;
  }
  if (/quart/i.test(u)) {
    if (packUnits && packUnits > 0) return round4(packUnits / LITRES_PER.quart);
    if (/quart/i.test(purchaseLabel ?? "")) return 1;
    return null;
  }
  // litre / kg small-unit layers
  if (packUnits && packUnits > 0) return round4(packUnits);
  if (kgPerPack) return round4(kgPerPack);
  if (/gallon/i.test(purchaseLabel ?? "")) return LITRES_PER.gallon;
  if (/quart/i.test(purchaseLabel ?? "")) return round4(LITRES_PER.quart);
  return null;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
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
 * then the NG/US reference book, then null - never a guess.
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
    // Rates are research benchmarks - always shown as estimates.
    isEstimate: true,
  };
}
