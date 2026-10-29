// =========================================================
// Flutterwave Checkout — Initialize Subscription Payment
//
// Called by the frontend gateway dispatch (`src/lib/payments/gateway.ts`)
// when the admin-selected gateway is `flutterwave`. Holds the
// FLUTTERWAVE_SECRET_KEY (server-only, set via Supabase secrets).
//
// Safety rules (mirroring paystack-checkout, audit H1 fix 2026-09-10):
//  - The amount is ALWAYS resolved server-side from
//    subscription_plan_prices; the client-supplied amount is
//    advisory only and never trusted.
//  - The caller must be authenticated and user_id must match the
//    caller's session.
//  - tx_ref is generated server-side.
//
// Flutterwave Standard Payment API: POST https://api.flutterwave.com/v3/payments
// Amounts are in the currency's MAJOR unit (naira), unlike Paystack's kobo.
//
// Required env (supabase functions secrets set):
// - FLUTTERWAVE_SECRET_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// Webhook: deploy `flutterwave-webhook` and set its URL + secret hash
// in the Flutterwave dashboard (Settings → Webhooks).
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  FLUTTERWAVE_CURRENCIES,
  resolveMarketCharge,
  loadPlanPriceRows,
  resolveLegacyCharge,
  resolveSubscriptionPrice,
  toMajorUnits,
} from "../_shared/subscription-pricing.ts";
import {
  configAsPack,
  pickPack,
  resolvePackPrice,
  type TokenPackRow,
} from "../_shared/token-pricing.ts";
import { minorToMajor } from "../_shared/currency-units.ts";
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serveWithCors(async (req: Request) => {
  // Same per-user rate limit as the other payment endpoints
  // (audit fix M-7, 2026-09-11).
  const rl = checkRateLimit(await getRateLimitKey(req), RATE_LIMITS.PAYMENT);
  if (!rl.allowed) return rateLimitedResponse(rl.resetAt);

  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const {
      purpose,
      plan_id,
      billing_cycle,
      email,
      user_id,
      market_code,
      origin_market,
      currency,
      allow_ngn_fallback,
      pack_id,
    } = await req.json();
    const plan = typeof plan_id === "string" ? plan_id : "";
    const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
    const isTokenPurchase = purpose === "token_purchase";
    const chargeCurrency =
      (typeof currency === "string" && currency.toUpperCase()) || "";

    if ((!plan && !isTokenPurchase) || !email || !user_id) {
      return json({ error: "Missing required fields" }, 400);
    }

    const secretKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!secretKey) {
      return json({ error: "Payment provider not configured" }, 500);
    }

    // The caller must be the authenticated user being subscribed.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Payment provider not configured" }, 500);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader =
      req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const tokenUser = authHeader
      ? await admin.auth.getUser(authHeader)
      : { data: { user: null }, error: new Error("no auth header") };
    if (!tokenUser?.data?.user || tokenUser.data.user.id !== user_id) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── Token purchase branch: price ALWAYS server-side ──
    // NGN normally stays on Paystack; it only reaches here as an
    // explicit failover (allow_ngn_fallback) when Paystack cannot
    // start the charge — e.g. a rejected secret key. Any other
    // currency needs an active price row. The client's amount is
    // ignored entirely; resolveTokenPrice gives NGN the canonical
    // naira price from token_purchase_config.
    if (isTokenPurchase) {
      // Packs (2026-10-16): the token shop sells multiple bundles.
      // Pack definitions come from token_purchase_packs; the legacy
      // single-row config remains the fallback for pack 1 so a
      // rolled-back migration cannot break the existing flow.
      const { data: packRows, error: packsError } = await admin
        .from("token_purchase_packs")
        .select("id, key, name, token_amount, price_kobo, is_enabled")
        .order("sort_order");
      let packs: TokenPackRow[] = (packRows ?? []) as TokenPackRow[];
      if (packsError || packs.length === 0) {
        const { data: tokenConfig, error: configError } = await admin
          .from("token_purchase_config")
          .select("token_amount, price_kobo, is_enabled")
          .eq("id", 1)
          .maybeSingle();
        if (configError || !tokenConfig || !tokenConfig.is_enabled) {
          return json({ error: "Token purchases are not available" }, 400);
        }
        packs = [configAsPack(tokenConfig)];
      }

      const pack = pickPack(packs, pack_id);
      if (!pack) {
        return json({ error: "That token pack is not available" }, 400);
      }

      const { data: priceRows, error: priceRowsError } = await admin
        .from("token_purchase_prices")
        .select("pack_id, currency_code, price_minor, is_active");
      if (priceRowsError) {
        return json({ error: "Token pricing unavailable" }, 500);
      }

      const resolution = resolvePackPrice(
        pack,
        priceRows ?? [],
        chargeCurrency,
      );
      const ngnBlocked = resolution?.currency === "NGN" && !allow_ngn_fallback;
      if (!resolution || ngnBlocked) {
        return json(
          {
            error:
              "Tokens cannot be purchased in this currency yet. The naira price is always available.",
          },
          400,
        );
      }

      const amount = minorToMajor(resolution.priceMinor, resolution.currency);
      if (!Number.isFinite(amount) || amount <= 0) {
        return json({ error: "Invalid token price configuration" }, 500);
      }

      const tokenTxRef = `FRELUX_TOKENS_FLW_${user_id.slice(0, 8)}_${Date.now()}`;
      const tokenRedirect = `${req.headers.get("origin") ?? ""}/rewards?token_purchase=verify&gw=flutterwave&ref=${tokenTxRef}`;
      if (!req.headers.get("origin")) {
        return json({ error: "Missing origin" }, 400);
      }

      const tokenRes = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: tokenTxRef,
          amount,
          currency: resolution.currency,
          redirect_url: tokenRedirect,
          payment_options: "card",
          customer: { email },
          customizations: {
            title: "FRELUX",
            description: `${pack.name ?? "FRELUX Tokens"} (${resolution.tokens} credits)`,
          },
          meta: {
            purpose: "token_purchase",
            user_id,
            tokens: resolution.tokens,
            pack_id: pack.id,
            pack_name: pack.name ?? "Token Pack",
            currency: resolution.currency,
            price_minor: resolution.priceMinor,
          },
        }),
      });
      const tokenData = await tokenRes.json().catch(() => null);
      if (!tokenRes.ok || !tokenData?.status || !tokenData?.data?.link) {
        return json(
          { error: tokenData?.message || "Flutterwave initialization failed" },
          tokenRes.status ?? 502,
        );
      }
      return json({
        authorization_url: tokenData.data.link,
        reference: tokenTxRef,
        currency: resolution.currency,
      });
    }

    // Resolve the canonical price for (plan, cycle) — no configured
    // row means the plan is not self-serve purchasable.
    const priceRows = await loadPlanPriceRows(async (columns) => {
      const { data, error } = await admin
        .from("subscription_plan_prices")
        .select(columns)
        .eq("plan", plan)
        .eq("billing_cycle", cycle);
      return { data, error };
    });
    if (!priceRows) {
      return json({ error: "Plan pricing unavailable" }, 500);
    }
    // Subscriptions are priced in US dollars; Flutterwave settles the
    // dollar amount directly for international cards.
    const usd =
      resolveSubscriptionPrice(priceRows, plan, cycle, "USD") ??
      resolveLegacyCharge(priceRows, plan, cycle);
    if (!usd) {
      return json(
        {
          error:
            "This plan is not available for self-service purchase. Contact FRELUX.",
        },
        400,
      );
    }

    // Charge the market's own price when Flutterwave settles that
    // currency; otherwise the canonical dollar price.
    const market = String(market_code ?? "").toUpperCase();
    let localPrice: { currency: string; price_minor: number } | null = null;
    // The naira list is a domestic price list, so it is only served to a
    // visitor whose browser reports Nigeria. A visitor who selects Nigeria
    // from abroad sees and pays the dollar price instead, which is the same
    // figure the pricing page showed them.
    const visitorCountry = String(origin_market ?? "").toUpperCase();
    const domesticMismatch =
      market === "NG" && Boolean(visitorCountry) && visitorCountry !== "NG";
    if (domesticMismatch) {
      console.info(
        `[pricing] ${market} list declined for origin ${visitorCountry}; charging USD`,
      );
    }
    if (market && usd.currency === "USD" && !domesticMismatch) {
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
    const charge = resolveMarketCharge({
      localPrice,
      usdPriceMinor: usd.priceMinor,
      supported: FLUTTERWAVE_CURRENCIES,
    });

    // Flutterwave expects the currency's major unit.
    const amount = toMajorUnits(charge.priceMinor, charge.currency);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Invalid plan price configuration" }, 500);
    }

    // tx_ref is ALWAYS generated server-side.
    const txRef = `FLW_${plan}_${cycle}_${user_id.slice(0, 8)}_${Date.now()}`;

    // Flutterwave appends ?tx_ref=..&transaction_id=..&status=.. to the
    // redirect_url; `gw=flutterwave` tells the Pricing page which
    // verify function to call on return.
    const origin = req.headers.get("origin") ?? "";
    if (!origin) {
      return json({ error: "Missing origin" }, 400);
    }
    const redirectUrl = `${origin}/pricing?status=verify&gw=flutterwave`;

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: charge.currency,
        redirect_url: redirectUrl,
        payment_options: "card,banktransfer,ussd",
        customer: {
          email,
        },
        customizations: {
          title: "FRELUX",
          description: `FRELUX ${plan} plan (${cycle})`,
        },
        meta: {
          plan,
          billing_cycle: cycle,
          user_id,
          base_currency: usd.currency,
          base_minor: usd.priceMinor,
          charge_currency: charge.currency,
          charge_minor: charge.priceMinor,
          market_code: market,
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.status || !data?.data?.link) {
      return json(
        { error: data?.message || "Flutterwave initialization failed" },
        response.status ?? 502,
      );
    }

    // Same return contract as the gateway dispatch expects:
    // { authorization_url } (the hosted checkout link).
    return json({ authorization_url: data.data.link, reference: txRef });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
