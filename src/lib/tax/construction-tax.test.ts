import { describe, expect, it } from "vitest";
import {
  CIS_RATES,
  CIS_SCHEME_LABELS,
  computeCisDeduction,
  computeReverseChargeVat,
  computeUsSalesTax,
  type UsSalesTaxTier,
} from "./construction-tax";

describe("UK CIS deductions", () => {
  it("uses HMRC's three rates", () => {
    expect(CIS_RATES.net).toBe(20);
    expect(CIS_RATES.unverified).toBe(30);
    expect(CIS_RATES.gross).toBe(0);
    expect(CIS_SCHEME_LABELS.unverified).toContain("30%");
  });

  it("deducts 20% from labour only, never from materials", () => {
    const cis = computeCisDeduction({ labourAmount: 5000, scheme: "net" });
    expect(cis.deduction).toBe(1000);
    expect(cis.basis).toBe(5000);
    expect(cis.ratePct).toBe(20);
    expect(cis.notes.join(" ")).toContain("materials and VAT are excluded");
  });

  it("deducts 30% for an unverified subcontractor", () => {
    const cis = computeCisDeduction({
      labourAmount: 2500,
      scheme: "unverified",
    });
    expect(cis.deduction).toBe(750);
  });

  it("deducts nothing under gross payment status but still reports", () => {
    const cis = computeCisDeduction({ labourAmount: 8000, scheme: "gross" });
    expect(cis.deduction).toBe(0);
    expect(cis.notes.join(" ")).toContain("reports the payment to HMRC");
  });

  it("rounds to pennies", () => {
    const cis = computeCisDeduction({ labourAmount: 1234.56, scheme: "net" });
    expect(cis.deduction).toBe(246.91);
  });

  it("says when there is no labour to deduct from", () => {
    const cis = computeCisDeduction({ labourAmount: 0, scheme: "net" });
    expect(cis.deduction).toBe(0);
    expect(cis.notes.join(" ")).toContain("no CIS deduction applies");
  });
});

describe("UK domestic reverse charge", () => {
  it("applies between two VAT-registered construction businesses", () => {
    const rc = computeReverseChargeVat({
      taxableBase: 10000,
      supplierVatRegistered: true,
      customerVatRegistered: true,
    });
    expect(rc.applies).toBe(true);
    expect(rc.amountPayable).toBe(0);
    expect(rc.amountAccountedByCustomer).toBe(2000);
    expect(rc.notes.join(" ")).toContain("invoice must state");
  });

  it("does not apply to a non-VAT-registered customer", () => {
    const rc = computeReverseChargeVat({
      taxableBase: 10000,
      supplierVatRegistered: true,
      customerVatRegistered: false,
    });
    expect(rc.applies).toBe(false);
    expect(rc.notes.join(" ")).toContain("customer is not VAT-registered");
  });

  it("does not apply outside specified construction services", () => {
    const rc = computeReverseChargeVat({
      taxableBase: 5000,
      supplierVatRegistered: true,
      customerVatRegistered: true,
      isConstructionService: false,
    });
    expect(rc.applies).toBe(false);
    expect(rc.notes.join(" ")).toContain(
      "not a specified construction service",
    );
  });
});

describe("US multi-tier sales tax", () => {
  const tiers: UsSalesTaxTier[] = [
    { kind: "state", ratePct: 6.25 },
    { kind: "county", name: "LA County", ratePct: 1.5 },
    { kind: "city", name: "City of LA", ratePct: 0.5 },
    { kind: "special_district", name: "Transit district", ratePct: 1.75 },
  ];

  it("adds state, county, city and district rates without compounding", () => {
    const st = computeUsSalesTax({ tiers, materials: 10000, labour: 4000 });
    expect(st.errors).toEqual([]);
    expect(st.combinedRatePct).toBe(10);
    expect(st.totalTax).toBe(1000);
    expect(st.lines).toHaveLength(4);
    // Additive, not compounded: 10000 x 10% exactly.
    expect(st.lines.every((l) => l.base === 10000)).toBe(true);
  });

  it("defaults to taxing materials only, excluding construction labour", () => {
    const st = computeUsSalesTax({ tiers, materials: 10000, labour: 4000 });
    expect(st.lines.every((l) => l.appliesTo === "materials")).toBe(true);
    expect(st.notes.join(" ")).toContain("labour is not taxable");
  });

  it("taxes labour only where a tier says services are taxable", () => {
    const st = computeUsSalesTax({
      tiers: [
        { kind: "state", ratePct: 6 },
        { kind: "county", ratePct: 1, appliesTo: "services" },
      ],
      materials: 10000,
      labour: 4000,
    });
    expect(st.lines[0].base).toBe(10000);
    expect(st.lines[1].base).toBe(4000);
    expect(st.totalTax).toBe(600 + 40);
    expect(st.notes.join(" ")).toContain("Services/labour are taxable");
  });

  it("can tax the combined base when a tier applies to both", () => {
    const st = computeUsSalesTax({
      tiers: [{ kind: "state", ratePct: 5, appliesTo: "both" }],
      materials: 10000,
      labour: 4000,
    });
    expect(st.lines[0].base).toBe(14000);
    expect(st.totalTax).toBe(700);
  });

  it("refuses an empty tier list rather than assuming zero tax", () => {
    const st = computeUsSalesTax({ tiers: [], materials: 1000, labour: 500 });
    expect(st.errors.join(" ")).toContain("No sales-tax tiers");
    expect(st.totalTax).toBe(0);
  });

  it("refuses a negative tier rate", () => {
    const st = computeUsSalesTax({
      tiers: [{ kind: "state", ratePct: -1 }],
      materials: 1000,
      labour: 0,
    });
    expect(st.errors.join(" ")).toContain("non-negative");
  });

  it("notes a tier that has no taxable base on this quotation", () => {
    const st = computeUsSalesTax({
      tiers: [{ kind: "county", ratePct: 1, appliesTo: "services" }],
      materials: 5000,
      labour: 0,
    });
    expect(st.totalTax).toBe(0);
    expect(st.notes.join(" ")).toContain("no taxable base");
  });
});
