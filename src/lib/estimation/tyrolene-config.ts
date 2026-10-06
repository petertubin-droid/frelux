// =========================================================
// TYROLENE ENGINE CONFIG LOADER
//
// Loads the authoritative Tyrolene calculation config from the
// DB — the SAME sources the manual Tyrolene Estimator page
// reads (product, materials, prices, pack sizes, calc rules,
// production rules, calc version) — so an admin change
// propagates identically to the page, AI copilot and agents.
//
// Prices are market-aware: the visitor's market price first,
// then the role-based fallback (market_material_roles →
// estimation_materials → estimation_prices) with verified
// provenance. A role with no verified price stays unpriced
// and is reported — never guessed.
// =========================================================

import { supabase } from "@/lib/supabase";
import {
  fetchActivePriceForMarket,
  fetchCalcRules,
  fetchEstimationMaterials,
  fetchEstimationProducts,
} from "@/lib/estimation/queries";
import {
  resolveMaterialPriceByRole,
  type MaterialRole,
} from "@/lib/estimation/market-materials";
import type { EstimationPackSize, EstimationPrice } from "@/types/estimation";
import type {
  ProductionRuleRow,
  TyroleneCalcConfig,
} from "@/lib/estimation/tyrolene-engine";

export const TYROLENE_MATERIAL_SLUGS = [
  "cement",
  "sand",
  "acrylic-bond",
  "water-seal",
  "anti-fungal",
] as const;

/** NG material slug → engine role (same mapping the manual page uses). */
export const TYROLENE_ROLES: Record<string, MaterialRole> = {
  cement: "concrete-mix",
  sand: "sand",
  "acrylic-bond": "bonding-agent",
  "water-seal": "waterproofer",
  "anti-fungal": "mold-treatment",
};

export interface TyroleneConfigBundle {
  config: TyroleneCalcConfig;
  /** Config gaps to surface to the user (missing product/materials/rules). */
  warnings: string[];
  /** Market-resolved local material per NG slug, with provenance. */
  roleResolutions: Map<
    string,
    NonNullable<Awaited<ReturnType<typeof resolveMaterialPriceByRole>>>
  >;
  /** Materials the market could not price — reported, never guessed. */
  unpricedSlugs: string[];
}

/**
 * Build the full Tyrolene calculation config for a market.
 * Mirrors the manual Tyrolene Estimator page's loadConfig.
 */
export async function loadTyroleneCalcConfig(
  marketCode: string,
): Promise<TyroleneConfigBundle> {
  const warnings: string[] = [];
  const roleResolutions = new Map<
    string,
    NonNullable<Awaited<ReturnType<typeof resolveMaterialPriceByRole>>>
  >();
  const unpricedSlugs: string[] = [];

  // Product
  const { data: allProducts } = await fetchEstimationProducts(true);
  const product = (allProducts ?? []).find(
    (p) => p.category === "tyrolene",
  ) as TyroleneCalcConfig["product"];
  if (!product) {
    warnings.push(
      "Tyrolene product is not configured. Admin must configure the Tyrolene product before estimates can be calculated.",
    );
  }

  // Materials
  const { data: allMaterials } = await fetchEstimationMaterials(true);
  const materials = (allMaterials ?? []).filter((m) =>
    (TYROLENE_MATERIAL_SLUGS as readonly string[]).includes(m.slug),
  ) as TyroleneCalcConfig["materials"];
  if (materials.length < TYROLENE_MATERIAL_SLUGS.length) {
    warnings.push(
      `Only ${materials.length}/${TYROLENE_MATERIAL_SLUGS.length} Tyrolene materials configured. Admin must configure: ${TYROLENE_MATERIAL_SLUGS.join(", ")}.`,
    );
  }

  // Prices: market price first, role fallback with provenance, else unpriced.
  const prices = new Map<string, EstimationPrice>();
  for (const mat of materials) {
    const { data: price } = await fetchActivePriceForMarket(
      "material",
      mat.id,
      marketCode,
    );
    if (price) {
      prices.set(mat.slug, price as EstimationPrice);
      continue;
    }
    const role = TYROLENE_ROLES[mat.slug];
    if (!role) {
      warnings.push(
        `Material '${mat.name}' does not have a configured price. Material cost will be incomplete until FRELUX admin configures the price.`,
      );
      continue;
    }
    const resolved = await resolveMaterialPriceByRole(role, marketCode);
    if (resolved) {
      prices.set(mat.slug, resolved.price as EstimationPrice);
      roleResolutions.set(mat.slug, resolved);
    } else {
      unpricedSlugs.push(mat.slug);
      warnings.push(
        `Material '${mat.name}' has no verified price for this market yet. Material cost will be incomplete until the market price book is filled via the Admin Scan system.`,
      );
    }
  }

  // Pack sizes (first active per material)
  const packSizes = new Map<string, EstimationPackSize>();
  for (const mat of materials) {
    const { data: packs } = await supabase
      .from("estimation_pack_sizes")
      .select("*")
      .eq("ref_type", "material")
      .eq("ref_id", mat.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1);
    if (packs && packs.length > 0) {
      packSizes.set(mat.slug, packs[0] as EstimationPackSize);
    }
  }

  // Calc rules
  const { data: rules } = await fetchCalcRules("tyrolene");
  const calcRules = new Map<string, (typeof rules)[number]>();
  for (const rule of rules ?? []) calcRules.set(rule.rule_key, rule);

  // Production rules
  let productionRules: ProductionRuleRow[] = [];
  const { data: prodRules, error: prodError } = await supabase
    .from("estimation_production_rules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (!prodError && prodRules) {
    productionRules = prodRules as ProductionRuleRow[];
  }

  // Calc version
  let calcVersionId: string | null = null;
  const { data: versions } = await supabase
    .from("estimation_calc_versions")
    .select("*")
    .eq("calculator_type", "tyrolene")
    .eq("is_active", true)
    .order("version_number", { ascending: false })
    .limit(1);
  if (versions && versions.length > 0) calcVersionId = versions[0].id;

  return {
    config: {
      product,
      materials,
      prices,
      packSizes,
      calcRules,
      productionRules,
      calcVersionId,
    },
    warnings,
    roleResolutions,
    unpricedSlugs,
  };
}
