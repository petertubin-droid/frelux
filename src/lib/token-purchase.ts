/**
 * FRELUX Token Purchase — Buy tokens (credits) via Paystack
 *
 * The default pack is 50 tokens for ₦1,500 — fully configurable from
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
// User: start a token purchase checkout
// =========================================================

export async function initializeTokenPurchase(
  email: string,
  userId: string,
): Promise<TokenPurchaseResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Not configured", code: "CONFIG_ERROR" };
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
): Promise<TokenVerifyResult> {
  if (!isSupabaseConfigured) {
    return { verified: false, error: "Not configured" };
  }
  const supabase = await getSupabase();
  try {
    const { data, error } = await supabase.functions.invoke(
      "paystack-verify",
      { body: { reference } },
    );
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

export async function adminGetTokenPurchases(limit = 50): Promise<
  Array<{
    id: string;
    user_id: string;
    reference: string;
    amount_kobo: number;
    tokens_credited: number;
    status: string;
    created_at: string;
  }>
> {
  if (!isSupabaseConfigured) return [];
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("token_purchases")
    .select("id, user_id, reference, amount_kobo, tokens_credited, status, created_at")
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
    created_at: string;
  }>;
}
