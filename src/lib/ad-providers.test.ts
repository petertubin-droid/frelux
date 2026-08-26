import { describe, it, expect } from "vitest";
import {
  getProviderSchema,
  BUILTIN_PROVIDERS,
  AD_PLACEMENT_TYPES,
  AD_PAGE_TARGETS,
  REWARDED_FEATURES,
  PLACEMENT_TYPE_LABELS,
  PAGE_TARGET_LABELS,
} from "@/lib/ad-providers";

describe("ad-providers — constants", () => {
  it("BUILTIN_PROVIDERS is a non-empty array", () => {
    expect(Array.isArray(BUILTIN_PROVIDERS)).toBe(true);
    expect(BUILTIN_PROVIDERS.length).toBeGreaterThan(0);
  });

  it("each builtin provider has slug and name", () => {
    for (const p of BUILTIN_PROVIDERS) {
      expect(p.slug).toBeTruthy();
      expect(p.name).toBeTruthy();
    }
  });

  it("AD_PLACEMENT_TYPES contains expected types", () => {
    expect(AD_PLACEMENT_TYPES).toContain("banner");
    expect(AD_PLACEMENT_TYPES).toContain("rewarded");
    expect(AD_PLACEMENT_TYPES).toContain("interstitial");
    expect(AD_PLACEMENT_TYPES.length).toBeGreaterThanOrEqual(4);
  });

  it("AD_PAGE_TARGETS contains expected targets", () => {
    expect(AD_PAGE_TARGETS).toContain("home");
    expect(AD_PAGE_TARGETS).toContain("calculator");
    expect(AD_PAGE_TARGETS.length).toBeGreaterThanOrEqual(5);
  });

  it("REWARDED_FEATURES is non-empty with keys and names", () => {
    expect(REWARDED_FEATURES.length).toBeGreaterThan(0);
    for (const f of REWARDED_FEATURES) {
      expect(f.key).toBeTruthy();
      expect(f.name).toBeTruthy();
    }
  });

  it("PLACEMENT_TYPE_LABELS covers all placement types", () => {
    for (const type of AD_PLACEMENT_TYPES) {
      expect(PLACEMENT_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it("PAGE_TARGET_LABELS covers all page targets", () => {
    for (const target of AD_PAGE_TARGETS) {
      expect(PAGE_TARGET_LABELS[target]).toBeTruthy();
    }
  });
});

describe("ad-providers — getProviderSchema", () => {
  it("returns schema for known provider slug", () => {
    const slug = BUILTIN_PROVIDERS[0].slug;
    const schema = getProviderSchema(slug);
    expect(schema).not.toBeNull();
    expect(schema!.slug).toBe(slug);
  });

  it("returns null for unknown slug", () => {
    expect(getProviderSchema("nonexistent_provider_xyz")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getProviderSchema("")).toBeNull();
  });

  it("returns correct schema for each builtin provider", () => {
    for (const p of BUILTIN_PROVIDERS) {
      const schema = getProviderSchema(p.slug);
      expect(schema).not.toBeNull();
      expect(schema!.name).toBe(p.name);
    }
  });
});
