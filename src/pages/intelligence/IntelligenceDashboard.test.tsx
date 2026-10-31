import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const snapshot = {
  generatedAt: "2026-10-31T09:00:00.000Z",
  userId: "u1",
  personas: ["homeowner", "contractor"],
  primaryPersona: "homeowner",
  isAdmin: false,
  currency: "NGN",
  totals: {
    activeProjects: 1,
    estimatedTotal: 7_000_000,
    approvedSpend: 3_500_000,
    pendingSpend: 1_500_000,
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
      status: "in_progress",
      currency: "NGN",
      progress: 40,
      budget: 10_000_000,
      estimate: 7_000_000,
      approvedSpend: 3_500_000,
      pendingSpend: 1_500_000,
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
  revisions: [],
  approvals: [],
  milestones: [],
  reports: [],
  deliveries: [],
  boq: [],
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
    cities: [],
    lastApprovedAt: "2026-10-20",
    pendingSubmissions: 0,
    note: "Prices are observations.",
  },
  suppliers: {
    savedSuppliers: 0,
    openRequests: 0,
    awaitingQuotes: 0,
    quotesReceived: 0,
    activeOrders: 0,
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

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, loading: false }),
}));
vi.mock("@/lib/seo", () => ({ useSeo: () => undefined }));
vi.mock("@/lib/intelligence/queries", () => ({
  loadIntelligence: vi.fn(async () => ({ snapshot, error: null })),
  savePreferences: vi.fn(async () => ({ error: null })),
  saveEstimateRevision: vi.fn(async () => ({ error: null })),
  logReportRun: vi.fn(async () => undefined),
}));

import IntelligenceDashboard from "./IntelligenceDashboard";

describe("construction intelligence dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the owner lens with their budget arithmetic", async () => {
    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Homeowner workspace")).toBeInTheDocument();
    expect(await screen.findByText("Lekki duplex")).toBeInTheDocument();
    expect(await screen.findByText(/Approved spend/i)).toBeInTheDocument();
  });

  it("offers only the sections the lens holds", async () => {
    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>,
    );
    await screen.findByText("Homeowner workspace");
    expect(
      screen.getByRole("link", { name: "Cost intelligence" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Suppliers" }),
    ).not.toBeInTheDocument();
  });

  it("lets both lenses be switched when the person holds both", async () => {
    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>,
    );
    await screen.findByText("Homeowner workspace");
    expect(
      screen.getByRole("button", { name: "Contractor" }),
    ).toBeInTheDocument();
  });
});
