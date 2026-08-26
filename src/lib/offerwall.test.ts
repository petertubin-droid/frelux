import { describe, it, expect } from "vitest";
import { generateOfferwallUrl, supportsOfferwall } from "@/lib/offerwall";
import type { DbAdProvider } from "@/types/database";

function makeProvider(overrides: Partial<DbAdProvider> = {}): DbAdProvider {
  return {
    id: "test-id",
    name: "Test Provider",
    slug: "adgate_media",
    provider_type: "rewarded",
    is_active: true,
    priority: 1,
    credentials: {},
    settings: {},
    is_system: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const OFFERWALL_SLUGS = [
  "adgate_media",
  "offertoro",
  "adgem",
  "cpx_research",
  "ayet_studios",
  "revu",
  "wannads",
  "my_lead",
  "adwork_media",
  "revenuehits",
  "notik",
  "bitcot",
];

describe("offerwall — supportsOfferwall", () => {
  it("returns true for all known offerwall providers", () => {
    for (const slug of OFFERWALL_SLUGS) {
      expect(supportsOfferwall(makeProvider({ slug }))).toBe(true);
    }
  });

  it("returns false for non-offerwall providers", () => {
    expect(supportsOfferwall(makeProvider({ slug: "google_admob" }))).toBe(
      false,
    );
    expect(supportsOfferwall(makeProvider({ slug: "unknown_provider" }))).toBe(
      false,
    );
  });
});

describe("offerwall — generateOfferwallUrl", () => {
  it("returns null for unknown provider slug", () => {
    const result = generateOfferwallUrl(
      makeProvider({ slug: "unknown" }),
      "client123",
      "paint-calc",
    );
    expect(result).toBeNull();
  });

  it("returns null for mobile-only providers like google_admob", () => {
    const result = generateOfferwallUrl(
      makeProvider({ slug: "google_admob" }),
      "client123",
      "paint-calc",
    );
    expect(result).toBeNull();
  });

  it("generates AdGate Media URL with gateway_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "adgate_media",
        credentials: { gateway_id: "gw_123" },
      }),
      "client_hash_abc",
      "estimation",
    );
    expect(result).not.toBeNull();
    expect(result!.url).toContain("adgatemedia.com");
    expect(result!.url).toContain("af=gw_123");
    expect(result!.url).toContain("user=client_hash_abc");
    expect(result!.providerSlug).toBe("adgate_media");
    expect(result!.width).toBe("100%");
  });

  it("returns null for AdGate Media without gateway_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({ slug: "adgate_media", credentials: {} }),
      "client123",
      "paint-calc",
    );
    expect(result).toBeNull();
  });

  it("generates OfferToro URL with pub_id and app_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "offertoro",
        credentials: { pub_id: "pub_123", app_id: "app_456" },
      }),
      "user_hash",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    expect(result!.url).toContain("offertoro.com");
    expect(result!.url).toContain("pub=pub_123");
    expect(result!.url).toContain("app_id=app_456");
    expect(result!.url).toContain("user_id=user_hash");
  });

  it("returns null for OfferToro missing app_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({ slug: "offertoro", credentials: { pub_id: "pub_123" } }),
      "user_hash",
      "paint-calc",
    );
    expect(result).toBeNull();
  });

  it("generates CPX Research URL with app_id and secure_hash", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "cpx_research",
        credentials: { app_id: "cpx_app", secure_hash: "hash_secret" },
      }),
      "client123",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    expect(result!.url).toContain("cpx-research.com");
    expect(result!.url).toContain("app_id=cpx_app");
    expect(result!.url).toContain("ext_user_id=client123");
    expect(result!.url).toContain("secure_hash=hash_secret");
  });

  it("generates AdGem URL with placement_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({ slug: "adgem", credentials: { placement_id: "plc_001" } }),
      "client123",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    expect(result!.url).toContain("adgaterewards.com");
    expect(result!.url).toContain("placement=plc_001");
  });

  it("generates Ayet Studios URL with app_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "ayet_studios",
        credentials: { app_id: "ayet_app" },
      }),
      "client123",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    expect(result!.url).toContain("ayetstudios.com");
    expect(result!.url).toContain("appid=ayet_app");
  });

  it("generates RevU URL with api_key and placement_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "revu",
        credentials: { api_key: "key_123", placement_id: "plc_456" },
      }),
      "client123",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    expect(result!.url).toContain("revu.tv");
    expect(result!.url).toContain("api_key=key_123");
    expect(result!.url).toContain("placement_id=plc_456");
  });

  it("generates Wannads URL with api_key and sub_id", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "wannads",
        credentials: { api_key: "key_123", sub_id: "sub_456" },
      }),
      "client123",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    expect(result!.url).toContain("wannads.com");
    expect(result!.url).toContain("key=key_123");
    expect(result!.url).toContain("subid=sub_456");
  });

  it("includes provider name in result", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "adgate_media",
        name: "My Ad Provider",
        credentials: { gateway_id: "gw_1" },
      }),
      "client123",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    expect(result!.providerName).toBe("My Ad Provider");
  });

  it("URL-encodes the client hash", () => {
    const result = generateOfferwallUrl(
      makeProvider({
        slug: "adgate_media",
        credentials: { gateway_id: "gw_1" },
      }),
      "client+with+spaces+%26+special!",
      "paint-calc",
    );
    expect(result).not.toBeNull();
    // URLSearchParams encodes spaces as + and & as %26
    expect(result!.url).toContain("client%2Bwith%2Bspaces");
  });
});
