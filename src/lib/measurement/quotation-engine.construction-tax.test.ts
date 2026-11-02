import { describe, expect, it } from "vitest";
import { buildQuotation } from "./quotation-engine";
import type { CostEstimate } from "./cost-integration";

function makeEstimate(): CostEstimate {
  return {
    lineItems: [],
    categories: [],
    materialsTotal: 10000,
    labourTotal: 5000,
    contingencyPercent: 0,
    contingencyAmount: 0,
    grandTotal: 15000,
    currency: "GBP",
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

const base = {
  costEstimate: makeEstimate(),
  projectName: "Kitchen refurbishment",
  dateIssued: "2026-10-27",
  quotationNumber: "Q-TEST-1",
};

describe("quotation engine: UK CIS", () => {
  it("keeps legacy documents unchanged when CIS is not configured", () => {
    const doc = buildQuotation(base);
    expect(doc.cisDeduction).toBe(0);
    expect(doc.netPayable).toBe(doc.grandTotal);
    expect(doc.shareText).not.toContain("CIS");
  });

  it("deducts 20% of labour and reports net payable", () => {
    const doc = buildQuotation({
      ...base,
      settings: { cisScheme: "net", taxPercent: 20 },
    });
    // labour 5000 x 20% = 1000
    expect(doc.cisDeduction).toBe(1000);
    // taxable base 15000 + 20% VAT 3000 = 18000, then CIS off labour only
    expect(doc.grandTotal).toBe(18000);
    expect(doc.netPayable).toBe(17000);
    expect(doc.shareText).toContain("CIS deduction: −1,000");
    expect(doc.shareText).toContain("Net payable after CIS: 17,000");
    expect(doc.explanation.join(" ")).toContain("CIS deduction: 20% of 5,000");
  });

  it("uses the 30% unverified rate", () => {
    const doc = buildQuotation({
      ...base,
      settings: { cisScheme: "unverified" },
    });
    expect(doc.cisDeduction).toBe(1500);
  });

  it("deducts nothing under gross payment status but still labels it", () => {
    const doc = buildQuotation({
      ...base,
      settings: { cisScheme: "gross" },
    });
    expect(doc.cisDeduction).toBe(0);
    expect(doc.explanation.join(" ")).toContain("Gross payment status");
  });

  it("never takes CIS from materials", () => {
    const doc = buildQuotation({
      ...base,
      costEstimate: {
        ...makeEstimate(),
        materialsTotal: 90000,
        labourTotal: 1000,
      },
      settings: { cisScheme: "net" },
    });
    expect(doc.cisDeduction).toBe(200);
  });
});

describe("quotation engine: US multi-tier sales tax", () => {
  it("replaces the flat percentage with additive tiers", () => {
    const doc = buildQuotation({
      ...base,
      costEstimate: { ...makeEstimate(), currency: "USD" },
      settings: {
        salesTaxTiers: [
          { kind: "state", ratePct: 6.25 },
          { kind: "county", name: "LA County", ratePct: 1.5 },
          { kind: "city", name: "City of LA", ratePct: 0.5 },
        ],
      },
    });
    // materials 10000 x 8.25% = 825; labour not taxed
    expect(doc.taxAmount).toBe(825);
    expect(doc.salesTax?.combinedRatePct).toBe(8.25);
    expect(doc.grandTotal).toBe(15825);
    expect(
      doc.sections.some((s) =>
        s.fields?.some((f) => f.label.includes("LA County (1.5%")),
      ),
    ).toBe(true);
  });

  it("excludes contingency from the sales-tax base", () => {
    const doc = buildQuotation({
      ...base,
      costEstimate: {
        ...makeEstimate(),
        contingencyPercent: 10,
        contingencyAmount: 1500,
      },
      settings: { salesTaxTiers: [{ kind: "state", ratePct: 5 }] },
    });
    // tax on materials only: 10000 x 5% = 500 (contingency untaxed)
    expect(doc.taxAmount).toBe(500);
    // total still includes contingency
    expect(doc.grandTotal).toBe(15000 + 1500 + 500);
  });

  it("reports an unusable tier list instead of assuming zero tax", () => {
    const doc = buildQuotation({
      ...base,
      settings: { salesTaxTiers: [{ kind: "state", ratePct: -2 }] },
    });
    expect(doc.salesTax?.errors.join(" ")).toContain("non-negative");
    expect(
      doc.sections.some((s) =>
        s.fields?.some(
          (f) => f.label === "Sales tax" && f.value.startsWith("Not computed"),
        ),
      ),
    ).toBe(true);
  });

  it("taxes labour where the tier says services are taxable", () => {
    const doc = buildQuotation({
      ...base,
      settings: {
        salesTaxTiers: [{ kind: "state", ratePct: 6, appliesTo: "both" }],
      },
    });
    expect(doc.taxAmount).toBe(900); // 15000 x 6%
  });
});

describe("quotation engine: UK domestic reverse charge", () => {
  it("charges no VAT and states who accounts for it", () => {
    const doc = buildQuotation({
      ...base,
      settings: { reverseChargeVat: true, taxPercent: 20 },
    });
    expect(doc.reverseCharge?.applies).toBe(true);
    expect(doc.taxAmount).toBe(0);
    expect(doc.grandTotal).toBe(15000);
    expect(
      doc.sections.some((s) =>
        s.fields?.some((f) => f.label.includes("domestic reverse charge")),
      ),
    ).toBe(true);
  });

  it("falls back to normal VAT when the customer is not VAT-registered", () => {
    const doc = buildQuotation({
      ...base,
      settings: {
        reverseChargeVat: true,
        customerVatRegistered: false,
        taxPercent: 20,
      },
    });
    expect(doc.reverseCharge?.applies).toBe(false);
    expect(doc.taxAmount).toBe(3000);
    expect(doc.explanation.join(" ")).toContain("not VAT-registered");
  });
});
