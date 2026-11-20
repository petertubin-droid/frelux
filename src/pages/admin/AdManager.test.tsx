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

const mockCampaigns = [
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
];

function makeChain(resultData: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data: resultData, error: null }),
    then: (resolve: any) => resolve({ data: resultData, error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1", email: "admin@frelux.test" } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return makeChain({ id: "admin-1", role: "admin" });
      }
      if (table === "ad_campaigns") {
        return makeChain(mockCampaigns);
      }
      if (table === "ad_campaign_events") {
        return makeChain([]);
      }
      return makeChain([]);
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
      expect(screen.getByText(/High Quality Portland Cement/i)).toBeDefined();
    });
  });
});
