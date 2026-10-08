import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase-lazy", () => {
  const mockData = { current: { providers: [], placements: [] } };
  const mockFrom = vi.fn((_table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: mockData.current.providers,
            error: null,
          }),
        ),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
  }));
  return {
    getSupabase: vi.fn(() => Promise.resolve({ from: mockFrom })),
    isSupabaseConfigured: true,
    _mockData: mockData,
    _mockFrom: mockFrom,
  };
});

import {
  fetchAdConfig,
  getProvidersForPlacement,
  getPlacement,
  shouldDisplayPlacement,
  getAdUnitId,
  getProviderDefaultDisplayUnit,
  getEffectiveAdUnitId,
  clearAdConfigCache,
  logAdEvent,
} from "./ad-config";
import type { DbAdProvider, DbAdPlacement } from "@/types/database";

function makeProvider(id: string, priority = 0): DbAdProvider {
  return {
    id,
    name: `Provider ${id}`,
    slug: `prov-${id}`,
    provider_type: "adsense",
    is_active: true,
    priority,
    config: {},
    created_at: "",
    updated_at: "",
  } as unknown as DbAdProvider;
}

function makePlacement(
  key: string,
  opts?: Partial<DbAdPlacement>,
): DbAdPlacement {
  return {
    id: "1",
    placement_key: key,
    placement_type: "banner",
    is_active: true,
    provider_ids: [],
    ad_unit_ids: {},
    display_rules: { mobile: true, desktop: true },
    created_at: "",
    updated_at: "",
    ...opts,
  } as unknown as DbAdPlacement;
}

describe("ad-config", () => {
  beforeEach(() => {
    clearAdConfigCache();
  });

  it("fetchAdConfig returns providers and placements", async () => {
    const result = await fetchAdConfig(true);
    expect(result).toHaveProperty("providers");
    expect(result).toHaveProperty("placements");
  });

  it("getPlacement finds by key", () => {
    const placements = [makePlacement("banner_top"), makePlacement("sidebar")];
    const found = getPlacement("banner_top", placements);
    expect(found?.placement_key).toBe("banner_top");
  });

  it("getPlacement returns null for missing key", () => {
    expect(getPlacement("nonexistent", [])).toBeNull();
  });

  it("getProvidersForPlacement returns empty for unknown placement", () => {
    expect(getProvidersForPlacement("unknown", [], [])).toEqual([]);
  });

  it("getProvidersForPlacement returns all providers when no explicit provider_ids", () => {
    const providers = [makeProvider("1", 1), makeProvider("2", 2)];
    const placements = [makePlacement("banner")];
    const result = getProvidersForPlacement("banner", providers, placements);
    expect(result.length).toBe(2);
  });

  it("getProvidersForPlacement respects explicit provider_ids order", () => {
    const providers = [makeProvider("1"), makeProvider("2"), makeProvider("3")];
    const placements = [
      makePlacement("banner", { provider_ids: ["3", "1"] } as unknown as never),
    ];
    const result = getProvidersForPlacement("banner", providers, placements);
    expect(result.map((p) => p.id)).toEqual(["3", "1"]);
  });

  it("shouldDisplayPlacement returns true for desktop on desktop", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });
    const placement = makePlacement("banner");
    expect(shouldDisplayPlacement(placement)).toBe(true);
  });

  it("shouldDisplayPlacement returns false for desktop-only on mobile", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    const placement = makePlacement("banner", {
      display_rules: { mobile: false, desktop: true },
    } as unknown as never);
    expect(shouldDisplayPlacement(placement)).toBe(false);
  });

  it("getAdUnitId returns ID for known provider", () => {
    const placement = makePlacement("banner", {
      ad_unit_ids: { adsense: "ca-pub-123" },
    } as unknown as never);
    expect(getAdUnitId(placement, "adsense")).toBe("ca-pub-123");
  });

  it("getAdUnitId returns null for unknown provider", () => {
    const placement = makePlacement("banner");
    expect(getAdUnitId(placement, "unknown")).toBeNull();
  });

  it("logAdEvent does not throw", async () => {
    await expect(
      logAdEvent({ event_type: "impression" }),
    ).resolves.not.toThrow();
  });

  it("clearAdConfigCache clears cache", () => {
    clearAdConfigCache();
    // Should not throw
    expect(() => clearAdConfigCache()).not.toThrow();
  });
});

// ── Automatic fill helpers (owner directive 2026-10-08) ──────────────
describe("automatic default display unit", () => {
  const provider: DbAdProvider = {
    id: "prov-adsense",
    name: "Google AdSense",
    slug: "google_adsense",
    provider_type: "display",
    is_active: true,
    priority: 1,
    credentials: {
      publisher_id: "ca-pub-1",
      default_display_unit_id: " 9876543210 ",
    },
    settings: {},
    is_system: true,
    created_at: "",
    updated_at: "",
  };

  const placement: DbAdPlacement = {
    id: "pl-1",
    placement_key: "k",
    placement_name: "K",
    placement_type: "banner",
    page_target: "global",
    is_active: true,
    provider_ids: [],
    ad_unit_ids: { "prov-adsense": "111111" },
    display_rules: {
      mobile: true,
      desktop: true,
      refresh_seconds: 0,
      min_height: 0,
    },
    sort_order: 0,
    created_at: "",
    updated_at: "",
  };

  it("returns the trimmed provider default unit", () => {
    expect(getProviderDefaultDisplayUnit(provider)).toBe("9876543210");
  });

  it("falls back across default unit credential keys", () => {
    const alt: DbAdProvider = {
      ...provider,
      credentials: { default_zone_id: "abc123" },
    };
    expect(getProviderDefaultDisplayUnit(alt)).toBe("abc123");
  });

  it("returns null when no default exists", () => {
    const bare: DbAdProvider = {
      ...provider,
      credentials: { publisher_id: "ca-pub-1" },
    };
    expect(getProviderDefaultDisplayUnit(bare)).toBeNull();
  });

  it("effective unit prefers the per-placement mapping", () => {
    expect(getEffectiveAdUnitId(placement, provider)).toBe("111111");
    expect(
      getEffectiveAdUnitId({ ...placement, ad_unit_ids: {} }, provider),
    ).toBe("9876543210");
  });
});
