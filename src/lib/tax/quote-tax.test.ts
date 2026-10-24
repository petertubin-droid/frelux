import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TaxCatalogRow } from "./tax-catalog";
import type { TaxJurisdictionRule } from "./jurisdiction-rules";
import {
  computeQuoteTax,
  resolveQuoteTax,
  siteJurisdictionFromLocation,
} from "./quote-tax";
import { __clearTaxCatalogCache } from "./tax-catalog";

// ---------------------------------------------------------------------------
// Configurable supabase mock (shared pattern)
// ---------------------------------------------------------------------------

const state: {
  rules: TaxJurisdictionRule[];
  catalog: TaxCatalogRow[];
} = { rules: [], catalog: [] };

const filters = new Map<string, unknown>();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: unknown) => {
          filters.set(`${table}:${col}`, val);
          const chain = {
            eq: (c: string, v: unknown) => {
              filters.set(`${table}:${c}`, v);
              return chain;
            },
            order: () => {
              const eqFilters = new Map(
                [...filters].filter(([k]) => k.startsWith(`${table}:`)),
              );
              filters.clear();
              let data: Record<string, unknown>[] = (table ===
              "tax_jurisdiction_rules"
                ? state.rules
                : state.catalog) as unknown as Record<string, unknown>[];
              for (const [col, val] of eqFilters) {
                const key = col.split(":")[1];
                data = data.filter((r) => r[key] === val);
              }
              return Promise.resolve({ data, error: null });
            },
          };
          return chain;
        },
      }),
    }),
  },
}));

function rule(over: Partial<TaxJurisdictionRule> = {}): TaxJurisdictionRule {
  return {
    id: "r1",
    rule_code: "NG-VAT-FED",
    version: 1,
    market_code: "NG",
    jurisdiction_level: "national",
    jurisdiction_code: "NG",
    tax_category: "consumption",
    tax_name: "Value Added Tax (VAT)",
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
    ...over,
  };
}

function catalogRow(over: Partial<TaxCatalogRow> = {}): TaxCatalogRow {
  return {
    id: "c1",
    market_code: "KE",
    tax_kind: "consumption",
    tax_name: "Value Added Tax (VAT)",
    rate_pct: 16,
    additional_levies_pct: 0,
    applies_to: "both",
    basis: "Taxable supplies.",
    citation_title: "VAT Act",
    citation_url: "https://kra.go.ke/",
    citation_publisher: "Kenya Revenue Authority",
    effective_date: "2024-01-01",
    notes: null,
    is_active: true,
    ...over,
  };
}

beforeEach(() => {
  state.rules = [];
  state.catalog = [];
  filters.clear();
  __clearTaxCatalogCache();
});

// ---------------------------------------------------------------------------
// siteJurisdictionFromLocation
// ---------------------------------------------------------------------------

describe("siteJurisdictionFromLocation", () => {
  it("derives the national jurisdiction from a country code", () => {
    const j = siteJurisdictionFromLocation({
      country_code: "ng",
      region: "Lagos",
    } as unknown as Record<string, unknown>);
    expect(j).toEqual({
      marketCode: "NG",
      jurisdictionLevel: "national",
      jurisdictionCode: "NG",
    });
  });

  it("returns null without a usable country code", () => {
    expect(siteJurisdictionFromLocation(null)).toBeNull();
    expect(siteJurisdictionFromLocation({ country_code: null })).toBeNull();
    expect(siteJurisdictionFromLocation({ country_code: "NGA" })).toBeNull();
    expect(siteJurisdictionFromLocation({ country_code: "" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveQuoteTax precedence
// ---------------------------------------------------------------------------

describe("resolveQuoteTax precedence", () => {
  it("an explicit per-call percentage is a labeled manual assumption", async () => {
    state.rules = [rule()];
    const r = await resolveQuoteTax({
      explicitTaxPct: 10,
      siteLocation: { country_code: "NG" },
    });
    expect(r.kind).toBe("manual_assumption");
    expect(r.source).toBe("caller_override");
    expect(r.pct).toBe(10);
    expect(r.assumptionAuthor).toContain("entered on this quotation");
    expect(r.message).toContain("not a verified rate");
  });

  it("a verified jurisdiction rule beats the settings default", async () => {
    state.rules = [rule()];
    const r = await resolveQuoteTax({
      settingsTaxPct: 5,
      siteLocation: { country_code: "NG" },
    });
    expect(r.kind).toBe("verified_rule");
    expect(r.pct).toBe(7.5);
    expect(r.source).toBe("jurisdiction_rule");
    expect(r.rule).toEqual({ code: "NG-VAT-FED", version: 1 });
    expect(r.citation?.publisher).toContain("FIRS");
    expect(r.effectiveFrom).toBe("2019-02-01");
  });

  it("falls back to the market catalog (still verified, still labeled)", async () => {
    state.catalog = [catalogRow()];
    const r = await resolveQuoteTax({
      siteLocation: { country_code: "KE" },
    });
    expect(r.kind).toBe("verified_rule");
    expect(r.source).toBe("market_catalog");
    expect(r.pct).toBe(16);
  });

  it("the settings default applies only when no rule resolves, as a manual assumption", async () => {
    const r = await resolveQuoteTax({
      settingsTaxPct: 5,
      siteLocation: { country_code: "NG" },
    });
    expect(r.kind).toBe("manual_assumption");
    expect(r.source).toBe("quotation_settings");
    expect(r.assumptionAuthor).toContain("quotation settings");
  });

  it("no location, no settings: not determined, never 7.5", async () => {
    const r = await resolveQuoteTax({});
    expect(r.kind).toBe("not_determined");
    expect(r.pct).toBeNull();
    expect(r.message).toContain("Tax not determined");
  });

  it("a location without any rule and no settings stays not determined", async () => {
    const r = await resolveQuoteTax({ siteLocation: { country_code: "ZZ" } });
    expect(r.kind).toBe("not_determined");
    expect(r.pct).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Compound flattening honesty
// ---------------------------------------------------------------------------

describe("compound rule honesty", () => {
  it("a compound rule resolves verified with pct null and component-level amounts", async () => {
    state.rules = [
      rule({
        components: [
          { name: "VAT", rate_pct: 10, compound_on: null },
          { name: "Levy", rate_pct: 2, compound_on: "VAT" },
        ],
      }),
    ];
    const r = await resolveQuoteTax({
      siteLocation: { country_code: "NG" },
    });
    expect(r.kind).toBe("verified_rule");
    expect(r.pct).toBeNull();
    expect(r.compoundUnsupported).toBe(false);
    expect(r.message).toContain("Components compound");
    expect(r.components).toEqual([
      { name: "VAT", ratePct: 10, compoundOn: null },
      { name: "Levy", ratePct: 2, compoundOn: "VAT" },
    ]);
    // Deterministic computation: the levy compounds on net + VAT.
    const comp = computeQuoteTax(r, 1000);
    expect(comp).not.toBeNull();
    expect(comp?.lines[0]).toMatchObject({ name: "VAT", amount: 100 });
    expect(comp?.lines[1]).toMatchObject({
      name: "Levy",
      base: 1100,
      amount: 22,
    });
    expect(comp?.totalTax).toBe(122);
    expect(comp?.gross).toBe(1122);
  });

  it("multi-component additive rules flatten to the exact sum", async () => {
    state.rules = [
      rule({
        components: [
          { name: "VAT", rate_pct: 15, compound_on: null },
          { name: "NHIL", rate_pct: 2.5, compound_on: null },
          { name: "GETFund", rate_pct: 2.5, compound_on: null },
        ],
      }),
    ];
    const r = await resolveQuoteTax({
      siteLocation: { country_code: "NG" },
    });
    expect(r.kind).toBe("verified_rule");
    expect(r.pct).toBe(20);
    expect(r.components).toHaveLength(3);
    const comp = computeQuoteTax(r, 1000);
    expect(comp?.lines.map((l) => l.amount)).toEqual([150, 25, 25]);
    expect(comp?.totalTax).toBe(200);
    expect(comp?.gross).toBe(1200);
    expect(comp?.basisInclusive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invalid manual inputs never become rates
// ---------------------------------------------------------------------------

describe("invalid manual inputs", () => {
  it("rejects out-of-range and non-finite explicit percentages", async () => {
    const r = await resolveQuoteTax({ explicitTaxPct: 150 });
    expect(r.kind).toBe("not_determined");
    const r2 = await resolveQuoteTax({ explicitTaxPct: Number.NaN });
    expect(r2.kind).toBe("not_determined");
  });

  it("computeQuoteTax returns null for manual and not-determined resolutions", async () => {
    const manual = await resolveQuoteTax({ explicitTaxPct: 5 });
    expect(computeQuoteTax(manual, 1000)).toBeNull();
    const nd = await resolveQuoteTax({});
    expect(computeQuoteTax(nd, 1000)).toBeNull();
  });

  it("rejects out-of-range settings defaults", async () => {
    const r = await resolveQuoteTax({ settingsTaxPct: -3 });
    expect(r.kind).toBe("not_determined");
  });
});
