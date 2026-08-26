// =========================================================
// Paystack Checkout — Initialize Transaction
//
// Called by the frontend to create a Paystack payment session.
// Holds the PAYSTACK_SECRET_KEY (server-only, set via Supabase secrets).
//
// Required env (set via: supabase functions secrets set PAYSTACK_SECRET_KEY=sk_xxx):
// - PAYSTACK_SECRET_KEY
// =========================================================

import {} from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      email,
      amount,
      reference,
      plan,
      billing_cycle,
      user_id,
      callback_url,
      metadata,
    } = await req.json();

    // Validate
    if (!email || !amount || !reference || !plan) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Payment provider not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize transaction with Paystack
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount, // in kobo
          reference,
          callback_url:
            callback_url ||
            `${req.headers.get("origin")}/pricing?status=verify&ref=${reference}`,
          metadata: metadata || {
            plan,
            billing_cycle,
            user_id,
            custom_fields: [
              { display_name: "Plan", variable_name: "plan", value: plan },
              {
                display_name: "Billing Cycle",
                variable_name: "billing_cycle",
                value: billing_cycle,
              },
              {
                display_name: "Platform",
                variable_name: "platform",
                value: "FRELUX",
              },
            ],
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data.message || "Paystack initialization failed",
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(data), {
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
