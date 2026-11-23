import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTileMaterials from "./AdminTileMaterials";

const mockSizes = [
  {
    id: "size-1",
    name: "600x600 Porcelain",
    width_mm: 600,
    height_mm: 600,
    tiles_per_box: 4,
    is_standard: true,
    is_active: true,
    sort_order: 1,
  },
];

const mockMaterials = [
  {
    id: "mat-1",
    category: "adhesive",
    name: "Tile Adhesive Standard",
    description: "Standard cementitious adhesive",
    coverage_rate: 4.5,
    coverage_unit: "sqm_per_bag",
    package_size: 20,
    package_unit: "kg",
    unit_price: 4500,
    currency: "NGN",
    labour_rate_per_sqm: 1200,
    labour_unit: "sqm",
    is_active: true,
    sort_order: 1,
  },
];

let sizesList = [...mockSizes];
let materialsList = [...mockMaterials];
let fetchError: any = null;
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });

function createChainQuery(data: any) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    select: vi.fn().mockImplementation(() => obj),
    eq: vi.fn().mockImplementation(() => obj),
    then: (resolve: any) =>
      resolve({ data: fetchError ? null : data, error: fetchError }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "tile_sizes") {
        return {
          select: vi.fn().mockImplementation(() => createChainQuery(sizesList)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: deleteEqMock,
          })),
        };
      }
      if (table === "tile_materials") {
        return {
          select: vi
            .fn()
            .mockImplementation(() => createChainQuery(materialsList)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: deleteEqMock,
          })),
        };
      }
      return createChainQuery([]);
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  sizesList = [...mockSizes];
  materialsList = [...mockMaterials];
  fetchError = null;
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminTileMaterials />
    </MemoryRouter>,
  );
}

describe("AdminTileMaterials", () => {
  it("renders page header and tile sizes tab by default", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Tile Library/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tile Sizes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Materials" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("600x600 Porcelain")).toBeInTheDocument();
    expect(screen.getByText(/600×600mm · 4\/box/)).toBeInTheDocument();
  });

  it("toggles active status of a tile size", async () => {
    renderPage();

    await screen.findByText("600x600 Porcelain");
    const toggle = screen.getByLabelText("Active: 600x600 Porcelain");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "size-1");
    });
  });

  it("deletes a tile size after confirmation", async () => {
    renderPage();

    await screen.findByText("600x600 Porcelain");
    const deleteBtn = screen.getByLabelText("Delete 600x600 Porcelain");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalledWith("id", "size-1");
    });
  });

  it("switches to Materials tab and displays materials", async () => {
    renderPage();

    await screen.findByText("600x600 Porcelain");
    const matsTabBtn = screen.getByRole("button", { name: "Materials" });
    fireEvent.click(matsTabBtn);

    expect(
      await screen.findByText("Tile Adhesive Standard"),
    ).toBeInTheDocument();
    expect(screen.getByText(/4\.5 sqm_per_bag · ₦4,500/)).toBeInTheDocument();
  });

  it("toggles active status of a tile material", async () => {
    renderPage();

    await screen.findByText("600x600 Porcelain");
    const matsTabBtn = screen.getByRole("button", { name: "Materials" });
    fireEvent.click(matsTabBtn);

    await screen.findByText("Tile Adhesive Standard");
    const toggle = screen.getByLabelText("Active: Tile Adhesive Standard");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "mat-1");
    });
  });

  it("displays error state when initial load fails", async () => {
    fetchError = { message: "Failed to load tile materials" };
    renderPage();

    expect(
      await screen.findByText("Failed to load tile materials"),
    ).toBeInTheDocument();
  });
});
