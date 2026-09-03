import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getMonetagZone,
  getMonetagSdkUrl,
  showMonetagRewardedAd,
  MONETAG_DEFAULT_ZONE_ID,
} from "@/lib/monetag-rewarded";
import type { DbAdProvider } from "@/types/database";

function makeProvider(overrides: Partial<DbAdProvider> = {}): DbAdProvider {
  return {
    id: "monetag-1",
    name: "Monetag",
    slug: "monetag",
    provider_type: "mixed",
    is_active: true,
    priority: 99,
    credentials: {},
    settings: {},
    is_system: false,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("getMonetagZone", () => {
  it("falls back to the default zone when no credentials are set", () => {
    expect(getMonetagZone(makeProvider())).toBe(MONETAG_DEFAULT_ZONE_ID);
    expect(getMonetagZone(null)).toBe(MONETAG_DEFAULT_ZONE_ID);
    expect(getMonetagZone()).toBe(MONETAG_DEFAULT_ZONE_ID);
  });

  it("prefers the provider zone_id credential over the default", () => {
    const provider = makeProvider({
      credentials: { zone_id: "999888" },
    });
    expect(getMonetagZone(provider)).toBe("999888");
  });

  it("reads the zone from provider settings when credentials are empty", () => {
    const provider = makeProvider({
      settings: { zone_id: "777666" },
    });
    expect(getMonetagZone(provider)).toBe("777666");
  });
});

describe("getMonetagSdkUrl", () => {
  it("returns null when no sdk_url credential is set", () => {
    expect(getMonetagSdkUrl(makeProvider())).toBeNull();
    expect(getMonetagSdkUrl(null)).toBeNull();
  });

  it("returns a valid https SDK url from credentials", () => {
    const provider = makeProvider({
      credentials: { sdk_url: "https://cdn.example.com/sdk.js" },
    });
    expect(getMonetagSdkUrl(provider)).toBe("https://cdn.example.com/sdk.js");
  });

  it("rejects non-https SDK urls", () => {
    const provider = makeProvider({
      credentials: { sdk_url: "http://insecure.example.com/sdk.js" },
    });
    expect(getMonetagSdkUrl(provider)).toBeNull();
  });
});

describe("showMonetagRewardedAd", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the SDK path when show_<zone> is already available", async () => {
    const zone = "275352";
    const showFn = vi.fn(() =>
      Promise.resolve({ reward_event_type: "valued", estimated_price: 0.0042 }),
    );
    (window as unknown as Record<string, unknown>)[`show_${zone}`] = showFn;

    const result = await showMonetagRewardedAd({
      zone,
      ymid: "ch_test",
      requestVar: "advanced_calculator",
    });

    expect(result.mode).toBe("sdk");
    expect(result.valued).toBe(true);
    expect(result.estimatedPrice).toBe(0.0042);
    expect(showFn).toHaveBeenCalledWith({
      type: "end",
      ymid: "ch_test",
      requestVar: "advanced_calculator",
    });

    delete (window as unknown as Record<string, unknown>)[`show_${zone}`];
  });

  it("falls back to tag mode when no SDK is available", async () => {
    const pending = showMonetagRewardedAd({
      zone: "275352",
      ymid: "ch_test",
      minWatchTimeMs: 0,
    });
    // jsdom does not fire script onload — dispatch it manually
    document
      .querySelector(
        'script[data-monetag-src="https://quge5.com/88/tag.min.js"]',
      )
      ?.dispatchEvent(new Event("load"));
    const result = await pending;

    expect(result.mode).toBe("tag");
    expect(result.valued).toBeNull();

    const tag = document.querySelector(
      'script[data-monetag-src="https://quge5.com/88/tag.min.js"]',
    );
    expect(tag).not.toBeNull();
    expect(tag?.getAttribute("data-zone")).toBe("275352");
    expect(tag?.getAttribute("data-domain")).toBe("quge5.com");
  });

  it("does not inject a duplicate tag script on subsequent calls", async () => {
    const first = showMonetagRewardedAd({ zone: "275352", minWatchTimeMs: 0 });
    document
      .querySelector(
        'script[data-monetag-src="https://quge5.com/88/tag.min.js"]',
      )
      ?.dispatchEvent(new Event("load"));
    await first;

    // Second call must resolve via dedup without a second injection
    await showMonetagRewardedAd({ zone: "275352", minWatchTimeMs: 0 });

    const tags = document.querySelectorAll(
      'script[data-monetag-src="https://quge5.com/88/tag.min.js"]',
    );
    expect(tags.length).toBe(1);
  });

  it("resolves scripts that have already loaded without re-injecting", async () => {
    const existing = document.createElement("script");
    existing.setAttribute(
      "data-monetag-src",
      "https://quge5.com/88/tag.min.js",
    );
    document.head.appendChild(existing);

    const result = await showMonetagRewardedAd({ zone: "275352", minWatchTimeMs: 0 });
    expect(result.mode).toBe("tag");

    const tags = document.querySelectorAll("[data-monetag-src]");
    expect(tags.length).toBe(1);
  });
});
