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
  const rl = checkRateLimit(
    getRateLimitKey(req, req.headers.get("x-user-id") ?? undefined),
    RATE_LIMITS.PAYMENT,
  );
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
    if (tx.currency !== "NGN") {
      return json({ verified: false, error: "Unexpected currency" }, 200);
    }

    const meta = tx.meta ?? {};
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
    const paidUntil = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await supabase.from("user_paid_status").upsert(
      {
        user_id: userId,
        is_paid: true,
        plan,
        paid_until: paidUntil,
        payment_provider: "flutterwave",
        provider_customer_id: tx.customer?.email || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ verified: true, plan });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
