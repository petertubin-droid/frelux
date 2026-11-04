import { describe, expect, it } from "vitest";
import {
  LITRES_PER_US_GALLON,
  US_FIVE_GALLON_LITRES,
  US_QUART_LITRES,
  marketSellsPaintByGallon,
  paintPackLabel,
  paintPackNoun,
  resolvePaintPackLitres,
  resolvePaintPacks,
} from "@/lib/estimation/paint-packaging";
import { getPackSizeLitres } from "@/lib/estimation/paint-engine";
import type { EstimationCalcRule, EstimationProduct } from "@/types/estimation";

const bucketRule: EstimationCalcRule = {
  id: "r1",
  calculator_type: "painting",
  rule_key: "pack_size_bucket_litres",
  rule_value: { litres: 20 },
  description: null,
  is_active: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
} as unknown as EstimationCalcRule;

describe("paint packaging by market", () => {
  it("buys metric markets in 20 L buckets", () => {
    for (const market of ["NG", "GB", "CA", "AU", "ZA", null, undefined]) {
      expect(marketSellsPaintByGallon(market)).toBe(false);
      expect(resolvePaintPackLitres(market)).toBe(20);
    }
  });

  it("buys US markets by the gallon", () => {
    expect(marketSellsPaintByGallon("US")).toBe(true);
    expect(resolvePaintPackLitres("US")).toBeCloseTo(US_FIVE_GALLON_LITRES, 6);
    const packs = resolvePaintPacks("US");
    expect(packs.map((p) => p.label)).toEqual(["1 qt", "1 gal", "5 gal"]);
    // the ladder must be real volumes, not round numbers
    expect(packs[0].litres).toBeCloseTo(US_QUART_LITRES, 6);
    expect(packs[1].litres).toBeCloseTo(LITRES_PER_US_GALLON, 6);
    expect(packs[2].litres).toBeCloseTo(18.927, 3);
  });

  it("names containers the way the market names them", () => {
    expect(paintPackLabel(18.92705892, "US")).toBe("5 gal");
    expect(paintPackLabel(3.785411784, "US")).toBe("1 gal");
    expect(paintPackLabel(20, "US")).toBe("20 L");
    expect(paintPackLabel(20, "NG")).toBe("20 L");
    expect(paintPackNoun(18.92705892, "US")).toBe("drum");
    expect(paintPackNoun(3.785411784, "US")).toBe("can");
    expect(paintPackNoun(20, "NG")).toBe("bucket");
  });

  it("never invents a container name for an unusual volume", () => {
    expect(paintPackLabel(7.5, "US")).toBe("7.5 L");
    expect(paintPackNoun(7.5, "US")).toBe("container");
    expect(paintPackLabel(0, "US")).toBe("");
  });
});

describe("engine pack size resolution", () => {
  it("keeps the 20 L rule for metric markets", () => {
    expect(getPackSizeLitres(null, bucketRule, "NG")).toBe(20);
    expect(getPackSizeLitres(null, null, "GB")).toBe(20);
  });

  it("refuses to quote a 20 L bucket in a gallon market", () => {
    const litres = getPackSizeLitres(null, bucketRule, "US");
    expect(litres).toBeCloseTo(US_FIVE_GALLON_LITRES, 6);
    expect(litres).not.toBe(20);
  });

  it("still lets a product row declare its own container", () => {
    const product = {
      standard_pack_size: 3.785411784,
    } as unknown as EstimationProduct;
    expect(getPackSizeLitres(product, bucketRule, "US")).toBeCloseTo(
      LITRES_PER_US_GALLON,
      6,
    );
  });

  it("does not change behaviour when no market is supplied", () => {
    expect(getPackSizeLitres(null, bucketRule)).toBe(20);
    expect(getPackSizeLitres(null, null)).toBe(20);
  });
});
