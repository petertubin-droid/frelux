import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEstimationPricing from "./AdminEstimationPricing";
import { supabase } from "@/lib/supabase";

const mockProducts = [
  { id: "prod-1", name: "Premium Emulsion", category: "emulsion" },
];
const mockMaterials = [
  { id: "mat-1", name: "White Cement", category: "screeding" },
];
const mockPrices = [
  {
    id: "price-1",
    price_type: "product",
    ref_id: "prod-1",
    price: 45000,
    currency: "NGN",
    pack_size_id: null,
    effective_date: "2026-11-01",
    notes: "Direct factory base price",
    is_active: true,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "price-2",
    price_type: "material",
    ref_id: "mat-1",
    price: 6500,
    currency: "NGN",
    pack_size_id: null,
    effective_date: "2026-11-05",
    notes: "Per 20kg bag",
    is_active: false,
    created_at: "2026-11-05T12:00:00Z",
    updated_at: "2026-11-05T12:00:00Z",
  },
];

let pricesList = [...mockPrices];
let fetchError: any = null;
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
const insertMock = vi.fn().mockResolvedValue({ error: null });

function createChainQuery(data: any, err: any = null) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    select: vi.fn().mockImplementation(() => obj),
    then: (resolve: any) => resolve({ data: err ? null : data, error: err }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "estimation_products")
        return createChainQuery(mockProducts);
      if (table === "estimation_product_quality") return createChainQuery([]);
      if (table === "estimation_materials")
        return createChainQuery(mockMaterials);
      if (table === "estimation_pack_sizes") return createChainQuery([]);
      if (table === "estimation_prices") {
        return {
          select: vi
            .fn()
            .mockImplementation(() => createChainQuery(pricesList, fetchError)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: deleteEqMock,
          })),
          insert: insertMock,
        };
      }
      return createChainQuery([]);
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  pricesList = [...mockPrices];
  fetchError = null;
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEstimationPricing />
    </MemoryRouter>,
  );
}

describe("AdminEstimationPricing", () => {
  it("renders pricing list with product names, badges, and prices", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Estimation Pricing/i,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Premium Emulsion")).toBeInTheDocument();
    expect(screen.getByText("White Cement")).toBeInTheDocument();
    expect(screen.getByText("Direct factory base price")).toBeInTheDocument();
  });

  it("filters price list by price type", async () => {
    renderPage();

    await screen.findByText("Premium Emulsion");
    const materialFilterBtn = screen.getByRole("button", { name: "material" });
    fireEvent.click(materialFilterBtn);

    expect(screen.queryByText("Premium Emulsion")).not.toBeInTheDocument();
    expect(screen.getByText("White Cement")).toBeInTheDocument();
  });

  it("filters price list by search input query", async () => {
    renderPage();

    await screen.findByText("Premium Emulsion");
    const searchInput = screen.getByPlaceholderText(/Search price items.../i);
    fireEvent.change(searchInput, { target: { value: "factory" } });

    expect(screen.getByText("Premium Emulsion")).toBeInTheDocument();
    expect(screen.queryByText("White Cement")).not.toBeInTheDocument();
  });

  it("toggles active state and calls supabase update", async () => {
    renderPage();

    await screen.findByText("Premium Emulsion");
    const toggle = screen.getByLabelText("Active: Premium Emulsion");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "price-1");
    });
  });

  it("deletes a price record after user confirms", async () => {
    renderPage();

    await screen.findByText("Premium Emulsion");
    const deleteBtn = screen.getByLabelText("Delete prod-1");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(deleteEqMock).toHaveBeenCalledWith("id", "price-1");
    });
  });

  it("displays error message if fetching prices fails", async () => {
    fetchError = { message: "Failed to load pricing table" };
    renderPage();

    expect(
      await screen.findByText("Failed to load pricing table"),
    ).toBeInTheDocument();
  });
});
