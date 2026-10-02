/**
 * Profit Margin Calculator page tests (Future Engine 8)
 *
 * The deterministic math is covered by margin-engine.test.ts.
 * These pin the page wiring and the route-registration
 * regression net (extended to every engine).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarginCalculator from "./MarginCalculator";

const mockPresets = vi.hoisted(() => [
  {
    id: "p-1",
    name: "Standard finishing",
    basis: "markup_on_cost",
    margin_percent: 25,
    description: null,
    is_default: true,
    is_active: true,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "p-2",
    name: "Premium margin",
    basis: "margin_on_price",
    margin_percent: 30,
    description: null,
    is_default: false,
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);

vi.mock("@/lib/estimation/queries", () => ({
  fetchMarginPresets: vi
    .fn()
    .mockResolvedValue({ data: mockPresets, error: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "r1",
        rule_key: "rounding_decimals",
        calculator_type: "margin",
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
        rule_key: "vat_rate",
        calculator_type: "margin",
        rule_value: { value: 7.5 },
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
      <MarginCalculator />
    </MemoryRouter>,
  );
}

describe("MarginCalculator page", () => {
  it("defaults to the preset marked is_default, basis shown in the label", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    expect((select as HTMLSelectElement).value).toBe("p-1");
    expect(
      screen.getByRole("option", {
        name: /Standard finishing — 25% markup on cost/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: /Premium margin — 30% margin on price/,
      }),
    ).toBeInTheDocument();
  });

  it("computes the hand-verified quote end-to-end", async () => {
    renderPage();
    await screen.findByRole("combobox");
    fireEvent.change(screen.getByPlaceholderText("e.g. 1000000"), {
      target: { value: "1000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate Quote/i }));

    // markup: 1,000,000 × 25% = 250,000 profit → 1,250,000; VAT 7.5% = 93,750 → 1,343,750
    await waitFor(() => {
      expect(screen.getAllByText(/₦1,343,750/).length).toBeGreaterThanOrEqual(
        1,
      );
    });
    expect(
      screen.getByText(/equivalent to 20% the other way/),
    ).toBeInTheDocument();
  });

  it("switching to the margin-on-price preset produces the different, correct price", async () => {
    renderPage();
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "p-2" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 1000000"), {
      target: { value: "1000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate Quote/i }));

    // margin on price 30%: 1,000,000 ÷ 0.7 = 1,428,571.43; VAT 7.5% = 107,142.86 → 1,535,714.29
    await waitFor(() => {
      expect(
        screen.getAllByText(/₦1,535,714\.29/).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.getAllByText(/30% margin on price/).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("disables Calculate until a cost is entered", async () => {
    renderPage();
    await screen.findByRole("combobox");
    expect(
      screen.getByRole("button", { name: /Calculate Quote/i }),
    ).toBeDisabled();
  });

  it("shows the empty state when no presets are configured", async () => {
    const { fetchMarginPresets } = await import("@/lib/estimation/queries");
    vi.mocked(fetchMarginPresets).mockResolvedValueOnce({
      data: [],
      error: null,
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/No margin presets configured yet/i),
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
    ]) {
      expect(app, `App.tsx must register the admin route ${path}`).toContain(
        path,
      );
    }
  });
});
