import { describe, expect, it } from "vitest";
import { boqTaxLabel } from "../boq-tax-label";
import { ALL_20_MARKETS } from "@/lib/international/engine-inventory-types";

describe("boqTaxLabel — per-market tax naming (Wave 1.2)", () => {
  it("labels every one of the 20 markets without falling back", () => {
    for (const cc of ALL_20_MARKETS) {
      const label = boqTaxLabel(cc);
      expect(label.long.length, `${cc} long`).toBeGreaterThan(0);
      expect(label.short.length, `${cc} short`).toBeGreaterThan(0);
      // Presentation only: never claims a rate.
      expect(label.short).not.toMatch(/%\d|\d%/);
    }
  });

  it.each([
    ["NG", "VAT"],
    ["GB", "VAT"],
    ["DE", "MwSt"],
    ["AT", "USt"],
    ["FR", "TVA"],
    ["IT", "IVA"],
    ["MX", "IVA"],
    ["IN", "GST"],
    ["AU", "GST"],
    ["CA", "GST"],
    ["US", "Sales Tax"],
    ["JP", "消費税"],
    ["KR", "부가세"],
    ["CN", "VAT"],
    ["ID", "PPN"],
    ["BR", "ISS"],
  ])("%s -> %s", (cc, short) => {
    expect(boqTaxLabel(cc).short).toBe(short);
  });

  it("DACH markets carry the bilingual long form", () => {
    expect(boqTaxLabel("DE").long).toContain("Umsatzsteuer");
    expect(boqTaxLabel("DE").long).toContain("Mehrwertsteuer");
  });

  it("unknown markets get the NEUTRAL label — never a specific scheme presented as fact", () => {
    expect(boqTaxLabel("ZZ").short).toBe("Tax");
    expect(boqTaxLabel(null).short).toBe("Tax");
    expect(boqTaxLabel("").short).toBe("Tax");
  });

  it("is case/space tolerant", () => {
    expect(boqTaxLabel(" de ").short).toBe("MwSt");
  });
});
