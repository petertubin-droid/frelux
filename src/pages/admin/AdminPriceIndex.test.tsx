import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPriceIndex from "@/pages/admin/AdminPriceIndex";

vi.mock("@/lib/price-index/queries", () => ({
  fetchListings: vi.fn().mockResolvedValue({
    listings: [
      {
        material_id: "mat-1",
        name: "Portland Cement (50kg)",
        slug: "portland-cement-50kg",
        category: "masonry",
        sale_unit: "50kg bag",
        price_ngn: 8500,
        currency: "NGN",
        city_slug: "lagos",
        is_published: true,
      },
    ],
    error: null,
  }),
  fetchPendingSubmissions: vi.fn().mockResolvedValue({ rows: [], error: null }),
  fetchCities: vi.fn().mockResolvedValue({
    cities: [
      { slug: "lagos", name: "Lagos", country_code: "NG", is_active: true, sort_order: 1 },
    ],
    error: null,
  }),
  fetchAuditTrail: vi.fn().mockResolvedValue({ rows: [], error: null }),
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

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Material Price Index/i);
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
