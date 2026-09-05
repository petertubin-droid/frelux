import { describe, expect, it } from "vitest";

describe("adsense-rewarded", () => {
  it("registers the AdSense H5 rewarded bridge alongside Monetag", async () => {
    const { REWARDED_AD_BRIDGES } = await import("@/lib/rewarded-access");
    expect(Object.keys(REWARDED_AD_BRIDGES)).toContain("monetag");
    expect(Object.keys(REWARDED_AD_BRIDGES)).toContain("google_adsense");
    expect(typeof REWARDED_AD_BRIDGES.google_adsense).toBe("function");
  });

  it("rejects cleanly when rewarded_ads is disabled in provider settings", async () => {
    const { REWARDED_AD_BRIDGES } = await import("@/lib/rewarded-access");
    const provider = {
      id: "p",
      name: "AdSense",
      slug: "google_adsense",
      provider_type: "display",
      is_active: true,
      priority: 1,
      credentials: { publisher_id: "ca-pub-1234567890123456" },
      settings: {},
      is_system: true,
      created_at: "",
      updated_at: "",
    } as never;
    await expect(
      REWARDED_AD_BRIDGES.google_adsense(provider, {
        ymid: "u1",
        toolKey: "tool",
      }),
    ).rejects.toThrow(/disabled/i);
  });

  it("rejects an invalid publisher ID before loading any script", async () => {
    const { showAdsenseRewardedAd } = await import("@/lib/adsense-rewarded");
    await expect(
      showAdsenseRewardedAd({ publisherId: "not-a-pub-id" }),
    ).rejects.toThrow(/configured correctly/i);
  });
});
