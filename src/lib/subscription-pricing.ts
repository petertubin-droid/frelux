// =========================================================
// Subscription prices in each market's own currency
//
// USD remains canonical: it is what the plan catalog defines and what the
// server prices from. Every one of the 32 markets also gets a local price,
// seeded in `subscription_local_prices` from the USD price with that
// currency's rate and rounding. The pricing page shows the local price and
// the dollar anchor, and checkout charges exactly the local row that was
// shown - the row is the quote, so display and charge can never disagree.
// =========================================================

import { supabase } from "@/lib/supabase";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import {
  SUBSCRIPTION_CURRENCY,
  formatUsdPrice,
  type PricingPlan,
} from "@/lib/pricing-plans";

export interface LocalPriceRow {
  market_code: string;
  plan: string;
  billing_cycle: "monthly" | "yearly";
  currency: string;
  /** Minor units in the row's currency (cents, kobo, yen). */
  price_minor: number;
}

export interface DisplayedPrice {
  /** Currency the price is shown in. */
  currency: string;
  /** Price in that currency's minor units, as charged. */
  amountMinor: number;
  /** Formatted local price, e.g. "₦15,500". */
  formatted: string;
  /** Formatted dollar price, always shown as the anchor. */
  usdFormatted: string;
  /** True when the displayed currency is USD itself. */
  isUsd: boolean;
}

/** Currency of a market, from the canonical market profiles. */
export function marketCurrencyCode(
  marketCode: string | null | undefined,
): string {
  if (!marketCode) return SUBSCRIPTION_CURRENCY;
  const profile = BUILTIN_MARKET_PROFILES.find(
    (p) => p.country_code === marketCode.toUpperCase(),
  );
  return profile?.currency_code ?? SUBSCRIPTION_CURRENCY;
}

/** Currencies with no minor unit (yen, won, rupiah, CFA). */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "IDR", "XOF", "CLP", "VND"]);

export function currencyExponent(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

export function formatLocalPrice(
  amountMinor: number,
  currency: string,
): string {
  const exp = currencyExponent(currency);
  const major = amountMinor / 10 ** exp;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: exp === 0 ? 0 : 2,
      maximumFractionDigits: exp === 0 ? 0 : 2,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(exp)}`;
  }
}

/** Row for this market/plan/cycle, or null when that market has no local price. */
export function pickLocalPrice(
  rows: LocalPriceRow[],
  marketCode: string | null | undefined,
  planId: string,
  cycle: "monthly" | "yearly",
): LocalPriceRow | null {
  if (!marketCode) return null;
  return (
    rows.find(
      (r) =>
        r.market_code.toUpperCase() === marketCode.toUpperCase() &&
        r.plan === planId &&
        r.billing_cycle === cycle &&
        Number(r.price_minor) > 0,
    ) ?? null
  );
}

/**
 * What to show for a plan. Falls back to the dollar price whenever the
 * market has no local row: never a guessed conversion on the client.
 */
export function displayedPrice(
  plan: PricingPlan,
  cycle: "monthly" | "yearly",
  marketCode: string | null | undefined,
  rows: LocalPriceRow[],
): DisplayedPrice {
  const usdMajor = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const usdFormatted = formatUsdPrice(usdMajor);
  const row =
    plan.monthlyPrice > 0
      ? pickLocalPrice(rows, marketCode, plan.id, cycle)
      : null;

  if (!row) {
    return {
      currency: SUBSCRIPTION_CURRENCY,
      amountMinor: Math.round(usdMajor * 100),
      formatted: usdFormatted,
      usdFormatted,
      isUsd: true,
    };
  }

  return {
    currency: row.currency.toUpperCase(),
    amountMinor: Math.round(row.price_minor),
    formatted: formatLocalPrice(row.price_minor, row.currency),
    usdFormatted,
    isUsd: row.currency.toUpperCase() === SUBSCRIPTION_CURRENCY,
  };
}

/** Load every local price once; a failure means USD display, never a crash. */
export async function loadLocalSubscriptionPrices(): Promise<LocalPriceRow[]> {
  const { data, error } = await supabase
    .from("subscription_local_prices")
    .select("market_code, plan, billing_cycle, currency, price_minor")
    .eq("active", true);
  if (error || !data) return [];
  return data as LocalPriceRow[];
}
