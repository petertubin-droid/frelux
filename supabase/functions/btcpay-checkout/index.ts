// =========================================================
// BTCPay Checkout — Initialize Bitcoin Payment Session
// FRELUX PAY
//
// 1. Authenticates caller session
// 2. Resolves canonical server-side price (never trusts client amount)
// 3. Connects strictly to BTCPay Greenfield API (no demo/mock fallbacks)
// 4. Retrieves live Bitcoin payment address, exchange rate, and due sats
// 5. Records invoice in crypto_payment_invoices
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  getVerifiedUserId,
  checkRateLimit,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
import {
  getBtcPayConfig,
  createBtcPayInvoice,
  getBtcPayPaymentMethods,
  btcToSatoshis,
} from "../_shared/btcpay.ts";
import {
  resolveSubscriptionPrice,
  loadPlanPriceRows,
} from "../_shared/subscription-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Approved token purchase tiers (USD)
const TOKEN_PACK_PRICES: Record<string, number> = {
  starter: 10.0,
  builder: 25.0,
  contractor: 50.0,
  enterprise: 100.0,
};

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Verify User Authentication
  const userId = await getVerifiedUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Rate Limiting
  const rlKey = `btcpay-checkout:${userId}`;
  const allowed = await checkRateLimit(
    rlKey,
    RATE_LIMITS.PAYMENT_INITIALIZE || { max: 10, windowMs: 60000 },
  );
  if (!allowed) {
    return rateLimitedResponse(corsHeaders);
  }

  try {
    const body = await req.json();
    const {
      purpose = "subscription",
      plan_id = "pro",
      billing_cycle = "monthly",
      token_pack = "starter",
      market_code = null,
      origin_market = null,
      email: clientEmail = "",
    } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch user profile email if not provided
    let buyerEmail = clientEmail;
    if (!buyerEmail) {
      const { data: userRecord } =
        await adminClient.auth.admin.getUserById(userId);
      buyerEmail =
        userRecord?.user?.email || `user-${userId.slice(0, 8)}@freluxtools.com`;
    }

    // 3. Resolve canonical server-side price (never trust client amounts)
    let amountFiat = 29.0;
    let currencyFiat = "USD";
    let itemDescription = `FRELUX ${plan_id.toUpperCase()} (${billing_cycle})`;

    if (purpose === "subscription") {
      const priceRows = await loadPlanPriceRows(adminClient);
      const charge = resolveSubscriptionPrice(
        plan_id,
        billing_cycle,
        priceRows,
        market_code,
        origin_market,
      );
      amountFiat = charge.amount;
      currencyFiat = charge.currency;
      itemDescription = `FRELUX ${plan_id.toUpperCase()} (${billing_cycle})`;
    } else if (purpose === "token_purchase") {
      amountFiat = TOKEN_PACK_PRICES[token_pack] || 10.0;
      currencyFiat = "USD";
      itemDescription = `FRELUX AI Tokens (${token_pack.toUpperCase()} Pack)`;
    }

    // 4. Validate BTCPay Greenfield Configuration (Fail Closed — No Fake Invoices)
    const btcpayConfig = getBtcPayConfig();
    if (!btcpayConfig || !btcpayConfig.apiKey || !btcpayConfig.storeId) {
      return new Response(
        JSON.stringify({
          error: "BTCPAY_NOT_CONFIGURED",
          message:
            "FRELUX PAY (BTCPay Server) is not configured on this server environment. Please set BTCPAY_URL, BTCPAY_STORE_ID, and BTCPAY_API_KEY.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const orderId = `FRX-${purpose.slice(0, 3).toUpperCase()}-${Date.now()}-${userId.slice(0, 6)}`;
    const siteUrl = Deno.env.get("SITE_URL") || "https://freluxtools.com";
    const redirectUrl = `${siteUrl}/dashboard?payment=btcpay_success&orderId=${orderId}`;

    // 5. Create Dynamic Invoice on BTCPay Server
    const invoice = await createBtcPayInvoice(btcpayConfig, {
      amount: amountFiat,
      currency: currencyFiat,
      orderId,
      itemDesc: itemDescription,
      buyerEmail,
      redirectUrl,
      metadata: {
        userId,
        purpose,
        plan: plan_id,
        billingCycle: billing_cycle,
      },
    });

    const invoiceId = invoice.id;
    const checkoutLink = invoice.checkoutLink;
    const expiresAt = new Date(invoice.expirationTime * 1000).toISOString();

    let btcAddress = "";
    let amountBtc = 0;
    let rateFiat = 0;
    let qrCodeData = "";

    // 6. Query Payment Methods for Real BTC Address and Amount
    try {
      const paymentMethods = await getBtcPayPaymentMethods(
        btcpayConfig,
        invoiceId,
      );
      const btcMethod = paymentMethods.find(
        (p) => p.paymentMethod === "BTC" || p.cryptoCode === "BTC",
      );
      if (btcMethod) {
        btcAddress = btcMethod.destination;
        amountBtc = parseFloat(btcMethod.due || btcMethod.amount);
        rateFiat = parseFloat(btcMethod.rate);
        qrCodeData =
          btcMethod.paymentLink || `bitcoin:${btcAddress}?amount=${amountBtc}`;
      }
    } catch (pmError) {
      console.warn("[btcpay-checkout] payment methods query:", pmError);
    }

    const amountSats = btcToSatoshis(amountBtc);

    // 7. Persist Invoice in Database
    const { error: insertError } = await adminClient
      .from("crypto_payment_invoices")
      .insert({
        invoice_id: invoiceId,
        store_id: btcpayConfig.storeId,
        user_id: userId,
        purpose,
        plan_id,
        billing_cycle,
        amount_fiat: amountFiat,
        currency_fiat: currencyFiat,
        amount_btc: amountBtc,
        amount_sats: amountSats,
        btc_address: btcAddress,
        payment_method: "BTC",
        status: "Pending",
        rate_fiat: rateFiat,
        rate_usd: rateFiat,
        checkout_url: checkoutLink,
        redirect_url: redirectUrl,
        qr_code_data: qrCodeData,
        expires_at: expiresAt,
        metadata: {
          buyer_email: buyerEmail,
          order_id: orderId,
        },
      });

    if (insertError) {
      console.error(
        "[btcpay-checkout] failed to store invoice in database:",
        insertError.message,
      );
      return new Response(
        JSON.stringify({
          error: "DATABASE_ERROR",
          message: "Failed to record payment invoice in database.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoiceId,
        checkout_url: checkoutLink,
        btc_address: btcAddress,
        amount_btc: amountBtc,
        amount_sats: amountSats,
        amount_fiat: amountFiat,
        currency_fiat: currencyFiat,
        rate_fiat: rateFiat,
        qr_code_data: qrCodeData,
        expires_at: expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[btcpay-checkout] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
