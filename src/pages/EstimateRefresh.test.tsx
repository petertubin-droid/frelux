/**
 * Estimate Refresh page tests (Future Engine 6, part 2)
 *
 * The deterministic math is covered by estimate-refresh-engine.test.ts.
 * These pin the page wiring (auth gate, price lookup, rendering)
 * and the route-registration regression net.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EstimateRefresh from "./EstimateRefresh";

const mockEstimates = vi.hoisted(() => [
  {
    id: "est-1",
    estimate_ref: "EST-001",
    user_id: "u-1",
    client_hash: null,
    calculator_type: "paint",
    project_description: null,
    inputs: {},
    calculation_method: "standard",
    calc_version_id: null,
    calculated_quantities: {},
    total_material_cost: 50000,
    currency: "NGN",
    labour_status: "not_included",
    warnings: [],
    recommendations: [],
    notes: null,
    status: "completed",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]);

const mockItems = vi.hoisted(() => [
  {
    id: "i-1",
    estimate_id: "est-1",
    item_name: "Emulsion paint",
    item_type: "product",
    product_id: "prod-1",
    quality_level_id: null,
    material_id: null,
    quantity_required: 10,
    practical_purchase_qty: 10,
    unit: "litre",
    pack_size: null,
    unit_price: 5000,
    total_price: 50000,
    price_snapshot: {
      price_type: "product",
      ref_id: "prod-1",
      ref_name: "Emulsion",
      unit_price: 5000,
      currency: "NGN",
      pack_size: null,
      pack_unit: null,
      effective_date: "2026-01-01",
      price_id: "p-1",
    },
    calculation_source: "calculated",
    adjustment_status: "none",
    notes: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]);

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn().mockReturnValue({ user: { id: "u-1" } }),
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchEstimates: vi
    .fn()
    .mockResolvedValue({ data: mockEstimates, error: null }),
  fetchEstimateItems: vi
    .fn()
    .mockResolvedValue({ data: mockItems, error: null }),
  fetchActivePrice: vi.fn().mockResolvedValue({
    data: {
      id: "p-now",
      price_type: "product",
      ref_id: "prod-1",
      price: 6000,
      currency: "NGN",
      pack_size_id: null,
      effective_date: "2026-10-01",
      notes: null,
      is_active: true,
      created_at: "2026-10-01",
      updated_at: "2026-10-01",
    },
    error: null,
  }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "rounding_decimals",
        calculator_type: "estimate_refresh",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
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
      <EstimateRefresh />
    </MemoryRouter>,
  );
}

describe("EstimateRefresh page", () => {
  it("lists the signed-in user's completed estimates", async () => {
    renderPage();
    expect(
      await screen.findByRole("option", { name: /EST-001/ }),
    ).toBeInTheDocument();
  });

  it("refreshes end-to-end with the hand-verified delta", async () => {
    renderPage();
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "est-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Refresh to today/i }));

    // 10 × 5,000 = 50,000 quoted; today 6,000 → 60,000 (+10,000, +20%)
    await waitFor(() => {
      expect(screen.getAllByText("₦60,000.00").length).toBeGreaterThanOrEqual(
        1,
      );
    });
    expect(screen.getAllByText("₦50,000.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\+₦10,000\.00/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText(/20% since quoted/)).toBeInTheDocument();
    expect(screen.getByText(/Price changed/)).toBeInTheDocument();
  });

  it("looks up today's price per distinct (price_type, ref_id)", async () => {
    renderPage();
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "est-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Refresh to today/i }));
    await waitFor(() => {
      expect(screen.getAllByText("₦60,000.00").length).toBeGreaterThanOrEqual(
        1,
      );
    });
    const { fetchActivePrice } = await import("@/lib/estimation/queries");
    expect(fetchActivePrice).toHaveBeenCalledWith("product", "prod-1");
  });

  it("disables Refresh until an estimate is selected", async () => {
    renderPage();
    await screen.findByRole("combobox");
    expect(
      screen.getByRole("button", { name: /Refresh to today/i }),
    ).toBeDisabled();
  });

  it("shows the sign-in gate when there is no user", async () => {
    const { useAuth } = await import("@/lib/auth");
    vi.mocked(useAuth).mockReturnValueOnce({ user: null });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to refresh your saved estimates/i),
      ).toBeInTheDocument();
    });
  });

  it("shows the empty state when the user has no completed estimates", async () => {
    const { fetchEstimates } = await import("@/lib/estimation/queries");
    vi.mocked(fetchEstimates).mockResolvedValueOnce({ data: [], error: null });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/You have no completed estimates yet/i),
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
      '"/margin-calculator"',
      '"/defect-diagnosis"',
      '"/estimate-refresh"',
    ]) {
      expect(app, `App.tsx must register the route ${path}`).toContain(path);
    }
    for (const path of [
      '"maintenance-profiles"',
      '"regional-cost-indices"',
      '"carbon-factors"',
      '"cash-flow-templates"',
      '"labour-rates"',
      '"margin-presets"',
      '"defects"',
    ]) {
      expect(app, `App.tsx must register the admin route ${path}`).toContain(
        path,
      );
    }
  });

  it("registers admin NAV entries for every admin pane (catches silent wiring aborts)", async () => {
    const fs = await import("fs");
    const nav = fs.readFileSync(
      "src/components/admin/AdminLayout.tsx",
      "utf-8",
    );
    for (const entry of [
      '"/admin/maintenance-profiles"',
      '"/admin/regional-cost-indices"',
      '"/admin/carbon-factors"',
      '"/admin/cash-flow-templates"',
      '"/admin/labour-rates"',
      '"/admin/margin-presets"',
      '"/admin/defects"',
    ]) {
      expect(nav, `AdminLayout must link to ${entry}`).toContain(entry);
    }
  });
});
