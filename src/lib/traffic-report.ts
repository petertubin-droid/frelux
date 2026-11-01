// Admin traffic reporting.
//
// Numbers come from the site's own page views (analytics_events), aggregated
// inside Postgres by frelux_traffic_report(). Google Analytics remains the
// external report of record; its measurement ID is surfaced here so the admin
// can see whether the tag is live without hunting through another screen.

import { getSupabase } from "@/lib/supabase-lazy";

export interface TrafficTotals {
  page_views: number;
  visitors: number;
  sessions: number;
  events: number;
}

export interface TrafficDailyPoint {
  date: string;
  page_views: number;
  visitors: number;
}

export interface TrafficPage {
  path: string;
  views: number;
  visitors: number;
}

export interface TrafficSource {
  source: string;
  visits: number;
  visitors: number;
}

export interface TrafficDevice {
  device: string;
  visitors: number;
}

export interface TrafficReport {
  days: number;
  generated_at: string;
  totals: TrafficTotals;
  active_now: number;
  daily: TrafficDailyPoint[];
  pages: TrafficPage[];
  sources: TrafficSource[];
  devices: TrafficDevice[];
}

export interface Ga4Configuration {
  measurementId: string | null;
  enabled: boolean;
  source: "integration_settings" | "site_settings" | "static" | "none";
}

const EMPTY_TOTALS: TrafficTotals = {
  page_views: 0,
  visitors: 0,
  sessions: 0,
  events: 0,
};

export function emptyReport(days: number): TrafficReport {
  return {
    days,
    generated_at: new Date().toISOString(),
    totals: EMPTY_TOTALS,
    active_now: 0,
    daily: [],
    pages: [],
    sources: [],
    devices: [],
  };
}

/**
 * Reads the aggregated traffic report. Returns an empty report plus a message
 * when the database function is not available yet, so the dashboard can show a
 * real setup state instead of invented numbers.
 */
export async function fetchTrafficReport(
  days: number,
): Promise<{ report: TrafficReport; error: string | null }> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("frelux_traffic_report", {
      p_days: days,
    });

    if (error) {
      return { report: emptyReport(days), error: error.message };
    }
    if (!data) {
      return { report: emptyReport(days), error: null };
    }

    const raw = data as Partial<TrafficReport>;
    return {
      report: {
        days: raw.days ?? days,
        generated_at: raw.generated_at ?? new Date().toISOString(),
        totals: { ...EMPTY_TOTALS, ...(raw.totals ?? {}) },
        active_now: raw.active_now ?? 0,
        daily: raw.daily ?? [],
        pages: raw.pages ?? [],
        sources: raw.sources ?? [],
        devices: raw.devices ?? [],
      },
      error: null,
    };
  } catch (err) {
    return {
      report: emptyReport(days),
      error: err instanceof Error ? err.message : "Traffic report unavailable",
    };
  }
}

/** Where the GA4 measurement ID is configured, if anywhere. */
export async function fetchGa4Configuration(): Promise<Ga4Configuration> {
  try {
    const supabase = await getSupabase();

    const { data: integration } = await supabase
      .from("integration_settings")
      .select("is_enabled, config")
      .eq("integration_key", "google_analytics")
      .maybeSingle();

    const config = (integration?.config ?? {}) as { measurement_id?: string };
    const id = (config.measurement_id ?? "").trim();
    if (id) {
      return {
        measurementId: id,
        enabled: Boolean(integration?.is_enabled),
        source: "integration_settings",
      };
    }

    const { data: settings } = await supabase
      .from("site_settings")
      .select("ga_measurement_id")
      .limit(1)
      .maybeSingle();

    const legacy = (settings?.ga_measurement_id ?? "").trim();
    if (legacy) {
      return {
        measurementId: legacy,
        enabled: true,
        source: "site_settings",
      };
    }
  } catch {
    // fall through to static config
  }

  const statically = import.meta.env.VITE_GA_MEASUREMENT_ID as
    string | undefined;
  if (statically?.trim()) {
    return {
      measurementId: statically.trim(),
      enabled: true,
      source: "static",
    };
  }

  return { measurementId: null, enabled: false, source: "none" };
}

export interface Ga4Summary {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  periodDays: number;
}

/**
 * Optional GA4 Data API bridge. Returns null whenever the bridge is not
 * configured (no service account / property id) or the call fails, and the
 * dashboard falls back to first-party traffic only.
 */
export async function fetchGa4Summary(
  days: number,
): Promise<Ga4Summary | null> {
  try {
    const supabase = await getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return null;

    const base = (
      import.meta.env.VITE_SUPABASE_URL as string | undefined
    )?.replace(/\/$/, "");
    if (!base) return null;

    const response = await fetch(`${base}/functions/v1/ga4-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "",
      },
      body: JSON.stringify({ days }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      configured?: boolean;
      activeUsers?: number;
      sessions?: number;
      pageViews?: number;
      periodDays?: number;
    };
    if (!payload.configured) return null;
    return {
      activeUsers: payload.activeUsers ?? 0,
      sessions: payload.sessions ?? 0,
      pageViews: payload.pageViews ?? 0,
      periodDays: payload.periodDays ?? days,
    };
  } catch {
    return null;
  }
}
