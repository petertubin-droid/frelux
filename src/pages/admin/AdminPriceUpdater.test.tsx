import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPriceUpdater from "./AdminPriceUpdater";

const {
  mockMaterials,
  mockPrices,
  mockScanReport,
  createOrUpdatePricesMock,
  state,
} = vi.hoisted(() => {
  const mockMaterials = [
    {
      id: "mat-1",
      slug: "cement",
      name: "Dangote Cement",
      unit: "50kg bag",
      is_active: true,
    },
  ];
  const mockPrices = [
    {
      id: "price-1",
      price_type: "material",
      ref_id: "mat-1",
      price: 8500,
      currency: "NGN",
      market: "NG",
      is_active: true,
    },
  ];
  const mockScanReport = {
    results: [
      {
        material_key: "cement",
        material_name: "Dangote Cement",
        material_slug: "cement",
        unit: "50kg bag",
        configured_price: 8500,
        reference_price: 9000,
        change_percent: -5.5,
      },
    ],
  };

  const state = {
    fetchError: null as any,
  };

  return {
    mockMaterials,
    mockPrices,
    mockScanReport,
    createOrUpdatePricesMock: vi.fn().mockResolvedValue({
      data: [{ id: "new-p-1" }],
      error: null,
    }),
    state,
  };
});

vi.mock("@/lib/estimation/queries", () => ({
  fetchEstimationMaterials: vi
    .fn()
    .mockImplementation(() =>
      state.fetchError
        ? Promise.reject(state.fetchError)
        : Promise.resolve({ data: mockMaterials, error: null }),
    ),
  fetchAllPrices: vi
    .fn()
    .mockImplementation(() =>
      state.fetchError
        ? Promise.reject(state.fetchError)
        : Promise.resolve({ data: mockPrices, error: null }),
    ),
  createOrUpdatePrices: createOrUpdatePricesMock,
}));

vi.mock("@/lib/estimation/price-scanner", () => ({
  scanMaterialPrices: vi.fn().mockResolvedValue(mockScanReport),
  FALLBACK_PRICES: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.fetchError = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPriceUpdater />
    </MemoryRouter>,
  );
}

describe("AdminPriceUpdater", () => {
  it("renders page header and reference catalog review button", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Price Tracker/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Review catalog & configured prices/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Apply selected prices/i }),
    ).toBeInTheDocument();
  });

  it("loads and displays material price rows and summary statistics", async () => {
    renderPage();

    expect(await screen.findByText("Dangote Cement")).toBeInTheDocument();
    expect(screen.getByText("Catalog entries")).toBeInTheDocument();
    expect(screen.getByText("Differs from reference")).toBeInTheDocument();
  });

  it("selects a material row and applies selected prices", async () => {
    renderPage();

    await screen.findByText("Dangote Cement");
    const checkbox = screen.getByLabelText("Select Dangote Cement for pricing");
    fireEvent.click(checkbox);

    const applyBtn = screen.getByRole("button", {
      name: /Apply selected prices/i,
    });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(createOrUpdatePricesMock).toHaveBeenCalled();
      expect(screen.getByTestId("apply-status")).toHaveTextContent("1 applied");
    });
  });

  it("changes market selection and triggers catalog review", async () => {
    renderPage();

    await screen.findByText("Dangote Cement");
    const marketSelect = screen.getByRole("combobox");
    fireEvent.change(marketSelect, { target: { value: "US" } });

    await waitFor(() => {
      expect(screen.getByText("United States (USD)")).toBeInTheDocument();
    });
  });

  it("displays error banner when loading materials fails", async () => {
    state.fetchError = new Error("Failed to load catalog materials");
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load catalog materials",
    );
  });
});
