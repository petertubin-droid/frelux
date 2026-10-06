// =========================================================
// Flutterwave Webhook — Auto-activate subscriptions on payment events
//
// Flutterwave sends a POST to this endpoint when payment events occur.
// Configure the webhook URL + secret hash in the Flutterwave dashboard:
//   Settings → Webhooks
//   URL:  https://<your-project>.supabase.co/functions/v1/flutterwave-webhook
//   Hash: a strong random string, also set as the FLW_SECRET_HASH
//         Supabase secret (Flutterwave sends it back in the
//         `verif-hash` header on every event)
//
// Safety rules (mirroring paystack-webhook):
//  - Every request MUST carry the correct `verif-hash` header;
//    unsigned or wrongly-signed events are rejected with 401.
//  - Subscription activation requires the paid amount to match the
//    canonical server-side price from subscription_plan_prices
//    (audit H1 fix, 2026-09-10).
//  - Activation is an idempotent upsert keyed by user_id.
//
// Required env:
// - FLW_SECRET_HASH
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  constantTimeEqual,
  validateSubscriptionPayment,
} from "../_shared/subscription-pricing.ts";
import { serveWithCors } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, verif-hash",
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
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    // Verify the secret hash BEFORE reading the body.
    const secretHash = Deno.env.get("FLW_SECRET_HASH");
    const receivedHash = req.headers.get("verif-hash");
    if (
      !secretHash ||
      !receivedHash ||
      !constantTimeEqual(secretHash, receivedHash)
    ) {
      return json({ error: "Invalid signature" }, 401);
    }

    const body = await req.json();
    const event = body?.event;
    const data = body?.data;

    // Only successful card charges activate a subscription.
    if (event !== "charge.completed" || !data) {
      return json({ received: true, skipped: true });
    }
    if (data.status !== "successful") {
      return json({ received: true, status: data.status });
    }

    const meta = data.meta ?? {};
    const plan = meta.plan as string | undefined;
    const billingCycle =
      (meta.billing_cycle as "monthly" | "yearly" | undefined) ?? "monthly";
    const userId = meta.user_id as string | undefined;

    if (!plan || !userId) {
      return json({ error: "Missing plan or user_id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // The amount PAID must equal the canonical server-side price
    // before a subscription is activated. A signed ₦1 charge must
    // never activate a paid plan. Flutterwave reports major units;
    // the canonical rows are in kobo.
    const { data: priceRows, error: priceError } = await supabase
      .from("subscription_plan_prices")
      .select("plan, billing_cycle, price_kobo, active");
    if (priceError) {
      return json({ error: "Plan pricing unavailable" }, 500);
    }

    const amountKobo = Math.round(Number(data.amount) * 100);
    const validation = validateSubscriptionPayment({
      rows: priceRows ?? [],
      plan,
      billingCycle,
      transactionAmountKobo: amountKobo,
    });
    if (!validation.ok) {
      // Never 500 — a mismatched/unknown amount is a rejected event,
      // acknowledged so Flutterwave does not retry it forever.
      return json({
        received: true,
        activated: false,
        reason: validation.reason,
      });
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
        provider_customer_id: data.customer?.email || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ received: true, activated: true, plan });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
