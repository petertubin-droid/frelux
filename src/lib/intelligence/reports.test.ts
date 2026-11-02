import { describe, expect, it } from "vitest";
import {
  buildReport,
  projectCostReport,
  reportSheets,
  materialPriceReport,
} from "./reports";
import { buildWorkbook, safeFilename } from "./xlsx";
import type { IntelligenceSnapshot } from "./types";

const snapshot: IntelligenceSnapshot = {
  generatedAt: "2026-10-31T09:00:00.000Z",
  userId: "u1",
  personas: ["homeowner"],
  primaryPersona: "homeowner",
  isAdmin: false,
  currency: "NGN",
  totals: {
    activeProjects: 1,
    estimatedTotal: 7_000_000,
    approvedSpend: 3_500_000,
    pendingSpend: 500_000,
    remainingBudget: 6_500_000,
    overrunTotal: 0,
    currency: "NGN",
    mixedCurrency: false,
  },
  projects: [
    {
      id: "p1",
      name: "Lekki duplex",
      role: "owner",
      status: "active",
      currency: "NGN",
      progress: 40,
      budget: 10_000_000,
      estimate: 7_000_000,
      approvedSpend: 3_500_000,
      pendingSpend: 500_000,
      remaining: 6_500_000,
      overrun: 0,
      pendingApprovals: 1,
      startDate: null,
      endDate: null,
    },
  ],
  comparisons: [
    {
      projectId: "p1",
      projectName: "Lekki duplex",
      currency: "NGN",
      originalTotal: 7_000_000,
      latestTotal: 7_400_000,
      actualSpend: 3_500_000,
      estimateDrift: 400_000,
      unspentAgainstLatest: 3_900_000,
      overrun: 0,
      revisionCount: 1,
    },
  ],
  revisions: [
    {
      id: "r1",
      projectId: "p1",
      projectName: "Lekki duplex",
      revisionNo: 1,
      label: "Revision 1",
      source: "manual",
      total: 7_400_000,
      currency: "NGN",
      note: null,
      createdAt: "2026-10-01T00:00:00.000Z",
    },
  ],
  approvals: [],
  milestones: [],
  reports: [],
  deliveries: [],
  boq: [
    {
      id: "b1",
      title: "Duplex BOQ",
      quoteRef: "BOQ-1",
      status: "draft",
      revision: 2,
      currency: "NGN",
      total: 5_000_000,
      marketCode: "NG",
      updatedAt: "2026-10-02T00:00:00.000Z",
    },
  ],
  prices: {
    indexName: "FRELUX Material Price Index",
    materialCount: 1,
    moves: [
      {
        materialSlug: "cement-50kg",
        materialName: "Cement 50kg",
        category: "cement",
        unit: "bag",
        city: "lagos",
        marketCode: "NG",
        currentPrice: 9500,
        previousPrice: 9000,
        changePct: 5.56,
        currency: "NGN",
        observedAt: "2026-10-20",
        source: "supplier submission",
        verification: "verified",
        supplierCount: 3,
      },
    ],
    cities: [
      {
        city: "lagos",
        marketCode: "NG",
        currency: "NGN",
        medianPrice: 9500,
        materialCount: 1,
        changePct: 5.56,
        observedAt: "2026-10-20",
        verification: "verified",
      },
    ],
    lastApprovedAt: "2026-10-20",
    pendingSubmissions: 2,
    note: "Prices are observations.",
  },
  suppliers: {
    savedSuppliers: 2,
    openRequests: 1,
    awaitingQuotes: 1,
    quotesReceived: 1,
    activeOrders: 1,
    deliveredOrders: 0,
    recentQuotes: [],
    orders: [],
  },
  preferences: {
    market_code: "NG",
    price_alerts: true,
    budget_alerts: true,
    approval_alerts: true,
    milestone_alerts: true,
    report_alerts: true,
    procurement_alerts: true,
    price_move_threshold: 5,
    digest_frequency: "instant",
  },
  alerts: [],
  admin: null,
  degraded: [],
};

describe("intelligence reports", () => {
  it("carries the original, latest and actual spend into the cost report", () => {
    const table = projectCostReport(snapshot);
    expect(table.rows[0][0]).toBe("Lekki duplex");
    expect(table.rows[0][1]).toBe(7_000_000);
    expect(table.rows[0][2]).toBe(7_400_000);
    expect(table.rows[0][4]).toBe(3_500_000);
  });

  it("keeps revisions on their own sheet rather than folding them into one total", () => {
    const table = projectCostReport(snapshot);
    const revisionSheet = table.extraSheets?.[0];
    expect(revisionSheet?.name).toBe("Revisions");
    expect(revisionSheet?.rows[1][1]).toBe(1);
  });

  it("names the source and verification of every price", () => {
    const table = materialPriceReport(snapshot);
    const headers = table.headers;
    expect(headers).toContain("Source");
    expect(headers).toContain("Verification");
    expect(table.rows[0][headers.indexOf("Verification")]).toBe("verified");
  });

  it("states that prices are observations, not quotations", () => {
    expect(materialPriceReport(snapshot).subtitle).toMatch(/not quotations/i);
  });

  it("counts rows so a report run records what it carried", () => {
    const table = buildReport("boq_summary", snapshot);
    expect(table.rowCount).toBe(1);
    expect(table.rows[0][0]).toBe("Duplex BOQ");
  });

  it("produces a workbook with one sheet per table, plus extras", () => {
    const sheets = reportSheets(projectCostReport(snapshot));
    expect(sheets).toHaveLength(2);
    const bytes = buildWorkbook(sheets);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    // A zip archive always starts with the local file header signature.
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  });

  it("sanitises a filename for the download", () => {
    expect(safeFilename("FRELUX Project cost report / Lagos")).toBe(
      "frelux-project-cost-report-lagos",
    );
  });
});
