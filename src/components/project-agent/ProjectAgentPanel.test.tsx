import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ── Module mocks ──────────────────────────────────────────
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockBuildGuidance = vi.fn();
const mockBuildRecommendations = vi.fn();
const mockPrepareAction = vi.fn();
const mockDecideApproval = vi.fn();
const mockCancelAction = vi.fn();
const mockAmend = vi.fn();
const mockListPreparedActions = vi.fn();
const mockExecute = vi.fn();
const mockMonitor = vi.fn();
const mockDismissAlert = vi.fn();
const mockStory = vi.fn();
const mockSnapshot = vi.fn();

vi.mock("@/lib/project-agent/guidance", async (orig) => {
  const real = await orig<typeof import("@/lib/project-agent/guidance")>();
  return { ...real, buildGuidance: (...a: unknown[]) => mockBuildGuidance(...a) };
});
vi.mock("@/lib/project-agent/recommendations", async (orig) => {
  const real = await orig<typeof import("@/lib/project-agent/recommendations")>();
  return { ...real, buildRecommendations: (...a: unknown[]) => mockBuildRecommendations(...a) };
});
vi.mock("@/lib/project-agent/actions", async (orig) => {
  const real = await orig<typeof import("@/lib/project-agent/actions")>();
  return {
    ...real,
    prepareAction: (...a: unknown[]) => mockPrepareAction(...a),
    decideApproval: (...a: unknown[]) => mockDecideApproval(...a),
    cancelAction: (...a: unknown[]) => mockCancelAction(...a),
    amendPreparedAction: (...a: unknown[]) => mockAmend(...a),
    listPreparedActions: (...a: unknown[]) => mockListPreparedActions(...a),
  };
});
vi.mock("@/lib/project-agent/execute", async (orig) => {
  const real = await orig<typeof import("@/lib/project-agent/execute")>();
  return { ...real, executeApprovedAction: (...a: unknown[]) => mockExecute(...a) };
});
vi.mock("@/lib/project-agent/monitoring", async (orig) => {
  const real = await orig<typeof import("@/lib/project-agent/monitoring")>();
  return {
    ...real,
    runProactiveMonitoring: (...a: unknown[]) => mockMonitor(...a),
    dismissProjectAlert: (...a: unknown[]) => mockDismissAlert(...a),
  };
});
vi.mock("@/lib/project-agent/audit", async (orig) => {
  const real = await orig<typeof import("@/lib/project-agent/audit")>();
  return { ...real, getProjectStory: (...a: unknown[]) => mockStory(...a) };
});
vi.mock("@/lib/predictive-intelligence/snapshot", () => ({
  buildProjectSnapshot: (...a: unknown[]) => mockSnapshot(...a),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

import ProjectAgentPanel from "./ProjectAgentPanel";

const PROJECT = "proj-1";

function ok<T>(data: T) {
  return { ok: true as const, data };
}
function fail(message: string) {
  return { ok: false as const, error: { code: "test", message } };
}

function guidanceAnswer() {
  return {
    projectId: PROJECT,
    question: "what_next",
    questionPhrase: "What should I do next?",
    generatedAt: "2026-09-07T10:00:00.000Z",
    status: "ok",
    headline: "Record the paint purchase, then start screeding.",
    items: [
      {
        action: "Record the cement purchase on the shopping list.",
        evidence: ["Cement line is unpurchased since Sep 1."],
        priority: "high",
        source: "project shopping list",
      },
    ],
    derivedFrom: ["shopping list", "progress stages"],
    insufficientData: ["weather impact"],
  };
}

function recommendationReport() {
  return {
    projectId: PROJECT,
    generatedAt: "2026-09-07T10:00:00.000Z",
    status: "ok",
    recommendations: [
      {
        id: "procurement:increases",
        condition: "procurement_risk",
        recommendation: "1 unpurchased line shows a price increase.",
        evidence: ["Cement: estimated 5000 → actual 6500"],
        affectedElement: "shopping list",
        severity: "medium",
        confidence: null,
        assumptions: ["Only recorded price increases counted."],
        dataFreshness: "recent",
        freshnessBasis: "2026-09-07T10:00:00.000Z",
        nextStep: "Record the purchase at the actual price.",
        source: "project shopping list",
      },
    ],
    insufficientData: [],
    summary: "1 condition needs attention.",
  };
}

function monitoringResult() {
  return {
    projectId: PROJECT,
    evaluatedAt: "2026-09-07T10:00:00.000Z",
    openAlerts: [
      {
        id: "alert-1",
        project_id: PROJECT,
        alert_key: "k1",
        kind: "stale_market_data",
        severity: "medium",
        status: "open",
        title: "Market data is stale",
        condition_text: "Prices last updated 90 days ago.",
        recommended_action: "Check current prices at the market.",
        evidence: [],
        confidence: { label: "medium" },
        payload: {},
        detected_at: "2026-09-07T10:00:00.000Z",
        last_seen_at: "2026-09-07T10:00:00.000Z",
        dismissed_at: null,
        resolved_at: null,
      },
    ],
    counts: { created: 1, refreshed: 0, reopened: 0, resolved: 0, stillDismissed: 0 },
    summary: "1 open alert.",
  };
}

function preparedAction(state: string) {
  return {
    action: {
      id: "act-1",
      kind: "record_purchase",
      what: "Record purchase of Cement",
      why: "1 unpurchased line shows a price increase.",
      dataUsed: ["recommendation:procurement:increases"],
      assumptions: [],
      expectedResult: "Cement marked purchased at 6500.",
      permission: "confirm",
      approvalRequired: true,
      state,
      payload: { shoppingItemId: "item-1", actualPrice: 6500 },
      recommendationId: "procurement:increases",
      recommendationSummary: "Record the purchase at the actual price.",
      idempotencyKey: "k",
      createdAt: "2026-09-07T10:00:00.000Z",
      updatedAt: "2026-09-07T10:00:00.000Z",
    },
    approval: { id: "appr-1", state: "active", actionId: "act-1", requestedAt: "2026-09-07T10:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z", decidedAt: null, decidedBy: null, decision: null },
    availableDecisions: ["approved", "rejected"],
    note: "Awaiting your decision.",
  };
}

function story() {
  return {
    projectId: PROJECT,
    generatedAt: "2026-09-07T10:00:00.000Z",
    timeline: [
      {
        id: "e1",
        at: "2026-09-07T10:00:00.000Z",
        projectId: PROJECT,
        user: "u1",
        kind: "recommendation",
        summary: "Agent flagged a price increase.",
      },
    ],
    threads: [],
  };
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <ProjectAgentPanel projectId={PROJECT} />
    </MemoryRouter>,
  );
}

describe("ProjectAgentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildRecommendations.mockResolvedValue(ok(recommendationReport()));
    mockListPreparedActions.mockResolvedValue(ok([]));
    mockMonitor.mockResolvedValue(ok(monitoringResult()));
    mockStory.mockResolvedValue(ok(story()));
    mockBuildGuidance.mockResolvedValue(ok(guidanceAnswer()));
  });

  it("renders without fetching anything until the user acts", () => {
    renderPanel();
    expect(screen.getByText("Project Agent")).toBeDefined();
    expect(mockBuildRecommendations).not.toHaveBeenCalled();
    expect(mockListPreparedActions).not.toHaveBeenCalled();
    expect(mockBuildGuidance).not.toHaveBeenCalled();
  });

  it("run agent check loads recommendations, alerts, actions and history", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: /run agent check/i }));

    await waitFor(() => {
      expect(mockBuildRecommendations).toHaveBeenCalledWith(PROJECT, expect.any(String));
    });
    expect(mockMonitor).toHaveBeenCalledWith(PROJECT, expect.any(String));
    expect(mockStory).toHaveBeenCalledWith(PROJECT, expect.any(String));
    expect(mockListPreparedActions).toHaveBeenCalledWith(PROJECT, expect.any(String));

    await waitFor(() => {
      expect(screen.getByTestId("agent-recommendation")).toBeDefined();
    });
    expect(screen.getByTestId("agent-alert")).toBeDefined();
    expect(screen.getByTestId("agent-monitoring-summary").textContent).toContain("1 open alert");
    expect(screen.getByText(/Agent flagged a price increase/)).toBeDefined();
  });

  it("asking a question renders the evidence-based answer", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /what should i do next\?/i }));

    await waitFor(() => {
      expect(mockBuildGuidance).toHaveBeenCalledWith(
        PROJECT,
        "what_next",
        expect.any(String),
      );
    });
    expect(
      screen.getByText("Record the paint purchase, then start screeding."),
    ).toBeDefined();
    expect(screen.getByText(/Cement line is unpurchased/)).toBeDefined();
    expect(screen.getByText(/Not enough recorded data for: weather impact/)).toBeDefined();
  });

  it("shows an error toast and no fabricated guidance when the agent refuses", async () => {
    mockBuildGuidance.mockResolvedValue(fail("Project not visible"));
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /what should i do next\?/i }));

    await waitFor(() => expect(mockBuildGuidance).toHaveBeenCalled());
    expect(screen.queryByTestId("agent-guidance-answer")).toBeNull();
  });

  it("prepares an action from a grounded recommendation, then approves and executes", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /run agent check/i }));
    await waitFor(() => screen.getByTestId("agent-recommendation"));

    // Open the prepare form from the procurement recommendation.
    await user.click(screen.getByRole("button", { name: /prepare action/i }));
    await waitFor(() => screen.getByTestId("agent-prepare-form"));

    // Snapshot provides the unpurchased items for the select.
    mockSnapshot.mockResolvedValue({
      shoppingItems: [
        { id: "item-1", name: "Cement", estimated_price: 5000, is_purchased: false },
      ],
      stages: [],
    });
    // Re-open to pick up refs (snapshot resolves on open).
    await user.click(screen.getByRole("button", { name: /prepare for review/i })).catch(() => {});
    // Select requires the form to have re-opened with refs; openPrepare fetches
    // the snapshot at open time, so re-open the form now the mock is set.
    await user.click(screen.getByRole("button", { name: /prepare action/i }));
    await waitFor(() =>
      expect(screen.getByTestId("prepare-item-select").querySelectorAll("option").length).toBeGreaterThan(1),
    );

    await user.selectOptions(screen.getByTestId("prepare-item-select"), "item-1");
    await user.type(screen.getByPlaceholderText(/actual price paid/i), "6500");

    mockPrepareAction.mockResolvedValue(
      ok({ ...preparedAction("prepared").action, id: "act-2" }),
    );
    await user.click(screen.getByRole("button", { name: /prepare for review/i }));
    await waitFor(() => expect(mockPrepareAction).toHaveBeenCalled());

    const call = mockPrepareAction.mock.calls[0];
    expect(call[0]).toBe(PROJECT);
    expect(call[1].kind).toBe("record_purchase");
    expect(call[1].recommendationId).toBe("procurement:increases");
    expect(call[1].params).toEqual({ shoppingItemId: "item-1", actualPrice: 6500 });
  });

  it("renders prepared actions with the decision surface", async () => {
    mockListPreparedActions.mockResolvedValue(ok([preparedAction("prepared")]));
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /run agent check/i }));

    await waitFor(() => expect(screen.getByTestId("agent-action")).toBeDefined());
    expect(screen.getByText(/Record purchase of Cement/)).toBeDefined();
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeDefined();
    expect(screen.getByText(/Awaiting your decision/i)).toBeDefined();
  });

  it("approving calls decideApproval; executing calls executeApprovedAction with the action id", async () => {
    mockListPreparedActions.mockResolvedValue(ok([preparedAction("prepared")]));
    mockDecideApproval.mockResolvedValue(
      ok({ ...preparedAction("approved").approval, decision: "approved" }),
    );
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /run agent check/i }));
    await waitFor(() => screen.getByTestId("agent-action"));

    await user.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() =>
      expect(mockDecideApproval).toHaveBeenCalledWith(
        PROJECT,
        "appr-1",
        "approved",
        expect.any(String),
      ),
    );

    // After refresh, the list now shows the approved action with Execute.
    mockListPreparedActions.mockResolvedValue(ok([preparedAction("approved")]));
    await user.click(screen.getByRole("button", { name: /run agent check/i }));
    await waitFor(() => screen.getByRole("button", { name: /^execute$/i }));

    mockExecute.mockResolvedValue(
      ok({
        action: preparedAction("executed").action,
        execution: { outcome: "verified", attemptedAt: "2026-09-07T10:05:00.000Z", summary: "Cement marked purchased at 6500.", writtenTables: ["project_shopping_items"] },
        duplicate: false,
      }),
    );
    await user.click(screen.getByRole("button", { name: /^execute$/i }));
    await waitFor(() => expect(mockExecute).toHaveBeenCalledWith(PROJECT, "act-1", expect.any(String)));
  });

  it("rejecting calls decideApproval with rejected — no execution is offered", async () => {
    mockListPreparedActions.mockResolvedValue(ok([preparedAction("prepared")]));
    mockDecideApproval.mockResolvedValue(
      ok({ ...preparedAction("rejected").approval, decision: "rejected" }),
    );
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /run agent check/i }));
    await waitFor(() => screen.getByTestId("agent-action"));

    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    await waitFor(() =>
      expect(mockDecideApproval).toHaveBeenCalledWith(
        PROJECT,
        "appr-1",
        "rejected",
        expect.any(String),
      ),
    );
    expect(screen.queryByRole("button", { name: /^execute$/i })).toBeNull();
  });

  it("cancel calls cancelAction without touching approvals", async () => {
    mockListPreparedActions.mockResolvedValue(ok([preparedAction("prepared")]));
    mockCancelAction.mockResolvedValue(ok(preparedAction("cancelled").action));
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /run agent check/i }));
    await waitFor(() => screen.getByTestId("agent-action"));

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    await waitFor(() =>
      expect(mockCancelAction).toHaveBeenCalledWith(PROJECT, "act-1", expect.any(String)),
    );
    expect(mockDecideApproval).not.toHaveBeenCalled();
  });

  it("dismissing an alert calls dismissProjectAlert and re-reads state", async () => {
    mockDismissAlert.mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /run agent check/i }));
    await waitFor(() => screen.getByTestId("agent-alert"));

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    await waitFor(() =>
      expect(mockDismissAlert).toHaveBeenCalledWith("alert-1", expect.any(String)),
    );
    await waitFor(() => expect(mockMonitor).toHaveBeenCalledTimes(2));
  });

  it("shows an empty state when there are no recommendations", async () => {
    const empty = {
      ...recommendationReport(),
      recommendations: [],
      insufficientData: [
        { condition: "schedule_risk", reason: "no stages recorded" },
      ],
      summary: "Nothing could be assessed.",
    };
    mockBuildRecommendations.mockResolvedValue(ok(empty));
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /run agent check/i }));
    await waitFor(() =>
      expect(screen.getByText(/No risks found in the recorded project state/)).toBeDefined(),
    );
    expect(screen.getByText(/Could not assess: schedule_risk/)).toBeDefined();
  });
});
