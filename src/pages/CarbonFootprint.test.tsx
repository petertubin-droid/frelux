/**
 * Carbon Footprint page tests (Future Engine 5)
 *
 * The deterministic math is covered by embodied-carbon-engine.test.ts.
 * These pin the page wiring and — critically — that the public routes
 * for every engine page are actually registered in App.tsx (a previous
 * wiring script silently aborted and left pages unrouted).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CarbonFootprint from "./CarbonFootprint";

const mockFactors = vi.hoisted(() => [
  {
    id: "f-1",
    category: "emulsion_paint",
    category_label: "Emulsion paint (per litre)",
    unit: "litre",
    kg_co2e_per_unit: 2.5,
    description: null,
    source_reference: "EPD 2025 average",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "f-2",
    category: "cement_bag",
    category_label: "Cement (per 50kg bag)",
    unit: "bag",
    kg_co2e_per_unit: 90,
    description: null,
    source_reference: "ICE v3 cement",
    effective_date: "2026-01-01",
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchCarbonFactors: vi
    .fn()
    .mockResolvedValue({ data: mockFactors, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "rounding_decimals",
        calculator_type: "embodied_carbon",
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

import AppRaw from "../App";

function renderPage() {
  return render(
    <MemoryRouter>
      <CarbonFootprint />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CarbonFootprint page", () => {
  it("lists configured factor categories with units in the selector", async () => {
    renderPage();
    expect(
      await screen.findByRole("option", {
        name: /Emulsion paint \(per litre\)/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Cement \(per 50kg bag\)/ }),
    ).toBeInTheDocument();
  });

  it("computes the hand-verified total end-to-end", async () => {
    renderPage();
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "emulsion_paint" } });
    const qty = screen.getByPlaceholderText("Quantity (litre)");
    fireEvent.change(qty, { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add line" }));
    const selects2 = screen.getAllByRole("combobox");
    fireEvent.change(selects2[1], { target: { value: "cement_bag" } });
    fireEvent.change(screen.getByPlaceholderText("Quantity (bag)"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate Carbon/i }));

    // 20 × 2.5 = 50 + 3 × 90 = 270 → 320 kgCO2e
    await waitFor(() => {
      expect(screen.getByText(/320 kgCO₂e/)).toBeInTheDocument();
    });
  });

  it("shows the factor source next to a selected material", async () => {
    renderPage();
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "cement_bag" } });
    expect(await screen.findByText(/ICE v3 cement/)).toBeInTheDocument();
  });

  it("disables Calculate until a line is filled", async () => {
    renderPage();
    await screen.findAllByRole("combobox");
    expect(
      screen.getByRole("button", { name: /Calculate Carbon/i }),
    ).toBeDisabled();
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
    ]) {
      expect(app, `App.tsx must register the route ${path}`).toContain(path);
    }
    for (const path of [
      '"regional-cost-indices"',
      '"carbon-factors"',
      '"maintenance-profiles"',
    ]) {
      expect(app, `App.tsx must register the admin route ${path}`).toContain(
        path,
      );
    }
    expect(AppRaw).toBeTruthy();
  });
});
