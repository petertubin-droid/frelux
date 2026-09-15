// Multi-provider candidate chain (owner directive 2026-09-15): the
// rewarded stack must never depend on a single provider (Monetag).
// These tests pin the selection semantics used by Rewards.tsx,
// rewarded-access.ts, and hasRewardedAdProvider().
import { describe, it, expect } from "vitest";
import {
  REWARDED_AD_BRIDGES,
  getRewardedAdCandidates,
  getBridgedAdCandidates,
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

describe("getBridgedAdCandidates", () => {
  it("returns active bridged providers only", () => {
    const providers = [
      makeProvider({ id: "a", slug: "monetag" }),
      makeProvider({ id: "b", slug: "google_adsense" }),
      makeProvider({ id: "c", slug: "taboola", is_active: false }),
      makeProvider({ id: "d", slug: "adsterra" }), // active but no bridge
    ];
    const candidates = getBridgedAdCandidates(providers);
    expect(candidates.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("orders candidates by priority (lower first)", () => {
    const providers = [
      makeProvider({ id: "hi", slug: "monetag", priority: 10 }),
      makeProvider({ id: "lo", slug: "google_adsense", priority: 2 }),
    ];
    expect(getBridgedAdCandidates(providers).map((p) => p.id)).toEqual([
      "lo",
      "hi",
    ]);
  });

  it("treats missing priority as lowest priority", () => {
    const providers = [
      makeProvider({ id: "p1", slug: "monetag", priority: 1 }),
      makeProvider({ id: "np", slug: "google_adsense", priority: undefined }),
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
      priority: 1,
    });
    const chain = getUnlockProviderChain([other], primary, fallback);
    expect(chain.map((p) => p.id)).toEqual(["primary", "fallback", "other"]);
  });

  it("falls back to priority-ordered bridged providers without config", () => {
    const providers = [
      makeProvider({ id: "lo", slug: "monetag", priority: 1 }),
      makeProvider({ id: "hi", slug: "google_adsense", priority: 7 }),
    ];
    expect(
      getUnlockProviderChain(providers, null, null).map((p) => p.id),
    ).toEqual(["lo", "hi"]);
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
  });
});
