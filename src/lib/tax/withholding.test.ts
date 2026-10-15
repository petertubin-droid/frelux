import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchWithholdingRules,
  resolveWithholding,
  computeWithholding,
  __clearWithholdingCache,
  type WithholdingRuleRow,
} from "./withholding";

const state: { rows: WithholdingRuleRow[] } = { rows: [] };

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const data = table === "withholding_rules" ? state.rows : [];
      return {
        select: () => ({
          eq: (_a: string, _b: string) => ({
            eq: (_c: string, _d: string) => ({
              order: () => Promise.resolve({ data, error: null }),
            }),
          }),
        }),
      };
    },
  },
}));

const rule = (over: Partial<WithholdingRuleRow>): WithholdingRuleRow => ({
  id: "w1",
  market_code: "XX",
  rule_kind: "withholding",
  rule_name: "Rule",
  rate_pct: 10,
  applies_to: "contractor_payments",
  basis: "basis",
  citation_title: "t",
  citation_url: "https://example.com",
  citation_publisher: "p",
  effective_date: "2026-01-01",
  legal_review_status: "pending",
  reviewed_at: null,
  is_active: true,
  ...over,
});

describe("withholding legal-review gate (M4)", () => {
  beforeEach(() => {
    __clearWithholdingCache();
    state.rows = [];
  });

  it("treats pending rules as informational only — never actionable", async () => {
    state.rows = [rule({ id: "ng1", market_code: "NG", legal_review_status: "pending" })];
    const res = await resolveWithholding("NG");
    expect(res.status).toBe("pending_only");
    expect(res.actionableRules).toHaveLength(0);
    expect(res.pendingRules).toHaveLength(1);
    expect(res.message).toContain("pending legal review");
    expect(res.message).toContain("never computed");
  });

  it("returns approved rules as actionable with citations", async () => {
    state.rows = [
      rule({ id: "gb1", market_code: "GB", legal_review_status: "approved", rate_pct: 20 }),
    ];
    const res = await resolveWithholding("GB");
    expect(res.status).toBe("approved");
    expect(res.actionableRules).toHaveLength(1);
    expect(res.pendingRules).toHaveLength(0);
  });

  it("hides rejected rules entirely", async () => {
    state.rows = [rule({ legal_review_status: "rejected" })];
    const res = await resolveWithholding("XX");
    expect(res.status).toBe("none");
    expect(res.pendingRules).toHaveLength(0);
  });

  it("reports none for markets with no rules — never invents one", async () => {
    const res = await resolveWithholding("ZZ");
    expect(res.status).toBe("none");
    expect(res.message).toContain("None is invented");
  });

  it("computeWithholding refuses to compute pending rules", async () => {
    state.rows = [rule({ id: "ng1", market_code: "NG", rate_pct: 2, legal_review_status: "pending" })];
    const { resolution, computation } = await computeWithholding("NG", 100000);
    expect(resolution.status).toBe("pending_only");
    expect(computation).toBeNull();
  });

  it("computeWithholding computes approved rules deterministically", async () => {
    state.rows = [
      rule({
        id: "gb1",
        market_code: "GB",
        rate_pct: 20,
        legal_review_status: "approved",
        citation_publisher: "HM Revenue & Customs",
      }),
    ];
    const { computation } = await computeWithholding("GB", 1000, "gb1");
    expect(computation).not.toBeNull();
    expect(computation!.gross).toBe(1000);
    expect(computation!.ratePct).toBe(20);
    expect(computation!.withholdingAmount).toBe(200);
    expect(computation!.net).toBe(800);
    expect(computation!.citation.publisher).toBe("HM Revenue & Customs");
  });

  it("computeWithholding refuses approved rules without a rate", async () => {
    state.rows = [
      rule({ id: "x1", market_code: "XX", rate_pct: null, legal_review_status: "approved" }),
    ];
    const { computation } = await computeWithholding("XX", 1000, "x1");
    expect(computation).toBeNull();
  });
});
