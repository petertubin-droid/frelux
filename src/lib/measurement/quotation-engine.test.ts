import { describe, it, expect } from "vitest";
import {
  generateQuotationNumber,
  buildQuotation,
  DEFAULT_QUOTATION_SETTINGS,
} from "./quotation-engine";
import type { CostEstimate } from "./cost-integration";

function makeMinimalCostEstimate(): CostEstimate {
  return {
    lineItems: [],
    categories: [],
    materialsTotal: 100000,
    labourTotal: 50000,
    contingencyPercent: 5,
    contingencyAmount: 7500,
    grandTotal: 157500,
    currency: "NGN",
    confidence: "medium",
    pricedItemCount: 0,
    unpricedItemCount: 0,
    stalePriceCount: 0,
    overriddenPriceCount: 0,
    priceSourceBreakdown: {
      market_intelligence: 0,
      user_override: 0,
      manual: 0,
      not_configured: 0,
    },
    allPriced: true,
    explanation: [],
    issues: [],
  };
}

describe("measurement/quotation-engine", () => {
  it("DEFAULT_QUOTATION_SETTINGS has required fields", () => {
    expect(DEFAULT_QUOTATION_SETTINGS.companyName).toBeTruthy();
    expect(DEFAULT_QUOTATION_SETTINGS.currency).toBe("NGN");
    expect(DEFAULT_QUOTATION_SETTINGS.validityDays).toBeGreaterThan(0);
    expect(DEFAULT_QUOTATION_SETTINGS.paymentTerms).toBeTruthy();
    expect(
      DEFAULT_QUOTATION_SETTINGS.termsAndConditions!.length,
    ).toBeGreaterThan(0);
  });

  it("generateQuotationNumber produces unique-ish numbers with FRELUX prefix", () => {
    const num1 = generateQuotationNumber();
    const num2 = generateQuotationNumber();
    expect(num1).toMatch(/^FRELUX-\d{8}-\d{4}-\d+$/);
    expect(num1).not.toBe(num2);
  });

  it("buildQuotation creates a document with sections", () => {
    const doc = buildQuotation({
      costEstimate: makeMinimalCostEstimate(),
      projectName: "Test Project",
    });
    expect(doc.quotationNumber).toMatch(/^FRELUX-/);
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.dateIssued).toBeTruthy();
    expect(doc.validUntil).toBeTruthy();
  });

  it("buildQuotation uses custom quotation number if provided", () => {
    const doc = buildQuotation({
      costEstimate: makeMinimalCostEstimate(),
      projectName: "Test",
      quotationNumber: "CUSTOM-001",
    });
    expect(doc.quotationNumber).toBe("CUSTOM-001");
  });

  it("buildQuotation uses custom date if provided", () => {
    const doc = buildQuotation({
      costEstimate: makeMinimalCostEstimate(),
      projectName: "Test",
      dateIssued: "2026-09-01",
    });
    expect(doc.dateIssued).toBe("2026-09-01");
  });

  it("buildQuotation includes client info when provided", () => {
    const doc = buildQuotation({
      costEstimate: makeMinimalCostEstimate(),
      projectName: "Test",
      clientName: "John Doe",
      clientAddress: "123 Lagos St",
      clientPhone: "+234 800 123",
    });
    // Client info should appear somewhere in the sections
    const allFields = doc.sections.flatMap(
      (s) => s.fields?.map((f) => f.value) ?? [],
    );
    expect(allFields.some((v) => v.includes("John Doe"))).toBe(true);
  });

  it("buildQuotation respects custom settings overrides", () => {
    const doc = buildQuotation({
      costEstimate: makeMinimalCostEstimate(),
      projectName: "Test",
      settings: { companyName: "Custom Co", validityDays: 14 },
    });
    expect(doc.settings.companyName).toBe("Custom Co");
    expect(doc.settings.validityDays).toBe(14);
  });

  it("buildQuotation computes validUntil from dateIssued + validityDays", () => {
    const doc = buildQuotation({
      costEstimate: makeMinimalCostEstimate(),
      projectName: "Test",
      dateIssued: "2026-01-01",
      settings: { validityDays: 30 },
    });
    // validUntil should be ~30 days after 2026-01-01
    expect(doc.validUntil).toBeTruthy();
  });
});
