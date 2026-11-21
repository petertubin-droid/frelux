import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEstimationMaterials from "./AdminEstimationMaterials";
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

const mockUnits = [
  { id: "unit-1", name: "Kilogram", code: "kg", symbol: "kg", unit_type: "weight", is_active: true, sort_order: 1 },
  { id: "unit-2", name: "Litre", code: "l", symbol: "L", unit_type: "volume", is_active: true, sort_order: 2 },
];

const mockMaterials = [
  {
    id: "mat-1",
    name: "Standard White Gypsum",
    slug: "standard-white-gypsum",
    category: "plaster",
    description: "High purity plaster powder",
    unit_id: "unit-1",
    standard_pack_size: 40,
    pack_unit_id: "unit-1",
    coverage_per_pack: 12,
    brand: "Frelux Plaster",
    supplier: "Direct Quarry",
    material_notes: null,
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mat-2",
    name: "Bonding Adhesive Liquid",
    slug: "bonding-adhesive-liquid",
    category: "bonding",
    description: "Latex bonding polymer",
    unit_id: "unit-2",
    standard_pack_size: 5,
    pack_unit_id: "unit-2",
    coverage_per_pack: 25,
    brand: "Frelux Bond",
    supplier: "Chemical Co",
    material_notes: null,
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  (supabase.from as any).mockImplementation((table: string) => {
    if (table === "estimation_units") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockUnits, error: null }),
        }),
      };
    }
    if (table === "estimation_materials") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockMaterials, error: null }),
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
    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });
});

describe("AdminEstimationMaterials Interactive Suite", () => {
  it("renders materials catalog grouped by category", async () => {
    render(
      <MemoryRouter>
        <AdminEstimationMaterials />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Estimation Materials")).toBeInTheDocument();
    expect(await screen.findByText("Standard White Gypsum")).toBeInTheDocument();
    expect(screen.getByText("Bonding Adhesive Liquid")).toBeInTheDocument();
  });

  it("filters materials by name or category", async () => {
    render(
      <MemoryRouter>
        <AdminEstimationMaterials />
      </MemoryRouter>,
    );

    await screen.findByText("Standard White Gypsum");
    const searchInput = screen.getByPlaceholderText(/Search by name or category/i);
    fireEvent.change(searchInput, { target: { value: "Bonding" } });

    expect(screen.getByText("Bonding Adhesive Liquid")).toBeInTheDocument();
    expect(screen.queryByText("Standard White Gypsum")).not.toBeInTheDocument();
  });

  it("opens modal when clicking Add material button", async () => {
    render(
      <MemoryRouter>
        <AdminEstimationMaterials />
      </MemoryRouter>,
    );

    await screen.findByText("Estimation Materials");
    const addBtn = screen.getByRole("button", { name: /Add material/i });
    fireEvent.click(addBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
