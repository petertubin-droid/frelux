import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Campaign } from "@/lib/ads/campaigns";

const mocks = vi.hoisted(() => ({
  recordCampaignEvent: vi.fn(async () => true),
  loadCampaigns: vi.fn(),
}));

vi.mock("@/lib/ads/campaigns", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ads/campaigns")>(
    "@/lib/ads/campaigns",
  );
  return {
    ...actual,
    loadCampaigns: () => mocks.loadCampaigns(),
    recordCampaignEvent: mocks.recordCampaignEvent,
  };
});
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ marketCode: "NG", availableMarkets: [] }),
}));

import { CampaignSlot, CalculatorAdBanner } from "./CampaignSlot";

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    name: "Cement suppliers",
    slug: "cement-suppliers",
    campaign_type: "internal",
    status: "active",
    format: "native",
    headline: "Cement prices move. Check before you order.",
    description: "Current prices by city.",
    cta_label: "See cement prices",
    destination_url: "/marketplace?category=cement",
    is_external: false,
    image_url: null,
    image_alt: null,
    advertiser_name: "FRELUX",
    advertiser_logo_url: null,
    is_sponsored: false,
    target_markets: ["ALL"],
    placements: ["calculator_results"],
    target_tools: ["cement"],
    target_categories: [],
    target_devices: ["desktop", "tablet", "mobile"],
    priority: 50,
    weight: 1,
    starts_at: null,
    ends_at: null,
    max_impressions: null,
    notes: null,
    ...overrides,
  };
}

function renderSlot(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("campaign slot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("renders nothing at all when no campaign matches the slot", async () => {
    mocks.loadCampaigns.mockResolvedValue([campaign({ status: "paused" })]);
    const { container } = renderSlot(<CalculatorAdBanner toolKey="cement" />);
    await Promise.resolve();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText(/Cement prices move/)).not.toBeInTheDocument();
    expect(container.innerHTML).toBe("");
  });

  it("shows the promotion with its label and call to action", async () => {
    mocks.loadCampaigns.mockResolvedValue([campaign()]);
    renderSlot(<CalculatorAdBanner toolKey="cement" />);
    expect(
      await screen.findByText("Cement prices move. Check before you order."),
    ).toBeInTheDocument();
    expect(screen.getByText("Promoted")).toBeInTheDocument();
    expect(screen.getByText("See cement prices")).toBeInTheDocument();
  });

  it("keeps a sponsored unit labelled as sponsored", async () => {
    mocks.loadCampaigns.mockResolvedValue([
      campaign({
        is_sponsored: true,
        campaign_type: "sponsored",
        advertiser_name: "Dangote",
      }),
    ]);
    renderSlot(
      <CampaignSlot
        placement="calculator_results"
        toolKey="cement"
        label="Sponsored"
      />,
    );
    expect(await screen.findByText(/Sponsored/)).toBeInTheDocument();
    expect(screen.getByText(/Dangote/)).toBeInTheDocument();
  });

  it("sends an external sponsor out with rel=sponsored", async () => {
    mocks.loadCampaigns.mockResolvedValue([
      campaign({
        is_sponsored: true,
        is_external: true,
        advertiser_name: "Dangote",
        destination_url: "https://supplier.example/cement",
      }),
    ]);
    renderSlot(
      <CampaignSlot placement="calculator_results" toolKey="cement" />,
    );
    const link = await screen.findByRole("link");
    expect(link).toHaveAttribute("href", "https://supplier.example/cement");
    expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not show a cement promotion on the paint calculator", async () => {
    mocks.loadCampaigns.mockResolvedValue([campaign()]);
    const { container } = renderSlot(<CalculatorAdBanner toolKey="paint" />);
    await Promise.resolve();
    expect(container.innerHTML).toBe("");
  });

  it("renders a banner image with its alt text", async () => {
    mocks.loadCampaigns.mockResolvedValue([
      campaign({
        format: "banner",
        image_url: "https://cdn.example/cement.jpg",
        image_alt: "Bags of cement on a pallet",
      }),
    ]);
    renderSlot(<CalculatorAdBanner toolKey="cement" />);
    const image = await screen.findByAltText("Bags of cement on a pallet");
    expect(image).toHaveAttribute("loading", "lazy");
  });
});
