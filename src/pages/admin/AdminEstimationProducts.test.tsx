import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEstimationProducts from "./AdminEstimationProducts";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "admin-1" }, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

vi.mock("@/lib/supabase", () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
    getFunctionErrorMessage: vi.fn(),
  };
});

const mockProducts = [
  {
    id: "prod-1",
    name: "Premium Emulsion",
    slug: "premium-emulsion",
    category: "paint",
    description: "High quality wall paint",
    product_type: "water-based",
    calculation_method: "room",
    standard_pack_size: 20,
    pack_unit_id: "litres",
    recommended_surface: "masonry",
    finish: "matt",
    texture: "smooth",
    gloss_level: "low",
    durability: "high",
    colour_compatibility: "universal",
    paint_compatibility: "standard",
    brand: "Frelux Pro",
    product_notes: null,
    technical_spec: null,
    has_quality_levels: true,
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-2",
    name: "Gloss Enamel",
    slug: "gloss-enamel",
    category: "enamel",
    description: "Glossy finish paint",
    product_type: "oil-based",
    calculation_method: "area",
    standard_pack_size: 4,
    pack_unit_id: "litres",
    recommended_surface: "wood_metal",
    finish: "gloss",
    texture: "smooth",
    gloss_level: "high",
    durability: "very_high",
    colour_compatibility: "tintable",
    paint_compatibility: "alkyd",
    brand: "Frelux Gloss",
    product_notes: null,
    technical_spec: null,
    has_quality_levels: false,
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockQualities = [
  {
    id: "qual-1",
    product_id: "prod-1",
    name: "Super Deluxe",
    slug: "super-deluxe",
    description: "Extra pigment",
    coverage: 14,
    coverage_unit: "sqm_per_l",
    ceiling_coverage: 12,
    ceiling_coverage_unit: "sqm_per_l",
    calculation_model: "room_heuristic",
    consumption_rate: 0.1,
    consumption_unit: "litres_per_sqm",
    waste_percent: 5,
    coats_default: 2,
    coats_min: 1,
    coats_max: 3,
    primer_required: false,
    recommended_primer_id: null,
    finish_multiplier: 1,
    environment_suitability: "interior",
    spread_rate_m2_per_l: 14,
    touch_dry_hours: 2,
    recoat_hours: 4,
    voc_level_g_per_l: 30,
    technical_standard: "ISO 9001",
    warranty_years: 5,
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  (supabase.from as any).mockImplementation((table: string) => {
    if (table === "estimation_products") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    if (table === "estimation_product_quality") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockQualities, error: null }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });
});

describe("AdminEstimationProducts Interactive Suite", () => {
  it("renders products list grouped by category with active indicators", async () => {
    render(
      <MemoryRouter>
        <AdminEstimationProducts />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Estimation Products")).toBeInTheDocument();
    expect(await screen.findByText("Premium Emulsion")).toBeInTheDocument();
    expect(screen.getByText("Gloss Enamel")).toBeInTheDocument();
  });

  it("filters products when search input changes", async () => {
    render(
      <MemoryRouter>
        <AdminEstimationProducts />
      </MemoryRouter>,
    );

    await screen.findByText("Premium Emulsion");

    const searchInput = screen.getByPlaceholderText(/Search by name or category/i);
    fireEvent.change(searchInput, { target: { value: "Gloss" } });

    expect(screen.getByText("Gloss Enamel")).toBeInTheDocument();
    expect(screen.queryByText("Premium Emulsion")).not.toBeInTheDocument();
  });

  it("opens modal when clicking Add Product button", async () => {
    render(
      <MemoryRouter>
        <AdminEstimationProducts />
      </MemoryRouter>,
    );

    await screen.findByText("Estimation Products");

    const addBtn = screen.getByRole("button", { name: /Add product/i });
    fireEvent.click(addBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
