// =========================================================
// FRELUX PAY — NOWPayments Multi-Crypto Payment Client
// Connects to NOWPayments via Supabase Edge Functions
// =========================================================

import { supabase, getFunctionErrorMessage } from "@/lib/supabase";
import type { SubscriptionPlan } from "@/lib/subscription";

export interface NowPaymentsInvoiceResult {
  success: boolean;
  invoice_id: string;
  checkout_url: string;
  amount_fiat: number;
  currency_fiat: string;
  order_id: string;
  expires_at?: string;
}

export interface NowPaymentsVerificationResult {
  success: boolean;
  invoice_id: string;
  status:
    "Pending" | "Processing" | "Confirmed" | "Expired" | "Failed" | "Refunded";
  activated: boolean;
  fulfilled: boolean;
  amount_fiat?: number;
  currency_fiat?: string;
  expires_at?: string;
}

/** Initialize a NOWPayments multi-crypto invoice via nowpayments-checkout */
export async function initializeNowPaymentsCheckout(params: {
  planId: SubscriptionPlan;
  billingCycle: "monthly" | "yearly";
  marketCode?: string | null;
  originMarketCode?: string | null;
  payCurrency?: string;
  email?: string;
}): Promise<NowPaymentsInvoiceResult> {
  const { data, error } = await supabase.functions.invoke(
    "nowpayments-checkout",
    {
      body: {
        purpose: "subscription",
        plan_id: params.planId,
        billing_cycle: params.billingCycle,
        market_code: params.marketCode ?? null,
        origin_market: params.originMarketCode ?? null,
        pay_currency: params.payCurrency ?? null,
        email: params.email,
      },
    },
  );

  if (error) {
    const msg = await getFunctionErrorMessage(error);
    throw new Error(msg || "Failed to initialize NOWPayments invoice");
  }

  if (!data?.checkout_url) {
    throw new Error(
      data?.error || "NOWPayments did not return a valid checkout URL",
    );
  }

  return data as NowPaymentsInvoiceResult;
}

/** Verify NOWPayments invoice status */
export async function verifyNowPaymentsInvoice(
  invoiceIdOrOrderId: string,
): Promise<NowPaymentsVerificationResult> {
  const isOrderId = invoiceIdOrOrderId.startsWith("FRX-");
  const { data, error } = await supabase.functions.invoke(
    "nowpayments-verify",
    {
      body: isOrderId
        ? { order_id: invoiceIdOrOrderId }
        : { invoice_id: invoiceIdOrOrderId },
    },
  );

  if (error) {
    const msg = await getFunctionErrorMessage(error);
    throw new Error(msg || "Failed to verify NOWPayments invoice status");
  }

  return data as NowPaymentsVerificationResult;
}
