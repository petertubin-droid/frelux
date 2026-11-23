import { describe, it, expect, beforeEach } from "vitest";
import {
  DOCUMENT_PRINT_USD,
  calculatePrintFeeInCurrency,
  recordPrintPassUnlock,
  isDocumentPrintUnlocked,
  canExportDocuments,
  canPrintDocument,
} from "./document-access";

describe("document-access", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("calculates print fee in USD correctly", () => {
    const fee = calculatePrintFeeInCurrency("USD");
    expect(fee.amount).toBe(1.09);
    expect(fee.currency).toBe("USD");
    expect(fee.baseUsd).toBe(DOCUMENT_PRINT_USD);
  });

  it("calculates print fee in NGN equivalent to $1.09", () => {
    const fee = calculatePrintFeeInCurrency("NGN");
    expect(fee.currency).toBe("NGN");
    expect(fee.amount).toBeGreaterThan(1000);
    expect(fee.rate).toBeGreaterThan(1000);
  });

  it("calculates print fee in EUR and GBP", () => {
    const eur = calculatePrintFeeInCurrency("EUR");
    expect(eur.currency).toBe("EUR");
    expect(eur.amount).toBeGreaterThan(0.5);

    const gbp = calculatePrintFeeInCurrency("GBP");
    expect(gbp.currency).toBe("GBP");
    expect(gbp.amount).toBeGreaterThan(0.5);
  });

  it("gates exports for non-subscribers", () => {
    expect(canExportDocuments(null)).toBe(false);
    expect(canExportDocuments({ isPaid: false, isAdmin: false })).toBe(false);
    expect(canExportDocuments({ isPaid: true, isAdmin: false })).toBe(true);
    expect(canExportDocuments({ isPaid: false, isAdmin: true })).toBe(true);
  });

  it("gates printing for non-subscribers without a print pass", () => {
    const authFree = { isPaid: false, isAdmin: false };
    const docId = "quote-12345";

    expect(canPrintDocument(authFree, docId)).toBe(false);

    // Subscribed user can print
    expect(canPrintDocument({ isPaid: true, isAdmin: false }, docId)).toBe(true);
    // Admin can print
    expect(canPrintDocument({ isPaid: false, isAdmin: true }, docId)).toBe(true);

    // Unlocking document via $1.09 pass allows printing
    recordPrintPassUnlock({
      documentId: docId,
      currency: "USD",
      amount: 1.09,
    });

    expect(isDocumentPrintUnlocked(docId)).toBe(true);
    expect(canPrintDocument(authFree, docId)).toBe(true);

    // Another document remains locked
    expect(canPrintDocument(authFree, "quote-99999")).toBe(false);
  });
});
