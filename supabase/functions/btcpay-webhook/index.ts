// FRELUX PAY: authenticated BTCPay webhook; provider state is re-read before
// any payment is recorded or entitlement is issued.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  getBtcPayConfig,
  getBtcPayInvoice,
  getBtcPayPaymentMethods,
  verifyBtcPayWebhookSignature,
  mapBtcPayStatus,
  btcToSatoshis,
  btcPayInvoiceMatchesExpected,
} from "../_shared/btcpay.ts";
import { applySubscriptionPurchase } from "../_shared/subscription-activation.ts";

const headers = {
  "Access-Control-Allow-Headers": "content-type, btcpay-sig",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
const PLAN_DAYS: Record<string, number> = { monthly: 30, yearly: 365 };

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const config = await getBtcPayConfig();
  // The webhook secret follows the same env-then-admin-key resolution, so a
  // secret pasted in the Integration Center verifies signatures without a
  // redeploy. Without it, signatures cannot be checked and we refuse.
  const webhookSecret =
    Deno.env.get("BTCPAY_WEBHOOK_SECRET") || config?.webhookSecret || "";
  if (!webhookSecret || !config) return json({ error: "BTCPAY_WEBHOOK_UNCONFIGURED" }, 503);
  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) return json({ error: "PAYLOAD_TOO_LARGE" }, 413);
  const signature = req.headers.get("BTCPay-Sig") || req.headers.get("btcpay-sig");
  if (!(await verifyBtcPayWebhookSignature(rawBody, signature, webhookSecret))) {
    return json({ error: "INVALID_SIGNATURE" }, 401);
  }

  try {
    const event = JSON.parse(rawBody);
    const eventType = typeof event?.type === "string" ? event.type : "";
    const invoiceId = typeof event?.invoiceId === "string" ? event.invoiceId : "";
    if (!invoiceId || invoiceId.length > 200) return json({ error: "INVALID_INVOICE_ID" }, 400);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "PAYMENT_SERVICE_UNAVAILABLE" }, 503);
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: row, error: readError } = await admin
      .from("crypto_payment_invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    if (readError) return json({ error: "PAYMENT_RECORD_UNAVAILABLE" }, 503);
    if (!row) return json({ error: "INVOICE_NOT_FOUND" }, 404);
    if (row.store_id !== config.storeId) return json({ error: "STORE_MISMATCH" }, 409);
    const orderId = typeof row.metadata?.order_id === "string" ? row.metadata.order_id : "";

    // Signed webhooks are necessary but not enough: fetch and bind the live
    // invoice before any settlement or terminal-state update.
    let live;
    try {
      live = await getBtcPayInvoice(config, invoiceId);
    } catch (error) {
      console.error("[btcpay-webhook] live invoice check failed:", error instanceof Error ? error.message : error);
      return json({ error: "BTCPAY_VERIFICATION_UNAVAILABLE" }, 503);
    }
    if (!btcPayInvoiceMatchesExpected(live, {
      invoiceId,
      storeId: row.store_id,
      amountFiat: Number(row.amount_fiat),
      currencyFiat: row.currency_fiat,
      userId: row.user_id,
      purpose: row.purpose,
      orderId,
    })) return json({ error: "PROVIDER_INVOICE_MISMATCH" }, 409);

    const status = mapBtcPayStatus(live.status, live.additionalStatus);
    const eventMatches =
      (eventType === "InvoiceSettled" && status === "Confirmed") ||
      ((eventType === "InvoiceProcessing" || eventType === "InvoiceReceivedPayment") && status === "Processing") ||
      (eventType === "InvoiceExpired" && status === "Expired") ||
      (eventType === "InvoiceInvalid" && status === "Failed");
    if (!eventMatches) return json({ error: "EVENT_PROVIDER_STATE_MISMATCH" }, 409);

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

    if (status !== "Confirmed") return json({ status: "success", action: status.toLowerCase() });

    const payment = event.payment && typeof event.payment === "object" ? event.payment : {};
    let amountBtc = Number(payment.value || 0);
    if (!Number.isFinite(amountBtc) || amountBtc <= 0) {
      try {
        const methods = await getBtcPayPaymentMethods(config, invoiceId);
        const btcMethod = methods.find((method) =>
          method.paymentMethod?.toUpperCase().startsWith("BTC") || method.cryptoCode?.toUpperCase() === "BTC",
        );
        // Use provider-reported amount actually received, never the original
        // quote amount as a substitute for a settlement record.
        amountBtc = Number(btcMethod?.totalPaid || 0);
      } catch {
        amountBtc = 0;
      }
    }
    if (!Number.isFinite(amountBtc) || amountBtc <= 0) {
      return json({ error: "SETTLED_PAYMENT_AMOUNT_UNAVAILABLE" }, 503);
    }

    const paymentMethod = typeof payment.paymentMethod === "string" ? payment.paymentMethod : "BTC";
    const paymentId = typeof payment.paymentId === "string" && payment.paymentId
      ? payment.paymentId
      : invoiceId;
    const txHash = typeof payment.txHash === "string" ? payment.txHash :
      typeof payment.id === "string" ? payment.id : null;
    const { error: ledgerError } = await admin.from("crypto_payment_transactions").upsert({
      invoice_id: invoiceId,
      user_id: row.user_id,
      payment_method: paymentMethod,
      payment_id: paymentId,
      amount_btc: amountBtc,
      amount_sats: btcToSatoshis(amountBtc),
      status: "Settled",
      confirmations: Number.isSafeInteger(payment.confirmations) && payment.confirmations >= 0
        ? payment.confirmations
        : null,
      tx_hash: txHash,
      raw_payload: event,
    }, { onConflict: "payment_method, payment_id" });
    if (ledgerError) return json({ error: "PAYMENT_LEDGER_WRITE_FAILED" }, 503);

    if (row.purpose === "subscription") {
      if (!row.plan_id || !row.billing_cycle || !PLAN_DAYS[row.billing_cycle]) {
        return json({ error: "INVALID_SUBSCRIPTION_RECORD" }, 409);
      }
      const activation = await applySubscriptionPurchase(admin, {
        userId: row.user_id,
        provider: "btcpay",
        reference: invoiceId,
        plan: row.plan_id,
        billingCycle: row.billing_cycle,
        amountKobo: Math.round(Number(row.amount_fiat) * 100),
        currency: row.currency_fiat,
        days: PLAN_DAYS[row.billing_cycle],
      });
      if (!activation.ok) return json({ error: "SUBSCRIPTION_FULFILLMENT_FAILED" }, 503);
    } else if (row.purpose === "token_purchase") {
      const tokens = Number(row.metadata?.token_amount);
      const amountMinor = Number(row.metadata?.amount_minor);
      if (row.currency_fiat !== "USD" || !Number.isSafeInteger(tokens) || tokens <= 0 ||
          !Number.isSafeInteger(amountMinor) || amountMinor !== Math.round(Number(row.amount_fiat) * 100)) {
        return json({ error: "INVALID_TOKEN_PURCHASE_RECORD" }, 409);
      }
      const credit = await admin.rpc("credit_token_purchase", {
        p_user_id: row.user_id,
        p_reference: invoiceId,
        p_tokens: tokens,
        p_amount_kobo: amountMinor,
        p_metadata: { provider: "btcpay", invoice_id: invoiceId, order_id: orderId },
        p_currency: row.currency_fiat,
        p_gateway: "btcpay",
      });
      if (credit.error || !credit.data?.[0]?.success) {
        console.error("[btcpay-webhook] token fulfillment failed:", credit.error?.message || credit.data?.[0]?.error);
        return json({ error: "TOKEN_FULFILLMENT_FAILED" }, 503);
      }
    } else {
      return json({ error: "UNSUPPORTED_PURPOSE" }, 409);
    }

    return json({ status: "success", action: "fulfilled" });
  } catch (error) {
    console.error("[btcpay-webhook] failed:", error instanceof Error ? error.message : error);
    return json({ error: "WEBHOOK_PROCESSING_FAILED" }, 500);
  }
});
