import { describe, expect, it } from "vitest";
import {
  PLACEMENTS,
  breakdownBy,
  deviceFromWidth,
  isLive,
  matchesContext,
  pickCampaign,
  safeDestination,
  selectCampaigns,
  summariseEvents,
  validateCampaign,
  type Campaign,
  type CampaignDraft,
  type CampaignEventRow,
} from "./campaigns";

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    name: "Cement suppliers",
    slug: "cement-suppliers",
    campaign_type: "internal",
    status: "active",
    format: "banner",
    headline: "Cement prices move. Check before you order.",
    description: "Current prices by city, with sources.",
    cta_label: "See cement prices",
    destination_url: "/marketplace?category=cement",
    is_external: false,
    image_url: null,
    image_alt: null,
    advertiser_name: "FRELUX",
    advertiser_logo_url: null,
    is_sponsored: false,
    target_markets: ["ALL"],
    placements: [PLACEMENTS.calculatorResults],
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

const NOW = new Date("2026-10-31T10:00:00Z");

describe("campaign scheduling", () => {
  it("serves an active campaign with no dates", () => {
    expect(isLive(campaign(), NOW)).toBe(true);
  });

  it("never serves a paused campaign", () => {
    expect(isLive(campaign({ status: "paused" }), NOW)).toBe(false);
  });

  it("waits for the start date", () => {
    expect(isLive(campaign({ starts_at: "2026-11-05T00:00:00Z" }), NOW)).toBe(
      false,
    );
  });

  it("stops at the end date", () => {
    expect(isLive(campaign({ ends_at: "2026-10-30T00:00:00Z" }), NOW)).toBe(
      false,
    );
    expect(isLive(campaign({ ends_at: "2026-11-30T00:00:00Z" }), NOW)).toBe(
      true,
    );
  });
});

describe("targeting", () => {
  it("matches only its own calculator", () => {
    expect(
      matchesContext(campaign(), {
        placement: "calculator_results",
        toolKey: "cement",
      }),
    ).toBe(true);
    expect(
      matchesContext(campaign(), {
        placement: "calculator_results",
        toolKey: "paint",
      }),
    ).toBe(false);
  });

  it("matches only its own placement", () => {
    expect(
      matchesContext(campaign(), {
        placement: "article_30",
        toolKey: "cement",
      }),
    ).toBe(false);
  });

  it("runs everywhere when a campaign has no tool targeting", () => {
    const general = campaign({ target_tools: [] });
    expect(
      matchesContext(general, {
        placement: "calculator_results",
        toolKey: "solar",
      }),
    ).toBe(true);
  });

  it("respects market targeting", () => {
    const ngOnly = campaign({ target_markets: ["NG"] });
    expect(
      matchesContext(ngOnly, {
        placement: "calculator_results",
        toolKey: "cement",
        marketCode: "NG",
      }),
    ).toBe(true);
    expect(
      matchesContext(ngOnly, {
        placement: "calculator_results",
        toolKey: "cement",
        marketCode: "GH",
      }),
    ).toBe(false);
  });

  it("treats ALL as every market", () => {
    expect(
      matchesContext(campaign(), {
        placement: "calculator_results",
        toolKey: "cement",
        marketCode: "KE",
      }),
    ).toBe(true);
  });

  it("respects device targeting", () => {
    const desktopOnly = campaign({ target_devices: ["desktop"] });
    expect(
      matchesContext(desktopOnly, {
        placement: "calculator_results",
        toolKey: "cement",
        device: "desktop",
      }),
    ).toBe(true);
    expect(
      matchesContext(desktopOnly, {
        placement: "calculator_results",
        toolKey: "cement",
        device: "mobile",
      }),
    ).toBe(false);
  });

  it("respects category targeting on articles", () => {
    const article = campaign({
      placements: ["article_30"],
      target_tools: [],
      target_categories: ["foundation"],
    });
    expect(
      matchesContext(article, {
        placement: "article_30",
        category: "foundation",
      }),
    ).toBe(true);
    expect(
      matchesContext(article, { placement: "article_30", category: "roofing" }),
    ).toBe(false);
  });
});

describe("selection", () => {
  it("returns nothing when no campaign is eligible, so the slot stays empty", () => {
    expect(
      pickCampaign([campaign({ status: "paused" })], {
        placement: "calculator_results",
        toolKey: "cement",
      }),
    ).toBeNull();
    expect(
      pickCampaign([campaign()], {
        placement: "article_30",
        toolKey: "cement",
      }),
    ).toBeNull();
  });

  it("prefers the higher priority", () => {
    const low = campaign({ id: "low", slug: "low", priority: 10 });
    const high = campaign({ id: "high", slug: "high", priority: 90 });
    expect(
      pickCampaign([low, high], {
        placement: "calculator_results",
        toolKey: "cement",
      })?.id,
    ).toBe("high");
  });

  it("rotates between equal priorities so one campaign does not starve the rest", () => {
    const a = campaign({ id: "a", slug: "a" });
    const b = campaign({ id: "b", slug: "b" });
    const first = selectCampaigns(
      [a, b],
      { placement: "calculator_results", toolKey: "cement" },
      { seed: "session-1" },
    );
    const second = selectCampaigns(
      [a, b],
      { placement: "calculator_results", toolKey: "cement" },
      { seed: "session-2" },
    );
    expect(first).toHaveLength(2);
    expect([first[0].id, second[0].id].sort()).toEqual(["a", "b"]);
  });

  it("honours the limit", () => {
    const campaigns = [
      campaign({ id: "1", slug: "1" }),
      campaign({ id: "2", slug: "2" }),
    ];
    expect(
      selectCampaigns(
        campaigns,
        { placement: "calculator_results", toolKey: "cement" },
        { limit: 1 },
      ),
    ).toHaveLength(1);
  });
});

describe("measurement", () => {
  const events: CampaignEventRow[] = [
    {
      id: "1",
      campaign_id: "c1",
      event_type: "impression",
      placement: "calculator_results",
      tool_key: "cement",
      market_code: "NG",
      device: "mobile",
      value: null,
      created_at: "2026-10-31T09:00:00Z",
    },
    {
      id: "2",
      campaign_id: "c1",
      event_type: "impression",
      placement: "calculator_results",
      tool_key: "cement",
      market_code: "NG",
      device: "desktop",
      value: null,
      created_at: "2026-10-31T09:01:00Z",
    },
    {
      id: "3",
      campaign_id: "c1",
      event_type: "click",
      placement: "calculator_results",
      tool_key: "cement",
      market_code: "NG",
      device: "mobile",
      value: null,
      created_at: "2026-10-31T09:02:00Z",
    },
    {
      id: "4",
      campaign_id: "c1",
      event_type: "conversion",
      placement: "calculator_results",
      tool_key: "cement",
      market_code: "NG",
      device: "mobile",
      value: 2500,
      created_at: "2026-10-31T09:05:00Z",
    },
  ];

  it("computes impressions, clicks and CTR", () => {
    const metrics = summariseEvents(events);
    expect(metrics.impressions).toBe(2);
    expect(metrics.clicks).toBe(1);
    expect(metrics.ctr).toBe(50);
  });

  it("counts a conversion separately from a click", () => {
    const metrics = summariseEvents(events);
    expect(metrics.conversions).toBe(1);
    expect(metrics.conversionValue).toBe(2500);
    expect(metrics.clickToConversion).toBe(100);
  });

  it("reports zero CTR rather than dividing by zero when nobody saw the ad", () => {
    expect(summariseEvents([])).toEqual({
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
      ctr: 0,
      clickToConversion: null,
    });
  });

  it("breaks down by device and placement", () => {
    expect(
      breakdownBy(events, "device").find((row) => row.key === "mobile")?.clicks,
    ).toBe(1);
    expect(breakdownBy(events, "placement")[0].key).toBe("calculator_results");
  });

  it("maps widths to device kinds", () => {
    expect(deviceFromWidth(380)).toBe("mobile");
    expect(deviceFromWidth(800)).toBe("tablet");
    expect(deviceFromWidth(1440)).toBe("desktop");
  });
});

describe("admin validation", () => {
  const draft: CampaignDraft = {
    name: "Cement suppliers",
    slug: "cement-suppliers",
    campaign_type: "internal",
    status: "draft",
    format: "native",
    headline: "Cement prices move",
    description: "Check before you order.",
    cta_label: "See prices",
    destination_url: "/marketplace?category=cement",
    advertiser_name: "FRELUX",
    image_url: "",
    image_alt: "",
    is_sponsored: false,
    target_markets: ["ALL"],
    placements: ["calculator_results"],
    target_tools: ["cement"],
    target_categories: [],
    target_devices: ["desktop", "mobile"],
    priority: 50,
    starts_at: null,
    ends_at: null,
  };

  it("accepts a clean draft", () => {
    expect(validateCampaign(draft)).toEqual([]);
  });

  it("refuses javascript: destinations", () => {
    expect(safeDestination("javascript:alert(1)")).toBe(false);
    expect(safeDestination("http://insecure.example")).toBe(false);
    expect(safeDestination("https://supplier.example/offer")).toBe(true);
    expect(safeDestination("/pricing")).toBe(true);
  });

  it("requires alt text on a banner image", () => {
    expect(
      validateCampaign({
        ...draft,
        format: "banner",
        image_url: "https://cdn.example/banner.jpg",
      }),
    ).toContain("An image banner needs alt text describing the image.");
  });

  it("requires an advertiser name for a sponsored campaign", () => {
    expect(
      validateCampaign({ ...draft, is_sponsored: true, advertiser_name: "" }),
    ).toContain("A sponsored campaign must name the advertiser.");
  });

  it("refuses a campaign that ends before it starts", () => {
    expect(
      validateCampaign({
        ...draft,
        starts_at: "2026-11-10",
        ends_at: "2026-11-01",
      }),
    ).toContain("The campaign cannot end before it starts.");
  });

  it("refuses a campaign with no placement", () => {
    expect(validateCampaign({ ...draft, placements: [] })).toContain(
      "Choose at least one placement.",
    );
  });

  it("refuses an overlong headline so it stays readable on a phone", () => {
    expect(
      validateCampaign({ ...draft, headline: "x".repeat(100) }),
    ).toHaveLength(1);
  });
});
