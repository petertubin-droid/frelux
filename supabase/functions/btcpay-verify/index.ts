// FRELUX PAY: verify only against the live BTCPay invoice, then fulfill once.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId, checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { rateLimitedResponse } from "../_shared/cors.ts";
import {
  getBtcPayConfig,
  getBtcPayInvoice,
  mapBtcPayStatus,
  btcPayInvoiceMatchesExpected,
} from "../_shared/btcpay.ts";
import { applySubscriptionPurchase } from "../_shared/subscription-activation.ts";

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
const PLAN_DAYS: Record<string, number> = { monthly: 30, yearly: 365 };

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const userId = await getVerifiedUserId(req);
  if (!userId) return json({ error: "UNAUTHORIZED" }, 401);
  const limit = checkRateLimit(`btcpay-verify:${userId}`, RATE_LIMITS.PAYMENT);
  if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

  try {
    const body = await req.json();
    const invoiceId = typeof body?.invoice_id === "string" ? body.invoice_id.trim() : "";
    if (!invoiceId || invoiceId.length > 200) return json({ error: "INVALID_INVOICE_ID" }, 400);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "PAYMENT_SERVICE_UNAVAILABLE" }, 503);
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: row, error: dbError } = await admin
      .from("crypto_payment_invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    if (dbError) return json({ error: "PAYMENT_RECORD_UNAVAILABLE" }, 503);
    if (!row) return json({ error: "INVOICE_NOT_FOUND" }, 404);
    if (row.user_id !== userId) return json({ error: "FORBIDDEN" }, 403);

    const config = getBtcPayConfig();
    if (!config || row.store_id !== config.storeId) return json({ error: "BTCPAY_NOT_CONFIGURED" }, 503);
    const orderId = typeof row.metadata?.order_id === "string" ? row.metadata.order_id : "";
    let live;
    try {
      live = await getBtcPayInvoice(config, invoiceId);
    } catch (error) {
      console.error("[btcpay-verify] provider unavailable:", error instanceof Error ? error.message : error);
      return json({ error: "BTCPAY_VERIFICATION_UNAVAILABLE" }, 503);
    }
    if (!btcPayInvoiceMatchesExpected(live, {
      invoiceId,
      storeId: row.store_id,
      amountFiat: Number(row.amount_fiat),
      currencyFiat: row.currency_fiat,
      userId,
      purpose: row.purpose,
      orderId,
    })) return json({ error: "PROVIDER_INVOICE_MISMATCH" }, 409);

    const status = mapBtcPayStatus(live.status, live.additionalStatus);
    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("crypto_payment_invoices")
      .update({
        status,
        additional_status: live.additionalStatus,
        confirmed_at: status === "Confirmed" ? (row.confirmed_at || now) : null,
        updated_at: now,
      })
      .eq("invoice_id", invoiceId);
    if (updateError) return json({ error: "PAYMENT_STATUS_PERSIST_FAILED" }, 503);

    let fulfilled = false;
    if (status === "Confirmed" && row.purpose === "subscription") {
      if (!row.plan_id || !row.billing_cycle || !PLAN_DAYS[row.billing_cycle]) {
        return json({ error: "INVALID_SUBSCRIPTION_RECORD" }, 409);
      }
      const activation = await applySubscriptionPurchase(admin, {
        userId,
        provider: "btcpay",
        reference: invoiceId,
        plan: row.plan_id,
        billingCycle: row.billing_cycle,
        amountKobo: Math.round(Number(row.amount_fiat) * 100),
        currency: row.currency_fiat,
        days: PLAN_DAYS[row.billing_cycle],
      });
      if (!activation.ok) return json({ error: "SUBSCRIPTION_FULFILLMENT_FAILED" }, 503);
      fulfilled = activation.result.applied || activation.result.alreadyApplied;
    } else if (status === "Confirmed" && row.purpose === "token_purchase") {
      const tokens = Number(row.metadata?.token_amount);
      const amountMinor = Number(row.metadata?.amount_minor);
      if (!Number.isSafeInteger(tokens) || tokens <= 0 ||
          !Number.isSafeInteger(amountMinor) || amountMinor <= 0 ||
          Math.round(amountMinor) !== Math.round(Number(row.amount_fiat) * 100) ||
          row.currency_fiat !== "USD") {
        return json({ error: "INVALID_TOKEN_PURCHASE_RECORD" }, 409);
      }
      const credit = await admin.rpc("credit_token_purchase", {
        p_user_id: userId,
        p_reference: invoiceId,
        p_tokens: tokens,
        p_amount_kobo: amountMinor,
        p_metadata: { provider: "btcpay", invoice_id: invoiceId, order_id: orderId },
        p_currency: row.currency_fiat,
        p_gateway: "btcpay",
      });
      if (credit.error || !credit.data?.[0]?.success) {
        console.error("[btcpay-verify] token fulfillment failed:", credit.error?.message || credit.data?.[0]?.error);
        return json({ error: "TOKEN_FULFILLMENT_FAILED" }, 503);
      }
      fulfilled = true;
    }

    return json({
      success: true,
      invoice_id: invoiceId,
      status,
      activated: fulfilled && row.purpose === "subscription",
      fulfilled,
      amount_btc: row.amount_btc,
      amount_fiat: row.amount_fiat,
      currency_fiat: row.currency_fiat,
      expires_at: row.expires_at,
    });
  } catch (error) {
    console.error("[btcpay-verify] failed:", error instanceof Error ? error.message : error);
    return json({ error: "PAYMENT_VERIFICATION_FAILED" }, 500);
  }
});
