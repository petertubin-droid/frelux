/**
 * FRELUX Document Access & Print Paywall Architecture
 *
 * Rules:
 * - Shared subscription gate covers all documents: PDFs, BOQs, CSVs, Excel.
 * - Active subscribers (and admins) have full access to view, export, and print.
 * - Before a user can print a document, they must be a subscribed user OR pay a one-time
 *   fee of $1.09 per document print, billed in the user's currency equivalent to $1.09.
 * - One-time print passes are server rows written only after the gateway confirms a
 *   payment; the browser can read its own passes and can never create one.
 */

import { BUNDLED_RATE_SNAPSHOT } from "@/lib/currency/rates";
import { formatByCode } from "@/lib/international/currency-format";
import {
  getFunctionErrorMessage,
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase-lazy";

export const DOCUMENT_PRINT_USD = 1.09;

export interface PrintPass {
  documentId: string;
  unlockedAt: string;
  expiresAt: string;
  amount: number;
  currency: string;
  usdEquivalent: number;
  gateway?: string;
  reference?: string;
}

const STORAGE_KEY_PRINT_PASSES = "frelux_document_print_passes";

/**
 * Approximate exchange rates relative to USD (1 USD = X target)
 * Used as reliable fallback when offline or database rates not yet loaded.
 */
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1.0,
  NGN: 1346.22,
  EUR: 0.896,
  GBP: 0.749,
  CAD: 1.399,
  AUD: 1.423,
  GHS: 11.69,
  KES: 129.73,
  ZAR: 16.58,
  INR: 95.25,
  JPY: 158.31,
  CNY: 6.68,
  AED: 3.67,
  SAR: 3.75,
  BRL: 5.42,
  MXN: 18.83,
  TRY: 33.5,
  XOF: 588.0,
  IDR: 15700.0,
  RUB: 92.5,
};

/**
 * Calculates the exact equivalent of $1.09 USD in the target currency.
 */
export function calculatePrintFeeInCurrency(currencyCode: string = "USD"): {
  amount: number;
  formatted: string;
  currency: string;
  baseUsd: number;
  rate: number;
} {
  const code = (currencyCode || "USD").toUpperCase();

  // 1. Try bundled snapshot
  let rate: number | null = null;
  const quote = BUNDLED_RATE_SNAPSHOT.quotes.find(
    (q) => q.base === "USD" && q.quote === code,
  );
  if (quote && Number.isFinite(quote.rate) && quote.rate > 0) {
    rate = quote.rate;
  } else if (FALLBACK_USD_RATES[code]) {
    rate = FALLBACK_USD_RATES[code];
  } else if (code === "USD") {
    rate = 1.0;
  } else {
    // Default to 1:1 if completely unknown currency
    rate = 1.0;
  }

  const rawAmount = DOCUMENT_PRINT_USD * rate;

  // Round smartly based on currency magnitude
  let roundedAmount: number;
  if (code === "NGN") {
    // Round to nearest 10 Naira for practical payments
    roundedAmount = Math.round(rawAmount / 10) * 10;
  } else if (
    code === "KES" ||
    code === "INR" ||
    code === "JPY" ||
    code === "IDR" ||
    code === "XOF"
  ) {
    roundedAmount = Math.round(rawAmount);
  } else {
    // 2 decimal places for major currencies
    roundedAmount = Math.round(rawAmount * 100) / 100;
  }

  const formatted = formatByCode(roundedAmount, code, {
    decimals:
      code === "NGN" || code === "JPY" || code === "IDR" || code === "XOF"
        ? 0
        : 2,
  });

  return {
    amount: roundedAmount,
    formatted,
    currency: code,
    baseUsd: DOCUMENT_PRINT_USD,
    rate,
  };
}

/**
 * Print passes live in the database, never in the browser.
 *
 * The table is select-only for users: a row can only be written by the service
 * role after document-print-pass has verified a real payment, so a pass cannot
 * be forged by editing storage. This module keeps a read-only cache of the
 * signed-in user's passes so the gate can answer synchronously, and refreshes it
 * from the database on sign-in and after a purchase.
 */
let passCache: Record<string, PrintPass> = {};

/** The cached passes, keyed by document id. Read-only: never a write path. */
export function getCachedPrintPasses(): Record<string, PrintPass> {
  return passCache;
}

/**
 * Load the signed-in user's unexpired passes. Row level security scopes this to
 * the caller, so no user id is passed from the client.
 */
export async function hydratePrintPasses(): Promise<Record<string, PrintPass>> {
  if (!isSupabaseConfigured) return passCache;
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("document_print_passes")
      .select(
        "document_id, expires_at, currency, amount_minor, gateway, provider_reference, created_at",
      )
      .gt("expires_at", new Date().toISOString());
    if (error) return passCache;
    const next: Record<string, PrintPass> = {};
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const documentId = String(row.document_id ?? "");
      if (!documentId) continue;
      next[documentId] = {
        documentId,
        unlockedAt: String(row.created_at ?? ""),
        expiresAt: String(row.expires_at ?? ""),
        amount: Number(row.amount_minor ?? 0) / 100,
        currency: String(row.currency ?? ""),
        usdEquivalent: DOCUMENT_PRINT_USD,
        gateway: row.gateway ? String(row.gateway) : undefined,
        reference: row.provider_reference
          ? String(row.provider_reference)
          : undefined,
      };
    }
    passCache = next;
    return next;
  } catch {
    return passCache;
  }
}

/** Checks the cached passes for a valid entitlement to print this document. */
export function isDocumentPrintUnlocked(documentId: string): boolean {
  if (!documentId) return false;
  const pass = passCache[documentId];
  if (!pass) return false;
  return Date.parse(pass.expiresAt) > Date.now();
}

/**
 * Claim a print pass for a completed payment. The browser sends only the
 * reference; the edge function re-verifies it with the gateway, prices it from
 * the live FX table and writes the row. Nothing is unlocked locally.
 */
/**
 * Start a checkout that creates the payment this pass will be issued against.
 *
 * The server prices every rail (the browser sends no amount): Paystack is
 * charged in naira quoted from the dollar fee, Flutterwave in dollars, and the
 * crypto rails return a hosted invoice to open. Nothing unlocks here; the
 * returned reference or invoice id is only proof of intent until
 * document-print-pass verifies the money arrived.
 */
export async function startPrintCheckout(params: {
  documentId: string;
  gateway: "paystack" | "flutterwave" | "nowpayments" | "btcpay";
  email?: string | null;
  marketCode?: string | null;
}): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured)
    return { ok: false, error: "Payments are not configured." };
  const supabase = await getSupabase();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user)
    return { ok: false, error: "Sign in to print this document." };

  const fn =
    params.gateway === "nowpayments"
      ? "nowpayments-checkout"
      : params.gateway === "btcpay"
        ? "btcpay-checkout"
        : params.gateway === "flutterwave"
          ? "flutterwave-checkout"
          : "paystack-checkout";

  const body: Record<string, unknown> = {
    purpose: "document_print",
    document_id: params.documentId,
    documentId: params.documentId,
    email: params.email ?? user.email ?? null,
    user_id: user.id,
    market_code: params.marketCode ?? null,
  };

  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) return { ok: false, error: await getFunctionErrorMessage(error) };
  const payload = (data ?? {}) as {
    error?: string;
    authorization_url?: string;
    checkout_url?: string;
  };
  if (payload.error)
    return { ok: false, error: printCheckoutError(payload.error) };
  const redirectUrl = payload.authorization_url ?? payload.checkout_url;
  if (!redirectUrl)
    return { ok: false, error: "The gateway did not return a checkout link." };
  return { ok: true, redirectUrl };
}

/** Plain-language text for the codes the checkout functions return. */
function printCheckoutError(code: string): string {
  switch (code) {
    case "MISSING_DOCUMENT_ID":
    case "Missing document":
      return "This document could not be identified for payment.";
    case "No active FX rate for NGN":
      return "The print fee cannot be priced right now. Please try again later.";
    case "Payment provider not configured":
      return "That payment method is not available right now.";
    default:
      return code.replace(/_/g, " ").toLowerCase();
  }
}

/** Read the gateway return parameters a print checkout comes back with. */
export function readPrintReturn(search: string): {
  gateway: "paystack" | "flutterwave" | "nowpayments" | "btcpay";
  documentId: string;
  reference: string;
} | null {
  const params = new URLSearchParams(search);
  if (params.get("print") !== "verify") return null;
  const rawGateway = params.get("gw") ?? "";
  const gateway =
    rawGateway === "flutterwave" ||
    rawGateway === "nowpayments" ||
    rawGateway === "btcpay"
      ? rawGateway
      : "paystack";
  const documentId = (params.get("doc") ?? "").trim();
  const reference = (
    params.get("reference") ??
    params.get("trxref") ??
    params.get("tx_ref") ??
    params.get("invoice_id") ??
    ""
  ).trim();
  if (!documentId || !reference) return null;
  return { gateway, documentId, reference };
}

export async function purchasePrintPass(params: {
  documentId: string;
  gateway: "paystack" | "flutterwave" | "nowpayments" | "btcpay";
  reference: string;
}): Promise<{ ok: true; pass: PrintPass } | { ok: false; error: string }> {
  if (!isSupabaseConfigured)
    return { ok: false, error: "Payments are not configured." };
  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke(
    "document-print-pass",
    {
      body: {
        documentId: params.documentId,
        gateway: params.gateway,
        reference: params.reference,
      },
    },
  );
  if (error) return { ok: false, error: await getFunctionErrorMessage(error) };
  const payload = (data ?? {}) as { error?: string };
  if (payload.error) return { ok: false, error: payload.error };
  await hydratePrintPasses();
  const pass = passCache[params.documentId];
  if (!pass)
    return {
      ok: false,
      error: "The payment was verified but no pass was issued.",
    };
  return { ok: true, pass };
}

/**
 * Central authorization check: Can user export full documents (PDF/BOQ/CSV)?
 */
export function canExportDocuments(
  auth?: { isPaid?: boolean; isAdmin?: boolean } | null,
): boolean {
  if (!auth) return false;
  return Boolean(auth.isAdmin || auth.isPaid);
}

/**
 * Central authorization check: Can user print this document?
 * Allowed if:
 * 1. User has an active subscription (isPaid), OR
 * 2. User is an admin (isAdmin), OR
 * 3. User paid the one-time $1.09 print fee for this document (isDocumentPrintUnlocked).
 */
export function canPrintDocument(
  auth?: { isPaid?: boolean; isAdmin?: boolean } | null,
  documentId?: string,
): boolean {
  if (auth?.isAdmin || auth?.isPaid) {
    return true;
  }
  if (documentId && isDocumentPrintUnlocked(documentId)) {
    return true;
  }
  return false;
}
