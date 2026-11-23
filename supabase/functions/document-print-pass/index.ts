// =========================================================
// Issues a document print pass, but only against a payment that the gateway
// itself confirms.
//
// The browser sends a reference; nothing it says about price or entitlement is
// trusted. The amount is re-derived here from DOCUMENT_PRINT_USD and the live
// fx_rates row for the currency the gateway actually charged, and the pass is
// written with the service role. A reference already used for another document
// is rejected by the unique index, so one payment cannot unlock many documents.
// =========================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serveWithCors } from "../_shared/serve.ts";
import { corsHeaders } from "../_shared/cors.ts";

const DOCUMENT_PRINT_USD = 1.09;
const PASS_HOURS = 48;
/** Rounding tolerance: local rounding must not make a fair payment fail. */
const AMOUNT_TOLERANCE = 0.97;

type Gateway = "paystack" | "flutterwave" | "nowpayments" | "btcpay";

interface VerifiedCharge {
  amountMinor: number;
  currency: string;
  metadata: Record<string, unknown>;
  /** Crypto invoices carry the document in the order id this server set. */
  orderId?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyPaystack(reference: string): Promise<VerifiedCharge> {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) throw new Error("paystack_not_configured");
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const payload = await res.json();
  if (!res.ok || !payload?.status || payload?.data?.status !== "success") {
    throw new Error("payment_not_successful");
  }
  const tx = payload.data;
  return {
    amountMinor: Number(tx.amount),
    currency: String(tx.currency || "").toUpperCase(),
    metadata: (tx.metadata ?? {}) as Record<string, unknown>,
  };
}

async function verifyFlutterwave(reference: string): Promise<VerifiedCharge> {
  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if (!secret) throw new Error("flutterwave_not_configured");
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const payload = await res.json();
  if (
    !res.ok ||
    payload?.status !== "success" ||
    payload?.data?.status !== "successful"
  ) {
    throw new Error("payment_not_successful");
  }
  const tx = payload.data;
  return {
    amountMinor: Math.round(Number(tx.amount) * 100),
    currency: String(tx.currency || "").toUpperCase(),
    metadata: (tx.meta ?? {}) as Record<string, unknown>,
  };
}

async function verifyNowPayments(invoiceId: string): Promise<VerifiedCharge> {
  const key = Deno.env.get("NOWPAYMENTS_API_KEY");
  if (!key) throw new Error("nowpayments_not_configured");
  const res = await fetch(
    `https://api.nowpayments.io/v1/invoice/${encodeURIComponent(invoiceId)}`,
    { headers: { "x-api-key": key } },
  );
  const invoice = await res.json();
  if (!res.ok) throw new Error("payment_not_successful");
  const status = String(invoice?.payment_status ?? "").toLowerCase();
  // Only money that arrived counts; waiting or confirming does not.
  if (status !== "finished" && status !== "confirmed") {
    throw new Error("payment_not_successful");
  }
  return {
    amountMinor: Math.round(Number(invoice?.price_amount) * 100),
    currency: String(invoice?.price_currency ?? "usd").toUpperCase(),
    metadata: {},
    orderId: String(invoice?.order_id ?? ""),
  };
}

async function verifyBtcPay(invoiceId: string): Promise<VerifiedCharge> {
  const base = Deno.env.get("BTCPAY_URL") ?? Deno.env.get("BTCPAY_SERVER_URL");
  const storeId = Deno.env.get("BTCPAY_STORE_ID");
  const apiKey = Deno.env.get("BTCPAY_API_KEY");
  if (!base || !storeId || !apiKey) throw new Error("btcpay_not_configured");
  const res = await fetch(
    `${base.replace(/\/$/, "")}/api/v1/stores/${storeId}/invoices/${encodeURIComponent(invoiceId)}`,
    { headers: { Authorization: `token ${apiKey}` } },
  );
  const invoice = await res.json();
  if (!res.ok) throw new Error("payment_not_successful");
  // Settled is the only state that means the bitcoin arrived.
  if (String(invoice?.status ?? "") !== "Settled") {
    throw new Error("payment_not_successful");
  }
  return {
    amountMinor: Math.round(Number(invoice?.amount) * 100),
    currency: String(invoice?.currency ?? "USD").toUpperCase(),
    metadata: (invoice?.metadata ?? {}) as Record<string, unknown>,
    orderId: String(invoice?.orderId ?? ""),
  };
}

serveWithCors(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer "))
    return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const documentId = String(body?.documentId ?? "").trim();
  const reference = String(body?.reference ?? "").trim();
  const gateway = String(body?.gateway ?? "") as Gateway;

  if (!documentId || documentId.length > 200)
    return json({ error: "Missing documentId" }, 400);
  if (!reference) return json({ error: "Missing reference" }, 400);
  if (!["paystack", "flutterwave", "nowpayments", "btcpay"].includes(gateway)) {
    return json({ error: "Unsupported gateway" }, 400);
  }

  let charge: VerifiedCharge;
  try {
    if (gateway === "paystack") charge = await verifyPaystack(reference);
    else if (gateway === "flutterwave")
      charge = await verifyFlutterwave(reference);
    else if (gateway === "nowpayments")
      charge = await verifyNowPayments(reference);
    else charge = await verifyBtcPay(reference);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "verification_failed";
    const status = reason === "payment_not_successful" ? 402 : 503;
    return json({ error: reason }, status);
  }

  // Prove the payment belongs to this document, and to this user where the rail
  // carries an identity. Card rails stamp both in metadata; a NOWPayments
  // invoice carries the document in the order id this server set at creation.
  const meta = charge.metadata ?? {};
  const metaPurpose = String(meta.purpose ?? "");
  const metaUser = String(meta.user_id ?? meta.userId ?? "");
  const metaDocument = String(meta.document_id ?? meta.documentId ?? "");
  const matches =
    gateway === "nowpayments"
      ? charge.orderId === `FRX-PRINT-${documentId}`
      : metaPurpose === "document_print" &&
        metaUser === user.id &&
        metaDocument === documentId;
  if (!matches) {
    return json({ error: "Payment does not match this document" }, 403);
  }

  const currency = charge.currency;
  if (!/^[A-Z]{3}$/.test(currency))
    return json({ error: "Unknown charge currency" }, 400);

  const service = createClient(supabaseUrl, serviceRoleKey);

  // Price from the live rate the platform uses, never from the request body.
  let rate = 1;
  if (currency !== "USD") {
    const { data: fx } = await service
      .from("fx_rates")
      .select("rate")
      .eq("base_currency", "USD")
      .eq("quote_currency", currency)
      .eq("is_active", true)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const parsed = Number(fx?.rate);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Refuse rather than guess: charging a currency we cannot price is how a
      // fee silently becomes a fraction of what it should be.
      return json({ error: `No active FX rate for ${currency}` }, 409);
    }
    rate = parsed;
  }

  const expectedMinor = Math.round(DOCUMENT_PRINT_USD * rate * 100);
  if (!(charge.amountMinor >= expectedMinor * AMOUNT_TOLERANCE)) {
    return json(
      {
        error: "Amount paid is below the document print fee",
        expectedMinor,
        currency,
      },
      402,
    );
  }

  const expiresAt = new Date(Date.now() + PASS_HOURS * 3600_000).toISOString();
  const { data: pass, error: passError } = await service
    .from("document_print_passes")
    .upsert(
      {
        user_id: user.id,
        document_id: documentId,
        amount_minor: charge.amountMinor,
        currency,
        usd_amount: DOCUMENT_PRINT_USD,
        gateway,
        provider_reference: reference,
        expires_at: expiresAt,
      },
      { onConflict: "user_id,document_id" },
    )
    .select("document_id, expires_at, currency, amount_minor")
    .single();

  if (passError) {
    const duplicate = passError.code === "23505";
    return json(
      {
        error: duplicate
          ? "This payment has already unlocked a document"
          : "Could not record the print pass",
      },
      duplicate ? 409 : 500,
    );
  }

  return json({ pass });
});
