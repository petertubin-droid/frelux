// =========================================================
// Paystack Checkout — Initialize Transaction
//
// Called by the frontend to create a Paystack payment session.
// Holds the PAYSTACK_SECRET_KEY (server-only, set via Supabase secrets).
//
// Two purposes:
//  1. purpose: "subscription" (default) — plan checkout. The amount
//     is ALWAYS resolved server-side from subscription_plan_prices
//     (audit H1 fix, 2026-09-10); the client amount is advisory only.
//     The caller must be authenticated and user_id must match the
//     caller's session.
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
import {
  PAYSTACK_CURRENCIES,
  resolveMarketCharge,
  resolveSubscriptionPrice,
  toMajorUnits,
  usdCentsToNairaKobo,
} from "../_shared/subscription-pricing.ts";
import {
  configAsPack,
  pickPack,
  type TokenPackRow,
} from "../_shared/token-pricing.ts";
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

serveWithCors(async (req: Request) => {
  // Audit fix M-7 (2026-09-11): rate limit this endpoint per user
  // (falls back to client IP). OPTIONS preflights are answered at
  // the CORS boundary and never reach this check.
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.PAYMENT);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      amount,
      reference: clientReference,
      email: clientEmail,
      plan,
      billing_cycle,
      user_id,
      market_code,
      callback_url,
      metadata,
      purpose,
      pack_id,
    } = await req.json();

    const isApiPlanPurchase = purpose === "api_plan";
    const isTokenPurchase = purpose === "token_purchase";
    let email = clientEmail;
    let reference = clientReference;
    let checkoutAmount = amount;
    let checkoutMetadata = metadata;
    let checkoutCallback = callback_url;
    let apiPlanCurrency: string | null = null;
    let chargeCurrency: string | null = null;

    if (isApiPlanPurchase) {
      // FRELUX API plan purchase (Phase 7 §17). Server-priced ONLY —
      // the amount comes from frelux_api_plans (DB configuration),
      // never from the client.
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

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
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const planKey = typeof plan === "string" ? plan : "";
      if (!planKey) {
        return new Response(JSON.stringify({ error: "Missing API plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ALWAYS price server-side from the plan configuration.
      const { data: planRow, error: planError } = await admin
        .from("frelux_api_plans")
        .select("key, name, active, config")
        .eq("key", planKey)
        .maybeSingle();

      if (planError || !planRow || !planRow.active) {
        return new Response(
          JSON.stringify({ error: "Unknown or inactive API plan" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const priceMonthly = Number(planRow.config?.priceMonthly ?? null);
      const currency = String(planRow.config?.currency ?? "USD");
      // Free plans and contact-sales plans are not self-serve purchases.
      if (!Number.isFinite(priceMonthly) || priceMonthly <= 0) {
        return new Response(
          JSON.stringify({
            error:
              "This plan is not available for self-service purchase. Contact FRELUX.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Paystack expects minor units (kobo/cents).
      checkoutAmount = Math.round(priceMonthly * 100);
      const buyerEmail =
        typeof email === "string" && email.length > 0
          ? email
          : (tokenUser.data.user.email ?? `${user_id}@frelux.api`);
      checkoutMetadata = {
        purpose: "api_plan",
        user_id,
        plan_key: planKey,
        price_monthly: priceMonthly,
        currency,
        custom_fields: [
          {
            display_name: "Product",
            variable_name: "product",
            value: `FRELUX API — ${planRow.name}`,
          },
          { display_name: "Plan", variable_name: "plan", value: planKey },
          {
            display_name: "Platform",
            variable_name: "platform",
            value: "FRELUX API",
          },
        ],
      };
      checkoutCallback =
        callback_url ||
        `${req.headers.get("origin")}/developers?plan_purchase=verify&plan=${planKey}`;
      // Reference is ALWAYS generated server-side for API plan purchases.
      reference = `FRELUX_API_${planKey}_${user_id.slice(0, 8)}_${Date.now()}`;
      email = buyerEmail;
      apiPlanCurrency = currency;
      // Falls through to the shared initialize-transaction code below.
    }

    // api_plan purchases priced above must NOT re-price through the
    // subscription branch below — falling through made every API
    // plan checkout 400 ("not available for self-service purchase")
    // because subscription_plan_prices has no row for API plan keys.
    // Found by the paystack-checkout test batch (2026-09-15).
    if (isApiPlanPurchase) {
      // priced server-side above — skip both token and subscription branches
    } else if (isTokenPurchase) {
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
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ALWAYS price server-side from the pack definition — never
      // trust the client amount. Packs (2026-10-16): the shop sells
      // multiple bundles; legacy single-row config is the pack-1
      // fallback when token_purchase_packs is unavailable.
      const { data: packRows, error: packsError } = await admin
        .from("token_purchase_packs")
        .select("id, key, name, token_amount, price_kobo, is_enabled")
        .order("sort_order");
      let packs: TokenPackRow[] = (packRows ?? []) as TokenPackRow[];
      if (packsError || packs.length === 0) {
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
        packs = [configAsPack(config)];
      }

      const pack = pickPack(packs, pack_id);
      if (!pack || !pack.is_enabled) {
        return new Response(
          JSON.stringify({ error: "That token pack is not available" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      checkoutAmount = pack.price_kobo;
      checkoutMetadata = {
        purpose: "token_purchase",
        user_id,
        pack_id: pack.id,
        tokens: pack.token_amount,
        price_kobo: pack.price_kobo,
        custom_fields: [
          {
            display_name: "Product",
            variable_name: "product",
            value: `${pack.name ?? "FRELUX Tokens"} (${pack.token_amount})`,
          },
          {
            display_name: "Tokens",
            variable_name: "tokens",
            value: String(pack.token_amount),
          },
          {
            display_name: "Platform",
            variable_name: "platform",
            value: "FRELUX",
          },
        ],
      };
    } else {
      // Subscription flow — server-priced ONLY (audit H1 fix 2026-09-10).
      // The amount ALWAYS comes from subscription_plan_prices; the
      // client-supplied amount is never trusted.
      if (!email || !reference || !plan || !user_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

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

      // The caller must be the authenticated user being subscribed.
      const authHeader =
        req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
      const tokenUser = authHeader
        ? await admin.auth.getUser(authHeader)
        : { data: { user: null }, error: new Error("no auth header") };
      if (!tokenUser?.data?.user || tokenUser.data.user.id !== user_id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve the canonical USD price for (plan, billing_cycle). Paystack
      // settles in naira, so the dollar price is converted at a rate taken
      // from fx_rates and recorded as a quote. Verification compares the
      // charge to that quote, so a rate move cannot fail a paying customer.
      const cycle = billing_cycle ?? "monthly";
      const { data: priceRows, error: priceError } = await admin
        .from("subscription_plan_prices")
        .select(
          "plan, billing_cycle, price_minor, price_kobo, currency, active",
        )
        .eq("plan", plan)
        .eq("billing_cycle", cycle);
      if (priceError) {
        return new Response(
          JSON.stringify({ error: "Plan pricing unavailable" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const usd = resolveSubscriptionPrice(priceRows ?? [], plan, cycle, "USD");
      if (!usd) {
        return new Response(
          JSON.stringify({
            error:
              "This plan is not available for self-service purchase. Contact FRELUX.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Prefer the market's own price row: it is exactly what the pricing
      // page showed. Paystack settles NGN/GHS/ZAR/KES/USD directly.
      const market = String(market_code ?? "").toUpperCase();
      let localPrice: { currency: string; price_minor: number } | null = null;
      if (market) {
        const { data: localRows } = await admin
          .from("subscription_local_prices")
          .select("currency, price_minor")
          .eq("market_code", market)
          .eq("plan", plan)
          .eq("billing_cycle", cycle)
          .eq("active", true)
          .limit(1);
        localPrice = (localRows ?? [])[0] ?? null;
      }
      let charge = resolveMarketCharge({
        localPrice,
        usdPriceMinor: usd.priceMinor,
        supported: PAYSTACK_CURRENCIES,
      });
      let rateRow: {
        rate: number;
        source?: string | null;
        fetched_at?: string | null;
      } | null = null;

      // A currency the market has no row for, or one Paystack cannot
      // settle, is charged as naira quoted from the dollar price.
      if (charge.currency === "USD" && !localPrice) {
        const { data: rateRows } = await admin
          .from("fx_rates")
          .select("rate, source, fetched_at")
          .eq("base_currency", "USD")
          .eq("quote_currency", "NGN")
          .order("fetched_at", { ascending: false })
          .limit(1);
        rateRow = (rateRows ?? [])[0] ?? null;
        const quotedKobo = rateRow
          ? usdCentsToNairaKobo(usd.priceMinor, Number(rateRow.rate))
          : null;
        if (quotedKobo !== null) {
          charge = { currency: "NGN", priceMinor: quotedKobo };
        }
      }

      // Reference is generated server-side so the quote cannot be
      // pre-empted by a client-chosen reference.
      reference = `FRELUX_SUB_${plan}_${user_id.slice(0, 8)}_${Date.now()}`;
      // The redirect must carry the server-generated reference, otherwise
      // verification would look up a quote that does not exist.
      checkoutCallback = `${req.headers.get("origin")}/pricing?status=verify&gw=paystack&ref=${reference}`;

      const { error: quoteError } = await admin
        .from("subscription_checkout_quotes")
        .insert({
          reference,
          user_id,
          plan,
          billing_cycle: cycle,
          base_currency: "USD",
          base_minor: usd.priceMinor,
          charge_currency: charge.currency,
          charge_minor: charge.priceMinor,
          fx_rate: rateRow ? Number(rateRow.rate) : null,
          fx_source: rateRow?.source ?? null,
          fx_fetched_at: rateRow?.fetched_at ?? null,
        });
      if (quoteError) {
        return new Response(
          JSON.stringify({ error: "Could not start checkout" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Paystack expects minor units in the charge currency.
      checkoutAmount = charge.priceMinor;
      chargeCurrency = charge.currency;
      checkoutMetadata = {
        ...(metadata ?? {}),
        plan,
        billing_cycle: cycle,
        user_id,
        market_code: market,
        base_currency: "USD",
        base_minor: usd.priceMinor,
        charge_currency: charge.currency,
      };
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
          amount: checkoutAmount, // minor units
          ...(apiPlanCurrency
            ? { currency: apiPlanCurrency }
            : chargeCurrency
              ? { currency: chargeCurrency }
              : {}),
          reference: reference_,
          callback_url: isTokenPurchase
            ? checkoutCallback
            : checkoutCallback ||
              `${req.headers.get("origin")}/pricing?status=verify&ref=${reference_}`,
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
