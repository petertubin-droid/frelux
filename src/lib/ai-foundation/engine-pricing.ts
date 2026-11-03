// =========================================================
// AI ENGINE PRICING - shared market-aware price wiring.
//
// Registry engines surface REAL market prices by ROLE through
// the market price book (market_material_roles → estimation_
// materials → estimation_prices) with full provenance. A role
// without a verified price resolves to null - the engine then
// reports the missing price instead of inventing one.
//
// Resolves through the price gateway, so an engine and a manual
// calculator answer with the same number, the same inheritance rule and
// the same coverage sentence. The scanner feeds that gateway through the
// market price book; nothing here reads a price table directly.
// =========================================================

import type { MaterialRole } from "@/lib/estimation/market-materials";
import { fetchMarketRoleMappings } from "@/lib/estimation/market-materials";
import {
  resolvePrice,
  type PriceResolution,
} from "@/lib/pricing/price-gateway";
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
  /** local | unverified | inherited, exactly as the gateway classified it. */
  status?: PriceResolution["status"];
  /** Coverage of the requested market, when a snapshot exists. */
  coverageStatus?: string | null;
  /** The honest sentence that belongs beside the number. */
  coverageSentence?: string | null;
  /** One line the UI can show without rewording it. */
  message?: string;
  /** Never a defaulted rate. */
  taxStatus?: PriceResolution["taxStatus"];
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
  options: { citySlug?: string | null } = {},
): Promise<EngineResolvedPrice | null> {
  // One resolver for engines and calculators alike. The gateway reports
  // not_priced instead of inventing a number, so a null here always means
  // the market genuinely has no price for this role.
  const resolution: PriceResolution = await resolvePrice({
    role,
    market: marketCode,
    citySlug: options.citySlug ?? null,
  });
  if (resolution.unitPrice === null) return null;

  const sourcedMarket =
    resolution.provenance.sourcedMarket ??
    resolution.sourcedMarket ??
    marketCode;

  // Pack size: the sourced market's own mapping label ('20L', 'bag'...).
  const mappings = await fetchMarketRoleMappings(sourcedMarket);
  const label = mappings.find((m) => m.role === role)?.unit_label ?? null;

  return {
    role,
    materialName: resolution.provenance.materialName ?? role,
    unitPrice: resolution.unitPrice,
    packUnits: parsePackUnits(label),
    purchaseLabel: label,
    currency: resolution.currency ?? fallbackCurrency,
    resolvedMarket: sourcedMarket,
    priceSource: resolution.provenance.priceSource,
    scanSource: resolution.provenance.scanSource,
    priceDate: resolution.provenance.effectiveDate,
    status: resolution.status,
    coverageStatus: resolution.coverage?.status ?? null,
    coverageSentence: resolution.coverage?.sentence ?? null,
    message: resolution.message,
    taxStatus: resolution.taxStatus,
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
