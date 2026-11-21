/**
 * Read side of the market price intelligence tables.
 *
 * `market_price_observations` and `market_price_alerts` are written by the
 * admin console and the price scanner. Until now nothing public read them, so
 * a confirmed supplier observation and an active stale-price alert never
 * reached the people looking at prices. These helpers are the single read path
 * for both, with the same field selection the pages render.
 */

import { supabase } from "@/lib/supabase";

export interface MarketObservation {
  id: string;
  market: string;
  material_slug: string;
  brand: string;
  specification: string;
  unit: string;
  price: number;
  currency: string;
  supplier_name: string | null;
  supplier_location: string | null;
  confidence: "high" | "medium" | "low";
  observed_on: string;
}

export interface MarketPriceAlert {
  id: string;
  market: string;
  material_slug: string | null;
  kind: string;
  severity: "info" | "warning" | "critical";
  message: string;
  value: number | null;
  previous_value: number | null;
  created_at: string;
}

const OBSERVATION_COLUMNS =
  "id,market,material_slug,brand,specification,unit,price,currency,supplier_name,supplier_location,confidence,observed_on";

const ALERT_COLUMNS =
  "id,market,material_slug,kind,severity,message,value,previous_value,created_at";

/** Newest confirmed supplier observations for one market. */
export async function fetchRecentObservations(
  market: string | null | undefined,
  limit = 6,
): Promise<MarketObservation[]> {
  try {
    let query = supabase
      .from("market_price_observations")
      .select(OBSERVATION_COLUMNS)
      .eq("is_test", false)
      .order("observed_on", { ascending: false })
      .limit(limit);
    if (market) query = query.eq("market", market);
    const { data, error } = await query;
    if (error || !data) return [];
    return data as MarketObservation[];
  } catch {
    return [];
  }
}

/** Unacknowledged price alerts for one market, most severe first. */
export async function fetchActiveAlerts(
  market: string | null | undefined,
  limit = 5,
): Promise<MarketPriceAlert[]> {
  try {
    let query = supabase
      .from("market_price_alerts")
      .select(ALERT_COLUMNS)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (market) query = query.eq("market", market);
    const { data, error } = await query;
    if (error || !data) return [];
    const severityRank: Record<string, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    return (data as MarketPriceAlert[]).sort(
      (a, b) =>
        (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3),
    );
  } catch {
    return [];
  }
}

/** Human label for an observation's confidence. */
export function confidenceLabel(
  confidence: MarketObservation["confidence"],
): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "low":
      return "Low confidence";
    default:
      return "Medium confidence";
  }
}
