import { describe, it, expect, vi, beforeEach } from "vitest";
import { defaultMapOpening, isWorldView, WORLD_VIEW } from "@/lib/map/defaults";

const state = vi.hoisted(() => ({
  stored: null as null | { name: string; lat: number; lon: number },
  market: null as string | null,
  marketCity: null as null | { name: string; lat: number; lon: number },
}));

vi.mock("@/lib/weather-locations", () => ({
  readStoredWeatherLocation: () => state.stored,
  currentMarketCode: () => state.market,
  defaultWeatherLocationForMarket: () => state.marketCity,
}));

describe("map opening frame", () => {
  beforeEach(() => {
    state.stored = null;
    state.market = null;
    state.marketCity = null;
  });

  it("opens on the visitor's saved place when they have one", () => {
    state.stored = { name: "Nairobi", lat: -1.29, lon: 36.82 };
    expect(defaultMapOpening()).toMatchObject({
      lat: -1.29,
      lon: 36.82,
      source: "saved-place",
      label: "Nairobi",
    });
  });

  it("otherwise opens on the market's reference city", () => {
    state.market = "GB";
    state.marketCity = { name: "London", lat: 51.5, lon: -0.12 };
    expect(defaultMapOpening()).toMatchObject({
      lat: 51.5,
      lon: -0.12,
      source: "market",
    });
  });

  it("falls back to the whole globe when nothing local is known", () => {
    const opening = defaultMapOpening();
    expect(opening).toEqual(WORLD_VIEW);
    expect(isWorldView(opening)).toBe(true);
    expect(state.stored).toBeNull();
  });
});
