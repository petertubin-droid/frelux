/**
 * Mineral Stone Calculator page tests
 *
 * Verifies the end-to-end connection: database configuration →
 * deterministic engine → rendered result. The engine's own arithmetic
 * is covered by mineral-stone-engine.test.ts with hand-computed values;
 * these tests pin the page's wiring (config loading, product/profile
 * selection, warning display, save flow).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MineralStoneCalculator from "./MineralStoneCalculator";

const mockProducts = [
  {
    id: "prod-1",
    name: "Test Stone Product",
    slug: "test-stone-product",
    brand: "BrandX",
    product_notes: "Apply with a steel trowel.",
    technical_spec: "Datasheet ref D-2026",
    standard_pack_size: 25,
    pack_unit_symbol: "kg",
    price_per_pack: 15000,
    price_currency: "NGN",
    profiles: [
      {
        id: "prof-1",
        product_id: "prod-1",
        name: "Standard application",
        slug: "standard",
        description: null,
        calculation_model: "mass_per_area",
        coverage: null,
        coverage_min: null,
        coverage_max: null,
        coverage_unit: null,
        consumption_min: 2.5,
        consumption_max: 3.5,
        consumption_unit: "kg_per_m2",
        default_coats: 1,
        waste_percentage: 0,
        is_active: true,
        sort_order: 0,
      },
    ],
  },
];

vi.mock("@/lib/supabase", () => {
  // Minimal chainable mock: the page only queries estimation_calc_versions.
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.select = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
  return { supabase: { from: vi.fn(() => chainable) } };
});

vi.mock("@/lib/estimation/queries", async () => {
  const actual = await vi.importActual("@/lib/estimation/queries");
  return {
    ...actual,
    fetchConfigurableFinishProducts: vi.fn(),
    createEstimate: vi.fn(),
    createEstimateItem: vi.fn(),
  };
});

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));
vi.mock("@/lib/achievements", () => ({
  trackCalculation: vi.fn(),
}));
vi.mock("@/lib/smart-defaults", () => ({
  trackRecentTool: vi.fn(),
}));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
}));

import { fetchConfigurableFinishProducts } from "@/lib/estimation/queries";
const mockedFetch = vi.mocked(fetchConfigurableFinishProducts);

function renderPage(embedded = false) {
  return render(
    <MemoryRouter>
      <MineralStoneCalculator embedded={embedded} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MineralStoneCalculator", () => {
  it("shows a clear data-requirement message when no products are configured", async () => {
    mockedFetch.mockResolvedValue({ data: [], error: null });
    renderPage();
    expect(
      await screen.findByText(/No Mineral Stone products configured yet/i),
    ).toBeInTheDocument();
  });

  it("shows a configuration load error", async () => {
    mockedFetch.mockResolvedValue({ data: [], error: "network down" });
    renderPage();
    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
  });

  it("loads products from the database and calculates with the engine", async () => {
    mockedFetch.mockResolvedValue({ data: mockProducts, error: null });
    renderPage();

    const productSelect = await screen.findByLabelText(/^Product$/);
    expect(productSelect).toBeInTheDocument();
    expect(screen.getByText("Test Stone Product — BrandX")).toBeInTheDocument();

    // Enter area (53.89 m², 1 coat, 2.5–3.5 kg/m² → 6–8 × 25 kg packs)
    const areaInput = screen.getByLabelText(/Surface area/i);
    fireEvent.change(areaInput, { target: { value: "53.89" } });

    // coats seeded from configured default (1)
    expect(
      (screen.getByLabelText(/Coats \/ layers/i) as HTMLInputElement).value,
    ).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    // Engine result: purchase 6–8 packages (hand-computed in the engine tests)
    await waitFor(() => {
      expect(
        screen.getByText(/Material requirement \(with waste\)/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("134.73–188.62 kg")).toBeInTheDocument();
    expect(screen.getByText(/^6–8 25 kg packages$/)).toBeInTheDocument();
  });

  it("renders engine warnings as data requirements instead of fake numbers", async () => {
    const incomplete = [
      {
        ...mockProducts[0],
        profiles: [
          {
            ...mockProducts[0].profiles[0],
            calculation_model: null,
            default_coats: null,
          },
        ],
      },
    ];
    mockedFetch.mockResolvedValue({ data: incomplete, error: null });
    renderPage();

    await screen.findByLabelText(/^Product$/);
    fireEvent.change(screen.getByLabelText(/Surface area/i), {
      target: { value: "50" },
    });
    // Enter coats explicitly so the missing MODEL is what blocks the result
    fireEvent.change(screen.getByLabelText(/Coats \/ layers/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Data requirements/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Calculation model is not configured/i),
    ).toBeInTheDocument();
    // No purchase section may be shown for an uncalculable result
    expect(screen.queryByText(/Purchase quantity/i)).toBeNull();
  });
});
