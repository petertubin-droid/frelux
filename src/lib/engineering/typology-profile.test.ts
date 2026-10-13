import { describe, it, expect } from "vitest";
import { resolveTypologyProfile, listTypologyMarkets } from "../engineering/typology-profile";

describe("typology profiles", () => {
  it("NG baseline options are preserved exactly", () => {
    const ng = resolveTypologyProfile("NG");
    expect(ng.typologies.map((t) => t.typeCode)).toEqual([
      "bungalow", "duplex", "two_storey", "apartment", "office", "shop",
    ]);
    expect(ng.defaultType).toBe("bungalow");
    expect(ng.confidence).toBe("verified");
  });

  it("all 20 mandate markets are profiled with sources", () => {
    const markets = listTypologyMarkets().map((m) => m.code);
    expect(markets).toHaveLength(20);
    for (const code of markets) {
      const p = resolveTypologyProfile(code);
      expect(p.typologies.length).toBeGreaterThanOrEqual(2);
      expect(p.defaultType).toBeTruthy();
      expect(p.source.length).toBeGreaterThan(15);
      expect(p.confidence).not.toBe("pending_verification");
    }
  });

  it("market typologies use local dominant forms", () => {
    expect(resolveTypologyProfile("GB").defaultType).toBe("semi_detached");
    expect(resolveTypologyProfile("JP").typologies[0].label).toContain("Detached two-storey");
    expect(resolveTypologyProfile("KR").defaultType).toBe("apartment");
    expect(resolveTypologyProfile("AU").typologies[0].label).toContain("Separate house");
    expect(resolveTypologyProfile("DE").typologies[0].label).toContain("Einfamilienhaus");
    expect(resolveTypologyProfile("BR").typologies.map((t) => t.typeCode)).toContain("sobrado");
    expect(resolveTypologyProfile("KE").typologies.map((t) => t.typeCode)).toContain("maisonette");
    expect(resolveTypologyProfile("MX").typologies[0].label).toContain("Casa");
  });

  it("unprofiled codes fall back to disclosed generics", () => {
    const zz = resolveTypologyProfile("ZZ");
    expect(zz.confidence).toBe("pending_verification");
    expect(zz.note).toContain("not yet profiled");
  });
});
