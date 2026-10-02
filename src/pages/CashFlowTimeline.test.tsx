/**
 * Cash-Flow Timeline page tests (Future Engine 6)
 *
 * The deterministic math is covered by cash-flow-engine.test.ts.
 * These pin the page wiring and the route-registration
 * regression net (extended to every engine).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CashFlowTimeline from "./CashFlowTimeline";

const mockTemplates = vi.hoisted(() => [
  {
    id: "t-1",
    name: "Standard 40/35/25",
    description: null,
    milestones: [
      { label: "Mobilization", percent: 40, offset_months: 0 },
      { label: "Mid-project", percent: 35, offset_months: 2 },
      { label: "Completion", percent: 25, offset_months: 4 },
    ],
    is_default: true,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchCashFlowTemplates: vi
    .fn()
    .mockResolvedValue({ data: mockTemplates, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "rounding_decimals",
        calculator_type: "cash_flow",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r2",
        rule_key: "require_percent_sum",
        calculator_type: "cash_flow",
        rule_value: { value: 100 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
    error: null,
  }),
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/lib/safeError", () => ({
  getSafeError: vi.fn((_e: unknown, fallback: string) => fallback),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CashFlowTimeline />
    </MemoryRouter>,
  );
}

describe("CashFlowTimeline page", () => {
  it("defaults to the template marked is_default", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    expect((select as HTMLSelectElement).value).toBe("t-1");
    expect(
      screen.getByRole("option", { name: "Standard 40/35/25" }),
    ).toBeInTheDocument();
  });

  it("generates the hand-verified schedule end-to-end", async () => {
    renderPage();
    await screen.findByRole("combobox");
    fireEvent.change(screen.getByPlaceholderText("e.g. 2500000"), {
      target: { value: "1000000" },
    });
    fireEvent.change(screen.getByLabelText(/Start date/i), {
      target: { value: "2026-01-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate Schedule/i }));

    // 40% = 400,000 due 2026-01-15; 35% = 350,000 due 2026-03-15; 25% = 250,000 due 2026-05-15
    await waitFor(() => {
      expect(
        screen.getAllByText(/₦1,000,000 scheduled/).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.getByText(/Mobilization · 40% · 2026-01-15/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Completion · 25% · 2026-05-15/),
    ).toBeInTheDocument();
    expect(screen.getByText(/cumulative ₦750,000/)).toBeInTheDocument();
  });

  it("disables Generate until a total is entered", async () => {
    renderPage();
    await screen.findByRole("combobox");
    expect(
      screen.getByRole("button", { name: /Generate Schedule/i }),
    ).toBeDisabled();
  });

  it("shows the empty state when no templates are configured", async () => {
    const { fetchCashFlowTemplates } = await import("@/lib/estimation/queries");
    vi.mocked(fetchCashFlowTemplates).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/No cash-flow templates configured yet/i),
      ).toBeInTheDocument();
    });
  });
});

describe("engine route registration (regression)", () => {
  it("registers public routes for every engine page in App.tsx", async () => {
    const fs = await import("fs");
    const app = fs.readFileSync("src/App.tsx", "utf-8");
    for (const path of [
      '"/maintenance-planner"',
      '"/boq-generator"',
      '"/regional-cost-index"',
      '"/carbon-footprint"',
      '"/cash-flow-timeline"',
    ]) {
      expect(app, `App.tsx must register the route ${path}`).toContain(path);
    }
    for (const path of [
      '"maintenance-profiles"',
      '"regional-cost-indices"',
      '"carbon-factors"',
      '"cash-flow-templates"',
    ]) {
      expect(app, `App.tsx must register the admin route ${path}`).toContain(
        path,
      );
    }
  });
});
