import { describe, it, expect, beforeEach, vi } from "vitest";
import { flagStandardsForCalculation } from "./standards-citations";
import type { ConstructionStandardRow, ComplianceReviewRow } from "./compliance-checklist";

const state: { rows: ConstructionStandardRow[]; reviews: ComplianceReviewRow[] } = {
  rows: [],
  reviews: [],
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const filters = new Map<string, unknown>();
      const data = table === "construction_standards" ? state.rows
        : table === "compliance_reviews" ? state.reviews : [];
      const chain = {
        select: () => chain,
        eq: (col: string, val: unknown) => { filters.set(col, val); return chain; },
        order: () => {
          let out = data as unknown as Record<string, unknown>[];
          for (const [col, val] of filters)
            out = out.filter((r) => r[col] === val);
          filters.clear();
          return Promise.resolve({
            data: out as unknown as ConstructionStandardRow[],
            error: null,
          });
        },
      };
      return chain;
    },
  },
}));

const row = (over: Partial<ConstructionStandardRow> = {}): ConstructionStandardRow => ({
  id: "s1",
  market_code: "ID",
  domain: "building_code",
  ref: "sni-1726-2019",
  title: "Earthquake resistance planning standard",
  authority: "Badan Standardisasi Nasional (BSN)",
  evidence_type: "national_standard",
  coverage_spec: "Seismic requirements",
  applies_to: { engines: ["structural"] },
  notes: "n",
  confidence: "high",
  evidence_url: "https://sitaba.pu.go.id/x",
  verified_date: "2026-10-15",
  ...over,
});

describe("flagStandardsForCalculation (cite-and-flag, never certify)", () => {
  beforeEach(() => {
    state.rows = [];
    state.reviews = [];
  });

  it("produces flags with exact citations per engine", async () => {
    state.rows = [row()];
    const flags = await flagStandardsForCalculation("ID", ["structural"]);
    expect(flags.flaggedEngines).toEqual(["structural"]);
    expect(flags.flags).toHaveLength(1);
    const f = flags.flags[0];
    expect(f.status).toBe("flagged");
    expect(f.ref).toBe("sni-1726-2019");
    expect(f.citation).toContain("BSN");
    expect(f.note).toContain("does not certify compliance");
  });

  it("never emits a compliant status — always 'flagged'", async () => {
    state.rows = [row({ confidence: "high" })];
    state.reviews = [{
      id: "r", market_code: "ID", domain: "building_code", ref: "sni-1726-2019",
      review_status: "approved", reviewer_name: "X", reviewer_credentials: null,
      review_notes: null, reviewed_at: "2026-10-15T10:00:00Z",
    }];
    const flags = await flagStandardsForCalculation("ID", ["structural"]);
    expect(flags.flags.every((f) => f.status === "flagged")).toBe(true);
    expect(flags.flags[0].note).toContain("Expert review on file.");
    expect(flags.flags[0].note).not.toContain("compliant");
  });

  it("discloses engines with no standards as unknowns, never invents a flag", async () => {
    state.rows = [row()];
    const flags = await flagStandardsForCalculation("ID", ["structural", "electrical"]);
    expect(flags.unknownEngines).toEqual(["electrical"]);
    expect(flags.flags.every((f) => f.engine !== "electrical")).toBe(true);
  });

  it("handles a market with no rows honestly", async () => {
    const flags = await flagStandardsForCalculation("ZZ", ["structural"]);
    expect(flags.flags).toHaveLength(0);
    expect(flags.unknownEngines).toEqual(["structural"]);
    expect(flags.disclaimer).toContain("does not certify");
  });

  it("sorts flags deterministically engine-asc then ref-asc", async () => {
    state.rows = [
      row({ domain: "plumbing", ref: "b", applies_to: { engines: ["plumbing"] } }),
      row({ domain: "plumbing", ref: "a", applies_to: { engines: ["plumbing"] } }),
      row({ applies_to: { engines: ["structural", "block"] } }),
    ];
    const flags = await flagStandardsForCalculation("ID", []);
    const keys = flags.flags.map((f) => `${f.engine}/${f.ref}`);
    expect(keys).toEqual([
      "block/sni-1726-2019",
      "plumbing/a",
      "plumbing/b",
      "structural/sni-1726-2019",
    ]);
  });
});
