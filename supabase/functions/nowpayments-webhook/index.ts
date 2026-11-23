// FRELUX PAY: authenticated NOWPayments IPN webhook; provider signature and state
// are verified before any payment is recorded or entitlement is issued.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  getNowPaymentsConfig,
  verifyNowPaymentsIpnSignature,
  mapNowPaymentsStatus,
  nowPaymentsInvoiceMatchesExpected,
} from "../_shared/nowpayments.ts";
import { applySubscriptionPurchase } from "../_shared/subscription-activation.ts";

const headers = {
  "Access-Control-Allow-Headers": "content-type, x-nowpayments-sig",
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

  const config = await getNowPaymentsConfig();
  const ipnSecret =
    Deno.env.get("NOWPAYMENTS_IPN_SECRET") || config?.ipnSecret || "";
  if (!ipnSecret || !config) {
    return json({ error: "NOWPAYMENTS_WEBHOOK_UNCONFIGURED" }, 503);
  }

  const rawBody = await req.text();
  if (rawBody.length > 1_000_000)
    return json({ error: "PAYLOAD_TOO_LARGE" }, 413);

  const signature =
    req.headers.get("x-nowpayments-sig") ||
    req.headers.get("X-NOWPAYMENTS-SIG");
  const isValidSig = await verifyNowPaymentsIpnSignature(
    rawBody,
    signature,
    ipnSecret,
  );
  if (!isValidSig) {
    return json({ error: "INVALID_SIGNATURE" }, 401);
  }

  try {
    const payload = JSON.parse(rawBody);
    const invoiceId = String(payload.invoice_id || "");
    const orderId = String(payload.order_id || "");
    const paymentStatus = String(payload.payment_status || "");

    if (!invoiceId && !orderId) {
      return json({ error: "INVALID_PAYLOAD_IDENTIFIER" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "PAYMENT_SERVICE_UNAVAILABLE" }, 503);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let query = admin.from("crypto_payment_invoices").select("*");
    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    } else {
      query = query.contains("metadata", { order_id: orderId });
    }

    const { data: row, error: readError } = await query.maybeSingle();
    if (readError) return json({ error: "PAYMENT_RECORD_UNAVAILABLE" }, 503);
    if (!row) return json({ error: "INVOICE_NOT_FOUND" }, 404);

    const expectedOrderId =
      typeof row.metadata?.order_id === "string" ? row.metadata.order_id : "";
    if (
      !nowPaymentsInvoiceMatchesExpected(
        {
          order_id: orderId,
          price_amount: payload.price_amount,
          price_currency: payload.price_currency,
        },
        {
          amountFiat: Number(row.amount_fiat),
          currencyFiat: row.currency_fiat,
          orderId: expectedOrderId,
        },
      )
    ) {
      return json({ error: "PROVIDER_INVOICE_MISMATCH" }, 409);
    }

    const status = mapNowPaymentsStatus(paymentStatus);
    const now = new Date().toISOString();

    const updateFields: Record<string, unknown> = {
      status,
      updated_at: now,
    };
    if (status === "Confirmed") {
      updateFields.confirmed_at = row.confirmed_at || now;
    }
    if (payload.pay_address) {
      updateFields.btc_address = String(payload.pay_address);
    }
    if (payload.pay_currency) {
      updateFields.payment_method = String(payload.pay_currency).toUpperCase();
    }

    const { error: updateError } = await admin
      .from("crypto_payment_invoices")
      .update(updateFields)
      .eq("invoice_id", row.invoice_id);

    if (updateError) {
      return json({ error: "PAYMENT_STATUS_PERSIST_FAILED" }, 503);
    }

    if (status !== "Confirmed") {
      return json({ status: "success", action: status.toLowerCase() });
    }

    const paymentId = String(payload.payment_id || row.invoice_id);
    const paymentMethod = String(
      payload.pay_currency || row.payment_method || "CRYPTO",
    ).toUpperCase();
    const payAmount = Number(payload.pay_amount || payload.actual_amount || 0);

    const { error: ledgerError } = await admin
      .from("crypto_payment_transactions")
      .upsert(
        {
          invoice_id: row.invoice_id,
          user_id: row.user_id,
          payment_method: paymentMethod,
          payment_id: paymentId,
          amount_btc: paymentMethod === "BTC" ? payAmount : 0,
          amount_sats:
            paymentMethod === "BTC"
              ? Math.round(payAmount * 100_000_000)
              : null,
          status: "Settled",
          tx_hash: payload.hash || null,
          raw_payload: payload,
        },
        { onConflict: "payment_method, payment_id" },
      );

    if (ledgerError) {
      console.error("[nowpayments-webhook] ledger error:", ledgerError.message);
    }

    if (row.purpose === "subscription") {
      if (!row.plan_id || !row.billing_cycle || !PLAN_DAYS[row.billing_cycle]) {
        return json({ error: "INVALID_SUBSCRIPTION_RECORD" }, 409);
      }
      const activation = await applySubscriptionPurchase(admin, {
        userId: row.user_id,
        provider: "nowpayments",
        reference: row.invoice_id,
        plan: row.plan_id,
        billingCycle: row.billing_cycle,
        amountKobo: Math.round(Number(row.amount_fiat) * 100),
        currency: row.currency_fiat,
        days: PLAN_DAYS[row.billing_cycle],
      });
      if (!activation.ok) {
        return json({ error: "SUBSCRIPTION_FULFILLMENT_FAILED" }, 503);
      }
    } else if (row.purpose === "token_purchase") {
      const tokens = Number(row.metadata?.token_amount);
      const amountMinor = Number(row.metadata?.amount_minor);
      if (
        !Number.isSafeInteger(tokens) ||
        tokens <= 0 ||
        !Number.isSafeInteger(amountMinor) ||
        amountMinor <= 0
      ) {
        return json({ error: "INVALID_TOKEN_PURCHASE_RECORD" }, 409);
      }
      const credit = await admin.rpc("credit_token_purchase", {
        p_user_id: row.user_id,
        p_reference: row.invoice_id,
        p_tokens: tokens,
        p_amount_kobo: amountMinor,
        p_metadata: {
          provider: "nowpayments",
          invoice_id: row.invoice_id,
          order_id: expectedOrderId,
        },
        p_currency: row.currency_fiat,
        p_gateway: "nowpayments",
      });
      if (credit.error || !credit.data?.[0]?.success) {
        console.error(
          "[nowpayments-webhook] token fulfillment failed:",
          credit.error?.message || credit.data?.[0]?.error,
        );
        return json({ error: "TOKEN_FULFILLMENT_FAILED" }, 503);
      }
    }

    return json({ status: "success", action: "fulfilled" });
  } catch (error) {
    console.error(
      "[nowpayments-webhook] failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "WEBHOOK_PROCESSING_FAILED" }, 500);
  }
});
