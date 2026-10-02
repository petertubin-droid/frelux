import { supabase } from "@/lib/supabase";
import type {
  EstimationUnit,
  EstimationProduct,
  EstimationProductQuality,
  EstimationMaterial,
  EstimationPackSize,
  EstimationPrice,
  EstimationPriceHistory,
  EstimationCalcRule,
  EstimationCalcVersion,
  EstimationEstimate,
  EstimationEstimateItem,
  EstimationAdjustment,
  EstimationAuditLog,
  EstimationColourCondition,
  EstimationSurfaceCondition,
  MaintenanceProfile,
  MaintenancePlan,
  BoqQuote,
  RegionalCostIndex,
  CarbonFactor,
  ThermalFinishFactor,
  CashFlowTemplate,
  LabourRate,
  MarginPreset,
  Defect,
  DefectCause,
} from "@/types/estimation";

// =========================================================
// 1. Units
// =========================================================

export async function fetchEstimationUnits() {
  const { data, error } = await supabase
    .from("estimation_units")
    .select("*")
    .order("sort_order", { ascending: true });
  return { data: (data ?? []) as EstimationUnit[], error };
}

export async function createEstimationUnit(data: Partial<EstimationUnit>) {
  const { data: record, error } = await supabase
    .from("estimation_units")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationUnit | null, error };
}

export async function updateEstimationUnit(
  id: string,
  data: Partial<EstimationUnit>,
) {
  const { data: record, error } = await supabase
    .from("estimation_units")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationUnit | null, error };
}

export async function deleteEstimationUnit(id: string) {
  const { error } = await supabase
    .from("estimation_units")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 2. Products
// =========================================================

export async function fetchEstimationProducts(activeOnly: boolean = false) {
  let query = supabase.from("estimation_products").select("*");
  if (activeOnly) {
    query = query.eq("is_active", true);
  }
  query = query.order("sort_order", { ascending: true });
  const { data, error } = await query;
  return { data: (data ?? []) as EstimationProduct[], error };
}

export async function fetchEstimationProduct(id: string) {
  const { data, error } = await supabase
    .from("estimation_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return { data: data as EstimationProduct | null, error };
}

export async function createEstimationProduct(
  data: Partial<EstimationProduct>,
) {
  const { data: record, error } = await supabase
    .from("estimation_products")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationProduct | null, error };
}

export async function updateEstimationProduct(
  id: string,
  data: Partial<EstimationProduct>,
) {
  const { data: record, error } = await supabase
    .from("estimation_products")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationProduct | null, error };
}

export async function deleteEstimationProduct(id: string) {
  const { error } = await supabase
    .from("estimation_products")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 3. Product Quality Levels
// =========================================================

export async function fetchProductQualityLevels(productId: string) {
  const { data, error } = await supabase
    .from("estimation_product_quality")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  return { data: (data ?? []) as EstimationProductQuality[], error };
}

export async function createProductQualityLevel(
  data: Partial<EstimationProductQuality>,
) {
  const { data: record, error } = await supabase
    .from("estimation_product_quality")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationProductQuality | null, error };
}

export async function updateProductQualityLevel(
  id: string,
  data: Partial<EstimationProductQuality>,
) {
  const { data: record, error } = await supabase
    .from("estimation_product_quality")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationProductQuality | null, error };
}

export async function deleteProductQualityLevel(id: string) {
  const { error } = await supabase
    .from("estimation_product_quality")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 4. Materials
// =========================================================

export async function fetchEstimationMaterials(activeOnly: boolean = false) {
  let query = supabase.from("estimation_materials").select("*");
  if (activeOnly) {
    query = query.eq("is_active", true);
  }
  query = query.order("sort_order", { ascending: true });
  const { data, error } = await query;
  return { data: (data ?? []) as EstimationMaterial[], error };
}

export async function createEstimationMaterial(
  data: Partial<EstimationMaterial>,
) {
  const { data: record, error } = await supabase
    .from("estimation_materials")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationMaterial | null, error };
}

export async function updateEstimationMaterial(
  id: string,
  data: Partial<EstimationMaterial>,
) {
  const { data: record, error } = await supabase
    .from("estimation_materials")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationMaterial | null, error };
}

export async function deleteEstimationMaterial(id: string) {
  const { error } = await supabase
    .from("estimation_materials")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 5. Pack Sizes
// =========================================================

export async function fetchPackSizes(refType: string, refId: string) {
  const { data, error } = await supabase
    .from("estimation_pack_sizes")
    .select("*")
    .eq("ref_type", refType)
    .eq("ref_id", refId)
    .order("sort_order", { ascending: true });
  return { data: (data ?? []) as EstimationPackSize[], error };
}

export async function createPackSize(data: Partial<EstimationPackSize>) {
  const { data: record, error } = await supabase
    .from("estimation_pack_sizes")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationPackSize | null, error };
}

export async function updatePackSize(
  id: string,
  data: Partial<EstimationPackSize>,
) {
  const { data: record, error } = await supabase
    .from("estimation_pack_sizes")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationPackSize | null, error };
}

export async function deletePackSize(id: string) {
  const { error } = await supabase
    .from("estimation_pack_sizes")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 6. Prices
// =========================================================

export async function fetchActivePrice(priceType: string, refId: string) {
  const { data, error } = await supabase
    .from("estimation_prices")
    .select("*")
    .eq("price_type", priceType)
    .eq("ref_id", refId)
    .eq("is_active", true)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data as EstimationPrice | null, error };
}

export async function fetchPriceHistory(priceType: string, refId: string) {
  const { data, error } = await supabase
    .from("estimation_price_history")
    .select("*")
    .eq("price_type", priceType)
    .eq("ref_id", refId)
    .order("created_at", { ascending: false });
  return { data: (data ?? []) as EstimationPriceHistory[], error };
}

export async function createOrUpdatePrice(data: Partial<EstimationPrice>) {
  if (data.price_type && data.ref_id) {
    await supabase
      .from("estimation_prices")
      .update({ is_active: false })
      .eq("price_type", data.price_type)
      .eq("ref_id", data.ref_id)
      .eq("is_active", true);
  }

  const { data: record, error } = await supabase
    .from("estimation_prices")
    .insert({ ...data, is_active: true })
    .select()
    .single();

  return { data: record as EstimationPrice | null, error };
}

export async function fetchAllPrices(activeOnly: boolean = false) {
  let query = supabase.from("estimation_prices").select("*");
  if (activeOnly) {
    query = query.eq("is_active", true);
  }
  query = query.order("effective_date", { ascending: false });
  const { data, error } = await query;
  return { data: (data ?? []) as EstimationPrice[], error };
}

// =========================================================
// 7. Calculation Rules
// =========================================================

export async function fetchCalcRules(calculatorType?: string) {
  let query = supabase.from("estimation_calc_rules").select("*");
  if (calculatorType) {
    query = query.eq("calculator_type", calculatorType);
  }
  const { data, error } = await query;
  return { data: (data ?? []) as EstimationCalcRule[], error };
}

export async function fetchCalcRule(ruleKey: string, calculatorType?: string) {
  let query = supabase
    .from("estimation_calc_rules")
    .select("*")
    .eq("rule_key", ruleKey);

  if (calculatorType) {
    query = query.eq("calculator_type", calculatorType);
  } else {
    query = query.is("calculator_type", null);
  }

  const { data, error } = await query.maybeSingle();
  return { data: data as EstimationCalcRule | null, error };
}

export async function createCalcRule(data: Partial<EstimationCalcRule>) {
  const { data: record, error } = await supabase
    .from("estimation_calc_rules")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationCalcRule | null, error };
}

export async function updateCalcRule(
  id: string,
  data: Partial<EstimationCalcRule>,
) {
  const { data: record, error } = await supabase
    .from("estimation_calc_rules")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationCalcRule | null, error };
}

export async function deleteCalcRule(id: string) {
  const { error } = await supabase
    .from("estimation_calc_rules")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 8. Calculation Versions
// =========================================================

export async function fetchCalcVersions(calculatorType?: string) {
  let query = supabase.from("estimation_calc_versions").select("*");
  if (calculatorType) {
    query = query.eq("calculator_type", calculatorType);
  }
  query = query.order("version_number", { ascending: false });
  const { data, error } = await query;
  return { data: (data ?? []) as EstimationCalcVersion[], error };
}

export async function fetchActiveCalcVersion(calculatorType: string) {
  const { data, error } = await supabase
    .from("estimation_calc_versions")
    .select("*")
    .eq("calculator_type", calculatorType)
    .eq("is_active", true)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data as EstimationCalcVersion | null, error };
}

export async function createCalcVersion(data: Partial<EstimationCalcVersion>) {
  const { data: record, error } = await supabase
    .from("estimation_calc_versions")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationCalcVersion | null, error };
}

export async function updateCalcVersion(
  id: string,
  data: Partial<EstimationCalcVersion>,
) {
  const { data: record, error } = await supabase
    .from("estimation_calc_versions")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationCalcVersion | null, error };
}

// =========================================================
// 9. Estimates
// =========================================================

export interface FetchEstimatesOptions {
  limit?: number;
  skip?: number;
  status?: string;
  calculatorType?: string;
}

export async function fetchEstimates(
  userId?: string,
  opts: FetchEstimatesOptions = {},
) {
  let query = supabase
    .from("estimation_estimates")
    .select("*", { count: "exact" });

  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (opts.status) {
    query = query.eq("status", opts.status);
  }
  if (opts.calculatorType) {
    query = query.eq("calculator_type", opts.calculatorType);
  }

  query = query.order("created_at", { ascending: false });

  if (typeof opts.skip === "number" && typeof opts.limit === "number") {
    query = query.range(opts.skip, opts.skip + opts.limit - 1);
  } else if (typeof opts.limit === "number") {
    query = query.limit(opts.limit);
  }

  const { data, count, error } = await query;
  return {
    data: (data ?? []) as EstimationEstimate[],
    count: count ?? 0,
    error,
  };
}

export async function fetchEstimate(id: string) {
  const { data: estimate, error: estimateError } = await supabase
    .from("estimation_estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (estimateError || !estimate) {
    return { data: null, error: estimateError };
  }

  const { data: items, error: itemsError } = await supabase
    .from("estimation_estimate_items")
    .select("*")
    .eq("estimate_id", id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return { data: null, error: itemsError };
  }

  return {
    data: {
      ...(estimate as EstimationEstimate),
      items: (items ?? []) as EstimationEstimateItem[],
    },
    error: null,
  };
}

export async function fetchEstimateByRef(ref: string) {
  const { data: estimate, error: estimateError } = await supabase
    .from("estimation_estimates")
    .select("*")
    .eq("estimate_ref", ref)
    .maybeSingle();

  if (estimateError || !estimate) {
    return { data: null, error: estimateError };
  }

  const { data: items, error: itemsError } = await supabase
    .from("estimation_estimate_items")
    .select("*")
    .eq("estimate_id", estimate.id)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return { data: null, error: itemsError };
  }

  return {
    data: {
      ...(estimate as EstimationEstimate),
      items: (items ?? []) as EstimationEstimateItem[],
    },
    error: null,
  };
}

export async function createEstimate(data: Partial<EstimationEstimate>) {
  const { data: record, error } = await supabase
    .from("estimation_estimates")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationEstimate | null, error };
}

export async function updateEstimate(
  id: string,
  data: Partial<EstimationEstimate>,
) {
  const { data: record, error } = await supabase
    .from("estimation_estimates")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationEstimate | null, error };
}

export async function deleteEstimate(id: string) {
  const { error } = await supabase
    .from("estimation_estimates")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 10. Estimate Items
// =========================================================

export async function fetchEstimateItems(estimateId: string) {
  const { data, error } = await supabase
    .from("estimation_estimate_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });
  return { data: (data ?? []) as EstimationEstimateItem[], error };
}

export async function createEstimateItem(
  data: Partial<EstimationEstimateItem>,
) {
  const { data: record, error } = await supabase
    .from("estimation_estimate_items")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationEstimateItem | null, error };
}

export async function updateEstimateItem(
  id: string,
  data: Partial<EstimationEstimateItem>,
) {
  const { data: record, error } = await supabase
    .from("estimation_estimate_items")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as EstimationEstimateItem | null, error };
}

export async function deleteEstimateItem(id: string) {
  const { error } = await supabase
    .from("estimation_estimate_items")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 11. Adjustments
// =========================================================

export async function fetchAdjustments(estimateId: string) {
  const { data, error } = await supabase
    .from("estimation_adjustments")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("created_at", { ascending: false });
  return { data: (data ?? []) as EstimationAdjustment[], error };
}

export async function createAdjustment(data: Partial<EstimationAdjustment>) {
  const { data: record, error } = await supabase
    .from("estimation_adjustments")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationAdjustment | null, error };
}

// =========================================================
// 12. Audit Log
// =========================================================

export async function fetchAuditLog(entityType?: string, limit?: number) {
  let query = supabase
    .from("estimation_audit_log")
    .select("*")
    .order("created_at", { ascending: false });

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as EstimationAuditLog[], error };
}

export async function createAuditLog(data: Partial<EstimationAuditLog>) {
  const { data: record, error } = await supabase
    .from("estimation_audit_log")
    .insert(data)
    .select()
    .single();
  return { data: record as EstimationAuditLog | null, error };
}

// =========================================================
// 13. Colour & Surface Conditions
// =========================================================

export async function fetchColourConditions() {
  const { data, error } = await supabase
    .from("estimation_colour_conditions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return { data: (data ?? []) as EstimationColourCondition[], error };
}

export async function fetchSurfaceConditions() {
  const { data, error } = await supabase
    .from("estimation_surface_conditions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return { data: (data ?? []) as EstimationSurfaceCondition[], error };
}

// =========================================================
// 14. Configurable Finish Products (Mineral Stone, Stucco)
// =========================================================
// Loads products of a finish category together with everything the
// deterministic engine needs: application profiles (quality rows),
// the pack unit symbol and the active product price.

export interface ConfigurableFinishProfile {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  description: string | null;
  calculation_model: string | null;
  coverage: number | null;
  coverage_min: number | null;
  coverage_max: number | null;
  coverage_unit: string | null;
  consumption_min: number | null;
  consumption_max: number | null;
  consumption_unit: string | null;
  default_coats: number | null;
  waste_percentage: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface ConfigurableFinishProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  product_notes: string | null;
  technical_spec: string | null;
  standard_pack_size: number | null;
  pack_unit_symbol: string | null;
  price_per_pack: number | null;
  price_currency: string | null;
  profiles: ConfigurableFinishProfile[];
}

export async function fetchConfigurableFinishProducts(
  category: "mineral_stone" | "stucco",
): Promise<{ data: ConfigurableFinishProduct[]; error: string | null }> {
  const { data: products, error: prodError } = await supabase
    .from("estimation_products")
    .select(
      "id, name, slug, brand, product_notes, technical_spec, standard_pack_size, pack_unit_id, sort_order",
    )
    .eq("category", category)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (prodError) return { data: [], error: prodError.message };
  if (!products || products.length === 0) return { data: [], error: null };

  const productIds = products.map((p) => p.id);

  const [{ data: qualityRows }, { data: unitRows }, { data: priceRows }] =
    await Promise.all([
      supabase
        .from("estimation_product_quality")
        .select(
          "id, product_id, name, slug, description, calculation_model, coverage, coverage_min, coverage_max, coverage_unit, consumption_min, consumption_max, consumption_unit, default_coats, waste_percentage, is_active, sort_order",
        )
        .in("product_id", productIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("estimation_units").select("id, symbol"),
      supabase
        .from("estimation_prices")
        .select("ref_id, price, currency, effective_date, is_active")
        .eq("price_type", "product")
        .in("ref_id", productIds)
        .eq("is_active", true)
        .order("effective_date", { ascending: false }),
    ]);

  const unitSymbols = new Map<string, string>(
    (unitRows ?? []).map((u) => [u.id, u.symbol]),
  );

  // One price per product: the most recent active price (list is sorted DESC).
  const priceByProduct = new Map<string, { price: number; currency: string }>();
  for (const row of priceRows ?? []) {
    if (!priceByProduct.has(row.ref_id)) {
      priceByProduct.set(row.ref_id, {
        price: Number(row.price),
        currency: row.currency,
      });
    }
  }

  const data: ConfigurableFinishProduct[] = (products ?? []).map((p) => {
    const price = priceByProduct.get(p.id);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand ?? null,
      product_notes: p.product_notes ?? null,
      technical_spec: p.technical_spec ?? null,
      standard_pack_size:
        p.standard_pack_size !== null && p.standard_pack_size !== undefined
          ? Number(p.standard_pack_size)
          : null,
      pack_unit_symbol: p.pack_unit_id
        ? (unitSymbols.get(p.pack_unit_id) ?? null)
        : null,
      price_per_pack: price ? price.price : null,
      price_currency: price ? price.currency : null,
      profiles: (qualityRows ?? [])
        .filter((q) => q.product_id === p.id)
        .map((q) => ({
          ...q,
          coverage:
            q.coverage !== null && q.coverage !== undefined
              ? Number(q.coverage)
              : null,
          coverage_min:
            q.coverage_min !== null && q.coverage_min !== undefined
              ? Number(q.coverage_min)
              : null,
          coverage_max:
            q.coverage_max !== null && q.coverage_max !== undefined
              ? Number(q.coverage_max)
              : null,
          consumption_min:
            q.consumption_min !== null && q.consumption_min !== undefined
              ? Number(q.consumption_min)
              : null,
          consumption_max:
            q.consumption_max !== null && q.consumption_max !== undefined
              ? Number(q.consumption_max)
              : null,
          default_coats:
            q.default_coats !== null && q.default_coats !== undefined
              ? Number(q.default_coats)
              : null,
          waste_percentage:
            q.waste_percentage !== null && q.waste_percentage !== undefined
              ? Number(q.waste_percentage)
              : null,
        })),
    };
  });

  return { data, error: null };
}

// =========================================================
// 19. Maintenance Schedule Engine (Future Engine 1)
// =========================================================

export async function fetchMaintenanceProfiles() {
  const { data, error } = await supabase
    .from("maintenance_profiles")
    .select("*")
    .order("sort_order", { ascending: true });
  return { data: (data ?? []) as MaintenanceProfile[], error };
}

export async function createMaintenanceProfile(
  data: Partial<MaintenanceProfile>,
) {
  const { data: record, error } = await supabase
    .from("maintenance_profiles")
    .insert(data)
    .select()
    .single();
  return { data: record as MaintenanceProfile | null, error };
}

export async function updateMaintenanceProfile(
  id: string,
  data: Partial<MaintenanceProfile>,
) {
  const { data: record, error } = await supabase
    .from("maintenance_profiles")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as MaintenanceProfile | null, error };
}

export async function deleteMaintenanceProfile(id: string) {
  const { error } = await supabase
    .from("maintenance_profiles")
    .delete()
    .eq("id", id);
  return { error };
}

export async function saveMaintenancePlan(data: Partial<MaintenancePlan>) {
  const { data: record, error } = await supabase
    .from("maintenance_plans")
    .insert(data)
    .select()
    .single();
  return { data: record as MaintenancePlan | null, error };
}

// =========================================================
// 20. BOQ / Quote Generator (Future Engine 2)
// =========================================================

export async function saveBoqQuote(data: Partial<BoqQuote>) {
  const { data: record, error } = await supabase
    .from("boq_quotes")
    .insert(data)
    .select()
    .single();
  return { data: record as BoqQuote | null, error };
}

export async function updateBoqQuote(
  quoteRef: string,
  data: Partial<BoqQuote>,
) {
  const { error } = await supabase
    .from("boq_quotes")
    .update(data)
    .eq("quote_ref", quoteRef);
  return { error };
}

export async function fetchBoqQuotes(userId?: string) {
  let query = supabase
    .from("boq_quotes")
    .select("*")
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  return { data: (data ?? []) as BoqQuote[], error };
}

// =========================================================
// 21. Regional Cost Index (Future Engine 3)
// =========================================================

export async function fetchRegionalCostIndices(
  opts: { activeOnly?: boolean } = {},
) {
  let query = supabase
    .from("regional_cost_indices")
    .select("*")
    .order("state", { ascending: true })
    .order("category", { ascending: true });
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { data: (data ?? []) as RegionalCostIndex[], error };
}

export async function createRegionalCostIndex(
  data: Partial<RegionalCostIndex>,
) {
  const { data: record, error } = await supabase
    .from("regional_cost_indices")
    .insert(data)
    .select()
    .single();
  return { data: record as RegionalCostIndex | null, error };
}

export async function updateRegionalCostIndex(
  id: string,
  data: Partial<RegionalCostIndex>,
) {
  const { data: record, error } = await supabase
    .from("regional_cost_indices")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as RegionalCostIndex | null, error };
}

export async function deleteRegionalCostIndex(id: string) {
  const { error } = await supabase
    .from("regional_cost_indices")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 22. Embodied Carbon (Future Engine 5)
// =========================================================

export async function fetchCarbonFactors(opts: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from("carbon_factors")
    .select("*")
    .order("category", { ascending: true });
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { data: (data ?? []) as CarbonFactor[], error };
}

export async function createCarbonFactor(data: Partial<CarbonFactor>) {
  const { data: record, error } = await supabase
    .from("carbon_factors")
    .insert(data)
    .select()
    .single();
  return { data: record as CarbonFactor | null, error };
}

export async function updateCarbonFactor(
  id: string,
  data: Partial<CarbonFactor>,
) {
  const { data: record, error } = await supabase
    .from("carbon_factors")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as CarbonFactor | null, error };
}

export async function deleteCarbonFactor(id: string) {
  const { error } = await supabase.from("carbon_factors").delete().eq("id", id);
  return { error };
}

// =========================================================
// 23. Cash-Flow Timeline (Future Engine 6)
// =========================================================

export async function fetchCashFlowTemplates(
  opts: { activeOnly?: boolean } = {},
) {
  let query = supabase
    .from("cash_flow_templates")
    .select("*")
    .order("sort_order", { ascending: true });
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { data: (data ?? []) as CashFlowTemplate[], error };
}

export async function createCashFlowTemplate(data: Partial<CashFlowTemplate>) {
  const { data: record, error } = await supabase
    .from("cash_flow_templates")
    .insert(data)
    .select()
    .single();
  return { data: record as CashFlowTemplate | null, error };
}

export async function updateCashFlowTemplate(
  id: string,
  data: Partial<CashFlowTemplate>,
) {
  const { data: record, error } = await supabase
    .from("cash_flow_templates")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as CashFlowTemplate | null, error };
}

export async function deleteCashFlowTemplate(id: string) {
  const { error } = await supabase
    .from("cash_flow_templates")
    .delete()
    .eq("id", id);
  return { error };
}

// =========================================================
// 25. Labour & Crew (Future Engine 7)
// =========================================================

export async function fetchLabourRates(opts: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from("labour_rates")
    .select("*")
    .order("task_key", { ascending: true });
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { data: (data ?? []) as LabourRate[], error };
}

export async function createLabourRate(data: Partial<LabourRate>) {
  const { data: record, error } = await supabase
    .from("labour_rates")
    .insert(data)
    .select()
    .single();
  return { data: record as LabourRate | null, error };
}

export async function updateLabourRate(id: string, data: Partial<LabourRate>) {
  const { data: record, error } = await supabase
    .from("labour_rates")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as LabourRate | null, error };
}

export async function deleteLabourRate(id: string) {
  const { error } = await supabase.from("labour_rates").delete().eq("id", id);
  return { error };
}

// =========================================================
// 26. Margin (Future Engine 8)
// =========================================================

export async function fetchMarginPresets(opts: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from("margin_presets")
    .select("*")
    .order("name", { ascending: true });
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { data: (data ?? []) as MarginPreset[], error };
}

export async function createMarginPreset(data: Partial<MarginPreset>) {
  const { data: record, error } = await supabase
    .from("margin_presets")
    .insert(data)
    .select()
    .single();
  return { data: record as MarginPreset | null, error };
}

export async function updateMarginPreset(
  id: string,
  data: Partial<MarginPreset>,
) {
  const { data: record, error } = await supabase
    .from("margin_presets")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as MarginPreset | null, error };
}

export async function deleteMarginPreset(id: string) {
  const { error } = await supabase.from("margin_presets").delete().eq("id", id);
  return { error };
}

// =========================================================
// 27. Defect Diagnosis (Future Engine 9)
// =========================================================

export async function fetchDefects(opts: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from("defects")
    .select("*")
    .order("symptom_key", { ascending: true });
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { data: (data ?? []) as Defect[], error };
}

export async function createDefect(data: Partial<Defect>) {
  const { data: record, error } = await supabase
    .from("defects")
    .insert(data)
    .select()
    .single();
  return { data: record as Defect | null, error };
}

export async function updateDefect(id: string, data: Partial<Defect>) {
  const { data: record, error } = await supabase
    .from("defects")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as Defect | null, error };
}

export async function deleteDefect(id: string) {
  const { error } = await supabase.from("defects").delete().eq("id", id);
  return { error };
}

export async function fetchDefectCauses(defectId?: string) {
  let query = supabase
    .from("defect_causes")
    .select("*")
    .order("sort_order", { ascending: true });
  if (defectId) query = query.eq("defect_id", defectId);
  const { data, error } = await query;
  return { data: (data ?? []) as DefectCause[], error };
}

export async function createDefectCause(data: Partial<DefectCause>) {
  const { data: record, error } = await supabase
    .from("defect_causes")
    .insert(data)
    .select()
    .single();
  return { data: record as DefectCause | null, error };
}

export async function updateDefectCause(
  id: string,
  data: Partial<DefectCause>,
) {
  const { data: record, error } = await supabase
    .from("defect_causes")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  return { data: record as DefectCause | null, error };
}

export async function deleteDefectCause(id: string) {
  const { error } = await supabase.from("defect_causes").delete().eq("id", id);
  return { error };
}

// =========================================================
// 15. Warranty records (Warranty & Dispute Engine)
// =========================================================

export interface WarrantyRecord {
  id: string;
  user_id: string | null;
  estimate_id: string;
  certificate_ref: string;
  currency: string;
  estimate_snapshot: Record<string, unknown>;
  config_hash: string;
  warranty_months: number;
  issued_at: string;
  expires_at: string;
  status: string;
  dispute_flags: string[];
  created_at: string;
  updated_at: string;
}

export async function fetchWarrantyRecords(userId?: string) {
  let query = supabase
    .from("warranty_records")
    .select("*")
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  return { data: (data ?? []) as WarrantyRecord[], error };
}

export async function createWarrantyRecord(data: Partial<WarrantyRecord>) {
  const { data: record, error } = await supabase
    .from("warranty_records")
    .insert(data)
    .select()
    .single();
  return { data: record as WarrantyRecord | null, error };
}

// =========================================================
// 16. Thermal finish factors (Heat Comfort Engine)
// =========================================================

export async function fetchThermalFinishFactors(activeOnly = false) {
  let query = supabase
    .from("thermal_finish_factors")
    .select("*")
    .order("surface_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("category", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { data: (data ?? []) as ThermalFinishFactor[], error };
}

export async function createThermalFinishFactor(
  data: Partial<ThermalFinishFactor>,
) {
  const { error } = await supabase.from("thermal_finish_factors").insert(data);
  return { error };
}

export async function updateThermalFinishFactor(
  id: string,
  data: Partial<ThermalFinishFactor>,
) {
  const { error } = await supabase
    .from("thermal_finish_factors")
    .update(data)
    .eq("id", id);
  return { error };
}

export async function deleteThermalFinishFactor(id: string) {
  const { error } = await supabase
    .from("thermal_finish_factors")
    .delete()
    .eq("id", id);
  return { error };
}
