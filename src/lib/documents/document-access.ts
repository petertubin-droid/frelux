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
export async function purchasePrintPass(params: {
  documentId: string;
  gateway: "paystack" | "flutterwave";
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
