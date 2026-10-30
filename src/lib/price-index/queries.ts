/**
 * Live Material Price Index, data access.
 *
 * Reads only. Every write path (submission, approval, rejection, city change)
 * goes through an edge function so that validation, rate limiting and the audit
 * trail sit server-side where a client cannot skip them.
 */

import { supabase } from "@/lib/supabase";
import type {
  AuditRow,
  IndexListing,
  IndexMaterial,
  MarketCity,
  PriceKind,
  SubmissionRow,
  VerificationStatus,
} from "./types";

export const INDEX_COUNTRY = "NG";

/** Launch cities, used for prerendering and as a fallback if the query fails. */
export const LAUNCH_CITIES: { slug: string; name: string; state: string }[] = [
  { slug: "lagos", name: "Lagos", state: "Lagos" },
  { slug: "abuja", name: "Abuja", state: "FCT" },
  { slug: "port-harcourt", name: "Port Harcourt", state: "Rivers" },
  { slug: "onitsha", name: "Onitsha", state: "Anambra" },
  { slug: "ibadan", name: "Ibadan", state: "Oyo" },
  { slug: "kano", name: "Kano", state: "Kano" },
  { slug: "enugu", name: "Enugu", state: "Enugu" },
  { slug: "benin-city", name: "Benin City", state: "Edo" },
  { slug: "owerri", name: "Owerri", state: "Imo" },
  { slug: "uyo", name: "Uyo", state: "Akwa Ibom" },
  { slug: "calabar", name: "Calabar", state: "Cross River" },
  { slug: "warri", name: "Warri", state: "Delta" },
  { slug: "kaduna", name: "Kaduna", state: "Kaduna" },
  { slug: "jos", name: "Jos", state: "Plateau" },
  { slug: "abeokuta", name: "Abeokuta", state: "Ogun" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  cement: "Cement",
  rebar: "Reinforcement",
  steel: "Steel",
  aggregate: "Aggregates",
  masonry: "Blocks",
  roofing: "Roofing",
  flooring: "Floor and wall tiles",
  drywall: "Ceiling and POP",
  timber: "Timber",
  paint: "Paint",
  plumbing: "Plumbing",
  electrical: "Electrical",
  waterproofing: "Waterproofing",
  doors_windows: "Doors and windows",
  adhesive: "Adhesives",
  filler: "Finishing",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

/** Categories in display order; unknown categories sort after these. */
export const CATEGORY_ORDER = [
  "cement",
  "rebar",
  "steel",
  "aggregate",
  "masonry",
  "roofing",
  "flooring",
  "drywall",
  "paint",
  "waterproofing",
  "plumbing",
  "electrical",
  "doors_windows",
  "timber",
  "adhesive",
  "filler",
];

export async function fetchCities(): Promise<{ cities: MarketCity[]; error: string | null }> {
  const { data, error } = await supabase
    .from("market_cities")
    .select("slug,country_code,name,state,is_active,sort_order")
    .eq("country_code", INDEX_COUNTRY)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return { cities: [], error: error.message };
  return { cities: (data ?? []) as MarketCity[], error: null };
}

export async function fetchIndexMaterials(options?: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<{ materials: IndexMaterial[]; error: string | null }> {
  let query = supabase
    .from("estimation_materials")
    .select("id,name,slug,category")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  if (options?.category) query = query.eq("category", options.category);
  if (options?.search) query = query.ilike("name", `%${options.search}%`);
  query = query.limit(options?.limit ?? 300);

  const { data, error } = await query;
  if (error) return { materials: [], error: error.message };

  return {
    materials: (data ?? []).map((row) => ({
      material_id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      category: row.category as string,
      sale_unit: null,
    })),
    error: null,
  };
}

/**
 * Listings for a market. `citySlug` filters to that city; passing null asks for
 * every city, which is what the comparison view needs.
 */
export async function fetchListings(options?: {
  citySlug?: string | null;
  materialIds?: string[];
  sinceDays?: number;
  limit?: number;
}): Promise<{ listings: IndexListing[]; error: string | null }> {
  let query = supabase
    .from("estimation_prices")
    .select(
      "id,ref_id,price,currency,price_type,market,city_slug,price_kind,sale_unit,supplier_name,source_url,price_source,effective_date,verified_at,verification_status,supporting_submissions,is_active",
    )
    .eq("price_type", "material")
    .eq("market", INDEX_COUNTRY)
    .eq("is_active", true)
    .order("effective_date", { ascending: false })
    .limit(options?.limit ?? 500);

  if (options?.citySlug !== undefined && options.citySlug !== null) {
    query = query.eq("city_slug", options.citySlug);
  }
  if (options?.materialIds?.length) {
    query = query.in("ref_id", options.materialIds);
  }
  if (options?.sinceDays) {
    const cutoff = new Date(Date.now() - options.sinceDays * 86400000)
      .toISOString()
      .slice(0, 10);
    query = query.gte("effective_date", cutoff);
  }

  const { data, error } = await query;
  if (error) return { listings: [], error: error.message };

  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((row) => row.ref_id as string).filter(Boolean)));

  let materials: Record<string, { name: string; slug: string; category: string }> = {};
  if (ids.length) {
    const { data: materialRows } = await supabase
      .from("estimation_materials")
      .select("id,name,slug,category")
      .in("id", ids);
    materials = Object.fromEntries(
      (materialRows ?? []).map((row) => [
        row.id as string,
        {
          name: row.name as string,
          slug: row.slug as string,
          category: row.category as string,
        },
      ]),
    );
  }

  const listings: IndexListing[] = rows
    .filter((row) => materials[row.ref_id as string])
    .map((row) => {
      const material = materials[row.ref_id as string];
      return {
        price_id: row.id as string,
        material_id: row.ref_id as string,
        name: material.name,
        slug: material.slug,
        category: material.category,
        sale_unit: (row.sale_unit as string) ?? null,
        price: Number(row.price),
        currency: (row.currency as string) ?? "NGN",
        price_kind: (row.price_kind as PriceKind) ?? null,
        market: row.market as string,
        city_slug: (row.city_slug as string) ?? null,
        supplier_name: (row.supplier_name as string) ?? null,
        source_url: (row.source_url as string) ?? null,
        price_source: (row.price_source as string) ?? null,
        effective_date: (row.effective_date as string) ?? null,
        verified_at: (row.verified_at as string) ?? null,
        verification_status: (row.verification_status as VerificationStatus) ?? null,
        supporting_submissions: Number(row.supporting_submissions ?? 0),
      };
    });

  return { listings, error: null };
}

/** Recorded changes for one material, oldest first. */
export async function fetchMaterialHistory(
  materialId: string,
  limit = 60,
): Promise<{ points: { observed_at: string; price: number; note: string | null }[]; error: string | null }> {
  const { data, error } = await supabase
    .from("estimation_price_history")
    .select("old_price,new_price,change_reason,created_at")
    .eq("price_type", "material")
    .eq("ref_id", materialId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return { points: [], error: error.message };

  const points = (data ?? [])
    .filter((row) => Number(row.new_price) > 0)
    .map((row) => ({
      observed_at: row.created_at as string,
      price: Number(row.new_price),
      note: (row.change_reason as string) ?? null,
    }));

  return { points, error: null };
}

export async function fetchPendingSubmissions(): Promise<{
  rows: SubmissionRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("price_submissions")
    .select(
      "id,market,city_slug,item_name,estimation_material_id,vendor,price,currency,unit,price_kind,source_url,notes,status,flag_reason,verification_count,created_at,reviewed_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as SubmissionRow[], error: null };
}

export async function fetchAuditTrail(limit = 100): Promise<{
  rows: AuditRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("price_index_audit")
    .select("id,action,entity,entity_id,note,created_at,before,after")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as unknown as AuditRow[], error: null };
}
