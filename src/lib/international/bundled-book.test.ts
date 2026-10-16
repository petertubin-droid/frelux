import { describe, it, expect, beforeEach, vi } from "vitest";

// The bundled book serves only when the Supabase project is not
// configured. These tests exercise the offline book explicitly, so the
// configured flag is forced off regardless of ambient build env (the
// production build may carry live connection vars) and nothing hits
// the network.
import { shouldUseBundledBook } from "@/lib/international/bundled-book";

vi.mock("@/lib/supabase", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/supabase")>();
  return { ...mod, isSupabaseConfigured: false };
});

const roleImport = () => import("@/lib/estimation/market-materials");
const structuralImport = () => import("@/lib/estimation/structural-market");
const queriesImport = () => import("@/lib/queries");

describe("bundled static price book", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("declares whether it must serve (DB not configured)", () => {
    expect(typeof shouldUseBundledBook()).toBe("boolean");
  });

  it("serves real role-mapped US materials with provenance", async () => {
    const { resolveMaterialPriceByRole } = await roleImport();
    const resolved = await resolveMaterialPriceByRole("concrete-mix", "US");
    expect(resolved).not.toBeNull();
    expect(resolved!.resolved_market).toBe("US");
    expect(resolved!.material.name).toContain("Quikrete");
    expect(resolved!.price.price).toBeGreaterThan(0);
    expect(resolved!.price.currency).toBe("USD");
    expect(resolved!.price.notes).toContain("[bundled static price book]");
  });

  it("resolves NG reference prices for the NG market", async () => {
    const { resolveMaterialPriceByRole } = await roleImport();
    const resolved = await resolveMaterialPriceByRole("concrete-mix", "NG");
    expect(resolved).not.toBeNull();
    expect(resolved!.price.currency).toBe("NGN");
  });

  it("returns null for a role with no mapping - never guesses", async () => {
    const { resolveMaterialPriceByRole } = await roleImport();
    const resolved = await resolveMaterialPriceByRole(
      "not-a-real-role" as never,
      "US",
    );
    expect(resolved).toBeNull();
  });

  it("resolves DE cement through the structural resolver offline", async () => {
    const { resolveMarketCement } = await structuralImport();
    const cement = await resolveMarketCement("DE");
    expect(cement).not.toBeNull();
    expect(cement!.bookPrice).toBeGreaterThan(0);
    expect(cement!.packKg).toBeGreaterThan(0);
    expect(Number.isFinite(cement!.price50kgBasis)).toBe(true);
  });

  it("serves POP materials market-first with NG fallback flag", async () => {
    const { fetchPopMaterials } = await queriesImport();
    const us = await fetchPopMaterials(undefined, "US");
    if (us.data.length > 0 && !us.fellBackToNg) {
      expect(us.data.every((m) => m.market === "US")).toBe(true);
    }
    const fallback = await fetchPopMaterials(undefined, "NG");
    expect(fallback.fellBackToNg).toBe(true);
    expect(fallback.data.length).toBeGreaterThan(0);
  });

  it("presents EVERY website market in the bundled book (whole-market rule)", async () => {
    const { BUILTIN_MARKET_PROFILES } =
      await import("@/lib/international/market-context");
    const { BUNDLED_MARKET_PRESENTATION } =
      await import("@/lib/international/bundled-price-books");
    for (const m of BUILTIN_MARKET_PROFILES) {
      const entry = BUNDLED_MARKET_PRESENTATION[m.country_code];
      expect(
        entry,
        `website market ${m.country_code} missing from the bundled book presentation`,
      ).toBeDefined();
      expect(entry.pricedMaterials).toBeGreaterThanOrEqual(0);
      if (entry.priceStatus === "verified_book") {
        expect(entry.pricedMaterials).toBeGreaterThan(0);
      } else {
        // pending markets are present with zero counts — never fabricated
        expect(entry.pricedMaterials).toBe(0);
      }
    }
  });

  it("carries real verified CN prices (electrical + doors books)", async () => {
    const { BUNDLED_MARKET_PRESENTATION, getBundledPrice } =
      await import("@/lib/international/bundled-price-books");
    expect(BUNDLED_MARKET_PRESENTATION.CN.priceStatus).toBe("verified_book");
    const cable = getBundledPrice("elec-cable-lighting", "CN");
    expect(cable).not.toBeNull();
    expect(cable!.c).toBe("CNY");
    expect(cable!.p).toBeGreaterThan(0);
    expect(cable!.f).toBe("manual");
  });

  it("serves tile materials market-first with NG fallback flag", async () => {
    const { fetchTileMaterials } = await queriesImport();
    const ng = await fetchTileMaterials(undefined, "NG");
    expect(ng.fellBackToNg).toBe(true);
    expect(ng.data.length).toBeGreaterThan(0);
  });
});
