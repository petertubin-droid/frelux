// =========================================================
// Ported: document-print-pass
//
// Same contract as the Supabase function: the browser sends a gateway
// reference and the server decides whether it is money. Price is re-derived
// here from DOCUMENT_PRINT_USD and the live fx_rates row for the currency the
// gateway actually charged, and the pass is written with the service role key.
// A reference already used for another document is rejected by the unique
// index, so one payment cannot unlock many documents.
//
// Everything is I/O: one GoTrue call, one gateway call, one PostgREST read and
// one upsert. No computation beyond JSON, so it fits the free tier's 10 ms CPU
// budget; the waiting happens on the network, which is not billed as CPU.
// =========================================================

import { type EdgeContext, type EdgeEnv, json } from "./runtime";

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

function rest(env: EdgeEnv): { base: string; key: string } | null {
  const base =
    typeof env.SUPABASE_URL === "string"
      ? env.SUPABASE_URL.replace(/\/+$/, "")
      : "";
  const key =
    typeof env.SUPABASE_SERVICE_ROLE_KEY === "string"
      ? env.SUPABASE_SERVICE_ROLE_KEY
      : "";
  return base && key ? { base, key } : null;
}

function text(env: EdgeEnv, name: string): string {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

async function verifyPaystack(
  reference: string,
  env: EdgeEnv,
): Promise<VerifiedCharge> {
  const secret = text(env, "PAYSTACK_SECRET_KEY");
  if (!secret) throw new Error("paystack_not_configured");
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const payload = (await res.json()) as {
    status?: boolean;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, unknown>;
    };
  };
  if (!res.ok || !payload?.status || payload?.data?.status !== "success") {
    throw new Error("payment_not_successful");
  }
  const tx = payload.data;
  return {
    amountMinor: Number(tx?.amount ?? 0),
    currency: String(tx?.currency ?? "").toUpperCase(),
    metadata: (tx?.metadata ?? {}) as Record<string, unknown>,
  };
}

async function verifyFlutterwave(
  reference: string,
  env: EdgeEnv,
): Promise<VerifiedCharge> {
  const secret = text(env, "FLUTTERWAVE_SECRET_KEY");
  if (!secret) throw new Error("flutterwave_not_configured");
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  const payload = (await res.json()) as {
    status?: string;
    data?: {
      status?: string;
      amount?: number;
      currency?: string;
      meta?: Record<string, unknown>;
    };
  };
  if (
    !res.ok ||
    payload?.status !== "success" ||
    payload?.data?.status !== "successful"
  ) {
    throw new Error("payment_not_successful");
  }
  const tx = payload.data;
  return {
    amountMinor: Math.round(Number(tx?.amount ?? 0) * 100),
    currency: String(tx?.currency ?? "").toUpperCase(),
    metadata: (tx?.meta ?? {}) as Record<string, unknown>,
  };
}

async function verifyNowPayments(
  invoiceId: string,
  env: EdgeEnv,
): Promise<VerifiedCharge> {
  const key = text(env, "NOWPAYMENTS_API_KEY");
  if (!key) throw new Error("nowpayments_not_configured");
  const res = await fetch(
    `https://api.nowpayments.io/v1/invoice/${encodeURIComponent(invoiceId)}`,
    { headers: { "x-api-key": key } },
  );
  const invoice = (await res.json()) as {
    payment_status?: string;
    price_amount?: number | string;
    price_currency?: string;
    order_id?: string;
  };
  if (!res.ok) throw new Error("payment_not_successful");
  const status = String(invoice?.payment_status ?? "").toLowerCase();
  // Only money that arrived counts; waiting or confirming does not.
  if (status !== "finished" && status !== "confirmed") {
    throw new Error("payment_not_successful");
  }
  return {
    amountMinor: Math.round(Number(invoice?.price_amount ?? 0) * 100),
    currency: String(invoice?.price_currency ?? "usd").toUpperCase(),
    metadata: {},
    orderId: String(invoice?.order_id ?? ""),
  };
}

async function verifyBtcPay(
  invoiceId: string,
  env: EdgeEnv,
): Promise<VerifiedCharge> {
  const base = text(env, "BTCPAY_URL") || text(env, "BTCPAY_SERVER_URL");
  const storeId = text(env, "BTCPAY_STORE_ID");
  const apiKey = text(env, "BTCPAY_API_KEY");
  if (!base || !storeId || !apiKey) throw new Error("btcpay_not_configured");
  const res = await fetch(
    `${base.replace(/\/+$/, "")}/api/v1/stores/${storeId}/invoices/${encodeURIComponent(invoiceId)}`,
    { headers: { Authorization: `token ${apiKey}` } },
  );
  const invoice = (await res.json()) as {
    status?: string;
    amount?: number | string;
    currency?: string;
    metadata?: Record<string, unknown>;
    orderId?: string;
  };
  if (!res.ok) throw new Error("payment_not_successful");
  // Settled is the only state that means the bitcoin arrived.
  if (String(invoice?.status ?? "") !== "Settled") {
    throw new Error("payment_not_successful");
  }
  return {
    amountMinor: Math.round(Number(invoice?.amount ?? 0) * 100),
    currency: String(invoice?.currency ?? "USD").toUpperCase(),
    metadata: (invoice?.metadata ?? {}) as Record<string, unknown>,
    orderId: String(invoice?.orderId ?? ""),
  };
}

export async function handleDocumentPrintPass(
  request: Request,
  env: EdgeEnv,
  _ctx: EdgeContext,
  cors: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405, cors);

  const authHeader = request.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer "))
    return json({ error: "Unauthorized" }, 401, cors);

  const db = rest(env);
  const anonKey = text(env, "SUPABASE_ANON_KEY");
  if (!db || !anonKey) return json({ error: "Not configured" }, 503, cors);

  // The token is verified by GoTrue itself rather than decoded here: a forged
  // or expired token has to fail, and only the auth server can say so.
  const userRes = await fetch(`${db.base}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  if (!userRes.ok) return json({ error: "Unauthorized" }, 401, cors);
  const user = (await userRes.json().catch(() => null)) as {
    id?: string;
  } | null;
  if (!user?.id) return json({ error: "Unauthorized" }, 401, cors);

  const body = (await request.json().catch(() => ({}))) as {
    documentId?: unknown;
    reference?: unknown;
    gateway?: unknown;
  };
  const documentId = String(body?.documentId ?? "").trim();
  const reference = String(body?.reference ?? "").trim();
  const gateway = String(body?.gateway ?? "") as Gateway;

  if (!documentId || documentId.length > 200)
    return json({ error: "Missing documentId" }, 400, cors);
  if (!reference) return json({ error: "Missing reference" }, 400, cors);
  if (!["paystack", "flutterwave", "nowpayments", "btcpay"].includes(gateway))
    return json({ error: "Unsupported gateway" }, 400, cors);

  let charge: VerifiedCharge;
  try {
    if (gateway === "paystack") charge = await verifyPaystack(reference, env);
    else if (gateway === "flutterwave")
      charge = await verifyFlutterwave(reference, env);
    else if (gateway === "nowpayments")
      charge = await verifyNowPayments(reference, env);
    else charge = await verifyBtcPay(reference, env);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "verification_failed";
    const status = reason === "payment_not_successful" ? 402 : 503;
    return json({ error: reason }, status, cors);
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
  if (!matches)
    return json({ error: "Payment does not match this document" }, 403, cors);

  const currency = charge.currency;
  if (!/^[A-Z]{3}$/.test(currency))
    return json({ error: "Unknown charge currency" }, 400, cors);

  // Price from the live rate the platform uses, never from the request body.
  let rate = 1;
  if (currency !== "USD") {
    const fxRes = await fetch(
      `${db.base}/rest/v1/fx_rates?select=rate&base_currency=eq.USD` +
        `&quote_currency=eq.${encodeURIComponent(currency)}&is_active=eq.true` +
        `&order=fetched_at.desc&limit=1`,
      {
        headers: {
          apikey: db.key,
          Authorization: `Bearer ${db.key}`,
          Accept: "application/json",
        },
      },
    );
    const rows = (await fxRes.json().catch(() => [])) as { rate?: number | string }[];
    const parsed = Number(Array.isArray(rows) ? rows[0]?.rate : NaN);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Refuse rather than guess: charging a currency we cannot price is how a
      // fee silently becomes a fraction of what it should be.
      return json({ error: `No active FX rate for ${currency}` }, 409, cors);
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
      cors,
    );
  }

  const expiresAt = new Date(Date.now() + PASS_HOURS * 3600_000).toISOString();
  const upsertRes = await fetch(
    `${db.base}/rest/v1/document_print_passes?on_conflict=user_id,document_id`,
    {
      method: "POST",
      headers: {
        apikey: db.key,
        Authorization: `Bearer ${db.key}`,
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: user.id,
        document_id: documentId,
        amount_minor: charge.amountMinor,
        currency,
        usd_amount: DOCUMENT_PRINT_USD,
        gateway,
        provider_reference: reference,
        expires_at: expiresAt,
      }),
    },
  );

  if (!upsertRes.ok) {
    const detail = await upsertRes.text().catch(() => "");
    const duplicate = detail.includes("23505");
    return json(
      {
        error: duplicate
          ? "This payment has already unlocked a document"
          : "Could not record the print pass",
      },
      duplicate ? 409 : 500,
      cors,
    );
  }

  const rows = (await upsertRes.json().catch(() => [])) as {
    document_id?: string;
    expires_at?: string;
    currency?: string;
    amount_minor?: number;
  }[];
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return json({ error: "Could not record the print pass" }, 500, cors);

  return json(
    {
      pass: {
        document_id: row.document_id,
        expires_at: row.expires_at,
        currency: row.currency,
        amount_minor: row.amount_minor,
      },
    },
    200,
    cors,
  );
}

export const documentPrintPassConfig = {
  name: "document-print-pass",
  methods: ["POST"] as const,
  requiredBindings: [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAYSTACK_SECRET_KEY",
  ],
  handler: handleDocumentPrintPass,
};
