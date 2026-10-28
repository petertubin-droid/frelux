/**
 * FRELUX Engine #4, M3: FX conversion with provider + timestamp
 * provenance. NO SILENT CROSS-RATES.
 *
 * Rules:
 *  - A pair converts only when a direct recorded rate exists
 *    (fx_rates rows, each carrying provider + fetched_at).
 *  - Otherwise the converter may bridge through an intermediate
 *    currency ONLY when both legs are recorded; the bridge is EXPLICIT
 *    in the result (via + leg provenance) and the caller can refuse it.
 *  - Missing both legs -> honest refusal. Never an invented rate, never
 *    an undisclosed bridge, never a stale-rate lie.
 *  - Freshness: rates older than STALE_WARN_MS are flagged; older than
 *    MAX_AGE_MS the conversion refuses outright (admin must refresh).
 */

import { supabase } from "@/lib/supabase";

export interface FxRateRow {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  provider: string;
  source_url: string;
  fetched_at: string;
  is_active: boolean;
}

export interface FxLeg {
  base: string;
  quote: string;
  rate: number;
  provider: string;
  sourceUrl: string;
  fetchedAt: string;
}

export type FxConversionStatus =
  | "ok" // direct rate used
  | "bridged" // explicit recorded bridge (e.g. via USD)
  | "unavailable" // no direct pair and no complete recorded bridge
  | "stale"; // rate older than MAX_AGE — refused, admin must refresh

export interface FxConversion {
  status: FxConversionStatus;
  from: string;
  to: string;
  amount: number;
  /** Converted amount; null unless ok/bridged. */
  result: number | null;
  /** Effective composite rate actually applied. */
  compositeRate: number | null;
  /** Provenance of each leg actually used. */
  legs: FxLeg[];
  /** Intermediate currency when bridged. */
  via?: string;
  /** Age of the oldest leg used, in milliseconds. */
  oldestLegAgeMs?: number;
  message: string;
}

/** Flag rates older than this in the result message (48h). */
export const STALE_WARN_MS = 48 * 60 * 60 * 1000;
/** Refuse conversions whose oldest leg is older than this (7 days). */
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** USD is the seeded hub currency (all seeded legs are USD-based). */
export const DEFAULT_BRIDGE_CURRENCIES = ["USD"];

function ageMs(iso: string): number {
  return Date.now() - new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime();
}

function toLeg(row: FxRateRow): FxLeg {
  return {
    base: row.base_currency,
    quote: row.quote_currency,
    rate: Number(row.rate),
    provider: row.provider,
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
  };
}

/** All active rows, most recent per pair first. */
export async function fetchFxRateRows(): Promise<FxRateRow[]> {
  const { data, error } = await supabase
    .from("fx_rates")
    .select("*")
    .eq("is_active", true)
    .order("fetched_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FxRateRow[];
}

/** Most recent recorded rate for a direct pair (either direction), or null. */
export function findDirectLeg(
  rows: FxRateRow[],
  from: string,
  to: string,
): { leg: FxLeg; inverted: boolean } | null {
  for (const row of rows) {
    if (row.base_currency === from && row.quote_currency === to) {
      return { leg: toLeg(row), inverted: false };
    }
    if (row.base_currency === to && row.quote_currency === from) {
      return { leg: toLeg(row), inverted: true };
    }
  }
  return null;
}

function verdict(
  legs: FxLeg[],
  compositeRate: number,
  amount: number,
  from: string,
  to: string,
  via: string | undefined,
  status: "ok" | "bridged",
): FxConversion {
  const ages = legs.map((l) => ageMs(l.fetchedAt));
  const oldest = Math.max(...ages);
  if (oldest > MAX_AGE_MS) {
    return {
      status: "stale",
      from,
      to,
      amount,
      result: null,
      compositeRate: null,
      legs,
      via,
      oldestLegAgeMs: oldest,
      message:
        `The recorded ${from}->${to} rate is too old to convert honestly ` +
        "(older than 7 days). The FX rates need refreshing; no rate is estimated.",
    };
  }
  const freshnessNote =
    oldest > STALE_WARN_MS
      ? " Note: the recorded rate is more than 48h old; refresh fx_rates for tighter accuracy."
      : "";
  const result = amount * compositeRate;
  const provenance = legs
    .map((l) => `${l.base}->${l.quote} @ ${l.rate} (${l.provider}, ${l.fetchedAt})`)
    .join("; ");
  return {
    status,
    from,
    to,
    amount,
    result: Math.round(result * 100) / 100,
    compositeRate,
    legs,
    via,
    oldestLegAgeMs: oldest,
    message:
      (via
        ? `Bridged via ${via} using recorded rates only: ${provenance}.${freshnessNote}`
        : `Direct recorded rate: ${provenance}.${freshnessNote}`),
  };
}

/**
 * Convert an amount between two currencies.
 * Direct pair first; otherwise an EXPLICIT recorded bridge through
 * bridgeCurrencies (disclosed in the result). Never invents a rate and
 * never bridges silently.
 */
export function convertWithRows(
  rows: FxRateRow[],
  amount: number,
  from: string,
  to: string,
  opts: { allowBridge?: boolean; bridgeCurrencies?: string[] } = {},
): FxConversion {
  const f = (from || "").trim().toUpperCase();
  const t = (to || "").trim().toUpperCase();
  const refusal = (msg: string): FxConversion => ({
    status: "unavailable",
    from: f,
    to: t,
    amount,
    result: null,
    compositeRate: null,
    legs: [],
    message: msg,
  });
  if (!f || !t) return refusal("Currency codes are required.");
  if (f === t) {
    return {
      status: "ok",
      from: f,
      to: t,
      amount,
      result: amount,
      compositeRate: 1,
      legs: [],
      message: "Same currency; no conversion needed.",
    };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return refusal("A non-negative finite amount is required.");
  }

  const direct = findDirectLeg(rows, f, t);
  if (direct) {
    const rate = direct.inverted ? 1 / direct.leg.rate : direct.leg.rate;
    return verdict([direct.leg], rate, amount, f, t, undefined, "ok");
  }

  if (opts.allowBridge === false) {
    return refusal(
      `No direct recorded ${f}->${t} rate exists and bridging was not allowed. ` +
        "No rate is invented.",
    );
  }
  const bridges = (opts.bridgeCurrencies ?? DEFAULT_BRIDGE_CURRENCIES)
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c && c !== f && c !== t);
  for (const via of bridges) {
    const leg1 = findDirectLeg(rows, f, via);
    const leg2 = findDirectLeg(rows, via, t);
    if (leg1 && leg2) {
      const r1 = leg1.inverted ? 1 / leg1.leg.rate : leg1.leg.rate;
      const r2 = leg2.inverted ? 1 / leg2.leg.rate : leg2.leg.rate;
      return verdict(
        [leg1.leg, leg2.leg],
        r1 * r2,
        amount,
        f,
        t,
        via,
        "bridged",
      );
    }
  }
  return refusal(
    `No recorded ${f}->${t} rate and no complete recorded bridge exist. ` +
      "Configured fx_rates rows are required; no rate is estimated.",
  );
}

/** DB-backed convenience wrapper. */
export async function convertAmount(
  amount: number,
  from: string,
  to: string,
  opts: { allowBridge?: boolean; bridgeCurrencies?: string[] } = {},
): Promise<FxConversion> {
  return convertWithRows(await fetchFxRateRows(), amount, from, to, opts);
}
