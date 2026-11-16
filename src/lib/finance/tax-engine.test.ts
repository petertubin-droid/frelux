import { describe, it, expect } from "vitest";
import {
  calculateJurisdictionalTax,
  VerifiedTaxRate,
  TaxLineInput,
} from "./tax-engine";

const SAMPLE_RATE: VerifiedTaxRate = {
  id: "rate-ng-vat-1",
  marketCode: "NG",
  jurisdictionCode: null,
  taxCode: "VAT-NG-01",
  taxName: "Value Added Tax (Nigeria)",
  category: "vat",
  rate: 0.075,
  effectiveFrom: "2020-02-01",
  effectiveTo: null,
  sourceType: "official_legislation",
  sourceUrl: "https://www.firs.gov.ng/tax-types/value-added-tax/",
  reviewerId: "rev-ng-01",
  reviewedAt: "2026-01-15T00:00:00Z",
  approved: true,
};

describe("Jurisdictional Tax Calculation Engine", () => {
  it("calculates tax with approved rate", () => {
    const lines: TaxLineInput[] = [
      {
        id: "1",
        description: "Concrete supply",
        netAmount: 1000,
        taxCategory: "vat",
      },
      {
        id: "2",
        description: "Formwork hire",
        netAmount: 500,
        taxCategory: "vat",
      },
    ];

    const result = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "2026-03-01T00:00:00Z",
      lines,
      rates: [SAMPLE_RATE],
    });

    expect(result.status).toBe("calculated");
    expect(result.totals.net).toBe(1500);
    expect(result.totals.tax).toBe(112.5);
    expect(result.totals.gross).toBe(1612.5);
    // Two lines taxed by the same rate cite that rate once. The list used to
    // repeat the rate for every line it applied to.
    expect(result.provenance.length).toBe(1);
    expect(result.provenance[0].taxCode).toBe("VAT-NG-01");
  });

  it("returns unavailable when no rate exists for the jurisdiction", () => {
    const lines: TaxLineInput[] = [
      {
        id: "1",
        description: "Electrical installation",
        netAmount: 1000,
        taxCategory: "vat",
      },
    ];

    const result = calculateJurisdictionalTax({
      marketCode: "GH",
      valuationDate: "2026-03-01T00:00:00Z",
      lines,
      rates: [SAMPLE_RATE], // only NG rate provided
    });

    expect(result.status).toBe("unavailable");
    expect(result.totals.tax).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles valid recorded tax exemptions", () => {
    const lines: TaxLineInput[] = [
      {
        id: "1",
        description: "Exempt basic building supplies",
        netAmount: 1000,
        taxCategory: "vat",
        isTaxExempt: true,
        exemptionCode: "EXEMPT-SEC-40",
      },
    ];

    const result = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "2026-03-01T00:00:00Z",
      lines,
      rates: [SAMPLE_RATE],
    });

    expect(result.status).toBe("calculated");
    expect(result.totals.tax).toBe(0);
    expect(result.totals.gross).toBe(1000);
    expect(result.lineResults[0].taxCode).toBe("EXEMPT-SEC-40");
  });

  it("refuses unverified exemption without justification code", () => {
    const lines: TaxLineInput[] = [
      {
        id: "1",
        description: "Exempt item",
        netAmount: 1000,
        taxCategory: "vat",
        isTaxExempt: true,
        exemptionCode: "",
      },
    ];

    const result = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "2026-03-01T00:00:00Z",
      lines,
      rates: [SAMPLE_RATE],
    });

    expect(result.status).toBe("unavailable");
    expect(result.warnings.some((w) => w.includes("exemption"))).toBe(true);
  });

  it("keeps an invalid line out of the net instead of poisoning it", () => {
    const line = (id: string, netAmount: number): TaxLineInput => ({
      id,
      description: "Concrete supply",
      netAmount,
      taxCategory: "vat",
    });
    const result = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "2026-03-01",
      lines: [line("1", 1000), line("2", Number.NaN), line("3", -500)],
      rates: [SAMPLE_RATE],
    });
    expect(result.status).toBe("unavailable");
    // The NaN line used to make this NaN and the negative line used to reduce it.
    expect(result.totals.net).toBe(1000);
    expect(result.warnings.join(" ")).toContain("left out of the totals");
  });

  it("reads a timestamped effective date as a calendar day", () => {
    const dated: VerifiedTaxRate = {
      ...SAMPLE_RATE,
      effectiveFrom: "2026-01-05T00:00:00Z",
      effectiveTo: "2026-12-31T23:59:59Z",
    };
    const lines: TaxLineInput[] = [
      {
        id: "1",
        description: "Concrete supply",
        netAmount: 1000,
        taxCategory: "vat",
      },
    ];
    const first = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "2026-01-05",
      lines,
      rates: [dated],
    });
    // The string comparison put "2026-01-05T00:00:00Z" after "2026-01-05", so a
    // rate taking effect that morning read as not yet in force.
    expect(first.status).toBe("calculated");

    const last = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "2026-12-31",
      lines,
      rates: [dated],
    });
    expect(last.status).toBe("calculated");

    const after = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "2027-01-01",
      lines,
      rates: [dated],
    });
    expect(after.status).toBe("unavailable");
  });

  it("reports an unreadable valuation date instead of throwing", () => {
    const result = calculateJurisdictionalTax({
      marketCode: "NG",
      valuationDate: "last Tuesday",
      lines: [
        {
          id: "1",
          description: "Concrete supply",
          netAmount: 1000,
          taxCategory: "vat",
        },
      ],
      rates: [SAMPLE_RATE],
    });
    expect(result.status).toBe("unavailable");
    expect(result.warnings.join(" ")).toContain("cannot be read");
  });
});
