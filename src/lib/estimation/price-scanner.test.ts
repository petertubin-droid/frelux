import { describe, it, expect } from "vitest";
import { FALLBACK_PRICES, scanMaterialPrices } from "./price-scanner";

describe("estimation/price-scanner", () => {
  it("FALLBACK_PRICES has cement, block, sand, granite", () => {
    expect(FALLBACK_PRICES.cement_per_bag).toBeTruthy();
    expect(FALLBACK_PRICES.cement_per_bag.price).toBe(8500);
    expect(FALLBACK_PRICES.block_per_piece.price).toBe(450);
    expect(FALLBACK_PRICES.sand_per_m3).toBeTruthy();
    expect(FALLBACK_PRICES.granite_per_m3).toBeTruthy();
  });

  it("FALLBACK_PRICES has rebar entries", () => {
    expect(FALLBACK_PRICES.rebar_12mm_per_length.price).toBe(11500);
    expect(FALLBACK_PRICES.rebar_16mm_per_length.price).toBe(18500);
    expect(FALLBACK_PRICES.rebar_20mm_per_length.price).toBe(27000);
    expect(FALLBACK_PRICES.rebar_25mm_per_length.price).toBe(40000);
  });

  it("every catalog entry has a unit, a name and a material slug", () => {
    for (const [_key, val] of Object.entries(FALLBACK_PRICES)) {
      expect(val.unit.length).toBeGreaterThan(0);
      expect(val.name.length).toBeGreaterThan(0);
      expect(val.slug.length).toBeGreaterThan(0);
      // price is a positive reference OR null (no reference — admin must enter)
      if (val.price !== null) expect(val.price).toBeGreaterThan(0);
    }
  });

  it("catalog entries without a reference price are explicitly null, never guessed", () => {
    // Tier 2 electrical materials are tracked but unpriced by design
    expect(FALLBACK_PRICES.elec_cable_lighting.price).toBeNull();
    expect(FALLBACK_PRICES.elec_breaker.price).toBeNull();
    expect(FALLBACK_PRICES.elec_cable_lighting.slug).toBe(
      "elec-cable-lighting",
    );
  });

  it("scanMaterialPrices returns a deterministic report of every entry", async () => {
    const report = await scanMaterialPrices({});
    expect(report.materials_scanned).toBe(Object.keys(FALLBACK_PRICES).length);
    expect(report.results.length).toBe(Object.keys(FALLBACK_PRICES).length);
    expect(report.currency).toBe("NGN");
    expect(report.market_region).toBe("Nigeria");
    expect(report.materials_failed).toBe(0);
  });

  it("is deterministic — the same inputs produce the identical report twice", async () => {
    const a = await scanMaterialPrices({ "cement-per-bag": 9000 });
    const b = await scanMaterialPrices({ "cement-per-bag": 9000 });
    expect(
      a.results.map((r) => [
        r.material_key,
        r.configured_price,
        r.reference_price,
        r.change_percent,
      ]),
    ).toEqual(
      b.results.map((r) => [
        r.material_key,
        r.configured_price,
        r.reference_price,
        r.change_percent,
      ]),
    );
  });

  it("compares configured prices (keyed by slug) against the reference", async () => {
    const report = await scanMaterialPrices({ "cement-per-bag": 8000 });
    const cement = report.results.find(
      (r) => r.material_key === "cement_per_bag",
    );
    expect(cement).toBeTruthy();
    expect(cement!.configured_price).toBe(8000);
    expect(cement!.reference_price).toBe(8500);
    // (8500 − 8000) / 8000 = +6.25%
    expect(cement!.change_percent).toBe(6.25);
  });

  it("unconfigured materials are reported as NOT CONFIGURED, never priced", async () => {
    const report = await scanMaterialPrices({});
    const cement = report.results.find(
      (r) => r.material_key === "cement_per_bag",
    );
    expect(cement!.configured_price).toBeNull();
    expect(cement!.change_percent).toBeNull();
    expect(report.materials_unconfigured).toBeGreaterThan(0);
    // the reference is still shown for the admin to verify — not applied silently
    expect(cement!.reference_price).toBe(8500);
  });

  it("an entry with no reference reports low confidence and asks for admin entry", async () => {
    const report = await scanMaterialPrices({});
    const cable = report.results.find(
      (r) => r.material_key === "elec_cable_lighting",
    );
    expect(cable!.reference_price).toBeNull();
    expect(cable!.confidence).toBe("low");
  });
});

describe("estimation/price-scanner US catalog", () => {
  it("US_REFERENCE_PRICES covers the real US product set with slugs", async () => {
    const { US_REFERENCE_PRICES } =
      await import("@/lib/estimation/price-scanner");
    expect(Object.keys(US_REFERENCE_PRICES).length).toBeGreaterThanOrEqual(14);
    for (const entry of Object.values(US_REFERENCE_PRICES)) {
      expect(entry.slug).toBeTruthy();
      expect(entry.unit).toBeTruthy();
      expect(entry.name).toBeTruthy();
    }
  });

  it("US catalog prices are the verified retail values, never guesses", async () => {
    const { US_REFERENCE_PRICES } =
      await import("@/lib/estimation/price-scanner");
    expect(US_REFERENCE_PRICES.us_concrete_mix_bag.price).toBe(7.97);
    expect(US_REFERENCE_PRICES.us_behr_interior_gal.price).toBe(39.2);
    expect(US_REFERENCE_PRICES.us_zinsser_123_quart.price).toBe(16.97);
    expect(US_REFERENCE_PRICES.us_rmr86_gal.price).toBe(32.99);
  });

  it("US entries without a verified price are null (admin must enter)", async () => {
    const { US_REFERENCE_PRICES } =
      await import("@/lib/estimation/price-scanner");
    expect(US_REFERENCE_PRICES.us_sand_50lb.price).toBeNull();
    expect(US_REFERENCE_PRICES.us_kilz2_gal.price).toBeNull();
  });

  it("scanMaterialPrices reviews the US catalog when market is US", async () => {
    const { scanMaterialPrices } =
      await import("@/lib/estimation/price-scanner");
    const report = await scanMaterialPrices({}, { market: "US" });
    expect(report.currency).toBe("USD");
    expect(report.market_region).toBe("United States");
    expect(
      report.results.some(
        (r) => r.material_slug === "us-quikrete-concrete-80lb",
      ),
    ).toBe(true);
    expect(report.results.every((r) => r.source.includes("US retail"))).toBe(
      true,
    );
  });

  it("defaults to the NG catalog so existing behaviour is unchanged", async () => {
    const { scanMaterialPrices } =
      await import("@/lib/estimation/price-scanner");
    const report = await scanMaterialPrices({}, {});
    expect(report.currency).toBe("NGN");
    expect(
      report.results.some((r) => r.material_slug === "cement-per-bag"),
    ).toBe(true);
  });
});
