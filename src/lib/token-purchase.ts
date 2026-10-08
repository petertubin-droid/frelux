/**
 * FRELUX Token Purchase, Buy tokens (credits) via Paystack
 *
 * The default pack is 50 tokens for ₦1,500, fully configurable from
 * the admin panel (Admin → Credits & Ads → Token Shop tab), which
 * writes to the token_purchase_config table.
 *
 * SECURITY MODEL
 * - The frontend only ever READS the config (price + token amount)
 *   to display it. The price is never trusted on the server:
 *   paystack-checkout re-reads token_purchase_config server-side and
 *   builds the transaction from that, ignoring client-sent amounts.
 * - Tokens are credited by the credit_token_purchase RPC, which is
 *   idempotent on the Paystack reference, so webhook + callback
 *   verification can never double-credit.
 * - The frontend never writes to token_purchases, credit_wallets or
 *   credit_transactions directly.
 */

import {
  isSupabaseConfigured,
  getSupabase,
  getFunctionErrorMessage,
} from "@/lib/supabase-lazy";
import { isPaystackConfigured } from "@/lib/paystack";
import {
  isFlutterwaveConfigured,
  currentGatewayRuntimeConfig,
} from "@/lib/payments/gateway";
import { formatCurrency } from "@/lib/utils";
import {
  isConverting,
  DISPLAY_CURRENCIES,
} from "@/lib/international/fx-display";
import {
  currencyMinorUnits,
  minorToMajor,
} from "@/lib/international/currency-units";

// =========================================================
// Types
// =========================================================

export interface TokenPurchaseConfig {
  id: number;
  token_amount: number;
  price_kobo: number;
  is_enabled: boolean;
  updated_at: string;
}

export interface TokenPurchaseResult {
  success: boolean;
  authorizationUrl?: string;
  reference?: string;
  error?: string;
  code?: string;
  gateway?: "paystack" | "flutterwave";
}

export interface TokenVerifyResult {
  verified: boolean;
  tokens?: number;
  alreadyCredited?: boolean;
  error?: string;
}

/** Format kobo as a Naira string, e.g. 150000 → "₦1,500" */
export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

// =========================================================
// International pricing (worldwide-first): per-currency token pack
// prices, charged through Flutterwave. NGN stays on Paystack.
// =========================================================

export interface TokenPriceRow {
  currency_code: string;
  price_minor: number;
  is_active: boolean;
  updated_at: string;
}

/** How the visitor's chosen display currency can actually be charged. */
export interface TokenCharge {
  /** "naira": the classic NGN pack. "native": configured price charged
   * in the visitor's currency via Flutterwave. */
  mode: "naira" | "native";
  currency: string;
  /** Price in the charge currency's minor units (kobo when NGN). */
  priceMinor: number;
}

/**
 * Resolves how a token purchase is charged for a display currency.
 * Native mode requires an ACTIVE admin-configured price for that
 * currency (never an FX-converted guess). Anything else falls back
 * to the naira pack, which the Buy card then shows as an
 * approximate conversion.
 */
export function resolveTokenCharge(
  priceKobo: number,
  displayCurrency: string | undefined | null,
  prices: TokenPriceRow[] | undefined,
): TokenCharge {
  const code = String(displayCurrency ?? "").toUpperCase();
  const row = (prices ?? []).find(
    (p) =>
      p.currency_code.toUpperCase() === code &&
      p.is_active &&
      p.price_minor > 0,
  );
  if (code && code !== "NGN" && row) {
    return { mode: "native", currency: code, priceMinor: row.price_minor };
  }
  return { mode: "naira", currency: "NGN", priceMinor: priceKobo };
}

/** Symbol for a currency code, from the display-currency registry. */
function symbolFor(code: string): string {
  const meta = DISPLAY_CURRENCIES.find((c) => c.code === code.toUpperCase());
  return meta?.symbol ?? code;
}

/** Formats a minor-unit amount in its own currency, e.g. (99, "USD") → "$0.99". */
export function formatMinor(amountMinor: number, code: string): string {
  const major = minorToMajor(amountMinor, code);
  const units = currencyMinorUnits(code);
  return `${symbolFor(code)}${major.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: units,
  })}`;
}

/**
 * Format the token pack price for the visitor's display currency.
 * Exact when the charge is native (admin-configured price); the naira
 * price converted through the shared display layer otherwise.
 */
export function formatTokenPriceForDisplay(
  kobo: number,
  charge?: TokenCharge,
): string {
  if (charge?.mode === "native") {
    return formatMinor(charge.priceMinor, charge.currency);
  }
  return formatCurrency(kobo / 100, "₦");
}

/**
 * Disclosure shown next to a converted naira price, or null when the
 * visitor is charged in their own currency or already sees naira.
 */
export function tokenPriceDisclosure(
  kobo: number,
  charge?: TokenCharge,
): string | null {
  if (charge?.mode === "native") return null;
  if (!isConverting()) return null;
  return `Approximate. Charged as ${formatNaira(kobo)} at checkout; your bank converts it at its own rate.`;
}

// =========================================================
// Public: read the token pack config (price + amount shown to users)
// =========================================================

export async function getTokenPurchaseConfig(): Promise<TokenPurchaseConfig | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("token_purchase_config")
    .select("id, token_amount, price_kobo, is_enabled, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return data as TokenPurchaseConfig;
}

// =========================================================
// Public: read the per-currency token pack prices
// =========================================================

export async function getTokenPurchasePrices(): Promise<TokenPriceRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("token_purchase_prices")
    .select("currency_code, price_minor, is_active, updated_at");
  if (error || !data) return [];
  return data as TokenPriceRow[];
}

// =========================================================
// User: start a token purchase checkout.
//
// NGN (and any display currency without a configured native price)
// goes through the Paystack naira flow. A configured native currency
// is charged in that currency via Flutterwave — the server resolves
// the price and ignores any client-sent amount.
// =========================================================

export async function initializeTokenPurchase(
  email: string,
  userId: string,
  charge?: TokenCharge,
): Promise<TokenPurchaseResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Not configured", code: "CONFIG_ERROR" };
  }
  const flutterwaveReady = isFlutterwaveConfigured(
    currentGatewayRuntimeConfig(),
  );

  if (charge?.mode === "native") {
    if (!flutterwaveReady) {
      return {
        success: false,
        error:
          "Direct payment in this currency is not available right now. Switch the price back to Naira to buy tokens.",
        code: "FLUTTERWAVE_NOT_CONFIGURED",
      };
    }
    const supabase = await getSupabase();
    try {
      const { data, error } = await supabase.functions.invoke(
        "flutterwave-checkout",
        {
          body: {
            purpose: "token_purchase",
            email,
            user_id: userId,
            currency: charge.currency,
          },
        },
      );
      if (error) {
        return {
          success: false,
          error: await getFunctionErrorMessage(error),
          code: "EDGE_ERROR",
        };
      }
      if (!data?.authorization_url) {
        return {
          success: false,
          error: data?.error || "Invalid response from payment server.",
          code: "INVALID_RESPONSE",
        };
      }
      return {
        success: true,
        authorizationUrl: data.authorization_url,
        reference: data.reference,
        gateway: "flutterwave",
      };
    } catch (_e) {
      return {
        success: false,
        error: "Unable to reach payment service. Please try again.",
        code: "NETWORK_ERROR",
      };
    }
  }

  if (!isPaystackConfigured()) {
    return {
      success: false,
      error: "Payments are not available right now.",
      code: "PAYSTACK_NOT_CONFIGURED",
    };
  }
  const supabase = await getSupabase();
  try {
    const { data, error } = await supabase.functions.invoke(
      "paystack-checkout",
      {
        body: {
          purpose: "token_purchase",
          email,
          user_id: userId,
        },
      },
    );
    if (error) {
      return {
        success: false,
        error: await getFunctionErrorMessage(error),
        code: "EDGE_ERROR",
      };
    }
    if (!data?.data?.authorization_url) {
      return {
        success: false,
        error: data?.error || "Invalid response from payment server.",
        code: "INVALID_RESPONSE",
      };
    }
    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  } catch (_e) {
    return {
      success: false,
      error: "Unable to reach payment service. Please try again.",
      code: "NETWORK_ERROR",
    };
  }
}

// =========================================================
// User: verify the payment after returning from Paystack checkout
// =========================================================

export async function verifyTokenPurchase(
  reference: string,
  gateway: "paystack" | "flutterwave" = "paystack",
): Promise<TokenVerifyResult> {
  if (!isSupabaseConfigured) {
    return { verified: false, error: "Not configured" };
  }
  const supabase = await getSupabase();
  if (gateway === "flutterwave") {
    try {
      const { data, error } = await supabase.functions.invoke(
        "flutterwave-verify",
        {
          body: { tx_ref: reference },
        },
      );
      if (error) {
        return { verified: false, error: await getFunctionErrorMessage(error) };
      }
      if (!data?.verified) {
        return {
          verified: false,
          error: data?.error || "Payment verification failed.",
        };
      }
      return {
        verified: data.purpose === "token_purchase",
        tokens: data.tokens_credited,
        alreadyCredited: data.already_credited ?? false,
      };
    } catch (_e) {
      return { verified: false, error: "Unable to verify payment." };
    }
  }
  try {
    const { data, error } = await supabase.functions.invoke("paystack-verify", {
      body: { reference },
    });
    if (error) {
      return { verified: false, error: await getFunctionErrorMessage(error) };
    }
    if (!data?.status) {
      return {
        verified: false,
        error: data?.message || "Payment verification failed.",
      };
    }
    return {
      verified: data.data?.purpose === "token_purchase",
      tokens: data.data?.tokens_credited,
      alreadyCredited: data.data?.already_credited ?? false,
    };
  } catch (_e) {
    return { verified: false, error: "Unable to verify payment." };
  }
}

// =========================================================
// Admin: token purchase config management (RLS: is_admin())
// =========================================================

export async function adminGetTokenPurchaseConfig(): Promise<TokenPurchaseConfig | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("token_purchase_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return data as TokenPurchaseConfig;
}

export async function adminUpdateTokenPurchaseConfig(
  updates: Partial<
    Pick<TokenPurchaseConfig, "token_amount" | "price_kobo" | "is_enabled">
  >,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("token_purchase_config")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", 1);
  return !error;
}

// =========================================================
// Admin: per-currency token prices (worldwide charging)
// =========================================================

export async function adminGetTokenPrices(): Promise<TokenPriceRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("token_purchase_prices")
    .select("currency_code, price_minor, is_active, updated_at");
  if (error || !data) return [];
  return data as TokenPriceRow[];
}

/**
 * Upsert one currency price (priceMajor is in the currency's major
 * unit, e.g. dollars). A zero/negative price deactivates the row.
 */
export async function adminSaveTokenPrice(
  currency: string,
  priceMajor: number,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const code = currency.toUpperCase();
  if (!DISPLAY_CURRENCIES.some((c) => c.code === code) || code === "NGN") {
    return false;
  }
  const supabase = await getSupabase();
  if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
    // Deactivate instead of storing junk
    const { error } = await supabase
      .from("token_purchase_prices")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("currency_code", code);
    return !error;
  }
  const priceMinor = Math.round(
    priceMajor * Math.pow(10, currencyMinorUnits(code)),
  );
  if (priceMinor <= 0) return false;
  const { error } = await supabase.from("token_purchase_prices").upsert(
    {
      currency_code: code,
      price_minor: priceMinor,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "currency_code" },
  );
  return !error;
}

export async function adminGetTokenPurchases(limit = 50): Promise<
  Array<{
    id: string;
    user_id: string;
    reference: string;
    amount_kobo: number;
    tokens_credited: number;
    status: string;
    currency: string;
    created_at: string;
  }>
> {
  if (!isSupabaseConfigured) return [];
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("token_purchases")
    .select(
      "id, user_id, reference, amount_kobo, tokens_credited, status, currency, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as Array<{
    id: string;
    user_id: string;
    reference: string;
    amount_kobo: number;
    tokens_credited: number;
    status: string;
    currency: string;
    created_at: string;
  }>;
}
