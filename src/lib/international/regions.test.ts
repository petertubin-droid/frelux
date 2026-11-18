import { describe, it, expect } from "vitest";
import * as regions from "@/lib/international/regions";

describe("region data integrity", () => {
  it("exports only non-empty unique string arrays", () => {
    const arrays = Object.entries(regions).filter(([, v]) =>
      Array.isArray(v),
    ) as [string, string[]][];
    expect(arrays.length).toBeGreaterThanOrEqual(3);
    for (const [name, arr] of arrays) {
      expect(arr.length).toBeGreaterThan(0);
      for (const r of arr) expect(typeof r).toBe("string");
      expect(new Set(arr).size).toBe(arr.length);
      expect(name.length).toBeGreaterThan(0);
    }
  });
  it("Ghana regions include Greater Accra and Ashanti", () => {
    const gh = (regions as any).GHANA_REGIONS as string[];
    expect(gh).toContain("Greater Accra");
    expect(gh).toContain("Ashanti");
  });
  it("Kenya counties include the 47-county set markers", () => {
    const ke = (regions as any).KENYA_COUNTIES as string[];
    expect(ke).toContain("Nairobi");
    expect(ke).toContain("Kajiado");
  });
});

describe("getRegions", () => {
  it("resolves structured regions for supported markets", () => {
    expect(regions.getRegions("NG")).toContain("Lagos");
    expect(regions.getRegions("US")).toContain("California");
    expect(regions.getRegions("GB")).toContain("England");
    expect(regions.getRegions("CA")).toContain("Ontario");
    expect(regions.getRegions("AU")).toContain("New South Wales");
    expect(regions.getRegions("GH")).toContain("Greater Accra");
    expect(regions.getRegions("KE")).toContain("Nairobi");
    expect(regions.getRegions("ZA")).toContain("Gauteng");
  });

  it("returns null for unsupported or empty markets", () => {
    expect(regions.getRegions("")).toBeNull();
    expect(regions.getRegions("DE")).toBeNull();
    expect(regions.getRegions("JP")).toBeNull();
    expect(regions.getRegions("ZZ")).toBeNull();
  });
});
