import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================
// PER-JURISDICTION TAX FIXTURES — Phase 1 regression guards.
//
// For every market with authoritative tax data on file, the
// engine must reproduce the fixture's expected outputs exactly:
// kind, source, flattened percentage, component lines with
// bases and amounts, total tax, grand total, citation and
// effective date. Any drift in the seeded rules, the resolution
// precedence or the deterministic computation breaks this suite.
//
// The machine check is necessary but NOT sufficient: each
// fixture still requires an accountable local reviewer's
// verdict in tax_rule_validations (see
// docs/TAX_FIXTURE_VALIDATION.md). Nothing here claims local
// validation on its own.
// ============================================================

const state: Record<string, unknown[]> = {};
const res = (data: unknown) =>
  ({
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ data, error: null }).then(resolve),
    select: () => res(data),
    eq: () => res(data),
    order: () => res(data),
    maybeSingle: () => res(data),
  }) as unknown as Promise<{ data: unknown; error: unknown }>;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "tax_jurisdiction_rules") return res(state.rules ?? []);
      if (table === "tax_catalog") return res(state.catalog ?? []);
      return res(null);
    },
  },
  isSupabaseConfigured: true,
}));

import { MARKET_TAX_FIXTURES } from "@/lib/tax/fixtures";
import { resolveQuoteTax, computeQuoteTax } from "@/lib/tax/quote-tax";
import { __clearTaxCatalogCache } from "@/lib/tax/tax-catalog";

beforeEach(() => {
  state.rules = [];
  state.catalog = [];
  __clearTaxCatalogCache();
});

describe("per-jurisdiction fixtures reproduce engine outputs exactly", () => {
  for (const fx of MARKET_TAX_FIXTURES) {
    describe(`market ${fx.market}`, () => {
      for (const scen of fx.scenarios) {
        it(`${scen.name} (${scen.appliesTo})`, async () => {
          state.rules = fx.rows.rules as unknown[];
          state.catalog = fx.rows.catalog as unknown[];
          __clearTaxCatalogCache();

          const resolution = await resolveQuoteTax({
            siteLocation: { country_code: fx.market },
            appliesTo: scen.appliesTo,
            asOf: "2026-10-24",
          });
          const comp = computeQuoteTax(resolution, scen.preTax);
          const exp = scen.expected;

          expect(resolution.kind).toBe(exp.kind);
          expect(resolution.source).toBe(exp.source);
          expect(resolution.pct).toBe(exp.taxPercent);

          const taxAmount = comp ? comp.totalTax : 0;
          expect(taxAmount).toBe(exp.taxAmount);
          const grandTotal = comp
            ? comp.basisInclusive
              ? scen.preTax
              : comp.gross
            : scen.preTax +
              (resolution.pct ? scen.preTax * (resolution.pct / 100) : 0);
          expect(grandTotal).toBe(exp.grandTotal);

          if (exp.components.length > 0) {
            expect(comp?.lines ?? []).toHaveLength(exp.components.length);
            for (let i = 0; i < exp.components.length; i++) {
              expect(comp!.lines[i]).toEqual(exp.components[i]);
            }
          } else {
            expect(comp ?? null).toBeNull();
          }

          expect(resolution.citation?.publisher ?? null).toBe(
            exp.citationPublisher,
          );
          expect(resolution.effectiveFrom).toBe(exp.effectiveFrom);
        });
      }
    });
  }

  it("covers every market with seeded tax data and no others", () => {
    // A market with data but no fixture (or vice versa) means the
    // snapshot is stale and the suite must fail.
    expect(MARKET_TAX_FIXTURES).toHaveLength(20);
    const codes = MARKET_TAX_FIXTURES.map((f) => f.market);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual([...codes].sort());
  });

  it("every fixture carries its authoritative citation", () => {
    for (const fx of MARKET_TAX_FIXTURES) {
      for (const scen of fx.scenarios) {
        if (scen.expected.kind === "verified_rule") {
          expect(scen.expected.citationPublisher).toBeTruthy();
          expect(scen.expected.effectiveFrom).toBeTruthy();
        }
      }
    }
  });
});
