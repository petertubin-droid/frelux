// =========================================================
// BTCPay Verify — Fallback & Polling Invoice Verification
// FRELUX PAY
//
// 1. Checks current status of invoice on BTCPay Server
// 2. Activates subscription if Settled and not yet activated
// 3. Returns live invoice status and confirmation state
// =========================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { getVerifiedUserId } from "../_shared/rate-limit.ts";
import {
  getBtcPayConfig,
  getBtcPayInvoice,
  getBtcPayPaymentMethods,
  mapBtcPayStatus,
} from "../_shared/btcpay.ts";
import { applySubscriptionPurchase } from "../_shared/subscription-activation.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  const userId = await getVerifiedUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "missing invoice_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch database record
    const { data: invoiceRow, error: dbError } = await adminClient
      .from("crypto_payment_invoices")
      .select("*")
      .eq("invoice_id", invoice_id)
      .maybeSingle();

    if (dbError || !invoiceRow) {
      return new Response(JSON.stringify({ error: "invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (invoiceRow.user_id !== userId) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let currentStatus = invoiceRow.status;
    let btcpayInvoice: unknown = null;
    const btcpayConfig = getBtcPayConfig();

    if (btcpayConfig && btcpayConfig.apiKey) {
      try {
        const liveInvoice = await getBtcPayInvoice(btcpayConfig, invoice_id);
        btcpayInvoice = liveInvoice;
        const mapped = mapBtcPayStatus(
          liveInvoice.status,
          liveInvoice.additionalStatus,
        );

        if (mapped !== currentStatus) {
          currentStatus = mapped;
          await adminClient
            .from("crypto_payment_invoices")
            .update({
              status: currentStatus,
              additional_status: liveInvoice.additionalStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("invoice_id", invoice_id);
        }
      } catch (fetchErr) {
        console.warn("[btcpay-verify] failed to query BTCPay API:", fetchErr);
      }
    }

    // If confirmed and not yet credited in ledger, apply activation
    let activated = false;
    if (
      currentStatus === "Confirmed" &&
      invoiceRow.purpose === "subscription"
    ) {
      const plan = invoiceRow.plan_id || "pro";
      const billingCycle = invoiceRow.billing_cycle || "monthly";
      const days = PLAN_DURATIONS_DAYS[billingCycle] || 30;
      const amountCents = Math.round(invoiceRow.amount_fiat * 100);

      const activation = await applySubscriptionPurchase(adminClient, {
        userId,
        provider: "btcpay" as unknown as "paystack",
        reference: invoice_id,
        plan,
        billingCycle,
        amountKobo: amountCents,
        currency: invoiceRow.currency_fiat || "USD",
        days,
      });

      if (activation.ok) {
        activated = activation.result.applied;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id,
        status: currentStatus,
        activated,
        amount_btc: invoiceRow.amount_btc,
        amount_fiat: invoiceRow.amount_fiat,
        currency_fiat: invoiceRow.currency_fiat,
        expires_at: invoiceRow.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
