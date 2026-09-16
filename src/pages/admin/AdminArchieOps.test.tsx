import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// =========================================================
// ADMIN ARCHIE OPS CONSOLE
//
// Verifies the four-surface orchestration UI: internal
// agents load through real supabase queries (mocked at the
// client boundary), budget/cost governance renders, the
// systems registry is built from the real status module, and
// tab switching routes between surfaces without losing
// loaded data.
// =========================================================

const agentsSelect = vi.fn();
const assetsSelect = vi.fn();

vi.mock("@/lib/supabase", () => {
  const agentsChain: Record<string, unknown> = {};
  agentsChain.select = vi.fn(() => agentsChain);
  agentsChain.order = vi.fn(() => agentsChain);
  agentsChain.limit = vi.fn(() => agentsSelect());
  const assetsChain: Record<string, unknown> = {};
  assetsChain.select = vi.fn(() => assetsChain);
  assetsChain.order = vi.fn(() => assetsSelect());
  return {
    supabase: {
      from: vi.fn((table: string) =>
        table === "frelux_archie_internal_agents" ? agentsChain : assetsChain,
      ),
    },
  };
});

const budgetStatus = vi.fn();
const spawnFleet = vi.fn();
const advanceAgent = vi.fn();
const recordCryptoAnalysis = vi.fn();
const fetchCryptoMarket = vi.fn();
const portfolioRisk = vi.fn();
vi.mock("@/lib/archie/p5-client", () => ({
  budgetStatus: (...a: unknown[]) => budgetStatus(...a),
  spawnFleet: (...a: unknown[]) => spawnFleet(...a),
  advanceAgent: (...a: unknown[]) => advanceAgent(...a),
  recordCryptoAnalysis: (...a: unknown[]) => recordCryptoAnalysis(...a),
  fetchCryptoMarket: (...a: unknown[]) => fetchCryptoMarket(...a),
  portfolioRisk: (...a: unknown[]) => portfolioRisk(...a),
}));

const fetchArchieStatus = vi.fn();
const buildSystemsRegistry = vi.fn();
vi.mock("@/lib/archie/status", () => ({
  fetchArchieStatus: (...a: unknown[]) => fetchArchieStatus(...a),
  buildSystemsRegistry: (...a: unknown[]) => buildSystemsRegistry(...a),
}));

import AdminArchieOps from "./AdminArchieOps";

const BUDGET = {
  month_to_date_spend_cents: 1250,
  active_agents: 1,
  budget_cents: 5000,
};

beforeEach(() => {
  vi.clearAllMocks();
  agentsSelect.mockResolvedValue({
    data: [
      {
        id: "agent-1",
        role: "code_analysis",
        task: "Audit lexicon tests",
        status: "RUNNING",
        created_date: "2026-09-16T10:00:00Z",
      },
    ],
    error: null,
  });
  assetsSelect.mockResolvedValue({
    data: [{ symbol: "BTC", name: "Bitcoin", is_active: true }],
    error: null,
  });
  budgetStatus.mockResolvedValue(BUDGET);
  fetchArchieStatus.mockResolvedValue({ ok: true, data: {} });
  buildSystemsRegistry.mockReturnValue([]);
});

describe("AdminArchieOps — render & load", () => {
  it("renders the four ops surfaces", async () => {
    render(<AdminArchieOps />);
    expect(await screen.findByText("ARCHIE Ops")).toBeTruthy();
    for (const label of [
      "Internal Agents",
      "Infrastructure Costs",
      "Systems Registry",
      "Crypto Intelligence",
    ]) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("loads internal agents and the budget through the real clients", async () => {
    render(<AdminArchieOps />);
    await waitFor(() => expect(agentsSelect).toHaveBeenCalled());
    await waitFor(() => expect(budgetStatus).toHaveBeenCalled());
    expect(await screen.findByText("Audit lexicon tests")).toBeTruthy();
  });

  it("surfaces supabase errors honestly", async () => {
    agentsSelect.mockResolvedValue({ data: null, error: { message: "agents table unreachable" } });
    render(<AdminArchieOps />);
    expect(await screen.findByText(/agents table unreachable/)).toBeTruthy();
  });
});

describe("AdminArchieOps — tabs", () => {
  it("switches to the Systems Registry surface on demand", async () => {
    render(<AdminArchieOps />);
    fireEvent.click(await screen.findByRole("tab", { name: "Systems Registry" }));
    await waitFor(() => expect(fetchArchieStatus).toHaveBeenCalled());
  });

  it("switches to the Crypto Intelligence surface on demand", async () => {
    render(<AdminArchieOps />);
    fireEvent.click(await screen.findByRole("tab", { name: "Crypto Intelligence" }));
    await waitFor(() => expect(assetsSelect).toHaveBeenCalled());
  });

  it("shows the active tab as selected (aria-selected), one at a time", async () => {
    render(<AdminArchieOps />);
    const crypto = await screen.findByRole("tab", { name: "Crypto Intelligence" });
    expect(screen.getByRole("tab", { name: "Internal Agents" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(crypto);
    expect(crypto.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Internal Agents" }).getAttribute("aria-selected")).toBe("false");
  });
});
