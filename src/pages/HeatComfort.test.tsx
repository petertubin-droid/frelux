/**
 * Heat Comfort page tests (Future Engine 6)
 *
 * The deterministic math is covered by heat-comfort-engine.test.ts.
 * These pin the page wiring (factor loading, gating, rendering)
 * and the route-registration regression net.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HeatComfort from "./HeatComfort";

const mockFactors = vi.hoisted(() => [
  {
    id: "f-1",
    surface_type: "roof",
    category: "dark_membrane",
    category_label: "Dark membrane",
    solar_reflectance: 0.2,
    description: null,
    source_reference: "Manufacturer data sheet XYZ",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "f-2",
    surface_type: "roof",
    category: "cool_coating",
    category_label: "Cool roof coating",
    solar_reflectance: 0.65,
    description: null,
    source_reference: "CRRC rating #123",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchThermalFinishFactors: vi
    .fn()
    .mockResolvedValue({ data: mockFactors, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "solar_irradiance_kwh_per_sqm_day",
        calculator_type: "heat_comfort",
        rule_value: { value: 5.5 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r2",
        rule_key: "meaningful_reduction_threshold",
        calculator_type: "heat_comfort",
        rule_value: { value: 0.15 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r3",
        rule_key: "rounding_decimals",
        calculator_type: "heat_comfort",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 2,
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
      <HeatComfort />
    </MemoryRouter>,
  );
}

const selects = () =>
  screen
    .getAllByRole("combobox")
    .filter((el) => (el as HTMLSelectElement).value !== undefined);

describe("HeatComfort page", () => {
  it("lists only the factors for the selected surface type", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getAllByRole("option", { name: "Dark membrane" }).length,
      ).toBe(2);
    });
    expect(
      screen.getAllByRole("option", { name: "Cool roof coating" }).length,
    ).toBe(2);
    // changing surface type clears the selections (no stale categories)
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "wall" },
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("option", { name: "Dark membrane" }),
      ).not.toBeInTheDocument();
    });
  });

  it("computes the hand-verified comparison end to end", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getAllByRole("option", { name: "Dark membrane" }).length,
      ).toBe(2);
    });
    const boxes = screen.getAllByRole("combobox");
    fireEvent.change(boxes[1], { target: { value: "dark_membrane" } });
    fireEvent.change(boxes[2], { target: { value: "cool_coating" } });
    fireEvent.click(screen.getByRole("button", { name: /Compare finishes/i }));

    // 100 m² × 5.5 × (0.65 − 0.20) = +247.5 kWh/day, 56.25% reduction
    await waitFor(() => {
      expect(screen.getByText(/\+247\.5 kWh\/day/)).toBeInTheDocument();
    });
    expect(screen.getByText("Cooler")).toBeInTheDocument();
    expect(screen.getAllByText(/56\.25%/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/meaningful cooling benefit/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("disables Compare until both finishes are selected", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getAllByRole("option", { name: "Dark membrane" }).length,
      ).toBe(2);
    });
    expect(
      screen.getByRole("button", { name: /Compare finishes/i }),
    ).toBeDisabled();
    const boxes = screen.getAllByRole("combobox");
    fireEvent.change(boxes[1], { target: { value: "dark_membrane" } });
    expect(
      screen.getByRole("button", { name: /Compare finishes/i }),
    ).toBeDisabled();
  });

  it("honestly reports a warmer result for a darker proposed finish", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getAllByRole("option", { name: "Dark membrane" }).length,
      ).toBe(2);
    });
    const boxes = screen.getAllByRole("combobox");
    fireEvent.change(boxes[1], { target: { value: "cool_coating" } });
    fireEvent.change(boxes[2], { target: { value: "dark_membrane" } });
    fireEvent.click(screen.getByRole("button", { name: /Compare finishes/i }));
    // 100 × 5.5 × (0.20 − 0.65) = −247.5 kWh/day
    await waitFor(() => {
      expect(
        screen.getAllByText(/−247\.5 kWh\/day|-247\.5 kWh\/day/).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText("Warmer")).toBeInTheDocument();
    expect(
      screen.getByText(/making the space warmer, not cooler/i),
    ).toBeInTheDocument();
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
    ]) {
      expect(nav, `AdminLayout must link to ${entry}`).toContain(entry);
    }
  });
});
