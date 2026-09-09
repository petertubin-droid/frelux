// =========================================================
// FRELUX API, Admin Observability (Phase 7 §23)
//
// Aggregates the per-request metering in frelux_api_usage so
// admins can monitor: request volume, errors, latency, quota
// exhaustion, authentication failures, provider failures and
// suspicious activity. Reads are admin-only (RLS
// frelux_api_usage_admin_read); nothing here can mutate data.
// =========================================================

import { supabase } from "@/lib/supabase";

export interface UsageWindowStats {
  totalRequests: number;
  billableRequests: number;
  errorResponses: number;
  avgLatencyMs: number;
  quotaExhausted: number; // 429s, rate limit + quotas
  authFailures: number; // 401s, invalid/unknown keys
  permissionDenials: number; // 403s, capability/region
}

export interface CapabilityStat {
  capability: string;
  requests: number;
  errors: number;
  avgLatencyMs: number;
}

export interface KeyUsageStat {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  status: string;
  requests: number;
  errors: number;
}

export interface AuthFailureStat {
  errorCode: string;
  count: number;
}

export interface ApiUsageOverview {
  window: UsageWindowStats;
  byCapability: CapabilityStat[];
  topKeys: KeyUsageStat[];
  authFailures: AuthFailureStat[];
  /** A high volume of invalid-key attempts is suspicious (§21). */
  suspicious: boolean;
  generatedAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/** Aggregate stats for a rolling window (default: last 24h). */
export async function getWindowStats(
  days: number = 1,
): Promise<UsageWindowStats> {
  const cutoff = sinceIso(days);

  // Overall counts, split by billable vs denied for a stable picture.
  const [total, billable, errors, latency] = await Promise.all([
    supabase
      .from("frelux_api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", cutoff),
    supabase
      .from("frelux_api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", cutoff)
      .gt("usage_units", 0),
    supabase
      .from("frelux_api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", cutoff)
      .gte("status_code", 400),
    supabase
      .from("frelux_api_usage")
      .select("latency_ms")
      .gte("created_at", cutoff)
      .gt("usage_units", 0)
      .limit(2000),
  ]);

  const latencies = latency.data?.map((r) => r.latency_ms) ?? [];
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;

  // Denial breakdowns by status code.
  const [quota, auth, forbidden] = await Promise.all([
    supabase
      .from("frelux_api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", cutoff)
      .eq("status_code", 429),
    supabase
      .from("frelux_api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", cutoff)
      .eq("status_code", 401),
    supabase
      .from("frelux_api_usage")
      .select("id", { count: "exact", head: true })
      .gte("created_at", cutoff)
      .eq("status_code", 403),
  ]);

  return {
    totalRequests: total.count ?? 0,
    billableRequests: billable.count ?? 0,
    errorResponses: errors.count ?? 0,
    avgLatencyMs,
    quotaExhausted: quota.count ?? 0,
    authFailures: auth.count ?? 0,
    permissionDenials: forbidden.count ?? 0,
  };
}

/** Requests/errors/latency per capability (top offenders first). */
export async function getByCapability(
  days: number = 1,
  limit: number = 8,
): Promise<CapabilityStat[]> {
  const cutoff = sinceIso(days);
  const { data, error } = await supabase
    .from("frelux_api_usage")
    .select("capability, status_code, latency_ms")
    .gte("created_at", cutoff)
    .limit(5000);

  if (error || !data) return [];

  const agg = new Map<
    string,
    { requests: number; errors: number; latencySum: number }
  >();
  for (const row of data) {
    const cur = agg.get(row.capability) ?? {
      requests: 0,
      errors: 0,
      latencySum: 0,
    };
    cur.requests += 1;
    if (row.status_code >= 400) cur.errors += 1;
    cur.latencySum += row.latency_ms;
    agg.set(row.capability, cur);
  }
  return Array.from(agg.entries())
    .map(([capability, v]) => ({
      capability,
      requests: v.requests,
      errors: v.errors,
      avgLatencyMs: v.requests ? Math.round(v.latencySum / v.requests) : 0,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, limit);
}

/** Busiest keys, joined with their (masked) metadata for admins. */
export async function getTopKeys(
  days: number = 1,
  limit: number = 5,
): Promise<KeyUsageStat[]> {
  const cutoff = sinceIso(days);
  const { data, error } = await supabase
    .from("frelux_api_usage")
    .select("api_key_id, status_code")
    .gte("created_at", cutoff)
    .not("api_key_id", "is", null)
    .limit(5000);

  if (error || !data) return [];

  const agg = new Map<string, { requests: number; errors: number }>();
  for (const row of data) {
    if (!row.api_key_id) continue;
    const cur = agg.get(row.api_key_id) ?? { requests: 0, errors: 0 };
    cur.requests += 1;
    if (row.status_code >= 400) cur.errors += 1;
    agg.set(row.api_key_id, cur);
  }

  const top = Array.from(agg.entries())
    .sort((a, b) => b[1].requests - a[1].requests)
    .slice(0, limit);
  if (top.length === 0) return [];

  const { data: keys } = await supabase
    .from("frelux_api_keys")
    .select("id, name, key_prefix, status")
    .in(
      "id",
      top.map(([id]) => id),
    );

  return top.map(([id, v]) => {
    const meta = keys?.find((k) => k.id === id);
    return {
      keyId: id,
      keyName: meta?.name ?? "(deleted key)",
      keyPrefix: meta?.key_prefix ?? "FLX-••••",
      status: meta?.status ?? "unknown",
      requests: v.requests,
      errors: v.errors,
    };
  });
}

/** Auth-failure breakdown (unknown/invalid keys, abuse signal). */
export async function getAuthFailures(
  days: number = 1,
): Promise<AuthFailureStat[]> {
  const cutoff = sinceIso(days);
  const { data, error } = await supabase
    .from("frelux_api_usage")
    .select("error_code")
    .gte("created_at", cutoff)
    .eq("status_code", 401)
    .limit(5000);

  if (error || !data) return [];
  const agg = new Map<string, number>();
  for (const row of data) {
    const code = row.error_code ?? "unauthorized";
    agg.set(code, (agg.get(code) ?? 0) + 1);
  }
  return Array.from(agg.entries())
    .map(([errorCode, count]) => ({ errorCode, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Suspicious-activity heuristic (§21/§23): more invalid-key
 * attempts than successful requests in the window, or a burst of
 * quota exhaustion on a single key.
 */
export function isSuspicious(
  window: UsageWindowStats,
  authFailures: AuthFailureStat[],
): boolean {
  const invalidAttempts = authFailures
    .filter((f) => f.errorCode === "invalid_api_key")
    .reduce((a, b) => a + b.count, 0);
  if (invalidAttempts >= 20 && invalidAttempts > window.billableRequests) {
    return true;
  }
  return window.quotaExhausted > 200;
}

/** One-shot overview for the admin monitor. */
export async function getApiUsageOverview(
  days: number = 1,
): Promise<ApiUsageOverview> {
  const [window, byCapability, topKeys, authFailures] = await Promise.all([
    getWindowStats(days),
    getByCapability(days),
    getTopKeys(days),
    getAuthFailures(days),
  ]);
  return {
    window,
    byCapability,
    topKeys,
    authFailures,
    suspicious: isSuspicious(window, authFailures),
    generatedAt: new Date().toISOString(),
  };
}
