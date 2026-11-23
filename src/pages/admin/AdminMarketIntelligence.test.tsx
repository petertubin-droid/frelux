import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMarketIntelligence from "./AdminMarketIntelligence";

const {
  mockObservations,
  mockApprovedPrices,
  mockSources,
  mockProviders,
  updateObservationStatusMock,
  deactivateApprovedPriceMock,
  deleteSourceMock,
  toggleProviderMock,
} = vi.hoisted(() => {
  const mockObservations = [
    {
      id: "obs-1",
      original_product_name: "Dangote 3X 50kg",
      normalized_name: "Dangote Cement 50kg",
      currency_code: "NGN",
      price: 8500,
      package_size: 50,
      package_unit: "kg",
      country_code: "NG",
      city: "Lagos",
      match_confidence: "high",
      validation_status: "review_required",
      collected_at: new Date().toISOString(),
    },
  ];

  const mockApprovedPrices = [
    {
      id: "app-1",
      product_name: "Dangote Cement 50kg",
      brand: "Dangote",
      category: "masonry",
      freshness: "fresh",
      currency_code: "NGN",
      price: 8500,
      package_size: 50,
      package_unit: "kg",
      market_code: "NG",
      source_count: 3,
      confidence: "high",
      last_updated: new Date().toISOString(),
    },
  ];

  const mockSources = [
    {
      id: "src-1",
      source_name: "Jumia Nigeria",
      source_type: "marketplace",
      reliability_tier: 2,
      is_verified: true,
      country_code: "NG",
      is_active: true,
      source_url: "https://jumia.com.ng",
    },
  ];

  const mockProviders = [
    {
      id: "prov-1",
      provider_name: "SerpApi Shopping",
      provider_type: "api",
      description: "Google Shopping price extraction",
      is_free: false,
      is_fallback: false,
      priority: 1,
      is_enabled: true,
    },
  ];

  return {
    mockObservations,
    mockApprovedPrices,
    mockSources,
    mockProviders,
    updateObservationStatusMock: vi.fn().mockResolvedValue(true),
    deactivateApprovedPriceMock: vi.fn().mockResolvedValue(true),
    deleteSourceMock: vi.fn().mockResolvedValue(true),
    toggleProviderMock: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "admin-user-id" },
  }),
}));

vi.mock("@/lib/market-intelligence", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/market-intelligence")>();
  return {
    ...actual,
    fetchObservations: vi.fn().mockResolvedValue(mockObservations),
    updateObservationStatus: updateObservationStatusMock,
    fetchApprovedPrices: vi.fn().mockResolvedValue(mockApprovedPrices),
    deactivateApprovedPrice: deactivateApprovedPriceMock,
    fetchSources: vi.fn().mockResolvedValue(mockSources),
    deleteSource: deleteSourceMock,
    fetchProviders: vi.fn().mockResolvedValue(mockProviders),
    toggleProvider: toggleProviderMock,
    fetchAnomalies: vi.fn().mockResolvedValue([]),
    fetchCrawlLogs: vi.fn().mockResolvedValue([]),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMarketIntelligence />
    </MemoryRouter>,
  );
}

describe("AdminMarketIntelligence", () => {
  it("renders page header and default Price Observations tab", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Market Intelligence/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Price Observations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Approved Prices/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sources/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Providers/i }),
    ).toBeInTheDocument();

    expect(await screen.findByText("Dangote 3X 50kg")).toBeInTheDocument();
    expect(screen.getByText("NGN 8,500")).toBeInTheDocument();
  });

  it("approves a pending observation", async () => {
    renderPage();

    await screen.findByText("Dangote 3X 50kg");
    const approveBtn = screen.getByLabelText("Approve");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(updateObservationStatusMock).toHaveBeenCalledWith(
        "obs-1",
        "approved",
        "admin-user-id",
        "approved",
      );
    });
  });

  it("rejects a pending observation", async () => {
    renderPage();

    await screen.findByText("Dangote 3X 50kg");
    const rejectBtn = screen.getByLabelText("Reject");
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(updateObservationStatusMock).toHaveBeenCalledWith(
        "obs-1",
        "rejected",
        "admin-user-id",
        "rejected",
      );
    });
  });

  it("switches to Approved Prices tab and deactivates a price", async () => {
    renderPage();

    await screen.findByText("Dangote 3X 50kg");
    const appPricesTab = screen.getByRole("button", {
      name: /Approved Prices/i,
    });
    fireEvent.click(appPricesTab);

    expect(await screen.findByText("Dangote Cement 50kg")).toBeInTheDocument();
    const deactBtn = screen.getByRole("button", { name: /Deactivate/i });
    fireEvent.click(deactBtn);

    await waitFor(() => {
      expect(deactivateApprovedPriceMock).toHaveBeenCalledWith("app-1");
    });
  });

  it("switches to Providers tab and toggles provider status", async () => {
    renderPage();

    await screen.findByText("Dangote 3X 50kg");
    const provTab = screen.getByRole("button", { name: /Providers/i });
    fireEvent.click(provTab);

    expect(await screen.findByText("SerpApi Shopping")).toBeInTheDocument();
    const toggleBtn = screen.getByLabelText("Toggle SerpApi Shopping");
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(toggleProviderMock).toHaveBeenCalledWith("prov-1", false);
    });
  });

  it("switches to Sources tab and deletes a source", async () => {
    renderPage();

    await screen.findByText("Dangote 3X 50kg");
    const srcTab = screen.getByRole("button", { name: /Sources/i });
    fireEvent.click(srcTab);

    expect(await screen.findByText("Jumia Nigeria")).toBeInTheDocument();
    const deleteBtn = screen.getByLabelText("Delete source");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteSourceMock).toHaveBeenCalledWith("src-1");
    });
  });
});
