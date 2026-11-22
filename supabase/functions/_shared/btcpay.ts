// =========================================================
// BTCPay Server Greenfield API Client & Webhook Verifier
// FRELUX PAY (Bitcoin Payments)
//
// Supports:
// - Dynamic invoice creation via Greenfield API
// - Real-time BTC address & QR generation
// - Rate locking & satoshi conversions
// - HMAC-SHA256 webhook signature verification
// - Speed policy enforcement (e.g. MediumSpeed = 1 confirmation)
// - Idempotent event status mapping
// - Greenfield server health & store status checks
// =========================================================

export interface BtcPayConfig {
  serverUrl: string;
  storeId: string;
  apiKey: string;
  webhookSecret?: string;
}

export interface BtcPayCreateInvoiceParams {
  amount: number;
  currency: string;
  orderId: string;
  itemDesc: string;
  buyerEmail?: string;
  metadata?: Record<string, unknown>;
  redirectUrl?: string;
  speedPolicy?: "HighSpeed" | "MediumSpeed" | "LowSpeed";
  expirationMinutes?: number;
}

export interface BtcPayInvoiceResponse {
  id: string;
  storeId: string;
  amount: string;
  currency: string;
  type: string;
  checkoutLink: string;
  status: "New" | "Processing" | "Settled" | "Invalid" | "Expired";
  additionalStatus: "None" | "PaidPartial" | "PaidOver" | "PaidLate" | "Marked";
  createdTime: number;
  expirationTime: number;
  monitoringTime: number;
  metadata?: Record<string, unknown>;
}

export interface BtcPayPaymentMethod {
  paymentMethod: string;
  cryptoCode: string;
  destination: string;
  paymentLink: string;
  rate: string;
  paymentMethodPaid: string;
  totalPaid: string;
  due: string;
  amount: string;
  networkFee: string;
}

/** Read configuration strictly from environment variables — no mock/demo fallback */
export function getBtcPayConfig(): BtcPayConfig | null {
  const serverUrl =
    Deno.env.get("BTCPAY_SERVER_URL") || Deno.env.get("BTCPAY_URL") || "";
  const storeId = Deno.env.get("BTCPAY_STORE_ID") || "";
  const apiKey = Deno.env.get("BTCPAY_API_KEY") || "";
  const webhookSecret = Deno.env.get("BTCPAY_WEBHOOK_SECRET") || "";

  if (!serverUrl || !storeId || !apiKey) {
    return null;
  }

  return {
    serverUrl: serverUrl.replace(/\/+$/, ""),
    storeId,
    apiKey,
    webhookSecret,
  };
}

/** Verify BTCPay-Sig HMAC-SHA256 header with constant-time equality check */
export async function verifyBtcPayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const expectedPrefix = "sha256=";
  const signatureHex = signatureHeader.startsWith(expectedPrefix)
    ? signatureHeader.slice(expectedPrefix.length)
    : signatureHeader;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    const computedBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );

    const computedHex = Array.from(new Uint8Array(computedBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return constantTimeEqual(
      computedHex.toLowerCase(),
      signatureHex.toLowerCase(),
    );
  } catch {
    return false;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    c |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return c === 0;
}

/** Check connectivity to BTCPay Server Greenfield store */
export async function checkBtcPayHealth(config: BtcPayConfig): Promise<{
  ok: boolean;
  storeName?: string;
  error?: string;
}> {
  try {
    const url = `${config.serverUrl}/api/v1/stores/${encodeURIComponent(config.storeId)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `token ${config.apiKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        error: `Store check returned HTTP ${res.status}: ${errText}`,
      };
    }

    const storeData = await res.json();
    return { ok: true, storeName: storeData.name || config.storeId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/** Create dynamic Bitcoin payment invoice on BTCPay Server */
export async function createBtcPayInvoice(
  config: BtcPayConfig,
  params: BtcPayCreateInvoiceParams,
): Promise<BtcPayInvoiceResponse> {
  const url = `${config.serverUrl}/api/v1/stores/${encodeURIComponent(config.storeId)}/invoices`;

  const payload = {
    amount: params.amount.toFixed(2),
    currency: params.currency.toUpperCase(),
    metadata: {
      orderId: params.orderId,
      itemDesc: params.itemDesc,
      buyerEmail: params.buyerEmail,
      ...params.metadata,
    },
    checkout: {
      speedPolicy: params.speedPolicy || "MediumSpeed",
      paymentMethods: ["BTC"],
      defaultPaymentMethod: "BTC",
      expirationMinutes: params.expirationMinutes || 30,
      monitoringMinutes: 1440,
      redirectURL: params.redirectUrl,
      redirectAutomatically: true,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `BTCPay invoice creation failed (${res.status}): ${errText}`,
    );
  }

  return (await res.json()) as BtcPayInvoiceResponse;
}

/** Query invoice details by ID */
export async function getBtcPayInvoice(
  config: BtcPayConfig,
  invoiceId: string,
): Promise<BtcPayInvoiceResponse> {
  const url = `${config.serverUrl}/api/v1/stores/${encodeURIComponent(config.storeId)}/invoices/${encodeURIComponent(invoiceId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `token ${config.apiKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`BTCPay invoice fetch failed (${res.status}): ${errText}`);
  }

  return (await res.json()) as BtcPayInvoiceResponse;
}

/** Query payment methods (BTC address, rate, due amount, satoshis) */
export async function getBtcPayPaymentMethods(
  config: BtcPayConfig,
  invoiceId: string,
): Promise<BtcPayPaymentMethod[]> {
  const url = `${config.serverUrl}/api/v1/stores/${encodeURIComponent(config.storeId)}/invoices/${encodeURIComponent(invoiceId)}/payment-methods`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `token ${config.apiKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `BTCPay payment methods fetch failed (${res.status}): ${errText}`,
    );
  }

  return (await res.json()) as BtcPayPaymentMethod[];
}

/** Convert BTC decimal string to Satoshis integer */
export function btcToSatoshis(btcStr: string | number): number {
  const num = typeof btcStr === "string" ? parseFloat(btcStr) : btcStr;
  if (isNaN(num)) return 0;
  return Math.round(num * 100_000_000);
}

/** Map BTCPay status to FRELUX internal invoice status */
export function mapBtcPayStatus(
  status: string,
  additionalStatus: string,
): "Pending" | "Processing" | "Confirmed" | "Expired" | "Failed" | "Refunded" {
  if (status === "Settled") return "Confirmed";
  if (status === "Processing") return "Processing";
  if (status === "Expired") return "Expired";
  if (status === "Invalid") return "Failed";
  if (additionalStatus === "Marked") return "Refunded";
  return "Pending";
}

/**
 * Bind a live provider invoice to the immutable server-side checkout record.
 * This prevents webhook or polling activation for an invoice belonging to a
 * different store, amount, user, purpose, or order.
 */
export function btcPayInvoiceMatchesExpected(
  invoice: BtcPayInvoiceResponse,
  expected: {
    invoiceId: string;
    storeId: string;
    amountFiat: number;
    currencyFiat: string;
    userId: string;
    purpose: string;
    orderId: string;
  },
): boolean {
  const metadata = invoice.metadata;
  return Boolean(
    invoice.id === expected.invoiceId &&
      invoice.storeId === expected.storeId &&
      Math.round(Number(invoice.amount) * 100) ===
        Math.round(expected.amountFiat * 100) &&
      invoice.currency?.toUpperCase() === expected.currencyFiat.toUpperCase() &&
      metadata &&
      metadata.userId === expected.userId &&
      metadata.purpose === expected.purpose &&
      metadata.orderId === expected.orderId,
  );
}
