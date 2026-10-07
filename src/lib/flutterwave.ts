// =========================================================
// FRELUX Flutterwave Payment Integration
//
// Handles the Flutterwave half of the gateway dispatch
// (`src/lib/payments/gateway.ts`). The hosted checkout is created
// server-side by the `flutterwave-checkout` edge function (holds
// FLUTTERWAVE_SECRET_KEY); this module only verifies the
// transaction after the redirect back.
//
// Flow:
// 1. User selects a plan on /pricing (admin gateway = flutterwave)
// 2. gateway.ts → `flutterwave-checkout` edge function → link
// 3. User pays on Flutterwave's hosted checkout
// 4. Flutterwave redirects to /pricing?status=verify&gw=flutterwave
//    with ?tx_ref=..&transaction_id=.. appended
// 5. This module calls `flutterwave-verify` (server-side verify
//    against Flutterwave by tx_ref - never trusts the redirect's
//    status param)
// 6. Webhook (`flutterwave-webhook`) activates the subscription as
//    the authoritative path; verify is the fallback path.
//
// Requires env vars:
// - VITE_FLUTTERWAVE_PUBLIC_KEY (frontend config check)
// - FLUTTERWAVE_SECRET_KEY, FLW_SECRET_HASH (edge secrets only)
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { SubscriptionPlan } from "@/lib/subscription";

export interface FlutterwaveVerifyResult {
  verified: boolean;
  plan?: SubscriptionPlan;
  error?: string;
}

/**
 * Verify a Flutterwave transaction after the user returns from
 * checkout. Calls the edge function `flutterwave-verify` which
 * verifies the transaction with Flutterwave by tx_ref.
 */
export async function verifyFlutterwavePayment(
  txRef: string,
): Promise<FlutterwaveVerifyResult> {
  if (!isSupabaseConfigured) {
    return { verified: false, error: "Payment system is not configured." };
  }

  const { data, error } = await supabase.functions.invoke(
    "flutterwave-verify",
    {
      body: { tx_ref: txRef },
    },
  );

  if (error) {
    return { verified: false, error: error.message };
  }

  if (!data?.verified) {
    return {
      verified: false,
      error: data?.error || "Payment verification failed.",
    };
  }

  return {
    verified: true,
    plan: data.plan as SubscriptionPlan | undefined,
  };
}

/**
 * Check if Flutterwave is configured (public key exists).
 */
export function isFlutterwaveConfigured(): boolean {
  return !!import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
}
