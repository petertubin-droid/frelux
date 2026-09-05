import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getMonetagZone,
  getMonetagDisplayZone,
  getMonetagNativeZone,
  getMonetagSdkUrl,
  showMonetagRewardedAd,
  getMonetagSdkZone,
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
  it("returns null when no zone is configured — no hardcoded fallback", () => {
    // The zone ID must ONLY ever come from Admin → Ads configuration.
    expect(getMonetagZone(makeProvider())).toBeNull();
    expect(getMonetagZone(null)).toBeNull();
    expect(getMonetagZone()).toBeNull();
  });

  it("prefers the provider zone_id credential", () => {
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

  it("prefers the dedicated rewarded zone over the shared display zone", () => {
    const provider = makeProvider({
      credentials: { zone_id: "275352", rewarded_zone_id: "11712895" },
      settings: { zone_id: "275352" },
    });
    expect(getMonetagZone(provider)).toBe("11712895");
  });

  it("falls back to the shared zone_id when no rewarded zone is set", () => {
    const provider = makeProvider({
      credentials: { zone_id: "275352" },
    });
    expect(getMonetagZone(provider)).toBe("275352");
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

describe("getMonetagSdkZone", () => {
  it("derives the zone from the SDK script URL path", () => {
    expect(getMonetagSdkZone("https://omg10.com/4/11712895")).toBe("11712895");
    expect(getMonetagSdkZone("https://example.com/loader/4242424")).toBe(
      "4242424",
    );
  });

  it("returns null for URLs without an embedded zone", () => {
    expect(getMonetagSdkZone("https://omg10.com/4/abc")).toBeNull();
    expect(getMonetagSdkZone(null)).toBeNull();
    expect(getMonetagSdkZone(undefined)).toBeNull();
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
    const zone = "123456";
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
      zone: "123456",
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
    expect(tag?.getAttribute("data-zone")).toBe("123456");
    expect(tag?.getAttribute("data-domain")).toBe("quge5.com");
  });

  it("does not inject a duplicate tag script on subsequent calls", async () => {
    const first = showMonetagRewardedAd({ zone: "123456", minWatchTimeMs: 0 });
    document
      .querySelector(
        'script[data-monetag-src="https://quge5.com/88/tag.min.js"]',
      )
      ?.dispatchEvent(new Event("load"));
    await first;

    // Second call must resolve via dedup without a second injection
    await showMonetagRewardedAd({ zone: "123456", minWatchTimeMs: 0 });

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

    const result = await showMonetagRewardedAd({
      zone: "123456",
      minWatchTimeMs: 0,
    });
    expect(result.mode).toBe("tag");

    const tags = document.querySelectorAll("[data-monetag-src]");
    expect(tags.length).toBe(1);
  });
});

describe("getMonetagDisplayZone (website tag data-zone)", () => {
  const base = {
    slug: "monetag",
    is_active: true,
    credentials: {
      format: "275352",
      sdk_url: "https://omg10.com/4/11712895",
      zone_id: "275352",
      rewarded_zone_id: "11712895",
    },
    settings: { sub_id: "11718645", display_ads_enabled: true },
  };

  const make = (overrides: Record<string, unknown> = {}): DbAdProvider =>
    ({
      id: "prov-1",
      name: "Monetag",
      provider_type: "rewarded",
      priority: 99,
      ...base,
      ...overrides,
    }) as unknown as DbAdProvider;

  it("uses the display Zone ID, never the rewarded SDK zone", () => {
    expect(getMonetagDisplayZone(make())).toBe("275352");
  });

  it("falls back to the legacy `format` credential when zone_id is absent", () => {
    const legacy = make({
      credentials: { format: "275352", rewarded_zone_id: "11712895" },
    });
    expect(getMonetagDisplayZone(legacy)).toBe("275352");
  });

  it("returns null when no display zone is configured", () => {
    const bare = make({ credentials: { rewarded_zone_id: "11712895" } });
    expect(getMonetagDisplayZone(bare)).toBeNull();
    expect(getMonetagDisplayZone(null)).toBeNull();
  });

  it("never leaks the rewarded zone or sub_id into the display tag", () => {
    const tricky = make({
      credentials: { rewarded_zone_id: "11712895" },
      settings: { sub_id: "11718645" },
    });
    expect(getMonetagDisplayZone(tricky)).toBeNull();
  });
});

describe("getMonetagNativeZone (in-page Native Banner zone)", () => {
  it("returns null when no native zone is configured — dormant by default", () => {
    expect(getMonetagNativeZone(makeProvider())).toBeNull();
  });

  it("returns the zone only for numeric zone IDs", () => {
    expect(
      getMonetagNativeZone(
        makeProvider({ credentials: { native_banner_zone_id: "7654321" } }),
      ),
    ).toBe("7654321");
    expect(
      getMonetagNativeZone(
        makeProvider({ credentials: { native_banner_zone_id: " 7654321 " } }),
      ),
    ).toBe("7654321");
  });

  it("rejects non-numeric garbage (injection safety)", () => {
    expect(
      getMonetagNativeZone(
        makeProvider({ credentials: { native_banner_zone_id: "alert(1)" } }),
      ),
    ).toBeNull();
    expect(
      getMonetagNativeZone(
        makeProvider({
          credentials: {
            native_banner_zone_id: "<script src=evil.example></script>",
          },
        }),
      ),
    ).toBeNull();
  });
});
