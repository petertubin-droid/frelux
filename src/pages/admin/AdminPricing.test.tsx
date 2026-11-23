import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPricing from "./AdminPricing";

const {
  mockProducts,
  mockMaterials,
  mockPaintTypes,
  updateEqMock,
  deleteEqMock,
  state,
} = vi.hoisted(() => {
  const mockProducts = [
    {
      id: "prod-1",
      paint_type_id: "pt-1",
      name: "Dulux WeatherShield",
      brand: "Dulux",
      container_size: 20,
      price: 45000,
      currency: "NGN",
      regional_multiplier: 1.0,
      is_active: true,
      sort_order: 1,
    },
  ];

  const mockMaterials = [
    {
      id: "mat-1",
      name: "Sandpaper 120 Grit",
      category: "consumables",
      unit: "sheet",
      price: 350,
      currency: "NGN",
      is_active: true,
      sort_order: 1,
    },
  ];

  const mockPaintTypes = [{ id: "pt-1", name: "Emulsion", sort_order: 1 }];

  const state = {
    fetchError: null as any,
    productsList: [...mockProducts],
    materialsList: [...mockMaterials],
  };

  return {
    mockProducts,
    mockMaterials,
    mockPaintTypes,
    updateEqMock: vi.fn().mockResolvedValue({ error: null }),
    deleteEqMock: vi.fn().mockResolvedValue({ error: null }),
    state,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "paint_products") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: state.fetchError ? null : state.productsList,
              error: state.fetchError,
            }),
          }),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: deleteEqMock,
          })),
        };
      }
      if (table === "material_prices") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: state.fetchError ? null : state.materialsList,
              error: state.fetchError,
            }),
          }),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: deleteEqMock,
          })),
        };
      }
      if (table === "paint_types") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockPaintTypes,
              error: null,
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.productsList = [...mockProducts];
  state.materialsList = [...mockMaterials];
  state.fetchError = null;
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPricing />
    </MemoryRouter>,
  );
}

describe("AdminPricing", () => {
  it("renders page header and products tab by default", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Cost & Pricing/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Paint products/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Materials" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Dulux WeatherShield")).toBeInTheDocument();
  });

  it("toggles product active status", async () => {
    renderPage();

    await screen.findByText("Dulux WeatherShield");
    const toggle = screen.getByLabelText("Active: Dulux WeatherShield");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "prod-1");
    });
  });

  it("deletes a product after confirmation", async () => {
    renderPage();

    await screen.findByText("Dulux WeatherShield");
    const deleteBtn = screen.getByLabelText("Delete Dulux WeatherShield");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalledWith("id", "prod-1");
    });
  });

  it("switches to Materials tab and displays materials", async () => {
    renderPage();

    await screen.findByText("Dulux WeatherShield");
    const matsTabBtn = screen.getByRole("button", { name: "Materials" });
    fireEvent.click(matsTabBtn);

    expect(await screen.findByText("Sandpaper 120 Grit")).toBeInTheDocument();
    expect(screen.getByText(/consumables · sheet/)).toBeInTheDocument();
  });

  it("toggles material active status", async () => {
    renderPage();

    await screen.findByText("Dulux WeatherShield");
    const matsTabBtn = screen.getByRole("button", { name: "Materials" });
    fireEvent.click(matsTabBtn);

    await screen.findByText("Sandpaper 120 Grit");
    const toggle = screen.getByLabelText("Active: Sandpaper 120 Grit");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "mat-1");
    });
  });

  it("displays error banner when loading products fails", async () => {
    state.fetchError = { message: "Could not fetch paint products" };
    renderPage();

    expect(
      await screen.findByText("Could not fetch paint products"),
    ).toBeInTheDocument();
  });
});
