import { describe, it, expect, beforeEach, vi } from "vitest";
import type { DbContractorProject } from "@/types/database";

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
    maybeSingle: () => res(data, error),
  }) as unknown as Promise<{ data: unknown; error: unknown }>;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "contractor_projects") return res(project);
      if (table === "quotation_settings") return res(quotationSettings);
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
});
