// =========================================================
// NOWPayments API Client & IPN Webhook Verifier
// FRELUX PAY (Multi-Cryptocurrency Payments)
//
// Supports:
// - Dynamic hosted invoice creation via NOWPayments REST API
// - Multi-cryptocurrency support (BTC, ETH, USDT, SOL, and 200+ coins)
// - HMAC-SHA512 IPN webhook signature verification on sorted JSON payload
// - Idempotent event status mapping
// - Invoice & payment binding to prevent forgery
// =========================================================

export interface NowPaymentsConfig {
  apiKey: string;
  ipnSecret?: string;
  apiUrl?: string;
}

export interface NowPaymentsCreateInvoiceParams {
  priceAmount: number;
  priceCurrency: string;
  payCurrency?: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface NowPaymentsInvoiceResponse {
  id: string;
  token_id?: string;
  order_id: string;
  order_description: string;
  price_amount: string | number;
  price_currency: string;
  pay_currency?: string | null;
  ipn_callback_url?: string;
  invoice_url: string;
  success_url?: string;
  cancel_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NowPaymentsPaymentResponse {
  payment_id: number | string;
  invoice_id?: number | string;
  payment_status: string;
  pay_address?: string;
  price_amount: number | string;
  price_currency: string;
  actual_amount?: number;
  pay_amount?: number;
  pay_currency?: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

/**
 * Read one operator setting: environment variable first (existing deploys
 * unchanged), then the key pasted in Admin -> Integration Center ->
 * Provider Keys (integration_secrets). Server-side only.
 */
async function resolveSetting(
  envNames: readonly string[],
  providerId: string,
): Promise<string> {
  for (const name of envNames) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return "";
  try {
    const res = await fetch(
      `${url}/rest/v1/integration_secrets?select=key_value&provider_id=eq.${providerId}&status=eq.active`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      },
    );
    if (!res.ok) return "";
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.key_value ? rows[0].key_value : "";
  } catch {
    return "";
  }
}

/**
 * Read configuration from environment variables, falling back to the keys
 * pasted in the admin Integration Center.
 */
export async function getNowPaymentsConfig(): Promise<NowPaymentsConfig | null> {
  const apiKey =
    (await resolveSetting(
      ["NOWPAYMENTS_API_KEY", "NOW_PAYMENTS_API_KEY"],
      "nowpayments-api-key",
    )) || "";
  const ipnSecret = await resolveSetting(
    ["NOWPAYMENTS_IPN_SECRET", "NOW_PAYMENTS_IPN_SECRET"],
    "nowpayments-ipn-secret",
  );
  const apiUrl =
    Deno.env.get("NOWPAYMENTS_API_URL") || "https://api.nowpayments.io/v1";

  if (!apiKey) {
    return null;
  }

  return {
    apiKey: apiKey.trim(),
    ipnSecret: ipnSecret.trim() || undefined,
    apiUrl: apiUrl.replace(/\/+$/, ""),
  };
}

/** Sort JSON object keys recursively per NOWPayments IPN specification */
export function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/** Constant-time string equality to prevent timing attacks */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    c |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return c === 0;
}

/**
 * Verify x-nowpayments-sig header using HMAC-SHA512.
 * NOWPayments signs the JSON payload after sorting keys alphabetically.
 */
export async function verifyNowPaymentsIpnSignature(
  rawPayload: string | Record<string, unknown>,
  signatureHeader: string | null,
  ipnSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !ipnSecret) return false;

  let parsed: unknown;
  if (typeof rawPayload === "string") {
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      return false;
    }
  } else {
    parsed = rawPayload;
  }

  const sorted = sortObject(parsed);
  const serialized = JSON.stringify(sorted);

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(ipnSecret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign", "verify"],
    );

    const computedBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(serialized),
    );

    const computedHex = Array.from(new Uint8Array(computedBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return constantTimeEqual(
      computedHex.toLowerCase(),
      signatureHeader.trim().toLowerCase(),
    );
  } catch {
    return false;
  }
}

/** Check connectivity to NOWPayments API status endpoint */
export async function checkNowPaymentsHealth(
  config: NowPaymentsConfig,
): Promise<{
  ok: boolean;
  statusMessage?: string;
  error?: string;
}> {
  try {
    const url = `${config.apiUrl || "https://api.nowpayments.io/v1"}/status`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": config.apiKey,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        error: `NOWPayments check returned HTTP ${res.status}: ${errText}`,
      };
    }

    const data = await res.json();
    return { ok: true, statusMessage: data.message || "OK" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/** Create dynamic hosted invoice on NOWPayments */
export async function createNowPaymentsInvoice(
  config: NowPaymentsConfig,
  params: NowPaymentsCreateInvoiceParams,
): Promise<NowPaymentsInvoiceResponse> {
  const url = `${config.apiUrl || "https://api.nowpayments.io/v1"}/invoice`;

  const payload: Record<string, unknown> = {
    price_amount: Number(params.priceAmount.toFixed(2)),
    price_currency: params.priceCurrency.toLowerCase(),
    order_id: params.orderId,
    order_description: params.orderDescription,
  };

  if (params.payCurrency) {
    payload.pay_currency = params.payCurrency.toLowerCase();
  }
  if (params.ipnCallbackUrl) {
    payload.ipn_callback_url = params.ipnCallbackUrl;
  }
  if (params.successUrl) {
    payload.success_url = params.successUrl;
  }
  if (params.cancelUrl) {
    payload.cancel_url = params.cancelUrl;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `NOWPayments invoice creation failed (${res.status}): ${errText}`,
    );
  }

  return (await res.json()) as NowPaymentsInvoiceResponse;
}

/** Query payment details by payment ID */
export async function getNowPaymentsPayment(
  config: NowPaymentsConfig,
  paymentId: string | number,
): Promise<NowPaymentsPaymentResponse> {
  const url = `${config.apiUrl || "https://api.nowpayments.io/v1"}/payment/${encodeURIComponent(paymentId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": config.apiKey,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `NOWPayments payment fetch failed (${res.status}): ${errText}`,
    );
  }

  return (await res.json()) as NowPaymentsPaymentResponse;
}

/** Query invoice details by invoice ID */
export async function getNowPaymentsInvoice(
  config: NowPaymentsConfig,
  invoiceId: string | number,
): Promise<NowPaymentsInvoiceResponse> {
  const url = `${config.apiUrl || "https://api.nowpayments.io/v1"}/invoice/${encodeURIComponent(invoiceId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": config.apiKey,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `NOWPayments invoice fetch failed (${res.status}): ${errText}`,
    );
  }

  return (await res.json()) as NowPaymentsInvoiceResponse;
}

/** Map NOWPayments status to FRELUX internal invoice status */
export function mapNowPaymentsStatus(
  status: string,
): "Pending" | "Processing" | "Confirmed" | "Expired" | "Failed" | "Refunded" {
  const s = String(status || "")
    .toLowerCase()
    .trim();
  if (s === "finished" || s === "confirmed") return "Confirmed";
  if (s === "sending" || s === "confirming" || s === "partially_paid")
    return "Processing";
  if (s === "expired") return "Expired";
  if (s === "failed") return "Failed";
  if (s === "refunded") return "Refunded";
  return "Pending";
}

/**
 * Bind a live provider invoice/payment to the immutable server-side checkout record.
 * This prevents webhook or polling activation for an invoice belonging to a
 * different order, amount, or currency.
 */
export function nowPaymentsInvoiceMatchesExpected(
  invoice: {
    order_id?: string;
    price_amount?: number | string;
    price_currency?: string;
  },
  expected: {
    amountFiat: number;
    currencyFiat: string;
    orderId: string;
  },
): boolean {
  if (!invoice || !expected) return false;
  const invoiceAmount = Number(invoice.price_amount);
  const orderIdMatch =
    String(invoice.order_id || "").trim() === expected.orderId.trim();
  const amountMatch =
    Math.round(invoiceAmount * 100) === Math.round(expected.amountFiat * 100);
  const currencyMatch =
    String(invoice.price_currency || "").toUpperCase() ===
    expected.currencyFiat.toUpperCase();

  return Boolean(orderIdMatch && amountMatch && currencyMatch);
}
