/**
 * FRELUX Engine #4, M1: jurisdiction tax catalog (types + fetchers).
 *
 * The catalog is DB-live (tax_catalog table, migration
 * 20261017160000_tax_fx_engine4.sql): every row carries the rate, what it
 * applies to, an official citation, and an effective date. Rates were
 * web-verified on 2026-10-15 (see migration header for the source list).
 */

import { supabase } from "@/lib/supabase";

export interface TaxCatalogRow {
  id: string;
  market_code: string;
  tax_kind: "consumption" | "withholding" | "settlement";
  tax_name: string;
  rate_pct: number | null;
  additional_levies_pct: number;
  applies_to: "materials" | "services" | "both";
  basis: string;
  citation_title: string;
  citation_url: string;
  citation_publisher: string;
  effective_date: string;
  notes: string | null;
  is_active: boolean;
}

const CONSUMPTION_CACHE = new Map<string, TaxCatalogRow[]>();
const CONSUMPTION_TTL_MS = 10 * 60 * 1000;
let cacheClearedAt = 0;

function sweepCache(): void {
  const now = Date.now();
  if (now - cacheClearedAt > CONSUMPTION_TTL_MS) {
    CONSUMPTION_CACHE.clear();
    cacheClearedAt = now;
  }
}

/**
 * Active consumption-tax rows for a market, newest effective_date first.
 * Empty array for unknown markets (the calculator turns that into an
 * honest "unknown", never a default).
 */
export async function fetchConsumptionTaxRows(
  marketCode: string,
): Promise<TaxCatalogRow[]> {
  const cc = (marketCode || "").trim().toUpperCase();
  if (!cc) return [];
  sweepCache();
  const cached = CONSUMPTION_CACHE.get(cc);
  if (cached) return cached;
  const { data, error } = await supabase
    .from("tax_catalog")
    .select("*")
    .eq("market_code", cc)
    .eq("tax_kind", "consumption")
    .eq("is_active", true)
    .order("effective_date", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as TaxCatalogRow[];
  CONSUMPTION_CACHE.set(cc, rows);
  return rows;
}

/** Test hook. */
export function __clearTaxCatalogCache(): void {
  CONSUMPTION_CACHE.clear();
}
