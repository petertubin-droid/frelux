// =========================================================
// AI ENGINE PRICING - shared market-aware price wiring.
//
// Registry engines surface REAL market prices by ROLE through
// the market price book (market_material_roles → estimation_
// materials → estimation_prices) with full provenance. A role
// without a verified price resolves to null - the engine then
// reports the missing price instead of inventing one.
//
// Mirrors the manual calculator pages (PaintCalculator,
// TyroleneEstimator, ScreedingCostEstimator) and the wall
// finishing estimator: same tables, same roles, same
// provenance. Never a second opinion.
// =========================================================

import type { MaterialRole } from "@/lib/estimation/market-materials";
import {
  fetchMarketRoleMappings,
  resolveMaterialPriceByRole,
} from "@/lib/estimation/market-materials";
import { parsePackUnits } from "@/lib/wallfinishing/prices";

export interface EngineResolvedPrice {
  role: MaterialRole;
  /** Local brand/product name from the market's verified book. */
  materialName: string;
  /** Price per purchase pack (pail, bag, bucket...). */
  unitPrice: number;
  /** Units per purchase pack (litres per pail...), null = sold loose. */
  packUnits: number | null;
  purchaseLabel: string | null;
  currency: string;
  resolvedMarket: string;
  priceSource: string | null;
  scanSource: string | null;
  priceDate: string | null;
}

/**
 * Resolve a role's verified price for a market. Returns null when the
 * market (or any inherited market) has no active mapping/price - the
 * caller reports the gap, never guesses.
 */
export async function resolveEnginePrice(
  role: MaterialRole,
  marketCode: string,
  fallbackCurrency: string,
): Promise<EngineResolvedPrice | null> {
  const resolved = await resolveMaterialPriceByRole(role, marketCode);
  if (!resolved) return null;

  // Pack size: the resolved market's own mapping label ('20L', 'bag'...).
  const mappings = await fetchMarketRoleMappings(resolved.resolved_market);
  const label = mappings.find((m) => m.role === role)?.unit_label ?? null;

  return {
    role,
    materialName: resolved.material.name,
    unitPrice: Number(resolved.price.price),
    packUnits: parsePackUnits(label),
    purchaseLabel: label,
    currency: resolved.price.currency ?? fallbackCurrency,
    resolvedMarket: resolved.resolved_market,
    priceSource: resolved.price.price_source ?? null,
    scanSource: resolved.price.scan_source ?? null,
    priceDate: resolved.price.effective_date ?? null,
  };
}

export interface EnginePricedLine {
  label: string;
  amount: number;
}

/**
 * Price a coverage-unit quantity (litres, kg, bags...) with a
 * pack-priced role price. Packs are purchased WHOLE - the same
 * purchase rounding the manual calculators apply.
 */
export function priceQuantity(
  quantity: number,
  price: EngineResolvedPrice,
): EnginePricedLine {
  const packs =
    price.packUnits && price.packUnits > 1
      ? Math.ceil(quantity / price.packUnits)
      : null;
  const amount =
    packs !== null
      ? Math.round(packs * price.unitPrice * 100) / 100
      : Math.round(quantity * price.unitPrice * 100) / 100;
  return { label: price.materialName, amount };
}

/** Human-readable provenance line for the raw block. */
export function priceProvenance(price: EngineResolvedPrice): string {
  const src = price.priceSource ?? "market price book";
  const scan = price.scanSource ? `, verified via ${price.scanSource}` : "";
  const date = price.priceDate ? `, dated ${price.priceDate}` : "";
  return (
    `${price.materialName} (${price.role}) priced from the ${price.resolvedMarket} ` +
    `market book via ${src}${scan}${date}`
  );
}
