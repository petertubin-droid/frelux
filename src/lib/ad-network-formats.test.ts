import { describe, expect, it } from "vitest";
import {
  getAdsterraNativeBannerKey,
  normalizeAdsterraServeDomain,
  getAdsterraSiteWideScripts,
  getMonetagAutoZoneScripts,
  resolveAdsterraScriptUrl,
  displayAdsEnabled,
} from "@/lib/ad-network-formats";
import type { DbAdProvider } from "@/types/database";

const baseProvider = {
  id: "p",
  name: "Adsterra",
  slug: "adsterra",
  provider_type: "display",
  is_active: true,
  priority: 1,
  credentials: {},
  settings: {},
  is_system: true,
  created_at: "",
  updated_at: "",
} as unknown as DbAdProvider;

describe("ad-network-formats — Adsterra script resolution", () => {
  it("constructs invoke.js URL from a bare 32-hex key", () => {
    const key = "a".repeat(32);
    expect(
      resolveAdsterraScriptUrl(key, {
        serveDomain: "www.highperformanceformat.com",
        defaultScript: "invoke.js",
      }),
    ).toBe(`https://www.highperformanceformat.com/${key}/invoke.js`);
  });

  it("constructs native.js URL with the native default script", () => {
    const key = "b".repeat(32);
    expect(
      resolveAdsterraScriptUrl(key, {
        serveDomain: "www.highperformanceformat.com",
        defaultScript: "native.js",
      }),
    ).toBe(`https://www.highperformanceformat.com/${key}/native.js`);
  });

  it("accepts a pasted full URL on an allowed serve host", () => {
    const key = "c".repeat(32);
    expect(
      resolveAdsterraScriptUrl(
        `//pl12345678.profitabledisplaynetwork.com/${key}/social-bar.js`,
        {
          serveDomain: "www.highperformanceformat.com",
          defaultScript: "invoke.js",
        },
      ),
    ).toBe(
      `https://pl12345678.profitabledisplaynetwork.com/${key}/social-bar.js`,
    );
  });

  it("accepts the configured serve domain even if unusual", () => {
    const key = "d".repeat(32);
    expect(
      resolveAdsterraScriptUrl(`https://my.cdn.example.com/${key}/invoke.js`, {
        serveDomain: "my.cdn.example.com",
        defaultScript: "invoke.js",
      }),
    ).toBe(`https://my.cdn.example.com/${key}/invoke.js`);
  });

  it("rejects URLs on non-Adsterra hosts (injection safety)", () => {
    expect(
      resolveAdsterraScriptUrl("https://evil.example.com/aaa/invoke.js", {
        serveDomain: "www.highperformanceformat.com",
        defaultScript: "invoke.js",
      }),
    ).toBeNull();
  });

  it("rejects http, query strings and malformed paths", () => {
    const key = "e".repeat(32);
    expect(
      resolveAdsterraScriptUrl(
        `http://www.highperformanceformat.com/${key}/invoke.js`,
        {
          serveDomain: "www.highperformanceformat.com",
          defaultScript: "invoke.js",
        },
      ),
    ).toBeNull();
    expect(
      resolveAdsterraScriptUrl(
        `https://www.highperformanceformat.com/${key}/invoke.js?x=1`,
        {
          serveDomain: "www.highperformanceformat.com",
          defaultScript: "invoke.js",
        },
      ),
    ).toBeNull();
    expect(
      resolveAdsterraScriptUrl(
        "https://www.highperformanceformat.com/invoke.js",
        {
          serveDomain: "www.highperformanceformat.com",
          defaultScript: "invoke.js",
        },
      ),
    ).toBeNull();
  });

  it("extracts the script URL from a pasted dashboard snippet", () => {
    expect(
      resolveAdsterraScriptUrl(
        '<script src="https://pl31194885.profitableratecpmnetwork.com/e0/57/7c/e0577c7805ee22e869f94c6eb77e0205.js"></script>',
        {
          serveDomain: "www.highperformanceformat.com",
          defaultScript: "invoke.js",
        },
      ),
    ).toBe(
      "https://pl31194885.profitableratecpmnetwork.com/e0/57/7c/e0577c7805ee22e869f94c6eb77e0205.js",
    );
  });

  it("accepts bare hashed-path social bar URLs on allowed hosts", () => {
    expect(
      resolveAdsterraScriptUrl(
        "https://pl31194885.profitableratecpmnetwork.com/e0/57/7c/e0577c7805ee22e869f94c6eb77e0205.js",
        {
          serveDomain: "www.highperformanceformat.com",
          defaultScript: "invoke.js",
        },
      ),
    ).toBe(
      "https://pl31194885.profitableratecpmnetwork.com/e0/57/7c/e0577c7805ee22e869f94c6eb77e0205.js",
    );
  });

  it("rejects script tags without a usable URL", () => {
    expect(
      resolveAdsterraScriptUrl("evil<script>alert(1)</script>", {
        serveDomain: "www.highperformanceformat.com",
        defaultScript: "invoke.js",
      }),
    ).toBeNull();
  });

  it("rejects non-key garbage values", () => {
    expect(
      resolveAdsterraScriptUrl("evil<script>alert(1)</script>", {
        serveDomain: "www.highperformanceformat.com",
        defaultScript: "invoke.js",
      }),
    ).toBeNull();
    expect(
      resolveAdsterraScriptUrl("", {
        serveDomain: "www.highperformanceformat.com",
        defaultScript: "invoke.js",
      }),
    ).toBeNull();
    expect(
      resolveAdsterraScriptUrl(null as never, {
        serveDomain: "www.highperformanceformat.com",
        defaultScript: "invoke.js",
      }),
    ).toBeNull();
  });
});

describe("ad-network-formats — site-wide Adsterra scripts", () => {
  it("returns nothing when credentials are empty (dormant)", () => {
    expect(
      getAdsterraSiteWideScripts(baseProvider, "www.highperformanceformat.com"),
    ).toEqual([]);
  });

  it("resolves interstitial, popunder and social bar from keys", () => {
    const provider = {
      ...baseProvider,
      credentials: {
        interstitial_key: "1".repeat(32),
        popunder_key: "2".repeat(32),
        social_bar_key:
          "https://www.highperformanceformat.com/" +
          "3".repeat(32) +
          "/invoke.js",
      },
    };
    const scripts = getAdsterraSiteWideScripts(
      provider,
      "www.highperformanceformat.com",
    );
    expect(scripts).toHaveLength(3);
    expect(scripts.map((s) => s.format)).toEqual([
      "interstitial",
      "popunder",
      "social_bar",
    ]);
    expect(scripts[0].src).toContain(`/${"1".repeat(32)}/invoke.js`);
    expect(scripts[2].src).toContain(`/${"3".repeat(32)}/invoke.js`);
  });

  it("skips everything when display ads are disabled", () => {
    const provider = {
      ...baseProvider,
      settings: { display_ads_enabled: false },
      credentials: { interstitial_key: "1".repeat(32) },
    };
    expect(
      getAdsterraSiteWideScripts(provider, "www.highperformanceformat.com"),
    ).toEqual([]);
    expect(displayAdsEnabled(provider)).toBe(false);
    expect(displayAdsEnabled(baseProvider)).toBe(true);
  });
});

describe("ad-network-formats — native banner key", () => {
  it("extracts the key from a pasted dashboard snippet", () => {
    const key = "60c8524034bf047ff03e21ffec6aa01b";
    expect(
      getAdsterraNativeBannerKey({
        ...baseProvider,
        credentials: {
          native_banner_key: `<script async="async" data-cfasync="false" src="https://pl31194884.profitableratecpmnetwork.com/${key}/invoke.js"></script> <div id="container-${key}"></div>`,
        },
      }),
    ).toBe(key);
  });

  it("returns the key only for valid hex values", () => {
    expect(getAdsterraNativeBannerKey(baseProvider)).toBeNull();
    expect(
      getAdsterraNativeBannerKey({
        ...baseProvider,
        credentials: { native_banner_key: "f".repeat(32) },
      }),
    ).toBe("f".repeat(32));
    expect(
      getAdsterraNativeBannerKey({
        ...baseProvider,
        credentials: { native_banner_key: "not-hex!" },
      }),
    ).toBeNull();
  });
});

describe("ad-network-formats — Monetag auto zones", () => {
  it("returns nothing without credentials (dormant)", () => {
    const monetagProvider = { ...baseProvider, slug: "monetag" };
    expect(getMonetagAutoZoneScripts(monetagProvider)).toEqual([]);
  });

  it("resolves interstitial, popunder and vignette zones", () => {
    const monetagProvider = {
      ...baseProvider,
      slug: "monetag",
      credentials: {
        interstitial_zone_id: "275353",
        popunder_zone_id: "275354",
        vignette_zone_id: "275355",
      },
    };
    const zones = getMonetagAutoZoneScripts(monetagProvider);
    expect(zones).toHaveLength(3);
    expect(zones.map((z) => z.format)).toEqual([
      "interstitial",
      "popunder",
      "vignette",
    ]);
    expect(zones[0]).toEqual({
      format: "interstitial",
      zone: "275353",
      src: "https://quge5.com/88/tag.min.js",
    });
    // numeric credential values are coerced cleanly
    expect(zones[1].zone).toBe("275354");
  });

  it("rejects non-numeric zone values (injection safety)", () => {
    const monetagProvider = {
      ...baseProvider,
      slug: "monetag",
      credentials: { popunder_zone_id: "abc-def" },
    };
    expect(getMonetagAutoZoneScripts(monetagProvider)).toEqual([]);
  });
});

describe("ad-network-formats — Adsterra serve domain normalization", () => {
  it("accepts all live dashboard serve hosts", () => {
    expect(normalizeAdsterraServeDomain("www.highrevenueformat.com")).toBe(
      "www.highrevenueformat.com",
    );
    expect(
      normalizeAdsterraServeDomain("https://www.profitableratecpmnetwork.com"),
    ).toBe("www.profitableratecpmnetwork.com");
    expect(
      normalizeAdsterraServeDomain("pl31194882.profitableratecpmnetwork.com"),
    ).toBe("pl31194882.profitableratecpmnetwork.com");
  });

  it("falls back to the default host for unknown domains", () => {
    expect(normalizeAdsterraServeDomain("evil.example.com")).toBe(
      "www.highperformanceformat.com",
    );
  });
});
