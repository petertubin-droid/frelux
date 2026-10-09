// =========================================================
// Flutterwave Verify — Verify Transaction & Activate Subscription
//
// Called by the frontend when the user returns from the Flutterwave
// hosted checkout (redirect appends ?tx_ref=..&transaction_id=..).
// Verifies the transaction with Flutterwave and activates the
// subscription in user_paid_status.
//
// Safety rules (mirroring paystack-verify):
//  - The amount PAID must equal the canonical server-side price from
//    subscription_plan_prices (audit H1 fix, 2026-09-10) before a
//    subscription is activated.
//  - Activation is an idempotent upsert keyed by user_id.
//
// Required env:
// - FLUTTERWAVE_SECRET_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSubscriptionPayment } from "../_shared/subscription-pricing.ts";
import { applySubscriptionPurchase } from "../_shared/subscription-activation.ts";
import { validateTokenPayment } from "../_shared/token-pricing.ts";
import { serveWithCors } from "../_shared/serve.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_DURATIONS_DAYS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serveWithCors(async (req: Request) => {
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.PAYMENT);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const { tx_ref, reference } = await req.json();
    const txRef = (typeof tx_ref === "string" && tx_ref) || reference;

    if (!txRef) {
      return json({ error: "Missing tx_ref" }, 400);
    }

    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secretKey) {
      return json({ error: "Payment provider not configured" }, 500);
    }

    // Verify the transaction with Flutterwave by our own reference —
    // never trust the client-echoed status from the redirect URL.
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const verifyData = await verifyRes.json().catch(() => null);

    if (!verifyRes.ok || !verifyData?.status || !verifyData?.data) {
      return json(
        {
          verified: false,
          error: verifyData?.message || "Verification failed",
        },
        200,
      );
    }

    const tx = verifyData.data;
    if (tx.status !== "successful") {
      return json({ verified: false, error: `Transaction ${tx.status}` }, 200);
    }

    const meta = tx.meta ?? {};

    // ── Token purchase branch: validate against canonical per-currency
    // pricing, then credit idempotently (keyed by tx_ref). ──
    if (meta.purpose === "token_purchase") {
      const supabaseUrl2 = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin2 = createClient(supabaseUrl2, serviceRoleKey2);

      const { data: tokenConfig, error: configError } = await admin2
        .from("token_purchase_config")
        .select("token_amount, price_kobo, is_enabled")
        .eq("id", 1)
        .maybeSingle();
      if (configError || !tokenConfig) {
        return json({ verified: false, error: "Token shop unavailable" }, 200);
      }
      const { data: priceRows, error: priceRowsError } = await admin2
        .from("token_purchase_prices")
        .select("currency_code, price_minor, is_active");
      if (priceRowsError) {
        return json(
          { verified: false, error: "Token pricing unavailable" },
          200,
        );
      }

      const tokens = Number(meta.tokens) || 0;
      const userId = meta.user_id as string | undefined;
      if (!userId || !tokens) {
        return json(
          { verified: false, error: "Missing payment metadata" },
          200,
        );
      }

      const validation = validateTokenPayment({
        config: tokenConfig,
        priceRows: priceRows ?? [],
        currency: String(tx.currency ?? ""),
        amountPaidMajor: Number(tx.amount),
      });
      if (!validation.ok) {
        return json({ verified: false, error: validation.reason }, 200);
      }

      // Credit from the server-side price, never the echoed amount.
      const rpc = await admin2.rpc("credit_token_purchase", {
        p_user_id: userId,
        p_reference: txRef,
        p_tokens: validation.resolution.tokens,
        p_amount_kobo: validation.resolution.priceMinor,
        p_metadata: { source: "flutterwave", purpose: "token_purchase" },
        p_currency: validation.resolution.currency,
        p_gateway: "flutterwave",
      });
      if (rpc.error) {
        return json({ error: rpc.error.message }, 500);
      }
      const credited = (rpc.data ?? [])[0] ?? {};
      return json({
        verified: true,
        purpose: "token_purchase",
        tokens_credited: validation.resolution.tokens,
        already_credited: credited.already_credited === true,
      });
    }

    if (tx.currency !== "NGN") {
      return json({ verified: false, error: "Unexpected currency" }, 200);
    }

    const plan = meta.plan as string | undefined;
    const billingCycle =
      (meta.billing_cycle as "monthly" | "yearly" | undefined) ?? "monthly";
    const userId = meta.user_id as string | undefined;

    if (!plan || !userId) {
      return json({ verified: false, error: "Missing payment metadata" }, 200);
    }

    // The amount PAID must equal the canonical server-side price
    // before a subscription is activated.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: priceRows, error: priceError } = await supabase
      .from("subscription_plan_prices")
      .select("plan, billing_cycle, price_kobo, active");
    if (priceError) {
      return json({ error: "Plan pricing unavailable" }, 500);
    }

    // Flutterwave reports amounts in major units; the canonical rows
    // are in kobo.
    const amountKobo = Math.round(Number(tx.amount) * 100);
    const validation = validateSubscriptionPayment({
      rows: priceRows ?? [],
      plan,
      billingCycle,
      transactionAmountKobo: amountKobo,
    });
    if (!validation.ok) {
      return json({ verified: false, error: validation.reason }, 200);
    }

    const days = PLAN_DURATIONS_DAYS[billingCycle] ?? 30;

    // Audit fix (2026-10-09): idempotent per tx_ref via the
    // subscription_purchases ledger — replaying a reference no
    // longer re-extends paid_until.
    const activation = await applySubscriptionPurchase(supabase, {
      userId,
      provider: "flutterwave",
      reference: txRef,
      plan,
      billingCycle,
      amountKobo,
      days,
      providerCustomerId: tx.customer?.email || null,
    });
    if (!activation.ok) {
      return json({ error: activation.error }, 500);
    }

    return json({
      verified: true,
      plan,
      already_activated: activation.result.alreadyApplied,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
