/**
 * Labour & Crew Estimator page tests (Future Engine 7)
 *
 * The deterministic math is covered by labour-crew-engine.test.ts.
 * These pin the page wiring and the route-registration
 * regression net (extended to every engine).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LabourEstimator from "./LabourEstimator";

const mockRates = vi.hoisted(() => [
  {
    id: "r-1",
    task_key: "screeding_wall",
    task_label: "Wall screeding (per sqm)",
    unit: "sqm",
    output_per_worker_day: 40,
    description: null,
    source_reference: "FRELUX contractor benchmark 2025",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchLabourRates: vi.fn().mockResolvedValue({ data: mockRates, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "efficiency_loss_percent",
        calculator_type: "labour",
        rule_value: { value: 15 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r2",
        rule_key: "rounding_decimals",
        calculator_type: "labour",
        rule_value: { value: 2 },
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

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LabourEstimator />
    </MemoryRouter>,
  );
}

describe("LabourEstimator page", () => {
  it("lists tasks with their rates in the selector", async () => {
    renderPage();
    expect(
      await screen.findByRole("option", {
        name: /Wall screeding \(per sqm\) \(40 sqm\/wd\)/,
      }),
    ).toBeInTheDocument();
  });

  it("computes the hand-verified schedule end-to-end", async () => {
    renderPage();
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "screeding_wall" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 240"), {
      target: { value: "240" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Estimate Labour/i }));

    // 40 × (1 − 15%) = 34; 240 ÷ 34 = 7.06 worker-days; crew 2 → 4 whole days
    await waitFor(() => {
      expect(screen.getByText(/4 days/)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/7\.06 worker-days at 34 sqm\/worker-day/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/source: FRELUX contractor benchmark 2025/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("disables Estimate until a task and quantity are chosen", async () => {
    renderPage();
    await screen.findByRole("combobox");
    expect(
      screen.getByRole("button", { name: /Estimate Labour/i }),
    ).toBeDisabled();
  });

  it("shows the empty state when no rates are configured", async () => {
    const { fetchLabourRates } = await import("@/lib/estimation/queries");
    vi.mocked(fetchLabourRates).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/No labour rates configured yet/i),
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
      '"/labour-estimator"',
    ]) {
      expect(app, `App.tsx must register the route ${path}`).toContain(path);
    }
    for (const path of [
      '"maintenance-profiles"',
      '"regional-cost-indices"',
      '"carbon-factors"',
      '"cash-flow-templates"',
      '"labour-rates"',
    ]) {
      expect(app, `App.tsx must register the admin route ${path}`).toContain(
        path,
      );
    }
  });
});
