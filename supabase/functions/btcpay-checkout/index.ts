// FRELUX PAY: server-priced BTCPay invoices. No client-supplied amounts or
// synthetic plan/token pricing are accepted.
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
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const userId = await getVerifiedUserId(req);
  if (!userId) return json({ error: "UNAUTHORIZED" }, 401);

  const limit = await checkRateLimit(
    `btcpay-checkout:${userId}`,
    RATE_LIMITS.PAYMENT,
  );
  if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "INVALID_REQUEST" }, 400);
    }
    const purpose = body.purpose ?? "subscription";
    const plan = typeof body.plan_id === "string" ? body.plan_id.trim() : "";
    const billingCycle = body.billing_cycle;
    if (!(["subscription", "token_purchase"] as unknown[]).includes(purpose)) {
      return json({ error: "UNSUPPORTED_PURPOSE" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "PAYMENT_SERVICE_UNAVAILABLE" }, 503);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const config = await getBtcPayConfig();
    if (!config) return json({ error: "BTCPAY_NOT_CONFIGURED" }, 503);

    const siteUrlValue = Deno.env.get("SITE_URL");
    let siteUrl: URL;
    try {
      siteUrl = new URL(siteUrlValue || "");
    } catch {
      return json({ error: "SITE_URL_NOT_CONFIGURED" }, 503);
    }
    if (siteUrl.protocol !== "https:" || siteUrl.username || siteUrl.password) {
      return json({ error: "SITE_URL_INVALID" }, 503);
    }

    let amountMinor: number;
    let tokenAmount: number | null = null;
    let itemDescription: string;
    const currency = "USD";

    if (purpose === "subscription") {
      if (!plan || !["monthly", "yearly"].includes(billingCycle)) {
        return json({ error: "INVALID_SUBSCRIPTION_SELECTION" }, 400);
      }
      const priceRows = await loadPlanPriceRows(async (columns) => {
        const { data, error } = await admin
          .from("subscription_plan_prices")
          .select(columns)
          .eq("active", true);
        return { data: data as unknown[] | null, error };
      });
      if (!priceRows) return json({ error: "PRICE_CATALOG_UNAVAILABLE" }, 503);
      const price = resolveSubscriptionPrice(priceRows, plan, billingCycle, currency);
      if (!price || price.priceMinor <= 0) {
        return json({ error: "PLAN_NOT_AVAILABLE_IN_USD" }, 400);
      }
      amountMinor = price.priceMinor;
      itemDescription = `FRELUX ${plan.toUpperCase()} (${billingCycle})`;
    } else {
      const [{ data: configRow, error: configError }, { data: priceRow, error: priceError }] =
        await Promise.all([
          admin.from("token_purchase_config").select("token_amount,is_enabled").eq("id", 1).maybeSingle(),
          admin.from("token_purchase_prices").select("price_minor,is_active").eq("currency_code", "USD").maybeSingle(),
        ]);
      if (configError || priceError) return json({ error: "TOKEN_PRICE_CATALOG_UNAVAILABLE" }, 503);
      tokenAmount = Number(configRow?.token_amount);
      amountMinor = Number(priceRow?.price_minor);
      if (!configRow?.is_enabled || priceRow?.is_active !== true ||
          !Number.isSafeInteger(tokenAmount) || tokenAmount <= 0 ||
          !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        return json({ error: "TOKEN_PURCHASE_NOT_AVAILABLE_IN_USD" }, 400);
      }
      itemDescription = `FRELUX AI Credits (${tokenAmount} tokens)`;
    }

    const amountFiat = amountMinor / 100;
    if (!Number.isFinite(amountFiat) || amountFiat <= 0) {
      return json({ error: "INVALID_PRICE_CONFIGURATION" }, 503);
    }
    const orderId = `FRX-${crypto.randomUUID()}`;
    const invoice = await createBtcPayInvoice(config, {
      amount: amountFiat,
      currency,
      orderId,
      itemDesc: itemDescription,
      metadata: {
        userId,
        purpose,
        plan: purpose === "subscription" ? plan : null,
        billingCycle: purpose === "subscription" ? billingCycle : null,
        tokenAmount,
      },
      redirectUrl: `${siteUrl.origin}/dashboard?payment=btcpay_success&orderId=${encodeURIComponent(orderId)}`,
    });

    if (!invoice.id || invoice.storeId !== config.storeId ||
        Number(invoice.amount) !== amountFiat || invoice.currency.toUpperCase() !== currency ||
        !invoice.checkoutLink || !Number.isFinite(invoice.expirationTime)) {
      throw new Error("BTCPay returned an invoice that does not match the server quote");
    }
    const checkoutUrl = new URL(invoice.checkoutLink);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.origin !== new URL(config.serverUrl).origin) {
      throw new Error("BTCPay returned a checkout URL outside the configured server origin");
    }

    let btcAddress = "";
    let amountBtc = 0;
    let rateFiat = 0;
    let qrCodeData = "";
    try {
      const methods = await getBtcPayPaymentMethods(config, invoice.id);
      const btcMethod = methods.find((method) =>
        method.paymentMethod?.toUpperCase().startsWith("BTC") ||
        method.cryptoCode?.toUpperCase() === "BTC",
      );
      if (btcMethod) {
        btcAddress = btcMethod.destination || "";
        amountBtc = Number(btcMethod.due || btcMethod.amount || 0);
        rateFiat = Number(btcMethod.rate || 0);
        qrCodeData = btcMethod.paymentLink || (btcAddress && amountBtc > 0
          ? `bitcoin:${btcAddress}?amount=${amountBtc}` : "");
        if (!Number.isFinite(amountBtc) || amountBtc <= 0) {
          btcAddress = "";
          amountBtc = 0;
          qrCodeData = "";
        }
      }
    } catch (error) {
      console.warn("[btcpay-checkout] hosted checkout fallback:", error);
    }

    const expiresAt = new Date(invoice.expirationTime * 1000).toISOString();
    const metadata = {
      order_id: orderId,
      token_amount: tokenAmount,
      amount_minor: amountMinor,
      currency,
    };
    const { error: insertError } = await admin
      .from("crypto_payment_invoices")
      .insert({
        invoice_id: invoice.id,
        store_id: config.storeId,
        user_id: userId,
        purpose,
        plan_id: purpose === "subscription" ? plan : null,
        billing_cycle: purpose === "subscription" ? billingCycle : null,
        amount_fiat: amountFiat,
        currency_fiat: currency,
        amount_btc: amountBtc || null,
        amount_sats: amountBtc ? btcToSatoshis(amountBtc) : null,
        btc_address: btcAddress || null,
        payment_method: "BTC",
        status: "Pending",
        rate_fiat: Number.isFinite(rateFiat) && rateFiat > 0 ? rateFiat : null,
        rate_usd: Number.isFinite(rateFiat) && rateFiat > 0 ? rateFiat : null,
        checkout_url: invoice.checkoutLink,
        redirect_url: `${siteUrl.origin}/dashboard?payment=btcpay_success&orderId=${encodeURIComponent(orderId)}`,
        qr_code_data: qrCodeData || null,
        expires_at: expiresAt,
        metadata,
      });
    if (insertError) {
      console.error("[btcpay-checkout] invoice persistence failed:", insertError.message);
      return json({ error: "INVOICE_PERSISTENCE_FAILED" }, 500);
    }

    return json({
      success: true,
      invoice_id: invoice.id,
      checkout_url: invoice.checkoutLink,
      btc_address: btcAddress,
      amount_btc: amountBtc,
      amount_sats: amountBtc ? btcToSatoshis(amountBtc) : 0,
      amount_fiat: amountFiat,
      currency_fiat: currency,
      rate_fiat: rateFiat,
      qr_code_data: qrCodeData,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("[btcpay-checkout] failed:", error instanceof Error ? error.message : error);
    return json({ error: "CHECKOUT_INITIALIZATION_FAILED" }, 500);
  }
});
