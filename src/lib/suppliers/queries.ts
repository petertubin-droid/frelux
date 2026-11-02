/**
 * Supplier network data access.
 *
 * Reads are direct through the anon/authenticated key and are therefore subject
 * to RLS: the public directory only ever sees active suppliers and active
 * listings, a supplier sees its own drafts, and quotations/requests are never
 * public. Writes that raise trust or move money go through the supplier-ops
 * function, not from here.
 */

import { supabase } from "@/lib/supabase";
import { buildSearchResult, splitAndSort, type SplitResults } from "./ranking";
import type {
  MaterialRequest,
  SupplierDeliveryZone,
  SupplierListing,
  SupplierPlan,
  SupplierProfile,
  SupplierSearchFilters,
  SupplierSearchResult,
} from "./types";
import { SUPPLIER_CATEGORIES } from "./types";

const LISTING_COLUMNS =
  "id, supplier_id, market_code, material_category, category, material_slug, product_name, brand_name, brand, specification, sku, description, unit, unit_price, currency, minimum_order_qty, in_stock, stock_status, lead_time_days, delivery_available, delivery_fee, delivery_fee_currency, bulk_discount_threshold, bulk_discount_pct, notes, is_featured, is_active, listing_status, admin_notes, price_updated_at, last_updated_at, created_at, updated_at";

export async function fetchSupplierPlans(): Promise<{
  plans: SupplierPlan[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("supplier_plans")
    .select("*")
    .eq("is_active", true)
    .order("monthly_price");
  return {
    plans: (data ?? []) as SupplierPlan[],
    error: error?.message ?? null,
  };
}

/**
 * Directory search.
 *
 * Narrowing happens in the database (market, city, active state); matching on
 * category and free text happens here so a supplier's category list and product
 * names are both searchable without a full-text index per column. Results are
 * returned already split into paid placements and organic order.
 */
export async function searchSuppliers(filters: SupplierSearchFilters): Promise<{
  results: SplitResults;
  total: number;
  error: string | null;
}> {
  const limit = filters.limit ?? 60;
  let supplierQuery = supabase
    .from("supplier_profiles")
    .select("*")
    .eq("is_active", true)
    .order("company_name")
    .limit(200);

  if (filters.marketCode)
    supplierQuery = supplierQuery.eq("market_code", filters.marketCode);
  if (filters.city)
    supplierQuery = supplierQuery.ilike("city", filters.city.trim());
  if (filters.neighbourhood)
    supplierQuery = supplierQuery.ilike(
      "neighbourhood",
      `%${filters.neighbourhood.trim()}%`,
    );
  if (filters.verificationLevel && filters.verificationLevel !== "any") {
    supplierQuery = supplierQuery.eq(
      "verification_level",
      filters.verificationLevel,
    );
  }
  if (filters.category)
    supplierQuery = supplierQuery.contains("product_categories", [
      filters.category,
    ]);

  const { data: profileRows, error: profileError } = await supplierQuery;
  if (profileError)
    return {
      results: { promoted: [], organic: [] },
      total: 0,
      error: profileError.message,
    };

  const profiles = (profileRows ?? []) as SupplierProfile[];
  if (profiles.length === 0)
    return { results: { promoted: [], organic: [] }, total: 0, error: null };

  const ids = profiles.map((p) => p.id);

  let listingQuery = supabase
    .from("supplier_inventory_items")
    .select(LISTING_COLUMNS)
    .in("supplier_id", ids)
    .eq("is_active", true)
    .eq("listing_status", "active")
    .order("price_updated_at", { ascending: false })
    .limit(2000);
  if (filters.marketCode)
    listingQuery = listingQuery.eq("market_code", filters.marketCode);
  if (filters.category)
    listingQuery = listingQuery.eq("material_category", filters.category);
  if (filters.inStockOnly) listingQuery = listingQuery.eq("in_stock", true);
  if (filters.deliveryOnly)
    listingQuery = listingQuery.eq("delivery_available", true);

  const [{ data: listingRows, error: listingError }, { data: zoneRows }] =
    await Promise.all([
      listingQuery,
      supabase
        .from("supplier_delivery_zones")
        .select("*")
        .in("supplier_id", ids)
        .eq("is_active", true)
        .limit(1000),
    ]);

  if (listingError)
    return {
      results: { promoted: [], organic: [] },
      total: 0,
      error: listingError.message,
    };

  const listings = (listingRows ?? []) as SupplierListing[];
  const zones = (zoneRows ?? []) as SupplierDeliveryZone[];
  const needle = filters.query?.trim().toLowerCase() ?? "";

  const results: SupplierSearchResult[] = [];
  for (const profile of profiles) {
    const supplierListings = listings.filter(
      (l) => l.supplier_id === profile.id,
    );
    const supplierZones = zones.filter((z) => z.supplier_id === profile.id);

    // Free-text matches product name, brand, specification or the supplier's own
    // name. A city/neighbourhood search also matches a delivery zone.
    const textMatches = (listing: SupplierListing) =>
      !needle ||
      [
        listing.product_name,
        listing.brand,
        listing.brand_name,
        listing.specification,
        listing.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));

    const matchedListings = supplierListings.filter(textMatches);
    const nameMatches =
      needle && profile.company_name.toLowerCase().includes(needle);
    const zoneMatches =
      needle &&
      supplierZones.some((zone) =>
        [zone.city, zone.neighbourhood]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      );

    // Category filtering already happened in SQL; keep suppliers whose catalogue
    // is visible even when the needle only matched the name.
    if (needle && matchedListings.length === 0 && !nameMatches && !zoneMatches)
      continue;
    if (
      filters.deliveryOnly &&
      supplierZones.length === 0 &&
      !supplierListings.some((l) => l.delivery_available)
    ) {
      continue;
    }

    results.push(
      buildSearchResult(
        profile,
        supplierListings,
        needle ? matchedListings : supplierListings,
        supplierZones,
      ),
    );
  }

  const split = splitAndSort(results);
  const trimmed: SplitResults = {
    promoted: split.promoted.slice(0, limit),
    organic: split.organic.slice(0, limit),
  };
  return {
    results: trimmed,
    total: trimmed.promoted.length + trimmed.organic.length,
    error: null,
  };
}

export async function fetchSupplierById(id: string): Promise<{
  supplier: SupplierProfile | null;
  listings: SupplierListing[];
  zones: SupplierDeliveryZone[];
  error: string | null;
}> {
  const [{ data: supplier, error }, { data: listings }, { data: zones }] =
    await Promise.all([
      supabase.from("supplier_profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("supplier_inventory_items")
        .select(LISTING_COLUMNS)
        .eq("supplier_id", id)
        .eq("is_active", true)
        .eq("listing_status", "active")
        .order("material_category")
        .limit(500),
      supabase
        .from("supplier_delivery_zones")
        .select("*")
        .eq("supplier_id", id)
        .eq("is_active", true),
    ]);
  return {
    supplier: (supplier as SupplierProfile | null) ?? null,
    listings: (listings ?? []) as SupplierListing[],
    zones: (zones ?? []) as SupplierDeliveryZone[],
    error: error?.message ?? null,
  };
}

export async function fetchSupplierBySlug(slug: string) {
  const { data } = await supabase
    .from("supplier_profiles")
    .select("id")
    .eq("public_slug", slug)
    .maybeSingle();
  if (!data)
    return { supplier: null, listings: [], zones: [], error: null } as Awaited<
      ReturnType<typeof fetchSupplierById>
    >;
  return fetchSupplierById((data as { id: string }).id);
}

export async function fetchMySupplier(
  userId: string,
): Promise<{ supplier: SupplierProfile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    supplier: (data as SupplierProfile | null) ?? null,
    error: error?.message ?? null,
  };
}

export function slugifySupplier(
  name: string,
  city: string | null,
  marketCode: string,
): string {
  const base = [name, city ?? "", marketCode]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface SupplierRegistrationInput {
  companyName: string;
  contactName: string;
  marketCode: string;
  countryName: string | null;
  city: string;
  neighbourhood: string | null;
  address: string;
  phone: string;
  whatsapp: string | null;
  email: string;
  businessRegNo: string | null;
  taxId: string | null;
  description: string;
  categories: string[];
  deliveryFeeModel: SupplierProfile["delivery_fee_model"];
  minimumOrderValue: number | null;
  currency: string;
}

/**
 * Registers a supplier as `unverified`. The level is set explicitly here rather
 * than accepted from the form, so a registrant cannot claim a badge.
 */
export async function registerSupplier(
  userId: string,
  input: SupplierRegistrationInput,
) {
  const payload = {
    user_id: userId,
    company_name: input.companyName.trim(),
    contact_name: input.contactName.trim() || null,
    market_code: input.marketCode,
    country_name: input.countryName,
    city: input.city.trim(),
    neighbourhood: input.neighbourhood?.trim() || null,
    address: input.address.trim(),
    phone: input.phone.trim(),
    whatsapp: input.whatsapp?.trim() || null,
    email: input.email.trim().toLowerCase(),
    business_reg_no: input.businessRegNo?.trim() || null,
    tax_id: input.taxId?.trim() || null,
    description: input.description.trim() || null,
    product_categories: input.categories,
    delivery_fee_model: input.deliveryFeeModel,
    minimum_order_value: input.minimumOrderValue,
    public_slug: slugifySupplier(
      input.companyName,
      input.city,
      input.marketCode,
    ),
    verification_level: "unverified",
    verification_status: "pending",
    is_verified: false,
    is_active: true,
    subscription_plan: "free",
    subscription_status: "active",
    status: "pending_review",
  } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("supplier_profiles")
    .insert(payload)
    .select("*")
    .single();
  return {
    supplier: (data as SupplierProfile | null) ?? null,
    error: error?.message ?? null,
  };
}

export async function updateSupplierProfile(
  id: string,
  changes: Partial<SupplierProfile>,
) {
  // Trust and billing fields are not writable from the client form.
  const {
    verification_level: _ignoredLevel,
    is_verified: _ignoredVerified,
    is_featured: _ignoredFeatured,
    featured_until: _ignoredUntil,
    subscription_plan: _ignoredPlan,
    subscription_status: _ignoredStatus,
    lead_credits: _ignoredCredits,
    ...safe
  } = changes;
  const { error } = await supabase
    .from("supplier_profiles")
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchSupplierListings(
  supplierId: string,
): Promise<{ listings: SupplierListing[]; error: string | null }> {
  const { data, error } = await supabase
    .from("supplier_inventory_items")
    .select(LISTING_COLUMNS)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  return {
    listings: (data ?? []) as SupplierListing[],
    error: error?.message ?? null,
  };
}

export interface ListingInput {
  supplier_id: string;
  market_code: string;
  material_category: string;
  material_slug: string;
  product_name: string;
  brand: string | null;
  specification: string | null;
  unit: string;
  unit_price: number;
  currency: string;
  minimum_order_qty: number | null;
  in_stock: boolean;
  lead_time_days: number | null;
  delivery_available: boolean;
  delivery_fee: number | null;
  delivery_fee_currency: string | null;
  description: string | null;
}

export async function saveListing(input: ListingInput & { id?: string }) {
  const payload = {
    ...input,
    stock_status: input.in_stock ? "in_stock" : "out_of_stock",
    price_updated_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    is_active: true,
  };
  if (input.id) {
    const { error } = await supabase
      .from("supplier_inventory_items")
      .update(payload)
      .eq("id", input.id);
    return { error: error?.message ?? null };
  }
  // New listings wait for moderation before they appear publicly.
  const { error } = await supabase
    .from("supplier_inventory_items")
    .insert({ ...payload, listing_status: "pending", is_featured: false })
    .select("id")
    .single();
  return { error: error?.message ?? null };
}

export async function archiveListing(id: string) {
  const { error } = await supabase
    .from("supplier_inventory_items")
    .update({ is_active: false })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function saveDeliveryZone(
  zone: Partial<SupplierDeliveryZone> & {
    supplier_id: string;
    market_code: string;
    city: string;
    currency: string;
  },
) {
  if (zone.id) {
    const { error } = await supabase
      .from("supplier_delivery_zones")
      .update({ ...zone, updated_at: new Date().toISOString() })
      .eq("id", zone.id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("supplier_delivery_zones").insert(zone);
  return { error: error?.message ?? null };
}

export async function removeDeliveryZone(id: string) {
  const { error } = await supabase
    .from("supplier_delivery_zones")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchVerificationEvents(supplierId: string) {
  const { data, error } = await supabase
    .from("supplier_verification_events")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  return { events: data ?? [], error: error?.message ?? null };
}

// ── Saved suppliers (reuses marketplace_favorites) ────────────────

export async function fetchSavedSupplierIds(
  userId: string,
): Promise<{ ids: string[]; error: string | null }> {
  const { data, error } = await supabase
    .from("marketplace_favorites")
    .select("supplier_id")
    .eq("user_id", userId)
    .not("supplier_id", "is", null);
  return {
    ids: (data ?? []).map((r) => (r as { supplier_id: string }).supplier_id),
    error: error?.message ?? null,
  };
}

export async function saveSupplier(userId: string, supplierId: string) {
  const { error } = await supabase.from("marketplace_favorites").insert({
    user_id: userId,
    item_type: "supplier",
    supplier_id: supplierId,
  });
  if (error && /duplicate key|unique/i.test(error.message))
    return { error: null };
  return { error: error?.message ?? null };
}

export async function unsaveSupplier(userId: string, supplierId: string) {
  const { error } = await supabase
    .from("marketplace_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("supplier_id", supplierId);
  return { error: error?.message ?? null };
}

export async function reportSupplier(input: {
  reporterId: string;
  supplierId: string;
  reportType:
    "fraud" | "fake_listing" | "wrong_price" | "no_delivery" | "other";
  reason: string;
  description: string;
}) {
  const { error } = await supabase.from("marketplace_reports").insert({
    reporter_id: input.reporterId,
    report_type: input.reportType,
    supplier_id: input.supplierId,
    reason: input.reason.slice(0, 200),
    description: input.description.slice(0, 2000),
    status: "open",
  });
  return { error: error?.message ?? null };
}

/** Request count per supplier, used to show an honest "no quotes yet" state. */
export async function fetchSupplierRequestCount(
  supplierId: string,
): Promise<number | null> {
  const { count } = await supabase
    .from("material_request_quotes")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId);
  return count ?? null;
}

export function categoriesForLabels(labels: string[]): string[] {
  return labels.filter((label) =>
    SUPPLIER_CATEGORIES.some((c) => c.slug === label),
  );
}

export type { MaterialRequest };
