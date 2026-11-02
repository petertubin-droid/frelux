import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeTaxAmount, pickCatalogRow } from "./tax-calculator";
import { resolveConsumptionTax } from "./tax-calculator";
import type { TaxCatalogRow } from "./tax-catalog";
import { __clearTaxCatalogCache } from "./tax-catalog";

// ---------------------------------------------------------------------------
// Configurable supabase mock
// ---------------------------------------------------------------------------

const state: { taxCatalog: TaxCatalogRow[] } = { taxCatalog: [] };

const filters = new Map<string, unknown>();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: unknown) => {
          if (table === "tax_catalog") filters.set(col, val);
          const chain = {
            eq: (c: string, v: unknown) => {
              if (table === "tax_catalog") filters.set(c, v);
              return chain;
            },
            order: () => {
              let data = table === "tax_catalog" ? state.taxCatalog : [];
              for (const [col, val] of filters) {
                data = data.filter((r) => (r as unknown as Record<string, unknown>)[col] === val);
              }
              filters.clear();
              return Promise.resolve({ data, error: null });
            },
          };
          return chain;
        },
      }),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures mirror the live catalog (migration 20261017160000).
// ---------------------------------------------------------------------------

const row = (over: Partial<TaxCatalogRow>): TaxCatalogRow => ({
  id: "r1",
  market_code: "XX",
  tax_kind: "consumption",
  tax_name: "Tax",
  rate_pct: 10,
  additional_levies_pct: 0,
  applies_to: "both",
  basis: "basis",
  citation_title: "t",
  citation_url: "https://example.com",
  citation_publisher: "p",
  effective_date: "2026-01-01",
  notes: null,
  is_active: true,
  ...over,
});

const GB_ROW = row({
  id: "gb",
  market_code: "GB",
  tax_name: "Value Added Tax (VAT)",
  rate_pct: 20,
  citation_publisher: "HM Revenue & Customs",
});

const GH_ROW = row({
  id: "gh",
  market_code: "GH",
  tax_name: "Value Added Tax (VAT) + NHIL + GETFund",
  rate_pct: 15,
  additional_levies_pct: 5,
  citation_publisher: "Ghana Revenue Authority",
});

const US_ROW = row({
  id: "us",
  market_code: "US",
  tax_name: "Sales and Use Tax (state/local)",
  rate_pct: null,
  citation_publisher: "Federation of Tax Administrators",
});

const CN_MATERIALS = row({
  id: "cnm",
  market_code: "CN",
  applies_to: "materials",
  tax_name: "增值税 (VAT) materials",
  rate_pct: 13,
});
const CN_SERVICES = row({
  id: "cns",
  market_code: "CN",
  applies_to: "services",
  tax_name: "增值税 (VAT) services",
  rate_pct: 9,
});

describe("computeTaxAmount (deterministic core)", () => {
  it("computes net -> tax -> gross deterministically", () => {
    expect(computeTaxAmount(1000, 20)).toEqual({
      net: 1000,
      taxPct: 20,
      taxAmount: 200,
      gross: 1200,
    });
  });

  it("rounds to 2dp", () => {
    const r = computeTaxAmount(33.333, 7.5);
    expect(r.taxAmount).toBeCloseTo(2.5, 2);
    expect(r.gross).toBeCloseTo(35.83, 2);
  });

  it("rejects invalid rates and negative amounts", () => {
    expect(() => computeTaxAmount(-1, 10)).toThrow();
    expect(() => computeTaxAmount(100, -5)).toThrow();
    expect(() => computeTaxAmount(100, 100)).toThrow();
    expect(() => computeTaxAmount(NaN, 10)).toThrow();
  });
});

describe("pickCatalogRow (scope matching)", () => {
  it("prefers the exact scope match", () => {
    expect(pickCatalogRow([CN_MATERIALS, CN_SERVICES], "services")?.id).toBe("cns");
    expect(pickCatalogRow([CN_MATERIALS, CN_SERVICES], "materials")?.id).toBe("cnm");
  });

  it("falls back to a both-scope row", () => {
    const both = row({ applies_to: "both", id: "b" });
    const services = row({ applies_to: "services", id: "s" });
    expect(pickCatalogRow([both, services], "materials")?.id).toBe("b");
  });

  it("returns null for an empty catalog", () => {
    expect(pickCatalogRow([], "both")).toBeNull();
  });
});

describe("resolveConsumptionTax (honesty contract)", () => {
  beforeEach(() => {
    __clearTaxCatalogCache();
    state.taxCatalog = [];
  });

  it("resolves a verified flat rate with citation", async () => {
    state.taxCatalog = [GB_ROW];
    const res = await resolveConsumptionTax("gb");
    expect(res.status).toBe("ok");
    expect(res.ratePct).toBe(20);
    expect(res.effectivePct).toBe(20);
    expect(res.citation?.publisher).toBe("HM Revenue & Customs");
    expect(res.message).toContain("20%");
  });

  it("adds verified levies to the effective rate (GH 15 + 5)", async () => {
    state.taxCatalog = [GH_ROW];
    const res = await resolveConsumptionTax("GH");
    expect(res.status).toBe("ok");
    expect(res.ratePct).toBe(15);
    expect(res.additionalLeviesPct).toBe(5);
    expect(res.effectivePct).toBe(20);
  });

  it("reports varies for markets with no single national rate (US)", async () => {
    state.taxCatalog = [US_ROW];
    const res = await resolveConsumptionTax("US");
    expect(res.status).toBe("varies");
    expect(res.ratePct).toBeUndefined();
    expect(res.message).toContain("no single national rate");
    expect(res.message).toContain("rather than estimated");
    expect(res.message.toLowerCase()).toContain("invented");
  });

  it("returns unknown for a market with no catalog rows — never a default", async () => {
    const res = await resolveConsumptionTax("ZZ");
    expect(res.status).toBe("unknown");
    expect(res.ratePct).toBeUndefined();
    expect(res.message).toContain("rather than guessing");
  });

  it("picks the scope-specific row (CN materials 13 vs services 9)", async () => {
    state.taxCatalog = [CN_MATERIALS, CN_SERVICES];
    const materials = await resolveConsumptionTax("CN", "materials");
    const services = await resolveConsumptionTax("CN", "services");
    expect(materials.ratePct).toBe(13);
    expect(services.ratePct).toBe(9);
  });

  it("does not leak another market's rate (isolation)", async () => {
    state.taxCatalog = [GB_ROW];
    const res = await resolveConsumptionTax("NG");
    expect(res.status).toBe("unknown");
  });
});
