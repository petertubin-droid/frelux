import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMarketPrices from "@/pages/admin/AdminMarketPrices";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn().mockImplementation((table: string) => {
      let mockData: unknown[] = [];
      if (table === "market_material_prices") {
        mockData = [
          {
            id: "mmp-1",
            market: "NG",
            material_key: "cement-50kg",
            material_name: "Portland Cement (50kg bag)",
            median_price: 8500,
            currency_code: "NGN",
            observation_count: 14,
            updated_at: "2026-11-20T10:00:00Z",
          },
        ];
      } else if (table === "price_scan_sources") {
        mockData = [];
      } else if (table === "market_price_alerts") {
        mockData = [];
      }

      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) =>
          Promise.resolve(fn({ data: mockData, error: null })),
        ),
      };
    }),
  },
}));

describe("AdminMarketPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the 32-market price scanner console", async () => {
    render(
      <MemoryRouter>
        <AdminMarketPrices />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Market Prices/i)).toBeDefined();
  });
});
