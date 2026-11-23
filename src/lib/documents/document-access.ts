/**
 * FRELUX Document Access & Print Paywall Architecture
 *
 * Rules:
 * - Shared subscription gate covers all documents: PDFs, BOQs, CSVs, Excel.
 * - Active subscribers (and admins) have full access to view, export, and print.
 * - Before a user can print a document, they must be a subscribed user OR pay a one-time
 *   fee of $1.09 per document print, billed in the user's currency equivalent to $1.09.
 * - One-time print passes are stored locally per document with verification and expiry.
 */

import { BUNDLED_RATE_SNAPSHOT } from "@/lib/currency/rates";
import { formatByCode } from "@/lib/international/currency-format";

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
  } else if (code === "KES" || code === "INR" || code === "JPY" || code === "IDR" || code === "XOF") {
    roundedAmount = Math.round(rawAmount);
  } else {
    // 2 decimal places for major currencies
    roundedAmount = Math.round(rawAmount * 100) / 100;
  }

  const formatted = formatByCode(roundedAmount, code, {
    decimals: code === "NGN" || code === "JPY" || code === "IDR" || code === "XOF" ? 0 : 2,
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
 * Retrieve all currently valid print passes from localStorage.
 */
export function getSavedPrintPasses(): Record<string, PrintPass> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRINT_PASSES);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PrintPass>;
    const now = Date.now();
    // Filter expired passes (passes valid for 48 hours)
    const valid: Record<string, PrintPass> = {};
    for (const [key, pass] of Object.entries(parsed)) {
      if (pass && Date.parse(pass.expiresAt) > now) {
        valid[key] = pass;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

/**
 * Checks if a specific document has a valid one-time print pass.
 */
export function isDocumentPrintUnlocked(documentId: string): boolean {
  if (!documentId) return false;
  const passes = getSavedPrintPasses();
  const pass = passes[documentId];
  if (!pass) return false;
  return Date.parse(pass.expiresAt) > Date.now();
}

/**
 * Saves a print pass unlocking the document for printing.
 */
export function recordPrintPassUnlock(params: {
  documentId: string;
  currency: string;
  amount: number;
  gateway?: string;
  reference?: string;
}): PrintPass {
  const now = new Date();
  const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48-hour pass

  const pass: PrintPass = {
    documentId: params.documentId,
    unlockedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    amount: params.amount,
    currency: params.currency,
    usdEquivalent: DOCUMENT_PRINT_USD,
    gateway: params.gateway,
    reference: params.reference || `print_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existing = getSavedPrintPasses();
      existing[params.documentId] = pass;
      localStorage.setItem(STORAGE_KEY_PRINT_PASSES, JSON.stringify(existing));
    } catch {
      // Ignore localStorage write failures
    }
  }

  return pass;
}

/**
 * Central authorization check: Can user export full documents (PDF/BOQ/CSV)?
 */
export function canExportDocuments(auth?: { isPaid?: boolean; isAdmin?: boolean } | null): boolean {
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
