// =========================================================
// Paystack Webhook — Auto-activate subscriptions on payment events
//
// Paystack sends a POST to this endpoint when payment events occur.
// Configure the webhook URL in your Paystack dashboard:
//   Settings → API Keys & Webhooks → Webhook URL
//   URL: https://<your-project>.supabase.co/functions/v1/paystack-webhook
//
// Required env:
// - PAYSTACK_SECRET_KEY (for signature verification)
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_DURATIONS_DAYS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
};

async function verifySignature(req: Request): Promise<boolean> {
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) return false;

  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) return false;

  const body = await req.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hash = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hash === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify Paystack signature
    const isValid = await verifySignature(req.clone());
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body.event;
    const data = body.data;

    // Only process successful charge or subscription events
    if (event !== "charge.success" && event !== "subscription.enable") {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.status !== "success") {
      return new Response(JSON.stringify({ received: true, status: data.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = data.metadata || {};
    const purpose = (metadata.purpose as string) || "subscription";
    const plan = metadata.plan as string;
    const billingCycle = (metadata.billing_cycle as string) || "monthly";
    const userId = metadata.user_id as string;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Token purchase: credit tokens (idempotent via RPC reference check) ──
    if (purpose === "token_purchase" && event === "charge.success") {
      const tokens = metadata.tokens as number;
      if (!userId || !tokens) {
        return new Response(
          JSON.stringify({ error: "Missing user_id or tokens" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const { error: creditError } = await supabase.rpc(
        "credit_token_purchase",
        {
          p_user_id: userId,
          p_reference: data.reference as string,
          p_tokens: tokens,
          p_amount_kobo: data.amount as number,
          p_metadata: {
            source: "paystack-webhook",
            paystack_reference: data.reference,
          },
        },
      );
      if (creditError) {
        return new Response(
          JSON.stringify({ error: creditError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ received: true, tokens_credited: tokens }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!plan || !userId) {
      return new Response(JSON.stringify({ error: "Missing plan or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activate subscription
    const days = PLAN_DURATIONS_DAYS[billingCycle] ?? 30;
    const paidUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("user_paid_status")
      .upsert({
        user_id: userId,
        is_paid: true,
        plan,
        paid_until: paidUntil,
        payment_provider: "paystack",
        provider_customer_id: data.customer?.customer_code || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true, activated: true, plan }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
