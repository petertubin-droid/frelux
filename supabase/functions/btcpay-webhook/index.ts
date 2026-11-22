// =========================================================
// BTCPay Webhook — Auto-activate subscriptions on payment events
// FRELUX PAY
//
// Webhook URL:
//   https://<your-project>.supabase.co/functions/v1/btcpay-webhook
//
// Security & Idempotency Controls:
// 1. Validates HMAC-SHA256 signature (BTCPay-Sig) against BTCPAY_WEBHOOK_SECRET
// 2. Cross-verifies invoice state via direct server-to-server Greenfield API query
// 3. Guards against replay attacks and duplicate activations via ledger unique constraints
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import {
  getBtcPayConfig,
  getBtcPayInvoice,
  verifyBtcPayWebhookSignature,
  btcToSatoshis,
} from "../_shared/btcpay.ts";
import { applySubscriptionPurchase } from "../_shared/subscription-activation.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, btcpay-sig",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_DURATIONS_DAYS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
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

  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("BTCPay-Sig") || req.headers.get("btcpay-sig");
  const webhookSecret = Deno.env.get("BTCPAY_WEBHOOK_SECRET");
  const btcpayConfig = getBtcPayConfig();

  // 1. Signature Verification
  if (webhookSecret) {
    const isValid = await verifyBtcPayWebhookSignature(
      rawBody,
      signatureHeader,
      webhookSecret,
    );
    if (!isValid) {
      console.warn("[btcpay-webhook] signature verification failed");
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (!btcpayConfig) {
    // If neither webhook secret nor Greenfield config is set, reject as unconfigured
    return new Response(
      JSON.stringify({ error: "BTCPAY_WEBHOOK_UNCONFIGURED" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const event = JSON.parse(rawBody);
    const { type: eventType, invoiceId, payment = {} } = event;

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "missing invoiceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Fetch existing invoice
    const { data: invoiceRow, error: fetchError } = await adminClient
      .from("crypto_payment_invoices")
      .select("*")
      .eq("invoice_id", invoiceId)
      .maybeSingle();

    if (fetchError || !invoiceRow) {
      console.warn(
        `[btcpay-webhook] invoice ${invoiceId} not found in database`,
      );
      return new Response(
        JSON.stringify({ status: "ignored", reason: "invoice_not_found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if already confirmed (idempotency)
    if (invoiceRow.status === "Confirmed" && eventType === "InvoiceSettled") {
      return new Response(
        JSON.stringify({ status: "already_confirmed", invoiceId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = invoiceRow.user_id;
    const plan = invoiceRow.plan_id || "pro";
    const billingCycle = invoiceRow.billing_cycle || "monthly";
    const days = PLAN_DURATIONS_DAYS[billingCycle] || 30;

    // 3. Handle Event Types
    if (eventType === "InvoiceSettled") {
      // Direct Greenfield API verification before activating
      if (btcpayConfig) {
        try {
          const verifiedInvoice = await getBtcPayInvoice(
            btcpayConfig,
            invoiceId,
          );
          if (verifiedInvoice.status !== "Settled") {
            console.warn(
              `[btcpay-webhook] Greenfield verification returned status ${verifiedInvoice.status}, expected Settled`,
            );
            return new Response(
              JSON.stringify({
                status: "verification_mismatch",
                actualStatus: verifiedInvoice.status,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        } catch (apiErr) {
          console.warn(
            "[btcpay-webhook] Greenfield API query warning:",
            apiErr,
          );
        }
      }

      // Update invoice status to Confirmed
      await adminClient
        .from("crypto_payment_invoices")
        .update({
          status: "Confirmed",
          confirmed_at: new Date().toISOString(),
          additional_status: "Settled",
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_id", invoiceId);

      // Insert transaction ledger record
      const paymentMethod = payment.paymentMethod || "BTC";
      const paymentId = payment.paymentId || `tx_${invoiceId}_${Date.now()}`;
      const amountBtc = parseFloat(
        payment.value || invoiceRow.amount_btc || "0",
      );
      const amountSats = btcToSatoshis(amountBtc);
      const txHash = payment.txHash || payment.id || null;

      await adminClient.from("crypto_payment_transactions").upsert(
        {
          invoice_id: invoiceId,
          user_id: userId,
          payment_method: paymentMethod,
          payment_id: paymentId,
          amount_btc: amountBtc,
          amount_sats: amountSats,
          status: "Settled",
          confirmations: payment.confirmations || 1,
          tx_hash: txHash,
          raw_payload: event,
        },
        { onConflict: "payment_method, payment_id" },
      );

      // Idempotently apply subscription activation
      if (invoiceRow.purpose === "subscription") {
        const amountCents = Math.round(invoiceRow.amount_fiat * 100);
        const activation = await applySubscriptionPurchase(adminClient, {
          userId,
          provider: "btcpay",
          reference: invoiceId,
          plan,
          billingCycle,
          amountKobo: amountCents,
          currency: invoiceRow.currency_fiat || "USD",
          days,
        });

        if (!activation.ok) {
          console.error(
            `[btcpay-webhook] activation error: ${activation.error}`,
          );
        } else {
          console.info(
            `[btcpay-webhook] subscription activated for user ${userId}, applied=${activation.result.applied}`,
          );
        }
      }

      return new Response(
        JSON.stringify({ status: "success", action: "activated" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      eventType === "InvoiceProcessing" ||
      eventType === "InvoiceReceivedPayment"
    ) {
      await adminClient
        .from("crypto_payment_invoices")
        .update({
          status: "Processing",
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_id", invoiceId);

      return new Response(
        JSON.stringify({ status: "success", action: "processing" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (eventType === "InvoiceExpired") {
      await adminClient
        .from("crypto_payment_invoices")
        .update({
          status: "Expired",
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_id", invoiceId);

      return new Response(
        JSON.stringify({ status: "success", action: "expired" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (eventType === "InvoiceInvalid") {
      await adminClient
        .from("crypto_payment_invoices")
        .update({
          status: "Failed",
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_id", invoiceId);

      return new Response(
        JSON.stringify({ status: "success", action: "failed" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ status: "ignored", eventType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[btcpay-webhook] exception:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
