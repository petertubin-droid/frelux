/**
 * Read layer for Market Intelligence.
 *
 * Two rules hold throughout:
 *  - A returned number always carries where it came from (provider, publisher,
 *    retailer) and when it was true (as_of / fetched_at / period_start).
 *  - A missing figure is `null` with a reason, never a zero standing in for
 *    "unknown". Pages render "—" and say why.
 */
import { supabase } from "@/lib/supabase";
import type { Candle } from "./chart";

export interface Company {
  symbol: string;
  name: string;
  exchange: string;
  country_code: string;
  sector: string;
  industry: string | null;
  currency: string;
  website: string | null;
  description: string | null;
  is_featured: boolean;
  sort_order: number;
}

export interface Quote {
  symbol: string;
  price: number | null;
  previous_close: number | null;
  change_abs: number | null;
  change_pct: number | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  market_cap: number | null;
  currency: string | null;
  exchange: string | null;
  provider: string;
  is_delayed: boolean;
  as_of: string | null;
  fetched_at: string;
}

export interface ProviderStatus {
  configured: boolean;
  providers: {
    slug: string;
    label: string;
    capabilities: string[];
    requires_key: boolean;
    key_env_var: string | null;
    is_enabled: boolean;
    update_frequency_minutes: number;
    last_ok_at: string | null;
    last_error: string | null;
    last_error_at: string | null;
    has_key: boolean;
  }[];
  message?: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string | null;
  url: string;
  source_name: string;
  source_url: string | null;
  category: string;
  symbol: string | null;
  market_code: string | null;
  published_at: string;
}

export interface IndexSeriesRow {
  market: string;
  country_name: string | null;
  index_code: string;
  index_name: string;
  category: string;
  period_start: string;
  period_label: string | null;
  index_value: number;
  base_period: string | null;
  publisher: string | null;
  source_url: string | null;
  licence_name: string | null;
  attribution_text: string | null;
}

export interface MarketSummaryRow {
  market_code: string;
  metric: string;
  value: number;
  unit: string | null;
  source_name: string | null;
  source_url: string | null;
  as_of: string | null;
  confidence: string | null;
}

export interface MaterialSample {
  id: string;
  market: string;
  material_slug: string;
  retailer: string | null;
  product_name: string;
  price: number;
  currency: string;
  unit: string | null;
  status: string;
  source_url: string | null;
  observed_at: string;
}

export interface MarketProfile {
  country_code: string;
  country_name: string;
  region: string | null;
  currency_code: string;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; data?: T };

function fail<T>(message: string, data?: T): Result<T> {
  return { ok: false, message, data };
}

// ── Companies ───────────────────────────────────────────────────────────
export async function listCompanies(): Promise<Result<Company[]>> {
  const { data, error } = await supabase
    .from("mi_companies")
    .select("symbol,name,exchange,country_code,sector,industry,currency,website,description,is_featured,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return fail(error.message, []);
  return { ok: true, data: (data ?? []) as Company[] };
}

export async function getCompany(symbol: string): Promise<Result<Company | null>> {
  const { data, error } = await supabase
    .from("mi_companies")
    .select("symbol,name,exchange,country_code,sector,industry,currency,website,description,is_featured,sort_order")
    .eq("symbol", symbol.toUpperCase())
    .maybeSingle();
  if (error) return fail(error.message, null);
  return { ok: true, data: (data as Company) ?? null };
}

// ── Stock data via the market-stocks edge function ──────────────────────
async function invoke<T>(body: Record<string, unknown>): Promise<Result<T>> {
  try {
    const { data, error } = await supabase.functions.invoke<T>("market-stocks", { body });
    if (error) return fail(error.message);
    return { ok: true, data: data as T };
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function fetchProviderStatus(): Promise<Result<ProviderStatus>> {
  const res = await invoke<ProviderStatus>({ action: "status" });
  if (!res.ok) return res;
  return { ok: true, data: { ...res.data, providers: res.data.providers ?? [] } };
}

export async function fetchQuotes(symbols: string[]): Promise<Result<{ configured: boolean; quotes: Quote[]; message?: string }>> {
  if (symbols.length === 0) return { ok: true, data: { configured: true, quotes: [] } };
  const res = await invoke<{ configured: boolean; quotes: Quote[]; message?: string }>({
    action: "quotes",
    symbols: symbols.slice(0, 40),
  });
  if (!res.ok) return res;
  return { ok: true, data: { configured: res.data.configured, quotes: res.data.quotes ?? [], message: res.data.message } };
}

export async function fetchCandles(
  symbol: string,
  range: string,
): Promise<Result<{ configured: boolean; candles: Candle[]; provider?: string | null; message?: string }>> {
  const res = await invoke<{ configured: boolean; candles: Candle[]; provider?: string | null; message?: string }>({
    action: "candles",
    symbol,
    range,
  });
  if (!res.ok) return res;
  return {
    ok: true,
    data: {
      configured: res.data.configured,
      candles: (res.data.candles ?? []) as Candle[],
      provider: res.data.provider,
      message: res.data.message,
    },
  };
}

export async function listCachedCandles(symbol: string, days: number): Promise<Candle[]> {
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from("mi_stock_candles")
    .select("ts,open,high,low,close,volume")
    .eq("symbol", symbol.toUpperCase())
    .gte("ts", from)
    .order("ts", { ascending: true });
  return (data ?? []) as Candle[];
}

// ── News ────────────────────────────────────────────────────────────────
export async function listNews(options: { limit?: number; category?: string } = {}): Promise<Result<NewsItem[]>> {
  let query = supabase
    .from("mi_market_news")
    .select("id,headline,summary,url,source_name,source_url,category,symbol,market_code,published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 30);
  if (options.category && options.category !== "all") query = query.eq("category", options.category);
  const { data, error } = await query;
  if (error) return fail(error.message, []);
  return { ok: true, data: (data ?? []) as NewsItem[] };
}

// ── Official index series (BLS PPI and similar, with attribution) ───────
export async function listIndexSeries(options: { market?: string; category?: string; limit?: number } = {}): Promise<Result<IndexSeriesRow[]>> {
  let query = supabase
    .from("market_index_series")
    .select("market,country_name,index_code,index_name,category,period_start,period_label,index_value,base_period,publisher,source_url,licence_name,attribution_text")
    .order("period_start", { ascending: true })
    .limit(options.limit ?? 500);
  if (options.market && options.market !== "all") query = query.eq("market", options.market);
  if (options.category && options.category !== "all") query = query.eq("category", options.category);
  const { data, error } = await query;
  if (error) return fail(error.message, []);
  return {
    ok: true,
    data: (data ?? []).map((r) => ({ ...r, index_value: Number(r.index_value) })) as IndexSeriesRow[],
  };
}

export async function listMarketRankings(metric?: string): Promise<Result<MarketSummaryRow[]>> {
  let query = supabase
    .from("market_rankings")
    .select("market_code,metric,value,unit,source_name,source_url,as_of,confidence")
    .order("value", { ascending: false })
    .limit(200);
  if (metric) query = query.eq("metric", metric);
  const { data, error } = await query;
  if (error) return fail(error.message, []);
  return {
    ok: true,
    data: (data ?? []).map((r) => ({ ...r, value: Number(r.value) })) as MarketSummaryRow[],
  };
}

// ── Retailer-observed material prices ───────────────────────────────────
export async function listMaterialSamples(
  options: { market?: string; limit?: number } = {},
): Promise<Result<MaterialSample[]>> {
  let query = supabase
    .from("price_scan_candidates")
    .select("id,market,material_slug,retailer,product_name,scraped_price,currency,unit,status,product_url,created_at")
    .not("scraped_price", "is", null)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 300);
  if (options.market && options.market !== "all") query = query.eq("market", options.market);
  const { data, error } = await query;
  if (error) return fail(error.message, []);
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: String(r.id),
      market: String(r.market),
      material_slug: String(r.material_slug),
      retailer: (r.retailer as string) ?? null,
      product_name: String(r.product_name),
      price: Number(r.scraped_price),
      currency: String(r.currency ?? ""),
      unit: (r.unit as string) ?? null,
      status: String(r.status ?? "candidate"),
      source_url: (r.product_url as string) ?? null,
      observed_at: String(r.created_at),
    })) as MaterialSample[],
  };
}

export async function listMarketProfiles(): Promise<MarketProfile[]> {
  const { data } = await supabase
    .from("market_profiles")
    .select("country_code,country_name,region,currency_code")
    .order("country_name", { ascending: true });
  return (data ?? []) as MarketProfile[];
}

// ── Investor centre (authenticated, RLS enforced server-side) ───────────
export interface InvestorSnapshot {
  traffic: { pageviews30d: number | null; visitors30d: number | null };
  users: { total: number | null; new30d: number | null };
  revenue: { purchases30d: number | null; amount30dMinor: number | null; currency: string | null };
  documents: { id: string; title: string; period: string | null; doc_type: string; file_url: string | null; summary: string | null; published_at: string }[];
  errors: string[];
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function loadInvestorSnapshot(): Promise<InvestorSnapshot> {
  const errors: string[] = [];
  const snapshot: InvestorSnapshot = {
    traffic: { pageviews30d: null, visitors30d: null },
    users: { total: null, new30d: null },
    revenue: { purchases30d: null, amount30dMinor: null, currency: null },
    documents: [],
    errors,
  };

  const since = daysAgo(30);

  const events = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (events.error) errors.push(`traffic: ${events.error.message}`);
  else snapshot.traffic.pageviews30d = events.count ?? 0;

  const visitors = await supabase
    .from("analytics_events")
    .select("visitor_id")
    .gte("created_at", since)
    .not("visitor_id", "is", null)
    .limit(20000);
  if (visitors.error) errors.push(`visitors: ${visitors.error.message}`);
  else snapshot.traffic.visitors30d = new Set((visitors.data ?? []).map((r) => r.visitor_id)).size;

  const users = await supabase.from("profiles").select("id", { count: "exact", head: true });
  if (users.error) errors.push(`users: ${users.error.message}`);
  else snapshot.users.total = users.count ?? 0;

  const newUsers = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (newUsers.error) errors.push(`new users: ${newUsers.error.message}`);
  else snapshot.users.new30d = newUsers.count ?? 0;

  const purchases = await supabase
    .from("subscription_purchases")
    .select("amount_kobo,currency")
    .gte("created_at", since);
  if (purchases.error) errors.push(`revenue: ${purchases.error.message}`);
  else {
    const rows = purchases.data ?? [];
    snapshot.revenue.purchases30d = rows.length;
    snapshot.revenue.amount30dMinor = rows.reduce((sum, r) => sum + Number(r.amount_kobo ?? 0), 0);
    snapshot.revenue.currency = rows[0]?.currency ?? null;
  }

  const docs = await supabase
    .from("mi_investor_documents")
    .select("id,title,period,doc_type,file_url,summary,published_at")
    .order("published_at", { ascending: false })
    .limit(24);
  if (docs.error) errors.push(`documents: ${docs.error.message}`);
  else snapshot.documents = (docs.data ?? []) as InvestorSnapshot["documents"];

  return snapshot;
}

/** True when the signed-in user may open the investor centre. RLS decides too. */
export async function isInvestorAuthorised(): Promise<boolean> {
  const { data, error } = await supabase
    .from("mi_investor_access")
    .select("user_id")
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}
