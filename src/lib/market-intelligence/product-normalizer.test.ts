import { describe, it, expect } from "vitest";
import {
  extractPackageInfo,
  extractBrand,
  normalizeProductName,
  classifyCategory,
  normalizeProduct,
  calculateUnitPrice,
} from "./product-normalizer";

describe("market-intelligence/product-normalizer", () => {
  it("extractPackageInfo detects kg packages", () => {
    const result = extractPackageInfo("Cement 50kg Bag");
    expect(result.size).toBe(50);
    expect(result.unit).toBe("kg");
    expect(result.confidence).toBe("high");
  });

  it("extractPackageInfo detects litres", () => {
    const result = extractPackageInfo("Paint 20 Litres");
    expect(result.size).toBe(20);
    expect(result.unit).toBe("litres");
    expect(result.confidence).toBe("high");
  });

  it("extractPackageInfo returns nulls for no package info", () => {
    const result = extractPackageInfo("Cement Bag");
    expect(result.size).toBeNull();
    expect(result.unit).toBeNull();
  });

  it("extractBrand finds known brands", () => {
    expect(extractBrand("Dulux Premium Paint 20L")).toBeTruthy();
    expect(extractBrand("Lafarge Cement 50kg")).toBeTruthy();
  });

  it("extractBrand returns null for unknown", () => {
    expect(extractBrand("Generic Product")).toBeNull();
  });

  it("normalizeProductName cleans up spacing and casing", () => {
    expect(normalizeProductName("  Paint   20  Litres  ")).toBe(
      "Paint 20 litres",
    );
    expect(normalizeProductName("CEMENT 50KG BAG")).toBe("CEMENT 50KG bag");
  });

  it("classifyCategory identifies categories", () => {
    expect(classifyCategory("Dulux Paint 20 Litres")).toBeTruthy();
    expect(classifyCategory("Cement 50kg Bag")).toBeTruthy();
    expect(classifyCategory("Unknown Product")).toBeNull();
  });

  it("normalizeProduct combines all normalizations", () => {
    const result = normalizeProduct("Dulux Premium Paint 20 Litres");
    expect(result.normalized_name).toBeTruthy();
    expect(result.normalized_brand).toBeTruthy();
    expect(result.normalized_category).toBeTruthy();
    expect(result.normalized_package_size).toBe(20);
  });

  it("calculateUnitPrice returns null for no package size", () => {
    const result = calculateUnitPrice(5000, null, null);
    expect(result.calculable).toBe(false);
    expect(result.per_kg).toBeNull();
    expect(result.per_litre).toBeNull();
  });

  it("calculateUnitPrice calculates per kg", () => {
    const result = calculateUnitPrice(5000, 50, "kg");
    expect(result.calculable).toBe(true);
    expect(result.per_kg).toBe(100);
  });

  it("calculateUnitPrice calculates per litre", () => {
    const result = calculateUnitPrice(8000, 20, "litres");
    expect(result.calculable).toBe(true);
    expect(result.per_litre).toBe(400);
  });

  it("calculateUnitPrice returns not calculable for unknown unit", () => {
    const result = calculateUnitPrice(5000, 10, "pieces");
    expect(result.calculable).toBe(false);
  });
});
