import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPriceIndex from "@/pages/admin/AdminPriceIndex";

vi.mock("@/lib/price-index/queries", () => ({
  fetchListings: vi.fn().mockResolvedValue([
    {
      id: "listing-1",
      material_id: "mat-1",
      material_name: "Portland Cement (50kg)",
      category: "masonry",
      market_code: "NG",
      city_id: "city-lagos",
      city_name: "Lagos",
      unit: "bag",
      price_kind: "median_spot",
      unit_price: 8500,
      currency: "NGN",
      published: true,
      last_observed_at: "2026-11-20T10:00:00Z",
    },
  ]),
  fetchPendingSubmissions: vi.fn().mockResolvedValue([]),
  fetchCities: vi.fn().mockResolvedValue([
    { id: "city-lagos", name: "Lagos", market_code: "NG" },
  ]),
  fetchAuditTrail: vi.fn().mockResolvedValue([]),
  categoryLabel: vi.fn((cat: string) => cat.toUpperCase()),
}));

describe("AdminPriceIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Material Price Index moderator panel", async () => {
    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Live Material Price Index/i)).toBeDefined();
  });

  it("renders loaded market listings", async () => {
    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Portland Cement \(50kg\)/i)).toBeDefined();
    });
  });
});
