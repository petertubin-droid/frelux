import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdManager from "@/pages/admin/AdManager";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-1", email: "admin@frelux.test" },
    loading: false,
    isAdmin: true,
  })),
}));

vi.mock("@/lib/international/market-context", () => ({
  useMarket: vi.fn(() => ({ code: "NG", name: "Nigeria", currency: "NGN" })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1", email: "admin@frelux.test" } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "admin-1", role: "admin" },
            error: null,
          }),
        };
      }
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "camp-1",
                  name: "Lafarge Promo Q4",
                  slug: "lafarge-promo-q4",
                  campaign_type: "sponsored",
                  status: "active",
                  format: "native",
                  headline: "High Quality Portland Cement",
                  description: "Order directly from verified distributors",
                  cta_label: "View Prices",
                  destination_url: "https://example.com/lafarge",
                  advertiser_name: "Lafarge Nigeria",
                  priority: 100,
                  target_markets: ["NG"],
                  placements: ["calculator_results"],
                  target_tools: [],
                  target_categories: [],
                  target_devices: ["desktop", "mobile"],
                  is_sponsored: true,
                  starts_at: "2026-11-01T00:00:00Z",
                  ends_at: "2026-12-31T00:00:00Z",
                  created_at: "2026-11-01T00:00:00Z",
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "ad_campaign_events") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "evt-1",
                    campaign_id: "camp-1",
                    event_type: "impression",
                    market_code: "NG",
                    device: "desktop",
                    placement: "calculator_results",
                    tool_key: "paint",
                    created_at: "2026-11-20T10:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) => Promise.resolve(fn({ data: [], error: null }))),
      };
    }),
  },
}));

describe("AdManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the FRELUX Ad Manager header", async () => {
    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/FRELUX Ad Manager/i)).toBeDefined();
    });
  });

  it("displays active campaigns and advertiser details", async () => {
    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Lafarge Promo Q4/i)).toBeDefined();
      expect(screen.getByText(/Lafarge Nigeria/i)).toBeDefined();
    });
  });
});
