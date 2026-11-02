import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DbContractorProject } from "@/types/database";
import { __clearTaxCatalogCache } from "@/lib/tax/tax-catalog";

// ============================================================
// ROADMAP PHASE 1 REGRESSION GUARDS (roadmap.md non-negotiables)
//
// "Regression tests prove absent rules never apply 7.5% or
// another market's tax." These tests pin generateQuotation to
// that rule: with no explicit tax input and no configured
// default, the quote must be an honestly pre-tax estimate with
// tax_percentage NULL — never a silently assumed 7.5%.
// ============================================================

let insertedQuote: Record<string, unknown> | null = null;
let quotationSettings: Record<string, unknown> | null = null;
let jurisdictionRules: Record<string, unknown>[] = [];
let catalogRows: Record<string, unknown>[] = [];
let settlementConfig: Record<string, unknown> | null = null;
let fxRateRows: Record<string, unknown>[] = [];
let taxValidationRows: Record<string, unknown>[] = [];

const project: Partial<DbContractorProject> = {
  id: "p1",
  total_material_cost: 100000,
  total_labour_cost: 50000,
  total_transport_cost: 0,
  total_misc_cost: 0,
  currency: "NGN",
  currency_symbol: "₦",
};

// Minimal thenable that resolves like a supabase await result
const res = (data: unknown, error: unknown = null) =>
  ({
    then: (resolve: (v: unknown) => void, _reject?: (v: unknown) => void) =>
      Promise.resolve({ data, error }).then(resolve),
    select: () => res(data, error),
    eq: () => res(data, error),
    order: () => res(data, error),
    limit: () => res(data, error),
    maybeSingle: () => res(data, error),
  }) as unknown as Promise<{ data: unknown; error: unknown }>;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "contractor_projects") return res(project);
      if (table === "quotation_settings") return res(quotationSettings);
      if (table === "tax_jurisdiction_rules") return res(jurisdictionRules);
      if (table === "market_tax_catalog") return res(catalogRows);
      if (table === "settlement_fx_config") return res(settlementConfig);
      if (table === "fx_rates") return res(fxRateRows);
      if (table === "tax_rule_validations") return res(taxValidationRows);
      if (table === "project_quotations") {
        return {
          insert: (rows: Record<string, unknown>) => {
            insertedQuote = rows;
            return {
              select: () => ({ single: () => res(rows) }),
            };
          },
        };
      }
      return res(null);
    },
  },
  isSupabaseConfigured: true,
}));

import { generateQuotation } from "@/lib/contractor";

describe("generateQuotation — roadmap phase 1: no silent tax default", () => {
  beforeEach(() => {
    insertedQuote = null;
    quotationSettings = null;
    jurisdictionRules = [];
    catalogRows = [];
    settlementConfig = null;
    fxRateRows = [];
    taxValidationRows = [];
    __clearTaxCatalogCache();
  });

  it("applies no tax when nothing is configured — never 7.5%", async () => {
    const quotation = await generateQuotation("p1");

    expect(insertedQuote).not.toBeNull();
    // The non-negotiable: no silently assumed rate, quote stays pre-tax
    expect(insertedQuote!.tax_percentage).toBeNull();
    expect(insertedQuote!.tax_amount).toBe(0);
    expect(quotation.tax_amount).toBe(0);
    // grand total is exactly the pre-tax total:
    // (100000 + 50000) * 1.15 markup * 1.10 profit = 189750
    expect(insertedQuote!.grand_total).toBe(189750);
  });

  it("uses an explicitly configured settings rate as a manual assumption", async () => {
    quotationSettings = { default_tax_percentage: 5, is_active: true };

    await generateQuotation("p1");

    expect(insertedQuote!.tax_percentage).toBe(5);
    expect(insertedQuote!.tax_amount).toBeGreaterThan(0);
  });

  it("an explicit call-time rate wins over settings", async () => {
    quotationSettings = { default_tax_percentage: 5, is_active: true };

    await generateQuotation("p1", { taxPercentage: 10 });

    expect(insertedQuote!.tax_percentage).toBe(10);
  });

  it("stores a compound verified rule component-level with exact provenance", async () => {
    jurisdictionRules = [
      {
        id: "r1",
        rule_code: "NG-VAT-FED",
        version: 1,
        market_code: "NG",
        jurisdiction_level: "national",
        jurisdiction_code: "NG",
        tax_category: "consumption",
        tax_name: "VAT",
        components: [
          { name: "VAT", rate_pct: 7.5, compound_on: null },
          { name: "Levy", rate_pct: 2, compound_on: "VAT" },
        ],
        basis_inclusive: false,
        taxable_base_definition: "Taxable supplies.",
        rounding_method: "half_up",
        exemption_handling: "excluded_from_base",
        unknown_handling: "not_determined",
        applies_to: "both",
        effective_from: "2019-02-01",
        effective_to: null,
        source_title: "VAT Act",
        source_url: "https://firs.gov.ng/",
        source_publisher: "Federal Inland Revenue Service (FIRS)",
        reviewer_name: "FRELUX Tax Review",
        next_review_date: "2027-02-01",
        is_active: true,
      },
    ];
    // project location drives the site jurisdiction (NG)
    (project as Record<string, unknown>).location = {
      country_code: "NG",
    };

    await generateQuotation("p1");

    expect(insertedQuote).not.toBeNull();
    // subtotal 150000, markup 15% -> 172500, profit 10% -> 189750
    // VAT 7.5% of 189750 = 14231.25; Levy 2% on (189750+14231.25)=4079.625
    // total tax 18310.88 (half-up); no single pct is stored.
    expect(insertedQuote!.tax_source).toBe("verified_rule");
    expect(insertedQuote!.tax_percentage).toBeNull();
    expect(insertedQuote!.tax_rule_code).toBe("NG-VAT-FED");
    expect(insertedQuote!.tax_citation_publisher).toContain("FIRS");
    const comps = insertedQuote!.tax_components as Array<{
      name: string;
      amount: number;
    }>;
    expect(comps).toHaveLength(2);
    expect(comps[0].name).toBe("VAT");
    expect(comps[0].amount).toBeCloseTo(14231.25, 2);
    expect(comps[1].name).toBe("Levy");
    expect(comps[1].amount).toBeCloseTo(4079.63, 2);
    expect(insertedQuote!.tax_amount).toBeCloseTo(18310.88, 2);
    expect(insertedQuote!.grand_total).toBeCloseTo(208060.88, 2);
  });

  it("opt-in settlement stores full provider-backed provenance when configured", async () => {
    settlementConfig = {
      id: "c1",
      market_code: "NG",
      payment_provider: "stripe",
      charge_currency: "USD",
      settlement_currency: "USD",
      fee_pct: 2.5,
      fee_fixed: 1,
      reconciliation_path: "stripe-payouts-ng",
      rate_source: "fx_rates",
      reviewer_name: "FRELUX Legal Review",
      legal_review_date: "2026-10-01",
      next_review_date: "2027-10-01",
      is_active: true,
    };
    fxRateRows = [
      {
        id: "r1",
        base_currency: "NGN",
        quote_currency: "USD",
        rate: 0.0006,
        provider: "open.er-api.com",
        source_url: "https://open.er-api.com/v6/latest/NGN",
        fetched_at: new Date(Date.now() - 3600_000).toISOString(),
        is_active: true,
      },
    ];
    (project as Record<string, unknown>).location = {
      country_code: "NG",
    };

    await generateQuotation("p1", { includeSettlement: true });

    expect(insertedQuote).not.toBeNull();
    expect(insertedQuote!.fx_settlement_status).toBe("converted");
    expect(insertedQuote!.fx_settlement_currency).toBe("USD");
    const fx = insertedQuote!.fx_settlement as Record<string, unknown>;
    expect(fx.payment_provider).toBe("stripe");
    expect(fx.reviewed_by).toBe("FRELUX Legal Review");
    expect(fx.applied_rate).toBe(0.0006);
    expect(fx.provider_fee).toBeGreaterThan(0);
    expect(fx.total_payable).toBeGreaterThan(0);
  });

  it("opt-in settlement fails closed as not_configured without a config row", async () => {
    (project as Record<string, unknown>).location = {
      country_code: "NG",
    };

    await generateQuotation("p1", { includeSettlement: true });

    expect(insertedQuote!.fx_settlement_status).toBe("not_configured");
    expect(insertedQuote!.fx_settlement_currency).toBeNull();
    expect(insertedQuote!.fx_total_payable).toBeNull();
  });

  it("settlement is skipped entirely when not requested", async () => {
    await generateQuotation("p1");
    expect(insertedQuote!.fx_settlement_status).toBeNull();
    expect(insertedQuote!.fx_settlement).toBeNull();
  });

  it("stores the local fixture-validation state alongside the verified rule", async () => {
    jurisdictionRules = [
      {
        id: "r1",
        rule_code: "NG-VAT-FED",
        version: 1,
        market_code: "NG",
        jurisdiction_level: "national",
        jurisdiction_code: "NG",
        tax_category: "consumption",
        tax_name: "VAT",
        components: [{ name: "VAT", rate_pct: 7.5, compound_on: null }],
        basis_inclusive: false,
        taxable_base_definition: "Taxable supplies.",
        rounding_method: "half_up",
        exemption_handling: "excluded_from_base",
        unknown_handling: "not_determined",
        applies_to: "both",
        effective_from: "2019-02-01",
        effective_to: null,
        source_title: "VAT Act",
        source_url: "https://firs.gov.ng/",
        source_publisher: "Federal Inland Revenue Service (FIRS)",
        reviewer_name: "FRELUX Tax Review",
        next_review_date: "2027-02-01",
        is_active: true,
      },
    ];
    taxValidationRows = [
      {
        id: "v1",
        market_code: "NG",
        rule_ref: "NG-VAT-FED",
        verdict: "validated",
        reviewer_name: "Adaeze Okonkwo",
        reviewer_role: "Chartered Accountant",
        reviewer_location: "Lagos, NG",
        review_date: "2026-11-01",
        checklist: {},
        evidence_url: null,
        notes: null,
      },
    ];
    (project as Record<string, unknown>).location = { country_code: "NG" };

    await generateQuotation("p1");

    expect(insertedQuote!.tax_source).toBe("verified_rule");
    expect(insertedQuote!.tax_validation_state).toBe("validated");
    expect(insertedQuote!.tax_validated_by).toBe("Adaeze Okonkwo");
    expect(insertedQuote!.tax_validated_at).toBe("2026-11-01");
  });

  it("quotes an honest pending validation state when no reviewer verdict exists", async () => {
    jurisdictionRules = [
      {
        id: "r1",
        rule_code: "NG-VAT-FED",
        version: 1,
        market_code: "NG",
        jurisdiction_level: "national",
        jurisdiction_code: "NG",
        tax_category: "consumption",
        tax_name: "VAT",
        components: [{ name: "VAT", rate_pct: 7.5, compound_on: null }],
        basis_inclusive: false,
        taxable_base_definition: "Taxable supplies.",
        rounding_method: "half_up",
        exemption_handling: "excluded_from_base",
        unknown_handling: "not_determined",
        applies_to: "both",
        effective_from: "2019-02-01",
        effective_to: null,
        source_title: "VAT Act",
        source_url: "https://firs.gov.ng/",
        source_publisher: "Federal Inland Revenue Service (FIRS)",
        reviewer_name: "FRELUX Tax Review",
        next_review_date: "2027-02-01",
        is_active: true,
      },
    ];
    (project as Record<string, unknown>).location = { country_code: "NG" };

    await generateQuotation("p1");

    expect(insertedQuote!.tax_source).toBe("verified_rule");
    expect(insertedQuote!.tax_validation_state).toBe("pending");
    expect(insertedQuote!.tax_validated_by).toBeNull();
  });
});
