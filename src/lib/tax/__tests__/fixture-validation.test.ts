import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================
// TAX FIXTURE VALIDATION LAYER — Phase 1 regression guards.
//
// Fail-closed honesty: no tax_rule_validations record means
// PENDING, with no invented reviewer. 'validated' comes only
// from a human record that passed the DB accountability gate.
// ============================================================

let validationRows: Record<string, unknown>[] = [];

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
      if (table === "tax_rule_validations") return res(validationRows);
      return res(null);
    },
  },
  isSupabaseConfigured: true,
}));

import {
  fetchTaxValidationState,
  validationStateMessage,
} from "@/lib/tax/fixture-validation";

const record = (overrides: Record<string, unknown> = {}) => ({
  id: "v1",
  market_code: "NG",
  rule_ref: "NG-VAT-FED",
  verdict: "validated",
  reviewer_name: "Adaeze Okonkwo",
  reviewer_role: "Chartered Accountant",
  reviewer_location: "Lagos, NG",
  review_date: "2026-11-01",
  checklist: {
    rate: true,
    taxable_base: true,
    exemptions: true,
    rounding: true,
    citation: true,
    effective_dates: true,
    component_structure: true,
  },
  evidence_url: "https://firs.gov.ng/vat",
  notes: null,
  ...overrides,
});

beforeEach(() => {
  validationRows = [];
});

describe("fetchTaxValidationState — fail-closed local validation", () => {
  it("is PENDING when no reviewer has recorded a verdict", async () => {
    const v = await fetchTaxValidationState("NG");
    expect(v.state).toBe("pending");
    expect(v.reviewerName).toBeNull();
    expect(v.reviewDate).toBeNull();
  });

  it("returns the latest human verdict with the accountable reviewer", async () => {
    validationRows = [record()];
    const v = await fetchTaxValidationState("NG");
    expect(v.state).toBe("validated");
    expect(v.reviewerName).toBe("Adaeze Okonkwo");
    expect(v.reviewerRole).toBe("Chartered Accountant");
    expect(v.reviewerLocation).toBe("Lagos, NG");
    expect(v.reviewDate).toBe("2026-11-01");
    expect(v.evidenceUrl).toBe("https://firs.gov.ng/vat");
  });

  it("uses the newest review_date when several exist", async () => {
    validationRows = [
      record({ id: "v1", review_date: "2026-11-01", verdict: "validated" }),
      record({
        id: "v2",
        review_date: "2026-12-01",
        verdict: "needs_changes",
        notes: "Levy treatment changed locally.",
      }),
    ].sort((a, b) => (a.review_date < b.review_date ? 1 : -1)); // newest first, as the fetch orders
    const v = await fetchTaxValidationState("NG");
    expect(v.state).toBe("needs_changes");
  });

  it("an empty market code resolves PENDING without a query", async () => {
    const v = await fetchTaxValidationState("  ");
    expect(v.state).toBe("pending");
  });
});

describe("validationStateMessage — user-safe disclosure", () => {
  it("pending states disclose the honest gap", async () => {
    const msg = validationStateMessage(await fetchTaxValidationState("NG"));
    expect(msg).toContain("Awaiting validation");
    expect(msg).toContain("accountable local reviewer");
  });

  it("validated states name the accountable reviewer", async () => {
    validationRows = [record()];
    const msg = validationStateMessage(await fetchTaxValidationState("NG"));
    expect(msg).toContain("Adaeze Okonkwo");
    expect(msg).toContain("Chartered Accountant");
    expect(msg).toContain("Lagos, NG");
    expect(msg).toContain("2026-11-01");
  });

  it("rejections say the seeded rule requires correction", async () => {
    validationRows = [record({ verdict: "rejected" })];
    const msg = validationStateMessage(await fetchTaxValidationState("NG"));
    expect(msg).toContain("rejected");
    expect(msg).toContain("requires correction");
  });
});
