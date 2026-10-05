// =========================================================
// Market material roles — engines price by ROLE, not by name.
//
// Every market maps a role (bonding-agent, waterproofer,
// mold-treatment...) to the material its builders actually use.
// A market without a mapping for a role falls back through its
// market_profiles.inherits_from chain (US -> NG reference) and
// finally to null — a role never priced in a market is reported,
// never guessed.
// =========================================================

import { supabase } from "@/lib/supabase";
import type { EstimationMaterial, EstimationPrice } from "@/types/estimation";

/** Engine-level material roles. Add a role here + a mapping per market. */
export const MATERIAL_ROLES = [
  "concrete-mix",
  "sand",
  "bonding-agent",
  "joint-filler",
  "waterproofer",
  "waterproofer-clear",
  "mold-treatment",
  "caulk",
  "interior-paint",
  "interior-paint-premium",
  "exterior-paint",
  "primer",
] as const;

export type MaterialRole = (typeof MATERIAL_ROLES)[number];

export interface MarketRoleMapping {
  market: string;
  role: MaterialRole;
  material_slug: string;
  display_name: string;
  unit_label: string;
  notes: string | null;
}

export interface ResolvedMaterialPrice {
  role: MaterialRole;
  /** market whose price book actually supplied the row (may be the fallback) */
  resolved_market: string;
  material: EstimationMaterial;
  price: EstimationPrice;
}

export async function fetchMarketRoleMappings(
  market: string,
): Promise<MarketRoleMapping[]> {
  const { data, error } = await supabase
    .from("market_material_roles")
    .select("market, role, material_slug, display_name, unit_label, notes")
    .eq("market", market)
    .eq("is_active", true)
    .order("sort_order");

  if (error) return [];
  return (data ?? []) as MarketRoleMapping[];
}

/** Follows market_profiles.inherits_from from `market` toward the NG reference. */
export async function fetchInheritanceChain(market: string): Promise<string[]> {
  const chain = [market];
  let current = market;
  for (let depth = 0; depth < 5; depth += 1) {
    const { data } = await supabase
      .from("market_profiles")
      .select("inherits_from")
      .eq("country_code", current)
      .maybeSingle();
    const next = data?.inherits_from ?? null;
    if (!next || chain.includes(next)) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

/**
 * Resolve a role to the market's material and its ACTIVE price.
 * Tries the market's own mapping first, then each ancestor in the
 * inheritance chain. Returns null when no mapping/price exists —
 * the caller reports "not priced in this market", never guesses.
 */
export async function resolveMaterialPriceByRole(
  role: MaterialRole,
  market: string,
): Promise<ResolvedMaterialPrice | null> {
  const chain = await fetchInheritanceChain(market);
  for (const candidate of chain) {
    const { data: mapping } = (await supabase
      .from("market_material_roles")
      .select("material_slug, role, market, display_name, unit_label, notes")
      .eq("market", candidate)
      .eq("role", role)
      .eq("is_active", true)
      .maybeSingle()) as {
      data: (MarketRoleMapping & { market: string }) | null;
    };

    if (!mapping?.material_slug) continue;

    const { data: material } = await supabase
      .from("estimation_materials")
      .select("*")
      .eq("slug", mapping.material_slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!material) continue;

    const { data: price } = await supabase
      .from("estimation_prices")
      .select("*")
      .eq("price_type", "material")
      .eq("ref_id", material.id)
      .eq("market", candidate)
      .eq("is_active", true)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!price) continue;

    return {
      role,
      resolved_market: candidate,
      material: material as unknown as EstimationMaterial,
      price: price as EstimationPrice,
    };
  }
  return null;
}
