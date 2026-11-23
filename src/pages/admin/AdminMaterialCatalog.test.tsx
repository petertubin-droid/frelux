import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMaterialCatalog from "./AdminMaterialCatalog";

const { mockItems, deleteEqMock, state } = vi.hoisted(() => {
  const mockItems = [
    {
      id: "mat-1",
      name: "Super Emulsion Paint",
      category: "paint",
      brand: "Berger",
      economy_price: 15000,
      standard_price: 22000,
      premium_price: 32000,
      luxury_price: 45000,
      quality_tier: "standard",
      currency: "NGN",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "mat-2",
      name: "Vitrified Floor Tiles",
      category: "tiles",
      brand: "Royal",
      economy_price: 4500,
      standard_price: 6500,
      premium_price: 9000,
      luxury_price: 14000,
      quality_tier: "premium",
      currency: "NGN",
      is_active: true,
      sort_order: 2,
    },
  ];

  const state = {
    fetchError: null as any,
  };

  return {
    mockItems,
    deleteEqMock: vi.fn().mockResolvedValue({ error: null }),
    state,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "material_catalog") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: state.fetchError ? null : mockItems,
                error: state.fetchError,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: deleteEqMock,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
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
  state.fetchError = null;
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMaterialCatalog />
    </MemoryRouter>,
  );
}

describe("AdminMaterialCatalog", () => {
  it("renders page header and Add Material button", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Material Catalog/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Material/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Super Emulsion Paint")).toBeInTheDocument();
    expect(screen.getByText("Vitrified Floor Tiles")).toBeInTheDocument();
  });

  it("filters materials by search text", async () => {
    renderPage();

    await screen.findByText("Super Emulsion Paint");
    const searchInput = screen.getByPlaceholderText(/Search materials/i);
    fireEvent.change(searchInput, { target: { value: "Tiles" } });

    expect(screen.queryByText("Super Emulsion Paint")).not.toBeInTheDocument();
    expect(screen.getByText("Vitrified Floor Tiles")).toBeInTheDocument();
  });

  it("filters materials by category dropdown", async () => {
    renderPage();

    await screen.findByText("Super Emulsion Paint");
    const categorySelect = screen.getByLabelText(
      "Filter materials by category",
    );
    fireEvent.change(categorySelect, { target: { value: "paint" } });

    expect(screen.getByText("Super Emulsion Paint")).toBeInTheDocument();
    expect(screen.queryByText("Vitrified Floor Tiles")).not.toBeInTheDocument();
  });

  it("opens edit modal when clicking edit button", async () => {
    renderPage();

    await screen.findByText("Super Emulsion Paint");
    const editBtn = screen.getByLabelText("Edit Super Emulsion Paint");
    fireEvent.click(editBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Super Emulsion Paint"),
    ).toBeInTheDocument();
  });

  it("deletes a material after confirmation", async () => {
    renderPage();

    await screen.findByText("Super Emulsion Paint");
    const deleteBtn = screen.getByLabelText("Delete Super Emulsion Paint");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Delete this material? This cannot be undone.",
      );
      expect(deleteEqMock).toHaveBeenCalledWith("id", "mat-1");
    });
  });

  it("displays error message when loading materials fails", async () => {
    state.fetchError = { message: "Failed to load material catalog" };
    renderPage();

    expect(
      await screen.findByText("Failed to load material catalog"),
    ).toBeInTheDocument();
  });
});
