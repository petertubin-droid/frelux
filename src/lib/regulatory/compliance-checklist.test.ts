import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildChecklistFromRows,
  fetchStandardsForMarket,
  fetchComplianceReviews,
  generateComplianceChecklist,
  type ConstructionStandardRow,
  type ComplianceReviewRow,
} from "./compliance-checklist";

const state: { rows: ConstructionStandardRow[]; reviews: ComplianceReviewRow[] } = {
  rows: [],
  reviews: [],
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const filters = new Map<string, unknown>();
      const data: ConstructionStandardRow[] | ComplianceReviewRow[] =
        table === "construction_standards"
          ? (state.rows as ConstructionStandardRow[])
          : table === "compliance_reviews"
            ? (state.reviews as ComplianceReviewRow[])
            : [];
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
  market_code: "GB",
  domain: "plumbing",
  ref: "bs-en-1401",
  title: "UPVC drainage pipe standard",
  authority: "BSI",
  evidence_type: "national_standard",
  coverage_spec: "BS EN 1401-1",
  applies_to: { engines: ["plumbing"] },
  notes: "n",
  confidence: "high",
  evidence_url: "https://example.com",
  verified_date: "2026-10-11",
  ...over,
});

const review = (over: Partial<ComplianceReviewRow> = {}): ComplianceReviewRow => ({
  id: "r1",
  market_code: "GB",
  domain: "plumbing",
  ref: "bs-en-1401",
  review_status: "pending",
  reviewer_name: null,
  reviewer_credentials: null,
  review_notes: null,
  reviewed_at: null,
  ...over,
});

describe("buildChecklistFromRows (deterministic generator)", () => {
  beforeEach(() => {
    state.rows = [];
    state.reviews = [];
  });

  it("cites the exact ref/title/authority/date verbatim", () => {
    const cl = buildChecklistFromRows([row()], [], "GB", ["plumbing"]);
    expect(cl.items).toHaveLength(1);
    expect(cl.items[0].citation).toBe(
      "bs-en-1401 — UPVC drainage pipe standard (BSI, verified 2026-10-11)",
    );
    expect(cl.items[0].evidenceUrl).toBe("https://example.com");
  });

  it("flags low/medium confidence as pending_verification", () => {
    const low = row({ confidence: "low", ref: "low-1" });
    const med = row({ confidence: "medium", ref: "med-1" });
    const high = row({ confidence: "high", ref: "high-1" });
    const cl = buildChecklistFromRows([low, med, high], [], "GB", ["plumbing"]);
    const byRef = Object.fromEntries(cl.items.map((i) => [i.ref, i.status]));
    expect(byRef["low-1"]).toBe("pending_verification");
    expect(byRef["med-1"]).toBe("pending_verification");
    expect(byRef["high-1"]).toBe("applicable");
  });

  it("sorts deterministically by domain then ref", () => {
    const rows = [
      row({ domain: "plumbing", ref: "b" }),
      row({ domain: "plumbing", ref: "a" }),
      row({ domain: "building_code", ref: "z" }),
    ];
    const cl = buildChecklistFromRows(rows, [], "GB", ["plumbing"]);
    expect(cl.items.map((i) => `${i.domain}/${i.ref}`)).toEqual([
      "building_code/z",
      "plumbing/a",
      "plumbing/b",
    ]);
  });

  it("discloses unknown engines instead of inventing a standard", () => {
    const cl = buildChecklistFromRows([row()], [], "GB", ["plumbing", "electrical", "tile"]);
    expect(cl.unknowns).toEqual(["electrical", "tile"]);
    expect(cl.items.some((i) => i.appliesToEngines.includes("electrical"))).toBe(false);
  });

  it("returns noStandardsOnFile when the registry is empty for the market", () => {
    const cl = buildChecklistFromRows([], [], "ZZ", ["plumbing"]);
    expect(cl.noStandardsOnFile).toBe(true);
    expect(cl.unknowns).toEqual(["plumbing"]);
    expect(cl.items).toHaveLength(0);
  });

  it("never certifies — disclaimer always present and says so", () => {
    const cl = buildChecklistFromRows([row()], [], "GB", ["plumbing"]);
    expect(cl.disclaimer).toContain("does not certify");
    expect(cl.disclaimer).toContain("human");
  });

  it("joins the expert-review gate: approved = reviewed badge, pending = unreviewed", () => {
    const approved = review({ review_status: "approved", reviewer_name: "Eng. A. Bello", reviewed_at: "2026-10-15T10:00:00Z" });
    const cl = buildChecklistFromRows([row()], [approved], "GB", ["plumbing"]);
    expect(cl.items[0].review.status).toBe("approved");
    expect(cl.items[0].review.reviewerName).toBe("Eng. A. Bello");
  });

  it("treats pending review as unreviewed (never expert-confirmed)", () => {
    const pending = review({ review_status: "pending" });
    const cl = buildChecklistFromRows([row()], [pending], "GB", ["plumbing"]);
    expect(cl.items[0].review.status).toBe("pending");
  });

  it("isolates markets — GB rows never leak into NG", () => {
    state.rows = [row({ market_code: "GB" })];
    return expect(generateComplianceChecklist("NG", ["plumbing"])).resolves.toMatchObject({
      noStandardsOnFile: true,
      unknowns: ["plumbing"],
    });
  });
});

describe("fetchStandardsForMarket / fetchComplianceReviews (DB)", () => {
  beforeEach(() => {
    state.rows = [];
    state.reviews = [];
  });

  it("filters by market_code (mock enforces the eq)", async () => {
    state.rows = [row({ market_code: "GB", ref: "gb1" }), row({ market_code: "NG", ref: "ng1" })];
    const gb = await fetchStandardsForMarket("GB");
    expect(gb.map((r) => r.ref)).toEqual(["gb1"]);
  });

  it("returns [] for an empty market code", async () => {
    expect(await fetchStandardsForMarket("")).toEqual([]);
    expect(await fetchComplianceReviews("")).toEqual([]);
  });
});
