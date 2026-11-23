import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdManager from "@/pages/admin/AdManager";

const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
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
  {
    id: "camp-2",
    name: "Dangote Blocks Direct",
    slug: "dangote-blocks-direct",
    campaign_type: "internal",
    status: "paused",
    format: "native",
    headline: "Vibrated Blocks in Bulk",
    description: "Direct to site delivery",
    cta_label: "Order Now",
    destination_url: "/blocks",
    advertiser_name: "Dangote",
    priority: 50,
    target_markets: ["ALL"],
    placements: ["calculator_results"],
    target_tools: [],
    target_categories: [],
    target_devices: ["mobile"],
    is_sponsored: false,
    starts_at: null,
    ends_at: null,
    created_at: "2026-11-02T00:00:00Z",
  },
];

const mockEvents = [
  {
    id: "evt-1",
    campaign_id: "camp-1",
    event_type: "impression",
    placement: "calculator_results",
    tool_key: "paint-calculator",
    market_code: "NG",
    device: "desktop",
    value: 0,
    created_at: "2026-11-10T10:00:00Z",
  },
  {
    id: "evt-2",
    campaign_id: "camp-1",
    event_type: "click",
    placement: "calculator_results",
    tool_key: "paint-calculator",
    market_code: "NG",
    device: "desktop",
    value: 0,
    created_at: "2026-11-10T10:05:00Z",
  },
];

let mockProfilesQuery: any;
let mockAdCampaignsQuery: any;
let mockAdEventsQuery: any;

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1", email: "admin@frelux.test" } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") return mockProfilesQuery;
      if (table === "ad_campaigns") return mockAdCampaignsQuery;
      if (table === "ad_campaign_events") return mockAdEventsQuery;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) => Promise.resolve(fn({ data: [], error: null }))),
      };
    }),
  },
}));

describe("AdManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn();

    mockUseAuth.mockReturnValue({
      user: { id: "admin-1", email: "admin@frelux.test" },
      loading: false,
      isAdmin: true,
    });

    mockProfilesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "admin-1", role: "admin" },
        error: null,
      }),
    };

    const createChain = (resolveData: any = mockCampaigns) => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => Promise.resolve({ data: resolveData, error: null })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        then: vi.fn().mockImplementation((fn: any) => Promise.resolve(fn({ data: resolveData, error: null }))),
      };
      chain.order.mockReturnValue(chain);
      return chain;
    };

    mockAdCampaignsQuery = createChain(mockCampaigns);

    mockAdEventsQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockEvents,
        error: null,
      }),
    };
  });

  it("refuses access when user profile is not an administrator", async () => {
    mockProfilesQuery.maybeSingle.mockResolvedValueOnce({
      data: { id: "user-1", role: "contractor" },
      error: null,
    });

    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Ad Manager is restricted/i)).toBeInTheDocument();
      expect(
        screen.getByText(/This dashboard is limited to FRELUX administrators/i),
      ).toBeInTheDocument();
    });
  });

  it("renders active campaigns, impressions, clicks and CTR", async () => {
    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Lafarge Promo Q4")).toBeInTheDocument();
      expect(screen.getByText("High Quality Portland Cement")).toBeInTheDocument();
      expect(screen.getByText("Dangote Blocks Direct")).toBeInTheDocument();
    });

    // Check CTR rendered for Lafarge Promo (1 click / 1 impression = 100%)
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
  });

  it("validates campaign draft inputs before submission", async () => {
    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Lafarge Promo Q4")).toBeInTheDocument();
    });

    // Click "New campaign" button
    const newBtn = screen.getByRole("button", { name: /New campaign/i });
    fireEvent.click(newBtn);

    // Click Create campaign with empty fields
    const createBtn = screen.getByRole("button", { name: /Create campaign/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Give the campaign a name/i)).toBeInTheDocument();
    });

    // Verify insert was never called with invalid draft
    expect(mockAdCampaignsQuery.insert).not.toHaveBeenCalled();
  });

  it("creates a new campaign with valid fields and destination url", async () => {
    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Lafarge Promo Q4")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /New campaign/i }));

    // Fill form
    fireEvent.change(screen.getByLabelText("Campaign name"), {
      target: { value: "Berger Paints Promo" },
    });
    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "berger-paints-promo" },
    });
    fireEvent.change(screen.getByLabelText("Headline"), {
      target: { value: "20% off Premium Emulsion" },
    });
    fireEvent.change(screen.getByLabelText("Destination URL"), {
      target: { value: "https://example.com/berger" },
    });
    fireEvent.change(screen.getByLabelText("Button label"), {
      target: { value: "Claim Discount" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create campaign/i }));

    await waitFor(() => {
      expect(mockAdCampaignsQuery.insert).toHaveBeenCalledTimes(1);
    });

    const payload = mockAdCampaignsQuery.insert.mock.calls[0][0];
    expect(payload.name).toBe("Berger Paints Promo");
    expect(payload.slug).toBe("berger-paints-promo");
    expect(payload.headline).toBe("20% off Premium Emulsion");
    expect(payload.destination_url).toBe("https://example.com/berger");
    expect(payload.is_external).toBe(true);
  });

  it("toggles campaign status between active and paused", async () => {
    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Pause campaign Lafarge Promo Q4")).toBeInTheDocument();
      expect(screen.getByLabelText("Activate campaign Dangote Blocks Direct")).toBeInTheDocument();
    });

    // Pause active campaign
    fireEvent.click(screen.getByLabelText("Pause campaign Lafarge Promo Q4"));

    await waitFor(() => {
      expect(mockAdCampaignsQuery.update).toHaveBeenCalledWith({ status: "paused" });
    });

    // Activate paused campaign
    fireEvent.click(screen.getByLabelText("Activate campaign Dangote Blocks Direct"));

    await waitFor(() => {
      expect(mockAdCampaignsQuery.update).toHaveBeenCalledWith({ status: "active" });
    });
  });

  it("deletes a campaign only when confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Delete campaign Lafarge Promo Q4")).toBeInTheDocument();
    });

    // Click delete but cancel
    fireEvent.click(screen.getByLabelText("Delete campaign Lafarge Promo Q4"));
    expect(mockAdCampaignsQuery.delete).not.toHaveBeenCalled();

    // Click delete and accept
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByLabelText("Delete campaign Lafarge Promo Q4"));

    await waitFor(() => {
      expect(mockAdCampaignsQuery.delete).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces database query failure notice", async () => {
    mockAdCampaignsQuery.then = vi.fn().mockImplementation((fn: any) =>
      Promise.resolve(fn({ data: null, error: { message: "connection to server failed" } }))
    );

    render(
      <MemoryRouter>
        <AdManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("connection to server failed")).toBeInTheDocument();
    });
  });
});
