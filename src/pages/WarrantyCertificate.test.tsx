/**
 * Warranty Certificate page tests (Future Engine 14)
 *
 * The deterministic math and hashing are covered by
 * warranty-dispute-engine.test.ts. These pin the page wiring
 * (auth gate, save, render) and the route regression net.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WarrantyCertificate from "./WarrantyCertificate";
import type { EstimationEstimateItem } from "@/types/estimation";

const mockEstimates = vi.hoisted(() => [
  {
    id: "est-1",
    estimate_ref: "EST-001",
    user_id: "u-1",
    client_hash: null,
    calculator_type: "paint",
    project_description: null,
    inputs: { area_sqm: 120 },
    calculation_method: "standard",
    calc_version_id: null,
    calculated_quantities: { paint_litres: 10 },
    total_material_cost: 50000,
    currency: "NGN",
    labour_status: "not_included",
    warnings: [],
    recommendations: [],
    notes: null,
    status: "completed",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
]);

const mockItems = vi.hoisted(() => [
  {
    id: "i-1",
    estimate_id: "est-1",
    item_name: "Emulsion paint",
    item_type: "product",
    product_id: null,
    quality_level_id: null,
    material_id: null,
    quantity_required: 10,
    practical_purchase_qty: 10,
    unit: "litre",
    pack_size: null,
    unit_price: 5000,
    total_price: 50000,
    price_snapshot: {},
    calculation_source: "calculated",
    adjustment_status: "none",
    notes: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
]);

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn().mockReturnValue({ user: { id: "u-1" } }),
}));

const mockCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: null, error: null }),
);

vi.mock("@/lib/estimation/queries", () => ({
  fetchEstimates: vi
    .fn()
    .mockResolvedValue({ data: mockEstimates, count: 1, error: null }),
  fetchEstimateItems: vi
    .fn()
    .mockResolvedValue({ data: mockItems, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "warranty_months",
        calculator_type: "warranty",
        rule_value: { value: 12 },
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
  fetchWarrantyRecords: vi.fn().mockResolvedValue({ data: [], error: null }),
  createWarrantyRecord: mockCreate,
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));
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
      <WarrantyCertificate />
    </MemoryRouter>,
  );
}

describe("WarrantyCertificate page", () => {
  it("lists the signed-in user's completed estimates", async () => {
    renderPage();
    expect(
      await screen.findByRole("option", { name: /EST-001/ }),
    ).toBeInTheDocument();
  });

  it("issues a certificate end-to-end with replay verification and save", async () => {
    renderPage();
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "est-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Issue warranty certificate/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/FRELUX-WAR-EST-001-/)).toBeInTheDocument();
    });
    // clean replay: 10 × 5,000 = 50,000 matches the stored 50,000
    expect(screen.getByText("Replays exactly")).toBeInTheDocument();
    expect(screen.getAllByText(/12 months/).length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const saved = mockCreate.mock.calls[0][0];
      expect(saved.certificate_ref).toMatch(/^FRELUX-WAR-EST-001-[0-9a-f]{8}$/);
      expect(saved.estimate_id).toBe("est-1");
      expect(saved.warranty_months).toBe(12);
    });
  });

  it("flags a dispute when stored totals do not match the replay", async () => {
    const { fetchEstimateItems } = await import("@/lib/estimation/queries");
    vi.mocked(fetchEstimateItems).mockResolvedValueOnce({
      data: [
        {
          ...mockItems[0],
          total_price: 55000,
        } as unknown as EstimationEstimateItem,
      ],
      error: null,
    });
    renderPage();
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "est-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Issue warranty certificate/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(/Disputed — review flagged lines/),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Mismatch flagged — never repaired/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dispute flags/)).toBeInTheDocument();
  });

  it("disables Issue until an estimate is selected", async () => {
    renderPage();
    await screen.findByRole("combobox");
    expect(
      screen.getByRole("button", { name: /Issue warranty certificate/i }),
    ).toBeDisabled();
  });

  it("shows the sign-in gate when there is no user", async () => {
    const { useAuth } = await import("@/lib/auth");
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Sign in to issue warranty certificates/i),
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
      '"/warranty-certificate"',
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
