const DOCUMENT_PRINT_USD_CENTS = 109;

// FRELUX PAY: server-priced NOWPayments invoices. No client-supplied amounts or
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
  getNowPaymentsConfig,
  createNowPaymentsInvoice,
} from "../_shared/nowpayments.ts";
import {
  resolveSubscriptionPrice,
  loadPlanPriceRows,
  resolveLegacyCharge,
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
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const userId = await getVerifiedUserId(req);
  if (!userId) return json({ error: "UNAUTHORIZED" }, 401);

  const limit = await checkRateLimit(
    `nowpayments-checkout:${userId}`,
    RATE_LIMITS.PAYMENT,
  );
  if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "INVALID_REQUEST" }, 400);
    }
    const purpose = body.purpose ?? "subscription";
    // A print pass is priced server-side and its invoice carries the document
    // id, so one settled invoice can only ever unlock the document it was
    // created for.
    const documentId = String(body.document_id ?? body.documentId ?? "").trim();
    const plan = typeof body.plan_id === "string" ? body.plan_id.trim() : "";
    const billingCycle = body.billing_cycle;
    const payCurrency =
      typeof body.pay_currency === "string" && body.pay_currency.trim()
        ? body.pay_currency.trim().toLowerCase()
        : undefined;

    if (
      !(
        ["subscription", "token_purchase", "document_print"] as unknown[]
      ).includes(purpose)
    ) {
      return json({ error: "UNSUPPORTED_PURPOSE" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "PAYMENT_SERVICE_UNAVAILABLE" }, 503);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const config = await getNowPaymentsConfig();
    if (!config) return json({ error: "NOWPAYMENTS_NOT_CONFIGURED" }, 503);

    const siteUrlValue = Deno.env.get("SITE_URL");
    let siteUrl: URL;
    try {
      siteUrl = new URL(siteUrlValue || "https://freluxtools.com");
    } catch {
      siteUrl = new URL("https://freluxtools.com");
    }

    let amountMinor: number;
    let tokenAmount: number | null = null;
    let itemDescription: string;
    const currency = "USD";

    if (purpose === "document_print") {
      if (!documentId || documentId.length > 200) {
        return json({ error: "MISSING_DOCUMENT_ID" }, 400);
      }
      amountMinor = DOCUMENT_PRINT_USD_CENTS;
      itemDescription = "FRELUX Document Print Pass";
    } else if (purpose === "subscription") {
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
      let price = resolveSubscriptionPrice(
        priceRows,
        plan,
        billingCycle,
        currency,
      );

      // Fallback: resolve from subscription_local_prices or convert from active market rates
      if (!price || price.priceMinor <= 0) {
        const { data: localRows } = await admin
          .from("subscription_local_prices")
          .select("price_minor, fx_rate, currency")
          .eq("plan", plan)
          .eq("billing_cycle", billingCycle)
          .eq("active", true)
          .order("updated_at", { ascending: false });

        if (localRows && localRows.length > 0) {
          for (const lr of localRows) {
            const fx = Number(lr.fx_rate);
            const minor = Number(lr.price_minor);
            if (
              Number.isFinite(fx) &&
              fx > 0 &&
              Number.isFinite(minor) &&
              minor > 0
            ) {
              const usdCents = Math.round(minor / fx);
              if (usdCents > 0) {
                price = { priceMinor: usdCents, currency: "USD" };
                break;
              }
            }
          }
        }
      }

      if (!price || price.priceMinor <= 0) {
        const legacy = resolveLegacyCharge(priceRows, plan, billingCycle);
        if (legacy && legacy.priceMinor > 0) {
          const { data: fxRow } = await admin
            .from("fx_rates")
            .select("rate")
            .eq("base_currency", "USD")
            .eq("quote_currency", "NGN")
            .order("fetched_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const rate = Number(fxRow?.rate) || 1550;
          const usdCents = Math.round(legacy.priceMinor / rate);
          if (usdCents > 0) {
            price = { priceMinor: usdCents, currency: "USD" };
          }
        }
      }

      if (!price || price.priceMinor <= 0) {
        return json({ error: "PLAN_NOT_AVAILABLE_IN_USD" }, 400);
      }
      amountMinor = price.priceMinor;
      itemDescription = `FRELUX ${plan.toUpperCase()} (${billingCycle})`;
    } else {
      const [
        { data: configRow, error: configError },
        { data: priceRow, error: priceError },
      ] = await Promise.all([
        admin
          .from("token_purchase_config")
          .select("token_amount,is_enabled")
          .eq("id", 1)
          .maybeSingle(),
        admin
          .from("token_purchase_prices")
          .select("price_minor,is_active")
          .eq("currency_code", "USD")
          .maybeSingle(),
      ]);
      if (configError || priceError)
        return json({ error: "TOKEN_PRICE_CATALOG_UNAVAILABLE" }, 503);
      tokenAmount = Number(configRow?.token_amount);
      amountMinor = Number(priceRow?.price_minor);
      if (
        !configRow?.is_enabled ||
        priceRow?.is_active !== true ||
        !Number.isSafeInteger(tokenAmount) ||
        tokenAmount <= 0 ||
        !Number.isSafeInteger(amountMinor) ||
        amountMinor <= 0
      ) {
        // Fallback: check alternative active currency token purchase price and convert via fx_rates
        const { data: altPrices } = await admin
          .from("token_purchase_prices")
          .select("price_minor, currency_code, is_active")
          .eq("is_active", true)
          .limit(5);

        let converted = false;
        if (altPrices && altPrices.length > 0) {
          for (const alt of altPrices) {
            const code = String(alt.currency_code || "").toUpperCase();
            const altMinor = Number(alt.price_minor);
            if (code && altMinor > 0) {
              const { data: fxRow } = await admin
                .from("fx_rates")
                .select("rate")
                .eq("base_currency", "USD")
                .eq("quote_currency", code)
                .order("fetched_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              const rate =
                Number(fxRow?.rate) || (code === "NGN" ? 1550 : null);
              if (rate && rate > 0) {
                amountMinor = Math.round(altMinor / rate);
                converted = true;
                break;
              }
            }
          }
        }

        if (
          !converted ||
          !configRow?.is_enabled ||
          !Number.isSafeInteger(tokenAmount) ||
          tokenAmount <= 0 ||
          !Number.isSafeInteger(amountMinor) ||
          amountMinor <= 0
        ) {
          return json({ error: "TOKEN_PURCHASE_NOT_AVAILABLE_IN_USD" }, 400);
        }
      }
      itemDescription = `FRELUX AI Credits (${tokenAmount} tokens)`;
    }

    const amountFiat = amountMinor / 100;
    if (!Number.isFinite(amountFiat) || amountFiat <= 0) {
      return json({ error: "INVALID_PRICE_CONFIGURATION" }, 503);
    }
    const orderId =
      purpose === "document_print"
        ? `FRX-PRINT-${documentId}`
        : `FRX-${crypto.randomUUID()}`;
    const ipnCallbackUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;
    const successUrl = `${siteUrl.origin}/dashboard?payment=nowpayments_success&orderId=${encodeURIComponent(orderId)}`;
    const cancelUrl = `${siteUrl.origin}/pricing`;

    const invoice = await createNowPaymentsInvoice(config, {
      priceAmount: amountFiat,
      priceCurrency: currency,
      payCurrency,
      orderId,
      orderDescription: itemDescription,
      ipnCallbackUrl,
      successUrl,
      cancelUrl,
    });

    if (!invoice.id || !invoice.invoice_url) {
      throw new Error(
        "NOWPayments returned an invoice without an ID or invoice URL",
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const metadata = {
      order_id: orderId,
      provider: "nowpayments",
      token_amount: tokenAmount,
      amount_minor: amountMinor,
      currency,
    };

    const { error: insertError } = await admin
      .from("crypto_payment_invoices")
      .insert({
        invoice_id: String(invoice.id),
        store_id: "nowpayments",
        user_id: userId,
        purpose,
        plan_id: purpose === "subscription" ? plan : null,
        billing_cycle: purpose === "subscription" ? billingCycle : null,
        amount_fiat: amountFiat,
        currency_fiat: currency,
        payment_method: payCurrency ? payCurrency.toUpperCase() : "CRYPTO",
        provider: "nowpayments",
        status: "Pending",
        checkout_url: invoice.invoice_url,
        redirect_url: successUrl,
        expires_at: expiresAt,
        metadata,
      });

    if (insertError) {
      console.error(
        "[nowpayments-checkout] invoice persistence failed:",
        insertError.message,
      );
      return json({ error: "INVOICE_PERSISTENCE_FAILED" }, 500);
    }

    return json({
      success: true,
      invoice_id: String(invoice.id),
      checkout_url: invoice.invoice_url,
      amount_fiat: amountFiat,
      currency_fiat: currency,
      order_id: orderId,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error(
      "[nowpayments-checkout] failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "CHECKOUT_INITIALIZATION_FAILED" }, 500);
  }
});
