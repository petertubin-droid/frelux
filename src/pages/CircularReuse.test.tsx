/**
 * Circular/Reuse page tests (Future Engine 9)
 *
 * The deterministic math is covered by circular-reuse-engine.test.ts.
 * These pin the page wiring (factor loading, gating, rendering)
 * and extend the route-registration regression net.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CircularReuse from "./CircularReuse";

const mockFactors = vi.hoisted(() => [
  {
    id: "f-1",
    category: "aluminium_roof_sheets",
    category_label: "Aluminium roof sheets",
    unit: "m2",
    recovery_rate: 0.9,
    reuse_fraction: 0.6,
    recycle_fraction: 0.3,
    unit_value_naira: 3500,
    description: null,
    source_reference: "Demolition audit ABC-2026",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "f-2",
    category: "ceramic_tiles",
    category_label: "Ceramic tiles",
    unit: "m2",
    recovery_rate: 0.4,
    reuse_fraction: 0.1,
    recycle_fraction: 0.1,
    unit_value_naira: null,
    description: null,
    source_reference: "WRAP protocol sheet",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchMaterialReuseFactors: vi
    .fn()
    .mockResolvedValue({ data: mockFactors, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "diversion_target_fraction",
        calculator_type: "circular_reuse",
        rule_value: { value: 0.75 },
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
        calculator_type: "circular_reuse",
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
      <CircularReuse />
    </MemoryRouter>,
  );
}

describe("CircularReuse page", () => {
  it("lists the configured materials and their units", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "Aluminium roof sheets" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("option", { name: "Ceramic tiles" }),
    ).toBeInTheDocument();
  });

  it("computes the hand-verified recovery plan end to end", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Aluminium roof sheets" });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "aluminium_roof_sheets" },
    });
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Plan recovery/i }));

    // 500 × 0.9 = 450 recovered; 270 reused; 135 recycled; 95 landfill; 81% diversion
    await waitFor(() => {
      expect(screen.getByText("450 m2")).toBeInTheDocument();
    });
    expect(screen.getByText("270 m2")).toBeInTheDocument();
    expect(screen.getByText("135 m2")).toBeInTheDocument();
    expect(screen.getByText("95 m2")).toBeInTheDocument();
    expect(screen.getAllByText("81%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₦945,000/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/meets the configured circular-economy target/i),
    ).toBeInTheDocument();
  });

  it("honestly reports a plan below the target", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Ceramic tiles" });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "ceramic_tiles" },
    });
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "400" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Plan recovery/i }));

    // 400 × 0.4 = 160; reused 16; recycled 16; landfill 368; diversion 8%
    await waitFor(() => {
      expect(screen.getByText("8%")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/below the configured circular-economy target/i),
    ).toBeInTheDocument();
    // no value configured → honest dash, never an invented price
    expect(
      screen.getByText(/no reclaimed value configured/i),
    ).toBeInTheDocument();
  });

  it("disables Plan recovery until material and quantity are given", async () => {
    renderPage();
    await screen.findByRole("option", { name: "Ceramic tiles" });
    expect(
      screen.getByRole("button", { name: /Plan recovery/i }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "ceramic_tiles" },
    });
    expect(
      screen.getByRole("button", { name: /Plan recovery/i }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "100" },
    });
    expect(
      screen.getByRole("button", { name: /Plan recovery/i }),
    ).not.toBeDisabled();
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
      '"/heat-comfort"',
      '"/circular-reuse"',
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
      '"thermal-factors"',
      '"reuse-factors"',
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
      '"/admin/thermal-factors"',
      '"/admin/reuse-factors"',
    ]) {
      expect(nav, `AdminLayout must link to ${entry}`).toContain(entry);
    }
  });
});
