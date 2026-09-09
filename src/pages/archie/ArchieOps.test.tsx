import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null }) }),
      }),
    }),
  },
}));

const budgetStatus = vi.fn();
const spawnFleet = vi.fn();

vi.mock("@/lib/archie/internal-agents", () => ({
  AGENT_ROLES: [
    {
      role: "code_analysis",
      label: "Code Analysis",
      description: "Read-only source code inspection and analysis.",
      required_permissions: ["code:read"],
      uses_external_apis: false,
    },
  ],
}));

vi.mock("@/lib/archie/p5-client", () => ({
  budgetStatus: (...a: unknown[]) => budgetStatus(...a),
  spawnFleet: (...a: unknown[]) => spawnFleet(...a),
  advanceAgent: vi.fn().mockResolvedValue({ ok: true }),
  fetchCryptoMarket: vi.fn().mockResolvedValue({ classification: "ANALYSIS" }),
  portfolioRisk: vi.fn().mockResolvedValue({}),
  recordCryptoAnalysis: vi.fn().mockResolvedValue({ ok: true }),
}));

import ArchieOps from "@/pages/archie/ArchieOps";

beforeEach(() => {
  vi.clearAllMocks();
  budgetStatus.mockResolvedValue({
    month_to_date_spend_cents: 0,
    active_agents: 0,
    budgets: [],
  });
  spawnFleet.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieOps />);
}

describe("ArchieOps", () => {
  it("renders the Operations console with the spawn action", () => {
    renderPage();
    expect(screen.getByText("Operations")).toBeTruthy();
    expect(screen.getByText("Spawn (budget-gated)")).toBeTruthy();
  });

  it("mounts without crashing while budgets are unresolved", () => {
    budgetStatus.mockReturnValue(new Promise(() => ({})));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
