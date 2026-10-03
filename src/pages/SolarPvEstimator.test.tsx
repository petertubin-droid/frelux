/**
 * Solar/PV Estimator page tests (Future Engine 16 — primary)
 *
 * The deterministic math is covered by solar-pv-engine.test.ts
 * (14 hand-verified tests). These pin the page wiring (model
 * loading, both modes, gating, rendering) and extend the
 * route-registration regression net.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SolarPvEstimator from "./SolarPvEstimator";

const mockModels = vi.hoisted(() => [
  {
    id: "m-1",
    model_name: "Jinko Tiger Neo 550",
    watt_peak: 550,
    length_m: 2.28,
    width_m: 1.13,
    unit_price_naira: 180000,
    description: null,
    source_reference: "Jinko datasheet TSN-550",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

const mockPrices = vi.hoisted(() => [
  {
    id: "c-1",
    component_key: "mounting_rail_per_m",
    component_label: "Mounting rails",
    unit: "m",
    price_naira: 4500,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-2",
    component_key: "mid_clamp",
    component_label: "Mid clamps",
    unit: "unit",
    price_naira: 1200,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-3",
    component_key: "end_clamp",
    component_label: "End clamps",
    unit: "unit",
    price_naira: 1000,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 2,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-4",
    component_key: "mc4_connector_pair",
    component_label: "MC4 connector pairs",
    unit: "pair",
    price_naira: 2500,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 3,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-5",
    component_key: "dc_cable_per_m",
    component_label: "DC string cable",
    unit: "m",
    price_naira: 1800,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 4,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-6",
    component_key: "ac_cable_per_m",
    component_label: "AC cable",
    unit: "m",
    price_naira: 2200,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 5,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-7",
    component_key: "dc_breaker",
    component_label: "DC breakers",
    unit: "unit",
    price_naira: 25000,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 6,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-8",
    component_key: "ac_breaker",
    component_label: "AC breaker",
    unit: "unit",
    price_naira: 15000,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 7,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-9",
    component_key: "surge_protector",
    component_label: "Surge protectors",
    unit: "unit",
    price_naira: 35000,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 8,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-10",
    component_key: "earthing_kit",
    component_label: "Earthing kit",
    unit: "unit",
    price_naira: 45000,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 9,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-11",
    component_key: "inverter_price_per_kw",
    component_label: "Inverter",
    unit: "kW",
    price_naira: 350000,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 10,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "c-12",
    component_key: "battery_unit",
    component_label: "Battery units",
    unit: "unit",
    price_naira: 450000,
    description: null,
    source_reference: "Supplier quote Q1",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 11,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchSolarPanelModels: vi
    .fn()
    .mockResolvedValue({ data: mockModels, error: null }),
  fetchSolarComponentPrices: vi
    .fn()
    .mockResolvedValue({ data: mockPrices, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "peak_sun_hours_day",
        calculator_type: "solar_pv",
        rule_value: { value: 5.0 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r2",
        rule_key: "system_loss_factor",
        calculator_type: "solar_pv",
        rule_value: { value: 0.2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r3",
        rule_key: "inverter_dc_ac_ratio",
        calculator_type: "solar_pv",
        rule_value: { value: 1.15 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 2,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r4",
        rule_key: "rails_per_panel",
        calculator_type: "solar_pv",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 3,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r5",
        rule_key: "mid_clamps_per_panel",
        calculator_type: "solar_pv",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 4,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r6",
        rule_key: "end_clamps_per_panel",
        calculator_type: "solar_pv",
        rule_value: { value: 4 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 5,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r7",
        rule_key: "mc4_pairs_per_panel",
        calculator_type: "solar_pv",
        rule_value: { value: 1 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 6,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r8",
        rule_key: "dc_cable_per_panel_m",
        calculator_type: "solar_pv",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 7,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r9",
        rule_key: "string_size_max",
        calculator_type: "solar_pv",
        rule_value: { value: 10 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 8,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r10",
        rule_key: "labor_cost_per_panel_naira",
        calculator_type: "solar_pv",
        rule_value: { value: 15000 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 9,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "r11",
        rule_key: "rounding_decimals",
        calculator_type: "solar_pv",
        rule_value: { value: 2 },
        rule_status: "verified_frelux",
        description: null,
        is_active: true,
        sort_order: 10,
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
      <SolarPvEstimator />
    </MemoryRouter>,
  );
}

describe("SolarPvEstimator page", () => {
  it("lists the configured panel models", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Jinko Tiger Neo 550 — 550 Wp/ }),
      ).toBeInTheDocument();
    });
  });

  it("computes the hand-verified roof-fit estimate end to end (23 panels, ₦9,386,460)", async () => {
    renderPage();
    await screen.findByRole("option", { name: /Jinko Tiger Neo 550/ });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "m-1" },
    });
    fireEvent.change(screen.getByLabelText(/Usable roof area/i), {
      target: { value: "60" },
    });
    fireEvent.change(screen.getByLabelText(/Cable run, array to inverter/i), {
      target: { value: "15" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Estimate my installation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("23")).toBeInTheDocument();
    });
    expect(screen.getByText(/12\.65 kWp array/)).toBeInTheDocument();
    expect(screen.getAllByText(/50\.6 kWh/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/11 kW/).length).toBeGreaterThanOrEqual(1);
    // materials takeoff renders every line
    expect(screen.getByText("Mounting rails")).toBeInTheDocument();
    expect(screen.getByText("104.88 m")).toBeInTheDocument();
    expect(screen.getByText("MC4 connector pairs")).toBeInTheDocument();
    expect(screen.getByText("Earthing kit")).toBeInTheDocument();
    expect(screen.getByText("₦9,386,460")).toBeInTheDocument();
  });

  it("sizes for the energy target in target mode (30 kWh/day → 14 panels)", async () => {
    renderPage();
    await screen.findByRole("option", { name: /Jinko Tiger Neo 550/ });
    fireEvent.click(
      screen.getByRole("button", { name: /Size for my energy target/i }),
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "m-1" },
    });
    fireEvent.change(screen.getByLabelText(/Target daily energy/i), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText(/Cable run, array to inverter/i), {
      target: { value: "15" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Estimate my installation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("14")).toBeInTheDocument();
    });
    expect(screen.getByText(/7\.7 kWp array/)).toBeInTheDocument();
    expect(screen.getAllByText(/30\.8 kWh/).length).toBeGreaterThanOrEqual(1);
  });

  it("refuses a roof smaller than one panel with an honest message", async () => {
    renderPage();
    await screen.findByRole("option", { name: /Jinko Tiger Neo 550/ });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "m-1" },
    });
    fireEvent.change(screen.getByLabelText(/Usable roof area/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/Cable run, array to inverter/i), {
      target: { value: "15" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Estimate my installation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/smaller than one panel/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/kWp array/)).not.toBeInTheDocument();
  });

  it("gates the estimate button until model, mode input and cable run are given", async () => {
    renderPage();
    await screen.findByRole("option", { name: /Jinko Tiger Neo 550/ });
    const btn = screen.getByRole("button", {
      name: /Estimate my installation/i,
    });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "m-1" },
    });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Cable run, array to inverter/i), {
      target: { value: "15" },
    });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Usable roof area/i), {
      target: { value: "60" },
    });
    expect(btn).not.toBeDisabled();
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
      '"/contractor-credit"',
      '"/solar-pv-estimator"',
      '"/bim-ifc-import"',
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
      '"credit-profiles"',
      '"solar-panels"',
      '"solar-prices"',
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
      '"/admin/credit-profiles"',
      '"/admin/solar-panels"',
      '"/admin/solar-prices"',
    ]) {
      expect(nav, `AdminLayout must link to ${entry}`).toContain(entry);
    }
  });
});
