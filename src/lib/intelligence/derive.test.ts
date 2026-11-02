import { describe, expect, it } from "vitest";
import {
  approvalsForRole,
  buildProjectCard,
  compareCosts,
  deriveAlerts,
  isMilestoneDelayed,
  milestoneProgress,
  percentChange,
  primaryPersona,
  projectEstimate,
  resolvePersonas,
  sectionsFor,
  summarisePortfolio,
  upcomingMilestones,
} from "./derive";
import type {
  ApprovalItem,
  MilestoneItem,
  ProjectCard,
  RevisionRow,
} from "./types";

const baseProject = {
  id: "p1",
  name: "Lekki duplex",
  role: "owner" as const,
  status: "active",
  currency: "NGN",
  progress: 40,
  budget: 10_000_000,
  materials: 4_000_000,
  labour: 2_000_000,
  transport: 500_000,
  misc: 300_000,
  markup: 200_000,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
};

const spends = [
  { project_id: "p1", amount: 3_000_000, status: "approved" },
  { project_id: "p1", amount: 500_000, status: "paid" },
  { project_id: "p1", amount: 1_500_000, status: "pending" },
  { project_id: "p2", amount: 900_000, status: "approved" },
];

describe("project cost arithmetic", () => {
  it("sums the five cost lines into the estimate", () => {
    expect(projectEstimate(baseProject)).toBe(7_000_000);
  });

  it("counts only approved and paid money as spent", () => {
    const card = buildProjectCard(baseProject, spends);
    expect(card.approvedSpend).toBe(3_500_000);
    expect(card.pendingSpend).toBe(1_500_000);
  });

  it("measures remaining against the agreed budget, not the estimate", () => {
    const card = buildProjectCard(baseProject, spends);
    expect(card.remaining).toBe(6_500_000);
    expect(card.overrun).toBe(0);
  });

  it("falls back to the estimate when no budget is set", () => {
    const card = buildProjectCard({ ...baseProject, budget: null }, spends);
    expect(card.remaining).toBe(3_500_000);
  });

  it("reports an overrun as a negative remaining, never a floor at zero", () => {
    const card = buildProjectCard({ ...baseProject, budget: 3_000_000 }, [
      { project_id: "p1", amount: 4_200_000, status: "approved" },
    ]);
    expect(card.remaining).toBe(-1_200_000);
    expect(card.overrun).toBe(1_200_000);
  });

  it("never counts another project's spending", () => {
    const card = buildProjectCard(baseProject, spends);
    expect(card.approvedSpend).toBe(3_500_000);
  });
});

describe("portfolio totals", () => {
  const cards: ProjectCard[] = [
    buildProjectCard(baseProject, spends),
    buildProjectCard(
      {
        ...baseProject,
        id: "p2",
        name: "Abeokuta bungalow",
        budget: 5_000_000,
        progress: 100,
        status: "completed",
      },
      spends,
    ),
  ];

  it("leaves completed projects out of the active figures", () => {
    const totals = summarisePortfolio(cards);
    expect(totals.activeProjects).toBe(1);
    expect(totals.estimatedTotal).toBe(7_000_000);
    expect(totals.approvedSpend).toBe(3_500_000);
  });

  it("flags a mixed-currency portfolio instead of adding naira to dollars", () => {
    const usd = buildProjectCard(
      { ...baseProject, id: "p3", currency: "USD" },
      [],
    );
    const totals = summarisePortfolio([...cards, usd]);
    expect(totals.mixedCurrency).toBe(true);
  });

  it("keeps one currency's figures when currencies are mixed", () => {
    const usd = buildProjectCard(
      { ...baseProject, id: "p3", currency: "USD", budget: 1 },
      [],
    );
    const totals = summarisePortfolio([...cards, usd]);
    expect(totals.currency).toBe("NGN");
    expect(totals.approvedSpend).toBe(3_500_000);
  });
});

describe("estimate revisions", () => {
  const revisions: RevisionRow[] = [
    {
      id: "r2",
      projectId: "p1",
      projectName: "Lekki duplex",
      revisionNo: 2,
      label: "Revision 2",
      source: "manual",
      total: 8_200_000,
      currency: "NGN",
      note: "Cement moved",
      createdAt: "2026-03-01",
    },
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
      createdAt: "2026-02-01",
    },
  ];

  it("compares the first revision against the latest, not against the record", () => {
    const card = buildProjectCard(baseProject, spends);
    const comparison = compareCosts(card, revisions);
    expect(comparison.originalTotal).toBe(7_400_000);
    expect(comparison.latestTotal).toBe(8_200_000);
    expect(comparison.estimateDrift).toBe(800_000);
    expect(comparison.revisionCount).toBe(2);
  });

  it("uses the project record when no revision exists yet", () => {
    const card = buildProjectCard(baseProject, spends);
    const comparison = compareCosts(card, []);
    expect(comparison.originalTotal).toBe(7_000_000);
    expect(comparison.latestTotal).toBe(7_000_000);
    expect(comparison.revisionCount).toBe(0);
  });

  it("reports overrun against the latest estimate, not the original", () => {
    const card = buildProjectCard({ ...baseProject, budget: 8_200_000 }, [
      { project_id: "p1", amount: 8_500_000, status: "approved" },
    ]);
    const comparison = compareCosts(card, revisions);
    expect(comparison.overrun).toBe(300_000);
  });
});

describe("price movement", () => {
  it("computes a percentage change from the previous observation", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(90, 100)).toBe(-10);
  });

  it("returns zero when there is no prior observation, instead of inventing one", () => {
    expect(percentChange(120, null)).toBe(0);
    expect(percentChange(120, 0)).toBe(0);
  });
});

describe("milestones", () => {
  const milestone: MilestoneItem = {
    id: "m1",
    projectId: "p1",
    projectName: "Lekki duplex",
    stageName: "Roof",
    status: "pending",
    progressPct: 0,
    decisionNote: null,
    updatedAt: null,
    delayed: true,
  };

  it("marks an unfinished milestone late only after the project end date", () => {
    expect(
      isMilestoneDelayed("pending", "2026-01-01", new Date("2026-06-01")),
    ).toBe(true);
    expect(
      isMilestoneDelayed("pending", "2026-12-01", new Date("2026-06-01")),
    ).toBe(false);
  });

  it("never calls an approved milestone late", () => {
    expect(
      isMilestoneDelayed("approved", "2026-01-01", new Date("2026-06-01")),
    ).toBe(false);
  });

  it("does not guess when a project has no end date", () => {
    expect(isMilestoneDelayed("pending", null, new Date("2026-06-01"))).toBe(
      false,
    );
  });

  it("measures milestone progress from approved items only", () => {
    expect(
      milestoneProgress([
        { ...milestone, status: "approved" },
        { ...milestone, status: "pending" },
      ]),
    ).toBe(50);
  });

  it("puts delayed milestones first in the upcoming list", () => {
    const listed = upcomingMilestones([
      { ...milestone, id: "b", stageName: "Plastering", delayed: false },
      { ...milestone, id: "a", stageName: "Roof", delayed: true },
    ]);
    expect(listed[0].stageName).toBe("Roof");
  });
});

describe("approval visibility", () => {
  const items: ApprovalItem[] = [
    {
      id: "e1",
      kind: "expense",
      projectId: "p1",
      projectName: "Lekki duplex",
      title: "Cement",
      amount: 500_000,
      currency: "NGN",
      submittedBy: "u2",
      submittedAt: "2026-03-01",
      requiredRole: "approve_expense",
    },
    {
      id: "s1",
      kind: "milestone",
      projectId: "p1",
      projectName: "Lekki duplex",
      title: "Roof",
      amount: null,
      currency: "NGN",
      submittedBy: "u2",
      submittedAt: "2026-03-01",
      requiredRole: "decide_milestone",
    },
  ];

  it("shows a site manager nothing to approve", () => {
    expect(approvalsForRole(items, "site_manager", false)).toHaveLength(0);
  });

  it("shows an inspector milestones but never money", () => {
    const visible = approvalsForRole(items, "inspector", false);
    expect(visible).toHaveLength(1);
    expect(visible[0].kind).toBe("milestone");
  });

  it("shows an owner both, and an admin everything", () => {
    expect(approvalsForRole(items, "owner", false)).toHaveLength(2);
    expect(approvalsForRole(items, null, true)).toHaveLength(2);
  });
});

describe("alerts", () => {
  const card = buildProjectCard({ ...baseProject, budget: 3_000_000 }, [
    { project_id: "p1", amount: 4_000_000, status: "approved" },
  ]);

  it("raises a budget alert only when money is actually over", () => {
    const alerts = deriveAlerts({
      cards: [card],
      comparisons: [],
      milestones: [],
      approvals: [],
      priceMoves: [],
      reportsCount: 0,
      procurementPending: 0,
      threshold: 5,
      canApprove: false,
    });
    expect(alerts.filter((a) => a.kind === "budget")).toHaveLength(1);
  });

  it("respects the price threshold", () => {
    const quiet = deriveAlerts({
      cards: [],
      comparisons: [],
      milestones: [],
      approvals: [],
      priceMoves: [
        {
          materialName: "Cement",
          changePct: 4,
          city: "Lagos",
          materialSlug: "cement",
        },
      ],
      reportsCount: 0,
      procurementPending: 0,
      threshold: 5,
      canApprove: false,
    });
    expect(quiet).toHaveLength(0);
  });

  it("raises the price alert once the threshold is crossed", () => {
    const loud = deriveAlerts({
      cards: [],
      comparisons: [],
      milestones: [],
      approvals: [],
      priceMoves: [
        {
          materialName: "Cement",
          changePct: 12,
          city: "Lagos",
          materialSlug: "cement",
        },
      ],
      reportsCount: 0,
      procurementPending: 0,
      threshold: 5,
      canApprove: false,
    });
    expect(loud[0].kind).toBe("price");
  });

  it("does not tell someone about approvals they cannot decide", () => {
    const alerts = deriveAlerts({
      cards: [],
      comparisons: [],
      milestones: [],
      approvals: [],
      priceMoves: [],
      reportsCount: 0,
      procurementPending: 0,
      threshold: 5,
      canApprove: false,
    });
    expect(alerts.filter((a) => a.kind === "approval")).toHaveLength(0);
  });
});

describe("personas", () => {
  it("gives an owner the homeowner lens", () => {
    expect(
      resolvePersonas({
        isAdmin: false,
        hasSupplierProfile: false,
        projectRoles: ["owner"],
        hasEstimatesOrBoq: false,
      }),
    ).toEqual(["homeowner"]);
  });

  it("lets a supplier who also owns a build switch lenses", () => {
    const lenses = resolvePersonas({
      isAdmin: false,
      hasSupplierProfile: true,
      projectRoles: ["owner"],
      hasEstimatesOrBoq: true,
    });
    expect(lenses).toContain("supplier");
    expect(lenses).toContain("homeowner");
  });

  it("falls back to homeowner for someone with nothing yet", () => {
    expect(
      resolvePersonas({
        isAdmin: false,
        hasSupplierProfile: false,
        projectRoles: [],
        hasEstimatesOrBoq: false,
      }),
    ).toEqual(["homeowner"]);
  });

  it("puts the administrator lens first", () => {
    expect(primaryPersona(["supplier", "enterprise_admin"])).toBe(
      "enterprise_admin",
    );
  });

  it("keeps the site manager lens narrow", () => {
    const sections = sectionsFor("site_manager");
    expect(sections).toContain("progress");
    expect(sections).not.toContain("boq");
    expect(sections).not.toContain("suppliers");
  });
});
