/**
 * Stucco Calculator page tests (Phase 4)
 *
 * The Stucco calculator is a thin wrapper over the shared
 * ConfigurableFinishCalculator — the deterministic engine math is
 * covered by mineral-stone-engine.test.ts. These tests pin the
 * category wiring: the shared component must load 'stucco' products
 * and render the same deterministic result pipeline.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StuccoCalculator from "./StuccoCalculator";

const mockStuccoProducts = [
  {
    id: "stc-1",
    name: "Test Stucco Product",
    slug: "test-stucco-product",
    brand: null,
    product_notes: null,
    technical_spec: "Datasheet S-2026",
    standard_pack_size: 20,
    pack_unit_symbol: "kg",
    price_per_pack: 9000,
    price_currency: "NGN",
    profiles: [
      {
        id: "stc-prof-1",
        product_id: "stc-1",
        name: "Base coat",
        slug: "base-coat",
        description: null,
        calculation_model: "mass_per_area",
        coverage: null,
        coverage_min: null,
        coverage_max: null,
        coverage_unit: null,
        consumption_min: 1.2,
        consumption_max: 1.8,
        consumption_unit: "kg_per_m2",
        default_coats: 1,
        waste_percentage: 5,
        is_active: true,
        sort_order: 0,
      },
    ],
  },
];

vi.mock("@/lib/supabase", () => {
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

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/achievements", () => ({ trackCalculation: vi.fn() }));
vi.mock("@/lib/smart-defaults", () => ({ trackRecentTool: vi.fn() }));
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));

import { fetchConfigurableFinishProducts } from "@/lib/estimation/queries";
const mockedFetch = vi.mocked(fetchConfigurableFinishProducts);

function renderPage() {
  return render(
    <MemoryRouter>
      <StuccoCalculator />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StuccoCalculator", () => {
  it("loads STUCCO products (not mineral_stone) from the shared loader", async () => {
    mockedFetch.mockResolvedValue({ data: mockStuccoProducts, error: null });
    renderPage();

    const productSelect = await screen.findByLabelText(/^Product$/);
    expect(productSelect).toBeInTheDocument();
    expect(screen.getByText("Test Stucco Product")).toBeInTheDocument();
    // The shared component must be wired to the stucco category
    expect(mockedFetch).toHaveBeenCalledWith("stucco");
  });

  it("calculates with the deterministic engine (waste applied before rounding)", async () => {
    mockedFetch.mockResolvedValue({ data: mockStuccoProducts, error: null });
    renderPage();

    await screen.findByLabelText(/^Product$/);
    // 50 m², 1 coat, 1.2–1.8 kg/m² → 60–90 kg raw; +5% waste → 63–94.5 kg
    // → ceil(63/20)=4, ceil(94.5/20)=5 → 4–5 × 20 kg packs
    fireEvent.change(screen.getByLabelText(/Surface area/i), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Material requirement \(with waste\)/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("63–94.5 kg")).toBeInTheDocument();
    expect(screen.getByText(/^4–5 20 kg packages$/)).toBeInTheDocument();
  });

  it("shows the data-requirement message when nothing is configured", async () => {
    mockedFetch.mockResolvedValue({ data: [], error: null });
    renderPage();
    expect(
      await screen.findByText(/No products configured yet/i),
    ).toBeInTheDocument();
    expect(mockedFetch).toHaveBeenCalledWith("stucco");
  });
});
