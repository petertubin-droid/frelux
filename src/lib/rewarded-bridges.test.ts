// Multi-provider candidate chain (owner directive 2026-09-15): the
// rewarded stack must never depend on a single provider (Monetag).
// These tests pin the selection semantics used by Rewards.tsx,
// rewarded-access.ts, and hasRewardedAdProvider().
import { describe, it, expect } from "vitest";
import {
  REWARDED_AD_BRIDGES,
  getRewardedAdCandidates,
  getBridgedAdCandidates,
  getCreditRewardCandidates,
  getUnlockProviderChain,
} from "./rewarded-bridges";
import type { DbAdProvider } from "@/types/database";

function makeProvider(overrides: Partial<DbAdProvider>): DbAdProvider {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Test",
    slug: "monetag",
    provider_type: "display",
    is_active: true,
    priority: 5,
    credentials: {},
    settings: {},
    is_system: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as DbAdProvider;
}

describe("getCreditRewardCandidates", () => {
  it("returns only active ayeT providers configured for verified credit grants", () => {
    const providers = [
      makeProvider({ id: "a", slug: "monetag" }),
      makeProvider({
        id: "b",
        slug: "google_adsense",
        settings: { rewarded_ads: true, adsense_h5_approval_confirmed: true },
      }),
      makeProvider({
        id: "ayet",
        slug: "ayet_studios",
        provider_type: "rewarded",
        credentials: { placement_id: "123" },
        settings: {
          rewarded_video_enabled: true,
          rewarded_adslot_name: "credits",
          rewarded_adslot_id: "456",
        },
      }),
      makeProvider({ id: "c", slug: "taboola", is_active: false }),
      makeProvider({ id: "d", slug: "adsterra" }),
    ];
    const candidates = getCreditRewardCandidates(providers);
    expect(candidates.map((p) => p.id)).toEqual(["ayet"]);
  });

  it("requires complete ayeT configuration before exposing credit rewards", () => {
    const incomplete = makeProvider({
      id: "ayet-incomplete",
      slug: "ayet_studios",
      provider_type: "rewarded",
      settings: {
        rewarded_video_enabled: true,
        rewarded_adslot_name: "credits",
        rewarded_adslot_id: "456",
      },
    });
    const complete = makeProvider({
      id: "ayet-ready",
      slug: "ayet_studios",
      provider_type: "rewarded",
      credentials: { placement_id: "123" },
      settings: {
        rewarded_video_enabled: true,
        rewarded_adslot_name: "credits",
        rewarded_adslot_id: "456",
      },
    });
    expect(getCreditRewardCandidates([incomplete])).toEqual([]);
    expect(getCreditRewardCandidates([complete]).map((p) => p.id)).toEqual([
      "ayet-ready",
    ]);
  });

  it("keeps AdSense out of reward candidates until approval is confirmed", () => {
    const pending = makeProvider({
      id: "pending-adsense",
      slug: "google_adsense",
      settings: { rewarded_ads: true, adsense_h5_approval_confirmed: false },
    });
    expect(getCreditRewardCandidates([pending])).toEqual([]);
  });

  it("orders candidates by priority (lower first)", () => {
    const providers = [
      makeProvider({ id: "hi", slug: "monetag", priority: 10 }),
      makeProvider({
        id: "lo",
        slug: "google_adsense",
        priority: 2,
        settings: { rewarded_ads: true, adsense_h5_approval_confirmed: true },
      }),
    ];
    expect(getBridgedAdCandidates(providers).map((p) => p.id)).toEqual([
      "lo",
      "hi",
    ]);
  });

  it("treats missing priority as lowest priority", () => {
    const providers = [
      makeProvider({ id: "p1", slug: "monetag", priority: 1 }),
      makeProvider({
        id: "np",
        slug: "google_adsense",
        priority: undefined,
        settings: { rewarded_ads: true, adsense_h5_approval_confirmed: true },
      }),
    ];
    expect(getBridgedAdCandidates(providers).map((p) => p.id)).toEqual([
      "p1",
      "np",
    ]);
  });
});

describe("getRewardedAdCandidates", () => {
  it("includes offerwall providers alongside bridged ones", () => {
    const providers = [
      makeProvider({ id: "m", slug: "monetag", priority: 1 }),
      makeProvider({
        id: "o",
        slug: "adgate_media",
        provider_type: "rewarded",
        priority: 2,
      }),
      makeProvider({ id: "x", slug: "taboola" }),
    ];
    const candidates = getRewardedAdCandidates(providers);
    expect(candidates.map((p) => p.id)).toEqual(["m", "o"]);
  });
});

describe("getUnlockProviderChain", () => {
  it("puts the configured primary and fallback first", () => {
    const primary = makeProvider({
      id: "primary",
      slug: "google_adsense",
      settings: { rewarded_ads: true, adsense_h5_approval_confirmed: true },
      priority: 9,
    });
    const fallback = makeProvider({
      id: "fallback",
      slug: "monetag",
      priority: 8,
    });
    const other = makeProvider({
      id: "other",
      slug: "google_adsense",
      settings: { rewarded_ads: true, adsense_h5_approval_confirmed: true },
      priority: 1,
    });
    const chain = getUnlockProviderChain([other], primary, fallback);
    expect(chain.map((p) => p.id)).toEqual(["primary", "fallback", "other"]);
  });

  it("excludes AdSense until its H5 Games approval is confirmed", () => {
    const providers = [
      makeProvider({ id: "lo", slug: "monetag", priority: 1 }),
      makeProvider({ id: "pending", slug: "google_adsense", priority: 7 }),
    ];
    expect(
      getUnlockProviderChain(providers, null, null).map((p) => p.id),
    ).toEqual(["lo"]);
  });

  it("dedupes by id", () => {
    const p = makeProvider({ id: "same", slug: "monetag", priority: 1 });
    expect(getUnlockProviderChain([p], p, p).map((x) => x.id)).toEqual([
      "same",
    ]);
  });
});

describe("REWARDED_AD_BRIDGES registry", () => {
  it("ships bridges for every provider the system depends on", () => {
    expect(Object.keys(REWARDED_AD_BRIDGES)).toContain("monetag");
    expect(Object.keys(REWARDED_AD_BRIDGES)).toContain("google_adsense");
    expect(Object.keys(REWARDED_AD_BRIDGES)).toContain("ayet_studios");
  });
});
