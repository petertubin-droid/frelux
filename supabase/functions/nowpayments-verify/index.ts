// FRELUX PAY: verify only against the live NOWPayments invoice/payment, then fulfill once.
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
  getNowPaymentsPayment,
  getNowPaymentsPayments,
  mapNowPaymentsStatus,
  nowPaymentsInvoiceMatchesExpected,
  type NowPaymentsPaymentResponse,
} from "../_shared/nowpayments.ts";
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
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const userId = await getVerifiedUserId(req);
  if (!userId) return json({ error: "UNAUTHORIZED" }, 401);
  const limit = checkRateLimit(
    `nowpayments-verify:${userId}`,
    RATE_LIMITS.PAYMENT,
  );
  if (!limit.allowed) return rateLimitedResponse(limit.resetAt);

  try {
    const body = await req.json();
    const invoiceId =
      typeof body?.invoice_id === "string" ? body.invoice_id.trim() : "";
    const orderId =
      typeof body?.order_id === "string" ? body.order_id.trim() : "";

    if (!invoiceId && !orderId) {
      return json({ error: "INVALID_IDENTIFIER" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey)
      return json({ error: "PAYMENT_SERVICE_UNAVAILABLE" }, 503);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let query = admin.from("crypto_payment_invoices").select("*");
    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    } else {
      query = query.contains("metadata", { order_id: orderId });
    }

    let { data: row, error: dbError } = await query.maybeSingle();
    if (dbError) return json({ error: "PAYMENT_RECORD_UNAVAILABLE" }, 503);

    // Fallback if containment lookup failed on orderId
    if (!row && orderId) {
      const { data: userInvoices } = await admin
        .from("crypto_payment_invoices")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      row =
        userInvoices?.find(
          (r) =>
            typeof r.metadata === "object" &&
            r.metadata !== null &&
            r.metadata.order_id === orderId,
        ) ?? null;
    }

    if (!row) return json({ error: "INVOICE_NOT_FOUND" }, 404);
    if (row.user_id !== userId) return json({ error: "FORBIDDEN" }, 403);

    // If already confirmed and fulfilled in the database, return early
    if (row.status === "Confirmed") {
      return json({
        success: true,
        invoice_id: row.invoice_id,
        status: "Confirmed",
        activated: row.purpose === "subscription",
        fulfilled: true,
        amount_fiat: row.amount_fiat,
        currency_fiat: row.currency_fiat,
        expires_at: row.expires_at,
      });
    }

    const config = await getNowPaymentsConfig();
    if (!config) return json({ error: "NOWPAYMENTS_NOT_CONFIGURED" }, 503);

    const expectedOrderId =
      typeof row.metadata?.order_id === "string" ? row.metadata.order_id : "";

    let liveStatus: string | null = null;
    let livePriceAmount: number | string = row.amount_fiat;
    let livePriceCurrency: string = row.currency_fiat;
    let liveOrderId = expectedOrderId;
    let matchedPayment: NowPaymentsPaymentResponse | null = null;

    // 1. Check for recorded payment transaction with payment_id
    let knownPaymentId: string | number | null =
      row.metadata?.payment_id || null;
    if (!knownPaymentId) {
      const { data: tx } = await admin
        .from("crypto_payment_transactions")
        .select("payment_id")
        .eq("invoice_id", row.invoice_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tx?.payment_id) {
        knownPaymentId = tx.payment_id;
      }
    }

    // 2. If payment_id is known, query status by payment ID
    if (knownPaymentId) {
      try {
        const p = await getNowPaymentsPayment(config, knownPaymentId);
        if (p && p.payment_status) {
          matchedPayment = p;
          liveStatus = p.payment_status;
          livePriceAmount = p.price_amount;
          livePriceCurrency = p.price_currency;
          liveOrderId = p.order_id || liveOrderId;
        }
      } catch (err) {
        console.warn(
          "[nowpayments-verify] payment status lookup by payment_id failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // 3. If no matched payment yet, search recent payments list by order_id or invoice_id
    if (!matchedPayment) {
      try {
        const { data: paymentsList } = await getNowPaymentsPayments(config, {
          limit: 30,
        });
        const expectedOrder = String(expectedOrderId || "").trim();
        const invIdStr = String(row.invoice_id || "").trim();

        const match = paymentsList.find((p) => {
          const pOrder = String(p.order_id || "").trim();
          const pInvoice = String(p.invoice_id || "").trim();
          if (expectedOrder && pOrder === expectedOrder) return true;
          if (invIdStr && pInvoice === invIdStr) return true;
          return false;
        });

        if (match && match.payment_status) {
          matchedPayment = match;
          liveStatus = match.payment_status;
          livePriceAmount = match.price_amount;
          livePriceCurrency = match.price_currency;
          liveOrderId = match.order_id || liveOrderId;
        }
      } catch (err) {
        console.warn(
          "[nowpayments-verify] payments list search failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Determine target status: preserve persisted status unless provider returns a valid update
    let status = row.status;
    if (matchedPayment && liveStatus) {
      if (
        !nowPaymentsInvoiceMatchesExpected(
          {
            order_id: liveOrderId,
            price_amount: livePriceAmount,
            price_currency: livePriceCurrency,
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

      const mappedStatus = mapNowPaymentsStatus(liveStatus);
      // NEVER regress an active Processing state back to Pending
      if (row.status === "Processing" && mappedStatus === "Pending") {
        status = "Processing";
      } else {
        status = mappedStatus;
      }
    }

    const now = new Date().toISOString();
    // Only update DB if status changed or newly confirmed
    if (
      status !== row.status ||
      (status === "Confirmed" && !row.confirmed_at)
    ) {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: now,
      };
      if (status === "Confirmed") {
        updateData.confirmed_at = row.confirmed_at || now;
      }
      if (matchedPayment?.pay_address) {
        updateData.btc_address = String(matchedPayment.pay_address);
      }
      if (matchedPayment?.pay_currency) {
        updateData.payment_method = String(
          matchedPayment.pay_currency,
        ).toUpperCase();
      }
      const { error: updateError } = await admin
        .from("crypto_payment_invoices")
        .update(updateData)
        .eq("invoice_id", row.invoice_id);
      if (updateError)
        return json({ error: "PAYMENT_STATUS_PERSIST_FAILED" }, 503);
    }

    let fulfilled = false;
    if (status === "Confirmed" && row.purpose === "subscription") {
      if (!row.plan_id || !row.billing_cycle || !PLAN_DAYS[row.billing_cycle]) {
        return json({ error: "INVALID_SUBSCRIPTION_RECORD" }, 409);
      }
      const activation = await applySubscriptionPurchase(admin, {
        userId,
        provider: "nowpayments",
        reference: row.invoice_id,
        plan: row.plan_id,
        billingCycle: row.billing_cycle,
        amountKobo: Math.round(Number(row.amount_fiat) * 100),
        currency: row.currency_fiat,
        days: PLAN_DAYS[row.billing_cycle],
      });
      if (!activation.ok)
        return json({ error: "SUBSCRIPTION_FULFILLMENT_FAILED" }, 503);
      fulfilled = activation.result.applied || activation.result.alreadyApplied;
    } else if (status === "Confirmed" && row.purpose === "token_purchase") {
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
        p_user_id: userId,
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
          "[nowpayments-verify] token fulfillment failed:",
          credit.error?.message || credit.data?.[0]?.error,
        );
        return json({ error: "TOKEN_FULFILLMENT_FAILED" }, 503);
      }
      fulfilled = true;
    }

    return json({
      success: true,
      invoice_id: row.invoice_id,
      status,
      activated: fulfilled && row.purpose === "subscription",
      fulfilled,
      amount_fiat: row.amount_fiat,
      currency_fiat: row.currency_fiat,
      expires_at: row.expires_at,
    });
  } catch (error) {
    console.error(
      "[nowpayments-verify] failed:",
      error instanceof Error ? error.message : error,
    );
    return json({ error: "PAYMENT_VERIFICATION_FAILED" }, 500);
  }
});
