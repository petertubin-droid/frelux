// =========================================================
// Paystack Checkout — Initialize Transaction
//
// Called by the frontend to create a Paystack payment session.
// Holds the PAYSTACK_SECRET_KEY (server-only, set via Supabase secrets).
//
// Two purposes:
//  1. purpose: "subscription" (default) — plan checkout. Amount is
//     supplied by the client (pricing page).
//  2. purpose: "token_purchase" — buy FRELUX tokens (credits).
//     The amount and token count are ALWAYS read from
//     token_purchase_config server-side; the client cannot set the
//     price. The caller must be authenticated and user_id must
//     match the caller's session.
//
// Required env (set via: supabase functions secrets set PAYSTACK_SECRET_KEY=sk_xxx):
// - PAYSTACK_SECRET_KEY
// - SUPABASE_URL (token purchases)
// - SUPABASE_SERVICE_ROLE_KEY (token purchases)
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      purpose,
    } = await req.json();

    const isTokenPurchase = purpose === "token_purchase";
    let checkoutAmount = amount;
    let checkoutMetadata = metadata;
    let checkoutCallback = callback_url;

    if (isTokenPurchase) {
      if (!user_id || !email) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Verify the caller is authenticated and matches user_id.
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Payment provider not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const admin = createClient(supabaseUrl, serviceRoleKey);

      const authHeader =
        req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
      const tokenUser = authHeader
        ? await admin.auth.getUser(authHeader)
        : { data: { user: null }, error: new Error("no auth header") };
      if (!tokenUser?.data?.user || tokenUser.data.user.id !== user_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ALWAYS price server-side from config — never trust the client amount.
      const { data: config, error: configError } = await admin
        .from("token_purchase_config")
        .select("token_amount, price_kobo, is_enabled")
        .eq("id", 1)
        .maybeSingle();

      if (configError || !config || !config.is_enabled) {
        return new Response(
          JSON.stringify({ error: "Token purchases are not available" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      checkoutAmount = config.price_kobo;
      checkoutMetadata = {
        purpose: "token_purchase",
        user_id,
        tokens: config.token_amount,
        price_kobo: config.price_kobo,
        custom_fields: [
          { display_name: "Product", variable_name: "product", value: `FRELUX Tokens (${config.token_amount})` },
          { display_name: "Tokens", variable_name: "tokens", value: String(config.token_amount) },
          { display_name: "Platform", variable_name: "platform", value: "FRELUX" },
        ],
      };
    } else {
      // Subscription flow (legacy)
      if (!email || !amount || !reference || !plan) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Token purchases generate the reference server-side; the client
    // callback_url is ignored so the returned reference is always the one
    // embedded in the callback.
    const reference_ = isTokenPurchase
      ? `FRELUX_TOKENS_${user_id.slice(0, 8)}_${Date.now()}`
      : reference;
    if (isTokenPurchase) {
      checkoutCallback = `${req.headers.get("origin")}/rewards?token_purchase=verify&ref=${reference_}`;
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
          amount: checkoutAmount, // in kobo
          reference: reference_,
          callback_url: isTokenPurchase
            ? checkoutCallback
            : (checkoutCallback ||
              `${req.headers.get("origin")}/pricing?status=verify&ref=${reference_}`),
          metadata: checkoutMetadata || {
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
