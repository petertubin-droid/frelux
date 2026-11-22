// =========================================================
// FRELUX PAY — Bitcoin Payment Client
// Connects to BTCPay Server via Supabase Edge Functions
// =========================================================

import { supabase, getFunctionErrorMessage } from "@/lib/supabase";
import type { SubscriptionPlan } from "@/lib/subscription";

export interface BtcPayInvoiceResult {
  invoice_id: string;
  checkout_url: string;
  btc_address: string;
  amount_btc: number;
  amount_sats: number;
  amount_fiat: number;
  currency_fiat: string;
  rate_fiat: number;
  qr_code_data: string;
  expires_at: string;
}

export interface BtcPayVerificationResult {
  invoice_id: string;
  status:
    "Pending" | "Processing" | "Confirmed" | "Expired" | "Failed" | "Refunded";
  activated: boolean;
  amount_btc?: number;
  amount_fiat?: number;
  currency_fiat?: string;
  expires_at?: string;
}

export interface UserCryptoInvoiceRow {
  id: string;
  invoice_id: string;
  purpose: string;
  plan_id?: string;
  billing_cycle?: string;
  amount_fiat: number;
  currency_fiat: string;
  amount_btc: number;
  amount_sats: number;
  btc_address?: string;
  payment_method: string;
  status:
    "Pending" | "Processing" | "Confirmed" | "Expired" | "Failed" | "Refunded";
  expires_at: string;
  confirmed_at?: string;
  created_at: string;
}

/** Initialize a Bitcoin invoice via btcpay-checkout */
export async function initializeBtcPayCheckout(params: {
  planId: SubscriptionPlan;
  billingCycle: "monthly" | "yearly";
  marketCode?: string | null;
  originMarketCode?: string | null;
  email?: string;
}): Promise<BtcPayInvoiceResult> {
  const { data, error } = await supabase.functions.invoke("btcpay-checkout", {
    body: {
      purpose: "subscription",
      plan_id: params.planId,
      billing_cycle: params.billingCycle,
      market_code: params.marketCode ?? null,
      origin_market: params.originMarketCode ?? null,
      email: params.email,
    },
  });

  if (error) {
    const msg = await getFunctionErrorMessage(error);
    throw new Error(msg || "Failed to initialize Bitcoin invoice");
  }

  if (!data?.invoice_id) {
    throw new Error(
      data?.error || "BTCPay server returned an invalid invoice response",
    );
  }

  return data as BtcPayInvoiceResult;
}

/** Poll or manually verify BTCPay invoice status */
export async function verifyBtcPayInvoice(
  invoiceId: string,
): Promise<BtcPayVerificationResult> {
  const { data, error } = await supabase.functions.invoke("btcpay-verify", {
    body: { invoice_id: invoiceId },
  });

  if (error) {
    const msg = await getFunctionErrorMessage(error);
    throw new Error(msg || "Failed to verify Bitcoin invoice status");
  }

  return data as BtcPayVerificationResult;
}

/** Fetch user's crypto invoices for the dashboard */
export async function fetchUserCryptoInvoices(
  userId: string,
): Promise<UserCryptoInvoiceRow[]> {
  try {
    if (!supabase || typeof supabase.from !== "function") return [];
    const query = supabase
      .from("crypto_payment_invoices")
      .select("*") as unknown as {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => PromiseLike<{
            data: UserCryptoInvoiceRow[] | null;
            error: unknown | null;
          }>;
        };
      };
    if (typeof query?.eq !== "function") return [];
    const { data, error } = await query
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as UserCryptoInvoiceRow[];
  } catch {
    return [];
  }
}

/** Format BTC amount to 8 decimal places */
export function formatBtc(amount: number | string | undefined | null): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return "0.00000000";
  return num.toFixed(8);
}

/** Format satoshis with commas */
export function formatSats(sats: number | undefined | null): string {
  const val = Math.round(sats ?? 0);
  return val.toLocaleString();
}
