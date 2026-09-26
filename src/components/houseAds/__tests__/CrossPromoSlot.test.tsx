/**
 * Tests for the frelux house-ad system: Heartsyncx promoted across
 * Frelux with an admin-configurable base URL (for the upcoming custom
 * domain) plus external partner promos, all driven by the
 * `house_cross_promo` ad_providers row through the public ad-config
 * fetch. Clicks must be tracked as cross_promo_click.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/ad-config", () => ({
  fetchAdConfig: vi.fn(),
  clearAdConfigCache: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

import { fetchAdConfig } from "@/lib/ad-config";
import { track } from "@/lib/analytics";
import CrossPromoSlot, {
  buildPromoItems,
} from "@/components/houseAds/CrossPromoSlot";
import {
  normalizeBaseUrl,
  housePromoConfigFrom,
  HOUSE_PROMO_SLUG,
  DEFAULT_CROSS_PROMO_BASE_URL,
  type HousePromoSettings,
} from "@/lib/house-promo";
import type { DbAdProvider } from "@/types/database";

const mockedFetch = vi.mocked(fetchAdConfig);
const mockedTrack = vi.mocked(track);

function makeProvider(overrides: Partial<DbAdProvider> = {}): DbAdProvider {
  return {
    id: "house-1",
    name: "House Cross-Promo",
    slug: HOUSE_PROMO_SLUG,
    provider_type: "native",
    is_active: true,
    priority: 99,
    credentials: {},
    settings: {},
    is_system: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function activeSettings(
  overrides: Partial<HousePromoSettings> = {},
): HousePromoSettings {
  return {
    enabled: true,
    format: "card",
    baseUrl: DEFAULT_CROSS_PROMO_BASE_URL,
    externalPromos: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedTrack.mockReset();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

describe("normalizeBaseUrl", () => {
  it("defaults to the Heartsyncx production URL when empty", () => {
    expect(normalizeBaseUrl("")).toBe(DEFAULT_CROSS_PROMO_BASE_URL);
    expect(normalizeBaseUrl(undefined)).toBe(DEFAULT_CROSS_PROMO_BASE_URL);
  });

  it("adds https:// when missing and strips trailing slashes", () => {
    expect(normalizeBaseUrl("heartsyncx.com")).toBe("https://heartsyncx.com");
    expect(normalizeBaseUrl("https://heartsyncx.com/")).toBe(
      "https://heartsyncx.com",
    );
    expect(normalizeBaseUrl("heartsyncx.com///")).toBe(
      "https://heartsyncx.com",
    );
  });
});

describe("buildPromoItems", () => {
  it("points every sister destination at the admin-configured base URL", () => {
    const items = buildPromoItems(
      activeSettings({ baseUrl: "https://heartsyncx.custom.com" }),
    );
    expect(items.length).toBeGreaterThan(3);
    for (const item of items) {
      expect(item.site).toBe("sister");
      expect(item.url.startsWith("https://heartsyncx.custom.com/")).toBe(true);
      expect(item.domain).toBe("heartsyncx.custom.com");
    }
  });

  it("appends enabled external promos after the sister destinations", () => {
    const items = buildPromoItems(
      activeSettings({
        externalPromos: [
          {
            id: "ext-1",
            enabled: true,
            label: "Buy building materials online",
            url: "buildmart.example.com",
            blurb: "Cement delivered same-day",
            owner_name: "BuildMart",
          },
          {
            id: "ext-2",
            enabled: false,
            label: "Disabled partner",
            url: "https://off.example.com",
            blurb: "",
            owner_name: "",
          },
        ],
      }),
    );
    const external = items.filter((i) => i.site === "external");
    expect(external).toHaveLength(1);
    expect(external[0].label).toBe("Buy building materials online");
    expect(external[0].url).toBe("https://buildmart.example.com");
    expect(external[0].domain).toBe("buildmart.example.com");
    expect(external[0].owner).toBe("BuildMart");
    // sister destinations come first
    expect(items[0].site).toBe("sister");
  });
});

describe("housePromoConfigFrom", () => {
  it("returns null when the house row is missing or inactive", () => {
    expect(housePromoConfigFrom(null)).toBeNull();
    expect(housePromoConfigFrom([])).toBeNull();
    expect(
      housePromoConfigFrom([makeProvider({ is_active: false })]),
    ).toBeNull();
  });

  it("parses format, base URL and external promos from the row", () => {
    const cfg = housePromoConfigFrom([
      makeProvider({
        settings: {
          format: "banner",
          base_url: "heartsyncx.custom.com",
          external_promos: [
            {
              id: "ext-9",
              enabled: true,
              label: "Partner",
              url: "https://partner.example.com",
              blurb: "b",
              owner_name: "Partner Co",
            },
          ],
        },
      }),
    ]);
    expect(cfg).not.toBeNull();
    expect(cfg!.format).toBe("banner");
    expect(cfg!.baseUrl).toBe("https://heartsyncx.custom.com");
    expect(cfg!.externalPromos).toHaveLength(1);
    expect(cfg!.externalPromos[0].owner_name).toBe("Partner Co");
  });
});

describe("CrossPromoSlot", () => {
  it("renders nothing until the house row is active in the DB", async () => {
    mockedFetch.mockResolvedValue({
      providers: [makeProvider({ is_active: false })],
      placements: [],
    });
    const { container } = render(
      <CrossPromoSlot slotIndex={0} source="test" />,
    );
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    await waitFor(() => {
      // inactive → slot stays empty and never shows promo chrome
      expect(screen.queryByText(/Recommended for you/i)).toBeNull();
    });
    expect(container.querySelector("[class*='card']")).toBeNull();
  });

  it("uses the configured base URL and tracks clicks on sister promos", async () => {
    mockedFetch.mockResolvedValue({
      providers: [
        makeProvider({
          settings: {
            format: "banner",
            base_url: "https://heartsyncx.custom.com",
          },
        }),
      ],
      placements: [],
    });
    render(<CrossPromoSlot slotIndex={0} source="home_1" />);

    const headline = await screen.findByRole("button", {
      name: /relationship insight that hits home/i,
    });
    expect(
      screen.getAllByText(/heartsyncx\.custom\.com/i).length,
    ).toBeGreaterThan(0);
    headline.click();
    expect(mockedTrack).toHaveBeenCalledWith("cross_promo_click", {
      target_site: "heartsyncx",
      target_url: expect.stringMatching(/^https:\/\/heartsyncx\.custom\.com\//),
      promo_slot: "home_1",
    });
    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/heartsyncx\.custom\.com\//),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("features an external partner promo in the rotation and opens its URL", async () => {
    mockedFetch.mockResolvedValue({
      providers: [
        makeProvider({
          settings: {
            format: "banner",
            external_promos: [
              {
                id: "ext-1",
                enabled: true,
                label: "Buy building materials online",
                url: "https://buildmart.example.com",
                blurb: "Cement delivered same-day",
                owner_name: "BuildMart",
              },
            ],
          },
        }),
      ],
      placements: [],
    });
    // 5 sister destinations + 1 external → index 5 lands on the partner
    render(<CrossPromoSlot slotIndex={5} source="home_2" />);

    const headline = await screen.findByRole("button", {
      name: /Buy building materials online/i,
    });
    expect(screen.getByText(/Cement delivered same-day/i)).toBeTruthy();
    headline.click();
    expect(mockedTrack).toHaveBeenCalledWith("cross_promo_click", {
      target_site: "buildmart.example.com",
      target_url: "https://buildmart.example.com",
      promo_slot: "home_2",
    });
    expect(window.open).toHaveBeenCalledWith(
      "https://buildmart.example.com",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
