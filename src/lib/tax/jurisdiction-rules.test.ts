import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TaxCatalogRow } from "./tax-catalog";
import { __clearTaxCatalogCache } from "./tax-catalog";
import {
  resolveJurisdictionTax,
  computeJurisdictionTax,
  fetchJurisdictionRules,
  ruleIsEffective,
  ruleIsAdmissible,
  type TaxJurisdictionRule,
} from "./jurisdiction-rules";

// ---------------------------------------------------------------------------
// Configurable supabase mock (same pattern as tax-calculator.test.ts)
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
              const prefix =
                table === "tax_jurisdiction_rules" ? "rules" : "catalog";
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
                data = data.filter(
                  (r) => (r as unknown as Record<string, unknown>)[key] === val,
                );
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function rule(over: Partial<TaxJurisdictionRule> = {}): TaxJurisdictionRule {
  return {
    id: "r1",
    rule_code: "XX-VAT-FED",
    version: 1,
    market_code: "XX",
    jurisdiction_level: "national",
    jurisdiction_code: "XX",
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
    source_url: "https://example.gov/",
    source_publisher: "Revenue Authority",
    reviewer_name: "FRELUX Tax Review",
    next_review_date: "2027-02-01",
    is_active: true,
    ...over,
  };
}

function catalogRow(over: Partial<TaxCatalogRow> = {}): TaxCatalogRow {
  return {
    id: "c1",
    market_code: "XX",
    tax_kind: "consumption",
    tax_name: "Value Added Tax (VAT)",
    rate_pct: 7.5,
    additional_levies_pct: 0,
    applies_to: "both",
    basis: "Taxable supplies.",
    citation_title: "VAT Act",
    citation_url: "https://example.gov/",
    citation_publisher: "Revenue Authority",
    effective_date: "2019-02-01",
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
// Effective-date boundaries
// ---------------------------------------------------------------------------

describe("effective-date boundaries", () => {
  it("admits a rule on its effective_from day", () => {
    expect(ruleIsEffective(rule(), "2019-02-01")).toBe(true);
  });

  it("rejects a rule the day before it takes effect", async () => {
    state.rules = [rule()];
    const r = await resolveJurisdictionTax(
      {
        marketCode: "XX",
        jurisdictionLevel: "national",
        jurisdictionCode: "XX",
      },
      { asOf: "2019-01-31" },
    );
    expect(r.status).toBe("not_determined");
    expect(r.message).not.toContain("7.5");
  });

  it("admits a rule on its effective_to boundary day", () => {
    expect(
      ruleIsEffective(rule({ effective_to: "2026-12-31" }), "2026-12-31"),
    ).toBe(true);
    expect(
      ruleIsEffective(rule({ effective_to: "2026-12-31" }), "2027-01-01"),
    ).toBe(false);
  });

  it("uses the newest effective version when versions overlap", () => {
    expect(
      ruleIsEffective(
        rule({ version: 2, effective_from: "2026-01-01" }),
        "2026-06-01",
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fail-closed admission
// ---------------------------------------------------------------------------

describe("fail-closed rule admission", () => {
  it("ignores rules without a reviewer (never a silent rate)", async () => {
    state.rules = [rule({ reviewer_name: null })];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "national",
      jurisdictionCode: "XX",
    });
    expect(r.status).toBe("not_determined");
  });

  it("ignores rules without a next review date", async () => {
    state.rules = [rule({ next_review_date: null })];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "national",
      jurisdictionCode: "XX",
    });
    expect(r.status).toBe("not_determined");
  });

  it("ignores rules with malformed components", () => {
    expect(ruleIsAdmissible(rule({ components: [] }))).toBe(false);
    expect(
      ruleIsAdmissible(
        rule({ components: [{ name: "", rate_pct: 5, compound_on: null }] }),
      ),
    ).toBe(false);
    expect(
      ruleIsAdmissible(
        rule({
          components: [{ name: "VAT", rate_pct: 120, compound_on: null }],
        }),
      ),
    ).toBe(false);
  });

  it("never substitutes 7.5% or another market's rate", async () => {
    // A different market has a verified catalog row; resolving YY
    // must not borrow it.
    state.catalog = [catalogRow({ market_code: "ZZ" })];
    const r = await resolveJurisdictionTax({
      marketCode: "YY",
      jurisdictionLevel: "national",
      jurisdictionCode: "YY",
    });
    expect(r.status).toBe("not_determined");
    expect(r.components).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Jurisdiction precedence
// ---------------------------------------------------------------------------

describe("jurisdiction precedence and coverage", () => {
  it("prefers the most specific covering rule", async () => {
    state.rules = [
      rule({
        rule_code: "XX-VAT-STATE",
        jurisdiction_level: "state",
        jurisdiction_code: "XX-LA",
        components: [
          { name: "State sales tax", rate_pct: 5, compound_on: null },
        ],
        tax_name: "State sales tax",
      }),
      rule(),
    ];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "state",
      jurisdictionCode: "XX-LA",
    });
    expect(r.source).toBe("jurisdiction_rule");
    expect(r.rule?.code).toBe("XX-VAT-STATE");
    expect(r.resolvedJurisdiction.jurisdictionLevel).toBe("state");
  });

  it("a state rule for a DIFFERENT state never applies", async () => {
    state.rules = [
      rule({
        jurisdiction_level: "state",
        jurisdiction_code: "XX-OT",
        tax_name: "Other state tax",
      }),
    ];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "state",
      jurisdictionCode: "XX-LA",
    });
    expect(r.status).toBe("not_determined");
  });

  it("falls back from a state site to a national rule", async () => {
    state.rules = [rule()];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "state",
      jurisdictionCode: "XX-LA",
    });
    expect(r.source).toBe("jurisdiction_rule");
    expect(r.resolvedJurisdiction.jurisdictionLevel).toBe("national");
    expect(r.unresolvedQuestions.length).toBeGreaterThan(0);
  });

  it("municipal beats state beats national ordering is deterministic", async () => {
    state.rules = [
      rule({ rule_code: "N", jurisdiction_level: "national", tax_name: "Nat" }),
      rule({
        rule_code: "M",
        jurisdiction_level: "municipal",
        jurisdiction_code: "XX-LA-CITY",
        tax_name: "Mun",
      }),
      rule({
        rule_code: "S",
        jurisdiction_level: "state",
        jurisdiction_code: "XX-LA",
        tax_name: "St",
      }),
    ];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "municipal",
      jurisdictionCode: "XX-LA-CITY",
    });
    expect(r.rule?.code).toBe("M");
  });
});

// ---------------------------------------------------------------------------
// Catalog fallback
// ---------------------------------------------------------------------------

describe("market catalog fallback", () => {
  it("falls back to the verified catalog when no rule exists", async () => {
    state.catalog = [catalogRow()];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "national",
      jurisdictionCode: "XX",
    });
    expect(r.source).toBe("market_catalog");
    expect(r.status).toBe("ok");
    expect(r.components).toEqual([
      { name: "Value Added Tax (VAT)", rate_pct: 7.5, compound_on: null },
    ]);
    expect(r.message).toContain("market catalog");
  });

  it("a catalog row with NULL rate stays not_determined", async () => {
    state.catalog = [catalogRow({ rate_pct: null, basis: "Varies by state." })];
    const r = await resolveJurisdictionTax({
      marketCode: "XX",
      jurisdictionLevel: "state",
      jurisdictionCode: "XX-LA",
    });
    expect(r.status).toBe("not_determined");
    expect(r.message).toContain("no single national rate");
  });

  it("scope-matched rules win over catalog rows", async () => {
    state.rules = [
      rule({
        applies_to: "services",
        components: [{ name: "Service tax", rate_pct: 10, compound_on: null }],
      }),
    ];
    state.catalog = [catalogRow()];
    const r = await resolveJurisdictionTax(
      {
        marketCode: "XX",
        jurisdictionLevel: "national",
        jurisdictionCode: "XX",
      },
      { appliesTo: "services" },
    );
    expect(r.source).toBe("jurisdiction_rule");
    expect(r.components[0].name).toBe("Service tax");
  });
});

// ---------------------------------------------------------------------------
// Inclusive / exclusive calculation, compounding, rounding
// ---------------------------------------------------------------------------

describe("computeJurisdictionTax", () => {
  const ok = (over: Partial<TaxJurisdictionRule> = {}) => rule(over);

  it("refuses not_determined resolutions", async () => {
    const r = await resolveJurisdictionTax({
      marketCode: "YY",
      jurisdictionLevel: "national",
      jurisdictionCode: "YY",
    });
    expect(computeJurisdictionTax(1000, r)).toBeNull();
  });

  it("exclusive: computes each component on the net", async () => {
    state.rules = [ok()];
    const { computation } = await applyTest(ok());
    expect(computation?.net).toBe(1000);
    expect(computation?.totalTax).toBe(75);
    expect(computation?.gross).toBe(1075);
  });

  it("inclusive: extracts the tax from a gross-inclusive net", () => {
    const res = resolutionOf(ok({ basis_inclusive: true }));
    const c = computeJurisdictionTax(1075, res)!;
    expect(c.gross).toBe(1075);
    expect(c.net).toBeCloseTo(1000, 1);
    expect(c.totalTax).toBeCloseTo(75, 1);
  });

  it("compound_on computes on net plus the referenced component", () => {
    const res = resolutionOf(
      ok({
        components: [
          { name: "VAT", rate_pct: 10, compound_on: null },
          { name: "Levy", rate_pct: 2, compound_on: "VAT" },
        ],
      }),
    );
    const c = computeJurisdictionTax(1000, res)!;
    expect(c.components[0].amount).toBe(100);
    // Levy base: 1000 + 100 VAT = 1100; 2% = 22.
    expect(c.components[1].computedBase).toBe(1100);
    expect(c.components[1].amount).toBe(22);
    expect(c.totalTax).toBe(122);
    expect(c.gross).toBe(1122);
  });

  it("throws on a compound_on referencing an unknown component", () => {
    const res = resolutionOf(
      ok({
        components: [{ name: "Levy", rate_pct: 2, compound_on: "VAT" }],
      }),
    );
    expect(() => computeJurisdictionTax(1000, res)).toThrow(
      /unknown component/,
    );
  });

  it("rounds per the authored rounding method (half_up vs down)", () => {
    const res = resolutionOf(
      ok({ components: [{ name: "VAT", rate_pct: 7.5, compound_on: null }] }),
    );
    const a = computeJurisdictionTax(100.05, res)!;
    expect(a.components[0].amount).toBe(7.5);

    // 100 * 7.555% = 7.555 minor units: half_up -> 7.56, down -> 7.55,
    // half_even -> 7.56 (756 is even).
    const mk = (rounding: "half_up" | "half_even" | "down") =>
      resolutionOf(
        ok({
          rounding_method: rounding,
          components: [{ name: "VAT", rate_pct: 7.555, compound_on: null }],
        }),
      );
    expect(
      computeJurisdictionTax(100, mk("half_up"))!.components[0].amount,
    ).toBe(7.56);
    expect(computeJurisdictionTax(100, mk("down"))!.components[0].amount).toBe(
      7.55,
    );
    expect(
      computeJurisdictionTax(100, mk("half_even"))!.components[0].amount,
    ).toBe(7.56);
    // half_even rounds a true .5 to the even neighbour: 7.545 -> 754/755,
    // 754 is even -> 7.54 (half_up would give 7.55).
    const resEven = resolutionOf(
      ok({
        rounding_method: "half_even",
        components: [{ name: "VAT", rate_pct: 7.545, compound_on: null }],
      }),
    );
    expect(computeJurisdictionTax(100, resEven)!.components[0].amount).toBe(
      7.54,
    );
  });

  it("sums multi-component additive taxes exactly", () => {
    const res = resolutionOf(
      ok({
        components: [
          { name: "VAT", rate_pct: 15, compound_on: null },
          { name: "NHIL", rate_pct: 2.5, compound_on: null },
          { name: "GETFund", rate_pct: 2.5, compound_on: null },
        ],
      }),
    );
    const c = computeJurisdictionTax(1000, res)!;
    expect(c.components.map((p) => p.amount)).toEqual([150, 25, 25]);
    expect(c.totalTax).toBe(200);
    expect(c.gross).toBe(1200);
  });
});

async function applyTest(r: TaxJurisdictionRule) {
  state.rules = [r];
  const resolution = await resolveJurisdictionTax({
    marketCode: r.market_code,
    jurisdictionLevel: "national",
    jurisdictionCode: r.market_code,
  });
  return { resolution, computation: computeJurisdictionTax(1000, resolution) };
}

function resolutionOf(r: TaxJurisdictionRule) {
  return {
    status: "ok" as const,
    source: "jurisdiction_rule" as const,
    resolvedJurisdiction: {
      marketCode: r.market_code,
      jurisdictionLevel: r.jurisdiction_level,
      jurisdictionCode: r.jurisdiction_code,
    },
    rule: { code: r.rule_code, version: r.version },
    taxName: r.tax_name,
    effective: { from: r.effective_from, to: r.effective_to },
    citation: {
      title: r.source_title,
      url: r.source_url,
      publisher: r.source_publisher,
    },
    basisInclusive: r.basis_inclusive,
    taxableBaseDefinition: r.taxable_base_definition,
    roundingMethod: r.rounding_method,
    exemptionHandling: r.exemption_handling,
    appliesTo: r.applies_to,
    components: r.components,
    reviewer: r.reviewer_name,
    nextReviewDate: r.next_review_date,
    unresolvedQuestions: [],
    message: "",
  };
}

// ---------------------------------------------------------------------------
// Fetcher sanity
// ---------------------------------------------------------------------------

describe("fetchJurisdictionRules", () => {
  it("returns only effective rules and is market-scoped", async () => {
    state.rules = [
      rule({ market_code: "XX" }),
      rule({ market_code: "XX", effective_from: "2030-01-01", id: "r2" }),
      rule({ market_code: "YY", id: "r3" }),
    ];
    const rows = await fetchJurisdictionRules("XX", "2026-10-24");
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe("r1");
  });
});
